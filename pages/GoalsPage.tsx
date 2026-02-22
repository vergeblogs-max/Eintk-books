
import React, { useState, useEffect, useMemo } from 'react';
import type { User } from 'firebase/auth';
import type { UserData, WeeklyGoal } from '../types';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Target, BookCheck, FileQuestion, 
  CircleCheck, Zap, Flame, Trophy, Layers, 
  ChevronRight, Sparkles, Calendar, Activity, 
  Settings2, Loader2, Info
} from 'lucide-react';
import { setWeeklyGoal } from '../services/firestoreService';
import LoadingSpinner from '../components/LoadingSpinner';
import CircularProgress from '../components/CircularProgress';

interface GoalsPageProps {
  user: User | null;
  userData: UserData | null;
}

const getWeekId = (date: Date): string => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-${weekNo}`;
};

const GoalsPage: React.FC<GoalsPageProps> = ({ user, userData }) => {
    const navigate = useNavigate();
    const [readGoal, setReadGoal] = useState(3);
    const [examGoal, setExamGoal] = useState(2);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const currentWeekId = getWeekId(new Date());
    const userGoal = userData?.weeklyGoal;
    
    // Check if the saved goal is from the current week
    const hasCurrentGoal = userGoal && userGoal.weekId === currentWeekId;

    useEffect(() => {
        if (hasCurrentGoal && userGoal) {
            setReadGoal(userGoal.readGoal);
            setExamGoal(userGoal.examGoal);
            setIsEditing(false); 
        } else {
            setIsEditing(true); 
        }
    }, [hasCurrentGoal, userGoal]);

    if (!user || !userData) {
        return <div className="flex justify-center items-center h-[80vh] bg-gray-900"><LoadingSpinner /></div>;
    }

    if (userData.subscriptionStatus !== 'pro' && userData.subscriptionStatus !== 'day_pass') {
        navigate('/upgrade');
        return null;
    }
    
    const handleSetGoals = async () => {
        setIsSaving(true);
        const newGoal: WeeklyGoal = {
            weekId: currentWeekId,
            readGoal,
            examGoal,
            readProgress: (hasCurrentGoal && userGoal) ? userGoal.readProgress : 0,
            examProgress: (hasCurrentGoal && userGoal) ? userGoal.examProgress : 0,
        };
        await setWeeklyGoal(user.uid, newGoal);
        setIsSaving(false);
        setIsEditing(false);
    };
    
    const readProgressPercent = (hasCurrentGoal && userGoal) ? Math.min((userGoal.readProgress / userGoal.readGoal) * 100, 100) : 0;
    const examProgressPercent = (hasCurrentGoal && userGoal) ? Math.min((userGoal.examProgress / userGoal.examGoal) * 100, 100) : 0;

    const getIntensityLabel = (val: number) => {
        if (val <= 2) return "Tactical Focus";
        if (val <= 5) return "Balanced Grind";
        if (val <= 8) return "High Intensity";
        return "Legendary Pursuit";
    };

    return (
        <div className="max-w-xl mx-auto pb-20 px-4 animate-fade-in">
            {/* Header Area */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="p-3 rounded-2xl bg-gray-800 border border-white/5 text-orange-500 hover:bg-gray-700 transition-all mr-4 shadow-lg active:scale-90"
                    >
                        <ArrowLeft size={22} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-white uppercase tracking-tighter italic leading-none">Mission Control</h1>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em] mt-1">Weekly Targets</p>
                    </div>
                </div>
                <div className="bg-gray-800 px-4 py-2 rounded-2xl border border-white/5 flex items-center gap-2 shadow-inner">
                    <Calendar size={14} className="text-orange-500" />
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                        Week {currentWeekId.split('-')[1]}
                    </span>
                </div>
            </div>

            {isEditing ? (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="bg-gray-800/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                            <Settings2 size={140} className="text-orange-500" />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-3 bg-orange-600/20 rounded-2xl border border-orange-500/20">
                                    <Sparkles size={20} className="text-orange-500 animate-pulse" />
                                </div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tighter italic">Forge New Goal</h3>
                            </div>

                            <div className="space-y-10">
                                {/* Books Slider */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div className="flex items-center gap-2">
                                            <div className="bg-blue-600/20 p-1.5 rounded-lg">
                                                <BookCheck size={16} className="text-blue-400" />
                                            </div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Knowledge Blocks</label>
                                        </div>
                                        <span className="text-2xl font-black text-blue-400 tracking-tighter">{readGoal} Books</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="1" 
                                        max="10" 
                                        value={readGoal} 
                                        onChange={e => setReadGoal(Number(e.target.value))} 
                                        className="w-full h-2 bg-gray-900 rounded-full appearance-none cursor-pointer accent-blue-500"
                                    />
                                    <div className="flex justify-between text-[8px] font-black text-gray-600 uppercase tracking-widest">
                                        <span>Light</span>
                                        <span>{getIntensityLabel(readGoal)}</span>
                                        <span>Heavy</span>
                                    </div>
                                </div>

                                {/* Exams Slider */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div className="flex items-center gap-2">
                                            <div className="bg-orange-600/20 p-1.5 rounded-lg">
                                                <FileQuestion size={16} className="text-orange-500" />
                                            </div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tactical Drills</label>
                                        </div>
                                        <span className="text-2xl font-black text-orange-500 tracking-tighter">{examGoal} Tests</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="1" 
                                        max="10" 
                                        value={examGoal} 
                                        onChange={e => setExamGoal(Number(e.target.value))} 
                                        className="w-full h-2 bg-gray-900 rounded-full appearance-none cursor-pointer accent-orange-600"
                                    />
                                    <div className="flex justify-between text-[8px] font-black text-gray-600 uppercase tracking-widest">
                                        <span>Focus</span>
                                        <span>{getIntensityLabel(examGoal)}</span>
                                        <span>Extreme</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={handleSetGoals} 
                            disabled={isSaving} 
                            className="w-full py-5 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-black rounded-3xl flex items-center justify-center gap-3 shadow-2xl shadow-orange-900/40 transform active:scale-95 transition-all uppercase tracking-[0.2em] text-xs"
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Zap size={18} fill="currentColor"/>}
                            Activate Mission
                        </button>
                        {hasCurrentGoal && (
                            <button 
                                onClick={() => setIsEditing(false)} 
                                className="w-full py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors"
                            >
                                Return to Dashboard
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                userGoal && (
                    <div className="space-y-6 animate-fade-in-up">
                        {/* Summary Dashboard */}
                        <div className="bg-gray-800/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                <Activity size={160} className="text-green-500" />
                            </div>

                            <div className="relative z-10 flex flex-col items-center">
                                <div className="flex items-center gap-2 mb-8 bg-gray-900 px-4 py-1.5 rounded-full border border-white/5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Syncing Progress</span>
                                </div>

                                <div className="grid grid-cols-2 gap-10 w-full mb-12">
                                    <div className="flex flex-col items-center">
                                        <CircularProgress 
                                            percentage={readProgressPercent} 
                                            size={110} 
                                            strokeWidth={8} 
                                            color="#60a5fa"
                                        />
                                        <p className="mt-4 text-[9px] font-black text-gray-500 uppercase tracking-widest">Books Deployment</p>
                                        <h4 className="text-xl font-black text-white tracking-tighter mt-1">{userGoal.readProgress} <span className="text-xs opacity-30 font-bold">/ {userGoal.readGoal}</span></h4>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <CircularProgress 
                                            percentage={examProgressPercent} 
                                            size={110} 
                                            strokeWidth={8} 
                                            color="#f97316"
                                        />
                                        <p className="mt-4 text-[9px] font-black text-gray-500 uppercase tracking-widest">Tests Cleared</p>
                                        <h4 className="text-xl font-black text-white tracking-tighter mt-1">{userGoal.examProgress} <span className="text-xs opacity-30 font-bold">/ {userGoal.examGoal}</span></h4>
                                    </div>
                                </div>

                                <div className="w-full grid grid-cols-1 gap-3">
                                    <div className="bg-gray-900/50 p-4 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-orange-500/20 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-orange-900/20 rounded-xl text-orange-400"><Activity size={16}/></div>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mission Status</span>
                                        </div>
                                        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${readProgressPercent + examProgressPercent >= 200 ? 'bg-green-600 text-white' : 'bg-orange-600/20 text-orange-400'}`}>
                                            {readProgressPercent + examProgressPercent >= 200 ? 'Accomplished' : 'Active'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={() => setIsEditing(true)} 
                            className="w-full py-5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-black rounded-3xl flex items-center justify-center gap-3 border border-white/5 transition-all active:scale-95 uppercase tracking-widest text-[10px]"
                        >
                            <Settings2 size={16} />
                            Modify Objectives
                        </button>

                        <div className="p-6 bg-blue-900/10 rounded-2xl border border-blue-500/20 flex gap-4 items-start">
                            <Info className="text-blue-400 shrink-0" size={18} />
                            <p className="text-[11px] text-blue-200/70 leading-relaxed font-medium">
                                Weekly goals reset every **Monday at 00:00**. Complete your targets before then to stay on track and grow your Knowledge Tree.
                            </p>
                        </div>
                    </div>
                )
            )}

            <style>{`
                input[type='range']::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 24px;
                    height: 24px;
                    background: white;
                    border-radius: 50%;
                    cursor: pointer;
                    border: 4px solid currentColor;
                    box-shadow: 0 0 10px rgba(0,0,0,0.5);
                }
            `}</style>
        </div>
    );
};

export default GoalsPage;
