import React, { useState, useEffect } from 'react';
import { NIGERIAN_CURRICULUM_SUBJECTS } from '../constants';
import { SYLLABUS_DATA } from '../data/syllabusData';
import { ExamType, QuestionType } from '../types';
import type { Ebook, ExamQST, Draft } from '../types';
// Fixed: Changed generateStandalone_ExamQST to generateStandaloneExamQST to match service export
import { generateEbookContent, generateStandaloneExamQST, generateImage, queueRemoteImage, getCoverImagePrompt, generateGameLevel } from '../services/geminiService';
import { saveDraft, getDrafts, deleteDraft, publishEbook, getPublishedEbooks, deletePublishedEbook, publishExamQST, getPublishedExamQSTs, deletePublishedExamQST, getEbookById, resetEbookProgressForAllUsers, saveGameLevel } from '../services/firestoreService';
import { uploadImage, base64ToFile } from '../services/imageUploadService';
import { auth, db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { BookPlus, Pencil, BookCheck, Gamepad2, Play, Pause, RefreshCw, Plus, Image as ImageIcon, Loader2, Check, ChevronDown, ChevronUp, Trash2, X, Sparkles, Server, Copy, UploadCloud, Send } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import GenerationProgress from '../components/GenerationProgress';

// --- TYPES ---
type GenerationTask = {
    id: string;
    subject: string;
    category: string; 
    topic: string; 
    type: 'Complete' | 'Simple (Summary)';
    status: 'pending' | 'generating' | 'completed' | 'error';
    error?: string;
};

// --- PENDING IMAGE MONITOR ---
const PendingImageMonitor: React.FC<{ taskId: string; onResolve: (url: string) => void; onRetry?: () => void }> = ({ taskId, onResolve, onRetry }) => {
    const [status, setStatus] = useState<'pending' | 'processing' | 'completed' | 'error'>('pending');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!taskId) return;
        const taskDoc = doc(db, 'image_queue', taskId);
        const unsubscribe = onSnapshot(taskDoc, (snapshot) => {
            const data = snapshot.data();
            if (data) {
                setStatus(data.status);
                if (data.status === 'completed' && data.imageUrl) {
                    onResolve(data.imageUrl);
                } else if (data.status === 'error') {
                    setError(data.error || 'Failed');
                }
            }
        });
        return () => unsubscribe();
    }, [taskId]); 

    if (status === 'completed') return null; 

    return (
        <div className={`my-4 p-4 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center ${status === 'error' ? 'border-red-600 bg-red-900/20' : 'border-yellow-600 bg-yellow-900/20 animate-pulse'}`}>
            <Server className={`${status === 'error' ? 'text-red-500' : 'text-yellow-500'} mb-2`} size={32} />
            {status === 'error' ? (
                <>
                    <p className="text-sm font-bold text-red-400">Generation Failed</p>
                    <p className="text-xs text-gray-300 mt-1 mb-3 max-w-[200px] truncate" title={error}>{error}</p>
                </>
            ) : (
                <>
                    <p className="text-sm font-bold text-yellow-400">Waiting for Render Engine...</p>
                    <p className="text-xs text-gray-400 mt-1">Task ID: {taskId.slice(0, 8)}...</p>
                    {status === 'processing' && <p className="text-xs text-green-400 mt-1">Processing...</p>}
                </>
            )}
            {onRetry && (
                <button onClick={onRetry} className={`mt-2 px-3 py-1.5 text-xs font-bold rounded flex items-center ${status === 'error' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
                    <RefreshCw size={12} className="mr-1" />
                    {status === 'error' ? 'Regenerate' : 'Cancel & Regenerate'}
                </button>
            )}
        </div>
    );
};

const AdminPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'create' | 'editor' | 'published' | 'games'>('create');
    const [activeCreateTab, setActiveCreateTab] = useState<'ebook' | 'testprep'>('ebook');
    const [activeEditorTab, setActiveEditorTab] = useState<'ebook' | 'exam'>('ebook');
    const [activePublishedTab, setActivePublishedTab] = useState<'ebooks' | 'exams'>('ebooks');

    // Ebook Generation State
    const [subject, setSubject] = useState<string>("Mathematics");
    const [ebookType, setEbookType] = useState<'Complete' | 'Simple (Summary)'>('Complete');
    const [imageModel, setImageModel] = useState<'imagen-4.0-generate-001' | 'gemini-2.5-flash-image' | 'remote-imagen-4' | 'remote-gemini-flash'>('imagen-4.0-generate-001');
    const [customTopic, setCustomTopic] = useState("");
    
    // Syllabus Logic (Ebook)
    const [selectedSubtopics, setSelectedSubtopics] = useState<string[]>([]);
    const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
    
    // Queue Logic
    const [generationQueue, setGenerationQueue] = useState<GenerationTask[]>([]);
    const [isQueueRunning, setIsQueueRunning] = useState(false);

    // Test Prep form state
    const [testPrepDifficulty, setTestPrepDifficulty] = useState<string>("Senior Level");
    const [testPrepQuestionType, setTestPrepQuestionType] = useState<QuestionType>(QuestionType.MCQ);
    const [testPrepNumQuestions, setTestPrepNumQuestions] = useState(10);
    const [testPrepSelectedSubjects, setTestPrepSelectedSubjects] = useState<string[]>([]);
    const [testPrepExpandedSubjects, setTestPrepExpandedSubjects] = useState<string[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [progressText, setProgressText] = useState("");
    const simulationTimeoutRefs = React.useRef<ReturnType<typeof setTimeout>[]>([]);

    // Editor State
    const [allDrafts, setAllDrafts] = useState<Draft[]>([]);
    const [editingDraft, setEditingDraft] = useState<Draft | null>(null);
    const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null);
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
    const [showContentPreview, setShowContentPreview] = useState(true);
    const [isRegeneratingCover, setIsRegeneratingCover] = useState(false);
    const [coverRegenProgress, setCoverRegenProgress] = useState({ progress: 0, text: "" });
    const [showDeleteDraftModal, setShowDeleteDraftModal] = useState(false);
    const [draftToDelete, setDraftToDelete] = useState<Draft | null>(null);
    
    // Background Processing State
    const [publishingIds, setPublishingIds] = useState<Set<string>>(new Set());

    // Inline Image Editing State
    const [regeneratingImages, setRegeneratingImages] = useState<Record<string, boolean>>({});

    // Published Tab State
    const [publishedEbooks, setPublishedEbooks] = useState<Ebook[]>([]);
    const [publishedExams, setPublishedExams] = useState<ExamQST[]>([]);
    const [publishedSearchTerm, setPublishedSearchTerm] = useState('');
    const [publishedFilter, setPublishedFilter] = useState<'all' | 'free' | 'pro'>('all');
    
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{id: string, title: string, type: 'ebook' | 'exam'} | null>(null);

    const [showScrollToTop, setShowScrollToTop] = useState(false);

    // Games Tab State
    const [gameId, setGameId] = useState('math-dash');
    const [gameDifficulty, setGameDifficulty] = useState('easy');
    const [gameTopic, setGameTopic] = useState('');

    useEffect(() => {
        return () => { simulationTimeoutRefs.current.forEach(clearTimeout); }
    }, []);

    useEffect(() => {
        const handleScroll = () => { window.scrollY > 400 ? setShowScrollToTop(true) : setShowScrollToTop(false); };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (expandedDraftId && window.MathJax) { setTimeout(() => { window.MathJax.typesetPromise().catch(console.error); }, 100); }
    }, [expandedDraftId, showContentPreview, editingDraft]);

    useEffect(() => {
        const adminUid = auth.currentUser?.uid;
        if (!adminUid) return;
        if (activeTab === 'editor') { getDrafts(adminUid).then(setAllDrafts).catch(err => setError(err.message)); }
        else if (activeTab === 'published') {
            if (activePublishedTab === 'ebooks') fetchPublishedEbooks();
            else if (activePublishedTab === 'exams') fetchPublishedExams();
        }
    }, [activeTab, activePublishedTab]);

    useEffect(() => {
        const processQueue = async () => {
            if (!isQueueRunning || generationQueue.length === 0) return;
            const currentTaskIndex = generationQueue.findIndex(t => t.status === 'pending');
            if (currentTaskIndex === -1) {
                setIsQueueRunning(false);
                alert("All queued tasks completed!");
                return;
            }
            const newQueue = [...generationQueue];
            newQueue[currentTaskIndex].status = 'generating';
            setGenerationQueue(newQueue);
            const task = newQueue[currentTaskIndex];
            const accessLevel = task.type === 'Complete' ? 'pro' : 'free';
            try {
                setGenerationProgress(5);
                setProgressText(`Drafting chapters for ${task.topic}...`);
                const content = await generateEbookContent(task.subject, task.topic, task.type, accessLevel, undefined);
                setGenerationProgress(20);
                setProgressText(`Generating cover image for ${task.topic}...`);
                let coverUrl = `https://placehold.co/600x600/111827/ea580c?text=${encodeURIComponent(task.topic)}`;
                try {
                    const coverPrompt = getCoverImagePrompt(content.title, task.subject, 'ebook', task.topic, task.type);
                    const coverBlob = await generateImage(coverPrompt, '1:1', imageModel as any);
                    const file = base64ToFile(coverBlob, `cover_${Date.now()}.png`);
                    const uploaded = await uploadImage(file);
                    if (uploaded) coverUrl = uploaded;
                } catch (imgErr) { console.error("Cover gen failed", imgErr); }
                let placeholders: { chapterIdx: number, original: string, prompt: string }[] = [];
                content.chapters.forEach((ch, idx) => {
                    const regex = /<img[^>]+src="\[TEMP_SRC\]"[^>]*>/g;
                    const matches = ch.content.match(regex);
                    if (matches) {
                        matches.forEach(imgTag => {
                            const promptMatch = imgTag.match(/data-prompt="([^"]*)"/);
                            if (promptMatch) { placeholders.push({ chapterIdx: idx, original: imgTag, prompt: promptMatch[1] }); }
                        });
                    }
                });
                const totalImages = placeholders.length;
                let imagesProcessed = 0;
                for (const item of placeholders) {
                    imagesProcessed++;
                    const pct = 20 + Math.round((imagesProcessed / totalImages) * 70);
                    setGenerationProgress(pct);
                    setProgressText(`Generating inline image ${imagesProcessed}/${totalImages}...`);
                    try {
                        let newUrl = '';
                        if (imageModel.startsWith('remote-')) {
                            const taskId = await queueRemoteImage(item.prompt, imageModel as any, '1:1');
                            newUrl = `[PENDING:${taskId}]`;
                        } else {
                            const imgBlob = await generateImage(item.prompt, '1:1', imageModel as any);
                            const file = base64ToFile(imgBlob, `inline_${Date.now()}.png`);
                            const uploaded = await uploadImage(file);
                            if (uploaded) newUrl = uploaded;
                        }
                        if (newUrl) {
                            let chContent = content.chapters[item.chapterIdx].content;
                            const newTag = item.original.replace('[TEMP_SRC]', newUrl);
                            content.chapters[item.chapterIdx].content = chContent.replace(item.original, newTag);
                        }
                    } catch (err) { console.error(`Failed to gen image ${imagesProcessed}`, err); }
                }
                setGenerationProgress(95);
                setProgressText("Finalizing and saving draft...");
                const draft: Draft = {
                    id: crypto.randomUUID(),
                    draftType: 'ebook',
                    adminUid: auth.currentUser?.uid || 'admin',
                    ...content,
                    subject: task.subject,
                    topic: task.topic,
                    coverImageUrl: coverUrl,
                    accessLevel: accessLevel,
                    published: false,
                    createdAt: new Date(),
                    imageModel: imageModel as any
                };
                await saveDraft(draft);
                const updatedQueue = [...generationQueue];
                updatedQueue[currentTaskIndex].status = 'completed';
                setGenerationQueue(updatedQueue);
            } catch (error: any) {
                console.error("Task failed", error);
                const updatedQueue = [...generationQueue];
                updatedQueue[currentTaskIndex].status = 'error';
                updatedQueue[currentTaskIndex].error = error.message;
                setGenerationQueue(updatedQueue);
            }
            setGenerationProgress(0);
            setProgressText("");
        };
        if (isQueueRunning) { processQueue(); }
    }, [isQueueRunning, generationQueue]);

    const addToQueue = () => {
        if (subject === 'General') {
            if (!customTopic.trim()) { setError("Please enter a topic title."); return; }
            const task: GenerationTask = { id: crypto.randomUUID(), subject: 'General', category: 'General', topic: customTopic, type: ebookType, status: 'pending' };
            setGenerationQueue(prev => [...prev, task]);
            setCustomTopic("");
            alert(`Topic "${customTopic}" added to queue.`);
        } else {
            if (selectedSubtopics.length === 0) { setError("Please select at least one topic."); return; }
            const newTasks: GenerationTask[] = selectedSubtopics.map(str => {
                const [cat, top] = str.split('::');
                return { id: crypto.randomUUID(), subject: subject, category: cat, topic: top, type: ebookType, status: 'pending' };
            });
            setGenerationQueue(prev => [...prev, ...newTasks]);
            setSelectedSubtopics([]);
            alert(`${newTasks.length} topics added to queue.`);
        }
    };

    const toggleCategory = (catId: string) => { setExpandedCategories(prev => prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]); };
    const toggleSubtopic = (catName: string, subName: string) => { const val = `${catName}::${subName}`; setSelectedSubtopics(prev => prev.includes(val) ? prev.filter(s => s !== val) : [...prev, val]); };
    const toggleTestPrepSubject = (subject: string) => { setTestPrepExpandedSubjects(prev => prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]); };
    const toggleSelectSubjectForQueue = (subject: string) => { setTestPrepSelectedSubjects(prev => prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]); };

    const fetchPublishedEbooks = async () => { setIsLoading(true); try { const ebooks = await getPublishedEbooks(); setPublishedEbooks(ebooks); } catch (e: any) { setError(e.message); } finally { setIsLoading(false); } }
    const fetchPublishedExams = async () => { setIsLoading(true); try { const exams = await getPublishedExamQSTs(); setPublishedExams(exams); } catch (e: any) { setError(e.message); } finally { setIsLoading(false); } }
    
     const handleGenerateTestPrep = async () => {
        const adminUid = auth.currentUser?.uid;
        if (!adminUid) { setError("Admin login required."); return; }
        if (testPrepSelectedSubjects.length === 0) { setError("Please select at least one subject."); return; }
        setIsLoading(true); setError(null);
        for (let i = 0; i < testPrepSelectedSubjects.length; i++) {
            const subject = testPrepSelectedSubjects[i];
            const progressBase = Math.round((i / testPrepSelectedSubjects.length) * 100);
            setGenerationProgress(progressBase);
            setProgressText(`Generating ${subject} Exam (${i + 1}/${testPrepSelectedSubjects.length})...`);
            try {
                // Fixed: Correctly using the imported generateStandaloneExamQST
                const examData = await generateStandaloneExamQST(subject, "All Topics", testPrepDifficulty, testPrepQuestionType, testPrepNumQuestions);
                const examTitleForCover = `${testPrepNumQuestions} ${subject} ${testPrepQuestionType.includes('MCQ') ? 'MCQ' : 'Theories'}`;
                const coverPrompt = getCoverImagePrompt(examTitleForCover, subject, 'exam', "All Topics", undefined, { numQuestions: testPrepNumQuestions, questionType: testPrepQuestionType });
                let coverImageUrl = '';
                
                try {
                    if (imageModel.startsWith('remote-')) {
                         const taskId = await queueRemoteImage(coverPrompt, imageModel as any, '1:1');
                         coverImageUrl = `[PENDING:${taskId}]`;
                    } else {
                        const base64Data = await generateImage(coverPrompt, '1:1', imageModel as any);
                        const imageFile = base64ToFile(base64Data, `cover_exam_${Date.now()}.png`);
                        const url = await uploadImage(imageFile);
                        if (url) coverImageUrl = url;
                    }
                } catch (imgError) { 
                    console.error("Cover generation failed:", imgError);
                    coverImageUrl = `https://placehold.co/600x600/111827/ea580c?text=${encodeURIComponent(examTitleForCover)}`; 
                }

                const accessLevel = testPrepDifficulty === "Junior Level" ? 'free' : 'pro';
                
                const draft: Draft = { 
                    draftType: 'exam', 
                    adminUid, 
                    id: crypto.randomUUID(), 
                    title: `${subject} - ${testPrepDifficulty}`, 
                    subject: subject, 
                    topic: "All Topics", 
                    published: false, 
                    accessLevel: accessLevel, 
                    difficulty: testPrepDifficulty, 
                    ...examData, 
                    coverImageUrl,
                    imageModel: imageModel 
                };
                await saveDraft(draft);
                setAllDrafts(prev => [draft, ...prev]);
            } catch (e: any) { console.error(`Failed to generate for ${subject}:`, e); }
        }
        setIsLoading(false); setGenerationProgress(0); setProgressText(""); alert(`Processed ${testPrepSelectedSubjects.length} subjects.`); setTestPrepSelectedSubjects([]); setActiveTab('editor'); setActiveEditorTab('exam');
    };

    const handleGenerateGameLevel = async () => {
        setIsLoading(true); setError(null); setLoadingMessage("Generating level...");
        try {
            const levelData = await generateGameLevel(gameId, gameDifficulty, gameTopic);
            await saveGameLevel(levelData);
            alert("Game level generated and saved!");
            setGameTopic('');
        } catch (e: any) { setError("Failed to generate game level: " + e.message); }
        finally { setIsLoading(false); setLoadingMessage(''); }
    };

    const handlePublish = async (draftToPublish: Draft, localCoverFile: File | null) => {
        if (!draftToPublish || !draftToPublish.id) return;
        
        const draftString = JSON.stringify(draftToPublish);
        if (draftString.includes('[PENDING:')) {
            alert(`Cannot publish "${draftToPublish.title}" while images are pending.`);
            return;
        }

        // Add to background processing list
        setPublishingIds(prev => new Set(prev).add(draftToPublish.id!));

        // Background Task
        (async () => {
            try {
                let finalDraft = { ...draftToPublish };
                let isUpdate = false;
                
                // 1. Check existing
                if (finalDraft.draftType === 'ebook') {
                    const existingDoc = await getEbookById(finalDraft.id!);
                    if (existingDoc) isUpdate = true;
                }

                // 2. Handle Image Upload if provided
                if (localCoverFile) {
                    const url = await uploadImage(localCoverFile);
                    if (!url) throw new Error("Cover upload failed.");
                    // Fixed: Explicit cast to any to allow property assignment on union type
                    (finalDraft as any).coverImageUrl = url;
                }

                // FIX: Added explicit cast to any before accessing coverImageUrl as TypeScript might flag it for Video drafts in the union
                if (!(finalDraft as any).coverImageUrl) throw new Error("A cover image is required.");

                // 3. Publish to correct collection
                if (finalDraft.draftType === 'ebook') {
                    if (isUpdate) {
                        await resetEbookProgressForAllUsers(finalDraft.id!);
                        await deletePublishedEbook(finalDraft.id!);
                    }
                    await publishEbook(finalDraft.id!, { ...finalDraft, published: true } as Ebook);
                } else if (finalDraft.draftType === 'exam') {
                    await publishExamQST(finalDraft.id!, { ...finalDraft, published: true } as ExamQST);
                }

                // 4. Cleanup draft
                await deleteDraft(finalDraft.id!);
                
                // 5. Update local state list
                setAllDrafts(prev => prev.filter(d => d.id !== finalDraft.id));
                console.log(`Success: Published "${finalDraft.title}"`);
            } catch (e: any) {
                console.error(`Failed to publish "${draftToPublish.title}":`, e);
                alert(`Error publishing "${draftToPublish.title}": ${e.message}`);
            } finally {
                // Remove from background processing list
                setPublishingIds(prev => {
                    const next = new Set(prev);
                    next.delete(draftToPublish.id!);
                    return next;
                });
            }
        })();
    };

    const handleRegenerateCover = async () => {
        if (!editingDraft || !editingDraft.title || !editingDraft.subject) { setError("Item data missing."); return; }
        setIsRegeneratingCover(true); setError(null);
        setCoverRegenProgress({ progress: 10, text: "Crafting prompt..." });
        try {
            const aspectRatio = '1:1';
            const imageModel = (editingDraft as Ebook).imageModel || 'imagen-4.0-generate-001';
            const draftType = (editingDraft as any).accessLevel === 'pro' ? 'Complete' : 'Simple (Summary)';
            let coverPrompt = '';
            if (editingDraft.draftType === 'exam') {
                const examDraft = editingDraft as ExamQST;
                coverPrompt = getCoverImagePrompt(editingDraft.title, editingDraft.subject, 'exam', "All Topics", undefined, { numQuestions: examDraft.questions?.length || 20, questionType: examDraft.questions?.[0]?.type === 'MCQ' ? 'MCQ' : 'Theory' });
            } else {
                coverPrompt = getCoverImagePrompt(editingDraft.title, editingDraft.subject, editingDraft.draftType, editingDraft.topic, draftType);
            }
            setCoverRegenProgress({ progress: 30, text: "Generating..." });
            let newCoverUrl = '';
            if (imageModel.startsWith('remote-')) {
                const taskId = await queueRemoteImage(coverPrompt, imageModel as any, aspectRatio as any);
                newCoverUrl = `[PENDING:${taskId}]`;
            } else {
                const base64Data = await generateImage(coverPrompt, aspectRatio as any, imageModel as any);
                setCoverRegenProgress({ progress: 70, text: "Uploading..." });
                const imageFile = base64ToFile(base64Data, `regenerated_cover_${editingDraft.id}.png`);
                const url = await uploadImage(imageFile);
                if (url) newCoverUrl = url;
            }
            if (!newCoverUrl) throw new Error("Failed to upload/generate image.");
            setCoverRegenProgress({ progress: 100, text: "Done!" });
            const updatedDraft = { ...editingDraft };
            // FIX: Added explicit cast to any to safely set coverImageUrl
            (updatedDraft as any).coverImageUrl = newCoverUrl;
            setEditingDraft(updatedDraft); await saveDraft(updatedDraft); setCoverImageFile(null);
        } catch (e: any) { setError("Cover regeneration failed: " + e.message); }
        finally { setTimeout(() => { setIsRegeneratingCover(false); setCoverRegenProgress({ progress: 0, text: "" }); }, 1500); }
    };

    const handleRegenerateInlineImage = async (prompt: string, chapterIndex: number) => {
        if (!editingDraft || editingDraft.draftType !== 'ebook') return;
        setRegeneratingImages(prev => ({ ...prev, [prompt]: true })); setError(null);
        try {
            const imageModel = editingDraft.imageModel || 'imagen-4.0-generate-001';
            let newImageUrl = '';
            if (imageModel.startsWith('remote-')) {
                const taskId = await queueRemoteImage(prompt, imageModel as any, '1:1');
                newImageUrl = `[PENDING:${taskId}]`;
            } else {
                const base64Data = await generateImage(prompt, '1:1', imageModel as any);
                const imageFile = base64ToFile(base64Data, `inline_image_${Date.now()}.png`);
                const url = await uploadImage(imageFile);
                if(url) newImageUrl = url;
            }
            if (!newImageUrl) throw new Error("Failed to upload.");
            const updatedChapters = [...(editingDraft.chapters || [])];
            let chapterContent = updatedChapters[chapterIndex].content;
            const promptForAttribute = prompt.replace(/"/g, '&quot;');
            const escapedPromptForRegex = promptForAttribute.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
            const imgTagRegex = new RegExp(`<img[^>]*data-prompt="${escapedPromptForRegex}"[^>]*>`);
            const imgTagMatch = chapterContent.match(imgTagRegex);
            if (imgTagMatch) {
                const oldImgTag = imgTagMatch[0];
                const newImgTag = oldImgTag.replace(/src="[^"]*"/, `src="${newImageUrl}"`);
                chapterContent = chapterContent.replace(oldImgTag, newImgTag);
            }
            updatedChapters[chapterIndex] = { ...updatedChapters[chapterIndex], content: chapterContent };
            const updatedDraft = { ...editingDraft, chapters: updatedChapters };
            setEditingDraft(updatedDraft); await saveDraft(updatedDraft);
        } catch (e: any) { setError("Failed to regenerate image: " + e.message); }
        finally { setRegeneratingImages(prev => { const newState = {...prev}; delete newState[prompt]; return newState; }); }
    };

    const handleImageResolved = async (chapterIndex: number | 'cover', oldPendingSrc: string, newUrl: string) => {
        if (!editingDraft) return;
        const updatedDraft = { ...editingDraft };
        // FIX: Added explicit cast to any to safely set coverImageUrl or chapter content
        if (chapterIndex === 'cover') { (updatedDraft as any).coverImageUrl = newUrl; }
        else if (updatedDraft.draftType === 'ebook' && updatedDraft.chapters) {
            const updatedChapters = [...updatedDraft.chapters];
            let chapterContent = updatedChapters[chapterIndex].content;
            chapterContent = chapterContent.replace(oldPendingSrc, newUrl);
            updatedChapters[chapterIndex] = { ...updatedChapters[chapterIndex], content: chapterContent };
            updatedDraft.chapters = updatedChapters;
        }
        setEditingDraft(updatedDraft); await saveDraft(updatedDraft);
    };

    const handleDeleteDraftRequest = (draft: Draft) => { setDraftToDelete(draft); setShowDeleteDraftModal(true); };
    const confirmDeleteDraft = async () => {
        if (!confirmDeleteDraft || !draftToDelete || !draftToDelete.id) return;
        setIsLoading(true);
        try { await deleteDraft(draftToDelete.id); setAllDrafts(prev => prev.filter(d => d.id !== draftToDelete.id)); setDraftToDelete(null); setShowDeleteDraftModal(false); }
        catch (e: any) { setError(e.message); } finally { setIsLoading(false); }
    };

    const handleEditItem = async (item: any, type: 'ebook' | 'exam') => {
        setIsLoading(true);
        try {
            const draft: Draft = { ...item, draftType: type, adminUid: auth.currentUser?.uid || 'admin', updatedAt: new Date(), id: item.id };
            if (!(draft as any).accessLevel) { (draft as any).accessLevel = 'free'; }
            await saveDraft(draft);
            setAllDrafts(prev => { const existing = prev.find(d => d.id === draft.id); if (existing) { return prev.map(d => d.id === draft.id ? draft : d); } return [draft, ...prev]; });
            setEditingDraft(draft); setExpandedDraftId(draft.id!); setActiveTab('editor'); setActiveEditorTab(type);
        } catch (e: any) { setError("Failed to create draft: " + e.message); }
        finally { setIsLoading(false); }
    };

    const handleDeleteItem = (id: string, title: string, type: 'ebook' | 'exam') => { setItemToDelete({ id, title, type }); setShowDeleteModal(true); };
    const confirmDeleteItem = async () => {
        if (!itemToDelete) return;
        setIsLoading(true);
        try {
            if (itemToDelete.type === 'ebook') await deletePublishedEbook(itemToDelete.id);
            else if (itemToDelete.type === 'exam') await deletePublishedExamQST(itemToDelete.id);
            if (activePublishedTab === 'ebooks') fetchPublishedEbooks();
            else if (activePublishedTab === 'exams') fetchPublishedExams();
            setItemToDelete(null); setShowDeleteModal(false);
        } catch (e: any) { setError(e.message); } finally { setIsLoading(false); }
    };

    const EbookContentRenderer = ({ content, chapterIndex }: { content: string; chapterIndex: number }) => {
        const parts = content.split(/(<img[^>]+>)/g).filter(Boolean);
        return (
            <>
                {parts.map((part, index) => {
                    if (part.startsWith('<img')) {
                        const srcMatch = part.match(/src="([^"]*)"/);
                        const promptMatch = part.match(/data-prompt="([^"]*)"/);
                        const altMatch = part.match(/alt="([^\""]*)"/);
                        const src = srcMatch ? srcMatch[1] : '';
                        const dataPrompt = promptMatch ? promptMatch[1].replace(/&quot;/g, '"') : '';
                        const altText = altMatch ? altMatch[1].replace(/&quot;/g, '"') : '';
                        const prompt = dataPrompt || altText;
                        const pendingMatch = src.match(/^\[PENDING:(.+)\]$/);
                        if (pendingMatch) {
                            const taskId = pendingMatch[1];
                            return <div key={index}><PendingImageMonitor taskId={taskId} onResolve={(newUrl) => handleImageResolved(chapterIndex, src, newUrl)} onRetry={() => handleRegenerateInlineImage(prompt, chapterIndex)}/></div>;
                        }
                        if (!src || src === '[TEMP_SRC]') {
                            const isRegenerating = prompt ? regeneratingImages[prompt] : false;
                            return (
                                <div key={index} className="my-4 p-4 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center text-center bg-gray-900">
                                    <ImageIcon className="text-gray-500 mb-2" size={48} />
                                    <p className="text-sm text-gray-400 mb-4">Image not generated.</p>
                                    {prompt && (
                                        <>
                                            <p className="text-xs text-gray-500 bg-gray-800 p-2 rounded w-full truncate mb-4" title={prompt}>Prompt: {prompt}</p>
                                            <button onClick={() => handleRegenerateInlineImage(prompt, chapterIndex)} disabled={isRegenerating} className="flex items-center justify-center space-x-2 text-sm text-orange-400 hover:text-orange-300 disabled:opacity-50">
                                                <RefreshCw size={16} className={isRegenerating ? 'animate-spin' : ''} /><span>{isRegenerating ? 'Regenerating...' : 'Regenerate'}</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            );
                        }
                        const isRegenerating = prompt ? regeneratingImages[prompt] : false;
                        return (
                            <div key={index} className="my-4 text-center">
                                <div dangerouslySetInnerHTML={{ __html: part }} />
                                {prompt && (
                                    <button onClick={() => handleRegenerateInlineImage(prompt, chapterIndex)} disabled={isRegenerating} className="mt-2 flex items-center justify-center space-x-2 text-sm text-orange-400 hover:text-orange-300 disabled:opacity-50 mx-auto">
                                        <RefreshCw size={16} className={isRegenerating ? 'animate-spin' : ''} /><span>{isRegenerating ? 'Regenerating...' : 'Regenerate'}</span>
                                    </button>
                                )}
                            </div>
                        );
                    } else { return <div key={index} dangerouslySetInnerHTML={{ __html: part }} />; }
                })}
            </>
        );
    };

    const renderEditorTab = () => {
        const filteredDrafts = allDrafts.filter(d => d.draftType === activeEditorTab);
        if (allDrafts.length === 0) return <div className="text-center p-8"><p className="text-gray-400">No drafts yet. Generate content from the 'Create' tab to begin.</p></div>;
        return (
            <div>
                <div className="flex border-b border-gray-700 mb-6 justify-between items-center">
                    <div className="flex">
                        <button onClick={() => setActiveEditorTab('ebook')} className={`py-2 px-4 ${activeEditorTab === 'ebook' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-400'}`}>Ebooks ({allDrafts.filter(d => d.draftType === 'ebook').length})</button>
                        <button onClick={() => setActiveEditorTab('exam')} className={`py-2 px-4 ${activeEditorTab === 'exam' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-400'}`}>Test Prep ({allDrafts.filter(d => d.draftType === 'exam').length})</button>
                    </div>
                </div>
                {filteredDrafts.length === 0 ? <p className="text-gray-400 text-center py-4">No {activeEditorTab === 'exam' ? 'Test Prep' : activeEditorTab} drafts.</p> : (
                    <div className="space-y-4">
                        {filteredDrafts.map(draft => {
                            const isExpanded = expandedDraftId === draft.id;
                            // FIX: Cast currentDraft to any because this section only handles ebook/exam drafts which have these properties like coverImageUrl and imageModel
                            const currentDraft = (isExpanded && editingDraft ? editingDraft : draft) as any;
                            const displayTitle = (draft.title || 'Untitled Draft');
                            const truncatedTitle = displayTitle.length > 25 ? displayTitle.substring(0, 25) + '...' : displayTitle;
                            const isPublishing = publishingIds.has(draft.id!);

                            return (
                                <div key={draft.id} data-draft-id={draft.id} className={`bg-gray-900 rounded-lg border transition-all ${isPublishing ? 'opacity-50 border-orange-500 animate-pulse' : 'border-gray-700'}`}>
                                    <button onClick={() => { if (isExpanded) { setExpandedDraftId(null); setEditingDraft(null); } else { setExpandedDraftId(draft.id!); setEditingDraft(draft); setCoverImageFile(null); } }} className="w-full flex justify-between items-center p-4 text-left hover:bg-gray-800 transition-colors">
                                        <div className="flex items-center gap-3">
                                            {isPublishing && <Loader2 size={16} className="animate-spin text-orange-500" />}
                                            <div><span className="font-bold text-lg block" title={draft.title}>{truncatedTitle}</span><span className="text-xs text-gray-400">{draft.subject} • {(draft as any).accessLevel?.toUpperCase()}</span></div>
                                        </div>
                                        <div className="flex items-center space-x-4"><button onClick={(e) => { e.stopPropagation(); handleDeleteDraftRequest(draft); }} className="text-red-500 hover:text-red-400"><Trash2 size={18} /></button>{isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}</div>
                                    </button>
                                    {isExpanded && currentDraft && (
                                        <div className="p-6 border-t border-gray-700 space-y-6">
                                            <div className="bg-gray-800 p-3 rounded-lg border border-gray-600 flex items-center justify-between">
                                                <label className="text-sm font-bold text-orange-400 uppercase">Access Level (Override)</label>
                                                <select value={currentDraft.accessLevel || 'free'} onChange={e => setEditingDraft({ ...currentDraft, accessLevel: e.target.value as 'free' | 'pro' } as any as Draft)} className="bg-gray-900 border border-gray-600 rounded p-1 text-white text-sm">
                                                    <option value="free">Free</option><option value="pro">Pro (Paid)</option>
                                                </select>
                                            </div>
                                            <div><label className="block text-sm font-medium text-gray-300">Title</label><input type="text" value={currentDraft.title} onChange={e => setEditingDraft({ ...currentDraft, title: e.target.value })} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3" placeholder="Enter title" /></div>
                                            <div><label className="block text-sm font-medium text-gray-300">Image Generation Model</label><select value={currentDraft.imageModel || 'imagen-4.0-generate-001'} onChange={e => setEditingDraft({ ...currentDraft, imageModel: e.target.value as any })} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"><option value="imagen-4.0-generate-001">Imagen 4 (Highest Quality)</option><option value="gemini-2.5-flash-image">Gemini Flash Image (Fast & Efficient)</option><option value="remote-imagen-4">Remote Imagen 4 (External Quota)</option><option value="remote-gemini-flash">Remote Gemini Flash (External Quota)</option></select></div>
                                            <div><div><label className="block text-sm font-medium text-gray-300">Cover Image</label></div><input type="file" accept="image/*" onChange={(e) => setCoverImageFile(e.target.files ? e.target.files[0] : null)} className="mt-1 block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100" /><div className={`mt-4 bg-gray-900 rounded-lg flex items-center justify-center w-40 h-40`}>{isRegeneratingCover ? (<div className="w-full px-2"><GenerationProgress progress={coverRegenProgress.progress} progressText={coverRegenProgress.text} compact /></div>) : ((() => { 
                                                // FIX: Access coverImageUrl from the cast currentDraft
                                                const currentCover = currentDraft.coverImageUrl; 
                                                if (currentCover && currentCover.startsWith('[PENDING:')) { const taskId = currentCover.match(/^\[PENDING:(.+)\]$/)?.[1]; if (taskId) return (<div className="w-full px-4"><PendingImageMonitor taskId={taskId} onResolve={(url) => handleImageResolved('cover', currentCover, url)} onRetry={handleRegenerateCover}/></div>); } 
                                                // FIX: Access currentCover properly in ternary
                                                return (coverImageFile || currentCover) ? <img src={coverImageFile ? URL.createObjectURL(coverImageFile) : currentCover} alt="Cover Preview" className="w-full h-full object-contain rounded-lg" /> : <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500">No Image</div> 
                                            })())}</div><div className="text-center mt-2"><button onClick={handleRegenerateCover} disabled={isRegeneratingCover} className="flex items-center justify-center space-x-2 text-sm text-orange-400 hover:text-orange-300 disabled:opacity-50 mx-auto"><RefreshCw size={16} className={isRegeneratingCover ? 'animate-spin' : ''} /><span>{isRegeneratingCover ? 'Regenerating...' : 'Regenerate'}</span></button></div></div>
                                            {draft.draftType === 'ebook' && (
                                                <>
                                                    <div className="flex items-center justify-between w-full p-3 bg-gray-800 rounded-t-lg mt-6 border-b border-gray-700">
                                                        <span className="font-semibold text-gray-300">Content Preview</span>
                                                        <button onClick={() => setShowContentPreview(!showContentPreview)} className="p-1 hover:bg-gray-700 rounded">
                                                            {showContentPreview ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                        </button>
                                                    </div>
                                                    {showContentPreview && (
                                                        <div className="border border-t-0 border-gray-700 rounded-b-lg p-4 bg-gray-800 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                                            {(currentDraft as Ebook).chapters?.map((chapter, index) => (
                                                                <div key={chapter.chapter} className="mb-6 pb-6 border-b border-gray-700 last:border-b-0">
                                                                    <h4 className="text-xl font-bold text-orange-400 mb-2">{chapter.title}</h4>
                                                                    <EbookContentRenderer content={chapter.content} chapterIndex={index} />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            <div className="flex justify-end gap-4 mt-6">
                                                <button onClick={() => saveDraft(currentDraft)} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg">Save Draft</button>
                                                <button 
                                                    onClick={() => handlePublish(currentDraft, coverImageFile)} 
                                                    disabled={isPublishing} 
                                                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center gap-2"
                                                >
                                                    {isPublishing ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                                                    {isPublishing ? "Processing..." : "Publish Item"}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const renderCreateTab = () => (
        <div>
            <div className="flex border-b border-gray-700 mb-6">
                <button onClick={() => setActiveCreateTab('ebook')} className={`py-2 px-4 ${activeCreateTab === 'ebook' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-400'}`}>Ebook</button>
                <button onClick={() => setActiveCreateTab('testprep')} className={`py-2 px-4 ${activeCreateTab === 'testprep' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-400'}`}>Test Prep</button>
            </div>
            {activeCreateTab === 'ebook' && renderEbookForm()}
            {activeCreateTab === 'testprep' && renderTestPrepForm()}
        </div>
    );

    const renderEbookForm = () => (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300">Subject</label>
                    <select value={subject} onChange={e => {setSubject(e.target.value); setSelectedSubtopics([]); setCustomTopic(""); }} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50">
                        {Object.keys(SYLLABUS_DATA).sort().map(s => <option key={s} value={s}>{s}</option>)}
                        <option value="General">General (Custom Topic)</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300">Book Type</label>
                    <select value={ebookType} onChange={e => setEbookType(e.target.value as any)} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50">
                        <option value="Complete">Complete (Paid/Pro)</option>
                        <option value="Simple (Summary)">Summary (Free)</option>
                    </select>
                </div>
            </div>
            {subject === 'General' ? (
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Topic Title</label>
                    <input type="text" value={customTopic} onChange={(e) => setCustomTopic(e.target.value)} placeholder="e.g. The Solar System" className="w-full bg-gray-800 border border-gray-600 rounded-md p-3 text-white focus:ring-orange-500"/>
                </div>
            ) : (
                <div className="bg-gray-900 rounded-lg p-4 max-h-[400px] overflow-y-auto custom-scrollbar border border-gray-700">
                    <h3 className="text-orange-500 font-bold mb-3 sticky top-0 bg-gray-900 pb-2 border-b border-gray-700 z-10 flex justify-between items-center"><span>{subject} Syllabus</span><span className="text-xs text-gray-400">{selectedSubtopics.length} Selected</span></h3>
                    {SYLLABUS_DATA[subject]?.map((category: any) => {
                        const isExpanded = expandedCategories.includes(category.id);
                        const subtopics = category.subtopics || [];
                        return (
                            <div key={category.id} className="mb-2 border border-gray-800 rounded-lg overflow-hidden">
                                <button onClick={() => toggleCategory(category.id)} className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-750 transition-colors"><span className="font-bold text-sm text-gray-200">{category.topic}</span>{isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</button>
                                {isExpanded && (
                                    <div className="p-3 bg-gray-900/50 space-y-2">
                                        {subtopics.map((sub: string) => {
                                            const val = `${category.topic}::${sub}`;
                                            const isSelected = selectedSubtopics.includes(val);
                                            return (
                                                <div key={sub} onClick={() => toggleSubtopic(category.topic, sub)} className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-gray-800 rounded"><div className={`w-4 h-4 border rounded flex items-center justify-center ${isSelected ? 'bg-orange-600 border-orange-600' : 'border-gray-600'}`}>{isSelected && <Check size={12} className="text-white"/>}</div><span className={`text-sm ${isSelected ? 'text-orange-400' : 'text-gray-400'}`}>{sub}</span></div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
            <div>
                <label className="block text-sm font-medium text-gray-300">Image Generation Model</label>
                <select value={imageModel} onChange={e => setImageModel(e.target.value as any)} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50">
                    <option value="imagen-4.0-generate-001">Imagen 4 (Highest Quality)</option>
                    <option value="gemini-2.5-flash-image">Gemini Flash Image (Fast & Efficient)</option>
                    <option value="remote-imagen-4">Remote Imagen 4 (External Quota)</option>
                    <option value="remote-gemini-flash">Remote Gemini Flash (External Quota)</option>
                </select>
            </div>
            {generationQueue.length > 0 && (
                <div className="bg-gray-800 p-3 rounded border border-gray-700">
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Generation Queue</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                        {generationQueue.map((t, i) => (
                            <div key={t.id} className="flex justify-between items-center text-xs p-1 bg-gray-900 rounded"><span className="truncate flex-1">{i+1}. {t.topic}</span><span className={`px-2 py-0.5 rounded font-bold ${t.status === 'completed' ? 'text-green-400' : t.status === 'generating' ? 'text-yellow-400 animate-pulse' : t.status === 'error' ? 'text-red-400' : 'text-gray-500'}`}>{t.status}</span></div>
                        ))}
                    </div>
                </div>
            )}
            {progressText ? (<GenerationProgress progress={generationProgress} progressText={progressText} />) : ( 
                <div className="flex gap-4">
                    <button onClick={addToQueue} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"><Plus size={18} className="mr-2"/> Add {subject === 'General' ? 'Topic' : `${selectedSubtopics.length}`} to Queue</button>
                    {generationQueue.length > 0 && (
                        <button onClick={() => setIsQueueRunning(!isQueueRunning)} className={`flex-1 font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center text-white ${isQueueRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>{isQueueRunning ? <><Pause size={18} className="mr-2"/> Pause Queue</> : <><Play size={18} className="mr-2"/> Process Queue</>}</button>
                    )}
                </div>
            )} 
        </div>
    );

    const renderTestPrepForm = () => (
        <fieldset disabled={isLoading && progressText !== ''} className="space-y-4">
            <div className="bg-gray-900 rounded-lg p-4 max-h-[400px] overflow-y-auto custom-scrollbar border border-gray-700">
                <h3 className="text-orange-500 font-bold mb-3 sticky top-0 bg-gray-900 pb-2 border-b border-gray-700 z-10 flex justify-between items-center"><span>Select Subjects</span><span className="text-xs text-gray-400">{testPrepSelectedSubjects.length} Selected</span></h3>
                {Object.keys(NIGERIAN_CURRICULUM_SUBJECTS).sort().map((subject) => {
                    const isExpanded = testPrepExpandedSubjects.includes(subject);
                    const isSelected = testPrepSelectedSubjects.includes(subject);
                    return (
                        <div key={subject} className="mb-2 border border-gray-800 rounded-lg overflow-hidden">
                            <button onClick={() => toggleTestPrepSubject(subject)} className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-700 transition-colors"><span className="font-bold text-sm text-gray-200">{subject}</span><div className="flex items-center space-x-2">{isSelected && <span className="text-xs text-green-500 font-bold">Selected</span>}{isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</div></button>
                            {isExpanded && (
                                <div className="p-3 bg-gray-900/50"><div onClick={() => toggleSelectSubjectForQueue(subject)} className={`flex items-center space-x-3 cursor-pointer p-2 rounded border ${isSelected ? 'bg-orange-900/20 border-orange-500' : 'hover:bg-gray-800 border-gray-700'}`}><div className={`w-4 h-4 border rounded flex items-center justify-center ${isSelected ? 'bg-orange-600 border-orange-600' : 'border-gray-600'}`}>{isSelected && <Check size={12} className="text-white"/>}</div><div className="flex flex-col"><span className={`text-sm font-bold ${isSelected ? 'text-orange-400' : 'text-gray-300'}`}>All Topics</span><span className="text-[10px] text-gray-500">Generate a comprehensive {testPrepDifficulty} exam for {subject} covering the entire syllabus.</span></div></div></div>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-300">Question Type</label><select value={testPrepQuestionType} onChange={e => setTestPrepQuestionType(e.target.value as QuestionType)} className="mt-1 block w-full bg-gray-700 rounded-md py-2 px-3 focus:outline-none focus:ring-orange-500"><option value={QuestionType.MCQ}>Multiple Choice</option><option value={QuestionType.THEORY}>Theory</option></select></div>
                <div><label className="block text-sm font-medium text-gray-300"># of Questions</label><input type="number" value={testPrepNumQuestions} onChange={e => setTestPrepNumQuestions(parseInt(e.target.value))} min="1" max="50" className="mt-1 block w-full bg-gray-700 rounded-md py-2 px-3 focus:outline-none focus:ring-orange-500"/></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-300">Difficulty Level</label><select value={testPrepDifficulty} onChange={e => setTestPrepDifficulty(e.target.value)} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50"><option value="Junior Level">Junior Level (SS1 - Free)</option><option value="Senior Level">Senior Level (SS2 - Pro)</option><option value="Tertiary Level">Tertiary Level (SS3/JAMB - Pro)</option></select></div>
            
            <div>
                <label className="block text-sm font-medium text-gray-300">Image Generation Model</label>
                <select value={imageModel} onChange={e => setImageModel(e.target.value as any)} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50">
                    <option value="imagen-4.0-generate-001">Imagen 4 (Highest Quality)</option>
                    <option value="gemini-2.5-flash-image">Gemini Flash Image (Fast & Efficient)</option>
                    <option value="remote-imagen-4">Remote Imagen 4 (External Quota)</option>
                    <option value="remote-gemini-flash">Remote Gemini Flash (External Quota)</option>
                </select>
            </div>

            {isLoading && progressText ? (<GenerationProgress progress={generationProgress} progressText={progressText} />) : (<button onClick={handleGenerateTestPrep} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-500 flex items-center justify-center"><BookPlus className="mr-2" size={18}/> Generate Test Prep ({testPrepSelectedSubjects.length} Subjects Selected)</button>)}
        </fieldset>
    );
    
    const renderPublishedTab = () => { const items = activePublishedTab === 'ebooks' ? publishedEbooks : publishedExams; const filteredItems = items.filter(item => { const matchesSearch = item.title.toLowerCase().includes(publishedSearchTerm.toLowerCase()) || item.subject.toLowerCase().includes(publishedSearchTerm.toLowerCase()) || item.topic.toLowerCase().includes(publishedSearchTerm.toLowerCase()); const matchesFilter = publishedFilter === 'all' || (publishedFilter === 'free' && item.accessLevel === 'free') || (publishedFilter === 'pro' && item.accessLevel === 'pro'); return matchesSearch && matchesFilter; }); return ( <div> <div className="flex border-b border-gray-700 mb-6"> <button onClick={() => setActivePublishedTab('ebooks')} className={`py-2 px-4 ${activePublishedTab === 'ebooks' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-400'}`}>Ebooks</button> <button onClick={() => setActivePublishedTab('exams')} className={`py-2 px-4 ${activePublishedTab === 'exams' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-400'}`}>Test Prep</button> </div> <h3 className="text-2xl font-bold mb-4">Published {activePublishedTab === 'exams' ? 'Test Prep' : 'Ebooks'}</h3> <div className="flex gap-4 mb-4"><input type="text" placeholder="Search by title, subject, or topic..." value={publishedSearchTerm} onChange={(e) => setPublishedSearchTerm(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-orange-500" /> <select value={publishedFilter} onChange={(e) => setPublishedFilter(e.target.value as any)} className="bg-gray-700 border border-gray-600 rounded px-2 text-white"><option value="all">All</option><option value="free">Free</option><option value="pro">Pro</option></select></div><div className="space-y-4"> {items.length === 0 ? <p className="text-gray-400 text-center py-4">No items published yet.</p> : filteredItems.length > 0 ? ( filteredItems.map(item => { const cover = 'coverImageUrl' in item ? item.coverImageUrl : ''; return ( <div key={item.id} className={`bg-gray-900 p-4 rounded-lg flex items-center justify-between border-l-4 ${item.accessLevel === 'pro' ? 'border-l-yellow-500' : 'border-l-green-500'}`}> <div className="flex items-center space-x-4 overflow-hidden"> <img src={cover} alt={item.title} className="w-20 h-20 object-cover rounded flex-shrink-0"/> <div className="overflow-hidden"> <p className="font-bold truncate" title={item.title}>{item.title}</p><p className="text-sm text-gray-400">{item.subject}</p> <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${item.accessLevel === 'pro' ? 'bg-yellow-500/30 text-yellow-500' : 'bg-green-900/30 text-green-500'}`}>{item.accessLevel}</span></div> </div> <div className="flex items-center space-x-2 flex-shrink-0"> <button onClick={() => handleEditItem(item, activePublishedTab.slice(0, -1) as any)} title="Edit" className="p-2 rounded-full text-blue-400 hover:bg-blue-900/50"><Pencil size={20} /></button> <button onClick={() => handleDeleteItem(item.id, item.title, activePublishedTab.slice(0, -1) as any)} title="Delete" className="p-2 rounded-full text-red-400 hover:bg-red-900/50"><Trash2 size={20} /></button> </div> </div> ) }) ) : <p className="text-gray-400 text-center py-4">No items found matching your search.</p>} </div> </div> ); };

    const renderGamesTab = () => (
        <div className="space-y-6">
            <h3 className="text-2xl font-bold mb-4">Game Level Generator</h3>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Select Game</label>
                    <select value={gameId} onChange={(e) => setGameId(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-orange-500">
                        <option value="math-dash">Math Dash</option>
                        <option value="memory-matrix">Memory Matrix</option>
                        <option value="lingo-scramble">Lingo Scramble</option>
                        <option value="true-false">True or False</option>
                        <option value="periodic-table">Periodic Table Quiz</option>
                        <option value="synonym-blast">Synonym Blast</option>
                        <option value="capital-city">Capital City Quiz</option>
                        <option value="odd-one-out">Odd One Out</option>
                        <option value="history-timeline">History Timeline</option>
                        <option value="crossword">Crossword Mini</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Difficulty</label>
                    <select value={gameDifficulty} onChange={(e) => setGameDifficulty(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-orange-500">
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Topic (Optional)</label>
                    <input type="text" value={gameTopic} onChange={(e) => setGameTopic(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-orange-500" placeholder="e.g. Organic Chemistry" />
                </div>
                <button onClick={handleGenerateGameLevel} disabled={isLoading} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center">
                    {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" size={18}/>}
                    {isLoading ? 'Generating...' : 'Generate & Save Level'}
                </button>
            </div>
        </div>
    );

    return (
        <div className="p-4">
            <h1 className="text-3xl font-bold text-orange-500 mb-6">Creator Studio</h1>
            {isLoading && !progressText && <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-[100]"><LoadingSpinner /><p className="mt-4 text-white font-bold">{loadingMessage}</p></div>}
            
            {error && <div className="bg-red-500 text-white p-4 rounded-lg mb-4 flex justify-between items-center"><span>{error}</span><button onClick={() => setError(null)}><X size={20}/></button></div>}
            
            {showDeleteModal && itemToDelete && (<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4"><div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700 shadow-2xl animate-fade-in-up"><h2 className="text-xl font-bold mb-2 text-white">Delete {itemToDelete.type}</h2><p className="text-gray-400 mb-4">Are you sure? This cannot be undone.</p><div className="bg-gray-900 p-4 rounded-lg my-4 text-center font-bold text-orange-400">"{itemToDelete.title}"</div><div className="flex justify-end space-x-4"><button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">Cancel</button><button onClick={confirmDeleteItem} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors shadow-lg shadow-red-900/20">Yes, Delete</button></div></div></div>)}
            {showDeleteDraftModal && draftToDelete && (<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4"><div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700 shadow-2xl animate-fade-in-up"><h2 className="text-xl font-bold mb-2 text-white">Delete Draft</h2><p className="text-gray-400 mb-4">Permanently delete this draft?</p><div className="bg-gray-900 p-4 rounded-lg my-4 text-center font-bold text-orange-400">"{draftToDelete.title}"</div><div className="flex justify-end space-x-4"><button onClick={() => setShowDeleteDraftModal(false)} className="px-4 py-2 bg-gray-700 rounded-lg text-white">Cancel</button><button onClick={confirmDeleteDraft} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold">Delete Draft</button></div></div></div>)}

            <div className="border-b border-gray-700 mb-6 overflow-x-auto"><div className="flex space-x-2 pb-px min-w-max"><button onClick={() => setActiveTab('create')} className={`flex items-center space-x-2 py-3 px-6 transition-colors ${activeTab === 'create' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-400 hover:text-gray-200'}`}><BookPlus size={20}/> <span>Create</span></button><button onClick={() => setActiveTab('editor')} className={`flex items-center space-x-2 py-3 px-6 transition-colors ${activeTab === 'editor' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-400 hover:text-gray-200'}`}><Pencil size={20}/> <span>Editor</span></button><button onClick={() => setActiveTab('published')} className={`flex items-center space-x-2 py-3 px-6 transition-colors ${activeTab === 'published' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-400 hover:text-gray-200'}`}><BookCheck size={20}/> <span>Published</span></button><button onClick={() => setActiveTab('games')} className={`flex items-center space-x-2 py-3 px-6 transition-colors ${activeTab === 'games' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-400 hover:text-gray-200'}`}><Gamepad2 size={20}/> <span>Games</span></button></div></div>
            <div className="bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-700">
                {activeTab === 'create' && renderCreateTab()}
                {activeTab === 'editor' && renderEditorTab()}
                {activeTab === 'published' && renderPublishedTab()}
                {activeTab === 'games' && renderGamesTab()}
            </div>
             {showScrollToTop && (<button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-24 right-6 bg-orange-600 hover:bg-orange-700 text-white p-4 rounded-full shadow-2xl transition-all duration-300 z-[90] active:scale-90" aria-label="Scroll to top"><ChevronUp size={28} /></button>)}
        </div>
    );
};

export default AdminPage;