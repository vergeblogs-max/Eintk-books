
import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { User } from 'firebase/auth';
import type { Ebook, UserData, ExamQST, StudyDeck, Announcement } from '../types';
import { getPublishedEbooks, toggleSyllabusTopic, getPublishedExamQSTs, saveContactSubmission, getRecentAnnouncements, updateUserStudyPlan } from '../services/firestoreService';
import { getAllOfflineBookIds, getAllOfflineExamIds, getAllOfflineBooks } from '../services/offlineService';
import { resolveMissionToBook, MissionResult } from '../services/missionResolver';
import { rescheduleRemainingMissions } from '../services/schedulerService';
import { Link, useNavigate } from 'react-router-dom';
import { 
    X, ChevronUp, Lock, WifiOff, Info, BookOpen, List, Tag, GraduationCap, 
    CheckCircle2, Compass, BookA, Star, Trophy, Ghost, Globe, Target, 
    ChevronRight, TrendingUp, Sparkles, Filter, Search, Crown, Check, Flame, AlertCircle, Layers, Clock, Swords, ChevronDown, Lightbulb, Send, Loader2, Megaphone, RotateCcw, CalendarPlus, Zap,
    Activity, RefreshCw
} from 'lucide-react';
import CircularProgress from '../components/CircularProgress';
import DictionaryPage from './DictionaryPage';
import { SYLLABUS_DATA } from '../data/syllabusData';
import { Timestamp } from 'firebase/firestore';
import ComplianceModal from '../components/ComplianceModal';

interface SyllabusItem {
    id: string;
    topic: string;
    subtopics?: string[];
    outcomes?: string;
}

interface LibraryPageProps {
  user: User | null;
  userData: UserData | null;
}

interface SyllabusTrackerProps {
    userData: UserData;
    user: User | null;
    allEbooks: Ebook[];
    allExams: ExamQST[];
    offlineBookIds: string[];
    offlineExamIds: string[];
    refreshOfflineStatus: () => Promise<void>;
}

const getStreakStage = (streak: number) => {
    if (streak < 3) return { color: 'text-blue-400', bg: 'bg-blue-500', label: 'Neutral', glow: 'shadow-[0_0_15px_rgba(96,165,250,0.3)]' };
    if (streak < 7) return { color: 'text-orange-500', bg: 'bg-orange-500', label: 'Flaming', glow: 'shadow-[0_0_20px_rgba(249,115,22,0.5)]' };
    if (streak < 14) return { color: 'text-red-500', bg: 'bg-red-500', label: 'Blaze', glow: 'shadow-[0_0_25px_rgba(239,68,68,0.6)]' };
    
    const week = Math.min(20, Math.floor(streak / 7));
    const spectrum = [
        { color: 'text-pink-500', bg: 'bg-pink-500', label: 'Evolved' },
        { color: 'text-purple-500', bg: 'bg-purple-500', label: 'Ascended' },
        { color: 'text-indigo-500', bg: 'bg-indigo-500', label: 'Mystic' },
        { color: 'text-cyan-400', bg: 'bg-cyan-400', label: 'Cosmic' },
        { color: 'text-teal-400', bg: 'bg-teal-400', label: 'Oceanic' },
        { color: 'text-green-400', bg: 'bg-green-400', label: 'Natural' },
        { color: 'text-lime-400', bg: 'bg-lime-400', label: 'Solar' },
        { color: 'text-yellow-400', bg: 'bg-yellow-400', label: 'Radiant' },
        { color: 'text-amber-500', bg: 'bg-amber-500', label: 'Ancient' },
        { color: 'text-fuchsia-500', stopColor: '#d946ef', label: 'Prismatic' },
        { color: 'text-rose-500', bg: 'bg-rose-500', label: 'Heartbeat' },
        { color: 'text-emerald-500', bg: 'bg-emerald-500', label: 'Eternal' },
        { color: 'text-sky-400', bg: 'bg-sky-400', label: 'Atmospheric' },
        { color: 'text-violet-500', bg: 'bg-violet-500', label: 'Regal' },
        { color: 'text-slate-200', bg: 'bg-slate-200', label: 'Solid' },
        { color: 'text-white', bg: 'bg-white', label: 'Transcendent' },
        { color: 'text-yellow-200', bg: 'bg-yellow-100', label: 'Godlike', cap: true }
    ];
    
    const stageIdx = Math.min(spectrum.length - 1, week - 2);
    const stage = spectrum[stageIdx];
    return { ...stage, glow: `shadow-[0_0_30px_rgba(255,255,255,0.4)]`, isMax: !!(stage as any).cap };
};

export const ConnectivityStatus: React.FC<{ isOffline: boolean; isPro: boolean }> = ({ isOffline, isPro }) => {
    if (!isOffline) return null;
    return (
        <div className="bg-orange-600/20 border border-orange-500/50 p-3 rounded-2xl mb-6 flex items-center justify-between animate-fade-in mx-2">
            <div className="flex items-center gap-3">
                <div className="bg-orange-600 p-2 rounded-xl text-white"><WifiOff size={18} /></div>
                <div>
                    <p className="text-white font-bold text-xs">Offline Mode</p>
                    <p className="text-[10px] text-gray-400 font-medium">{isPro ? "Using local library vault." : "Limited access. Connect to sync."}</p>
                </div>
            </div>
            {isPro && (
                <div className="bg-blue-600/20 px-3 py-1 rounded-full border border-blue-500/30 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div>
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Vault Active</span>
                </div>
            )}
        </div>
    );
};

