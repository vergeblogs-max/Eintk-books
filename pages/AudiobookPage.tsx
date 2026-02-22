
import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import type { UserData, Ebook } from '../types';
import { getEbookById, consumeEnergy } from '../services/firestoreService';
import { generateSpeech } from '../services/geminiService';
import { saveAudioChunk, getAudioChunk } from '../services/audioCache';
import { aggregateTextForAudio } from '../utils/textChunker';
import { ArrowLeft, Play, Pause, SkipForward, SkipBack, SlidersHorizontal, Loader2, Gauge, Sparkles, Smartphone, Zap, Info, ShieldCheck, Coins } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import InsufficientEnergyModal from '../components/InsufficientEnergyModal';

interface AudiobookPageProps {
    user: User | null;
    userData: UserData | null;
}

const VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];

// Helper to process content for display (MathJax & Images)
const processContent = (html: string) => {
    let processed = html;
    processed = processed.replace(/<img (.*?)>/g, '<img class="rounded-xl shadow-lg my-6 w-full" $1>');
    const fixLatex = (text: string) => {
        try { return text.replace(/(?<!\\)%/g, '\\%'); } catch (e) { return text.replace(/([^\\])%/g, '$1\\%'); }
    };
    processed = processed.replace(/\\\((.*?)\\\)/gs, (_, content) => `\\(${fixLatex(content)}\\)`);
    processed = processed.replace(/\\\[(.*?)\\\]/gs, (_, content) => `\\[${fixLatex(content)}\\]`);
    return processed;
};

const ChapterContent = memo(({ html }: { html: string }) => {
    const contentRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (contentRef.current && window.MathJax && window.MathJax.typesetPromise) {
            window.MathJax.typesetPromise([contentRef.current]).catch(err => console.warn('MathJax error', err));
        }
    }, [html]);
    return (
        <div ref={contentRef} className="ebook-content prose prose-invert prose-lg max-w-none text-gray-300 leading-relaxed font-serif" dangerouslySetInnerHTML={{ __html: html }} />
    );
});

type TTSMode = 'ai' | 'browser' | null;

