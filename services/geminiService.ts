import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { EbookContent, Question, GameLevel, Video, Ebook, NovaPulseItem } from "../types";
import { db, auth } from "../firebase";
import { collection, addDoc, onSnapshot, serverTimestamp, doc } from "firebase/firestore";
import { SYLLABUS_DATA } from "../data/syllabusData";

// Lazy initialization - Exported for global use
export const getAI = () => {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// --- HELPER: FIRESTORE SANITIZER ---
/**
 * Recursively removes all keys with 'undefined' values from an object.
 * Firestore crashes if a key exists but its value is undefined.
 */
const sanitizeFirestoreObject = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(v => sanitizeFirestoreObject(v));
    }

    const newObj: any = {};
    Object.keys(obj).forEach(key => {
        const val = obj[key];
        if (val !== undefined) {
            newObj[key] = sanitizeFirestoreObject(val);
        }
    });
    return newObj;
};

// --- HELPER: ENSURE MATHJAX SAFE ---
export const ensureMathJaxSafe = (text: string): string => {
    if (!text) return "";
    let processed = text;
    
    // 1. Convert block math $$...$$ to \[...\]
    processed = processed.replace(/\$\$(.*?)\$\$/gs, (_, math) => `\\[${math}\\]`);
    
    // 2. Convert inline math $...$ to \(...\)
    processed = processed.replace(/\$(.*?)\$/g, (_, math) => `\\(${math}\\)`);
    
    // 3. Escape literal percentages inside math delimiters to prevent red errors
    const fixLatex = (inner: string) => {
        try {
            return inner.replace(/(?<!\\)%/g, '\\%');
        } catch (e) {
            return inner.replace(/([^\\])%/g, '$1\\%');
        }
    };

    processed = processed.replace(/\\\((.*?)\\\)/gs, (_, content) => `\\(${fixLatex(content)}\\)`);
    processed = processed.replace(/\\\[(.*?)\\\]/gs, (_, content) => `\\[${fixLatex(content)}\\]`);

    return processed;
};

// --- HELPER: SAFE JSON PARSE ---
const safeJsonParse = (jsonString: string): any => {
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.warn("JSON parse failed, attempting repair...", e);
        let repaired = jsonString.trim();
        if (repaired.startsWith('```json')) repaired = repaired.replace(/^```json\n/, '').replace(/\n```$/, '');
        
        const lastQuote = repaired.lastIndexOf('"');
        const lastEscapedQuote = repaired.lastIndexOf('\\"');
        if (lastQuote > 0 && lastQuote > lastEscapedQuote && repaired.length - lastQuote > 10) {
             if (!repaired.endsWith('}') && !repaired.endsWith(']')) {
                 repaired += '"';
             }
        }

        const openBraces = (repaired.match(/\{/g) || []).length;
        const closeBraces = (repaired.match(/\}/g) || []).length;
        const openBrackets = (repaired.match(/\[/g) || []).length;
        const closeBrackets = (repaired.match(/\]/g) || []).length;

        for (let i = 0; i < (openBraces - closeBraces); i++) repaired += "}";
        for (let i = 0; i < (openBrackets - closeBrackets); i++) repaired += "]";
        
        try {
            return JSON.parse(repaired);
        } catch (e2) {
            console.error("Failed to repair JSON", e2);
            throw new Error("Content generation was incomplete. Please try again with a shorter topic or 'Summary' type.");
        }
    }
};

