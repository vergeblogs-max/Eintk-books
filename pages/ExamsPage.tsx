import React, { useState, useEffect, useMemo } from 'react';
import type { User } from 'firebase/auth';
import type { UserData, ExamQST, Ebook } from '../types';
import { getPublishedExamQSTs, getPublishedEbooks, subscribeToExamDates } from '../services/firestoreService';
import { getAllOfflineExamIds, searchOfflineExams, saveLocalSetting, getLocalSetting } from '../services/offlineService';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
// Added BarChart3 to imports to fix error on line 481
import { Search, Crown, FileQuestion, ChartColumn, BookCheck, Clock, Award as AwardIcon, Filter, ChevronDown, ChevronUp, Info, X, Tag, List, HelpCircle, Layers, MonitorPlay, Gamepad2, Timer, Sparkles, Loader2, BarChart3 } from 'lucide-react';
import { calculateEarnedBadges } from '../utils/badgeUtils';
import { ALL_BADGES } from '../badges';
import * as LucideIcons from 'lucide-react';
import { shuffleArray } from '../utils/shuffle';
import { DEPARTMENTS, NIGERIAN_CURRICULUM_SUBJECTS, SUBJECT_TO_DEPARTMENT_MAP } from '../constants';
import StudentReportCard from '../components/StudentReportCard';
import CircularProgress from '../components/CircularProgress';
import { ConnectivityStatus } from './LibraryPage';

interface ExamsPageProps {
  user: User | null;
  userData: UserData | null;
}

