
import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import type { Ebook, Video, UserData, Bookmark as BookmarkType } from '../types';
import type { User } from 'firebase/auth';
import { getEbookById, updateUserReadingProgress, markBookAsComplete, markChapterAsComplete, getVideoById, updateUserReadingTime, addBookmark, updateDailyStreak, rateAndReviewBook, consumeEnergy } from '../services/firestoreService';
import { getOfflineBook, saveOfflineBook } from '../services/offlineService';
import { getAIDefinition, getAISimplification } from '../services/geminiService';
import { ArrowLeft, Play, Pause, Youtube, CircleCheck, Bookmark, Palette, X, Crown, Sparkles, Save, ChevronLeft, ChevronRight, Wand2, Search as SearchIcon, Copy, WifiOff, Star, MessageSquare, Zap, Lock, CalendarClock } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import ChapterQuiz from '../components/ChapterQuiz';
import Modal from '../components/Modal';
import EbookAITool from '../components/EbookAITool';
import InsufficientEnergyModal from '../components/InsufficientEnergyModal';
import OfflineGateModal from '../components/OfflineGateModal';

declare global {
    interface Window {
      MathJax: {
        typesetPromise: (elements?: HTMLElement[]) => Promise<void>;
      };
    }
}

interface EbookReaderPageProps {
    user: User | null;
    userData: UserData | null;
}

const THEMES = [
    { id: 'light', name: 'Light', bg: 'bg-white', text: 'text-gray-900', border: 'border-gray-200' },
    { id: 'sepia', name: 'Sepia', bg: 'bg-[#f4ecd8]', text: 'text-[#5b4636]', border: 'border-[#e6dbb9]' },
    { id: 'dark', name: 'Dark', bg: 'bg-gray-900', text: 'text-gray-300', border: 'border-gray-700' },
    { id: 'navy', name: 'Navy', bg: 'bg-[#0f172a]', text: 'text-slate-300', border: 'border-slate-700', isPro: true },
    { id: 'slate', name: 'Slate', bg: 'bg-[#1e293b]', text: 'text-gray-200', border: 'border-slate-600', isPro: true },
    { id: 'oled', name: 'OLED', bg: 'bg-black', text: 'text-gray-400', border: 'border-gray-800', isPro: true },
    { id: 'forest', name: 'Forest', bg: 'bg-[#052e16]', text: 'text-green-100', border: 'border-green-900', isPro: true },
    { id: 'lavender', name: 'Lavender', bg: 'bg-[#f3e8ff]', text: 'text-purple-900', border: 'border-purple-200', isPro: true },
    { id: 'starry', name: 'Starry Night', bg: 'bg-starry', text: 'text-gray-200', border: 'border-white/10', isPro: true, isAnimated: true },
    { id: 'nebula', name: 'Nebula', bg: 'bg-nebula', text: 'text-gray-200', border: 'border-white/10', isPro: true, isAnimated: true },
    { id: 'sunset', name: 'Sunset', bg: 'bg-sunset', text: 'text-gray-100', border: 'border-white/10', isPro: true, isAnimated: true },
];

const FONTS = [
    { id: 'sans', name: 'System Sans', family: 'font-sans' },
    { id: 'serif', name: 'System Serif', family: 'font-serif' },
    { id: 'mono', name: 'Monospace', family: 'font-mono' },
    { id: 'georgia', name: 'Georgia', family: 'font-[Georgia,serif]' },
    { id: 'times', name: 'Times New Roman', family: 'font-["Times_New_Roman",serif]' },
    { id: 'arial', name: 'Arial', family: 'font-[Arial,sans-serif]' },
    { id: 'verdana', name: 'Verdana', family: 'font-[Verdana,sans-serif]' },
    { id: 'helvetica', name: 'Helvetica', family: 'font-[Helvetica,sans-serif]' },
    { id: 'tahoma', name: 'Tahoma', family: 'font-[Tahoma,sans-serif]' },
    { id: 'trebuchet', name: 'Trebuchet MS', family: 'font-["Trebuchet_MS",sans-serif]' },
    { id: 'courier', name: 'Courier New', family: 'font-["Courier_New",monospace]' },
    { id: 'lucida', name: 'Lucida Console', family: 'font-["Lucida_Console",monospace]' },
    { id: 'comic', name: 'Comic Sans (Fun)', family: 'font-["Comic_Sans_MS",cursive]' },
    { id: 'impact', name: 'Impact (Bold)', family: 'font-[Impact,sans-serif]' },
    { id: 'palatino', name: 'Palatino', family: 'font-["Palatino_Linotype",serif]' },
];

