import React, { useState, useEffect, useRef, memo } from 'react';
import { Trophy, Zap, Check, X, Loader2, AlertCircle, Sparkles, Timer, Power, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { Question } from '../types';
import { shuffleArray } from '../utils/shuffle';
import { consumeEnergy, recordHighStakesResult, getUserData, getPublishedExamQSTs } from '../services/firestoreService';
import { getAllOfflineExams } from '../services/offlineService';
import { recordTransaction } from '../services/ledgerService';
import Modal from './Modal';

declare global {
    interface Window {
      MathJax: {
        typesetPromise: (elements?: HTMLElement[]) => Promise<void>;
      };
    }
}

interface HighStakesModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    onSuccess: (sparksEarned: number) => void;
}

const MathJaxHtml = memo(({ content, className }: { content: string; className?: string }) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (ref.current && window.MathJax && window.MathJax.typesetPromise) {
            window.MathJax.typesetPromise([ref.current]).catch((err) => console.warn('MathJax error', err));
        }
    }, [content]);
    return <div ref={ref} className={className} dangerouslySetInnerHTML={{ __html: content }} />;
});

const HighStakesModal: React.FC<HighStakesModalProps> = ({ isOpen, onClose, userId, onSuccess }) => {
    const [step, setStep] = useState<'loading' | 'quiz' | 'result'>('loading');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirmQuit, setShowConfirmQuit] = useState(false);

    const WIN_THRESHOLD = 26; 
    const REWARD = 20;
    const ENTRY_FEE = 60;

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            startArena();
        } else {
            document.body.style.overflow = 'unset';
            resetState();
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const resetState = () => {
        setStep('loading');
        setQuestions([]);
        setCurrentIndex(0);
        setScore(0);
        setUserAnswers({});
        setTimeLeft(300);
        setIsSubmitting(false);
        setShowConfirmQuit(false);
    };

    const startArena = async () => {
        try {
            // 1. Get User Data
            const userData = await getUserData(userId);
            if (!userData) throw new Error("User data missing");
            
            // 2. Derive subjects from Study Plan
            const schedule = userData.studyPlan?.generatedSchedule;
            const planSubjects = new Set<string>();
            if (schedule) {
                Object.values(schedule).forEach((missions: string[]) => {
                    missions.forEach(m => {
                        const subject = m.split('|')[0];
                        if (subject && subject !== 'General') planSubjects.add(subject);
                    });
                });
            }
            
            const activeSubjects = Array.from(planSubjects);

            if (activeSubjects.length === 0) {
                alert("Please initialize your Aether Study Plan first!");
                onClose();
                return;
            }

            // 3. Deduct Energy
            const success = await consumeEnergy(userId, ENTRY_FEE);
            if (!success) throw new Error("Ante failed");
            
            await recordTransaction({ type: 'energy', amount: -ENTRY_FEE, description: `High Stakes Entry: Mission Subjects` });

            // 4. Load Content from ALL valid subjects in the plan using IndexedDB
            let allExams = await getAllOfflineExams();
            
            // Fallback for development/first run
            if (allExams.length === 0 && navigator.onLine) {
                allExams = await getPublishedExamQSTs();
            }

            const validExams = allExams.filter(e => activeSubjects.includes(e.subject));
            
            let pool: Question[] = [];
            validExams.forEach(e => pool.push(...e.questions));
            
            // Fallback if pool is too small
            if (pool.length < 30) {
                allExams.filter(e => e.subject !== 'General').forEach(e => pool.push(...e.questions));
            }

            setQuestions(shuffleArray(pool).slice(0, 30));
            setStep('quiz');
        } catch (e) {
            alert("Transaction failed. Do you have 60 Energy?");
            onClose();
        }
    };

    useEffect(() => {
        if (step === 'quiz' && timeLeft > 0) {
            const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
            return () => clearInterval(timer);
        } else if (timeLeft === 0 && step === 'quiz') {
            finishGame();
        }
    }, [step, timeLeft]);

    const handleAnswer = (ans: string) => {
        setUserAnswers(prev => ({ ...prev, [currentIndex]: ans }));
    };

    const finishGame = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        
        let finalScore = 0;
        questions.forEach((q, idx) => {
            const userAns = userAnswers[idx] || "";
            const cleanUser = userAns.replace(/^[a-zA-Z][.)]\s*/, '').trim().toLowerCase();
            const cleanCorrect = q.answer.replace(/^[a-zA-Z][.)]\s*/, '').trim().toLowerCase();
            if (cleanUser === cleanCorrect) finalScore++;
        });

        setScore(finalScore);
        const won = finalScore >= WIN_THRESHOLD;
        
        if (won) {
            await recordHighStakesResult(userId, true);
            await recordTransaction({ type: 'spark', amount: REWARD, description: `High Stakes Win` });
            onSuccess(REWARD);
        }
        
        setStep('result');
        setIsSubmitting(false);
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#111827]/98 backdrop-blur-xl p-4 overflow-hidden">
            <div className="w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-[2.5rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.7)] relative flex flex-col h-full max-h-[95vh]">
                
                <Modal isOpen={showConfirmQuit} onClose={() => setShowConfirmQuit(false)} title="Quit Arena?" zIndex={300}>
                    <div className="text-center p-2">
                        <div className="bg-red-900/20 p-5 rounded-full w-20 h-20 mx-auto flex items-center justify-center mb-6 border border-red-500/30">
                            <Zap size={40} className="text-red-500 animate-pulse" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-tighter">Energy Forfeiture</h3>
                        <p className="text-gray-400 text-sm mb-8 leading-relaxed">Quitting now costs <span className="text-red-500 font-bold">60 Energy</span>. Are you sure?</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={onClose} className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl transition-all">Quit & Forfeit</button>
                            <button onClick={() => setShowConfirmQuit(false)} className="text-gray-500 hover:text-white text-xs font-bold uppercase tracking-widest py-2">Continue Duel</button>
                        </div>
                    </div>
                </Modal>

                {step === 'quiz' && (
                    <div className="p-4 flex justify-between items-center shrink-0">
                        <button onClick={() => setShowConfirmQuit(true)} className="p-2.5 bg-red-900/20 text-red-500 rounded-2xl border border-red-500/20 hover:bg-red-600 hover:text-white transition-all shadow-lg"><Power size={18} /></button>
                        <div className="flex gap-3">
                            <div className={`bg-gray-800 px-3 py-1.5 rounded-2xl border border-gray-700 flex items-center gap-2 ${timeLeft < 60 ? 'border-red-500/50 animate-pulse' : ''}`}>
                                <Timer size={14} className={timeLeft < 60 ? 'text-red-500' : 'text-orange-500'} />
                                <span className={`font-mono font-bold text-sm ${timeLeft < 60 ? 'text-red-500' : 'text-white'}`}>{formatTime(timeLeft)}</span>
                            </div>
                            <div className="bg-orange-600 px-3 py-1.5 rounded-2xl font-black text-white text-[10px] uppercase tracking-widest shadow-lg">{currentIndex + 1} / 30</div>
                        </div>
                    </div>
                )}

                {step === 'loading' && (
                    <div className="flex-grow flex flex-col items-center justify-center p-32 text-center">
                        <Loader2 className="animate-spin text-orange-500 mb-6" size={64} />
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter animate-pulse">Mixing Challenge...</h2>
                    </div>
                )}

                {step === 'quiz' && questions.length > 0 && (
                    <>
                        <div className="flex-grow flex flex-col px-4 sm:px-10 pb-4 overflow-hidden">
                            <div className="bg-gray-800/50 p-6 rounded-[1.5rem] border border-gray-800 mb-4 min-h-[120px] flex items-center justify-center text-center shadow-inner relative overflow-hidden shrink-0">
                                <div className="absolute top-0 right-0 p-2 opacity-5"><Sparkles size={80}/></div>
                                <MathJaxHtml className="text-lg sm:text-xl font-bold text-white leading-relaxed z-10" content={questions[currentIndex].question} />
                            </div>

                            <div className="grid grid-cols-1 gap-2 sm:gap-3 flex-grow content-start overflow-y-auto custom-scrollbar pr-1">
                                {questions[currentIndex].options?.map((opt, i) => {
                                    const isSelected = userAnswers[currentIndex] === opt;
                                    return (
                                        <button 
                                            key={i} 
                                            onClick={() => handleAnswer(opt)}
                                            className={`w-full p-4 rounded-xl border-2 text-left font-bold transition-all flex items-center gap-3 active:scale-[0.98] ${isSelected ? 'bg-orange-600 border-orange-400 text-white shadow-lg' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${isSelected ? 'bg-white/20' : 'bg-gray-900 border border-gray-700'}`}>{String.fromCharCode(65 + i)}</div>
                                            <MathJaxHtml className="flex-1 text-sm sm:text-base" content={opt.replace(/^[a-zA-Z][.)]\s*/, '').trim()} />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="p-4 bg-gray-950/50 border-t border-gray-800 flex justify-between items-center shrink-0">
                            <button onClick={() => setCurrentIndex(c => Math.max(0, c - 1))} disabled={currentIndex === 0} className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white font-bold rounded-xl disabled:opacity-20 transition-colors text-sm"><ChevronLeft size={18}/><span className="hidden sm:inline">Back</span></button>
                            {currentIndex === 29 ? (
                                <button onClick={finishGame} disabled={!userAnswers[29]} className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-black rounded-xl shadow-lg uppercase tracking-widest text-[10px]">Submit Final</button>
                            ) : (
                                <button onClick={() => setCurrentIndex(c => c + 1)} disabled={!userAnswers[currentIndex]} className="flex items-center gap-2 px-8 py-3 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl shadow-lg uppercase tracking-widest text-[10px]"><span>Next Phase</span><ChevronRight size={18}/></button>
                            )}
                        </div>
                    </>
                )}

                {step === 'result' && (
                    <div className="flex-grow flex flex-col items-center justify-center p-12 text-center animate-fade-in overflow-y-auto">
                        <div className={`p-8 rounded-full mb-8 ${score >= WIN_THRESHOLD ? 'bg-yellow-500/20' : 'bg-red-900/20'}`}>
                            {score >= WIN_THRESHOLD ? <Trophy size={80} className="text-yellow-400 animate-bounce" /> : <AlertTriangle size={80} className="text-red-500" />}
                        </div>
                        <h2 className="text-5xl font-black text-white mb-3 uppercase italic tracking-tighter">{score >= WIN_THRESHOLD ? 'CONQUERED!' : 'DEFEAT'}</h2>
                        <p className="text-gray-400 mb-10 text-lg font-medium">Final Score: <span className={score >= WIN_THRESHOLD ? 'text-green-400' : 'text-red-400'}>{score}/30</span></p>
                        {score >= WIN_THRESHOLD && (
                            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-[2rem] border border-yellow-500/30 mb-10 shadow-2xl w-full max-w-sm">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-3">Loot Secured</p>
                                <div className="flex items-center justify-center gap-3"><Sparkles className="text-yellow-500" size={24}/><p className="text-5xl font-black text-yellow-400 tracking-tighter">+20 Sparks</p></div>
                            </div>
                        )}
                        <button onClick={onClose} className="w-full max-w-sm py-5 bg-white text-black font-black rounded-2xl uppercase tracking-[0.2em] text-xs hover:bg-gray-200 transition-all shadow-xl">Exit Arena</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HighStakesModal;