// --- NOVA PULSE: COMMUNITY ENGAGEMENT ---
export const generateSingleNovaPost = async (subject: string, type: 'quiz' | 'discussion', tone: 'Educational' | 'Witty'): Promise<NovaPulseItem> => {
    const ai = getAI();
    
    let syllabusContext = "";
    if (subject !== 'General' && SYLLABUS_DATA[subject]) {
        const categories = SYLLABUS_DATA[subject];
        const randomCat = categories[Math.floor(Math.random() * categories.length)];
        const subtopic = randomCat.subtopics ? randomCat.subtopics[Math.floor(Math.random() * randomCat.subtopics.length)] : randomCat.topic;
        syllabusContext = `FOCUSED TOPIC: "${randomCat.topic} - ${subtopic}". Ensure the question or prompt is specifically about this.`;
    }

    const pulseSchema = {
        type: Type.OBJECT,
        properties: {
            type: { type: Type.STRING, enum: ['quiz', 'discussion'] },
            title: { type: Type.STRING, description: "Punchy, engaging title (Max 10 words)." },
            content: { type: Type.STRING, description: "The actual question or discussion prompt. Be extremely direct. USE LaTeX for any math equations like \\( E=mc^2 \\)." },
            subject: { type: Type.STRING, description: "Academic subject or 'General'." },
            quizOptions: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Exactly 4 options. Only required for 'quiz' type. Use LaTeX for math options."
            },
            correctAnswer: { 
                type: Type.STRING, 
                description: "The full text of the correct option. Only required for 'quiz' type." 
            }
        },
        required: ["type", "title", "content", "subject"]
    };

    const prompt = `
    You are "Nova", the AI Community Engagement Officer for EINTK.
    Generate ONE high-engagement community post for Nigerian students.
    
    PARAMETERS:
    - Subject: ${subject}
    - Post Type: ${type.toUpperCase()}
    - Tone: ${tone === 'Educational' ? 'Professional, syllabus-focused, academic' : 'Witty, relatable to Nigerian Gen Z, funny, using student slang like Sapa, Japa, Rizz, etc.'}
    ${syllabusContext}

    RULES (CRITICAL):
    1. **Directness:** NO introductory filler. Do NOT say "Hey students" or "Prepare for JAMB". 
    2. **Quiz Rule:** If Quiz, the 'content' field must contain ONLY the question itself. Start immediately with the problem.
    3. **LaTeX Rule:** If the subject is Math, Physics, or Chemistry, you MUST use LaTeX for formulas. Inline: \\( ... \\), Block: \\[ ... \\]. NEVER USE DOLLAR SIGNS ($).
    4. **Discussion Rule:** If Discussion, start with the provocative point or debate immediately.
    5. **MCQ:** For quizzes, provide exactly 4 distinct and plausible options.
    
    Output structured JSON only.
    `;

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { 
            responseMimeType: "application/json", 
            responseSchema: pulseSchema,
            temperature: 1.0 
        }
    });

    const parsed = safeJsonParse(response.text);
    if (parsed.content) parsed.content = ensureMathJaxSafe(parsed.content);
    if (parsed.quizOptions) parsed.quizOptions = parsed.quizOptions.map((o: string) => ensureMathJaxSafe(o));
    
    return sanitizeFirestoreObject(parsed);
};

export const generateNovaPulseContent = async (): Promise<NovaPulseItem[]> => {
    const ai = getAI();
    
    const pulseSchema = {
        type: Type.OBJECT,
        properties: {
            items: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        type: { type: Type.STRING, enum: ['quiz', 'discussion'] },
                        title: { type: Type.STRING },
                        content: { type: Type.STRING },
                        subject: { type: Type.STRING },
                        quizOptions: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING }
                        },
                        correctAnswer: { 
                            type: Type.STRING }
                    },
                    required: ["type", "title", "content", "subject"]
                }
            }
        },
        required: ["items"]
    };

    const prompt = `
    You are "Nova", the AI Community Engagement Officer for EINTK.
    Generate 15 UNIQUE and HIGH-ENGAGEMENT community posts for Nigerian students (WAEC/JAMB).
    
    RULES:
    1. **Variety:** Rotate through core subjects like Physics, Government, Chemistry, Biology, Economics, and Mathematics using our curriculum standards.
    2. **Directness:** No intros. Go straight to the point.
    3. **Tone:** Encouraging but witty and relatable.
    4. **Math:** ALWAYS use \\( ... \\) or \\[ ... \\] for math. NEVER USE $.
    
    Output structured JSON only.
    `;

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { 
            responseMimeType: "application/json", 
            responseSchema: pulseSchema,
            temperature: 0.9 
        }
    });

    const parsed = safeJsonParse(response.text);
    const cleanedItems = parsed.items.map((item: any) => {
        const newItem = {
            ...item,
            content: ensureMathJaxSafe(item.content)
        };
        if (item.quizOptions) {
            newItem.quizOptions = item.quizOptions.map((o: string) => ensureMathJaxSafe(o));
        }
        return newItem;
    });

    return sanitizeFirestoreObject(cleanedItems);
};

export const queueRemoteImage = async (prompt: string, model: string, aspectRatio: string): Promise<string> => {
    const docRef = await addDoc(collection(db, 'image_queue'), {
        prompt,
        model,
        aspectRatio,
        status: 'pending',
        createdAt: serverTimestamp(),
    });
    return docRef.id;
};