const processContentHtml = (html: string) => {
    let processed = html;
    processed = processed.replace(/\\R/g, ''); 
    processed = processed.replace(/\\ \(/g, '\\(').replace(/\\ \)/g, '\\)');
    processed = processed.replace(/\\ \[/g, '\\[').replace(/\\ \]/g, '\\]');
    processed = processed.replace(/(?<!r)ightarrow/g, '\\rightarrow');
    processed = processed.replace(/extsubscript/g, '_');
    processed = processed.replace(/\\textsubscript/g, '_');
    processed = processed.replace(/(?<!t)ext\{/g, '\\text{');
    processed = processed.replace(/(?<!\\)rightarrow/g, '\\rightarrow');
    processed = processed.replace(/(?<!\\)text\{/g, '\\text{');

    const mathCandidatePattern = /(\\rightarrow|\\text\{.*?\}|_\s*\{?[a-zA-Z0-9/+-]+\}?|\^\s*\{?[a-zA-Z0-9/+-]+\}?|\b[a-zA-Z0-9/]+\^\{?[a-zA-Z0-9+-]+\}?|\b[a-zA-Z]{1,2}_\s*\{?[a-zA-Z0-9+-]+\}?\b)/g;
    processed = processed.replace(mathCandidatePattern, (match, p1, offset, string) => {
        const prefix = string.substring(0, offset);
        const lastOpenInline = prefix.lastIndexOf('\\(');
        const lastCloseInline = prefix.lastIndexOf('\\)');
        const lastOpenBlock = prefix.lastIndexOf('\\[');
        const lastCloseBlock = prefix.lastIndexOf('\\]');
        const isInsideInline = lastOpenInline > lastCloseInline;
        const isInsideBlock = lastOpenBlock > lastCloseBlock;
        if (isInsideInline || isInsideBlock) return match;
        return `\\(${match}\\)`;
    });

    processed = processed.replace(/\\\(\s+/g, '\\(').replace(/\s+\\\)/g, '\\)');
    processed = processed.replace(/<img (.*?)>/g, '<figure class="my-4"><img referrerpolicy="no-referrer" $1><figcaption class="text-[10px] text-gray-500 text-center mt-1 italic w-full">Image generated by AI</figcaption></figure>');
    const fixLatex = (text: string) => {
        try { return text.replace(/(?<!\\)%/g, '\\%'); } catch (e) { return text.replace(/([^\\])%/g, '$1\\%'); }
    };
    processed = processed.replace(/\\\((.*?)\\\)/gs, (_, content) => `\\(${fixLatex(content)}\\)`);
    processed = processed.replace(/\\\[(.*?)\\\]/gs, (_, content) => `\\[${fixLatex(content)}\\]`);
    return processed;
};

const EbookReaderPage: React.FC<EbookReaderPageProps> = ({ user, userData }) => {
    const { ebookId } = useParams<{ ebookId: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    // Mission Params
    const missionMode = searchParams.get('mode') === 'mission';
    const startCh = parseInt(searchParams.get('start') || '1');
    const endCh = parseInt(searchParams.get('end') || '1');

    const [ebook, setEbook] = useState<Ebook | null>(null);
    const [linkedVideos, setLinkedVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [pageIndex, setPageIndex] = useState(0);
    const [showSettings, setShowSettings] = useState(false);
    
    const [themeId, setThemeId] = useState(() => localStorage.getItem('reader_themeId') || 'dark');
    const [fontId, setFontId] = useState(() => localStorage.getItem('reader_fontId') || 'sans');
    const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem('reader_fontSize') || '100'));
    const [lineHeight, setLineHeight] = useState(1.75);
    
    const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
    const [isSelectionSave, setIsSelectionSave] = useState(false);
    const [bookmarkNote, setBookmarkNote] = useState('');
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [navDirection, setNavDirection] = useState<'left' | 'right' | null>(null);
    const [selection, setSelection] = useState<{ text: string } | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiResult, setAiResult] = useState<{ type: 'def' | 'simple', content: string } | null>(null);
    const [sessionReadTime, setSessionReadTime] = useState(0); 

    const [showEnergyModal, setShowEnergyModal] = useState(false);
    const [showOfflineGate, setShowOfflineGate] = useState(false);
    const [showMissionCompleteModal, setShowMissionCompleteModal] = useState(false);
    const [requiredEnergy, setRequiredEnergy] = useState(0);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    const minReadTimeRef = useRef(0);
    const timerRef = useRef<number | null>(null);
    const pageContainerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null); 
    const saveTimeoutRef = useRef<number | null>(null);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [rating, setRating] = useState(0);
    const [ratingComment, setRatingComment] = useState('');
    const [isSubmittingRating, setIsSubmittingRating] = useState(false);
    const progressRef = useRef({ pageIndex: 0, totalPages: 0 });
    
    const hostname = window.location.hostname;
    const productionURLs = ['eintk.com.ng', 'www.eintk.com.ng', 'eintk.vercel.app', 'eintk-ebooks.web.app', 'eintk-ebooks.firebaseapp.com'];
    const isProduction = productionURLs.includes(hostname);
    const isProUser = userData?.subscriptionStatus === 'pro' || userData?.subscriptionStatus === 'day_pass' || userData?.role === 'central admin';

    useEffect(() => {
        const handleStatus = () => {
            const status = !navigator.onLine;
            setIsOffline(status);
            if (status && !isProUser) {
                setShowOfflineGate(true);
            }
        };
        window.addEventListener('online', handleStatus);
        window.addEventListener('offline', handleStatus);
        return () => {
            window.removeEventListener('online', handleStatus);
            window.removeEventListener('offline', handleStatus);
        };
    }, [isProUser]);

    useEffect(() => { localStorage.setItem('reader_themeId', themeId); localStorage.setItem('reader_fontId', fontId); localStorage.setItem('reader_fontSize', fontSize.toString()); }, [themeId, fontId, fontSize]);
    useEffect(() => { if (!ebookId || !user) return; timerRef.current = window.setInterval(() => { setSessionReadTime(prev => prev + 1); }, 1000); return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, [ebookId, user]);
    
    // Progress counting logic: only for mission mode
    useEffect(() => { 
        const startTime = Date.now(); 
        return () => { 
            if (missionMode && user && ebookId && !user.isAnonymous) { 
                const endTime = Date.now(); 
                const durationInMinutes = Math.round((endTime - startTime) / (1000 * 60)); 
                if (durationInMinutes > 0) { 
                    updateUserReadingTime(user.uid, durationInMinutes); 
                    updateDailyStreak(user.uid, true); 
                } 
            } 
        }; 
    }, [user, ebookId, missionMode]);
    
    useEffect(() => { 
        const handleSelectionChange = () => { 
            const sel = window.getSelection(); 
            if (sel && sel.toString().trim().length > 0) { 
                setSelection({ text: sel.toString().trim() }); 
            } else { 
                if (!aiResult) setSelection(null); 
            } 
        }; 
        document.addEventListener('selectionchange', handleSelectionChange); 
        return () => { document.removeEventListener('selectionchange', handleSelectionChange); }; 
    }, [aiResult]);

    const pages = useMemo(() => {
        if (!ebook) return [];
        const contentPages = ebook.chapters.sort((a,b) => a.chapter - b.chapter).map(ch => ({ 
            type: 'content' as const, 
            chapterNum: ch.chapter,
            title: ch.title, 
            content: processContentHtml(ch.content), 
            questions: ch.questions 
        }));
        return [
            { type: 'cover' as const, title: ebook.title, cover: ebook.coverImageUrl }, 
            { type: 'toc' as const, toc: ebook.tableOfContents }, 
            ...contentPages, 
            { type: 'complete' as const }
        ];
    }, [ebook]);

    const totalPages = pages.length;
    const currentPageData = pages[pageIndex];

    useEffect(() => { progressRef.current = { pageIndex, totalPages }; }, [pageIndex, totalPages]);
    
    const fetchInitialPage = useCallback(() => {
        if (userData && ebookId && pages.length > 0) {
            if (missionMode) {
                // If mission, try to start at the first chapter of mission range
                const startIdx = pages.findIndex(p => p.type === 'content' && p.chapterNum === startCh);
                if (startIdx !== -1) setPageIndex(startIdx);
                else setPageIndex(0);
            } else {
                const progress = userData?.readingProgress?.[ebookId];
                 if (userData?.completedBooks?.includes(ebookId)) { setPageIndex(pages.length - 1); } 
                 else if (progress && progress.currentPage < pages.length) { setPageIndex(progress.currentPage); } 
            }
        }
    }, [userData, ebookId, pages, missionMode, startCh]);
    
    useEffect(() => {
        const fetchEbookAndVideos = async () => {
            if (ebookId) {
                if (!ebook || ebook.id !== ebookId) setLoading(true);
                
                try {
                    let fetchedEbook: Ebook | undefined;
                    
                    // --- ADMIN/DEV BYPASS: Load directly from Firestore if not production ---
                    if (!isProduction && navigator.onLine) {
                         fetchedEbook = await getEbookById(ebookId) || undefined;
                    } else {
                        // Standard User/Production Logic
                        if (!navigator.onLine && !isProUser) {
                            setShowOfflineGate(true);
                            setLoading(false);
                            return;
                        }

                        fetchedEbook = await getOfflineBook(ebookId);
                        if (!fetchedEbook && navigator.onLine) {
                            fetchedEbook = await getEbookById(ebookId) || undefined;
                            if (fetchedEbook) saveOfflineBook(fetchedEbook);
                        }
                    }

                    if (!fetchedEbook) { 
                        if (navigator.onLine) navigate('/'); 
                        else setAlertMessage("Offline and book not downloaded."); 
                        return; 
                    }
                    
                    const isSubjectUnlocked = userData?.inventory?.unlockedSubjects?.includes(fetchedEbook.subject);
                    if (fetchedEbook.accessLevel === 'pro' && !isProUser && !isSubjectUnlocked) { navigate(`/ebook-viewer/${ebookId}`); return; }
                    
                    setEbook(fetchedEbook);
                    minReadTimeRef.current = (fetchedEbook.chapters?.length || 1) * 60;
                    
                    if (fetchedEbook?.linkedVideoIds && fetchedEbook.linkedVideoIds.length > 0 && navigator.onLine) { 
                        const videoPromises = fetchedEbook.linkedVideoIds.map(vid => getVideoById(vid)); 
                        const videos = await Promise.all(videoPromises); 
                        setLinkedVideos(videos.filter(v => v !== null) as Video[]); 
                    }
                } catch (err) { 
                    console.error("Failed to load ebook", err); 
                } finally { 
                    setLoading(false); 
                }
            }
        };
        fetchEbookAndVideos();
    }, [ebookId, isProUser, navigate, userData?.inventory?.unlockedSubjects, isProduction]); 

    useEffect(() => { if (!loading && pages.length > 0) fetchInitialPage(); }, [loading, pages, fetchInitialPage]);
    
    useEffect(() => { 
        if (missionMode && user && ebookId && pages.length > 0) { 
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); 
            saveTimeoutRef.current = window.setTimeout(() => { 
                updateUserReadingProgress(user.uid, ebookId, pageIndex, totalPages, true); 
            }, 60000); 
        } 
        return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); }; 
    }, [pageIndex, user, ebookId, totalPages, missionMode]);

    useEffect(() => { if (currentPageData?.type === 'content' && contentRef.current) { const el = contentRef.current; el.innerHTML = currentPageData.content; const typeset = async () => { if (window.MathJax && window.MathJax.typesetPromise) { try { await window.MathJax.typesetPromise([el]); const errors = el.querySelectorAll('mjx-merror, .mjx-error'); errors.forEach(err => err.remove()); } catch (err) { console.error('MathJax failed:', err); } } }; typeset(); const interval = setInterval(() => { if (window.MathJax) { typeset(); clearInterval(interval); } }, 500); return () => clearInterval(interval); } }, [pageIndex, currentPageData]);
    useEffect(() => { if (pageContainerRef.current) { pageContainerRef.current.scrollTop = 0; } window.scrollTo(0, 0); }, [pageIndex]);

    const handleNextPage = async () => { 
        if (pageIndex < pages.length - 1) { 
            // MISSION NAVIGATION GUARD
            if (missionMode && currentPageData?.type === 'content' && currentPageData.chapterNum === endCh) {
                setShowMissionCompleteModal(true);
                return;
            }

            // Chapter Mission Point Injection
            if (missionMode && user && ebook && currentPageData.type === 'content') {
                const chNum = currentPageData.chapterNum;
                const isFinal = chNum === ebook.chapters.length;
                // Award 10 points per chapter. markChapterAsComplete internally handles the 10pts + logic.
                await markChapterAsComplete(user.uid, ebook.id, chNum, isFinal);
            }

            setNavDirection('right'); 
            setPageIndex(prev => prev + 1); 
        } 
    };
    const handlePrevPage = () => { if (pageIndex > 0) { setNavDirection('left'); setPageIndex(prev => prev - 1); } };
    const handleFinishBook = async () => { if (user && ebookId && ebook) { if (ebook.subject === 'General') { setShowRatingModal(true); } else { completeBookLogic(); } } };
    const completeBookLogic = async () => { if (!user || !ebookId) return; const hasReadEnough = sessionReadTime >= minReadTimeRef.current; await markBookAsComplete(user.uid, ebookId, hasReadEnough); navigate('/'); };
    const handleSubmitRating = async () => { if (!user || !ebookId || !userData) return; setIsSubmittingRating(true); try { await rateAndReviewBook(ebookId, user.uid, userData.username, rating, ratingComment); await completeBookLogic(); } catch (e) { console.error(e); await completeBookLogic(); } };
    
    const handleAddBookmark = async () => { 
        if (!isProUser) { navigate('/upgrade'); return; }
        if (!user || !ebook) return; 
        let highlight = selection?.text || ''; 
        try { 
            const newBookmark: Omit<BookmarkType, 'id' | 'createdAt'> = { ebookId: ebook.id, ebookTitle: ebook.title, pageIndex: pageIndex, chapterTitle: currentPageData.type === 'content' ? currentPageData.title : 'General', note: bookmarkNote || "Saved Highlight", highlightedText: highlight }; 
            await addBookmark(user.uid, newBookmark); 
            setAlertMessage("Note saved!"); 
            setIsBookmarkModalOpen(false); 
            setBookmarkNote(''); 
            setSelection(null); 
            window.getSelection()?.removeAllRanges(); 
        } catch (error) { setAlertMessage("Failed to save note."); } 
    };
    const openSaveNoteModal = (fromSelection: boolean = false) => { 
        if (!isProUser) { navigate('/upgrade'); return; }
        setBookmarkNote(''); 
        setIsSelectionSave(fromSelection);
        setIsBookmarkModalOpen(true); 
    };
    const toggleSettings = () => { if (!isProUser) { navigate('/upgrade'); return; } setShowSettings(!showSettings); };
    
    const handleAIExplain = async () => { 
        if (!selection || !ebook || !user || !userData) return; 
        const EXPLAIN_COST = 10;
        const currentText = selection.text;
        setSelection(null);
        window.getSelection()?.removeAllRanges();
        if ((userData.energy || 0) < EXPLAIN_COST) { setRequiredEnergy(EXPLAIN_COST); setShowEnergyModal(true); return; }
        setAiLoading(true); 
        try { 
            const success = await consumeEnergy(user.uid, EXPLAIN_COST);
            if (!success) { setRequiredEnergy(EXPLAIN_COST); setShowEnergyModal(true); setAiLoading(false); return; }
            const context = `${ebook.subject} - ${ebook.topic}.`; 
            const result = await getAIDefinition(currentText, context); 
            setAiResult({ type: 'def', content: result }); 
        } catch (e) { setAlertMessage("AI failed. Check internet."); } finally { setAiLoading(false); } 
    };

    const handleAISummarize = async () => { 
        if (!selection || !user || !userData) return;
        const SUMMARIZE_COST = 5;
        const currentText = selection.text;
        setSelection(null);
        window.getSelection()?.removeAllRanges();
        if ((userData.energy || 0) < SUMMARIZE_COST) { setRequiredEnergy(SUMMARIZE_COST); setShowEnergyModal(true); return; }
        setAiLoading(true); 
        try { 
            const success = await consumeEnergy(user.uid, SUMMARIZE_COST);
            if (!success) { setRequiredEnergy(SUMMARIZE_COST); setShowEnergyModal(true); setAiLoading(false); return; }
            const result = await getAISimplification(currentText); 
            setAiResult({ type: 'simple', content: result }); 
        } catch (e) { setAlertMessage("AI failed. Check internet."); } finally { setAiLoading(false); } 
    };

    const handleCopy = () => { 
        if (selection) { 
            navigator.clipboard.writeText(selection.text); 
            setAlertMessage("Copied!"); 
            setSelection(null); 
            window.getSelection()?.removeAllRanges(); 
        } 
    };

    const openAudiobook = () => {
        if (!user) { navigate('/auth'); return; }
        navigate(`/audiobook/${ebookId}`);
    };

    const activeTheme = THEMES.find(t => t.id === themeId) || THEMES[2]; 
    const activeFont = FONTS.find(f => f.id === fontId) || FONTS[0];

    if (loading) return <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50"><LoadingSpinner /></div>;

    return (
        <div className={`fixed inset-0 flex flex-col z-50 transition-colors duration-500 ${activeTheme.bg} ${activeTheme.text}`}>
            <OfflineGateModal isOpen={showOfflineGate} onClose={() => setShowOfflineGate(false)} />
            {aiResult && <EbookAITool result={aiResult} onClose={() => { setAiResult(null); setSelection(null); window.getSelection()?.removeAllRanges(); }} />}
            <InsufficientEnergyModal isOpen={showEnergyModal} onClose={() => setShowEnergyModal(false)} currentEnergy={userData?.energy || 0} requiredEnergy={requiredEnergy} />

            {/* MISSION COMPLETE MODAL */}
            <Modal isOpen={showMissionCompleteModal} onClose={() => setShowMissionCompleteModal(false)} title="Mission Secured">
                <div className="text-center p-2">
                    <div className="bg-orange-600/20 p-6 rounded-[2.5rem] w-24 h-24 mx-auto flex items-center justify-center mb-6 border border-orange-500/30 shadow-xl shadow-orange-900/10">
                        <CalendarClock size={48} className="text-orange-500 animate-pulse" />
                    </div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic mb-4">Deployment Finished</h3>
                    <div className="space-y-4 mb-8">
                        <p className="text-gray-200 text-base leading-relaxed">
                            You have read the chapter assigned for today.
                        </p>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Wait for the day that the next chapter is assigned for before you can read it.
                        </p>
                    </div>
                    <button 
                        onClick={() => navigate('/')}
                        className="w-full py-5 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-3xl shadow-2xl transition-all transform active:scale-95 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                    >
                        Return to Library <ArrowLeft size={16} className="rotate-180"/>
                    </button>
                </div>
            </Modal>

            <header className={`flex items-center justify-between p-4 ${activeTheme.bg}/95 backdrop-blur-md shadow-sm z-20 border-b ${activeTheme.border}`}>
                <div className="flex items-center">
                    <button onClick={() => navigate('/')} className="flex items-center space-x-2 text-orange-500 hover:text-orange-400 mr-4"><ArrowLeft size={24}/></button>
                    <div className="truncate max-w-[150px] sm:max-w-xs">
                        <div className="flex items-center gap-2">
                           <h1 className="font-bold text-sm sm:text-base truncate">{ebook?.title}</h1>
                           {isOffline && isProUser && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shrink-0" title="Offline Mode"></div>}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={toggleSettings} className={`transition-colors ${showSettings ? 'text-orange-500' : 'opacity-80 hover:opacity-100 hover:text-orange-500'}`} title="Appearance (Pro)"><Palette size={20}/></button>
                    <button onClick={() => isProUser ? openSaveNoteModal(false) : navigate('/upgrade')} className="opacity-80 hover:opacity-100 hover:text-orange-500 transition-colors" title="Bookmark"><Bookmark size={22}/></button>
                </div>
            </header>

            <style>{`@keyframes slow-wave { 0%, 100% { height: 8px; } 50% { height: 18px; } }`}</style>
            <button onClick={openAudiobook} className="fixed bottom-24 right-6 z-40 w-14 h-14 group cursor-pointer transition-transform duration-100 active:scale-95 flex items-center justify-center" title="Listen to Audiobook">
                <div className="absolute inset-0 rounded-full overflow-hidden"><div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#b91c1c_0deg,#f97316_180deg,#b91c1c_360deg)] animate-[spin_3s_linear_infinite]" /></div>
                <div className="absolute inset-[2px] bg-gray-900 rounded-full flex items-center justify-center backface-hidden"><div className="flex items-center gap-[3px] h-6 items-center"><div className="w-[3px] bg-white rounded-full animate-[slow-wave_1.5s_ease-in-out_infinite]" style={{ animationDelay: '0.0s' }}></div><div className="w-[3px] bg-orange-500 rounded-full animate-[slow-wave_1.8s_ease-in-out_infinite]" style={{ animationDelay: '0.2s' }}></div><div className="w-[3px] bg-blue-500 rounded-full animate-[slow-wave_1.4s_ease-in-out_infinite]" style={{ animationDelay: '0.4s' }}></div><div className="w-[3px] bg-orange-500 rounded-full animate-[slow-wave_1.6s_ease-in-out_infinite]" style={{ animationDelay: '0.1s' }}></div></div></div>
            </button>

            {selection && !aiResult && !aiLoading && (
                <div className="fixed bottom-0 left-0 right-0 z-[60] bg-gray-900 border-t border-gray-700 p-4 animate-slide-up-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)] pb-[calc(1rem+env(safe-area-inset-bottom))]">
                    <div className="flex justify-between items-center mb-3"><span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Text Selected</span><button onClick={() => { setSelection(null); window.getSelection()?.removeAllRanges(); }} className="text-gray-500 hover:text-white"><X size={16}/></button></div>
                    <div className="grid grid-cols-4 gap-2">
                        <button onClick={handleAIExplain} className="flex flex-col items-center justify-center py-3 bg-gray-800 hover:bg-orange-600 rounded-xl transition-colors border border-gray-700 group"><SearchIcon size={20} className="mb-1 text-orange-400 group-hover:text-white"/><span className="text-[10px] font-bold text-gray-300 group-hover:text-white">Explain</span></button>
                        <button onClick={handleAISummarize} className="flex flex-col items-center justify-center py-3 bg-gray-800 hover:bg-blue-600 rounded-xl transition-colors border border-gray-700 group"><Wand2 size={20} className="mb-1 text-blue-400 group-hover:text-white"/><span className="text-[10px] font-bold text-gray-300 group-hover:text-white">Summarize</span></button>
                        <button onClick={() => openSaveNoteModal(true)} className={`flex flex-col items-center justify-center py-3 rounded-xl transition-colors border border-gray-700 group ${isProUser ? 'bg-gray-800 hover:bg-green-600' : 'bg-gray-800/50 opacity-50 cursor-not-allowed'}`}><Save size={20} className={`mb-1 ${isProUser ? 'text-green-400 group-hover:text-white' : 'text-gray-500'}`}/><span className="text-[10px] font-bold text-gray-300 group-hover:text-white">Save Note {!isProUser && '(Pro)'}</span></button>
                        <button onClick={handleCopy} className="flex flex-col items-center justify-center py-3 bg-gray-800 hover:bg-purple-600 rounded-xl transition-colors border border-gray-700 group"><Copy size={20} className="mb-1 text-purple-400 group-hover:text-white"/><span className="text-[10px] font-bold text-gray-300 group-hover:text-white">Copy</span></button>
                    </div>
                </div>
            )}
            
            {aiLoading && (
                <div className="fixed bottom-24 left-6 z-[100] bg-[#0f172a]/95 backdrop-blur-md border border-orange-500/50 px-5 py-2 rounded-full flex items-center justify-center gap-3 shadow-2xl animate-slide-up-bottom ring-2 ring-orange-500/5">
                    <Sparkles className="animate-[spin_0.8s_linear_infinite] text-orange-500" size={16} />
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Analyzing</span>
                </div>
            )}
            
            {showSettings && (
                <div className={`absolute top-16 right-4 z-40 bg-gray-800 text-white p-4 rounded-xl shadow-2xl border border-gray-700 w-80 animate-fade-in-up max-h-[80vh] overflow-y-auto`}>
                    <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2"><h3 className="text-sm font-bold flex items-center"><Palette size={16} className="mr-2 text-orange-500"/> Appearance (Pro)</h3><button onClick={() => setShowSettings(false)}><X size={16}/></button></div>
                    <div className="mb-6"><label className="text-xs opacity-70 mb-2 block">Font Size</label><div className="flex items-center space-x-3"><span className="text-xs">A</span><input type="range" min="80" max="160" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"/><span className="text-lg">A</span></div></div>
                    <div className="mb-6"><label className="text-xs opacity-70 mb-2 block">Themes</label><div className="grid grid-cols-4 gap-2">{THEMES.map(t => (<button key={t.id} onClick={() => setThemeId(t.id)} className={`w-full aspect-square rounded-lg border-2 transition-all ${t.bg} ${themeId === t.id ? 'border-orange-500 ring-2 ring-orange-500/30 scale-105' : 'border-gray-600'} relative`} title={t.name}>{t.isPro && <div className="absolute -top-1 -right-1 bg-yellow-500 text-black rounded-full p-[2px]"><Crown size={8}/></div>}{t.isAnimated && <div className="absolute bottom-1 right-1 text-[8px] text-white bg-black/50 px-1 rounded">Anim</div>}</button>))}</div></div>
                    <div className="mb-6"><label className="text-xs opacity-70 mb-2 block">Font Style</label><div className="grid grid-cols-2 gap-2">{FONTS.map(f => (<button key={f.id} onClick={() => setFontId(f.id)} className={`px-2 py-2 text-xs border rounded ${f.family} ${fontId === f.id ? 'bg-orange-600 text-white border-orange-600' : 'border-gray-600 hover:bg-white/10 text-gray-300'}`}>{f.name}</button>))}</div></div>
                </div>
            )}

            <main ref={pageContainerRef} className={`flex-grow overflow-y-auto p-4 md:p-8 scroll-smooth relative ${activeFont.family}`}>
                <div key={pageIndex} className={`max-w-3xl w-full mx-auto min-h-full ${navDirection === 'right' ? 'animate-slide-in-right' : navDirection === 'left' ? 'animate-slide-in-left' : ''} relative`} style={{ fontSize: `${fontSize}%`, lineHeight: lineHeight }}>
                    
                    {currentPageData.type === 'cover' && (
                        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                            <img src={currentPageData.cover} alt={currentPageData.title} className="w-full max-w-xs mx-auto rounded-lg shadow-2xl aspect-square object-cover mb-8"/>
                            <h1 className="text-4xl font-bold mb-4">{currentPageData.title}</h1>
                            <p className="text-xl opacity-70">Swipe or use arrows to read</p>
                        </div>
                    )}
                    {currentPageData.type === 'toc' && (
                        <div>
                            <h2 className="text-3xl font-bold mb-6 text-orange-500 border-b border-gray-700 pb-2">Table of Contents</h2>
                            <ul className="space-y-3">{currentPageData.toc.map((item, idx) => (<li key={item.chapter}><button onClick={() => setPageIndex(idx + 2)} className="w-full text-left p-3 rounded-lg hover:bg-black/10 transition-colors flex justify-between items-center group"><span className="text-lg font-medium opacity-80 group-hover:opacity-100">{item.chapter}. {item.title}</span></button></li>))}</ul>
                        </div>
                    )}
                    {currentPageData.type === 'content' && (
                        <div className="">
                            <h2 className="text-3xl font-bold mb-6 text-orange-500">{currentPageData.title}</h2>
                            {linkedVideos.length > 0 && (<div className="mb-8 p-4 bg-gray-800/50 rounded-xl border border-gray-700"><h4 className="text-sm font-bold opacity-70 mb-3 flex items-center"><Youtube className="mr-2 text-red-500" size={16}/> Video Lesson</h4><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{linkedVideos.map(vid => (<a key={vid.id} href={vid.youtubeUrl} target="_blank" rel="noopener noreferrer" className="block group relative rounded-lg overflow-hidden"><img src={vid.thumbnailUrl} className="w-full h-24 object-cover"/><div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-colors"><Play size={24} className="text-white opacity-80"/></div></a>))}</div></div>)}
                            <div id="ebook-content-area" ref={contentRef} className="ebook-content text-left"/>
                            {currentPageData.questions && currentPageData.questions.length > 0 && (<ChapterQuiz questions={currentPageData.questions} themeClasses={`${activeTheme.bg} ${activeTheme.text}`} />)}
                        </div>
                    )}
                    {currentPageData.type === 'complete' && (
                        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
                            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(34,197,94,0.4)] animate-fade-in border-4 border-white/20">
                                <CircleCheck size={56} className="text-white" />
                            </div>
                            <h2 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter italic">Book Complete!</h2>
                            <p className="text-gray-400 text-lg mb-10">Knowledge Block Secured.</p>
                            
                            <button 
                                onClick={handleFinishBook} 
                                className="w-full max-w-md py-5 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-[2rem] shadow-xl transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                            >
                                Return to Library
                            </button>
                        </div>
                    )}
                </div>
            </main>

            <footer className={`px-4 py-2 shadow-inner z-20 border-t ${activeTheme.border} ${activeTheme.bg}/95 backdrop-blur relative pb-[env(safe-area-inset-bottom)]`}>
                <div className="flex items-center justify-between w-full max-w-5xl mx-auto">
                    <button onClick={handlePrevPage} disabled={pageIndex === 0} className="p-2 rounded-full bg-gray-700/50 hover:bg-orange-600 disabled:opacity-30 transition-colors"><ChevronLeft size={24}/></button>
                    <div className="flex items-center space-x-6">
                         <div className="text-xs sm:text-sm font-bold opacity-70 bg-black/20 px-3 py-1 rounded-full whitespace-nowrap">{pageIndex + 1} / {totalPages}</div>
                    </div>
                    <button onClick={handleNextPage} disabled={pageIndex === totalPages - 1} className="p-2 rounded-full bg-gray-700/50 hover:bg-orange-600 disabled:opacity-30 transition-colors"><ChevronRight size={24}/></button>
                </div>
            </footer>

            <Modal isOpen={isBookmarkModalOpen} onClose={() => setIsBookmarkModalOpen(false)} title={isSelectionSave ? "Save Highlight" : "Add Note"}>
                {isSelectionSave ? (
                    <div className="bg-gray-900/50 p-4 rounded-lg mb-4 border border-gray-700 italic text-sm text-gray-400">
                        "{selection?.text}"
                    </div>
                ) : (
                    <textarea 
                        value={bookmarkNote} 
                        onChange={(e) => setBookmarkNote(e.target.value)} 
                        placeholder="Type note..." 
                        className="w-full h-32 bg-gray-900 border border-gray-600 rounded-lg p-3 text-white outline-none resize-none mb-2"
                    />
                )}
                <div className="flex justify-end mt-2">
                    <button onClick={handleAddBookmark} className="px-6 py-2 bg-orange-600 rounded-lg font-bold text-white flex items-center hover:bg-orange-700 transition-colors">
                        <Save size={16} className="mr-2"/> {isSelectionSave ? "Save Highlight" : "Save Note"}
                    </button>
                </div>
            </Modal>

            <Modal isOpen={showRatingModal} onClose={() => setShowRatingModal(false)} title="Vibe Check">
                <div className="text-center p-2">
                    <p className="text-gray-300 mb-6">How was the gist? Rate this story to boost it on the Explore feed!</p>
                    <div className="flex justify-center gap-2 mb-6">{[1, 2, 3, 4, 5].map((star) => (<button key={star} onClick={() => setRating(star)} className="focus:outline-none transition-transform hover:scale-110"><Star size={32} className={`${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} /></button>))}</div>
                    <div className="mb-6 relative"><textarea value={ratingComment} onChange={e => setRatingComment(e.target.value)} placeholder="What did you learn? Drop a comment..." className="w-full bg-gray-900 border border-gray-700 rounded-xl p-4 text-white text-sm h-32 outline-none focus:border-orange-500 resize-none"/><MessageSquare className="absolute bottom-4 right-4 text-gray-600" size={16}/></div>
                    <button onClick={handleSubmitRating} disabled={rating === 0 || isSubmittingRating} className="w-full py-3 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl font-bold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02]">{isSubmittingRating ? 'Posting...' : 'Post Vibe'}</button>
                </div>
            </Modal>
        </div>
    );
};

export default EbookReaderPage;
