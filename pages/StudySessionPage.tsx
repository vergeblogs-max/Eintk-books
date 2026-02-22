
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getEbookById } from '../services/firestoreService';
import { getOfflineBook, saveOfflineBook } from '../services/offlineService';
import type { Flashcard, UserData } from '../types';
import type { User } from 'firebase/auth';
import { ArrowLeft, Shuffle, RefreshCw, XCircle, CheckCircle2, ChevronLeft, ChevronRight, Crown, WifiOff, Loader2, Star, Sparkles } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import OfflineGateModal from '../components/OfflineGateModal';

declare global {
    interface Window {
      MathJax: {
        typesetPromise: (elements?: HTMLElement[]) => Promise<void>;
      };
    }
}

interface StudySessionPageProps {
    user: User | null;
    userData: UserData | null;
}

const FREE_USER_CARD_LIMIT = 10;

const StudySessionPage: React.FC<StudySessionPageProps> = ({ user, userData }) => {
    const { type, id } = useParams<{ type: 'ebook', id: string }>();
    const navigate = useNavigate();

    const [deckTitle, setDeckTitle] = useState('');
    const [allCards, setAllCards] = useState<Flashcard[]>([]);
    const [displayedCards, setDisplayedCards] = useState<Flashcard[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sessionComplete, setSessionComplete] = useState(false);
    const [correctCount, setCorrectCount] = useState(0);
    const [incorrectIndices, setIncorrectIndices] = useState<number[]>([]);
    const [showOfflineGate, setShowOfflineGate] = useState(false);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const cardRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        const fetchAndBuildDeck = async () => {
            if (!id || type !== 'ebook') {
                setError("Invalid study session link.");
                setLoading(false);
                return;
            }
            try {
                // Security check for offline free users
                if (!navigator.onLine && !isProUser) {
                    setShowOfflineGate(true);
                    setLoading(false);
                    return;
                }

                let ebook: any;

                // Priority 1: Direct Cloud if Online
                if (navigator.onLine) {
                    ebook = await getEbookById(id);
                    if (ebook) saveOfflineBook(ebook); // Sync to local storage in background
                }

                // Priority 2: Fallback to Local if offline or cloud fails
                if (!ebook) {
                    ebook = await getOfflineBook(id);
                }

                if (!ebook) {
                    if (!navigator.onLine) setShowOfflineGate(true);
                    else setError("Deck not found in cloud or local library.");
                    setLoading(false);
                    return;
                }

                const title = ebook.title;
                const cards = ebook.flashcards || [];

                if (cards.length === 0) {
                    setError("This item doesn't have any flashcards to study.");
                    setDeckTitle(title);
                    setLoading(false);
                    return;
                }
                
                setDeckTitle(title);
                setAllCards(cards);
                
                const cardsToDisplay = isProUser ? cards : cards.slice(0, FREE_USER_CARD_LIMIT);
                setDisplayedCards(cardsToDisplay);

                setLoading(false);
            } catch (err: any) {
                setError(err.message || "Failed to load deck");
                setLoading(false);
            }
        };
        fetchAndBuildDeck();
    }, [id, type, isProUser]);

    useEffect(() => {
        if (cardRef.current && window.MathJax?.typesetPromise) {
            window.MathJax.typesetPromise([cardRef.current]).catch((err) =>
                console.error("MathJax typesetting error:", err)
            );
        }
    }, [currentIndex, displayedCards, isFlipped]);

    const handleFlip = () => setIsFlipped(!isFlipped);

    const handleNavigation = (direction: 'next' | 'prev') => {
        setIsFlipped(false);
        setTimeout(() => {
            if (direction === 'next' && currentIndex < displayedCards.length - 1) {
                setCurrentIndex(prev => prev + 1);
            } else if (direction === 'prev' && currentIndex > 0) {
                setCurrentIndex(prev => prev - 1);
            }
        }, 150); 
    };
    
    const handleSelfAssessment = (correct: boolean) => {
        if (correct) {
            setCorrectCount(c => c + 1);
        } else {
            const originalIndex = allCards.indexOf(displayedCards[currentIndex]);
            setIncorrectIndices(indices => [...indices, originalIndex]);
        }

        if (currentIndex === displayedCards.length - 1) {
            setSessionComplete(true);
        } else {
            handleNavigation('next');
        }
    };

    const handleShuffle = () => {
        setIsFlipped(false);
        setCurrentIndex(0);
        setSessionComplete(false);
        setCorrectCount(0);
        setIncorrectIndices([]);
        const shuffled = [...allCards];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const cardsToDisplay = isProUser ? shuffled : shuffled.slice(0, FREE_USER_CARD_LIMIT);
        setDisplayedCards(cardsToDisplay);
    };
    
    const restartSession = (reviewIncorrect = false) => {
        let cardsToStudy;
        if (reviewIncorrect) {
            cardsToStudy = incorrectIndices.map(i => allCards[i]);
        } else {
            cardsToStudy = isProUser ? allCards : allCards.slice(0, FREE_USER_CARD_LIMIT);
        }

        setDisplayedCards(cardsToStudy);
        setCurrentIndex(0);
        setIsFlipped(false);
        setSessionComplete(false);
        setCorrectCount(0);
        setIncorrectIndices([]);
    };

    if (loading) return <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-900 z-50"><LoadingSpinner /><p className="mt-4 text-gray-400">Building your deck...</p></div>;

    if (showOfflineGate) return <div className="min-h-screen bg-gray-900"><OfflineGateModal isOpen={showOfflineGate} onClose={() => setShowOfflineGate(false)} /></div>;

    if (error) return <div className="text-center mt-20 p-4"><p className="text-red-500 bg-red-900/50 p-4 rounded-lg">{error}</p><button onClick={() => navigate(-1)} className="mt-6 px-4 py-2 bg-orange-600 rounded-lg font-bold text-white shadow-lg">Back to My Library</button></div>;

    const currentCard = displayedCards[currentIndex];

    return (
        <div className="fixed inset-0 bg-gray-900 flex flex-col p-4 z-50">
            <header className="flex items-center justify-between text-white mb-4 flex-shrink-0">
                <button onClick={() => navigate(-1)} className="flex items-center space-x-2 text-orange-500 hover:text-orange-400 transition-colors p-2"><ArrowLeft size={24}/><span>Back</span></button>
                <div className="text-center flex-1 mx-2 flex items-center justify-center gap-2 overflow-hidden">
                   <h1 className="font-bold truncate" title={deckTitle}>{deckTitle}</h1>
                   {isOffline && isProUser && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0"></div>}
                </div>
                <div className="w-32 text-right"><span className="font-bold text-orange-500 text-lg">{currentIndex + 1}</span><span className="text-gray-500"> / {displayedCards.length}</span></div>
            </header>
            
            {!isProUser && (
                <div className="bg-yellow-800/50 border border-yellow-500 text-center p-2 rounded-lg mb-4 text-sm shrink-0">
                    <p>
                        <span className="font-bold">PRO PREVIEW:</span> You are viewing {FREE_USER_CARD_LIMIT} of {allCards.length} cards. <Link to="/upgrade" className="underline font-bold">Upgrade to Pro</Link> to study the full deck.
                    </p>
                </div>
            )}

            <main className="flex-grow flex flex-col items-center justify-center relative overflow-hidden">
                {sessionComplete ? (
                    <div className="text-center bg-gray-800 p-10 rounded-[2.5rem] shadow-xl animate-fade-in border border-gray-700 w-full max-w-md">
                        <div className="relative mb-6">
                            <CheckCircle2 size={64} className="mx-auto text-green-500" />
                            <Sparkles size={24} className="absolute -top-2 -right-1/4 translate-x-12 text-orange-400 animate-pulse" />
                        </div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Session Complete!</h2>
                        <p className="text-5xl my-4 text-orange-500 font-black">{Math.round((correctCount / displayedCards.length) * 100)}%</p>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-8">Correct Retention ({correctCount} / {displayedCards.length})</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={() => restartSession()} className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase text-xs tracking-widest rounded-xl flex items-center justify-center space-x-2 shadow-lg"><RefreshCw size={18} /><span>Restart Session</span></button>
                            {incorrectIndices.length > 0 && (
                                <button onClick={() => restartSession(true)} className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black uppercase text-xs tracking-widest rounded-xl flex items-center justify-center space-x-2 shadow-lg"><span>Review {incorrectIndices.length} Mistakes</span></button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="w-full max-w-2xl h-[75vh] md:h-[65vh] flashcard-container">
                        <div className={`flashcard ${isFlipped ? 'is-flipped' : ''}`} onClick={handleFlip} ref={cardRef}>
                            {/* Front Face */}
                            <div className="flashcard-face flashcard-front cursor-pointer border border-white/5 bg-gray-800 shadow-2xl flex flex-col items-center justify-center p-8 text-center">
                                <div className="ebook-content text-2xl md:text-4xl font-bold text-white leading-relaxed" dangerouslySetInnerHTML={{ __html: currentCard.front }} />
                                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30 animate-pulse">
                                    <div className="w-10 h-1 bg-gray-600 rounded-full"></div>
                                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-[0.4em]">Tap to flip</span>
                                </div>
                            </div>
                            
                            {/* Back Face */}
                            <div className="flashcard-face flashcard-back border-2 border-orange-500/30 bg-gray-850 shadow-2xl p-8 text-center flex flex-col items-center justify-center overflow-y-auto custom-scrollbar">
                                <div className="ebook-content text-xl md:text-3xl text-gray-200 font-medium leading-relaxed my-auto" dangerouslySetInnerHTML={{ __html: currentCard.back }} />
                                <div className="absolute top-6 left-1/2 -translate-x-1/2 text-[9px] text-orange-500/50 font-black uppercase tracking-widest">Answer Key</div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {!sessionComplete && (
                <footer className="w-full max-w-2xl mx-auto flex-shrink-0 pb-10 px-2 mt-4">
                    {isFlipped ? (
                        <div className="flex justify-center items-center gap-4 animate-fade-in">
                            <button onClick={() => handleSelfAssessment(false)} className="flex-1 flex flex-col items-center py-5 px-4 bg-gray-800 hover:bg-red-900/40 border border-red-500/30 rounded-3xl text-red-400 font-bold transition-all transform hover:scale-105 shadow-xl active:scale-95">
                                <XCircle size={28} className="mb-2" />
                                <span className="uppercase text-[10px] font-black tracking-[0.2em]">Still Learning</span>
                            </button>
                            <button onClick={() => handleSelfAssessment(true)} className="flex-1 flex flex-col items-center py-5 px-4 bg-green-600 hover:bg-green-700 rounded-3xl text-white font-bold transition-all transform hover:scale-105 shadow-xl active:scale-95">
                                <CheckCircle2 size={28} className="mb-2" />
                                <span className="uppercase text-[10px] font-black tracking-[0.2em]">Mastered!</span>
                            </button>
                        </div>
                    ) : (
                         <div className="flex justify-between items-center mb-2">
                            <button onClick={() => handleNavigation('prev')} disabled={currentIndex === 0} className="p-5 rounded-full bg-gray-800 border border-gray-700 hover:border-orange-500 disabled:opacity-30 disabled:hover:border-gray-700 text-white transition-all"><ChevronLeft size={24} /></button>
                            <button onClick={handleFlip} className="flex-1 mx-4 py-5 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-black uppercase text-xs tracking-[0.3em] rounded-3xl shadow-2xl transform active:scale-95 transition-all">Show Answer</button>
                            <button onClick={() => handleNavigation('next')} disabled={currentIndex === displayedCards.length - 1} className="p-5 rounded-full bg-gray-800 border border-gray-700 hover:border-orange-500 disabled:opacity-30 disabled:hover:border-gray-700 text-white transition-all"><ChevronRight size={24}/></button>
                         </div>
                    )}
                     <div className="text-center mt-6">
                        <button onClick={handleShuffle} className="text-gray-500 hover:text-white flex items-center space-x-2 mx-auto text-[10px] font-black uppercase tracking-widest transition-colors py-2"><Shuffle size={14} /><span>Randomize Pack</span></button>
                    </div>
                </footer>
            )}
        </div>
    );
};

export default StudySessionPage;
