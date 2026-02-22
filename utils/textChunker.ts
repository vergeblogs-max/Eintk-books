
export interface TextChunk {
    id: number;
    text: string;     // Clean text for AI
    html: string;     // HTML for display (optional, can be same as clean for simplicity)
    originalIndex: number; // Index in the chapter
}

// Simple HTML stripper
const stripHtml = (html: string) => {
   let tmp = document.createElement("DIV");
   tmp.innerHTML = html;
   return tmp.textContent || tmp.innerText || "";
};

export const chunkChapterContent = (htmlContent: string): TextChunk[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const chunks: TextChunk[] = [];
    
    // We split by significant block tags to ensure natural pauses
    // Paragraphs, Headers, Divs, Lists
    const blockNodes = doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote');
    
    let counter = 0;

    if (blockNodes.length === 0) {
        // Fallback for plain text or weird HTML
        const clean = stripHtml(htmlContent);
        if (clean.trim()) {
            chunks.push({
                id: 0,
                text: clean,
                html: htmlContent,
                originalIndex: 0
            });
        }
        return chunks;
    }

    blockNodes.forEach((node, index) => {
        const text = (node.textContent || '').trim();
        // Skip empty nodes or very short ones (unless they are headers)
        if (text.length > 0) {
            // Logic to merge very short sentences (e.g. "Yes.") with next paragraph could go here
            // For now, simple mapping
            chunks.push({
                id: counter++,
                text: text,
                html: node.outerHTML, // Keep the HTML tag for styling
                originalIndex: index
            });
        }
    });

    return chunks;
};

export const aggregateTextForAudio = (chapters: {title: string, content: string}[]): { id: number, text: string }[] => {
    const audioChunks: { id: number, text: string }[] = [];
    let currentText = "";
    let globalId = 0;
    const CHAR_LIMIT = 1000; // Target ~1000 chars per chunk for smoother playback

    chapters.forEach(ch => {
        // Start chapter with title
        currentText += `${ch.title}. \n\n`;

        const blocks = chunkChapterContent(ch.content);
        
        blocks.forEach(block => {
            const cleanText = block.text.trim();
            if (!cleanText) return;

            // Heuristic: If adding this block exceeds limit, push current accumulator
            // Only push if we have a decent amount of text already (>200 chars) to avoid tiny chunks
            if (currentText.length + cleanText.length > CHAR_LIMIT && currentText.length > 200) {
                audioChunks.push({ id: globalId++, text: currentText.trim() });
                currentText = "";
            }
            
            // Add block text. Ensure punctuation or spacing.
            const endsWithPunctuation = /[.!?]$/.test(cleanText);
            currentText += cleanText + (endsWithPunctuation ? " " : ". "); 
        });

        // Flush remaining text at end of chapter to ensure clean break between chapters
        if (currentText.trim().length > 0) {
            audioChunks.push({ id: globalId++, text: currentText.trim() });
            currentText = "";
        }
    });

    return audioChunks;
};
