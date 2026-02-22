
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Zap, Calendar, Star, Check, ArrowRight, Shield, Swords, 
  Target, Rocket, Brain, Loader2, Sparkles, ChevronRight,
  Minus, Plus, Clock, AlertCircle, Info
} from 'lucide-react';
import { NIGERIAN_CURRICULUM_SUBJECTS } from '../constants';
import { generateGranularStudyPlan } from '../services/schedulerService';
import { updateUserStudyPlan } from '../services/firestoreService';
import type { User } from 'firebase/auth';
import type { UserData, StudyPlan } from '../types';
import { Timestamp } from 'firebase/firestore';

interface AetherSetupPageProps {
  user: User | null;
  userData: UserData | null;
}

const PLAN_TYPES = [
    { id: 'jamb_pulse', name: 'JAMB Pulse', icon: Rocket, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', subjects: 4, desc: 'Master English + 3 core subjects.' },
    { id: 'waec_zenith', name: 'WAEC Zenith', icon: Shield, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30', subjects: 9, desc: 'English + 8 subjects for top grades.' },
    { id: 'nexus', name: 'The Nexus', icon: Swords, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/30', subjects: 9, desc: 'JAMB & WAEC combined mastery.' },
    { id: 'omni', name: 'Omniscience', icon: Brain, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30', subjects: -1, desc: 'Customize your own path.' }
];

const MIN_MONTHS: Record<string, number> = {
    jamb_pulse: 2,
    waec_zenith: 3,
    nexus: 3,
    omni: 1
};

const AetherSetupPage: React.FC<AetherSetupPageProps> = ({ user, userData }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['English Language']);
    
    // Duration State
    const [durationMonths, setDurationMonths] = useState(1);
    const [durationDays, setDurationDays] = useState(0);
    
    const [intensity, setIntensity] = useState(2);
    const [excludeWeekends, setExcludeWeekends] = useState(false);
    const [isForging, setIsForging] = useState(false);

    useEffect(() => {
        if (!user) navigate('/auth');
        if (userData?.studyPlan) navigate('/setup');
    }, [user, userData, navigate]);

    // Reactive snapping for minimum months
    const minRequiredMonths = useMemo(() => {
        return selectedType ? MIN_MONTHS[selectedType] : 1;
    }, [selectedType]);

    const handleSelectPlan = (id: string) => {
        setSelectedType(id);
        const min = MIN_MONTHS[id];
        if (durationMonths < min) {
            setDurationMonths(min);
            setDurationDays(0);
        }
    };

    const targetSubjectCount = useMemo(() => {
        const plan = PLAN_TYPES.find(p => p.id === selectedType);
        return plan ? plan.subjects : 0;
    }, [selectedType]);

    const goalDate = useMemo(() => {
        const date = new Date();
        date.setMonth(date.getMonth() + durationMonths);
        date.setDate(date.getDate() + durationDays);
        return date;
    }, [durationMonths, durationDays]);

    const totalDays = useMemo(() => {
        const now = new Date();
        now.setHours(0,0,0,0);
        const goal = new Date(goalDate);
        goal.setHours(0,0,0,0);
        return Math.round((goal.getTime() - now.getTime()) / (1000 * 3600 * 24));
    }, [goalDate]);

    const toggleSubject = (s: string) => {
        if (s === 'English Language' || s === 'General') return;
        setSelectedSubjects(prev => 
            prev.includes(s) ? prev.filter(i => i !== s) : [...prev, s]
        );
    };

    const handleForgePlan = async () => {
        if (!user || !selectedType || totalDays < 30) return;
        setIsForging(true);
        try {
            const finalSubjectList = [
                ...selectedSubjects.filter(s => s === 'English Language'),
                ...selectedSubjects.filter(s => s !== 'English Language').sort(),
                'General'
            ];
            
            const schedules = generateGranularStudyPlan(finalSubjectList, totalDays, intensity, excludeWeekends);
            
            const newPlan: StudyPlan = {
                type: selectedType as any,
                startDate: Timestamp.now(),
                endDate: Timestamp.fromDate(goalDate),
                durationDays: totalDays,
                intensity,
                excludeWeekends,
                completeSchedule: schedules.complete,
                summarySchedule: schedules.summary,
                generatedSchedule: schedules.complete 
            };

            await updateUserStudyPlan(user.uid, newPlan);
            
            localStorage.setItem('eintk_plan_exists', 'true');
            localStorage.setItem('eintk_setup_complete', 'false'); 
            navigate('/setup');
        } catch (e) {
            console.error(e);
            alert("Failed to forge plan. Try again.");
        } finally {
            setIsForging(false);
        }
    };

    const isStep2Valid = targetSubjectCount === -1 
        ? selectedSubjects.length >= 4 
        : selectedSubjects.length === targetSubjectCount;

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col p-6 font-sans">
            <div className="max-w-xl mx-auto w-full flex-grow flex flex-col pt-10">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-600/10 border border-orange-500/30 text-orange-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                        <Sparkles size={12} fill="currentColor"/> Initializing Aether Core
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter uppercase italic">Forge Your Mission</h1>
                    <p className="text-gray-500 text-sm mt-2">Every champion needs a strategy. Let's build yours.</p>
                </div>

                <div className="flex justify-center gap-2 mb-10">
                    {[1, 2, 3].map(i => (
                        <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${step >= i ? 'w-12 bg-orange-600 shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'w-4 bg-gray-800'}`}></div>
                    ))}
                </div>

                <div className="flex-grow">
                    {step === 1 && (
                        <div className="space-y-4 animate-fade-in">
                            <h3 className="text-lg font-bold text-gray-300 px-2">Choose Mission Intensity</h3>
                            {PLAN_TYPES.map(plan => (
                                <div 
                                    key={plan.id}
                                    onClick={() => handleSelectPlan(plan.id)}
                                    className={`p-5 rounded-3xl border-2 cursor-pointer transition-all flex items-center gap-5 group relative overflow-hidden ${selectedType === plan.id ? `${plan.bg} ${plan.border} scale-105` : 'bg-gray-800 border-transparent hover:bg-gray-750'}`}
                                >
                                    <div className={`p-4 rounded-2xl bg-gray-900 border ${selectedType === plan.id ? plan.border : 'border-white/5'} ${plan.color}`}>
                                        <plan.icon size={28} />
                                    </div>
                                    <div className="flex-grow pr-8">
                                        <h4 className={`font-black uppercase tracking-tight ${selectedType === plan.id ? 'text-white' : 'text-gray-400'}`}>{plan.name}</h4>
                                        <p className="text-xs text-gray-500 leading-snug mt-0.5">{plan.desc}</p>
                                    </div>
                                    {selectedType === plan.id && <div className="absolute right-4"><Check className="text-orange-500" size={24}/></div>}
                                </div>
                            ))}
                            <button 
                                onClick={() => setStep(2)} 
                                disabled={!selectedType}
                                className="w-full mt-10 py-5 bg-white text-gray-900 font-black rounded-3xl flex items-center justify-center gap-3 uppercase tracking-widest text-xs shadow-2xl disabled:opacity-30 transition-all active:scale-95"
                            >
                                Continue <ArrowRight size={18}/>
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-fade-in flex flex-col h-full">
                            <div className="flex justify-between items-end px-2">
                                <div>
                                    <h3 className="text-xl font-bold text-white">Select Subjects</h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {targetSubjectCount === -1 
                                            ? "Choose any subjects you want to study."
                                            : `Please select exactly ${targetSubjectCount} subjects (English included).`}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className={`text-2xl font-black ${isStep2Valid ? 'text-green-500' : 'text-orange-500'}`}>{selectedSubjects.length}</span>
                                    <span className="text-gray-600 font-bold"> / {targetSubjectCount === -1 ? '∞' : targetSubjectCount}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2 bg-gray-800/30 p-4 rounded-3xl border border-white/5 shadow-inner">
                                {Object.keys(NIGERIAN_CURRICULUM_SUBJECTS).sort().map(s => {
                                    if (s === 'General') return null; 
                                    const isMandatory = s === 'English Language';
                                    const isSelected = selectedSubjects.includes(s);
                                    return (
                                        <button
                                            key={s}
                                            onClick={() => toggleSubject(s)}
                                            className={`p-3 rounded-xl border text-[10px] font-black uppercase tracking-tight transition-all text-center ${isSelected ? 'bg-orange-600 border-orange-500 text-white shadow-lg' : 'bg-gray-900 border-white/5 text-gray-500 hover:border-gray-700'} ${isMandatory ? 'ring-2 ring-orange-500/50 cursor-default' : ''}`}
                                        >
                                            {s}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="space-y-3 mt-auto">
                                <button 
                                    onClick={() => setStep(3)} 
                                    disabled={!isStep2Valid}
                                    className="w-full py-5 bg-white text-gray-900 font-black rounded-3xl flex items-center justify-center gap-3 uppercase tracking-widest text-xs shadow-2xl disabled:opacity-30 transition-all active:scale-95"
                                >
                                    Define Timeline <ArrowRight size={18}/>
                                </button>
                                <button onClick={() => setStep(1)} className="w-full text-gray-500 font-bold uppercase tracking-widest text-[10px] py-2">Change Mission Type</button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-10 animate-fade-in pt-4">
                            
                            {/* Duration Form */}
                            <div className="bg-gray-800/50 p-6 rounded-[2.5rem] border border-white/5 space-y-8">
                                <div className="text-center">
                                    <h3 className="text-lg font-black uppercase tracking-widest italic flex items-center justify-center gap-2">
                                        <Clock className="text-orange-500" size={20}/> Study Duration
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1">Set the total time for your syllabus coverage.</p>
                                </div>

                                {/* Presets */}
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { label: '1 Month', m: 1, d: 0 },
                                        { label: '1.5 Months', m: 1, d: 15 },
                                        { label: '2 Months', m: 2, d: 0 }
                                    ].map(p => {
                                        const isBelowMin = p.m < minRequiredMonths;
                                        return (
                                            <button 
                                                key={p.label}
                                                disabled={isBelowMin}
                                                onClick={() => { setDurationMonths(p.m); setDurationDays(p.d); }}
                                                className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all border ${durationMonths === p.m && durationDays === p.d ? 'bg-orange-600 border-orange-500 text-white shadow-lg' : isBelowMin ? 'bg-gray-900/50 border-white/5 text-gray-700 cursor-not-allowed opacity-30' : 'bg-gray-800 border-white/5 text-gray-500 hover:border-gray-700'}`}
                                            >
                                                {p.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest block text-center">Months</label>
                                            <div className="flex items-center justify-between bg-gray-900 p-2 rounded-2xl border border-white/5">
                                                <button 
                                                    onClick={() => setDurationMonths(m => Math.max(minRequiredMonths, m-1))} 
                                                    disabled={durationMonths <= minRequiredMonths}
                                                    className={`p-2 rounded-lg transition-colors ${durationMonths <= minRequiredMonths ? 'text-gray-700 cursor-not-allowed' : 'text-orange-500 hover:bg-gray-800'}`}
                                                >
                                                    <Minus size={16}/>
                                                </button>
                                                <span className="text-xl font-black">{durationMonths}</span>
                                                <button onClick={() => setDurationMonths(m => Math.min(12, m+1))} className="p-2 text-orange-500 hover:bg-gray-800 rounded-lg"><Plus size={16}/></button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest block text-center">Extra Days</label>
                                            <div className="flex items-center justify-between bg-gray-900 p-2 rounded-2xl border border-white/5">
                                                <button onClick={() => setDurationDays(d => Math.max(0, d-1))} className="p-2 text-orange-500 hover:bg-gray-800 rounded-lg"><Minus size={16}/></button>
                                                <span className="text-xl font-black">{durationDays}</span>
                                                <button onClick={() => setDurationDays(d => Math.min(30, d+1))} className="p-2 text-orange-500 hover:bg-gray-800 rounded-lg"><Plus size={16}/></button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-gray-900/80 rounded-2xl p-4 border border-orange-500/20 text-center">
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Estimated Goal</p>
                                        <p className="text-xl font-black text-orange-500 italic uppercase tracking-tighter">
                                            Finish by {goalDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                                        </p>
                                        <div className="flex items-center justify-center gap-2 mt-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{totalDays} Total Prep Days</span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Nova Tip: Minimum Duration Context */}
                                <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-2xl flex gap-3 items-start animate-fade-in">
                                    <div className="bg-blue-500/20 p-1.5 rounded-lg text-blue-400 shrink-0">
                                        <Info size={14} />
                                    </div>
                                    <p className="text-[10px] text-blue-200/70 leading-relaxed font-medium">
                                        <strong className="text-blue-400 uppercase tracking-widest block mb-0.5">Nova Tip</strong>
                                        Nova recommends at least <span className="text-white font-bold">{minRequiredMonths} months</span> for {PLAN_TYPES.find(p => p.id === selectedType)?.name} to ensure 100% syllabus coverage and revision time.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-4 px-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Daily Loadout</label>
                                        <span className="text-orange-500 font-black text-sm">{intensity} Subjects / Day</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="1" 
                                        max="3" 
                                        step="1" 
                                        value={intensity}
                                        onChange={(e) => setIntensity(parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-gray-800 rounded-full appearance-none cursor-pointer accent-orange-600"
                                    />
                                    <div className="flex justify-between text-[8px] text-gray-600 font-black uppercase">
                                        <span>Focus</span>
                                        <span>Balanced</span>
                                        <span>Extreme</span>
                                    </div>
                                </div>

                                <div 
                                    onClick={() => setExcludeWeekends(!excludeWeekends)}
                                    className="p-5 bg-gray-800 rounded-2xl border border-white/5 flex items-center justify-between cursor-pointer group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg transition-colors ${excludeWeekends ? 'bg-orange-600 text-white' : 'bg-gray-900 text-gray-500'}`}>
                                            <Calendar size={18}/>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-white uppercase tracking-wider">Rest Days</p>
                                            <p className="text-[10px] text-gray-500">Exclude Saturdays & Sundays</p>
                                        </div>
                                    </div>
                                    <div className={`w-12 h-6 rounded-full relative transition-all duration-300 ${excludeWeekends ? 'bg-orange-600' : 'bg-gray-900'}`}>
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${excludeWeekends ? 'right-1' : 'left-1'}`}></div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6">
                                <button 
                                    onClick={handleForgePlan} 
                                    disabled={totalDays < 30 || isForging}
                                    className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-black py-6 rounded-[2rem] flex items-center justify-center gap-3 shadow-2xl shadow-orange-900/40 transform active:scale-95 transition-all disabled:opacity-30"
                                >
                                    {isForging ? <Loader2 className="animate-spin" size={24}/> : <Zap fill="currentColor" size={20}/>}
                                    <span className="text-lg uppercase tracking-widest">{isForging ? 'Forging...' : 'Initiate Mission'}</span>
                                </button>
                                <button onClick={() => setStep(2)} className="w-full text-gray-500 font-bold uppercase tracking-widest text-[10px] py-4">Revisit Subjects</button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-8 text-center pb-10">
                    <p className="text-[10px] text-gray-700 font-black uppercase tracking-[0.4em]">Proprietary Aether Algorithm v3.1</p>
                </div>
            </div>
        </div>
    );
};

export default AetherSetupPage;