export const generateStandaloneExamQST = async (subject: string, topic: string, difficulty: string, questionType: string, numQuestions: number): Promise<any> => {
    const ai = getAI();
    const isMCQ = questionType.toUpperCase().includes('MCQ');

    // Define structural properties based on question type
    const properties: any = {
        type: { type: Type.STRING, description: "Must be exactly 'MCQ' or 'Theory'." },
        question: { type: Type.STRING, description: "The academic question. Use LaTeX for math/science: \\( ... \\) or \\[ ... \\]." },
        answer: { type: Type.STRING, description: "The definitive correct answer. For MCQ, must match the text of the correct option." },
        explanation: { type: Type.STRING, description: "Detailed educational reasoning behind the correct answer." },
    };

    if (isMCQ) {
        properties.options = { 
            type: Type.ARRAY, 
            items: { type: Type.STRING }, 
            description: "Exactly 4 distinct, plausible options. Use LaTeX for math/science options." 
        };
    } else {
        properties.answerVariations = { 
            type: Type.ARRAY, 
            items: { type: Type.STRING }, 
            description: "Alternative acceptable phrasings for the theory answer." 
        };
    }

    const examSchema = {
        type: Type.OBJECT,
        properties: {
            introduction: { type: Type.STRING, description: "Brief pedagogical overview of what this test covers." },
            questions: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties,
                    required: ['type', 'question', 'answer', 'explanation'],
                },
                description: `A set of exactly ${numQuestions} questions.`
            },
        },
        required: ['introduction', 'questions'],
    };

    const prompt = `
    Act as a senior curriculum developer for the Nigerian secondary education system (JAMB/WAEC/NECO standards).
    
    Generate a ${difficulty} level examination.
    
    EXAM METADATA:
    - Subject: ${subject}
    - Topic Area: ${topic}
    - Question Count: ${numQuestions}
    - Type: ${isMCQ ? 'Multiple Choice (MCQ)' : 'Theory/Essay'}
    
    STRICT RULES (CRITICAL):
    1. **Curriculum Alignment:** Questions must strictly follow the Nigerian secondary school syllabus for ${subject}.
    2. **LaTeX Only:** You MUST use LaTeX for ALL formulas, equations, chemical symbols, and exponents. 
       - Inline math: \\( ... \\)
       - Block math: \\[ ... \\]
       - NEVER use dollar signs ($) or raw underscores for subscripts.
    3. **Completeness:** You MUST generate exactly ${numQuestions} questions. Do not truncate the list.
    4. **Directness:** No introductory chatter. Respond only with valid JSON matching the schema.
    `;

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: examSchema,
        },
    });

    const parsed = safeJsonParse(response.text);
    if (parsed.questions) {
        parsed.questions = parsed.questions.map((q: any) => {
            const cleanQ: any = {
                ...q,
                question: ensureMathJaxSafe(q.question),
                explanation: ensureMathJaxSafe(q.explanation),
                answer: ensureMathJaxSafe(q.answer)
            };
            
            // Only add optional keys if they exist, to avoid 'undefined' in Firestore
            if (q.options) {
                cleanQ.options = q.options.map((o: string) => ensureMathJaxSafe(o));
            }
            
            if (q.answerVariations) {
                cleanQ.answerVariations = q.answerVariations.map((v: string) => ensureMathJaxSafe(v));
            }
            
            return cleanQ;
        });
    }
    
    return sanitizeFirestoreObject(parsed);
};

export const generateGameLevel = async (gameId: string, difficulty: string, topic: string): Promise<any> => {
    const ai = getAI();
    const prompt = `Generate a ${difficulty} difficulty level for the game "${gameId}"${topic ? ` on the topic "${topic}"` : ""}. 
    Use LaTeX for any technical or math terms, specifically using \\( ... \\). NEVER USE $. Output valid JSON matching the requirements for this specific game type.`;
    
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });
    
    const data = safeJsonParse(response.text);
    const result = {
        ...data,
        gameId,
        difficulty,
        createdAt: serverTimestamp()
    };
    
    return sanitizeFirestoreObject(result);
};

export const getAIDefinition = async (text: string, context: string): Promise<string> => {
    const ai = getAI();
    const prompt = `Explain the following text in the context of ${context}: "${text}". 
    Use clear, educational language and format with Markdown. Use LaTeX for math, wrapping it in \\( ... \\) for inline and \\[ ... \\] for blocks. DO NOT USE DOLLAR SIGNS ($).`;
    
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
    });
    
    return ensureMathJaxSafe(response.text || "No explanation generated.");
};

export const getAISimplification = async (text: string): Promise<string> => {
    const ai = getAI();
    const prompt = `Simplify and summarize the following text for a student: "${text}". 
    Use bullet points and clear language. If you use math, use \\( ... \\) and NO DOLLAR SIGNS ($).`;
    
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
    });
    
    return ensureMathJaxSafe(response.text || "No summary generated.");
};