// --- EXAM COUNTDOWN ---
const ExamCountdown: React.FC = () => {
    const [exams, setExams] = useState<{ name: string; date: Date }[]>([]);
    const [loading, setLoading] = useState(true);
    const TARGET_EXAMS = ["JAMB", "WAEC", "NECO"];

    useEffect(() => {
        // Initial Local Load
        const loadLocal = async () => {
            const cached = await getLocalSetting('exam_dates');
            if (cached && Array.isArray(cached)) {
                setExams(cached.map(d => ({ name: d.name, date: new Date(d.date) })));
                setLoading(false);
            }
        };
        loadLocal();

        const unsubscribe = subscribeToExamDates((dates) => {
            if (dates && dates.length > 0) {
                const parsedDates = dates.map(d => ({
                    name: d.name,
                    date: new Date(d.date)
                }));
                setExams(parsedDates);
                // Save for offline use
                saveLocalSetting('exam_dates', dates);
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const calculateDaysLeft = (targetDate: Date) => {
        const now = new Date();
        const diffTime = targetDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
        return diffDays > 0 ? diffDays : 0;
    };

    return (
        <div className="grid grid-cols-3 gap-2 mb-6 animate-fade-in">
            {loading ? (
                TARGET_EXAMS.map(name => (
                    <div key={name} className="bg-gray-800 border border-gray-700 rounded-lg p-2 text-center shadow-md flex flex-col items-center justify-center min-h-[80px]">
                        <p className="text-[9px] text-gray-400 uppercase font-bold tracking-widest mb-2">{name}</p>
                        <Loader2 className="animate-spin text-orange-500" size={24} />
                    </div>
                ))
            ) : (
                exams.length > 0 ? exams.map(exam => (
                    <div key={exam.name} className="bg-gray-800 border border-gray-700 rounded-lg p-2 text-center shadow-md transform hover:scale-105 transition-transform">
                        <p className="text-[9px] text-gray-400 uppercase font-bold tracking-widest">{exam.name}</p>
                        <p className="text-xl font-black text-orange-500 my-0.5">{calculateDaysLeft(exam.date)}</p>
                        <p className="text-[10px] text-gray-500 font-bold">Days Left</p>
                    </div>
                )) : (
                    TARGET_EXAMS.map(name => (
                        <div key={name} className="bg-gray-800 border border-gray-700 rounded-lg p-2 text-center shadow-md min-h-[80px] flex flex-col justify-center">
                            <p className="text-[9px] text-gray-400 uppercase font-bold tracking-widest">{name}</p>
                            <p className="text-xs text-gray-500 mt-1">Date TBA</p>
                        </div>
                    ))
                )
            )}
        </div>
    );
};

// --- SKELETON COMPONENTS ---
const SkeletonExamCard = () => (
    <div className="bg-gray-800 rounded-lg overflow-hidden flex flex-col h-full border border-gray-700">
        <div className="w-full aspect-square animate-shimmer"></div>
        <div className="p-4 space-y-3 flex-grow">
            <div className="h-4 bg-gray-700 rounded w-3/4 animate-shimmer"></div>
            <div className="h-3 bg-gray-700 rounded w-1/2 animate-shimmer"></div>
            <div className="h-8 bg-gray-700 rounded w-full mt-auto animate-shimmer"></div>
        </div>
    </div>
);

const SkeletonContinueExam = () => (
    <div className="flex-shrink-0 w-56 bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
        <div className="h-28 animate-shimmer"></div>
        <div className="p-3 space-y-2">
            <div className="h-3 bg-gray-700 rounded w-3/4 animate-shimmer"></div>
            <div className="h-2 bg-gray-700 rounded w-1/2 animate-shimmer"></div>
        </div>
    </div>
);

// --- EXAM INFO MODAL ---
const ExamInfoModal: React.FC<{ exam: ExamQST, onClose: () => void }> = ({ exam, onClose }) => {
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    const isPro = exam.accessLevel === 'pro';
    const qType = exam.questions.length > 0 ? exam.questions[0].type : 'Mixed';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            
            <div className="relative bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up border border-gray-700 flex flex-col" style={{ maxHeight: '70vh' }}>
                
                <div className="relative h-32 shrink-0 overflow-hidden">
                    <img src={exam.coverImageUrl} className="absolute inset-0 w-full h-full object-cover opacity-30 blur-md" alt="Background" />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900"></div>
                    <button onClick={onClose} className="absolute top-3 right-3 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-md transition-colors z-10">
                        <X size={20} />
                    </button>
                </div>

                <div className="px-6 pb-6 -mt-12 relative z-10 overflow-y-auto custom-scrollbar flex-grow">
                    <div className="flex gap-4 mb-6 items-end">
                        <img src={exam.coverImageUrl} alt={exam.title} className="w-24 h-24 rounded-lg shadow-lg object-cover border-2 border-gray-700 shrink-0" />
                        <div className="pb-1 pt-4">
                            <h2 className="text-xl font-bold text-white leading-tight mb-2">{exam.title}</h2>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${isPro ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/50' : 'bg-green-500/10 text-green-500 border-green-500/50'}`}>
                                {isPro ? <Crown size={10} className="mr-1"/> : null}
                                {isPro ? 'Pro Exam' : 'Free Exam'}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                                <p className="text-xs text-gray-400 flex items-center mb-1"><Tag size={12} className="mr-1"/> Subject</p>
                                <p className="text-sm font-semibold text-gray-200 truncate">{exam.subject}</p>
                            </div>
                            <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                                <p className="text-xs text-gray-400 flex items-center mb-1"><HelpCircle size={12} className="mr-1"/> Questions</p>
                                <p className="text-sm font-semibold text-gray-200">{exam.questions.length} Items</p>
                            </div>
                            <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                                <p className="text-xs text-gray-400 flex items-center mb-1"><Layers size={12} className="mr-1"/> Difficulty</p>
                                <p className="text-sm font-semibold text-gray-200">{exam.difficulty || 'Standard'}</p>
                            </div>
                            <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                                <p className="text-xs text-gray-400 flex items-center mb-1"><List size={12} className="mr-1"/> Format</p>
                                <p className="text-sm font-semibold text-gray-200">{qType}</p>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-bold text-orange-500 uppercase tracking-wide mb-2">Topic Focus</h3>
                            <p className="text-gray-300 text-sm leading-relaxed bg-gray-800 p-3 rounded-lg border border-gray-700">
                                {exam.topic}
                            </p>
                        </div>
                        
                        <div className="flex justify-between items-center text-gray-500 text-xs">
                            <span>ID: {exam.id.slice(0,8)}</span>
                            {exam.createdAt && <span>Added: {new Date(exam.createdAt.seconds * 1000).toLocaleDateString()}</span>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ExamCard: React.FC<{ exam: ExamQST, isProUser: boolean, onInfoClick: (exam: ExamQST) => void }> = ({ exam, isProUser, onInfoClick }) => {
    const isFreeContent = exam.accessLevel === 'free' || !exam.accessLevel;
    const hasAccess = isFreeContent || isProUser;

    const linkDestination = hasAccess ? `/exam-qst-reader/${exam.id}` : `/exam-qst-viewer/${exam.id}`;
    const buttonText = hasAccess ? "Start Test" : "Preview";

    return (
        <div className="relative bg-gray-800 rounded-lg shadow-lg overflow-hidden group transform hover:scale-105 transition-transform duration-300 flex flex-col h-full">
            
            <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onInfoClick(exam); }}
                className="absolute top-2 left-2 z-30 bg-black/40 text-blue-400 p-1.5 rounded-full backdrop-blur-md shadow-lg hover:bg-blue-500 hover:text-white transition-all"
                title="Exam Info"
            >
                <Info size={18} />
            </button>

            <Link to={linkDestination} className="flex flex-col flex-grow">
                <div className="relative">
                    <img src={exam.coverImageUrl} alt={exam.title} className="w-full aspect-square object-cover" />
                    {!hasAccess && (
                         <div className="absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-500">
                             <div className="bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-full flex items-center">
                                <Crown size={12} className="mr-1"/> PRO
                             </div>
                         </div>
                    )}
                </div>
                <div className="p-4 flex-grow flex flex-col">
                    <h3 className="text-md font-bold truncate text-white" title={exam.title}>{exam.title}</h3>
                    <p className="text-sm text-gray-400 flex-grow truncate">{exam.subject}</p>
                    <div className="mt-4">
                        <span className={`w-full text-center font-bold py-2 px-4 rounded-lg transition-colors duration-300 block ${hasAccess ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
                            {buttonText}
                        </span>
                    </div>
                </div>
            </Link>
        </div>
    );
};

const AnalyticsTab: React.FC<{ userData: UserData, isProUser: boolean, user: User | null }> = ({ userData, isProUser, user }) => {
    const [allEbooks, setAllEbooks] = useState<Ebook[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getPublishedEbooks().then(books => {
            setAllEbooks(books);
            setLoading(false);
        });
    }, []);

    const earnedBadges = useMemo(() => {
        if (loading) return [];
        return calculateEarnedBadges(userData, allEbooks);
    }, [userData, allEbooks, loading]);

    const formatTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    };

    if (loading) return <div className="flex justify-center p-8"><LoadingSpinner /></div>;

    const StatCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) => (
        <div className="bg-gray-800 p-6 rounded-lg flex items-center space-x-4">
            <div className="p-3 bg-orange-900/50 rounded-full">{icon}</div>
            <div>
                <div className="text-3xl font-bold">{value}</div>
                <div className="text-sm text-gray-400">{label}</div>
            </div>
        </div>
    );

    return (
        <div className="space-y-8">
             <div className="mb-8">
                <StudentReportCard userData={userData} />
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard icon={<FileQuestion className="text-orange-400" size={24} />} label="Tests Completed" value={userData.completedExamQSTs?.length || 0} />
                <StatCard icon={<BookCheck className="text-orange-400" size={24} />} label="Books Read" value={userData.completedBooks?.length || 0} />
                <StatCard icon={<Clock className="text-orange-400" size={24} />} label="Total Reading Time" value={formatTime(userData.totalReadingTime || 0)} />
            </div>

            <div>
                <div className="flex justify-between items-end mb-4">
                    <h2 className="text-2xl font-bold text-orange-500">Earned Badges ({earnedBadges.length})</h2>
                    <Link to="/badges" className="text-xs text-orange-400 hover:underline font-semibold">View All</Link>
                </div>
                
                <div className="grid grid-rows-2 grid-flow-col auto-cols-max gap-3 overflow-x-auto pb-4 custom-scrollbar snap-x">
                    {earnedBadges.length > 0 ? earnedBadges.map(badge => {
                         const IconComponent = LucideIcons[badge.icon as keyof typeof LucideIcons] as React.ElementType || AwardIcon;
                        return (
                             <div key={badge.id} className="snap-start w-48 bg-gray-800 p-3 rounded-lg flex items-center space-x-3 border border-gray-700 shadow-sm" title={badge.description}>
                                <div className="p-2 bg-yellow-500/20 text-yellow-500 rounded-full shrink-0"><IconComponent size={20} /></div>
                                <div className="min-w-0">
                                    <p className="font-bold text-sm text-white truncate">{badge.name}</p>
                                    <p className="text-xs text-gray-400 truncate">Unlocked</p>
                                </div>
                             </div>
                        )
                    }) : (
                        <div className="col-span-full text-gray-500 text-sm italic p-4">Complete activities to earn badges!</div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ExamsPage: React.FC<ExamsPageProps> = ({ user, userData }) => {
    const [allExams, setAllExams] = useState<ExamQST[]>([]);
    const [sortedExams, setSortedExams] = useState<ExamQST[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ searchTerm: '', department: 'All', subject: 'All', difficulty: 'All' });
    const [activeTab, setActiveTab] = useState<'exams' | 'analytics'>('exams');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedInfoExam, setSelectedInfoExam] = useState<ExamQST | null>(null);
    const [isSearchingDB, setIsSearchingDB] = useState(false);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    const isProUser = userData?.subscriptionStatus === 'pro' || userData?.subscriptionStatus === 'day_pass';

    useEffect(() => {
        const handleStatusChange = () => setIsOffline(!navigator.onLine);
        window.addEventListener('online', handleStatusChange);
        window.addEventListener('offline', handleStatusChange);
        return () => {
            window.removeEventListener('online', handleStatusChange);
            window.removeEventListener('offline', handleStatusChange);
        };
    }, []);

    useEffect(() => {
        const fetchExams = async () => {
            setLoading(true);
            try {
                // PHASE 3: Local-first exam loading
                const exams = await getPublishedExamQSTs();
                setAllExams(exams);
                setLoading(false);
            } catch (err) {
                console.error("Failed to load exams:", err);
                setLoading(false);
            }
        };
        fetchExams();
    }, []);

    // Extract subjects from study plan schedule
    const planSubjects = useMemo(() => {
        const schedule = userData?.studyPlan?.generatedSchedule;
        if (!schedule) return [];
        
        const found = new Set<string>();
        Object.values(schedule).forEach((missions: any) => {
            missions.forEach((m: string) => {
                const s = m.split('|')[0];
                if (s) found.add(s);
            });
        });
        return Array.from(found);
    }, [userData?.studyPlan]);

    const planSubjectsHash = JSON.stringify(planSubjects);

    useEffect(() => {
        if (allExams.length === 0) return;
        
        // Filter by study plan subjects only
        let relevantExams: ExamQST[] = [];
        if (planSubjects.length > 0) {
            relevantExams = allExams.filter(exam => planSubjects.includes(exam.subject));
        } else {
            // Fallback if no plan is yet generated, show all
            relevantExams = [...allExams];
        }

        // Randomize the result
        setSortedExams(shuffleArray(relevantExams));

    }, [allExams, planSubjectsHash]); 

    // --- PHASE 4.5: LOCAL INDEX SEARCH HANDLER ---
    useEffect(() => {
        const performLocalSearch = async () => {
            if (!filters.searchTerm.trim()) {
                let relevant = planSubjects.length > 0 ? allExams.filter(e => planSubjects.includes(e.subject)) : allExams;
                setSortedExams(shuffleArray(relevant));
                return;
            }

            setIsSearchingDB(true);
            try {
                const results = await searchOfflineExams(filters.searchTerm);
                // Even with keyword search, we still strictly limit to plan subjects
                const strictlyRelevant = planSubjects.length > 0 
                    ? results.filter(e => planSubjects.includes(e.subject))
                    : results;
                setSortedExams(strictlyRelevant);
            } catch (e) {
                console.error("Local search failed", e);
            } finally {
                setIsSearchingDB(false);
            }
        };

        const timer = setTimeout(performLocalSearch, 300);
        return () => clearTimeout(timer);
    }, [filters.searchTerm, allExams, planSubjectsHash]);

    const continueExams = useMemo(() => {
        if (!userData || !userData.examProgress || !allExams.length) return [];
        
        const examsWithProgress = allExams.filter(exam => {
            const progress = userData.examProgress?.[exam.id];
            return progress && !userData.completedExamQSTs?.includes(exam.id);
        });

        return examsWithProgress.sort((a, b) => {
            const progressA = userData.examProgress?.[a.id];
            const progressB = userData.examProgress?.[b.id];

            const timeA = progressA?.lastUpdated?.toMillis ? progressA.lastUpdated.toMillis() : (progressA?.lastUpdated ? new Date(progressA.lastUpdated).getTime() : 0);
            const timeB = progressB?.lastUpdated?.toMillis ? progressB.lastUpdated.toMillis() : (progressB?.lastUpdated ? new Date(progressB.lastUpdated).getTime() : 0);

            return timeB - timeA;
        });
    }, [allExams, userData]);

    const availableSubjects = useMemo(() => {
        if (filters.department === 'All') return Object.keys(NIGERIAN_CURRICULUM_SUBJECTS).sort();
        return Object.keys(NIGERIAN_CURRICULUM_SUBJECTS)
            .filter(subj => {
                const dep = SUBJECT_TO_DEPARTMENT_MAP[subj];
                return dep === filters.department || dep === 'General';
            })
            .sort();
    }, [filters.department]);

    const handleFilterChange = (key: keyof typeof filters, value: string) => {
        const newFilters = { ...filters, [key]: value };
        if (key === 'department') newFilters.subject = 'All';
        setFilters(newFilters);
    };

    const filteredExams = useMemo(() => {
        return sortedExams.filter(exam => {
            const searchTermMatch = filters.searchTerm === '' ||
                exam.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                exam.topic.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                exam.subject.toLowerCase().includes(filters.searchTerm.toLowerCase());
            
            const examDepartment = SUBJECT_TO_DEPARTMENT_MAP[exam.subject] || 'General';
            const departmentMatch = filters.department === 'All' || examDepartment === filters.department || examDepartment === 'General';
            const subjectMatch = filters.subject === 'All' || exam.subject === filters.subject;
            const difficultyMatch = filters.difficulty === 'All' || 
                                    (exam.difficulty === filters.difficulty) || 
                                    (!exam.difficulty && exam.title.includes(`(${filters.difficulty})`));

            return searchTermMatch && departmentMatch && subjectMatch && difficultyMatch;
        });
    }, [filters, sortedExams]);

    const isFiltering = filters.searchTerm !== '' || filters.department !== 'All' || filters.subject !== 'All' || filters.difficulty !== 'All';

    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <h1 className="text-3xl font-black bg-gradient-to-r from-orange-500 to-red-600 text-transparent bg-clip-text">Test Prep</h1>
            </div>

            <ConnectivityStatus isOffline={isOffline} isPro={isProUser} />
            
            <ExamCountdown />
            
            <div className="flex border-b border-gray-700 mb-6 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('exams')}
                    className={`flex-1 min-w-[120px] flex justify-center items-center gap-2 py-3 px-4 transition-colors ${activeTab === 'exams' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-400 hover:text-white'}`}
                >
                    <FileQuestion size={20}/> All Tests
                </button>
                {user && userData && (
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`flex-1 min-w-[120px] flex justify-center items-center gap-2 py-3 px-4 transition-colors ${activeTab === 'analytics' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-400 hover:text-white'}`}
                    >
                        <BarChart3 size={20}/> Analytics
                    </button>
                )}
            </div>

            {activeTab === 'exams' && (
                <div>
                     {user && !isFiltering && continueExams.length > 0 && (
                         <div className="mb-10 animate-fade-in">
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                                <Timer className="mr-2 text-orange-500" size={24} />
                                Continue Exam
                            </h2>
                            <div className="horizontal-scrollbar flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
                                {loading ? (
                                    Array(3).fill(0).map((_, i) => <SkeletonContinueExam key={i} />)
                                ) : (
                                    continueExams.map(exam => {
                                        const progress = userData?.examProgress?.[exam.id];
                                        const percentage = progress && exam.questions.length > 0 ? (progress.currentQuestionIndex / exam.questions.length) * 100 : 0;
                                        return (
                                            <Link 
                                                key={exam.id}
                                                to={`/exam-qst-reader/${exam.id}`}
                                                className="flex-shrink-0 w-56 snap-start bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:scale-105 transition-transform duration-200 border border-gray-700 relative group"
                                            >
                                                <div className="h-28 relative">
                                                    <img src={exam.coverImageUrl} alt={exam.title} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent"></div>
                                                    <div className="absolute bottom-2 left-2 flex items-center space-x-2">
                                                        {progress?.mode === 'cbt' ? <MonitorPlay size={16} className="text-orange-400"/> : <Gamepad2 size={16} className="text-blue-400"/>}
                                                        <span className="text-xs font-bold text-white uppercase">{progress?.mode} Mode</span>
                                                    </div>
                                                    <div className="absolute top-2 right-2">
                                                        <CircularProgress percentage={percentage} size={28} strokeWidth={3} />
                                                    </div>
                                                </div>
                                                <div className="p-3">
                                                    <h3 className="text-sm font-bold text-white truncate mb-1">{exam.title}</h3>
                                                    <p className="text-xs text-gray-400 truncate">Question {progress ? progress.currentQuestionIndex + 1 : 1}</p>
                                                </div>
                                            </Link>
                                        );
                                    })
                                )}
                            </div>
                         </div>
                     )}

                     <div className="sticky top-0 z-30 bg-gray-900 py-4 -my-4 mb-6 shadow-lg border-b border-gray-800">
                        <div className="relative">
                            <input type="text" placeholder="Search tests..." value={filters.searchTerm} onChange={(e) => handleFilterChange('searchTerm', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                {isSearchingDB ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                            </div>
                        </div>
                         <div className="mt-2">
                            <button onClick={() => setShowFilters(!showFilters)} className="w-full flex items-center justify-center space-x-2 text-sm py-2 px-3 text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-md">
                                <Filter size={16} />
                                <span>Filters</span>
                                {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                        </div>
                        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showFilters ? 'max-h-64 pt-4' : 'max-h-0'}`}>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-800 p-4 rounded-lg">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Department</label>
                                    <select value={filters.department} onChange={e => handleFilterChange('department', e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500">
                                        <option value="All">All Departments</option>
                                        {DEPARTMENTS.map(dep => <option key={dep} value={dep}>{dep}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Subject</label>
                                    <select value={filters.subject} onChange={e => handleFilterChange('subject', e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500">
                                        <option value="All">All Subjects</option>
                                        {availableSubjects.map(subject => <option key={subject} value={subject}>{subject}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Difficulty</label>
                                    <select value={filters.difficulty} onChange={e => handleFilterChange('difficulty', e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500">
                                        <option value="All">All Levels</option>
                                        <option value="Junior Level">Junior Level</option>
                                        <option value="Senior Level">Senior Level</option>
                                        <option value="Tertiary Level">Tertiary Level</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {loading ? (
                            Array(12).fill(0).map((_, i) => <SkeletonExamCard key={i} />)
                        ) : filteredExams.length > 0 ? (
                            filteredExams.map(exam => <ExamCard key={exam.id} exam={exam} isProUser={!!isProUser} onInfoClick={setSelectedInfoExam} />)
                        ) : (
                            <div className="col-span-full text-center mt-20 flex flex-col items-center">
                                <FileQuestion className="text-gray-500 mb-4" size={64} />
                                <h2 className="text-2xl font-bold text-gray-200">No Tests Found</h2>
                                <p className="text-gray-400 mt-2">No tests match your search or plan. Complete your mission to unlock more!</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'analytics' && userData && (
                <AnalyticsTab userData={userData} isProUser={isProUser} user={user} />
            )}

            {selectedInfoExam && (
                <ExamInfoModal exam={selectedInfoExam} onClose={() => setSelectedInfoExam(null)} />
            )}
        </div>
    );
};

export default ExamsPage;