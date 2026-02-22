import React, { useState, useEffect, useMemo } from 'react';
import type { User } from 'firebase/auth';
import type { UserData, ExamQST, Question } from '../types';
import { consumeEnergy, recordHighStakesResult, getUserData, getPublishedExamQSTs } from '../services/firestoreService';
import { getAllOfflineExams } from '../services/offlineService';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, Trophy, AlertTriangle, Check, X, Loader2, Coins } from 'lucide-react';
import { shuffleArray } from '../utils/shuffle';
import LoadingSpinner from '../components/LoadingSpinner';

interface HighStakesPageProps {
    user: User | null;
}

const HighStakesPage: React.FC<HighStakesPageProps> = ({ user }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState<'intro' | 'loading' | 'quiz' | 'result'>('intro');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [userEnergy, setUserEnergy] = useState<number | null>(null);
    const [planSubjects, setPlanSubjects] = useState<string[]>([]);
    const [error, setError] = useState('');

    const ENTRY_COST = 60;
    const WIN_THRESHOLD = 26; 
    const REWARD_SPARKS = 20;
    const TOTAL_QS = 30;

    useEffect(() => {
        if (!user) {
            navigate('/auth');
            return;
        }
        getUserData(user.uid).then(data => {
            if (data) {
                setUserEnergy(data.energy || 0);
                const schedule = data.studyPlan?.generatedSchedule;
                const foundSubjects = new Set<string>();
                if (schedule) {
                    Object.values(schedule).forEach((missions: string[]) => {
                        missions.forEach(m => {
                            const subj = m.split('|')[0];
                            if (subj && subj !== 'General') foundSubjects.add(subj);
                        });
                    });
                }
                setPlanSubjects(Array.from(foundSubjects));
            }
        });
    }, [user, navigate]);

    const handleStart = async () => {
        if (!user || userEnergy === null) return;
        
        if (userEnergy < ENTRY_COST) {
            setError("Not enough Energy! Go to Profile to convert Sparks.");
            return;
        }

        if (planSubjects.length === 0) {
            setError("No active Aether Study Plan detected. Initialize your plan first.");
            return;
        }

        setStep('loading');
        
        try {
            // 1. Deduct Energy First
            const success = await consumeEnergy(user.uid, ENTRY_COST);
            if (!success) throw new Error("Transaction failed. Check balance.");

            // 2. Fetch Exams from IndexedDB (Local Vault)
            let allExams = await getAllOfflineExams();
            
            // Fallback to Cloud only if local is totally empty and we are online
            if (allExams.length === 0 && navigator.onLine) {
                allExams = await getPublishedExamQSTs();
            }

            if (allExams.length === 0) throw new Error("Local vault is empty. Please connect to internet to sync your mission assets.");

            const validExams = allExams.filter(e => planSubjects.includes(e.subject));
            
            let pool: Question[] = [];
            validExams.forEach(exam => {
                if (exam.questions) pool.push(...exam.questions);
            });

            // Fallback for small pools from other subjects
            if (pool.length < TOTAL_QS) {
                 allExams.filter(e => e.subject !== 'General').forEach(exam => {
                    if (exam.questions) pool.push(...exam.questions);
                });
            }

            if (pool.length < TOTAL_QS) throw new Error("Not enough questions synced to your device.");

            // 3. Shuffle and Select
            const selectedQuestions = shuffleArray(pool).slice(0, TOTAL_QS);
            setQuestions(selectedQuestions);
            setStep('quiz');

        } catch (e: any) {
            setError(e.message);
            setStep('intro');
        }
    };

    const handleAnswer = (option: string) => {
        if (selectedAnswer) return; 
        setSelectedAnswer(option);

        const currentQ = questions[currentIndex];
        const isCorrect = cleanText(option) === cleanText(currentQ.answer);

        if (isCorrect) setScore(s => s + 1);

        setTimeout(() => {
            if (currentIndex < TOTAL_QS - 1) {
                setCurrentIndex(i => i + 1);
                setSelectedAnswer(null);
            } else {
                finishQuiz(isCorrect ? score + 1 : score);
            }
        }, 1000);
    };

    const finishQuiz = async (finalScore: number) => {
        setStep('result');
        const won = finalScore >= WIN_THRESHOLD;
        if (user) {
            await recordHighStakesResult(user.uid, won);
        }
    };

    const cleanText = (t: string) => t.replace(/^[a-zA-Z][.)]\s*/, '').trim();

    if (!user) return null;

    if (step === 'intro') {
        return (
            <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-center">
                <button onClick={() => navigate('/sparks')} className="absolute top-6 left-6 p-2 rounded-full bg-gray-800 text-gray-400 hover:text-white">
                    <ArrowLeft size={24} />
                </button>

                <div className="bg-yellow-500/20 p-6 rounded-full mb-6 border border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.3)] animate-pulse">
                    <Trophy size={64} className="text-yellow-400" />
                </div>

                <h1 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter">High Stakes Arena</h1>
                <p className="text-gray-400 mb-8 max-w-sm">
                    Enter the arena. 30 Questions from your **Study Plan**. Score 26+ to win Sparks.
                    <br/>
                    <span className="text-red-400 font-bold">Lose, and your Energy is gone forever.</span>
                </p>

                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 w-full max-w-sm mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-400 text-sm font-bold uppercase">Entry Cost</span>
                        <span className="text-green-400 font-black flex items-center text-xl">
                            {ENTRY_COST} <Zap size={20} className="ml-1 fill-current"/>
                        </span>
                    </div>
                    <div className="flex justify-between items-center border-t border-gray-700 pt-4">
                        <span className="text-gray-400 text-sm font-bold uppercase">Potential Reward</span>
                        <span className="text-yellow-400 font-black flex items-center text-xl">
                            +{REWARD_SPARKS} <Coins size={20} className="ml-1 fill-current"/>
                        </span>
                    </div>
                </div>

                {error && <p className="text-red-500 font-bold mb-4 bg-red-900/20 px-4 py-2 rounded">{error}</p>}

                <button 
                    onClick={handleStart}
                    className="w-full max-w-sm bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-black py-4 rounded-xl shadow-2xl transition-transform hover:scale-105 uppercase tracking-widest flex items-center justify-center gap-2"
                >
                    <Zap fill="currentColor"/> Pay & Start
                </button>
                
                <p className="mt-4 text-xs text-gray-500">Current Balance: {userEnergy ?? '...'} Energy</p>
            </div>
        );
    }

    if (step === 'loading') {
        return <div className="h-screen bg-gray-900 flex items-center justify-center"><LoadingSpinner/></div>;
    }

    if (step === 'quiz') {
        const currentQ = questions[currentIndex];
        const progress = ((currentIndex) / TOTAL_QS) * 100;

        return (
            <div className="min-h-screen bg-gray-900 p-4 pt-10 flex flex-col max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div className="text-gray-400 font-mono text-sm">Q{currentIndex + 1}/{TOTAL_QS}</div>
                    <div className="text-green-400 font-bold text-sm flex items-center">Score: {score}</div>
                </div>
                
                <div className="w-full h-1 bg-gray-800 rounded-full mb-8">
                    <div className="h-full bg-orange-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>

                <div className="flex-grow">
                    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl mb-6">
                        <div className="text-lg md:text-xl font-bold text-white leading-relaxed" dangerouslySetInnerHTML={{ __html: currentQ.question }}></div>
                    </div>

                    <div className="space-y-3">
                        {currentQ.options?.map((opt, idx) => {
                            const isSelected = selectedAnswer === opt;
                            const isCorrect = cleanText(opt) === cleanText(currentQ.answer);
                            
                            let btnClass = "bg-gray-800 border-gray-700 hover:bg-gray-700";
                            if (selectedAnswer) {
                                if (isCorrect) btnClass = "bg-green-600 border-green-500";
                                else if (isSelected) btnClass = "bg-red-600 border-red-500";
                                else btnClass = "bg-gray-800 opacity-50";
                            }

                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleAnswer(opt)}
                                    disabled={!!selectedAnswer}
                                    className={`w-full p-4 rounded-xl border-2 text-left font-semibold text-gray-200 transition-all ${btnClass}`}
                                >
                                    <div className="flex justify-between items-center">
                                        <span dangerouslySetInnerHTML={{ __html: cleanText(opt) }}></span>
                                        {selectedAnswer && isCorrect && <Check size={20} className="text-white"/>}
                                        {selectedAnswer && isSelected && !isCorrect && <X size={20} className="text-white"/>}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'result') {
        const won = score >= WIN_THRESHOLD;
        return (
            <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                <div className={`p-8 rounded-full mb-6 ${won ? 'bg-yellow-500/20' : 'bg-red-500/20'}`}>
                    {won ? <Trophy size={80} className="text-yellow-400" /> : <AlertTriangle size={80} className="text-red-500" />}
                </div>
                
                <h2 className="text-4xl font-black text-white mb-2">{won ? "JACKPOT!" : "DEFEAT"}</h2>
                <p className="text-gray-400 text-lg mb-8">
                    You scored <span className={`font-bold ${won ? 'text-green-400' : 'text-red-400'}`}>{score}/{TOTAL_QS}</span>
                </p>

                {won ? (
                    <div className="bg-gray-800 p-6 rounded-xl border border-green-500/30 w-full max-w-sm mb-8">
                        <p className="text-gray-400 uppercase text-xs font-bold mb-2">Reward Earned</p>
                        <p className="text-4xl font-black text-yellow-400 flex items-center justify-center">
                            +{REWARD_SPARKS} <Coins size={32} className="ml-2 fill-current"/>
                        </p>
                    </div>
                ) : (
                    <div className="bg-gray-800 p-6 rounded-xl border border-red-500/30 w-full max-w-sm mb-8">
                        <p className="text-gray-400 uppercase text-xs font-bold mb-2">Energy Lost</p>
                        <p className="text-4xl font-black text-red-400 flex items-center justify-center">
                            -{ENTRY_COST} <Zap size={32} className="ml-2 fill-current"/>
                        </p>
                        <p className="text-xs text-gray-500 mt-2">Better luck next time.</p>
                    </div>
                )}

                <button onClick={() => navigate('/sparks')} className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-xl font-bold transition-colors">
                    Back to Spark Hub
                </button>
            </div>
        );
    }

    return null;
};

export default HighStakesPage;