export const generateSocialContent = async (bookTitle: string, chapterTitle: string, content: string, format: 'video' | 'short', duration: number): Promise<any> => {
    const ai = getAI();
    const schema = {
        type: Type.OBJECT,
        properties: {
            script: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        visual: { type: Type.STRING },
                        audio: { type: Type.STRING }
                    }
                }
            },
            voiceover: { type: Type.STRING },
            metadata: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING }
                }
            },
            thumbnails: format === 'video' ? {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        prompt: { type: Type.STRING },
                        textOverlay: { type: Type.STRING }
                    }
                }
            } : undefined
        }
    };

    const outroText = "if you want to learn more, subscribe now. this was a summary of the topic. to learn more, visit w w w dot e i n t k dot com dot n g today. for the best learning experience, start your journey on our platform.";

    const prompt = `Act as a professional educator. Create a ${format === 'short' ? 'YouTube Short' : `YouTube Video (~${duration} mins)`} script for "${bookTitle} - ${chapterTitle}".
    Based on this content: ${content.substring(0, 10000)}. 
    
    CRITICAL MANDATORY RULE:
    The script MUST end with a clear Call to Action. 
    Append this exact text to the end of the 'voiceover' field and as the final audio part in the 'script' array (written in lowercase for the voice engine):
    "${outroText}"
    
    The final visual scene should describe showing the website homepage or a 'Subscribe' button.
    
    Output valid JSON. Use \\( ... \\) for math in script visuals.`;

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: schema
        }
    });

    return sanitizeFirestoreObject(safeJsonParse(response.text));
};

export const generateAdStrategies = async (allFeatures: {id: string, name: string, description: string}[]): Promise<{strategies: {title: string, reason: string, feature_ids: string[]}[]}> => {
    const ai = getAI();
    
    const strategiesSchema = {
        type: Type.OBJECT,
        properties: {
            strategies: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        reason: { type: Type.STRING },
                        feature_ids: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["title", "reason", "feature_ids"]
                }
            }
        },
        required: ["strategies"]
    };

    const prompt = `
    You are a Creative Director for a viral app marketing team.
    The product is "EINTK" (Everything I Need To Know), an educational WEB PLATFORM (Website) for Nigerian students (WAEC/JAMB).
    
    AVAILABLE FEATURES:
    ${allFeatures.map(f => `- ID: ${f.id} | Name: ${f.name} | Description: ${f.description}`).join('\n')}
    
    TASK:
    Generate 3 UNIQUE, DISTINCT advertisement strategies/angles.
    Each strategy must target a different user persona or psychological trigger (e.g., Fear of Failure, Desire for Status, Laziness/Efficiency, Social Fun).
    
    RULES (CRITICAL):
    1. **Feature Selection Rule:** You MUST select a minimum of **10 features** and a maximum of **18 features** for each strategy. 
    2. **Variety:** Ensure the count varies across the 3 strategies within the 10-18 range.
    3. The features must logically combine to support the strategy's theme.
    4. The reasoning must explain why this specific combination of 10-18 features persuades the user.
    
    Output structured JSON.
    `;

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: strategiesSchema, temperature: 0.9 }
    });

    return sanitizeFirestoreObject(safeJsonParse(response.text));
}

