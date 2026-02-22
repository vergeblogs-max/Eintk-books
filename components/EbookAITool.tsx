import React, { useEffect, useRef } from 'react';
import { X, Search as SearchIcon, Wand2, Copy } from 'lucide-react';
import { ensureMathJaxSafe } from '../services/geminiService';

interface EbookAIToolProps {
    result: { type: 'def' | 'simple'; content: string };
    onClose: () => void;
}

// Robust text formatter for AI response
const formatAIContent = (text: string) => {
    // Standardize delimiters first
    let formatted = ensureMathJaxSafe(text);

    // 1. Basic Markdown Headers (###, ##, #) - Reduced sizes as requested
    // h3 - small, bold, uppercase
    formatted = formatted.replace(/^###\s+(.*$)/gm, '<h3 class="text-[11px] font-black text-orange-500 mt-4 mb-1 uppercase tracking-widest">$1</h3>');
    // h2 - medium
    formatted = formatted.replace(/^##\s+(.*$)/gm, '<h2 class="text-sm font-black text-white mt-5 mb-2 uppercase tracking-tighter italic border-l-2 border-orange-500 pl-2">$1</h2>');
    // h1 - large
    formatted = formatted.replace(/^#\s+(.*$)/gm, '<h1 class="text-base font-black text-orange-400 mt-6 mb-2 uppercase tracking-tight">$1</h1>');

    // 2. Bold text (Double Asterisks)
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="text-orange-400 font-bold">$1</strong>');
    
    // 3. Italics / Subtle Bold (Single Asterisks)
    formatted = formatted.replace(/\*(.*?)\*/g, '<span class="text-orange-300/90 italic font-medium">$1</span>');
    
    // 4. Lists
    // Handle the common " * item" pattern from Gemini
    formatted = formatted.replace(/^\s*\*\s+(.*$)/gm, '<div class="flex items-start mb-2 ml-2"><span class="text-orange-500 mr-2 text-xs">•</span><span class="text-gray-300 text-sm leading-relaxed">$1</span></div>');
    
    // 5. Paragraph splitting
    const segments = formatted.split('\n\n').filter(p => p.trim() !== '');
    
    return segments.map(p => {
        // If it already has our HTML tags, return it
        if (p.trim().startsWith('<h') || p.trim().startsWith('<div')) return p;
        // Otherwise wrap as a standard paragraph
        return `<p class="mb-4 text-sm leading-relaxed text-gray-200">${p}</p>`;
    }).join('');
};

const EbookAITool: React.FC<EbookAIToolProps> = ({ result, onClose }) => {
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Prevent React from re-rendering raw HTML by manually injecting it
        // This stops the "flicker" where MathJax renders then React reverts it
        if (contentRef.current) {
            contentRef.current.innerHTML = formatAIContent(result.content);

            const typeset = async () => {
                if (window.MathJax && window.MathJax.typesetPromise) {
                    try {
                        // Clear previous MathJax artifacts in this specific node
                        const errors = contentRef.current?.querySelectorAll('mjx-merror, .mjx-error');
                        errors?.forEach(err => err.remove());
                        
                        // Render Math
                        await window.MathJax.typesetPromise([contentRef.current]);
                    } catch (e) {
                        console.warn("MathJax Typeset Error in EbookAITool:", e);
                    }
                }
            };

            // Immediate attempt
            typeset();
            
            // Backup attempt for slower devices/loading scripts
            const timer = setTimeout(typeset, 200);
            return () => clearTimeout(timer);
        }
    }, [result.content]);

    return (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end sm:justify-center sm:items-center">
            {/* Backdrop - Blocks clicks to the background app */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
                onClick={onClose}
            ></div>

            {/* Main Tool Container */}
            <div className="relative w-full sm:max-w-xl bg-gray-900 border-t-2 sm:border-2 border-orange-600 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] p-6 animate-slide-up-bottom flex flex-col max-h-[85vh] sm:max-h-[80vh]">
                
                {/* Header */}
                <div className="flex justify-between items-center mb-6 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        {result.type === 'def' ? (
                            <div className="bg-orange-600/20 p-2.5 rounded-xl border border-orange-500/30 text-orange-500">
                                <SearchIcon size={20} />
                            </div>
                        ) : (
                            <div className="bg-blue-600/20 p-2.5 rounded-xl border border-blue-500/30 text-blue-400">
                                <Wand2 size={20} />
                            </div>
                        )}
                        <div>
                            <h4 className="text-white font-black uppercase tracking-tighter text-lg leading-none">
                                {result.type === 'def' ? 'Deep Insight' : 'Core Summary'}
                            </h4>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Nova AI Intelligence</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2.5 bg-gray-800 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-all border border-gray-700 active:scale-90"
                    >
                        <X size={20}/>
                    </button>
                </div>

                {/* Scrollable Content Area */}
                <div className="bg-gray-800/40 p-6 rounded-[2rem] border border-white/5 shadow-inner mb-6 relative overflow-y-auto custom-scrollbar flex-grow min-h-[250px]">
                    {/* Decorative background element */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-orange-600/5 to-transparent rounded-bl-full pointer-events-none"></div>
                    
                    <div 
                        ref={contentRef} 
                        className="text-gray-200 text-base leading-relaxed font-sans ebook-content" 
                    />
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-3 flex-shrink-0 pb-[env(safe-area-inset-bottom)]">
                    <button 
                        onClick={() => {
                            navigator.clipboard.writeText(result.content);
                            // Optional: Show feedback
                        }} 
                        className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-orange-500 flex items-center bg-gray-900 px-6 py-3 rounded-xl transition-all border border-white/5 active:scale-95 shadow-lg"
                    >
                        <Copy size={14} className="mr-2"/> Copy Insight
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EbookAITool;