const AudiobookPage: React.FC<AudiobookPageProps> = ({ user, userData }) => {
    const { ebookId } = useParams<{ ebookId: string }>();
    const navigate = useNavigate();
    
    // Engine State
    const [ttsMode, setTtsMode] = useState<TTSMode>(null);
    const [showEnergyModal, setShowEnergyModal] = useState(false);

    // Data State
    const [ebook, setEbook] = useState<Ebook | null>(null);
    const [audioChunks, setAudioChunks] = useState<{id: number, text: string}[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Player State
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
    const [selectedVoice, setSelectedVoice] = useState('Puck');
    const [readyChunks, setReadyChunks] = useState<Record<number, string>>({}); // Index -> Blob URL
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const [alertMsg, setAlertMsg] = useState('');
    const [scrollSpeed, setScrollSpeed] = useState(1);
    const [showVoiceSettings, setShowVoiceSettings] = useState(false);
    
    const audioRef = useRef<HTMLAudioElement>(null);
    const animationFrameRef = useRef<number | null>(null);
    const processingRef = useRef<Set<number>>(new Set());
    const synthRef = useRef<SpeechSynthesis | null>(window.speechSynthesis);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    const isProUser = userData?.subscriptionStatus === 'pro' || userData?.subscriptionStatus === 'day_pass';
    const AI_SESSION_COST = 100;

    // Load Book Data
    useEffect(() => {
        const init = async () => {
            if (!ebookId) return;
            const book = await getEbookById(ebookId);
            if (!book) { navigate('/'); return; }
            book.chapters.sort((a,b) => a.chapter - b.chapter);
            setEbook(book);
            const chunks = aggregateTextForAudio(book.chapters);
            setAudioChunks(chunks);
            setLoading(false);

            const savedState = localStorage.getItem(`audiobook_state_${ebookId}`);
            if (savedState) {
                const { index, voice, mode } = JSON.parse(savedState);
                if (voice) setSelectedVoice(voice);
                if (index !== undefined && index < chunks.length) setCurrentChunkIndex(index);
                // We don't auto-restore mode to allow user to choose every time or change
            }
        };
        init();
    }, [ebookId, navigate]);

    // Mode Selection Handlers
    const selectBrowserMode = () => {
        setTtsMode('browser');
    };

    const selectAIMode = async () => {
        if (!user || !userData) { navigate('/auth'); return; }
        if ((userData.energy || 0) < AI_SESSION_COST) {
            setShowEnergyModal(true);
            return;
        }
        
        setIsLoadingAudio(true);
        try {
            const success = await consumeEnergy(user.uid, AI_SESSION_COST);
            if (success) {
                setTtsMode('ai');
            } else {
                setAlertMsg("Transaction failed.");
            }
        } catch (e) {
            setAlertMsg("Failed to initiate AI session.");
        } finally {
            setIsLoadingAudio(false);
        }
    };

    // Browser TTS Logic
    const playBrowserChunk = useCallback((index: number) => {
        if (!synthRef.current || !audioChunks[index]) return;
        
        synthRef.current.cancel();
        const utterance = new SpeechSynthesisUtterance(audioChunks[index].text);
        utterance.rate = 1.0; 
        utterance.onend = () => {
            if (isPlaying) onAudioEnded();
        };
        utteranceRef.current = utterance;
        synthRef.current.speak(utterance);
    }, [audioChunks, isPlaying]);

    // AI TTS Pre-fetching Logic
    useEffect(() => {
        if (ttsMode !== 'ai' || audioChunks.length === 0 || !user) return;

        const loadChunk = async (index: number) => {
            if (index >= audioChunks.length || index < 0) return;
            if (readyChunks[index]) return;
            if (processingRef.current.has(index)) return;

            processingRef.current.add(index);
            if (index === currentChunkIndex) setIsLoadingAudio(true);

            try {
                const cached = await getAudioChunk(ebookId!, selectedVoice, index);
                let blobUrl: string;

                if (cached) {
                    blobUrl = URL.createObjectURL(cached.blob);
                } else {
                    if (!navigator.onLine) throw new Error("Offline");
                    const text = audioChunks[index].text;
                    const stylePrompt = "Narrate this section naturally, like reading a book.";
                    const wavBlob = await generateSpeech(text, selectedVoice, stylePrompt);
                    await saveAudioChunk(ebookId!, selectedVoice, index, wavBlob, 0);
                    blobUrl = URL.createObjectURL(wavBlob);
                }

                setReadyChunks(prev => ({ ...prev, [index]: blobUrl }));
                if (index === currentChunkIndex && isPlaying && audioRef.current) {
                    setTimeout(() => audioRef.current?.play(), 100);
                }
            } catch (error) {
                console.error(`Failed to load chunk ${index}`, error);
            } finally {
                processingRef.current.delete(index);
                if (index === currentChunkIndex) setIsLoadingAudio(false);
            }
        };

        loadChunk(currentChunkIndex);
        loadChunk(currentChunkIndex + 1);
    }, [currentChunkIndex, audioChunks, selectedVoice, ebookId, readyChunks, isPlaying, user, ttsMode]);

    const onAudioEnded = () => {
        if (currentChunkIndex < audioChunks.length - 1) {
            setCurrentChunkIndex(prev => prev + 1);
        } else {
            setIsPlaying(false);
        }
    };

    // Effect to trigger Browser TTS when index changes while playing
    useEffect(() => {
        if (ttsMode === 'browser' && isPlaying) {
            playBrowserChunk(currentChunkIndex);
        }
    }, [currentChunkIndex, ttsMode, isPlaying, playBrowserChunk]);

    const togglePlay = () => {
        const nextState = !isPlaying;
        setIsPlaying(nextState);

        if (ttsMode === 'browser') {
            if (nextState) playBrowserChunk(currentChunkIndex);
            else synthRef.current?.cancel();
        } else if (ttsMode === 'ai' && audioRef.current) {
            if (nextState) audioRef.current.play();
            else audioRef.current.pause();
        }
    };

    const skipNext = () => {
        if (currentChunkIndex < audioChunks.length - 1) {
            setCurrentChunkIndex(prev => prev + 1);
            setIsPlaying(true);
        }
    };

    const skipPrev = () => {
        if (currentChunkIndex > 0) {
            setCurrentChunkIndex(prev => prev - 1);
            setIsPlaying(true);
        }
    };

    // Auto-Scroll Logic
    useEffect(() => {
        const performScroll = () => {
            if (isPlaying) {
                window.scrollBy(0, 0.15 * scrollSpeed);
                animationFrameRef.current = requestAnimationFrame(performScroll);
            }
        };
        if (isPlaying) animationFrameRef.current = requestAnimationFrame(performScroll);
        else if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
    }, [isPlaying, scrollSpeed]);

    const cycleSpeed = () => setScrollSpeed(prev => prev >= 5 ? 1 : prev + 1);

    if (loading) return <div className="flex h-screen items-center justify-center bg-gray-900"><LoadingSpinner /></div>;

    // --- RENDER SELECTION SCREEN ---
    if (ttsMode === null) {
        return (
            <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                <InsufficientEnergyModal 
                    isOpen={showEnergyModal} 
                    onClose={() => setShowEnergyModal(false)} 
                    currentEnergy={userData?.energy || 0} 
                    requiredEnergy={AI_SESSION_COST} 
                />
                
                <div className="bg-orange-600/20 p-6 rounded-full mb-8 border border-orange-500/30">
                    <Sparkles size={64} className="text-orange-500" />
                </div>
                
                <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Choose Your Narrator</h1>
                <p className="text-gray-400 mb-10 max-w-xs text-sm">How would you like to listen to this book?</p>

                <div className="grid grid-cols-1 gap-4 w-full max-w-sm">
                    {/* AI MODE */}
                    <button 
                        onClick={selectAIMode}
                        disabled={isLoadingAudio}
                        className="bg-gray-800 hover:bg-gray-750 border-2 border-gray-700 hover:border-orange-500 rounded-3xl p-6 transition-all group text-left relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Zap size={80}/></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-lg font-black text-white group-hover:text-orange-500 transition-colors">Nova AI</span>
                            <div className="flex items-center gap-1 bg-orange-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase">
                                <Zap size={10} fill="currentColor"/> {AI_SESSION_COST}E
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">High-fidelity, realistic AI voice. Best for immersion and deep learning.</p>
                        {isLoadingAudio && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>}
                    </button>

                    {/* BROWSER MODE */}
                    <button 
                        onClick={selectBrowserMode}
                        className="bg-gray-800 hover:bg-gray-750 border-2 border-gray-700 hover:border-blue-500 rounded-3xl p-6 transition-all group text-left relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Smartphone size={80}/></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-lg font-black text-white group-hover:text-blue-500 transition-colors">Standard Narrator</span>
                            <span className="text-[10px] font-black text-green-500 uppercase tracking-widest border border-green-500/30 px-2 py-0.5 rounded">FREE</span>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">Uses your device's built-in speech engine. No energy required.</p>
                    </button>
                </div>

                <button onClick={() => navigate(-1)} className="mt-10 text-gray-500 hover:text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    <ArrowLeft size={14}/> Back to Library
                </button>
            </div>
        );
    }

    const currentSrc = readyChunks[currentChunkIndex];

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans pb-32 overflow-x-hidden">
            <div className="fixed top-0 left-0 right-0 z-40 bg-gray-900/95 backdrop-blur border-b border-gray-800 py-2 px-4 flex justify-between items-center shadow-md">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-800 rounded-full transition-colors text-orange-500"><ArrowLeft size={24} /></button>
                    <div>
                        <h1 className="font-bold text-white text-sm truncate max-w-[150px] sm:max-w-[200px]">{ebook?.title}</h1>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{ttsMode === 'ai' ? 'Nova AI' : 'Standard'} Reader</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {ttsMode === 'ai' && (
                        <button onClick={() => setShowVoiceSettings(!showVoiceSettings)} className={`p-2 rounded-full transition-colors ${showVoiceSettings ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'}`} title="Voice Settings">
                            <SlidersHorizontal size={20} />
                        </button>
                    )}
                    <button onClick={cycleSpeed} className="flex items-center justify-center space-x-1 px-3 py-1.5 rounded-full bg-gray-800 text-xs font-bold text-gray-400 hover:text-white transition-colors border border-gray-700">
                        <Gauge size={14} />
                        <span>{scrollSpeed}x</span>
                    </button>
                </div>
            </div>

            {showVoiceSettings && ttsMode === 'ai' && (
                <div className="fixed top-14 right-4 z-50 bg-gray-800 border border-gray-700 p-3 rounded-xl shadow-2xl w-48 animate-fade-in-up">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-xs font-bold text-gray-500 uppercase">Narrator Voice</h4>
                        <button onClick={() => setShowVoiceSettings(false)} className="text-gray-400 hover:text-white"><span className="text-xs">Close</span></button>
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                        {VOICES.map(v => (
                            <button key={v} onClick={() => { setSelectedVoice(v); setShowVoiceSettings(false); setReadyChunks({}); setIsPlaying(false); }} className={`w-full text-left px-3 py-2 rounded text-sm font-medium transition-colors ${selectedVoice === v ? 'bg-orange-600 text-white' : 'hover:bg-gray-700 text-gray-300'}`}>{v}</button>
                        ))}
                    </div>
                </div>
            )}

            {alertMsg && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-bold animate-fade-in-down">
                    {alertMsg}
                    <button onClick={() => setAlertMsg('')} className="ml-2">x</button>
                </div>
            )}

            <div className="max-w-2xl mx-auto px-6 py-8 pt-20">
                {ebook?.chapters.map((chapter, idx) => (
                    <div key={idx} className="mb-12 animate-fade-in">
                        <h2 className="text-2xl font-bold text-orange-400 mb-4 border-l-4 border-orange-500 pl-4">{chapter.title}</h2>
                        <ChapterContent html={processContent(chapter.content)} />
                    </div>
                ))}
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 p-4 pb-8 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)]">
                <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
                    <div className="hidden sm:block min-w-0 flex-1">
                        <p className="text-white text-sm font-bold truncate">Part {currentChunkIndex + 1}</p>
                        <p className="text-xs text-gray-500 truncate">of {audioChunks.length}</p>
                    </div>
                    <div className="flex items-center gap-6 flex-1 justify-center">
                        <button onClick={skipPrev} className="text-gray-400 hover:text-white transition-colors"><SkipBack size={24} /></button>
                        <button 
                            onClick={togglePlay}
                            disabled={ttsMode === 'ai' && !currentSrc && !isLoadingAudio}
                            className="w-14 h-14 bg-orange-600 hover:bg-orange-500 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale relative"
                        >
                            {(ttsMode === 'ai' && isLoadingAudio) ? <Loader2 size={24} className="animate-spin" /> : isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                        </button>
                        <button onClick={skipNext} className="text-gray-400 hover:text-white transition-colors"><SkipForward size={24} /></button>
                    </div>
                    <div className="hidden sm:block flex-1"></div>
                </div>
                <div className="absolute top-0 left-0 h-1 bg-gray-800 w-full">
                    <div className="h-full bg-orange-600 transition-all duration-500" style={{ width: `${((currentChunkIndex + 1) / audioChunks.length) * 100}%` }}></div>
                </div>
            </div>

            <audio ref={audioRef} src={ttsMode === 'ai' ? currentSrc : undefined} onEnded={onAudioEnded} autoPlay={isPlaying && ttsMode === 'ai'} />
        </div>
    );
};

export default AudiobookPage;