export const generateAdScript = async (features: {name: string, description: string}[]): Promise<{ 
    hook: string, 
    scenes: { visual: string, audio: string }[], 
    full_voiceover: string, 
    tiktok_metadata: { title: string },
    youtube_metadata: { title: string, description: string }
}> => {
    const ai = getAI();

    const scriptSchema = {
        type: Type.OBJECT,
        properties: {
            hook: { type: Type.STRING },
            scenes: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        visual: { type: Type.STRING },
                        audio: { type: Type.STRING }
                    },
                    required: ["visual", "audio"]
                }
            },
            full_voiceover: { type: Type.STRING },
            tiktok_metadata: {
                type: Type.OBJECT,
                properties: { title: { type: Type.STRING } },
                required: ["title"]
            },
            youtube_metadata: {
                type: Type.OBJECT,
                properties: { 
                    title: { type: Type.STRING },
                    description: { type: Type.STRING }
                },
                required: ["title", "description"]
            }
        },
        required: ["hook", "scenes", "full_voiceover", "tiktok_metadata", "youtube_metadata"]
    };

    const prompt = `
    Create a comprehensive, high-value video ad script (60-90 seconds) for "EINTK" (Everything I Need To Know).
    
    CRITICAL PRONUNCIATION & FORMATTING RULES:
    1. **PRONUNCIATION:** The app name "EINTK" must be written phonetically as **"intik"** in the **audio** and **full_voiceover** fields to ensure correct pronunciation.
    2. **URL PRONUNCIATION:** Wherever the website URL appears in the **audio** or **full_voiceover** fields, you MUST write it letter-by-letter as **"w w w dot e i n t k dot com dot n g"**. Never write "www.eintk.com.ng".
    3. **LOWERCASE ONLY:** All text in the **audio** and **full_voiceover** fields MUST be written in **lowercase**. This helps the AI voice engine pronounce words more naturally.
    4. **VISUAL TEXT:** In **visual** descriptions and **metadata** (titles/descriptions), keep it properly capitalized as **"EINTK"** and the normal URL "www.eintk.com.ng".
    
    BRAND POSITIONING & VIBE:
    - Position EINTK as the **ultimate all-in-one solution** for Nigerian students.
    - It is the best choice whether you are **practicing for an exam**, **reading for a test**, trying to **understand a complex school topic**, or simply looking for a **mobile school** that fits in your pocket.
    - Mention that the **Knowledge Tree** (the user's profile) can be customized with **unique skins** from the **Emporium**.
    - Emphasize that these unique skins are **displayed on the global leaderboard**, letting everyone see your status and progress.

    VISUAL STYLE GUIDE (STRICT):
    1. **SCREEN RECORDINGS ONLY:** Every single visual scene MUST be a description of a SCREEN RECORDING of the EINTK website interface. 
    2. **NO STOCK FOOTAGE:** Do NOT describe "students studying", "confused faces", "library scenes", or "stock video". Everything must be "Show [Page Name] screen", "Mouse clicking [Button Name]", "Scrolling through [Section]".
    3. **THE HOOK:** Even the first visual (the Hook) must be a screen recording of a specific feature or page on the EINTK website.
    4. **Exam Countdowns:** If mentioning exam countdowns, describe showing the specific *date* and *days remaining* on the dashboard, NOT a timer or stopwatch.

    CRITICAL EXAM CONTEXT (VERY IMPORTANT):
    - The "Test Prep" section contains PRACTICE QUESTIONS generated to help students understand concepts and build confidence.
    - It does **NOT** contain actual "Past Questions" from exam bodies (WAEC/JAMB/NECO).
    - **NEVER** refer to them as "Past Questions". Always say "Practice Questions", "Mock Tests", "Study Questions", or "Simulated Exams".
    - Emphasize that these questions are designed to make students feel confident and ready.

    CRITICAL CONTEXT & FEATURE RULES:
    1. **Include ALL Features:** You MUST explicitly mention and explain EVERY single feature listed below. Do not skip any.
    2. **No Offline Mentions:** DO NOT mention downloading books or the "Offline Library". Focus strictly on the live, digital platform.
    3. **The Emporium:** Describe the Emporium as the central market where you buy **Streak Freezes**, **One Day Passes**, **Community Megaphones**, and **unique Knowledge Tree skins**.
    4. **Skins & Status:** Mention that skins appear on the **Leaderboard** as a badge of honor.
    5. **Scientific Calculator:** Scientific calculators should be described as part of the CBT simulator.
    6. **Explore Feed:** Describe it as the place for **General Knowledge** books. Mention that users can **rate books** and join the conversation by viewing and posting **comments (Gists)** from other students within the reader.
    7. **Nova Pulse:** Explain this as a special feed in the Community tab where AI drops curriculum questions from different subjects every two hours to audit your knowledge.
    8. **Mission Control (Library):** Explain that the platform creates a daily Study Plan for you. It's not just a list of books; it's a mandatory path with daily books and integrated flashcards for active learning.
    9. **Community:** Refer to the social space as the **"Community"** (or Community Page), NOT "Student Forum". It's where users vote, debate, and chat.
    10. **Web Platform:** EINTK is a WEBSITE/WEB APP. Do NOT say "download app".
    11. **Call to Action (CTA):** The script MUST end by explicitly telling the viewer to **"visit w w w dot e i n t k dot com dot n g today to get started"**.
    12. **Language:** STRICTLY Standard English. NO Pidgin English. High-energy.
    13. **Library Quantities:** Do not say "thousands of books". Avoid specific numbers for the total library size.
    
    FEATURES TO HIGHLIGHT (INCLUDE ALL):
    ${features.map(f => `- ${f.name}: ${f.description}`).join('\n')}
    
    **HOOK INSTRUCTION (VERY IMPORTANT):**
    - Generate a **UNIQUE** hook that is specific to the selected combination of features.
    - Do **NOT** use generic, repetitive openers like "Stop studying" or "Stop scrolling" unless it specifically fits a feature like 'lazy reading'.
    - Vary the angle: Target specific pain points (e.g., "Tired of failing math?", "Want to beat your friends?", "Imagine finishing the syllabus in a week").
    
    **STRUCTURE INSTRUCTION:**
    - Do **NOT** just list the features in the order provided.
    - **YOU (The AI)** must determine the most logical, persuasive, and smooth narrative flow to connect these specific features.
    - Arrange them in a way that tells a story or solves a problem progressively.
    - Ensure transitions between features are seamless.

    OUTPUT FORMAT:
    - Scenes: Visual directions (Screen Recordings Only) + Audio (Voiceover/Dialogue using "intik" and "w w w dot e i n t k dot com dot n g" and lowercase).
    - Metadata: Catchy titles/descriptions for TikTok & YouTube.
    
    HASHTAG RULES:
    - **TikTok Title:** Must contain a short punchy headline followed by **EXACTLY 5 hashtags**. All hashtags must be in **lowercase**. Example: "The ultimate cheat code #waec #jamb #study #education #nigeria"
    - **YouTube Description:** Must include EXACTLY 15 hashtags. All hashtags must be in **lowercase**. Hashtags must be relevant to the subject and features.
    
    Ensure the script flows logically, grouping related features if necessary, but covering every single one.
    `;

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: scriptSchema, temperature: 0.8 } 
    });

    return sanitizeFirestoreObject(safeJsonParse(response.text));
}

