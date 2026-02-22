import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Ebook, UserData, BookReview } from '../types';
import type { User } from 'firebase/auth';
import { getEbookById, markBookAsComplete, rateAndReviewBook, updateUserReadingTime, updateDailyStreak, getBookReviews } from '../services/firestoreService';
import { getOfflineBook, saveOfflineBook } from '../services/offlineService';
import { ArrowLeft, Star, MessageSquare, Heart, Share2, Sparkles, CheckCircle2, Type, Play, Pause, Zap, Copy, MessageCircle, X, ChevronRight, WifiOff, Users } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import OfflineGateModal from '../components/OfflineGateModal';

interface GeneralReaderPageProps {
    user: User | null;
    userData: UserData | null;
}

const GeneralReaderPage: React.FC<GeneralReaderPageProps> = ({ user, userData }) => {
    const { ebookId } = useParams<{ ebookId: string }>();
    const navigate = useNavigate();
    
    const [ebook, setEbook] = useState<Ebook | null>(null);
    const [loading, setLoading] = useState(true);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showOfflineGate, setShowOfflineGate] = useState(false);
    const [rating, setRating] = useState(0);
    const [ratingComment, setRatingComment] = useState('');
    const [isSubmittingRating, setIsSubmittingRating] = useState(false);
    const [hasRated, setHasRated] = useState(false);
    const [reviews, setReviews] = useState<BookReview[]>([]);

    // Reading Settings
    const [showAppearancePopup, setShowAppearancePopup] = useState(false);
    const [fontFamily, setFontFamily] = useState<'serif' | 'sans'>('serif');
    
    // Auto-Scroll State
    const [isAutoScrolling, setIsAutoScrolling] = useState(false);
    const [scrollSpeed, setScrollSpeed] = useState(1); // 1x to 5x
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    // Refs
    const contentRef = useRef<HTMLDivElement>(null);
    const startTimeRef = useRef<number>(Date.now());
    const hasTriggeredCompleteRef = useRef(false);
    const animationFrameRef = useRef<number | null>(null);
    const userHasScrolledRef = useRef(false);
    
    const MIN_READ_TIME_MS = 60 * 1000; 

    const isProUser = userData?.subscriptionStatus === 'pro' || userData?.subscriptionStatus === 'day_pass' || userData?.role === 'central admin';

    const fetchReviews = useCallback(async () => {
        if (!ebookId) return;
        try {
            const data = await getBookReviews(ebookId);
            setReviews(data);
        } catch (e) {
            console.error("Failed to fetch reviews", e);
        }
    }, [ebookId]);

    // --- ACTIVE CONNECTIVITY MONITOR ---
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
        const fetchEbook = async () => {
            if (ebookId) {
                try {
                    if (!navigator.onLine && !isProUser) {
                        setShowOfflineGate(true);
                        setLoading(false);
                        return;
                    }

                    let fetchedEbook: Ebook | undefined = await getOfflineBook(ebookId);
                    
                    if (!fetchedEbook && navigator.onLine) {
                        fetchedEbook = await getEbookById(ebookId) || undefined;
                        if (fetchedEbook) {
                            saveOfflineBook(fetchedEbook);
                        }
                    }

                    if (!fetchedEbook) {
                        if (navigator.onLine) navigate('/'); 
                        else setShowOfflineGate(true);
                        return;
                    }

                    if (fetchedEbook.accessLevel === 'pro' && !isProUser) {
                        navigate(`/general-viewer/${ebookId}`);
                        return;
                    }

                    setEbook(fetchedEbook);
                    fetchReviews();
                } catch (e) {
                    console.error(e);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchEbook();
    }, [ebookId, navigate, isProUser, fetchReviews]);

    useEffect(() => {
        startTimeRef.current = Date.now();
        hasTriggeredCompleteRef.current = false;
        userHasScrolledRef.current = false;
        return () => {
            if (user && ebookId && !user.isAnonymous) {
                const endTime = Date.now();
                const durationInMinutes = Math.round((endTime - startTimeRef.current) / (1000 * 60));
                if (durationInMinutes > 0) {
                    updateUserReadingTime(user.uid, durationInMinutes);
                    updateDailyStreak(user.uid);
                }
            }
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [user, ebookId]);

    const checkCompletion = useCallback(() => {
        if (hasTriggeredCompleteRef.current || !user || !ebookId || !userHasScrolledRef.current) return;
        
        const timeSpent = Date.now() - startTimeRef.current;
        const earnedPoints = timeSpent >= MIN_READ_TIME_MS;
        
        hasTriggeredCompleteRef.current = true;
        markBookAsComplete(user.uid, ebookId, earnedPoints); 
        setShowRatingModal(true); 
    }, [user, ebookId]);

    const handleScroll = useCallback(() => {
        const currentScroll = window.scrollY;
        if (currentScroll > 100) {
            userHasScrolledRef.current = true;
        }

        const docHeight = document.documentElement.scrollHeight;
        const windowHeight = window.innerHeight;
        
        const totalScrollable = docHeight - windowHeight;
        if (totalScrollable <= 100) return; // Prevent triggering on very short pages immediately

        const progress = totalScrollable > 0 ? (currentScroll / totalScrollable) * 100 : 0;
        setScrollProgress(progress);

        if (progress > 98) {
            checkCompletion();
            if (isAutoScrolling) setIsAutoScrolling(false);
        }
    }, [checkCompletion, isAutoScrolling]);

    useEffect(() => {
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    useEffect(() => {
        const performScroll = () => {
            if (isAutoScrolling) {
                window.scrollBy(0, 0.6 * scrollSpeed);
                animationFrameRef.current = requestAnimationFrame(performScroll);
            }
        };

        if (isAutoScrolling) {
            animationFrameRef.current = requestAnimationFrame(performScroll);
        } else {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        }

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [isAutoScrolling, scrollSpeed]);

    const toggleAutoScroll = () => {
        setIsAutoScrolling(!isAutoScrolling);
    };

    const cycleSpeed = () => {
        setScrollSpeed(prev => prev >= 5 ? 1 : prev + 1);
    };

    const handleSubmitRating = async () => {
        if (!user || !ebookId || !userData) return;
        setIsSubmittingRating(true);
        try {
            await rateAndReviewBook(ebookId, user.uid, userData.username, rating, ratingComment, userData.profilePictureUrl);
            setHasRated(true);
            setShowRatingModal(false);
            fetchReviews(); // Refresh the feed after posting
        } catch (e) {
            console.error("Failed to rate", e);
            alert("Failed to submit rating.");
        } finally {
            setIsSubmittingRating(false);
        }
    };

    const getShareUrl = () => {
        return window.location.origin + window.location.pathname + window.location.search;
    };

    const handleCopyLink = () => {
        const url = getShareUrl();
        navigator.clipboard.writeText(url);
        alert("Story link copied to clipboard!");
        setShowShareModal(false);
    };

    const handleWhatsAppShare = () => {
        const url = getShareUrl();
        const text = encodeURIComponent(`Check out this story: "${ebook?.title}" on EINTK!\n\nRead it here: ${url}`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
        setShowShareModal(false);
    };

    const handleNativeShare = async () => {
        const url = getShareUrl();
        if (navigator.share) {
            try {
                await navigator.share({
                    title: ebook?.title || 'EINTK Story',
                    text: `I just read "${ebook?.title}" on EINTK. You should check it out!`,
                    url: url,
                });
                setShowShareModal(false);
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.error("Share failed", err);
                    handleCopyLink();
                }
            }
        } else {
            handleCopyLink();
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen bg-gray-900"><LoadingSpinner /></div>;
    
    if (showOfflineGate) return <div className="min-h-screen bg-gray-900"><OfflineGateModal isOpen={showOfflineGate} onClose={() => setShowOfflineGate(false)} /></div>;

    if (!ebook) return <div className="text-center mt-20 text-gray-400">Story not found.</div>;

    const fontClass = fontFamily === 'serif' ? 'font-serif' : 'font-sans';

    return (
        <div className={`min-h-screen bg-gray-900 text-gray-100 font-sans pb-24`}>
            
            <button 
                onClick={() => { setIsAutoScrolling(false); navigate('/'); }} 
                className="fixed top-4 left-4 p-3 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-orange-600 transition-colors z-[60] shadow-lg border border-white/10"
            >
                <ArrowLeft size={24} />
            </button>

            <div className="relative h-[50vh] w-full overflow-hidden">
                <img src={ebook.coverImageUrl} alt={ebook.title} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent"></div>
                
                <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                    <div className="max-w-2xl mx-auto">
                        <span className="inline-block px-3 py-1 bg-orange-600 text-white text-xs font-bold rounded-full mb-3 uppercase tracking-wide shadow-lg">
                            {ebook.topic || 'General Story'}
                        </span>
                        <div className="flex items-center gap-2 mb-2">
                           <h1 className="text-3xl md:text-5xl font-black text-white leading-tight drop-shadow-lg">
                              {ebook.title}
                           </h1>
                           {isOffline && isProUser && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0"></div>}
                        </div>
                        <div className="flex items-center text-gray-300 text-sm space-x-4">
                            <span>{new Date((ebook.createdAt?.seconds || 0) * 1000).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{Math.ceil((ebook.chapters?.reduce((acc, ch) => acc + ch.content.length, 0) || 0) / 1000)} min read</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="fixed top-0 left-0 h-1 bg-orange-600 z-50 transition-all duration-100" style={{ width: `${scrollProgress}%` }}></div>

            <div className="max-w-2xl mx-auto px-6 py-8" ref={contentRef}>
                {ebook.chapters?.map((chapter, idx) => (
                    <div key={idx} className="mb-12 animate-fade-in-up" style={{ animationDelay: `${idx * 100}ms` }}>
                        {!chapter.title.match(/^Chapter \d+$/i) && (
                            <h2 className="text-2xl font-bold text-orange-400 mb-4 border-l-4 border-orange-500 pl-4">{chapter.title}</h2>
                        )}
                        
                        <div 
                            className={`prose prose-invert prose-lg max-w-none text-gray-300 leading-relaxed ${fontClass} ebook-content`}
                            dangerouslySetInnerHTML={{ __html: chapter.content.replace(/<img/g, '<img class="rounded-xl shadow-lg my-6 w-full"') }} 
                        />
                    </div>
                ))}

                <div className="border-t border-gray-800 pt-8 mt-12 flex flex-col items-center text-center">
                    <div className="w-16 h-1 bg-gray-800 rounded-full mb-6"></div>
                    <h3 className="text-2xl font-bold text-white mb-2">You've reached the end!</h3>
                    <p className="text-gray-400 mb-6">Hope you enjoyed this story.</p>
                    
                    <div className="flex gap-4 mb-16">
                        <button 
                            onClick={() => setShowRatingModal(true)} 
                            disabled={hasRated}
                            className={`flex items-center px-6 py-3 rounded-full font-bold transition-all transform hover:scale-105 shadow-lg ${hasRated ? 'bg-green-600 text-white cursor-default' : 'bg-gradient-to-r from-orange-500 to-pink-500 text-white'}`}
                        >
                            {hasRated ? <CheckCircle2 className="mr-2" /> : <Heart className="mr-2 fill-current" />}
                            {hasRated ? 'Rated!' : 'Rate Story'}
                        </button>
                        <button onClick={() => setShowShareModal(true)} className="p-3 bg-gray-800 rounded-full text-gray-300 hover:bg-gray-700 transition-colors">
                            <Share2 size={24} />
                        </button>
                    </div>

                    {/* --- COMMUNITY VIBES / COMMENTS SECTION --- */}
                    <div className="w-full text-left animate-fade-in">
                        <div className="flex items-center justify-between mb-6 px-1">
                            <div className="flex items-center gap-3">
                                <div className="bg-orange-600/20 p-2.5 rounded-xl border border-orange-500/30">
                                    <MessageSquare size={20} className="text-orange-500" />
                                </div>
                                <div>
                                    <h4 className="text-lg font-black text-white uppercase tracking-tighter italic">Community Vibes</h4>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{reviews.length} Gists posted</p>
                                </div>
                            </div>
                        </div>

                        <div 
                            className={`w-full space-y-4 pr-1 ${reviews.length > 10 ? 'max-h-[600px] overflow-y-auto custom-scrollbar' : ''}`}
                        >
                            {reviews.length === 0 ? (
                                <div className="bg-gray-800/40 border-2 border-dashed border-gray-700 rounded-[2rem] p-10 text-center">
                                    <Sparkles size={32} className="mx-auto text-gray-600 mb-3" />
                                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">No gists yet. Be the first!</p>
                                </div>
                            ) : (
                                reviews.map((review) => (
                                    <div key={review.id} className="bg-gray-800/60 backdrop-blur-xl border border-white/5 rounded-[1.5rem] p-5 shadow-lg group hover:border-orange-500/30 transition-all">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-orange-600 overflow-hidden flex items-center justify-center font-black text-white text-xs shadow-inner">
                                                    {review.profilePictureUrl ? (
                                                        <img src={review.profilePictureUrl} className="w-full h-full object-cover" alt={review.username} />
                                                    ) : (
                                                        review.username.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold text-sm leading-tight">{review.username}</p>
                                                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Learner</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-0.5">
                                                {[1, 2, 3, 4, 5].map((s) => (
                                                    <Star key={s} size={10} className={s <= review.rating ? 'text-yellow-400 fill-current' : 'text-gray-700'} />
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-gray-300 text-sm leading-relaxed italic group-hover:text-white transition-colors">
                                            "{review.comment}"
                                        </p>
                                        <div className="mt-3 pt-3 border-t border-white/5 flex justify-end">
                                            <span className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">
                                                {new Date(review.createdAt?.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        
                        {reviews.length > 10 && (
                            <div className="mt-4 text-center">
                                <span className="text-[9px] text-gray-600 font-black uppercase tracking-[0.3em]">Keep scrolling for more vibes</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                {showAppearancePopup && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 bg-gray-800/90 backdrop-blur border border-gray-700 rounded-xl p-3 shadow-2xl w-48 animate-fade-in-up">
                        <div className="flex bg-gray-900 rounded-lg p-1">
                            <button onClick={() => setFontFamily('serif')} className={`flex-1 py-1.5 text-xs font-serif rounded ${fontFamily === 'serif' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}>Serif</button>
                            <button onClick={() => setFontFamily('sans')} className={`flex-1 py-1.5 text-xs font-sans rounded ${fontFamily === 'sans' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}>Sans</button>
                        </div>
                        <div className="text-center mt-2">
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Font Style</span>
                        </div>
                    </div>
                )}

                <div className="bg-gray-900/90 backdrop-blur-md border border-gray-700 rounded-full shadow-2xl flex items-center p-1.5 gap-1">
                    
                    <button 
                        onClick={toggleAutoScroll}
                        className={`p-3 rounded-full transition-all ${isAutoScrolling ? 'bg-orange-600 text-white animate-pulse' : 'hover:bg-gray-800 text-gray-300'}`}
                        title={isAutoScrolling ? "Pause Auto-Scroll" : "Start Auto-Scroll"}
                    >
                        {isAutoScrolling ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                    </button>

                    <div className="h-8 w-px bg-gray-700 mx-1"></div>
                    <button 
                        onClick={cycleSpeed}
                        className="flex items-center justify-center w-12 h-10 rounded-full hover:bg-gray-800 text-gray-300 font-bold text-sm transition-colors"
                        title="Scroll Speed"
                    >
                        <Zap size={14} className={`mr-1 ${scrollSpeed > 2 ? 'text-yellow-400' : 'text-gray-500'}`} />
                        {scrollSpeed}x
                    </button>

                    <div className="h-8 w-px bg-gray-700 mx-1"></div>
                    <button 
                        onClick={() => setShowAppearancePopup(!showAppearancePopup)}
                        className={`p-3 rounded-full transition-colors ${showAppearancePopup ? 'bg-gray-800 text-white' : 'hover:bg-gray-800 text-gray-300'}`}
                        title="Appearance"
                    >
                        <Type size={20} />
                    </button>
                </div>
            </div>

            <Modal isOpen={showRatingModal} onClose={() => setShowRatingModal(false)} title="Vibe Check">
                <div className="text-center p-2">
                    <div className="mb-4 text-green-400 font-bold flex items-center justify-center text-lg">
                        <Sparkles className="mr-2" /> Finish Check
                    </div>
                    <p className="text-gray-300 mb-6">How was the gist? Rate this story to help others find it!</p>
                    
                    <div className="flex justify-center gap-2 mb-6">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button key={star} onClick={() => setRating(star)} className="focus:outline-none transition-transform hover:scale-110">
                                <Star size={32} className={`${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} />
                            </button>
                        ))}
                    </div>

                    <div className="mb-6 relative">
                        <textarea 
                            value={ratingComment} 
                            onChange={e => setRatingComment(e.target.value)}
                            placeholder="What did you learn? Drop a comment..." 
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl p-4 text-white text-sm h-32 outline-none focus:border-orange-500 resize-none"
                        />
                        <MessageSquare className="absolute bottom-4 right-4 text-gray-600" size={16}/>
                    </div>

                    <button 
                        onClick={handleSubmitRating} 
                        disabled={rating === 0 || isSubmittingRating}
                        className="w-full py-3 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl font-bold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02]"
                    >
                        {isSubmittingRating ? 'Posting...' : 'Post Vibe'}
                    </button>
                </div>
            </Modal>

            <Modal isOpen={showShareModal} onClose={() => setShowShareModal(false)} title="Share this Story">
                <div className="p-2">
                    <div className="bg-gray-900 rounded-2xl p-4 mb-6 border border-gray-700 flex items-center gap-4">
                        <img src={ebook.coverImageUrl} className="w-20 h-20 rounded-lg object-cover shadow-lg" alt="Cover" />
                        <div className="flex-1 overflow-hidden">
                            <h4 className="font-bold text-white truncate">{ebook.title}</h4>
                            <p className="text-xs text-gray-400 mt-1">Recommended by {userData?.username || 'a friend'}</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3">
                        <button 
                            onClick={handleWhatsAppShare}
                            className="flex items-center justify-between p-4 bg-green-600 hover:bg-green-700 rounded-xl font-bold text-white transition-all transform active:scale-95"
                        >
                            <span className="flex items-center"><MessageCircle size={20} className="mr-3" /> Share to WhatsApp</span>
                            <ChevronRight size={18} />
                        </button>
                        <button 
                            onClick={handleCopyLink}
                            className="flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold text-white transition-all transform active:scale-95 border border-gray-700"
                        >
                            <span className="flex items-center"><Copy size={20} className="mr-3 text-orange-400" /> Copy Link</span>
                            <ChevronRight size={18} />
                        </button>
                        <button 
                            onClick={handleNativeShare}
                            className="flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold text-white transition-all transform active:scale-95 border border-gray-700"
                        >
                            <span className="flex items-center"><Share2 size={20} className="mr-3 text-blue-400" /> More Options</span>
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default GeneralReaderPage;