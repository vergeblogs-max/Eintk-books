
import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { 
    Crown, ArrowLeft, Loader2, Bookmark, Palette, Timer, Target, Zap, 
    FileChartColumn, Swords, Gamepad2, Brain, BookOpen, Notebook, 
    Layers, Star, Check, Sparkles, ShieldCheck, CalendarClock, 
    Cpu, Globe, Activity, Cloud
} from 'lucide-react';
import { createPaymentToken } from '../services/firestoreService';
import type { UserData } from '../types';

interface UpgradePageProps {
    user: User | null;
    userData: UserData | null;
}

const UpgradePage: React.FC<UpgradePageProps> = ({ user, userData }) => {
    const navigate = useNavigate();
    const [loadingPlan, setLoadingPlan] = useState<'monthly' | 'termly' | null>(null);
    const [error, setError] = useState('');

    // Utility for safe date conversion
    const safeDate = (v: any) => {
        if (!v) return null;
        if (v.toDate) return v.toDate();
        if (v.seconds) return new Date(v.seconds * 1000);
        return new Date(v);
    };

    const trialExpiry = safeDate(userData?.trialExpiryDate);
    
    // Pro Status Logic
    const isPro = userData?.subscriptionStatus === 'pro';
    const proExpiry = safeDate(userData?.proExpiryDate);
    const activeExpiryDate = proExpiry || trialExpiry;
    const isProActive = isPro && activeExpiryDate && activeExpiryDate > new Date();

    const handleUpgrade = async (plan: 'monthly' | 'termly') => {
        if (!user) {
            navigate('/auth', { state: { from: '/upgrade' }});
            return;
        }

        setLoadingPlan(plan);
        setError('');

        try {
            const token = await createPaymentToken(user.uid);
            localStorage.setItem('paymentToken', token);
            localStorage.setItem('paymentPlan', plan);

            const links = {
                monthly: 'https://selar.com/79ek71xc73', 
                termly: 'https://selar.com/u7a2311s14',
            };
            
            const baseUrl = links[plan];
            if (!baseUrl || baseUrl === '#') {
                 setError('Payment links are not configured yet. Please check back later.');
                 setLoadingPlan(null);
                 localStorage.removeItem('paymentToken');
                 localStorage.removeItem('paymentPlan');
                 return;
            }

            const returnPath = plan === 'monthly' 
                ? '/*@DLVXAAqfm78FXbW0f)*+e9p3wyec' 
                : '/5KJ3-0ztSU!W=GvN5GU+NJ+zQe%y_5';

            const returnUrl = `${window.location.origin}/#${returnPath}`;
            const finalUrl = `${baseUrl}?return_url=${encodeURIComponent(returnUrl)}`;

            window.location.href = finalUrl;

        } catch (err) {
            console.error("Failed to initiate upgrade:", err);
            setError('Could not start the upgrade process. Please try again.');
            setLoadingPlan(null);
        }
    };

    const missionFeatures = [
        { icon: Brain, title: "Authority Textbooks", description: "Unlock definitive academic 'Complete' editions. While free users get summaries, Pro unlocks the authoritative books needed for A1 performance." },
        { icon: Activity, title: "Full Mission Trajectory", description: "Access your entire mission path. Free users are capped on daily deployment, but Pro removes all limits for deep syllabus coverage." },
        { icon: Layers, title: "Advanced Mastery Modules", description: "Every chapter in your mission comes with deep-dive flashcard decks and advanced quizzes to lock in knowledge." },
        { icon: Target, title: "Adaptive Mission Remapping", description: "If you fall behind, the Aether Core automatically recalibrates your entire study timeline to ensure you finish before exam day." },
    ];

    const tacticalTools = [
        { icon: Cpu, title: "30,000 Energy Cells", description: "Power your AI Tutor for a full month. Get deep explanations, complex math solutions, and image OCR daily." },
        { icon: Swords, title: "Arena Command", description: "Host private Battle Arena duels. Invite friends and control the sabotage rules in real-time academic combat." },
        { icon: Gamepad2, title: "Arcade Power-Ups", description: "Unlimited Hints, 50/50s, and Solves in the Arcade. Dominate the global leaderboard with zero restrictions." },
        { icon: FileChartColumn, title: "Psychological Analytics", description: "Track your academic growth with detailed grade reports and performance heatmaps across all subjects." },
        { icon: Palette, title: "Neural Customization", description: "Exclusive access to OLED Night Mode, Dyslexic-friendly fonts, and animated Knowledge Tree skins." },
        { icon: Notebook, title: "Encrypted Study Journal", description: "A private, secure space to log your daily reflections and track your personal academic journey." },
    ];
    
    const calculateDaysLeft = (date: Date) => {
        const timeLeft = date.getTime() - new Date().getTime();
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        return Math.max(0, days);
    };

    return (
        <div className="max-w-5xl mx-auto py-8 text-gray-300 px-4">
             <button onClick={() => navigate(-1)} className="flex items-center space-x-2 text-orange-500 mb-8 hover:text-orange-400 transition-colors">
                <ArrowLeft size={20}/>
                <span>Back</span>
            </button>

            {isProActive && activeExpiryDate && (
                <div className="bg-gradient-to-r from-gray-800 to-gray-900 border border-green-500/50 text-center p-8 rounded-[2.5rem] mb-16 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-green-500/10 rounded-full blur-3xl"></div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="text-left">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="bg-green-500/20 p-2 rounded-full">
                                    <ShieldCheck size={24} className="text-green-400" />
                                </div>
                                <span className="font-bold text-green-400 uppercase tracking-wider text-sm">Protocol: Active</span>
                            </div>
                            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Pro Operative</h2>
                            <p className="text-gray-400 mt-2 max-w-lg">
                                Your Aether Mission Path is fully unlocked. Extend your subscription now to stack additional days to your balance.
                            </p>
                        </div>
                        <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700 flex items-center space-x-4 min-w-[250px]">
                            <div className="bg-gray-700 p-3 rounded-xl">
                                <CalendarClock size={32} className="text-orange-500" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-bold uppercase">Time Remaining</p>
                                <p className="text-2xl font-black text-white">{calculateDaysLeft(activeExpiryDate)} Days</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="text-center mb-16 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-orange-600/20 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="inline-block p-4 rounded-full bg-gray-800 border border-gray-700 shadow-2xl mb-6 relative">
                    <Crown size={48} className="text-yellow-400" fill="currentColor" />
                    <Sparkles className="absolute -top-2 -right-2 text-orange-400 animate-bounce" size={24} />
                </div>
                <h1 className="text-5xl md:text-6xl font-black text-white mb-4 tracking-tighter uppercase italic">
                    Unlock Aether Core
                </h1>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
                    Join the elite learners mastering the curriculum with the most advanced AI mission system in Nigeria.
                </p>
            </div>

            {/* Pricing Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-20 relative z-10">
                <div className="bg-gray-800/80 backdrop-blur-sm p-8 rounded-[2.5rem] border border-gray-700 flex flex-col hover:border-gray-500 transition-all hover:shadow-2xl hover:-translate-y-1 group">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">Monthly</h2>
                            <p className="text-gray-400 text-xs mt-1 uppercase font-bold tracking-widest">Standard Deployment</p>
                        </div>
                        <div className="bg-gray-700 p-2 rounded-lg">
                            <Timer className="text-gray-400 group-hover:text-white transition-colors" size={24} />
                        </div>
                    </div>
                    <div className="my-6">
                        <p className="text-5xl font-black text-white tracking-tighter">
                            ₦1,000 <span className="text-lg font-medium text-gray-500">/ mo</span>
                        </p>
                    </div>
                    <ul className="space-y-4 mb-8 flex-grow">
                        <li className="flex items-center text-gray-300 text-sm"><Check size={18} className="text-green-500 mr-3 flex-shrink-0"/> <span><strong>Full Mission</strong> Trajectory</span></li>
                        <li className="flex items-center text-gray-300 text-sm"><Check size={18} className="text-green-500 mr-3 flex-shrink-0"/> <span><strong>Authority</strong> Textbooks</span></li>
                        <li className="flex items-center text-gray-300 text-sm"><Check size={18} className="text-green-500 mr-3 flex-shrink-0"/> <span><strong>30,000</strong> AI Energy Cells</span></li>
                        <li className="flex items-center text-gray-300 text-sm"><Check size={18} className="text-green-500 mr-3 flex-shrink-0"/> <span>Background <strong>Asset Forging</strong></span></li>
                    </ul>
                    <button onClick={() => handleUpgrade('monthly')} disabled={loadingPlan === 'monthly'} className="w-full bg-gray-700 hover:bg-white hover:text-black text-white font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-xs flex items-center justify-center">
                         {loadingPlan === 'monthly' ? <Loader2 className="animate-spin" /> : 'Activate Protocol'}
                    </button>
                </div>

                <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-1 rounded-[2.5rem] shadow-orange-900/40 shadow-2xl relative transform md:-translate-y-4 hover:-translate-y-6 transition-transform duration-300">
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-1.5 text-[10px] font-black tracking-[0.2em] rounded-full shadow-lg flex items-center whitespace-nowrap uppercase">
                        <Star size={14} className="mr-1 fill-current"/> High Intensity
                    </div>
                    <div className="bg-gray-900 rounded-[2.4rem] p-8 h-full flex flex-col border border-orange-500/30">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-2xl font-bold text-white text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400 uppercase tracking-tighter">Termly (3 Months)</h2>
                                <p className="text-gray-400 text-xs mt-1 uppercase font-bold tracking-widest">Full Syllabus Siege</p>
                            </div>
                            <div className="bg-orange-900/30 p-2 rounded-lg">
                                <Zap className="text-orange-500" size={24} />
                            </div>
                        </div>
                        <div className="my-6">
                            <p className="text-5xl font-black text-white tracking-tighter">
                                ₦2,500 <span className="text-lg font-medium text-gray-500">/ term</span>
                            </p>
                        </div>
                        <ul className="space-y-4 mb-8 flex-grow">
                            <li className="flex items-center text-white text-sm font-medium"><Check size={18} className="text-orange-400 mr-3 flex-shrink-0"/> <span><strong>Full Mission</strong> Trajectory</span></li>
                            <li className="flex items-center text-white text-sm font-medium"><Check size={18} className="text-orange-400 mr-3 flex-shrink-0"/> <span><strong>Authority</strong> Textbooks</span></li>
                            <li className="flex items-center text-white text-sm font-medium"><Check size={18} className="text-orange-400 mr-3 flex-shrink-0"/> <span><strong>30,000</strong> AI Energy Cells</span></li>
                            <li className="flex items-center text-green-300 text-sm font-black bg-green-900/30 p-3 rounded-2xl border border-green-500/30 uppercase tracking-widest text-[9px]"><Sparkles size={16} className="mr-2"/> Save ₦500 vs Monthly</li>
                        </ul>
                        <button onClick={() => handleUpgrade('termly')} disabled={loadingPlan === 'termly'} className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-orange-500 text-white font-black py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center uppercase tracking-widest text-xs">
                            {loadingPlan === 'termly' ? <Loader2 className="animate-spin" /> : 'Initiate Full Term'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Offline/Syncing Section - Highlighted as requested */}
            <div className="max-w-4xl mx-auto mb-20">
                <div className="bg-gray-800/40 backdrop-blur-md border border-blue-500/30 rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Cloud size={140} className="text-blue-500"/></div>
                    <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                        <div className="bg-blue-600/20 p-6 rounded-[2rem] border border-blue-500/30">
                            <Cloud size={48} className="text-blue-400 animate-pulse" />
                        </div>
                        <div className="text-center md:text-left">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic mb-2">Automated Operational Vault</h3>
                            <p className="text-gray-400 text-sm leading-relaxed max-w-xl">
                                Pro members never have to manually manage downloads. Our <strong>Asset Forging Engine</strong> runs in the background, automatically syncing every book, exam, and asset in your <strong>Mission Path</strong> to your device. Master your entire curriculum offline, anytime, without touching your data.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Advanced Mission Features */}
            <div className="mt-24 mb-20">
                <h3 className="text-xs font-black text-orange-500 text-center uppercase tracking-[0.4em] mb-4">Core Operative Access</h3>
                <h4 className="text-3xl font-black text-center text-white mb-12 uppercase italic tracking-tighter">Advanced Mission Path</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                    {missionFeatures.map((feature, index) => (
                        <div key={index} className="flex items-start group p-5 bg-gray-800/30 rounded-3xl border border-white/5 hover:border-orange-500/30 transition-all">
                             <div className="p-3 bg-gray-900 rounded-2xl mr-5 border border-white/5 group-hover:border-orange-500/50 transition-all shadow-md">
                                <feature.icon className="text-orange-500 h-6 w-6 flex-shrink-0 group-hover:scale-110 transition-transform" />
                             </div>
                             <div>
                                <p className="font-black text-white uppercase tracking-tight mb-1 group-hover:text-orange-400 transition-colors">{feature.title}</p>
                                <p className="text-xs text-gray-500 leading-relaxed font-medium">{feature.description}</p>
                             </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tactical Tools Features */}
            <div className="mt-24 mb-20">
                <h3 className="text-xs font-black text-blue-500 text-center uppercase tracking-[0.4em] mb-4">Technical Assets</h3>
                <h4 className="text-3xl font-black text-center text-white mb-12 uppercase italic tracking-tighter">Tactical Tools</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    {tacticalTools.map((feature, index) => (
                        <div key={index} className="flex flex-col group p-6 bg-gray-800/20 rounded-[2rem] border border-white/5 hover:border-blue-500/30 transition-all shadow-xl">
                             <div className="p-3 bg-gray-900 rounded-xl w-fit mb-4 border border-white/5 group-hover:border-blue-500/50 transition-all">
                                <feature.icon className="text-blue-500 h-5 w-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                             </div>
                             <p className="font-black text-white uppercase tracking-tight mb-2 group-hover:text-blue-400 transition-colors text-sm">{feature.title}</p>
                             <p className="text-[11px] text-gray-500 leading-relaxed font-medium">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="mt-20 text-center border-t border-gray-800 pt-10">
                <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Proprietary Mission Logistics v3.1</p>
                <p className="text-gray-700 text-[9px] mt-2">Secure payments processed by Selar. Instant protocol activation upon verification.</p>
            </div>
        </div>
    );
};

export default UpgradePage;