// Helper for WAV header
function createWavHeader(pcmLength: number, sampleRate: number = 24000): Uint8Array {
    const buffer = new ArrayBuffer(44);
    const view = new DataView(buffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + pcmLength, true);
    writeString(view, 8, 'WAVE');

    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);

    writeString(view, 36, 'data');
    view.setUint32(40, pcmLength, true);

    return new Uint8Array(buffer);
}

function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

export const generateSpeech = async (text: string, voice: string, stylePrompt: string): Promise<Blob> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `${stylePrompt}\n\n${text}` }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voice },
                },
            },
        },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio returned");

    const pcmData = decode(base64Audio);
    const header = createWavHeader(pcmData.length, 24000);
    
    const wavData = new Uint8Array(header.length + pcmData.length);
    wavData.set(header);
    wavData.set(pcmData, header.length);

    return new Blob([wavData], { type: 'audio/wav' });
};

export const getCoverImagePrompt = (
    title: string, 
    subject: string, 
    type: 'ebook' | 'exam' | 'video', 
    topic?: string, 
    ebookType?: 'Complete' | 'Simple (Summary)',
    examConfig?: { numQuestions: number, questionType: string }
): string => {
    if (type === 'video') {
        return `High-impact YouTube thumbnail, 16:9 aspect ratio, professional design. Topic: "${topic || title}". Visuals: A single, powerful, central graphic related to the topic. The graphic must be neutral and avoid implying a specific region (e.g., no globes). Background: Dark, modern, navy blue with a subtle gradient. Text: A short, intriguing, clickbait-style hook in a bold, sans-serif font (e.g., 'THE SUN'S SECRET?'). Use vibrant orange and stark white for the text. Style: Clean, high-contrast, minimalist, designed to maximize click-through rate. IMPORTANT: Do NOT use the full video title on the thumbnail. Subtly place the 'EINTK' logo in a corner. The final image must look polished and professional.`;
    }

    const cleanTopic = topic || title.replace(/Summary of:?\s*/i, "").replace(/Everything you need to know:?\s*/i, "");
    const visualTopic = cleanTopic === 'All Topics' ? subject : cleanTopic;

    const styles = [
        `Futuristic 3D Isometric geometric world`,
        `Cinematic Realism with dramatic lighting`,
        `Abstract Data Visualization with glowing nodes`,
        `Surreal Educational Landscape with giant symbols`,
        `Paper Cutout 3D diorama`,
        `Glassmorphism with frosted elements and neon`,
        `Low Poly Art with sharp facets`
    ];
    
    const styleIndex = (title.length + (subject?.length || 0)) % styles.length;
    const selectedStyle = styles[styleIndex];

    let finalPrompt = "";
    
    if (type === 'exam') {
        let primaryText = "";
        const num = examConfig?.numQuestions || 20;
        const qTypeStr = examConfig?.questionType || "";
        const isMCQ = qTypeStr.toUpperCase().includes('MCQ') || qTypeStr.toLowerCase().includes('multiple choice');
        
        primaryText = `${num} ${subject} ${isMCQ ? 'Objectives' : 'Theories'}`;

        finalPrompt = `Create a professional and modern cover for an academic test preparation set.
        - **PRIMARY TASK:** Write the text "${primaryText}" in extremely large, bold, 3D letters in the center of the image.
        - **SPELLING:** You MUST spell "${primaryText}" exactly as written.
        - **VISUAL STYLE:** ${selectedStyle}.
        - **TOPIC IMAGERY:** Include symbols and icons related to "${visualTopic}" and "${subject}" integrated into the background.
        - **COLORS:** Use Dark Navy Blue, Vibrant Orange, and Crisp White. 
        - **LAYOUT:** Center the primary text. Place the word "EINTK" small at the very bottom.
        - **NEGATIVE CONSTRAINTS:** Do NOT write any other words. Do NOT write hex codes. No messy handwriting.
        - **ASPECT RATIO:** 1:1.`;
    } else {
        finalPrompt = `Create a visually stunning, professional ebook cover.
        - **PRIMARY TASK:** Write the text "${cleanTopic}" in large, bold letters in the center.
        - **SPELLING:** You MUST spell "${cleanTopic}" exactly as written.
        - **VISUAL STYLE:** ${selectedStyle}.
        - **TOPIC IMAGERY:** The central imagery must be a direct representation of the topic "${visualTopic}".
        - **COLORS:** Use Dark Navy Blue, Vibrant Orange, and White. 
        - **LAYOUT:** Center the title text. Place "EINTK" small and centered at the bottom.
        - **NEGATIVE CONSTRAINTS:** Do NOT write "${subject}". Do NOT write hex codes. Do NOT use words like "Summary" or "Guide".
        - **ASPECT RATIO:** 1:1.`;
    }

    return finalPrompt;
};

