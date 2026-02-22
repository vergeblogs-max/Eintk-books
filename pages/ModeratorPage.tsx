
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { 
    getAllUsers, searchAllUsers, updateUserSubscriptionStatus, deleteUserAccount, 
    getPublishedEbooks, getQuestions, deleteCommunityQuestion, grantProAccessByEmail, 
    getContactSubmissions, deleteContactSubmission, createAnnouncement, getAnnouncements, 
    deleteAnnouncement, getYouTubeChannelUrl, updateYouTubeChannelUrl, getExamDates, 
    updateExamDates, getMaintenanceStatus, toggleMaintenanceMode, deleteExpiredCommunityQuestions,
    adminGrantSparks, adminGrantEnergy, getPublishedExamQSTs, postQuestion, rebuildLibraryRegistry
} from '../services/firestoreService';
import { generateNovaPulseContent, generateSingleNovaPost } from '../services/geminiService';
import { UserData, CommunityQuestion, ContactSubmission, Announcement, Ebook, ExamQST, NovaPulseItem } from '../types';
import { MODERATOR_TOPICS } from '../data/generalTopics';
import { NIGERIAN_CURRICULUM_SUBJECTS, SKIN_CONFIG } from '../constants';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { 
    ArrowLeft, Users, FileText, Check, Trash2, LayoutDashboard, Crown, Search, 
    BarChart3, Copy, RefreshCw, X, AlertTriangle, Eye, LifeBuoy, Clock, 
    Megaphone, Mail, FileCode, Settings, Calendar, Loader2, BookOpen, 
    TrendingUp, Activity, UserCheck, UserX, ShieldAlert, Star, Zap, BookOpenText, Coins, Battery,
    ChevronRight, Download, Globe, GraduationCap, ClipboardList, CheckCircle2, Sparkles, Send,
    MessageSquare, HelpCircle, User as UserIcon, Database
} from 'lucide-react';

const SimpleLineChart = ({ data, color, height = 60 }: { data: number[], color: string, height?: number }) => {
    if (!data || data.length < 2) return <div style={{height: `${height}px`}} className="w-full bg-gray-900/30 rounded flex items-center justify-center text-xs text-gray-600">Not enough data</div>;
    
    const max = Math.max(...data) || 1;
    const min = Math.min(...data);
    const range = max - min || 1;
    
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - ((val - min) / range) * 100;
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="w-full relative overflow-hidden rounded-lg" style={{ height: `${height}px` }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                <defs>
                    <linearGradient id={`grad-${color}`} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
                        <stop offset="100%" stopColor={color} stopOpacity="0"/>
                    </linearGradient>
                </defs>
                <path 
                    d={`M0,100 L${points.replace(/ /g, ' L')} L100,100 Z`} 
                    fill={`url(#grad-${color})`}
                />
                <polyline
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    points={points}
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </div>
    );
};