const AnnouncementBanner: React.FC<{ announcements: Announcement[], onDismiss: (id: string) => void }> = ({ announcements, onDismiss }) => {
    if (announcements.length === 0) return null;
    return (
        <div className="space-y-3 mb-8 px-2 animate-fade-in">
            <div className="flex items-center gap-2 mb-2 px-2">
                <Megaphone size={14} className="text-orange-500" />
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em]">System Broadcast</span>
            </div>
            {announcements.map(ann => (
                <div key={ann.id} className="bg-gray-800/40 backdrop-blur-xl border border-orange-500/30 rounded-3xl p-5 relative overflow-hidden group shadow-xl">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform pointer-events-none"><Megaphone size={80} className="text-orange-500" /></div>
                    <button onClick={() => onDismiss(ann.id)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors z-20"><X size={18} /></button>
                    <div className="flex gap-4 items-start relative z-10 pr-6">
                        <div className="bg-orange-600 p-2.5 rounded-xl text-white shadow-lg shadow-orange-900/40 shrink-0"><Megaphone size={18} className="animate-pulse" /></div>
                        <div className="min-w-0">
                            <h4 className="text-white font-black text-sm uppercase tracking-tight mb-1 truncate">{ann.title}</h4>
                            <p className="text-gray-400 text-xs leading-relaxed line-clamp-3">{ann.content}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const MissionSeal = () => (
    <div className="absolute top-3 right-3 z-30 animate-fade-in">
        <div className="bg-gradient-to-br from-yellow-400 to-orange-600 p-1.5 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.5)] border-2 border-gray-900">
            <Trophy size={14} className="text-white fill-current" />
        </div>
    </div>
);

const RequestBookCard: React.FC<{ user: User | null; userData: UserData | null }> = ({ user, userData }) => {
    const [request, setRequest] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!request.trim()) return;
        setIsSubmitting(true);
        try {
            await saveContactSubmission({ name: userData?.username || 'Unknown', email: userData?.email || 'No email', reason: 'Book Request', message: `User requested the following book: ${request.trim()}`, userId: user?.uid });
            setIsSuccess(true); setRequest(''); setTimeout(() => setIsSuccess(false), 4000);
        } catch (e) { console.error(e); } finally { setIsSubmitting(false); }
    };
    return (
        <div className="relative w-full aspect-[1/1.4] bg-gray-900/50 backdrop-blur-xl rounded-[2rem] border-2 border-dashed border-gray-700 flex flex-col items-center justify-center p-8 text-center group transition-all hover:border-orange-500/50">
            <div className="bg-orange-600/20 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform"><Lightbulb size={40} className="text-orange-500" /></div>
            <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tighter italic">Missing a Book?</h3>
            <p className="text-xs text-gray-500 mb-6 font-medium">Tell us what you want to study next and we'll forge it into existence.</p>
            {isSuccess ? (
                <div className="animate-fade-in text-green-400 flex flex-col items-center"><CheckCircle2 size={32} className="mb-2" /><span className="text-[10px] font-black uppercase tracking-widest">Request Logged</span></div>
            ) : (
                <form onSubmit={handleSubmit} className="w-full space-y-3">
                    <input type="text" value={request} onChange={e => setRequest(e.target.value)} placeholder="Subject or Topic..." className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all placeholder-gray-600" />
                    <button type="submit" disabled={isSubmitting || !request.trim()} className="w-full bg-white text-gray-900 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-600 hover:text-white transition-all disabled:opacity-50">{isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}Send Request</button>
                </form>
            )}
        </div>
    );
};

const VerticalBookCard: React.FC<{ book: Ebook, mission?: MissionResult, status?: 'completed' | 'active' | 'locked', isOffline: boolean, isDownloaded: boolean, onInfoClick: (book: Ebook) => void, isExplore?: boolean }> = ({ book, mission, status, isOffline, isDownloaded, onInfoClick, isExplore }) => {
    const navigate = useNavigate();
    const isAvailable = !isOffline || isDownloaded;
    const isActive = status === 'active';
    const isCompleted = status === 'completed';
    const isPro = book.accessLevel === 'pro';
    
    const handleDeployment = () => {
        if (!isAvailable || status === 'locked') return;
        let path = isExplore ? (book.accessLevel === 'pro' ? `/general-viewer/${book.id}` : `/general-reader/${book.id}`) : `/ebook-reader/${book.id}`;
        
        // Pass mission parameters if entering in Mission Mode
        if (mission) {
            path += `?mode=mission&start=${mission.startChapter}&end=${mission.endChapter}`;
        } else {
            path += `?mode=library`;
        }
        
        navigate(path);
    };
    
    const showProBadge = isPro && !status && !isExplore;
    
    return (
        <div onClick={handleDeployment} className={`relative w-full aspect-[1/1.4] bg-gray-800 rounded-[2rem] border transition-all duration-500 overflow-hidden flex flex-col group ${status === 'locked' ? 'grayscale opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${isActive ? 'border-orange-500 shadow-[0_0_40px_rgba(234,88,12,0.25)] scale-[1.02] ring-2 ring-orange-500/50' : 'border-gray-700 hover:border-gray-500 shadow-xl'} ${!isAvailable ? 'grayscale opacity-75' : ''}`}>
            {status === 'locked' && <div className="absolute inset-0 z-40 bg-black/60 flex flex-col items-center justify-center p-6 text-center"><Lock size={40} className="text-gray-500 mb-2"/><p className="text-[10px] font-black text-white uppercase tracking-widest">Complete Backlog to Unlock</p></div>}
            {isActive && <div className="absolute inset-0 bg-orange-600/10 animate-pulse pointer-events-none z-10"></div>}
            {isCompleted && <MissionSeal />}
            <div className="absolute top-4 left-4 right-4 z-30 flex justify-between items-start pointer-events-none">
                <button onClick={(e) => { e.stopPropagation(); onInfoClick(book); }} className="bg-black/40 text-blue-400 p-2.5 rounded-full backdrop-blur-md shadow-lg hover:bg-blue-500 hover:text-white transition-all border border-blue-400/20 pointer-events-auto"><Info size={18} /></button>
                {showProBadge && <div className="bg-yellow-500 text-black px-3 py-1 rounded-full shadow-lg border border-yellow-400/50 flex items-center gap-1.5 animate-fade-in"><Crown size={10} fill="currentColor"/><span className="text-[8px] font-black uppercase tracking-widest">Pro Required</span></div>}
            </div>
            
            <img src={book.coverImageUrl} alt={book.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/20 to-transparent opacity-90"></div>
            <div className="absolute bottom-0 left-0 right-0 p-6 z-20 text-left">
                {book.ratingCount && book.ratingCount > 0 && <div className="flex items-center gap-1 mb-2 bg-black/40 w-fit px-2 py-0.5 rounded-full border border-white/5 backdrop-blur-sm"><Star size={10} className="text-yellow-400 fill-current" /><span className="text-[10px] font-black text-white">{book.averageRating?.toFixed(1)}</span></div>}
                <p className={`text-[9px] font-black uppercase tracking-[0.25em] mb-2 ${isActive ? 'text-orange-500 animate-pulse' : 'text-gray-400'}`}>{isActive ? 'Current Deployment' : isCompleted ? 'Mission Secured' : isExplore ? book.topic : 'Library Access'}</p>
                <h3 className="text-lg font-black text-white leading-tight mb-1 group-hover:text-orange-400 transition-colors drop-shadow-md line-clamp-2">{book.title}</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{book.subject}</p>
                
                {/* NEW TINY MISSION LABEL POSITION */}
                {mission && (
                    <div className="mt-2.5 flex items-center gap-1.5 bg-orange-600/20 px-2.5 py-1 rounded-lg border border-orange-500/20 w-fit animate-fade-in-up">
                        <Zap size={10} className="text-orange-500" fill="currentColor" />
                        <span className="text-[8px] font-black text-orange-400 uppercase tracking-[0.2em]">
                            {mission.label}
                        </span>
                    </div>
                )}
            </div>
            {!isAvailable && <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-center p-4 z-40"><WifiOff size={40} className="text-white opacity-80 mb-2" /><span className="text-[10px] font-black text-white uppercase tracking-widest">Connect Signal</span></div>}
        </div>
    );
};

const HorizontalScrollSection: React.FC<{ title: string, icon: any, children: React.ReactNode }> = ({ title, icon: Icon, children }) => (
    <div className="mb-10 animate-fade-in px-2">
        <div className="flex items-center gap-2 mb-4 px-2">
            <Icon size={18} className="text-orange-500" />
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">{title}</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 snap-x px-2">{children}</div>
    </div>
);

const StreakBanner: React.FC<{ streak: number; lastStudyDate: any }> = ({ streak, lastStudyDate }) => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const lastDateStr = useMemo(() => {
        if (!lastStudyDate) return null;
        try {
            if (typeof lastStudyDate === 'string') return new Date(lastStudyDate).toLocaleDateString('en-CA');
            if (lastStudyDate.toDate) return lastStudyDate.toDate().toLocaleDateString('en-CA');
            if (lastStudyDate.seconds) return new Date(lastStudyDate.seconds * 1000).toLocaleDateString('en-CA');
            return new Date(lastStudyDate).toLocaleDateString('en-CA');
        } catch (e) { return null; }
    }, [lastStudyDate]);
    const isCompletedToday = lastDateStr === todayStr;
    const currentHour = new Date().getHours();
    const isNightWarning = currentHour >= 21 && !isCompletedToday;
    const stage = getStreakStage(streak);
    return (
        <div className={`relative mb-8 rounded-[2.5rem] p-6 overflow-hidden border backdrop-blur-2xl transition-all duration-1000 shadow-2xl mx-2 ${isNightWarning ? 'bg-red-950/40 border-red-500 animate-pulse' : 'bg-gray-800/40 border-white/5'}`}>
            <div className={`absolute -top-12 -right-12 w-48 h-48 blur-[100px] opacity-20 pointer-events-none ${isNightWarning ? 'bg-red-600' : stage.bg}`}></div>
            <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-gray-900 border border-white/5 flex flex-col items-center justify-center shadow-inner relative">
                        {streak >= 3 && <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full animate-ping ${isNightWarning ? 'bg-red-500' : stage.bg}`}></div>}
                        <span className={`text-2xl font-black leading-none ${isNightWarning ? 'text-red-500' : stage.color}`}>{streak}</span>
                        <span className="text-[6px] font-black uppercase opacity-40">Days</span>
                    </div>
                    <div><h3 className="text-white font-black text-lg uppercase tracking-tighter leading-none mb-1">{streak} Day {stage.label} Streak</h3><p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{isNightWarning ? 'The flame is fading. Study now!' : 'Daily consistency builds power.'}</p></div>
                </div>
                <div className={`p-3 rounded-2xl ${isNightWarning ? 'bg-red-600' : 'bg-gray-900'} border border-white/5`}>{isNightWarning ? <AlertCircle size={28} className="text-white animate-bounce" /> : <Flame size={28} className={`${streak >= 3 ? `${stage.color} animate-pulse fill-current` : 'text-gray-700'}`} />}</div>
            </div>
        </div>
    );
};

const LibraryPage: React.FC<LibraryPageProps> = ({ user, userData }) => {
  const navigate = useNavigate();
  const [allEbooks, setAllEbooks] = useState<Ebook[]>([]);
  const [allExams, setAllExams] = useState<ExamQST[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRemapping, setIsRemapping] = useState(false);
  const [activeTab, setActiveTab] = useState<'books' | 'syllabus' | 'explore' | 'dictionary'>('books');
  const [selectedInfoBook, setSelectedInfoBook] = useState<Ebook | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [offlineBookIds, setOfflineBookIds] = useState<string[]>([]);
  const [exploreSearch, setExploreSearch] = useState('');
  const [exploreFilter, setExploreFilter] = useState<'newest' | 'trending' | 'top_rated'>('newest');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('eintk_dismissed_announcements');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Compliance Modal Logic
  const [showCompliance, setShowCompliance] = useState(false);

  const hostname = window.location.hostname;
  const productionURLs = ['eintk.com.ng', 'www.eintk.com.ng', 'eintk.vercel.app', 'eintk-ebooks.web.app', 'eintk-ebooks.firebaseapp.com'];
  const isProduction = productionURLs.includes(hostname);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
  const isProUser = userData?.subscriptionStatus === 'pro' || userData?.subscriptionStatus === 'day_pass';

  useEffect(() => {
    const handleStatus = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        let books: Ebook[] = [];
        
        // --- ADMIN/DEV BYPASS: If not production, load directly from Firestore ---
        if (!isProduction && navigator.onLine) {
            books = await getPublishedEbooks();
            setAllExams(await getPublishedExamQSTs());
        } else {
            // Standard User/Production Logic
            if (isStandalone) {
              books = await getAllOfflineBooks();
              if (books.length === 0 && navigator.onLine) books = await getPublishedEbooks();
            } else if (navigator.onLine) {
              books = await getPublishedEbooks();
              setAllExams(await getPublishedExamQSTs());
            } else {
              books = await getAllOfflineBooks();
            }
        }

        setAllEbooks(books);
        setOfflineBookIds(await getAllOfflineBookIds());
        if (navigator.onLine) setAnnouncements(await getRecentAnnouncements(3));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [isStandalone, isProduction]);

  // Check for compliance modal requirement
  useEffect(() => {
    if (userData?.studyPlan) {
        const hasAccepted = localStorage.getItem('eintk_compliance_accepted') === 'true';
        if (!hasAccepted) {
            setShowCompliance(true);
        }
    }
  }, [userData]);

  const activeAnnouncements = useMemo(() => announcements.filter(ann => !dismissedIds.includes(ann.id)), [announcements, dismissedIds]);
  const handleDismissAnnouncement = (id: string) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    localStorage.setItem('eintk_dismissed_announcements', JSON.stringify(updated));
  };

  const handleAcceptCompliance = () => {
      localStorage.setItem('eintk_compliance_accepted', 'true');
      setShowCompliance(false);
  };

  // --- AETHER MISSION LOGIC ---
  const todayStr = new Date().toLocaleDateString('en-CA');

  // MISSION BACKLOG: All books scheduled for DATE < TODAY that are not COMPLETED
  const backlogMissions = useMemo(() => {
    if (!userData?.studyPlan || allEbooks.length === 0) return [];
    
    // Choose correct schedule based on status
    const schedule = isProUser 
        ? userData.studyPlan.completeSchedule 
        : userData.studyPlan.summarySchedule;
        
    const pastMissions: { book: Ebook, mission: MissionResult }[] = [];
    const uniquePastMissions = new Set<string>();

    Object.keys(schedule).forEach(date => {
      if (date < todayStr) {
        schedule[date].forEach(mStr => {
          const res = resolveMissionToBook(mStr, allEbooks, userData.subscriptionStatus);
          if (res) {
              const bookId = res.book.id;
              const completedInBook = userData.completedChapters?.[bookId] || [];
              const isMissionComplete = completedInBook.includes(res.endChapter);
              
              if (!isMissionComplete) {
                  const missionKey = `${bookId}-${res.startChapter}-${res.endChapter}`;
                  if (!uniquePastMissions.has(missionKey)) {
                    pastMissions.push({ book: res.book, mission: res });
                    uniquePastMissions.add(missionKey);
                  }
              }
          }
        });
      }
    });
    return pastMissions;
  }, [userData?.studyPlan, allEbooks, userData?.completedBooks, userData?.completedChapters, todayStr, isProUser]);

  const todayMissions = useMemo(() => {
    if (!userData?.studyPlan || allEbooks.length === 0) return [];
    const schedule = isProUser 
        ? userData.studyPlan.completeSchedule 
        : userData.studyPlan.summarySchedule;
        
    const missionStrings = schedule[todayStr] || [];
    return missionStrings.map(mStr => resolveMissionToBook(mStr, allEbooks, userData.subscriptionStatus)).filter(res => res !== null) as MissionResult[];
  }, [userData?.studyPlan, allEbooks, todayStr, isProUser]);

  const isBacklogActive = backlogMissions.length > 0;

  // Check if missed for 3+ days
  const missedDaysCount = useMemo(() => {
    if (!userData?.studyPlan) return 0;
    const schedule = isProUser 
        ? userData.studyPlan.completeSchedule 
        : userData.studyPlan.summarySchedule;
        
    const missedDates = new Set<string>();
    Object.keys(schedule).forEach(date => {
      if (date < todayStr) {
        const anyUncompleted = schedule[date].some(mStr => {
          const res = resolveMissionToBook(mStr, allEbooks, userData.subscriptionStatus);
          if (!res) return false;
          const completedInBook = userData.completedChapters?.[res.book.id] || [];
          return !completedInBook.includes(res.endChapter);
        });
        if (anyUncompleted) missedDates.add(date);
      }
    });
    return missedDates.size;
  }, [userData?.studyPlan, allEbooks, todayStr, userData?.completedChapters, isProUser]);

  const handleRemap = async (mode: 'EXTEND' | 'SQUEEZE') => {
    if (!user || !userData?.studyPlan) return;
    setIsRemapping(true);
    try {
      const schedule = isProUser 
        ? userData.studyPlan.completeSchedule 
        : userData.studyPlan.summarySchedule;
        
      const allMissions = (Object.values(schedule) as string[][]).flat();
      const uncompletedMissionsStrings = allMissions.filter(mStr => {
        const res = resolveMissionToBook(mStr, allEbooks, userData.subscriptionStatus);
        if (!res) return false;
        const completedInBook = userData.completedChapters?.[res.book.id] || [];
        return !completedInBook.includes(res.endChapter);
      });

      const { schedule: newSchedule, newEndDate } = rescheduleRemainingMissions(
        uncompletedMissionsStrings as string[],
        mode,
        userData.studyPlan.endDate.toDate ? userData.studyPlan.endDate.toDate() : new Date(userData.studyPlan.endDate),
        userData.studyPlan.intensity,
        userData.studyPlan.excludeWeekends
      );

      const updatedPlan = {
        ...userData.studyPlan,
        [isProUser ? 'completeSchedule' : 'summarySchedule']: newSchedule,
        endDate: Timestamp.fromDate(newEndDate)
      };

      await updateUserStudyPlan(user.uid, updatedPlan);
      window.location.reload(); 
    } catch (e) {
      console.error(e);
      alert("Recalibration failed. Signal error.");
    } finally {
      setIsRemapping(false);
    }
  };

  const planSubjects = useMemo<string[]>(() => {
    const schedule = isProUser 
        ? userData?.studyPlan?.completeSchedule 
        : userData?.studyPlan?.summarySchedule;
        
    if (!schedule) return (userData?.subjectsOfInterest || []) as string[];
    const found = new Set<string>();
    Object.values(schedule).forEach((missions: string[]) => {
      missions.forEach((m: string) => {
        const s = m.split('|')[0];
        if (s) found.add(s);
      });
    });
    return Array.from(found);
  }, [userData, isProUser]);

  const studyDecks = useMemo(() => {
    const relevantIds = new Set([...backlogMissions.map(m => m.book.id), ...todayMissions.map(m => m.book.id)]);
    return allEbooks.filter(b => b.flashcards?.length && relevantIds.has(b.id)).map(b => ({
      id: b.id, title: b.title, coverImageUrl: b.coverImageUrl, cardCount: b.flashcards!.length, type: 'ebook' as const, accessLevel: b.accessLevel, subject: b.subject
    }));
  }, [allEbooks, backlogMissions, todayMissions]);

  const dailyProgress = useMemo(() => {
    if (todayMissions.length === 0) return { completed: 0, total: 0, percent: 0 };
    const completed = todayMissions.filter(res => {
        const completedInBook = userData?.completedChapters?.[res.book.id] || [];
        return completedInBook.includes(res.endChapter);
    }).length;
    return { completed, total: todayMissions.length, percent: Math.round((completed / todayMissions.length) * 100) };
  }, [todayMissions, userData?.completedChapters]);

  const filteredExplore = useMemo(() => {
    let base = allEbooks.filter(b => b.subject === 'General');
    if (exploreSearch) { const l = exploreSearch.toLowerCase(); base = base.filter(b => b.title.toLowerCase().includes(l) || b.topic.toLowerCase().includes(l)); }
    if (exploreFilter === 'newest') base.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    else if (exploreFilter === 'trending') base.sort((a, b) => (b.totalReads || 0) - (a.totalReads || 0));
    else if (exploreFilter === 'top_rated') base.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
    return base;
  }, [allEbooks, exploreSearch, exploreFilter]);

  const planLabel = useMemo(() => {
    if (!userData?.studyPlan) return 'HUB';
    const type = userData.studyPlan.type;
    if (type === 'jamb_pulse') return 'JAMB PULSE';
    if (type === 'waec_zenith') return 'WAEC ZENITH';
    if (type === 'nexus') return 'THE NEXUS';
    if (type === 'omni') return 'OMNISCIENCE';
    return 'CORE';
  }, [userData?.studyPlan]);

  return (
    <div className="pb-24 max-w-full overflow-x-hidden">
      <ConnectivityStatus isOffline={isOffline} isPro={isProUser} />
      <ComplianceModal isOpen={showCompliance} onClose={handleAcceptCompliance} />
      {user && userData && <StreakBanner streak={userData.currentStreak || 0} lastStudyDate={userData.lastStudyDate} />}

      {activeTab === 'books' && !loading && <AnnouncementBanner announcements={activeAnnouncements} onDismiss={handleDismissAnnouncement} />}

      <div className="flex justify-between items-center mb-6 px-4">
        <h1 className="text-4xl font-black bg-gradient-to-r from-orange-500 to-red-600 text-transparent bg-clip-text uppercase italic tracking-tighter">Aether {planLabel}</h1>
      </div>

      <div className="flex justify-around bg-gray-900/80 backdrop-blur rounded-2xl p-2 mb-8 border border-gray-700 sticky top-4 z-[45] shadow-2xl mx-4">
        <button onClick={() => setActiveTab('books')} className={`p-3 rounded-xl transition-all duration-300 ${activeTab === 'books' ? 'bg-orange-600 text-white shadow-lg scale-110' : 'text-gray-400 hover:bg-gray-800'}`} title="Daily Mission"><Target size={24} /></button>
        <button onClick={() => setActiveTab('syllabus')} className={`p-3 rounded-xl transition-all duration-300 ${activeTab === 'syllabus' ? 'bg-orange-600 text-white shadow-lg scale-110' : 'text-gray-400 hover:bg-gray-800'}`} title="Syllabus Tracker"><GraduationCap size={24} /></button>
        <button onClick={() => setActiveTab('explore')} className={`p-3 rounded-xl transition-all duration-300 ${activeTab === 'explore' ? 'bg-gradient-to-tr from-pink-500 to-orange-500 text-white shadow-lg scale-110' : 'text-gray-400 hover:bg-gray-800'}`} title="Explore Feed"><Compass size={24} /></button>
        <button onClick={() => setActiveTab('dictionary')} className={`p-3 rounded-xl transition-all duration-300 ${activeTab === 'dictionary' ? 'bg-orange-600 text-white shadow-lg scale-110' : 'text-gray-400 hover:bg-gray-800'}`} title="Dictionary"><BookA size={24} /></button>
      </div>

      {activeTab === 'books' && (
        <div className="animate-fade-in space-y-4">

          {/* 1. RESUME MISSION (Strict Backlog) */}
          {isBacklogActive && (
            <HorizontalScrollSection title="Backlog: Unfinished Missions" icon={RotateCcw}>
              {backlogMissions.map(m => {
                const book = m.book;
                const p = userData?.readingProgress?.[book.id];
                const pct = p ? (p.currentPage / p.totalPages) * 100 : 0;
                return (
                  <div key={`${book.id}-${m.mission.startChapter}`} className="w-48 snap-start shrink-0">
                    <VerticalBookCard
                        book={book} mission={m.mission} status="active" isOffline={isOffline}
                        isDownloaded={offlineBookIds.includes(book.id)} onInfoClick={setSelectedInfoBook}
                    />
                  </div>
                );
              })}
            </HorizontalScrollSection>
          )}

          {/* 2. REMAP ADAPTIVE PROTOCOL (Missed 3+ days) */}
          {missedDaysCount >= 3 && (
            <div className="mx-4 p-8 bg-orange-950/20 backdrop-blur-xl rounded-[2.5rem] border border-orange-500/20 shadow-2xl relative overflow-hidden group mb-8">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                <Activity size={140} className="text-orange-500" />
              </div>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.8)]"></div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Aether Recalibration</h3>
              </div>

              <p className="text-sm text-gray-300 leading-relaxed mb-10 max-w-md">
                System drift detected: <strong>{missedDaysCount} missions missed</strong>. Realign your timeline to maintain operational efficiency.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                <button
                  onClick={() => handleRemap('EXTEND')}
                  disabled={isRemapping}
                  className="flex flex-col items-center justify-center p-6 bg-gray-900/60 hover:bg-orange-600/20 rounded-3xl border border-orange-500/20 group/btn transition-all active:scale-95"
                >
                  {isRemapping ? <Loader2 className="animate-spin mb-3 text-orange-500" /> : <CalendarPlus className="mb-3 text-orange-500 group-hover/btn:scale-110 transition-transform" size={32} />}
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Time Dilation</span>
                  <span className="text-[9px] text-gray-500 group-hover/btn:text-orange-300 mt-1 uppercase font-bold">Shift Deadline</span>
                </button>

                <button
                  onClick={() => handleRemap('SQUEEZE')}
                  disabled={isRemapping}
                  className="flex flex-col items-center justify-center p-6 bg-gray-900/60 hover:bg-orange-600 rounded-3xl border border-orange-500/40 group/btn transition-all active:scale-95 shadow-xl"
                >
                  {isRemapping ? <Loader2 className="animate-spin mb-3 text-white" /> : <Zap className="mb-3 text-white group-hover/btn:scale-110 transition-transform fill-current" size={32} />}
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Compression</span>
                  <span className="text-[9px] text-orange-200 group-hover/btn:text-white mt-1 uppercase font-bold">Crunch Remaining</span>
                </button>
              </div>
            </div>
          )}

          {studyDecks.length > 0 && (
            <HorizontalScrollSection title="Subject Mastery Decks" icon={Layers}>
              {studyDecks.slice(0, 12).map(deck => (
                <Link key={deck.id} to={`/study-session/ebook/${deck.id}`} className="block w-40 snap-start bg-gray-800 rounded-3xl border border-white/5 overflow-hidden shrink-0 group shadow-lg">
                  <div className="aspect-square relative"><img src={deck.coverImageUrl} className="w-full h-full object-cover" alt={deck.title} /><div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors"></div><div className="absolute bottom-2 left-2 bg-orange-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg">{deck.cardCount} Cards</div></div>
                  <div className="p-3"><p className="text-white text-[10px] font-bold truncate leading-tight">{deck.title}</p><p className="text-gray-500 text-[8px] font-black uppercase tracking-widest mt-1">{deck.subject}</p></div>
                </Link>
              ))}
            </HorizontalScrollSection>
          )}

          <div className="bg-gray-800 p-6 rounded-[2.5rem] border border-gray-700 shadow-xl mx-4 mb-8">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-black text-white uppercase tracking-tighter">Daily Mission</h2>
              <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${isBacklogActive ? 'bg-red-950/30 text-red-500 border-red-500/20' : 'bg-orange-950/30 text-orange-500 border-orange-500/20'}`}>
                {isBacklogActive ? 'Path Obstructed' : `${dailyProgress.completed}/${dailyProgress.total} Secured`}
              </span>
            </div>
            <div className="h-3 w-full bg-gray-900 rounded-full overflow-hidden border border-white/5">
              <div className="h-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(234,88,12,0.5)]" style={{ width: `${dailyProgress.percent}%` }}></div>
            </div>
            {isBacklogActive && <p className="text-[9px] text-red-400 font-bold uppercase tracking-widest mt-3 flex items-center gap-1.5"><AlertCircle size={10} /> Clear the backlog to unlock today's missions.</p>}
          </div>

          <div className="relative space-y-6 pb-10 px-4">
            {loading ? (
              Array(2).fill(0).map((_, i) => <div key={i} className="aspect-[1/1.4] w-full bg-gray-800 rounded-[2rem] animate-pulse"></div>)
            ) : todayMissions.length > 0 ? (
              todayMissions.map((res, index) => {
                const book = res.book;
                const completedInBook = userData?.completedChapters?.[book.id] || [];
                const isCompleted = completedInBook.includes(res.endChapter);
                const isPreviousUnfinished = isBacklogActive || (!isCompleted && index > 0 && !((userData?.completedChapters?.[todayMissions[index - 1]?.book.id] || []).includes(todayMissions[index - 1]?.endChapter)));

                let status: 'completed' | 'active' | 'locked' = isCompleted ? 'completed' : isPreviousUnfinished ? 'locked' : 'active';

                return (
                  <React.Fragment key={`${book.id}-${res.startChapter}`}>
                    {index > 0 && (
                      <div className="flex justify-center items-center py-2 animate-pulse">
                        <div className="bg-gray-800 p-2 rounded-full border border-gray-700">
                          {status === 'locked' ? <Swords size={16} className="text-gray-600" /> : <ChevronDown size={16} className="text-orange-500" />}
                        </div>
                      </div>
                    )}
                    <VerticalBookCard
                      book={book} mission={res} status={status} isOffline={isOffline}
                      isDownloaded={offlineBookIds.includes(book.id)} onInfoClick={setSelectedInfoBook}
                    />
                  </React.Fragment>
                );
              })
            ) : (
              <div className="text-center py-20 bg-gray-800/50 rounded-[3rem] border-2 border-dashed border-gray-700">
                <Ghost className="mx-auto text-gray-700 mb-4" size={64} />
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Missions Perfected</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'explore' && (
        <div className="animate-fade-in space-y-8 px-4 pb-20">
          <div className="space-y-4 pt-2">
            <div className="relative">
              <input type="text" value={exploreSearch} onChange={(e) => setExploreSearch(e.target.value)} placeholder="Search curiosity..." className="w-full bg-gray-800 border border-gray-700 rounded-3xl py-5 pl-14 pr-6 text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50 shadow-lg text-sm" />
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={24} />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 px-4 -mx-4">
              {[
                { id: 'newest', label: 'Newest', icon: Sparkles },
                { id: 'trending', label: 'Trending', icon: TrendingUp },
                { id: 'top_rated', label: 'Top Rated', icon: Star }
              ].map(btn => (
                <button key={btn.id} onClick={() => setExploreFilter(btn.id as any)} className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2 whitespace-nowrap ${exploreFilter === btn.id ? 'bg-pink-600 text-white border-pink-500 shadow-lg scale-105' : 'bg-gray-800 text-gray-500 border-gray-700 hover:border-gray-500'}`}>
                  <btn.icon size={12} /> {btn.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {loading ? Array(4).fill(0).map((_, i) => <div key={i} className="aspect-[1/1.4] bg-gray-800 rounded-[2rem] animate-pulse"></div>) : filteredExplore.map((book, idx) => <VerticalBookCard key={book.id} book={book} isExplore isOffline={isOffline} isDownloaded={offlineBookIds.includes(book.id)} onInfoClick={setSelectedInfoBook} />)}
            {!loading && filteredExplore.length === 0 && <RequestBookCard user={user} userData={userData} />}
          </div>
        </div>
      )}

      {activeTab === 'syllabus' && userData && (
        <div className="px-4">
          <SyllabusTracker userData={userData} user={user} allEbooks={allEbooks} allExams={allExams} offlineBookIds={offlineBookIds} offlineExamIds={[]} refreshOfflineStatus={async () => { }} />
        </div>
      )}

      {activeTab === 'dictionary' && <div className="px-4 mt-4"><DictionaryPage user={user} userData={userData} /></div>}
      {selectedInfoBook && <BookInfoModal book={selectedInfoBook} onClose={() => setSelectedInfoBook(null)} />}
    </div>
  );
};

const BookInfoModal: React.FC<{ book: Ebook, onClose: () => void }> = ({ book, onClose }) => {
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = 'unset'; }; }, []);
  const isPro = book.accessLevel === 'pro';
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="relative bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up border border-gray-700 flex flex-col" style={{ maxHeight: '80vh' }}>
        <div className="relative h-40 shrink-0 overflow-hidden">
          <img src={book.coverImageUrl} className="absolute inset-0 w-full h-full object-cover opacity-40 blur-lg" alt="blur" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900"></div>
          <button onClick={onClose} className="absolute top-5 right-5 bg-gray-800/80 hover:bg-gray-700 text-white p-2.5 rounded-full border border-white/5 shadow-xl transition-all z-10"><X size={24} /></button>
        </div>
        <div className="px-8 pb-8 -mt-16 relative z-10 overflow-y-auto custom-scrollbar flex-grow">
          <div className="flex gap-6 mb-8 items-end">
            <img src={book.coverImageUrl} alt={book.title} className="w-32 h-32 rounded-3xl shadow-2xl object-cover border-4 border-gray-800 shrink-0" />
            <div className="pb-2 pt-4">
              <h2 className="text-2xl font-black text-white leading-tight mb-3 uppercase tracking-tighter italic">{book.title}</h2>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-lg ${isPro ? 'bg-yellow-500 text-black border-yellow-400' : 'bg-green-600/20 text-green-400 border-green-500/30'}`}>{isPro ? <Crown size={12} className="mr-1.5" /> : null}{isPro ? 'Pro Access' : 'Free Deployment'}</span>
            </div>
          </div>
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800/50 p-4 rounded-2xl border border-white/5"><p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1.5 flex items-center"><Tag size={12} className="mr-1.5 text-orange-500" /> Subject</p><p className="text-sm font-bold text-gray-200 truncate">{book.subject}</p></div>
              <div className="bg-gray-800/50 p-4 rounded-2xl border border-white/5"><p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1.5 flex items-center"><BookOpen size={12} className="mr-1.5 text-blue-500" /> Modules</p><p className="text-sm font-bold text-gray-200">{book.chapters?.length || 0} Blocks</p></div>
            </div>
            <div><h3 className="text-xs font-black text-orange-500 uppercase tracking-[0.3em] mb-4">Tactical Topic</h3><p className="text-gray-300 text-sm leading-relaxed bg-gray-800/40 p-5 rounded-2xl border border-white/5 shadow-inner italic">"{book.topic}"</p></div>
            <div>
              <h3 className="text-xs font-black text-blue-500 uppercase tracking-[0.3em] mb-4 flex items-center"><List size={16} className="mr-2" /> Knowledge Blocks</h3>
              <div className="space-y-2.5">{book.tableOfContents?.map((item, idx) => (
                <div key={idx} className="flex items-center p-4 rounded-2xl bg-gray-800/40 border border-white/5 group hover:bg-gray-800 transition-colors"><span className="text-[10px] font-black text-gray-600 mr-4 w-5">{(idx + 1).toString().padStart(2, '0')}</span><span className="text-sm font-bold text-gray-400 group-hover:text-white transition-colors">{item.title}</span></div>
              ))}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SyllabusTracker: React.FC<SyllabusTrackerProps> = ({ userData, user, allEbooks, allExams, offlineBookIds, refreshOfflineStatus }) => {
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [completedTopics, setCompletedTopics] = useState<string[]>(userData.completedSyllabusTopics || []);
  const isProUser = userData?.subscriptionStatus === 'pro' || userData?.subscriptionStatus === 'day_pass';
  
  const toggleSubtopic = async (topicId: string) => {
    if (!user) return;
    const isCompleted = completedTopics.includes(topicId);
    const newCompleted = isCompleted ? completedTopics.filter(id => id !== topicId) : [...completedTopics, topicId];
    setCompletedTopics(newCompleted);
    await toggleSyllabusTopic(user.uid, topicId);
  };
  
  const planSubjects = useMemo<string[]>(() => {
    const schedule = isProUser 
        ? userData?.studyPlan?.completeSchedule 
        : userData?.studyPlan?.summarySchedule;
        
    if (!schedule) return (userData?.subjectsOfInterest || []) as string[];
    const found = new Set<string>();
    Object.values(schedule).forEach((missions: string[]) => {
      missions.forEach((m: string) => {
        const s = m.split('|')[0];
        if (s) found.add(s);
      });
    });
    return Array.from(found);
  }, [userData, isProUser]);

  const filteredSyllabus = useMemo(() => {
    if (planSubjects.length === 0) return SYLLABUS_DATA as Record<string, SyllabusItem[]>;
    const filtered: Record<string, SyllabusItem[]> = {};
    Object.entries(SYLLABUS_DATA).forEach(([subject, categories]) => { if (planSubjects.includes(subject)) filtered[subject] = categories as SyllabusItem[]; });
    return filtered;
  }, [planSubjects]);

  return (
    <div className="space-y-6 animate-fade-in w-full max-w-md mx-auto">
      <div className="bg-gray-800 p-5 rounded-[2.5rem] border border-gray-700 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none rotate-12"><GraduationCap size={80} /></div>
        <h2 className="text-xl font-black text-orange-500 mb-1 flex items-center uppercase tracking-tighter italic">Syllabus Tracker</h2>
        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-6 px-1">Curriculum Mastery Hub</p>
        <div className="space-y-3">
          {Object.entries(filteredSyllabus).map(([subject, categories]) => {
            const items = categories as SyllabusItem[];
            const isSubjectExpanded = expandedSubject === subject;
            
            let totalSubCount = 0, compSubCount = 0;
            items.forEach(cat => {
              if (cat.subtopics) {
                totalSubCount += cat.subtopics.length;
                cat.subtopics.forEach(sub => {
                  const id = `${cat.topic}::${sub}`;
                  // Gradually calculate completion based on book and chapters
                  const targetBook = allEbooks.find(b => b.topic === sub && b.subject === subject);
                  const completedInBook = targetBook ? (userData.completedChapters?.[targetBook.id] || []) : [];
                  const isBookComp = targetBook && completedInBook.length > 0;
                  
                  if (completedTopics.includes(id) || isBookComp) compSubCount++;
                });
              }
            });
            
            const progress = totalSubCount > 0 ? Math.round((compSubCount / totalSubCount) * 100) : 0;
            
            return (
              <div key={subject} className={`bg-gray-900 rounded-3xl border overflow-hidden transition-all duration-500 w-full ${isSubjectExpanded ? 'border-orange-500/40' : 'border-white/5'}`}>
                <button onClick={() => setExpandedSubject(isSubjectExpanded ? null : subject)} className="w-full p-4 flex items-center justify-between hover:bg-gray-800 transition-colors">
                  <div className="text-left"><h3 className="font-black text-white text-sm tracking-tight leading-none mb-1">{subject}</h3><p className="text-[8px] text-gray-500 font-black uppercase tracking-widest">{compSubCount}/{totalSubCount} Topics</p></div>
                  <div className="flex items-center space-x-3"><CircularProgress percentage={progress} size={32} strokeWidth={4} /><div className={`p-1.5 rounded-full bg-gray-800 transition-transform ${isSubjectExpanded ? 'rotate-180 text-orange-500' : 'text-gray-600'}`}><ChevronUp size={16} /></div></div>
                </button>
                {isSubjectExpanded && (
                  <div className="border-t border-white/5 bg-black/20 pb-2 animate-fade-in">
                    {items.map(category => {
                      const isCategoryExpanded = expandedCategory === category.id;
                      const subtopics = category.subtopics || [];
                      return (
                        <div key={category.id} className="border-b border-white/5 last:border-0 px-2">
                          <button onClick={() => setExpandedCategory(isCategoryExpanded ? null : category.id)} className="w-full flex justify-between items-center py-3 px-4 hover:bg-white/5 rounded-xl group transition-all"><span className="text-xs font-bold text-gray-500 group-hover:text-gray-300">{category.topic}</span><div className={`p-1 transition-transform ${isCategoryExpanded ? 'rotate-180 text-orange-500' : 'text-gray-600'}`}><ChevronUp size={12} /></div></button>
                          {isCategoryExpanded && (
                            <div className="bg-black/10 rounded-2xl p-2 mb-2 space-y-2 animate-fade-in-up">
                              {subtopics.map(subtopic => {
                                const id = `${category.topic}::${subtopic}`;
                                const targetBook = allEbooks.find(b => b.topic === subtopic && b.subject === subject);
                                const completedInBook = targetBook ? (userData.completedChapters?.[targetBook.id] || []) : [];
                                
                                const isChecked = completedTopics.includes(id) || completedInBook.length > 0;
                                const hasAccess = targetBook && (targetBook.accessLevel === 'free' || isProUser);
                                
                                // Calculate chapter-based progress percentage for this specific subtopic (book)
                                const chCount = targetBook?.chapters?.length || 1;
                                const chProgress = targetBook ? Math.round((completedInBook.length / chCount) * 100) : 0;

                                return (
                                  <div key={subtopic} className="flex flex-col p-3 rounded-2xl bg-gray-800/80 border border-white/5 shadow-md group">
                                    <div className="flex justify-between items-start mb-3">
                                        <div onClick={() => toggleSubtopic(id)} className="flex items-start space-x-3 cursor-pointer">
                                          <div className={`mt-0.5 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 ${isChecked ? 'bg-green-600 border-green-500 shadow-[0_0_10px_rgba(22,163,74,0.3)]' : 'bg-gray-900 border-gray-700 group-hover:border-gray-500'}`}><Check size={12} className={isChecked ? 'text-white' : 'hidden'} /></div>
                                          <span className={`text-[10px] font-black leading-tight transition-all uppercase tracking-tight ${isChecked ? 'text-gray-600 line-through' : 'text-gray-200'}`}>{subtopic}</span>
                                        </div>
                                        {targetBook && (
                                            <div className="shrink-0 scale-75 origin-right">
                                                <CircularProgress percentage={chProgress} size={24} strokeWidth={3} color="#10b981" />
                                            </div>
                                        )}
                                    </div>
                                    {targetBook && (
                                        <Link to={hasAccess ? `/ebook-reader/${targetBook.id}?mode=library` : `/ebook-viewer/${targetBook.id}`} className={`w-full py-2.5 rounded-xl font-black uppercase text-[9px] tracking-[0.2em] transition-all flex items-center justify-center shadow-lg border-2 ${hasAccess ? 'bg-orange-600 border-orange-500 text-white hover:bg-orange-700' : 'bg-gray-900 border-gray-700 text-gray-500 opacity-60'}`}>
                                            Deploy Chapter {!hasAccess && <Lock size={9} className="ml-2" />}
                                        </Link>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LibraryPage;