export const generateEbookContent = async (
  subject: string,
  topic: string,
  ebookType: 'Complete' | 'Simple (Summary)',
  accessLevel: 'free' | 'pro',
  syllabusId?: string
): Promise<EbookContent> => {
    const minQuestions = ebookType === 'Complete' ? 20 : 10; 
    
    const ebookSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: "The final title." },
            tableOfContents: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        chapter: { type: Type.NUMBER },
                        title: { type: Type.STRING },
                    },
                    required: ["chapter", "title"],
                },
            },
            chapters: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        chapter: { type: Type.NUMBER },
                        title: { type: Type.STRING },
                        content: { type: Type.STRING },
                        questions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    type: { type: Type.STRING, enum: ['MCQ'] },
                                    question: { type: Type.STRING },
                                    options: {
                                        type: Type.ARRAY,
                                        items: { type: Type.STRING },
                                        description: "4 options."
                                    },
                                    answer: { type: Type.STRING },
                                    explanation: { type: Type.STRING }
                                },
                                required: ['type', 'question', 'options', 'answer', 'explanation']
                            },
                            description: `Array of ${minQuestions} questions.`
                        },
                        imagePrompts: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    placeholder: {
                                        type: Type.STRING,
                                        description: "e.g. '[IMAGE: Detailed description...]'"
                                    },
                                    prompt: {
                                        type: Type.STRING,
                                        description: "A highly detailed description of the image for generation."
                                    }
                                },
                                required: ["placeholder", "prompt"]
                            },
                            description: "Prompts for images."
                        },
                    },
                    required: ["chapter", "title", "content", "questions", "imagePrompts"],
                },
            },
            flashcards: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        front: { type: Type.STRING },
                        back: { type: Type.STRING }
                    },
                    required: ["front", "back"]
                },
                description: "10 flashcards."
            }
        },
        required: ["title", "tableOfContents", "chapters", "flashcards"],
    };

    let titleInstruction = '';
    let typeDescription = '';
    let imageInstruction = '';
    let chapterInstruction = '';
    let syllabusInstruction = '';
    let toneInstruction = '';

    if (subject !== 'General' && SYLLABUS_DATA[subject]) {
        syllabusInstruction = `Subject: "${subject}". Topic: "${topic}". Adhere to WAEC/JAMB syllabus standards.`;
    } else {
        syllabusInstruction = `General Topic: "${topic}".`;
    }

    if (ebookType === 'Complete') {
        titleInstruction = `Title MUST be: "Everything you need to know: ${topic}".`;
        typeDescription = "DEFINITIVE ACADEMIC TEXTBOOK (COMPLETE).";
        chapterInstruction = "Generate between 5 and 8 comprehensive chapters.";
        
        toneInstruction = `
        **INSTRUCTION: THE COMPLETE AUTHORITY (COMPLETE)**
        You are writing the definitive textbook on this topic. Your goal total mastery for the student.
        
        **FORMATTING RULES (CRITICAL):**
        1.  **NO META-LABATED:** Do NOT write "Definition:", "Explanation:", "Analogy:", "Understanding:", "Acronym:", or "Examples:" at the start of sentences. Just write the content.
        2.  **NATURAL FLOW:** Write as a continuous, professional textbook.
        3.  **PARAGRAPHS:** Start with the definition in its own paragraph. Then start a **NEW paragraph** for the explanation and breakdown. Use separate paragraphs for analogies and examples.
        
        **MANDATORY CONTENT FLOW:**
        1.  **Formal Definition:** Start immediately with the formal exam-standard definition.
        2.  **Deep Explanation:** In a new paragraph, break down the definition simply so the student understands the 'why' and 'how'.
        3.  **Comprehensive Depth:** Expand into types, classifications, theories, and global knowledge on the topic.
        4.  **Acronyms:** Integrate mnemonics naturally into the text.
        5.  **Analogies:** Use real-life comparisons to make it concrete (e.g., "Think of this process like...").
        6.  **Examples:** Include **5 to 10 distinct examples** for every major concept, woven into the text or as a list.
        
        **Scope:** Exhaustive. If a student reads this, they should know everything needed to get an A1 and understand the topic for life.
        `;

        imageInstruction = `
        **IMAGE RULES (CRITICAL):**
        1.  Insert image placeholders \`[IMAGE: Detailed description...]\` ONLY where necessary to explain a complex concept (diagrams, cycles, structures).
        2.  If an image is NOT necessary, do not put one. 
        3.  However, ensure there is a **minimum of 3 images** in the book to avoid it being text-heavy.
        4.  **Prompt Detail:** The prompt string inside the placeholder must be extremely detailed so an AI image generator knows exactly what to draw.
        `;
    } else {
        titleInstruction = `Title MUST be: "Summary of: ${topic}".`;
        typeDescription = "HIGH-YIELD REVISION GUIDE (SUMMARY).";
        chapterInstruction = "Generate at least 3 concise chapters.";
        
        toneInstruction = `
        **INSTRUCTION: THE RAPID REVISION GUIDE (SUMMARY)**
        You are writing a high-yield summary for quick revision.
        
        **STYLE:**
        - Direct and to the point.
        - **NO META-LABELS:** Do not use "Definition:" or "Explanation:" as headers. Just state the facts.
        
        **STRUCTURE:**
        1.  **Key Points:** Focus strictly on what is needed to pass the exam.
        2.  **Definitions:** Provide clear, memorizable definitions.
        3.  **Literal Explanation:** Explain concepts in a literal, direct way. No fluff.
        4.  **Examples:** Provide 1 or 2 simple examples per concept.
        `;

        imageInstruction = `
        **IMAGE RULES:**
        1.  **Mandatory:** You MUST include **at least 1 image** in this book, even if the topic is simple.
        2.  Choose the most critical concept to visualize (e.g., a chart, a main diagram).
        `;
    }

    const prompt = `
        Write an ebook JSON.
        ${syllabusInstruction}
        ${titleInstruction}
        ${ebookType} (${typeDescription}).
        
        **RULES:**
        1.  **HTML FORMAT:** Use HTML tags for formatting (<h2>, <h3>, <ul>, <li>, <strong>, <p>, <em>). 
        2.  **MATH:** Use LaTeX for ALL formulas. Inline: \\( ... \\), Block: \\[ ... \\]. NEVER USE DOLLAR SIGNS ($).
        3.  **QUIZ:** Minimum ${minQuestions} MCQs per chapter.
        4.  **IMAGES:** ${imageInstruction}
        5.  **NO PLACEHOLDER TEXT.** Write the actual full content.

        ${toneInstruction}
        ${chapterInstruction}

        Output VALID JSON only.
    `;

    const ai = getAI();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: ebookSchema,
            temperature: 0.3, 
        },
    });

    let jsonStr = response.text.trim();
    if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    const generatedContent: EbookContent = safeJsonParse(jsonStr);

    if (generatedContent.chapters) {
        generatedContent.chapters.forEach(chapter => {
            if (chapter.imagePrompts) {
                chapter.imagePrompts.forEach(promptData => {
                    const imgTag = `<img src="[TEMP_SRC]" alt="${promptData.placeholder.replace(/\[IMAGE: |\]/g, '')}" data-prompt="${promptData.prompt.replace(/"/g, '&quot;')}" />`;
                    chapter.content = chapter.content.split(promptData.placeholder).join(imgTag);
                });
            }
            chapter.content = ensureMathJaxSafe(chapter.content);
        });
    }

    return sanitizeFirestoreObject(generatedContent);
};

export const generateImage = async (
    prompt: string,
    aspectRatio: '1:1' | '16:9' | '9:16' = '1:1',
    model: 'imagen-4.0-generate-001' | 'gemini-2.5-flash-image' = 'imagen-4.0-generate-001'
): Promise<string> => {
    const ai = getAI();
    
    if (model === 'gemini-2.5-flash-image') {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        
        if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content || !response.candidates[0].content.parts) {
             throw new Error("Image generation failed: Invalid response from Gemini API.");
        }

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
        throw new Error("Image generation failed with gemini-2.5-flash-image: No image data returned.");

    } else {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/png',
                aspectRatio: aspectRatio,
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            return response.generatedImages[0].image.imageBytes;
        }
        throw new Error("Image generation failed with imagen-4.0-generate-001: No images returned.");
    }
};