const MetricCard = ({ title, value, subtext, trendData, color, icon: Icon }: { title: string, value: string | number, subtext: string, trendData?: number[] | null, color: string, icon: any }) => (
    <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-lg flex flex-col justify-between h-full relative overflow-hidden group hover:border-gray-600 transition-all">
        <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity`}>
            <Icon size={64} color={color} />
        </div>
        <div className="relative z-10">
            <div className="flex items-center space-x-2 mb-2">
                <div className="p-1.5 rounded-lg bg-gray-900/50">
                    <Icon size={16} color={color} />
                </div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">{title}</p>
            </div>
            <h3 className="text-3xl font-black text-white mb-1 tracking-tight">{value}</h3>
            <p className="text-xs text-gray-500 font-medium">{subtext}</p>
        </div>
        {trendData && (
            <div className="mt-4 pt-4 border-t border-gray-700/50">
                <SimpleLineChart data={trendData} color={color} height={40} />
            </div>
        )}
    </div>
);

const ModeratorPage: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'analytics' | 'pulse' | 'users' | 'books' | 'topics' | 'announcements' | 'inbox' | 'sitemaps' | 'settings'>('analytics');
    const [isAdmin, setIsAdmin] = useState(false);
    
    const [users, setUsers] = useState<UserData[]>([]);
    const [ebooks, setEbooks] = useState<Ebook[]>([]);
    const [publishedExams, setPublishedExams] = useState<ExamQST[]>([]);
    const [loading, setLoading] = useState(true);
    const [analyticsTimeRange, setAnalyticsTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [isProcessingUser, setIsProcessingUser] = useState(false);
    const [confirmDeleteUser, setConfirmDeleteUser] = useState(false);
    
    // Currency Admin Tools
    const [grantSparksVal, setGrantSparksVal] = useState<string>('');
    const [grantEnergyVal, setGrantEnergyVal] = useState<string>('');

    // Nova Pulse Command Center
    const [pulseSubject, setPulseSubject] = useState('Mathematics');
    const [pulseType, setPulseType] = useState<'quiz' | 'discussion'>('quiz');
    const [pulseTone, setPulseTone] = useState<'Educational' | 'Witty'>('Educational');
    const [isGeneratingPulse, setIsGeneratingPulse] = useState(false);
    const [draftPost, setDraftPost] = useState<NovaPulseItem | null>(null);
    const [isDeployingPulse, setIsDeployingPulse] = useState(false);
    const [activeAiPostCount, setActiveAiPostCount] = useState(0);

    // Announcements
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [showDeleteAnnModal, setShowDeleteAnnModal] = useState(false);
    const [annToDelete, setAnnToDelete] = useState<string | null>(null);

    // Topics Tab
    const [topicFilter, setTopicFilter] = useState<'free' | 'paid'>('free');
    const [copiedTopic, setCopiedTopic] = useState<string | null>(null);

    const [contactSubmissions, setContactSubmissions] = useState<ContactSubmission[]>([]);

    // SEO States
    const [sitemapXml, setSitemapXml] = useState('');
    const [robotsTxt, setRobotsTxt] = useState('');
    const [isGeneratingSitemaps, setIsGeneratingSitemaps] = useState(false);
    const [sitemapCopied, setSitemapCopied] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const [newAnnouncementTitle, setNewAnnouncementTitle] = useState('');
    const [newAnnouncementContent, setNewAnnouncementContent] = useState('');
    const [isSubmittingAnnouncement, setIsSubmittingAnnouncement] = useState(false);
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [examDates, setExamDates] = useState<{ name: string; date: string }[]>([]);
    const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
    const [isCleaning, setIsCleaning] = useState(false);
    const [isRebuilding, setIsRebuilding] = useState(false);
    const [cleanupResult, setCleanupResult] = useState<string | null>(null);
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    // Auto-hide success notification
    useEffect(() => {
        if (successMsg) {
            const timer = setTimeout(() => setSuccessMsg(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMsg]);

    useEffect(() => {
        const checkAdmin = async () => {
            const currentUser = auth.currentUser;
            if (!currentUser) { navigate('/auth'); return; }
            setIsAdmin(true); 
        };
        checkAdmin();
        fetchCoreData();
        getYouTubeChannelUrl().then(url => { if (url) setYoutubeUrl(url); });
        getExamDates().then(setExamDates);
        const unsub = getMaintenanceStatus(setIsMaintenanceMode);
        fetchAnnouncements();
        
        // Track AI posts
        const unsubQuestions = getQuestions((qs) => {
            const aiPosts = qs.filter(q => q.isAIPost || q.authorId === 'NOVA_AI_CORE');
            setActiveAiPostCount(aiPosts.length);
        });

        return () => {
            unsub();
            unsubQuestions();
        };
    }, [navigate]);

    const fetchCoreData = async () => {
        setLoading(true);
        try {
            const [fetchedUsers, fetchedBooks, fetchedExams] = await Promise.all([
                getAllUsers(1000), 
                getPublishedEbooks(),
                getPublishedExamQSTs()
            ]);
            setUsers(fetchedUsers);
            setEbooks(fetchedBooks);
            setPublishedExams(fetchedExams);
        } catch (e: any) { setError(e.message); } finally { setLoading(false); }
    };

    const fetchAnnouncements = async () => { try { setAnnouncements(await getAnnouncements()); } catch (e) {} };
    const fetchContactSubmissions = async () => { try { setContactSubmissions(await getContactSubmissions()); } catch (e: any) { setError(e.message); } };

    const analytics = useMemo(() => {
        if (!users.length) return null;
        const now = new Date();
        const oneDay = 24 * 60 * 60 * 1000;
        let thresholdTime = 0;
        if (analyticsTimeRange === '24h') thresholdTime = now.getTime() - oneDay;
        else if (analyticsTimeRange === '7d') thresholdTime = now.getTime() - (7 * oneDay);
        else thresholdTime = now.getTime() - (30 * oneDay);
        
        const thresholdDate = new Date(thresholdTime);
        const activeUsers = users.filter(u => {
            const d = u.lastStudyDate?.toDate ? u.lastStudyDate.toDate() : (u.lastStudyDate ? new Date(u.lastStudyDate) : null);
            return d && d > thresholdDate;
        });

        const retentionBuckets = Array(7).fill(0);
        users.forEach(u => {
            const d = u.lastStudyDate?.toDate ? u.lastStudyDate.toDate() : (u.lastStudyDate ? new Date(u.lastStudyDate) : null);
            if (d) {
                const diffTime = now.getTime() - d.getTime();
                const diffDays = Math.floor(diffTime / oneDay);
                if (diffDays >= 0 && diffDays < 7) retentionBuckets[6 - diffDays]++;
            }
        });

        let totalScoreSum = 0;
        let totalScoreCount = 0;
        let interactions = 0;
        let examsTaken = 0;

        users.forEach(u => {
            if (u.readingProgress) {
                Object.values(u.readingProgress).forEach((p: any) => {
                    const d = p.lastAccessed?.toDate ? p.lastAccessed.toDate() : (p.lastAccessed ? new Date(p.lastAccessed) : null);
                    if (d && d > thresholdDate) interactions++;
                });
            }
            if (u.examScores) {
                Object.values(u.examScores).forEach((s: any) => {
                    const d = new Date(s.date);
                    if (d > thresholdDate) {
                        examsTaken++;
                        if (s.totalQuestions > 0) {
                            totalScoreSum += (s.score / s.totalQuestions) * 100;
                            totalScoreCount++;
                        }
                    }
                });
            }
        });

        const totalUsers = users.length;
        const proUsers = users.filter(u => u.subscriptionStatus === 'pro' && u.proExpiryDate && (u.proExpiryDate.toDate ? u.proExpiryDate.toDate() : new Date(u.proExpiryDate)) > now).length;
        const convRate = totalUsers > 0 ? ((proUsers / totalUsers) * 100).toFixed(1) : '0';

        return { 
            activeCount: activeUsers.length, 
            booksReadCount: interactions, 
            examsTakenCount: examsTaken, 
            avgScore: totalScoreCount > 0 ? Math.round(totalScoreSum / totalScoreCount) : 0, 
            retentionTrend: retentionBuckets, 
            totalUsers, 
            proUsers,
            convRate,
            timeRangeLabel: analyticsTimeRange === '24h' ? 'Last 24 Hours' : analyticsTimeRange === '7d' ? 'Last 7 Days' : 'Last 30 Days'
        };
    }, [users, analyticsTimeRange]);

    const isFullPro = (u: UserData) => {
        if (u.subscriptionStatus !== 'pro' || !u.proExpiryDate) return false;
        const d = u.proExpiryDate.toDate ? u.proExpiryDate.toDate() : new Date(u.proExpiryDate);
        return d > new Date();
    };

    const handleGenerateSinglePost = async () => {
        setIsGeneratingPulse(true);
        setDraftPost(null);
        setError(null);
        try {
            const item = await generateSingleNovaPost(pulseSubject, pulseType, pulseTone);
            setDraftPost(item);
            setSuccessMsg(`Drafted ${pulseType} for ${pulseSubject}.`);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsGeneratingPulse(false);
        }
    };

    const handleDeployDraft = async () => {
        if (!draftPost) return;
        setIsDeployingPulse(true);
        try {
            const postData = {
                ...draftPost,
                authorId: 'NOVA_AI_CORE',
                authorUsername: 'Nova AI',
                authorProfilePic: 'https://i.ibb.co/v6Mf9F37/android-chrome-192x192.png',
                isAIPost: true,
            };
            await postQuestion(postData);
            setDraftPost(null);
            setSuccessMsg("Deployed to Nova Pulse.");
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsDeployingPulse(false);
        }
    };

    const handleGrantCurrency = async (type: 'sparks' | 'energy') => {
        if (!selectedUser || !grantSparksVal && type === 'sparks') return;
        if (!selectedUser || !grantEnergyVal && type === 'energy') return;
        setIsProcessingUser(true);
        const amount = parseInt(type === 'sparks' ? grantSparksVal : grantEnergyVal);
        try {
            if (type === 'sparks') {
                await adminGrantSparks(selectedUser.uid, amount);
                setSuccessMsg(`Granted ${amount} Sparks to ${selectedUser.username}`);
                setGrantSparksVal('');
            } else {
                await adminGrantEnergy(selectedUser.uid, amount);
                setSuccessMsg(`Granted ${amount} Energy to ${selectedUser.username}`);
                setGrantEnergyVal('');
            }
            fetchCoreData();
        } catch (e: any) { setError(e.message); } finally { setIsProcessingUser(false); }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedTopic(text);
        setSuccessMsg("Copied to clipboard!");
    };

    const confirmDeleteAnnouncement = async () => {
        if (!annToDelete) return;
        try {
            await deleteAnnouncement(annToDelete);
            setSuccessMsg("Announcement deleted.");
            setShowDeleteAnnModal(false);
            setAnnToDelete(null);
            fetchAnnouncements();
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleCreateAnnouncement = async () => {
        if (!newAnnouncementTitle || !newAnnouncementContent) return;
        setIsSubmittingAnnouncement(true);
        try {
            await createAnnouncement({ title: newAnnouncementTitle, content: newAnnouncementContent, type: 'general' });
            setNewAnnouncementTitle(''); setNewAnnouncementContent('');
            setSuccessMsg('Announcement posted.');
            fetchAnnouncements();
        } catch (e: any) { setError(e.message); } finally { setIsSubmittingAnnouncement(false); }
    };

    const handleGenerateSitemaps = async () => {
        setIsGeneratingSitemaps(true);
        const baseUrl = "https://www.eintk.com.ng";
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
        xml += `  <url><loc>${baseUrl}/</loc><priority>1.0</priority></url>\n`;
        xml += `  <url><loc>${baseUrl}/exams</loc><priority>0.9</priority></url>\n`;
        ebooks.forEach(b => {
            xml += `  <url><loc>${baseUrl}/ebook-viewer/${b.id}</loc><priority>0.8</priority></url>\n`;
        });
        publishedExams.forEach(e => {
            xml += `  <url><loc>${baseUrl}/exam-qst-viewer/${e.id}</loc><priority>0.8</priority></url>\n`;
        });
        xml += `</urlset>`;
        setSitemapXml(xml);
        setRobotsTxt(`User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml`);
        setIsGeneratingSitemaps(false);
    };

    const handleUpdateExamDate = (name: string, date: string) => {
        setExamDates(prev => prev.map(d => d.name === name ? { ...d, date } : d));
    };

    const handleToggleMaintenance = async (status: boolean) => {
        setIsSavingSettings(true);
        try { await toggleMaintenanceMode(status); setIsMaintenanceMode(status); setSuccessMsg(`Maintenance mode ${status ? 'enabled' : 'disabled'}.`); } 
        catch (e: any) { setError(e.message); } finally { setIsSavingSettings(false); }
    };

    const handleSaveSettings = async () => {
        setIsSavingSettings(true);
        try { 
            await updateYouTubeChannelUrl(youtubeUrl); 
            await updateExamDates(examDates); 
            setSuccessMsg('System settings updated.'); 
        } catch (e: any) { setError(e.message); } finally { setIsSavingSettings(false); }
    };

    const handleDeleteContactRequest = async (sub: ContactSubmission) => {
        if (!confirm(`Delete message from ${sub.name}?`)) return;
        try { await deleteContactSubmission(sub.id!); setContactSubmissions(prev => prev.filter(c => c.id !== sub.id)); setSuccessMsg("Message deleted."); } 
        catch (e: any) { setError(e.message); }
    };

    const handleCleanupQuestions = async () => {
        setIsCleaning(true);
        try { const count = await deleteExpiredCommunityQuestions(); setCleanupResult(`Purged ${count} items.`); setSuccessMsg("Cleanup successful."); } 
        catch (e: any) { setError(e.message); } finally { setIsCleaning(false); }
    };

    const handleRebuildRegistry = async () => {
        setIsRebuilding(true);
        try {
            await rebuildLibraryRegistry();
            setSuccessMsg("Library Registry Rebuilt Successfully.");
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsRebuilding(false);
        }
    };

    const handleGrantPro = async (days: number) => {
        if (!selectedUser) return;
        setIsProcessingUser(true);
        try {
            const success = await grantProAccessByEmail(selectedUser.email, days);
            if (success) {
                setSuccessMsg(`Granted ${days} days Pro to ${selectedUser.username}`);
                fetchCoreData();
                setIsUserModalOpen(false);
            } else setError("User not found.");
        } catch (e: any) { setError(e.message); } finally { setIsProcessingUser(false); }
    };

    const handleDeleteUser = async () => {
        if (!selectedUser) return;
        setIsProcessingUser(true);
        try {
            await deleteUserAccount(selectedUser.uid);
            setSuccessMsg(`User deleted.`);
            setConfirmDeleteUser(false);
            setIsUserModalOpen(false);
            setUsers(prev => prev.filter(u => u.uid !== selectedUser.uid));
        } catch (e: any) { setError(e.message); } finally { setIsProcessingUser(false); }
    };

    const getUserAcademicStats = (u: UserData) => {
        const booksRead = u.completedBooks?.length || 0;
        const examsTaken = Object.keys(u.examScores || {}).length;
        let avg = 0;
        if (examsTaken > 0) {
            const scores = Object.values(u.examScores!);
            const sum = scores.reduce((a, b) => a + (b.score / b.totalQuestions), 0);
            avg = Math.round((sum / examsTaken) * 100);
        }
        const getGrade = (a: number) => {
            if (a >= 75) return 'A';
            if (a >= 60) return 'B';
            if (a >= 50) return 'C';
            if (a >= 40) return 'D';
            return 'F';
        };
        return { booksRead, examsTaken, avg, grade: getGrade(avg) };
    };

    const renderAnalytics = () => (
        <div className="space-y-8 animate-fade-in pb-12 max-w-full mx-auto">
            <div className="flex justify-between items-center bg-gray-800 p-2 rounded-lg border border-gray-700">
                <h2 className="text-sm font-black uppercase tracking-widest text-white px-2">Performance</h2>
                <div className="flex bg-gray-900 rounded-md p-1">
                    {['24h', '7d', '30d'].map((r) => (
                        <button key={r} onClick={() => setAnalyticsTimeRange(r as any)} className={`px-4 py-1.5 text-xs font-bold rounded transition-colors ${analyticsTimeRange === r ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'}`}>{r.toUpperCase()}</button>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard title="Active" value={analytics?.activeCount || 0} subtext={`Users (${analytics?.timeRangeLabel})`} trendData={analytics?.retentionTrend} color="#10b981" icon={Zap}/>
                <MetricCard title="Books" value={analytics?.booksReadCount || 0} subtext="Total Reads" color="#f97316" icon={BookOpenText} trendData={null}/>
                <MetricCard title="Tests" value={analytics?.examsTakenCount || 0} subtext="CBT Sessions" color="#3b82f6" icon={FileText} trendData={null}/>
                <MetricCard title="Accuracy" value={`${analytics?.avgScore || 0}%`} subtext="Global Grade" color="#8b5cf6" icon={TrendingUp} trendData={null}/>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                    <h3 className="text-sm font-black uppercase tracking-widest text-white mb-6 flex items-center"><Activity className="mr-2 text-green-500" /> Retention Heat</h3>
                    <div className="h-48 bg-gray-900/50 rounded-lg p-4 flex items-end">
                        <div className="w-full h-full flex items-end justify-between gap-2">
                            {analytics?.retentionTrend.map((val, i) => { 
                                const heightPct = Math.max(5, (val / (Math.max(...analytics.retentionTrend) || 1)) * 100); 
                                return (
                                    <div key={i} className="flex-1 flex flex-col justify-end group relative">
                                        <div className="w-full bg-green-600/80 rounded-t-sm hover:bg-green-500 transition-all shadow-[0_-5px_15px_rgba(16,185,129,0.2)]" style={{ height: `${heightPct}%` }}></div>
                                        <span className="text-[9px] text-gray-500 text-center mt-1 uppercase font-bold">{i === 6 ? 'Now' : `-${6-i}d`}</span>
                                    </div>
                                ) 
                            })}
                        </div>
                    </div>
                </div>
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg flex flex-col">
                    <h3 className="text-gray-400 font-black uppercase text-[10px] tracking-widest mb-6 flex items-center"><ShieldAlert className="mr-2" size={14}/> Conversion</h3>
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-900 rounded-xl border border-white/5">
                            <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">PRO Ratio</p>
                            <div className="flex items-end justify-between">
                                <span className="text-3xl font-black text-white">{analytics?.convRate}%</span>
                                <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest">Growth</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                             <div className="p-3 bg-gray-900 rounded-xl border border-white/5">
                                <p className="text-[9px] text-gray-500 font-black mb-1 uppercase tracking-tighter">Paid</p>
                                <p className="text-xl font-black text-yellow-500">{analytics?.proUsers}</p>
                            </div>
                            <div className="p-3 bg-gray-900 rounded-xl border border-white/5">
                                <p className="text-[9px] text-gray-500 font-black mb-1 uppercase tracking-tighter">Free</p>
                                <p className="text-xl font-black text-white">{(analytics?.totalUsers || 0) - (analytics?.proUsers || 0)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderNovaPulse = () => (
        <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pb-10">
            {/* AI Command Center */}
            <div className="bg-gray-800 rounded-[2.5rem] p-8 border border-gray-700 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform"><Megaphone size={140} className="text-pink-500" /></div>
                
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="bg-pink-600 p-3 rounded-2xl shadow-lg shadow-pink-900/40"><Zap size={24} className="text-white animate-pulse" /></div>
                            <div>
                                <h2 className="text-2xl font-black text-white uppercase tracking-tight">Nova AI Core</h2>
                                <p className="text-xs text-gray-400 font-medium">Community Command Center</p>
                            </div>
                        </div>
                        <div className="bg-gray-900 px-4 py-2 rounded-xl border border-white/5 flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Pulse: {activeAiPostCount}/10</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        {/* Subject */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Subject</label>
                            <select 
                                value={pulseSubject}
                                onChange={(e) => setPulseSubject(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white outline-none focus:border-pink-500 transition-all"
                            >
                                {Object.keys(NIGERIAN_CURRICULUM_SUBJECTS).sort().map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        {/* Type */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Post Type</label>
                            <div className="flex bg-gray-900 rounded-xl p-1 border border-gray-700">
                                <button onClick={() => setPulseType('quiz')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${pulseType === 'quiz' ? 'bg-pink-600 text-white shadow-lg' : 'text-gray-500'}`}>Quiz</button>
                                <button onClick={() => setPulseType('discussion')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${pulseType === 'discussion' ? 'bg-pink-600 text-white shadow-lg' : 'text-gray-500'}`}>Chat</button>
                            </div>
                        </div>
                        {/* Tone */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Personality Tone</label>
                            <div className="flex bg-gray-900 rounded-xl p-1 border border-gray-700">
                                <button onClick={() => setPulseTone('Educational')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${pulseTone === 'Educational' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500'}`}>Study</button>
                                <button onClick={() => setPulseTone('Witty')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${pulseTone === 'Witty' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500'}`}>Witty</button>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={handleGenerateSinglePost} 
                        disabled={isGeneratingPulse}
                        className="w-full bg-white text-gray-900 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        {isGeneratingPulse ? <Loader2 className="animate-spin" size={20}/> : <Sparkles size={20} className="text-pink-600"/>}
                        {isGeneratingPulse ? 'Crafting Engagement...' : 'Forge Single Pulse Post'}
                    </button>
                </div>
            </div>

            {/* Draft Preview */}
            {draftPost && (
                <div className="animate-fade-in-up">
                    <h3 className="text-gray-500 font-black uppercase tracking-[0.3em] text-[10px] mb-4 ml-4">Deployment Preview</h3>
                    <div className="bg-gray-800 p-8 rounded-[2.5rem] border-2 border-pink-500 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-pink-600 text-white text-[8px] font-black uppercase tracking-widest px-6 py-2 rounded-bl-3xl shadow-xl">
                            <Sparkles size={10} className="inline mr-2" fill="currentColor"/> Pulse Draft
                        </div>
                        
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-gray-900 border border-pink-500/30 flex items-center justify-center">
                                <img src="https://i.ibb.co/v6Mf9F37/android-chrome-192x192.png" className="w-8 h-8 opacity-80" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="font-black text-white text-lg">Nova AI</h4>
                                    <CheckCircle2 size={16} className="text-blue-400" fill="currentColor"/>
                                </div>
                                <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">{draftPost.subject} • {draftPost.type.toUpperCase()}</p>
                            </div>
                        </div>

                        <h4 className="text-2xl font-black text-white mb-3 tracking-tight">{draftPost.title}</h4>
                        <p className="text-gray-300 text-base leading-relaxed mb-8">{draftPost.content}</p>

                        {draftPost.type === 'quiz' && draftPost.quizOptions && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                                {draftPost.quizOptions.map((opt, i) => (
                                    <div key={i} className={`p-4 rounded-xl border font-bold text-sm flex items-center gap-3 ${opt === draftPost.correctAnswer ? 'bg-green-900/20 border-green-500/50 text-green-400' : 'bg-gray-900 border-gray-700 text-gray-500'}`}>
                                        <div className="w-6 h-6 rounded-lg bg-black/30 flex items-center justify-center text-[10px]">{String.fromCharCode(65+i)}</div>
                                        {opt}
                                        {opt === draftPost.correctAnswer && <Check size={16} className="ml-auto"/>}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3">
                            <button 
                                onClick={handleDeployDraft}
                                disabled={isDeployingPulse}
                                className="flex-1 bg-green-600 hover:bg-green-500 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                            >
                                {isDeployingPulse ? <Loader2 className="animate-spin" size={18}/> : <Send size={18}/>}
                                {isDeployingPulse ? 'Deploying...' : 'Initiate Deployment'}
                            </button>
                            <button 
                                onClick={() => setDraftPost(null)}
                                className="px-10 py-4 bg-gray-900 text-gray-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:text-white transition-colors"
                            >
                                Discard
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderUsers = () => {
        const filteredUsers = users.filter(u => u.username.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()));
        return (
            <div className="animate-fade-in max-w-full mx-auto">
                <div className="flex gap-2 mb-6">
                    <div className="relative flex-1">
                        <input type="text" placeholder="Filter by name/email..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-orange-500 text-sm"/>
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    </div>
                    <button onClick={fetchCoreData} className="bg-gray-800 p-3 rounded-lg hover:bg-gray-700 transition-colors border border-gray-700 shrink-0"><RefreshCw size={20} className={loading ? 'animate-spin' : ''} /></button>
                </div>
                <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-lg divide-y divide-gray-700 overflow-hidden">
                    {filteredUsers.slice(0, 100).map(u => {
                        const activePro = isFullPro(u);
                        return (
                            <div key={u.uid} onClick={() => { setSelectedUser(u); setIsUserModalOpen(true); }} className="flex items-center justify-between p-4 hover:bg-gray-700/30 transition-all cursor-pointer group">
                                <div className="flex items-center space-x-3 min-w-0">
                                    <img src={u.profilePictureUrl || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full object-cover bg-gray-700 border border-gray-600 shrink-0" alt="avatar" />
                                    <div className="min-w-0">
                                        <p className="font-bold text-white group-hover:text-orange-400 transition-colors truncate text-sm">{u.username}</p>
                                        <p className="text-[9px] text-gray-500 truncate uppercase tracking-tighter">{u.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 ml-4">
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-widest ${activePro ? 'bg-yellow-500 text-black shadow-[0_0_10px_rgba(234,179,8,0.2)]' : 'bg-gray-900 text-gray-500 border border-gray-700'}`}>{activePro ? 'PRO' : 'FREE'}</span>
                                    <ChevronRight size={18} className="text-gray-600 group-hover:text-orange-500 transition-colors"/>
                                </div>
                            </div>
                        )
                    })}
                    {filteredUsers.length === 0 && <div className="p-12 text-center text-gray-500 italic">No learners found.</div>}
                </div>
            </div>
        );
    };

    const renderTopics = () => {
        const topics = topicFilter === 'free' ? MODERATOR_TOPICS.free : MODERATOR_TOPICS.paid;
        return (
            <div className="animate-fade-in space-y-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-black uppercase tracking-widest">Topic Directory</h2>
                    <div className="flex bg-gray-900 p-1 rounded-xl border border-gray-700">
                        <button onClick={() => setTopicFilter('free')} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${topicFilter === 'free' ? 'bg-orange-600 text-white' : 'text-gray-500'}`}>Free ({MODERATOR_TOPICS.free.length})</button>
                        <button onClick={() => setTopicFilter('paid')} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${topicFilter === 'paid' ? 'bg-yellow-600 text-black' : 'text-gray-500'}`}>Pro ({MODERATOR_TOPICS.paid.length})</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {topics.map((topic, idx) => {
                        const isCopied = copiedTopic === topic;
                        const isAlreadyPublished = ebooks.some(b => b.topic === topic);
                        return (
                            <div key={idx} className={`p-4 rounded-xl border flex flex-col justify-between transition-all group ${isAlreadyPublished ? 'bg-green-900/10 border-green-500/20' : 'bg-gray-800 border-gray-700 hover:border-orange-500/50'}`}>
                                <div className="flex justify-between items-start gap-2 mb-3">
                                    <p className={`text-sm font-bold leading-snug ${isAlreadyPublished ? 'text-green-400' : 'text-white group-hover:text-orange-400 transition-colors'}`}>{topic}</p>
                                    {isAlreadyPublished && <div className="bg-green-500/20 p-1 rounded-full"><Check size={12} className="text-green-500" /></div>}
                                </div>
                                <div className="flex items-center justify-between mt-auto pt-2">
                                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{topicFilter.toUpperCase()}</span>
                                    <button 
                                        onClick={() => copyToClipboard(topic)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${isCopied ? 'bg-green-600 text-white' : 'bg-gray-900 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                                    >
                                        {isCopied ? <><CheckCircle2 size={12}/> Copied</> : <><Copy size={12}/> Copy</>}
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        );
    };

    if (!isAdmin) return null;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 pb-20 font-sans max-w-full overflow-x-hidden">
            {successMsg && <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full shadow-xl z-[1100] animate-fade-in-down flex items-center whitespace-nowrap"><Check size={18} className="mr-2"/> {successMsg}<button onClick={() => setSuccessMsg(null)} className="ml-4 hover:opacity-70"><X size={14}/></button></div>}
            {error && <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-full shadow-xl z-[1100] animate-fade-in-down flex items-center whitespace-nowrap"><AlertTriangle size={18} className="mr-2"/> {error}<button onClick={() => setError(null)} className="ml-4 hover:opacity-70"><X size={14}/></button></div>}

            <div className="flex items-center mb-8 bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-lg max-w-7xl mx-auto">
                <button onClick={() => navigate('/profile')} className="p-2 rounded-full hover:bg-gray-700 mr-4"><ArrowLeft className="text-orange-500" /></button>
                <div><h1 className="text-2xl font-bold flex items-center text-white uppercase tracking-tighter"><LayoutDashboard className="mr-2 text-blue-500" fill="currentColor"/> Control Center</h1><p className="text-gray-400 text-xs font-bold tracking-widest uppercase">System Operations</p></div>
            </div>

            <div className="flex space-x-2 mb-8 overflow-x-auto pb-2 no-scrollbar max-w-7xl mx-auto">
                {[
                    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                    { id: 'pulse', label: 'Nova Pulse', icon: Zap },
                    { id: 'users', label: 'Learners', icon: Users },
                    { id: 'books', label: 'Library', icon: BookOpen },
                    { id: 'topics', label: 'Topics', icon: ClipboardList },
                    { id: 'announcements', label: 'Broadcast', icon: Megaphone },
                    { id: 'inbox', label: 'Inbox', icon: Mail },
                    { id: 'sitemaps', label: 'SEO', icon: Globe },
                    { id: 'settings', label: 'System', icon: Settings },
                ].map((tab) => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap border ${activeTab === tab.id ? 'bg-orange-600 text-white border-orange-600 shadow-xl scale-105' : 'bg-gray-800 text-gray-500 border-gray-700 hover:bg-gray-700'}`}><tab.icon size={14} className="mr-2"/> {tab.label}</button>
                ))}
            </div>

            <div className="max-w-7xl mx-auto">
                {activeTab === 'analytics' && renderAnalytics()}
                {activeTab === 'pulse' && renderNovaPulse()}
                {activeTab === 'users' && renderUsers()}
                {activeTab === 'topics' && renderTopics()}
                {activeTab === 'books' && (
                    <div className="animate-fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-black uppercase tracking-widest">Library Hub</h2>
                            <span className="text-[10px] text-gray-500 font-bold uppercase">{ebooks.length} Titles Published</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {ebooks.map(book => (
                                <div key={book.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex items-start space-x-4 hover:bg-gray-750 group transition-all">
                                    <img src={book.coverImageUrl} className="w-16 h-20 object-cover rounded-md bg-gray-900 shadow-md" alt="cover"/>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-white truncate text-sm mb-1">{book.title}</h4>
                                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">{book.subject}</p>
                                        <div className="flex items-center gap-3 text-[10px] font-bold">
                                            <span className="flex items-center text-green-400 uppercase"><Eye size={12} className="mr-1"/> {book.totalReads || 0}</span>
                                            <span className="flex items-center text-yellow-500 uppercase"><Star size={12} className="mr-1"/> {book.averageRating?.toFixed(1) || '0.0'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {activeTab === 'announcements' && (
                    <div className="max-w-2xl mx-auto animate-fade-in">
                        <div className="bg-gray-800 p-6 rounded-[2rem] border border-gray-700 space-y-4 shadow-2xl">
                            <div className="flex items-center gap-2 mb-2"><Megaphone size={20} className="text-blue-500"/><h3 className="text-lg font-black uppercase tracking-tighter">New Broadcast</h3></div>
                            <input value={newAnnouncementTitle} onChange={e=>setNewAnnouncementTitle(e.target.value)} placeholder="Subject line..." className="w-full bg-gray-900 p-4 rounded-2xl border border-gray-700 text-white outline-none focus:border-orange-500 text-sm font-bold"/>
                            <textarea value={newAnnouncementContent} onChange={e=>setNewAnnouncementContent(e.target.value)} placeholder="Type message for all learners..." className="w-full bg-gray-900 p-4 rounded-2xl border border-gray-700 text-white h-32 outline-none focus:border-orange-500 resize-none text-sm leading-relaxed"/>
                            <button onClick={handleCreateAnnouncement} disabled={isSubmittingAnnouncement} className="w-full bg-blue-600 py-4 rounded-2xl font-black uppercase text-xs tracking-widest text-white hover:bg-blue-700 shadow-xl disabled:opacity-50">{isSubmittingAnnouncement ? 'Broadcasting...' : 'Post Message'}</button>
                        </div>
                        <div className="mt-12 space-y-3">
                            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-4">Message History</h4>
                            {announcements.map(ann => (
                                <div key={ann.id} className="flex justify-between items-center bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-md">
                                    <div className="min-w-0 flex-1 pr-4">
                                        <p className="font-bold text-white truncate text-sm">{ann.title}</p>
                                        <p className="text-[10px] text-gray-500 truncate font-medium">{ann.content}</p>
                                    </div>
                                    <button onClick={() => { setAnnToDelete(ann.id); setShowDeleteAnnModal(true); }} className="p-2 text-gray-500 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'inbox' && (
                    <div className="max-w-3xl mx-auto animate-fade-in">
                         <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-black uppercase tracking-tighter">Support Inbox</h3>
                            <button onClick={fetchContactSubmissions} className="p-2 bg-gray-800 rounded-xl text-blue-400 hover:text-white transition-colors border border-gray-700"><RefreshCw size={18}/></button>
                        </div>
                        <div className="space-y-4">
                            {contactSubmissions.length === 0 && <p className="text-center text-gray-500 py-20 italic">Inbox is clear.</p>}
                            {contactSubmissions.map(sub => (
                                <div key={sub.id} className="bg-gray-800 p-6 rounded-[1.5rem] border border-gray-700 shadow-lg relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 bg-orange-600/10 rounded-bl-3xl border-l border-b border-orange-500/20 text-orange-500 text-[9px] font-black uppercase tracking-widest">{sub.reason}</div>
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-gray-900 border border-white/5 flex items-center justify-center font-black text-blue-500 shadow-inner">{sub.name.charAt(0)}</div>
                                            <div><p className="font-bold text-white leading-none mb-1">{sub.name}</p><p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">{sub.email}</p></div>
                                        </div>
                                        <button onClick={() => handleDeleteContactRequest(sub)} className="p-2 text-gray-500 hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
                                    </div>
                                    <p className="bg-gray-900/50 p-5 rounded-2xl whitespace-pre-wrap text-sm text-gray-300 border border-white/5 leading-relaxed shadow-inner">{sub.message}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {activeTab === 'sitemaps' && (
                    <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
                        <div className="bg-gray-800 p-8 rounded-[2rem] border border-gray-700 shadow-2xl">
                            <h3 className="text-lg font-black uppercase tracking-tighter mb-6 flex items-center"><FileCode className="mr-2 text-green-500"/> SEO Engine</h3>
                            <p className="text-sm text-gray-400 mb-8">Generate updated sitemaps to index all newly published books and exams in Google Search.</p>
                            <button onClick={handleGenerateSitemaps} disabled={isGeneratingSitemaps} className="bg-green-600 hover:bg-green-500 text-white font-black px-8 py-4 rounded-2xl uppercase tracking-widest text-xs flex items-center gap-2 shadow-xl mb-8">
                                {isGeneratingSitemaps ? <Loader2 className="animate-spin" /> : <RefreshCw size={16}/>}
                                Crawl & Generate
                            </button>
                            
                            {sitemapXml && (
                                <div className="space-y-6">
                                    <div className="bg-gray-900 p-6 rounded-2xl border border-white/5">
                                        <div className="flex justify-between items-center mb-4"><span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">sitemap.xml</span><button onClick={() => { navigator.clipboard.writeText(sitemapXml); setSitemapCopied(true); setTimeout(()=>setSitemapCopied(false), 2000); }} className="text-blue-400 font-bold text-xs">{sitemapCopied ? 'Copied!' : 'Copy XML'}</button></div>
                                        <textarea readOnly value={sitemapXml} className="w-full h-40 bg-black/40 text-[10px] font-mono p-4 rounded-xl text-gray-400 border border-white/5 outline-none resize-none scroll-thin" />
                                    </div>
                                    <div className="bg-gray-900 p-6 rounded-2xl border border-white/5">
                                        <div className="flex justify-between items-center mb-4"><span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">robots.txt</span><button onClick={() => copyToClipboard(robotsTxt)} className="text-blue-400 font-bold text-xs">Copy Text</button></div>
                                        <textarea readOnly value={robotsTxt} className="w-full h-20 bg-black/40 text-[10px] font-mono p-4 rounded-xl text-gray-400 border border-white/5 outline-none resize-none" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="max-w-xl mx-auto space-y-8 animate-fade-in">
                        {/* Maintenance Section */}
                        <div className="bg-gray-800 p-8 rounded-[2rem] border border-gray-700 shadow-2xl">
                            <h3 className="text-lg font-black uppercase tracking-tighter mb-6 flex items-center"><ShieldAlert className="mr-2 text-red-500"/> System Guard</h3>
                            
                            <div className="flex items-center justify-between p-5 bg-gray-900 rounded-2xl border border-white/5 mb-4">
                                <div><p className="font-bold text-white text-sm">Lockdown Mode</p><p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Admins Only Access</p></div>
                                <button onClick={() => handleToggleMaintenance(!isMaintenanceMode)} disabled={isSavingSettings} className={`px-8 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${isMaintenanceMode ? 'bg-red-600 text-white shadow-xl shadow-red-900/40' : 'bg-gray-700 text-gray-400'}`}>{isMaintenanceMode ? 'ON' : 'OFF'}</button>
                            </div>

                            <div className="flex items-center justify-between p-5 bg-gray-900 rounded-2xl border border-white/5 mb-6">
                                <div><p className="font-bold text-white text-sm">Registry Sync</p><p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Rebuild Library Mapping</p></div>
                                <button onClick={handleRebuildRegistry} disabled={isRebuilding} className="px-8 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg flex items-center gap-2">
                                    {isRebuilding ? <Loader2 className="animate-spin" size={14} /> : <Database size={14} />}
                                    Rebuild
                                </button>
                            </div>

                            <div className="p-5 bg-gray-900 rounded-2xl border border-white/5">
                                <div className="flex items-center justify-between mb-2"><div><p className="font-bold text-white text-sm">Cloud Purge</p><p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Flush Expired Assets</p></div><button onClick={handleCleanupQuestions} disabled={isCleaning} className="px-6 py-2 bg-gray-800 hover:bg-red-900/20 text-red-400 border border-red-900/50 rounded-xl font-black text-[10px] uppercase tracking-widest">{isCleaning ? '...' : 'Execute'}</button></div>
                                {cleanupResult && <p className="text-[10px] text-green-400 font-mono mt-2">{cleanupResult}</p>}
                            </div>
                        </div>

                        {/* Exam Dates Section */}
                        <div className="bg-gray-800 p-8 rounded-[2rem] border border-gray-700 shadow-2xl">
                            <h3 className="text-lg font-black uppercase tracking-tighter mb-6 flex items-center"><Calendar className="mr-2 text-orange-500"/> Exam Schedules</h3>
                            <div className="space-y-4 mb-8">
                                {examDates.map((exam) => (
                                    <div key={exam.name} className="p-4 bg-gray-900 rounded-2xl border border-white/5">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2">{exam.name} Start Date</label>
                                        <input type="date" value={exam.date} onChange={(e) => handleUpdateExamDate(exam.name, e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white text-sm outline-none focus:border-orange-500" />
                                    </div>
                                ))}
                            </div>
                            <button onClick={handleSaveSettings} disabled={isSavingSettings} className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-xl transition-all flex items-center justify-center gap-2">
                                {isSavingSettings ? <Loader2 className="animate-spin" /> : <Check size={18}/>} Save System Config
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* DELETE ANNOUNCEMENT MODAL */}
            <Modal isOpen={showDeleteAnnModal} onClose={() => setShowDeleteAnnModal(false)} title="Delete Announcement?">
                <div className="text-center p-2">
                    <div className="bg-red-900/20 p-5 rounded-full w-20 h-20 mx-auto flex items-center justify-center mb-6 border border-red-500/30">
                        <AlertTriangle size={40} className="text-red-500" />
                    </div>
                    <p className="text-gray-300 mb-8">This will permanently remove the broadcast for all learners. Are you sure?</p>
                    <div className="flex flex-col gap-3">
                        <button onClick={confirmDeleteAnnouncement} className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl uppercase tracking-widest text-xs">Confirm Delete</button>
                        <button onClick={() => setShowDeleteAnnModal(false)} className="text-gray-500 font-bold uppercase tracking-widest text-[10px] py-2">Abort</button>
                    </div>
                </div>
            </Modal>

            {/* LEARNER PROFILE MODAL */}
            <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title="Learner Dossier">
                {selectedUser && (
                    <div className="text-center p-2">
                        <div className="mb-6 relative inline-block">
                            <img src={selectedUser.profilePictureUrl || 'https://via.placeholder.com/100'} className={`w-24 h-24 rounded-3xl border-4 object-cover mx-auto ${isFullPro(selectedUser) ? 'border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)]' : 'border-gray-700'}`} />
                            {isFullPro(selectedUser) && <div className="absolute -top-1 -right-1 bg-yellow-500 p-1.5 rounded-full border-4 border-gray-800 shadow-lg"><Crown size={14} className="text-black" /></div>}
                        </div>
                        <h2 className="text-2xl font-black text-white mb-1 tracking-tighter uppercase">{selectedUser.username}</h2>
                        <p className="text-gray-500 text-[10px] font-black mb-8 tracking-widest uppercase">{selectedUser.email}</p>

                        {/* ACADEMIC STATS SECTION */}
                        <div className="grid grid-cols-3 gap-2 mb-8">
                            {(() => {
                                const stats = getUserAcademicStats(selectedUser);
                                return (
                                    <>
                                        <div className="bg-gray-900 p-3 rounded-2xl border border-white/5 text-center">
                                            <p className="text-[8px] text-gray-500 font-black uppercase mb-1">Books Read</p>
                                            <p className="text-xl font-black text-white">{stats.booksRead}</p>
                                        </div>
                                        <div className="bg-gray-900 p-3 rounded-2xl border border-white/5 text-center">
                                            <p className="text-[8px] text-gray-500 font-black uppercase mb-1">Tests Taken</p>
                                            <p className="text-xl font-black text-white">{stats.examsTaken}</p>
                                        </div>
                                        <div className="bg-gray-900 p-3 rounded-2xl border border-white/5 text-center relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-orange-600/5 group-hover:bg-orange-600/10 transition-colors"></div>
                                            <p className="text-[8px] text-orange-500 font-black uppercase mb-1 relative">CBT Grade</p>
                                            <p className="text-xl font-black text-orange-400 relative">{stats.grade}</p>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-8">
                            <div className="bg-gray-900 p-4 rounded-2xl border border-white/5 text-left group">
                                <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1 group-hover:text-yellow-500 transition-colors">Knowledge Sparks</p>
                                <p className="text-2xl font-black text-yellow-500">{selectedUser.sparks || 0}</p>
                            </div>
                            <div className="bg-gray-900 p-4 rounded-2xl border border-white/5 text-left group">
                                <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1 group-hover:text-green-500 transition-colors">Energy Cells</p>
                                <p className="text-2xl font-black text-green-400">{selectedUser.energy || 0}</p>
                            </div>
                        </div>

                        {/* TREASURY ACTIONS */}
                        <div className="bg-gray-900 p-6 rounded-[2.5rem] border border-white/5 mb-8 text-left space-y-6 shadow-inner">
                            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center"><Coins className="mr-2 text-orange-500" size={14}/> Treasury Actions</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[9px] text-gray-400 font-bold uppercase mb-2 block">Mint Sparks</label>
                                    <div className="flex gap-2">
                                        <input type="number" value={grantSparksVal} onChange={e=>setGrantSparksVal(e.target.value)} placeholder="0" className="flex-1 bg-gray-800 border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-yellow-500/50 text-sm font-mono" />
                                        <button onClick={() => handleGrantCurrency('sparks')} disabled={isProcessingUser || !grantSparksVal} className="bg-yellow-600 hover:bg-yellow-500 px-6 rounded-xl text-black font-black text-[10px] uppercase transition-all shadow-lg active:scale-95 disabled:opacity-50">Add</button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[9px] text-gray-400 font-bold uppercase mb-2 block">Recharge Energy</label>
                                    <div className="flex gap-2">
                                        <input type="number" value={grantEnergyVal} onChange={e=>setGrantEnergyVal(e.target.value)} placeholder="0" className="flex-1 bg-gray-800 border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-green-500/50 text-sm font-mono" />
                                        <button onClick={() => handleGrantCurrency('energy')} disabled={isProcessingUser || !grantEnergyVal} className="bg-green-600 hover:bg-green-500 px-6 rounded-xl text-white font-black text-[10px] uppercase transition-all shadow-lg active:scale-95 disabled:opacity-50">Add</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-gray-800">
                             <div className="flex gap-2">
                                <button onClick={() => handleGrantPro(7)} disabled={isProcessingUser} className="flex-1 py-4 bg-blue-900/30 text-blue-400 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all">+7 Days</button>
                                <button onClick={() => handleGrantPro(30)} disabled={isProcessingUser} className="flex-1 py-4 bg-blue-900/30 text-blue-400 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all">+30 Days</button>
                             </div>
                             {isFullPro(selectedUser) && <button onClick={() => updateUserSubscriptionStatus(selectedUser.uid, 'free')} disabled={isProcessingUser} className="w-full py-4 bg-gray-800 text-yellow-500 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-yellow-500/20">Revoke Pro Status</button>}
                             <button onClick={() => setConfirmDeleteUser(true)} className="w-full py-4 bg-red-900/20 text-red-500 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-red-500/20 transition-all hover:bg-red-600 hover:text-white">Permanent Deletion</button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* DELETE USER CONFIRM */}
            {confirmDeleteUser && (
                <div className="fixed inset-0 z-[2000] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 text-center animate-fade-in">
                    <div className="max-w-sm w-full space-y-8">
                        <div className="bg-red-900/20 p-8 rounded-full border-4 border-red-500 w-32 h-32 mx-auto flex items-center justify-center shadow-[0_0_50px_rgba(239,68,68,0.3)] animate-pulse"><Trash2 size={64} className="text-red-500" /></div>
                        <div><h3 className="text-3xl font-black text-white mb-2 uppercase italic tracking-tighter">Terminal Command</h3><p className="text-gray-400 text-sm leading-relaxed">This will permanently wipe <strong>{selectedUser?.username}</strong> from the mainframe. This operation cannot be reversed.</p></div>
                        <div className="flex flex-col gap-3 pt-6"><button onClick={handleDeleteUser} className="w-full py-5 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-xs">Execute Wipe</button><button onClick={() => setConfirmDeleteUser(false)} className="text-gray-500 hover:text-white text-xs font-bold uppercase tracking-widest">Abort Process</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ModeratorPage;
