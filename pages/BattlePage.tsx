// ... (imports remain the same)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { User } from 'firebase/auth';
import type { UserData, Battle, Question } from '../types';
import { subscribeToBattle, joinBattle, updateBattleScore, completeBattleTurn, deleteBattle } from '../services/firestoreService';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Swords, Crown, Loader2, Copy, Check, Trophy, Timer, AlertCircle, Power, X, Clock, Sparkles, ShieldAlert, Zap, XCircle } from 'lucide-react';
import Modal from '../components/Modal';

declare global {
    interface Window {
      MathJax: {
        typesetPromise: (elements?: HTMLElement[]) => Promise<void>;
      };
    }
}

interface BattlePageProps {
    user: User | null;
    userData: UserData | null;
}

const cleanOptionText = (text: string) => text.replace(/^[a-zA-Z][.)]\s*/, '').trim();
const WINNER_BONUS = 50;

const BattlePage: React.FC<BattlePageProps> = ({ user, userData }) => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    const [mode, setMode] = useState<'init' | 'lobby' | 'battle' | 'waiting_for_turn' | 'results'>('init');
    const [battleId, setBattleId] = useState<string | null>(null);
    const [battleData, setBattleData] = useState<Battle | null>(null);
    const [error, setError] = useState('');
    
    // UI States
    const [showQuitModal, setShowQuitModal] = useState(false);
    const [showLobbyQuitModal, setShowLobbyQuitModal] = useState(false);
    
    // Turn State
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
    const [timeLeft, setTimeLeft] = useState(20); 
    const [myScore, setMyScore] = useState(0);
    const [sabotageAlert, setSabotageAlert] = useState<{msg: string, type: 'stole' | 'lost'} | null>(null);
    
    const battleAreaRef = useRef<HTMLDivElement>(null);

    // Initialization
    useEffect(() => {
        const id = searchParams.get('id');
        if (id) setBattleId(id);
        else navigate('/community');
    }, [searchParams, navigate]);

    // Subscription & Logic Loop
    useEffect(() => {
        if (!user || !battleId) return;

        const unsubscribe = subscribeToBattle(battleId, (data) => {
            if (!data) {
                // Battle deleted
                if (mode === 'lobby') {
                    navigate('/community');
                } else {
                    setError("Battle not found or expired.");
                }
                return;
            }

            setBattleData(data);
            const isHost = data.hostId === user.uid;
            
            // 1. Handle Status transitions
            if (data.status === 'waiting') {
                setMode('lobby');
            } else if (data.status === 'finished') {
                setMode('results');
            } else if (data.status === 'active') {
                // If transition from Lobby to Active, close modal
                if (mode === 'lobby') setShowLobbyQuitModal(false);

                const iFinishedTurn = isHost ? data.hostFinishedTurn : data.opponentFinishedTurn;
                if (iFinishedTurn) {
                    setMode('waiting_for_turn');
                } else {
                    setMode('battle');
                }
            }

            // Sync scores
            const newScore = isHost ? data.hostScore : data.opponentScore;
            
            // Sabotage Detection for UI Feedback
            if (data.mode === 'Sabotage Twist' && mode === 'battle') {
                const prevScore = myScore;
                if (newScore < prevScore) {
                   setSabotageAlert({ msg: "Your points were stolen!", type: 'lost' });
                   setTimeout(() => setSabotageAlert(null), 3000);
                }
            }
            setMyScore(newScore);
        });

        return () => unsubscribe();
    }, [user, battleId, mode]);

    // Turn Completion Watcher
    useEffect(() => {
        if (battleData?.hostFinishedTurn && battleData?.opponentFinishedTurn) {
            completeBattleTurn(battleData.id);
        }
    }, [battleData]);

    // MathJax Rendering
    const runTypeset = useCallback(async () => {
        if (window.MathJax && window.MathJax.typesetPromise && battleAreaRef.current) {
            try {
                await window.MathJax.typesetPromise([battleAreaRef.current]);
                const errors = battleAreaRef.current.querySelectorAll('mjx-merror, .mjx-error');
                errors.forEach(err => err.remove());
            } catch(e) { console.error("MathJax Error:", e); }
        }
    }, []);

    useEffect(() => {
        if (mode === 'battle' || mode === 'results') {
            const timer = setTimeout(runTypeset, 100);
            return () => clearTimeout(timer);
        }
    }, [mode, battleData?.currentIndex, runTypeset]);

    // Timer logic
    useEffect(() => {
        if (mode === 'battle' && timeLeft > 0 && !selectedAnswer) {
            const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
            return () => clearInterval(timer);
        } else if (timeLeft === 0 && !selectedAnswer) {
            handleAnswer('TIME_UP');
        }
    }, [mode, timeLeft, selectedAnswer]);

    // --- Actions ---

    const handleAnswer = async (answer: string) => {
        if (!battleData || selectedAnswer || !user) return;
        
        setSelectedAnswer(answer);
        const isHost = battleData.hostId === user.uid;
        const currentQ = isHost ? battleData.hostQuestions[battleData.currentIndex] : battleData.opponentQuestions[battleData.currentIndex];
        
        const correct = answer !== 'TIME_UP' && cleanOptionText(currentQ.answer) === cleanOptionText(answer);
        setIsAnswerCorrect(correct);

        let newScore = myScore;
        let turnPoints = 0;

        if (correct) {
            turnPoints = 10 + Math.ceil(timeLeft / 2);
            newScore += turnPoints;
        }

        setTimeout(async () => {
            await updateBattleScore(battleData.id, user.uid, newScore);
            setTimeLeft(20);
            setSelectedAnswer(null);
            setIsAnswerCorrect(null);
        }, 2000);
    };

    const handleQuitGame = () => {
        setShowQuitModal(false);
        navigate('/community');
    };

    const handleLobbyBackground = () => {
        // Just leave the page, request stays pending. 
        // App.tsx handles global notification if battle becomes active
        navigate('/community');
    };

    const handleLobbyCancel = async () => {
        if (!battleId) return;
        await deleteBattle(battleId);
        navigate('/community');
    };

    const copyLink = () => {
        const link = `${window.location.origin}/#/battle?id=${battleId}`;
        navigator.clipboard.writeText(link);
        alert("Invite link copied!");
    };

    // --- Renders ---

    if (!user || !battleData) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-500" size={32} /></div>;
    }

    const isHost = battleData.hostId === user.uid;
    const opponentName = isHost ? (battleData.opponentName || 'Waiting...') : battleData.hostName;
    const opponentScore = isHost ? battleData.opponentScore : battleData.hostScore;

    if (mode === 'lobby') {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] text-center p-6 animate-fade-in">
                <h2 className="text-3xl font-black text-white mb-2">{battleData.ebookTopic}</h2>
                <div className="flex items-center gap-3 justify-center mb-8">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest flex items-center gap-1 ${battleData.mode === 'Sabotage Twist' ? 'bg-red-900/50 text-red-400 border-red-500/30' : 'bg-blue-900/50 text-blue-400 border-blue-500/30'}`}>
                        {battleData.mode === 'Sabotage Twist' ? <ShieldAlert size={12}/> : <Trophy size={12}/>}
                        {battleData.mode}
                    </span>
                    <span className="bg-gray-800 text-gray-400 px-3 py-1 rounded-full text-[10px] font-black border border-gray-700">{battleData.numQuestions} Qs</span>
                </div>
                
                <div className="bg-gray-800/80 backdrop-blur-sm p-8 rounded-3xl border border-gray-700 w-full max-w-md mb-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5"><Swords size={120} /></div>
                    
                    <div className="space-y-6 relative z-10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center font-black text-white mr-4 shadow-lg">
                                    {userData?.username.charAt(0).toUpperCase()}
                                </div>
                                <div className="text-left">
                                    <p className="text-white font-bold">{userData?.username}</p>
                                    <p className="text-[10px] text-orange-400 font-black uppercase tracking-widest">You (Ready)</p>
                                </div>
                            </div>
                            <div className="bg-green-500/20 p-2 rounded-full border border-green-500/30"><Check className="text-green-500" size={16}/></div>
                        </div>

                        <div className="flex items-center justify-center h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent">
                            <span className="bg-gray-800 px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Versus</span>
                        </div>

                        <div className={`flex items-center justify-between ${!battleData.opponentId ? 'opacity-50' : ''}`}>
                            <div className="flex items-center">
                                <div className="w-12 h-12 bg-gray-700 rounded-2xl flex items-center justify-center font-black text-gray-500 mr-4">
                                    {battleData.opponentId ? opponentName.charAt(0).toUpperCase() : '?'}
                                </div>
                                <div className="text-left">
                                    <p className="text-white font-bold">{opponentName}</p>
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${battleData.opponentId ? 'text-green-400' : 'text-yellow-500 animate-pulse'}`}>
                                        {battleData.opponentId ? 'Opponent Joined' : 'Waiting for Rival...'}
                                    </p>
                                </div>
                            </div>
                            {battleData.opponentId && <div className="bg-green-500/20 p-2 rounded-full border border-green-500/30"><Check className="text-green-500" size={16}/></div>}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 w-full max-w-xs">
                    <button onClick={copyLink} className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 py-4 px-6 rounded-2xl text-white font-black transition-all shadow-lg border border-gray-600">
                        <Copy size={18}/> <span>Copy Invite Link</span>
                    </button>
                    <button onClick={() => setShowLobbyQuitModal(true)} className="text-gray-500 hover:text-white text-xs font-black uppercase tracking-widest mt-2">Abandon Lobby</button>
                </div>

                {/* ABANDON LOBBY MODAL */}
                <Modal isOpen={showLobbyQuitModal} onClose={() => setShowLobbyQuitModal(false)} title="Leaving so soon?">
                    <div className="text-center p-2">
                        <p className="text-gray-300 mb-6 text-sm">
                            Your rival might join any second! How do you want to leave?
                        </p>
                        
                        <div className="grid grid-cols-1 gap-3">
                            <button 
                                onClick={handleLobbyBackground}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl text-left border border-blue-500/30 group transition-all"
                            >
                                <span className="block font-bold text-sm mb-1">Leave but Keep Active</span>
                                <span className="block text-xs text-blue-200">We'll notify you in-app when your rival joins. The battle stays pending.</span>
                            </button>

                            <button 
                                onClick={handleLobbyCancel}
                                className="w-full bg-red-900/30 hover:bg-red-900/50 text-red-400 p-4 rounded-xl text-left border border-red-500/30 transition-all"
                            >
                                <span className="block font-bold text-sm mb-1">Cancel Battle</span>
                                <span className="block text-xs text-red-300/70">Delete this request. No one can join.</span>
                            </button>
                        </div>
                        <button onClick={() => setShowLobbyQuitModal(false)} className="mt-4 text-gray-500 text-xs font-bold hover:text-white">Return to Lobby</button>
                    </div>
                </Modal>
            </div>
        );
    }

    if (mode === 'waiting_for_turn') {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] text-center p-6 animate-pulse">
                <div className="bg-orange-900/30 p-8 rounded-full border border-orange-500/30 mb-8">
                    <Clock size={64} className="text-orange-500" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2">Syncing with Rival...</h2>
                <p className="text-gray-400 max-w-xs leading-relaxed text-sm">
                    Turn Synchronization active. We're waiting for <span className="text-orange-400 font-bold">{opponentName}</span> to submit their answer for Question {battleData.currentIndex + 1}.
                </p>
                <div className="mt-10 flex gap-4 text-left bg-gray-800 p-4 rounded-2xl border border-gray-700 w-full max-w-xs shadow-xl">
                    <div className="flex-1">
                        <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">You</p>
                        <p className="text-2xl font-black text-white">{myScore}</p>
                    </div>
                    <div className="w-px bg-gray-700"></div>
                    <div className="flex-1">
                        <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">{opponentName}</p>
                        <p className="text-2xl font-black text-gray-400">{opponentScore}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (mode === 'battle') {
        const currentQ = isHost ? battleData.hostQuestions[battleData.currentIndex] : battleData.opponentQuestions[battleData.currentIndex];
        
        return (
            <div className="p-4 max-w-2xl mx-auto min-h-screen flex flex-col pt-6 relative" ref={battleAreaRef}>
                
                {sabotageAlert && (
                    <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[70] px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-2xl border flex items-center gap-2 animate-bounce ${sabotageAlert.type === 'lost' ? 'bg-red-600 text-white border-red-400' : 'bg-green-600 text-white border-green-400'}`}>
                        {sabotageAlert.type === 'lost' ? <ShieldAlert size={16}/> : <Zap size={16}/>}
                        {sabotageAlert.msg}
                    </div>
                )}

                {/* Header Stats */}
                <div className="flex justify-between items-center bg-gray-800 p-4 rounded-3xl border border-gray-700 mb-6 shadow-2xl relative overflow-hidden">
                    <button onClick={() => setShowQuitModal(true)} className="absolute top-0 left-0 p-2.5 hover:bg-red-900/30 text-gray-500 hover:text-red-500 transition-colors rounded-br-2xl border-r border-b border-gray-700 bg-gray-900/50">
                        <Power size={20} />
                    </button>

                    <div className="text-center flex-1">
                        <p className="text-[10px] text-blue-400 font-black tracking-widest mb-1 uppercase">My Score</p>
                        <p className="text-3xl font-black text-white">{myScore}</p>
                    </div>
                    
                    <div className="flex flex-col items-center px-4">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-2xl border-4 shadow-lg ${timeLeft <= 5 ? 'border-red-500 text-red-500 animate-pulse bg-red-900/20' : 'border-orange-500/50 text-white bg-gray-900'}`}>
                            {timeLeft}
                        </div>
                    </div>

                    <div className="text-center flex-1">
                        <p className="text-[10px] text-red-400 font-black tracking-widest mb-1 uppercase">{opponentName}</p>
                        <p className="text-3xl font-black text-white">{opponentScore}</p>
                    </div>
                </div>

                {/* Question Area */}
                <div className="bg-gray-800 p-6 sm:p-10 rounded-[2.5rem] border border-gray-700 flex-grow flex flex-col justify-center shadow-2xl animate-fade-in-up relative overflow-hidden">
                    {battleData.mode === 'Sabotage Twist' && (
                        <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 pointer-events-none">
                            <ShieldAlert size={140} />
                        </div>
                    )}
                    
                    <div className="mb-6 flex justify-between items-center text-[10px] text-gray-500 font-black uppercase tracking-widest px-2">
                        <span className="bg-gray-900 px-3 py-1.5 rounded-full border border-gray-700 text-orange-500">Duel Phase {battleData.currentIndex + 1} of {battleData.numQuestions}</span>
                        <div className="flex items-center gap-2">
                             <span className="text-gray-400">SYNC MODE</span>
                             <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                        </div>
                    </div>
                    
                    <div className="ebook-content text-xl sm:text-2xl font-black text-white mb-10 leading-relaxed text-center" dangerouslySetInnerHTML={{ __html: currentQ.question }} />

                    <div className="grid gap-3 relative z-10">
                        {currentQ.options?.map((opt, i) => {
                            const cleanOpt = cleanOptionText(opt);
                            let btnClass = "bg-gray-900/50 hover:bg-gray-750 border-gray-700";
                            let icon = null;
                            
                            if (selectedAnswer) {
                                const isThisCorrect = cleanOptionText(currentQ.answer) === cleanOpt;
                                const isThisSelected = selectedAnswer === opt;
                                
                                if (isThisCorrect) {
                                    btnClass = "bg-green-600 border-green-400 ring-4 ring-green-500/20";
                                    icon = <Check size={20} className="text-white"/>;
                                } else if (isThisSelected) {
                                    btnClass = "bg-red-600 border-red-400 opacity-60";
                                    icon = <X size={20} className="text-white"/>;
                                } else {
                                    btnClass = "bg-gray-900 border-gray-800 opacity-20";
                                }
                            }

                            return (
                                <button 
                                    key={i} 
                                    onClick={() => handleAnswer(opt)} 
                                    disabled={!!selectedAnswer}
                                    className={`p-5 rounded-2xl text-left font-bold text-white border-2 transition-all duration-300 flex items-center justify-between group active:scale-[0.98] ${btnClass}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${selectedAnswer ? 'bg-black/20 border-transparent' : 'bg-gray-800 border-gray-700 group-hover:bg-orange-600 group-hover:border-orange-500'}`}>
                                            {String.fromCharCode(65 + i)}
                                        </div>
                                        <span className="text-sm sm:text-base font-bold" dangerouslySetInnerHTML={{ __html: cleanOpt }} />
                                    </div>
                                    {icon}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <Modal isOpen={showQuitModal} onClose={() => setShowQuitModal(false)} title="Forfeit Battle?">
                    <div className="text-center p-4">
                        <div className="bg-red-900/30 p-6 rounded-full w-24 h-24 mx-auto flex items-center justify-center mb-6 border border-red-500/30 shadow-inner">
                            <AlertCircle size={48} className="text-red-500" />
                        </div>
                        <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">Academic Desertion</h3>
                        <p className="text-gray-400 leading-relaxed text-sm mb-8">
                            Leaving now grants your rival an <span className="text-red-400 font-bold uppercase">Automatic Victory</span>. You will receive <span className="text-red-400 font-bold">0 points</span> and lose your contribution to the pot.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button onClick={() => setShowQuitModal(false)} className="w-full py-4 bg-orange-600 hover:bg-orange-700 rounded-2xl font-black text-white shadow-lg transition-transform hover:scale-105 uppercase tracking-widest text-xs">Stay and Conquer</button>
                            <button onClick={handleQuitGame} className="w-full py-4 bg-gray-800 hover:bg-gray-700 rounded-2xl font-black text-red-500 uppercase tracking-widest text-[10px] transition-colors border border-red-900/20">I Accept Defeat</button>
                        </div>
                    </div>
                </Modal>
            </div>
        );
    }

    if (mode === 'results') {
        const won = myScore > opponentScore;
        const draw = myScore === opponentScore;
        const finalScore = won ? myScore + WINNER_BONUS : myScore;
        
        return (
            <div className="flex flex-col items-center justify-center h-screen p-6 text-center bg-gray-900 animate-fade-in">
                <div className={`p-8 rounded-[3rem] mb-8 shadow-2xl relative ${won ? 'bg-yellow-500/10 border-2 border-yellow-500/30' : 'bg-gray-800 border-2 border-gray-700'}`}>
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-900 p-2 rounded-full border border-gray-700">
                         {won ? <Crown size={40} className="text-yellow-500 animate-bounce"/> : (draw ? <Swords size={40} className="text-gray-400"/> : <XCircle size={40} className="text-red-500"/>)}
                    </div>
                    <h1 className="text-5xl font-black text-white mb-2 tracking-tighter mt-4">{won ? "VICTORY!" : (draw ? "DRAW" : "DEFEAT")}</h1>
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">{won ? "Elite Academic Warrior" : (draw ? "Equal Match" : "Strategic Failure")}</p>
                </div>
                
                {won && (
                    <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest mb-12 flex items-center animate-bounce">
                        <Sparkles size={16} className="mr-2"/> +{WINNER_BONUS} Champ Bonus Awarded
                    </div>
                )}

                <div className="grid grid-cols-2 gap-12 mb-16 w-full max-w-sm">
                    <div className="text-center group">
                        <p className="text-[10px] text-blue-400 font-black tracking-widest mb-2 uppercase">Your Final</p>
                        <p className="text-5xl font-black text-white group-hover:scale-110 transition-transform">{finalScore}</p>
                    </div>
                    <div className="text-center group">
                        <p className="text-[10px] text-red-400 font-black tracking-widest mb-2 uppercase">{opponentName}</p>
                        <p className="text-5xl font-black text-gray-500 group-hover:scale-110 transition-transform">{opponentScore}</p>
                    </div>
                </div>

                <div className="flex flex-col gap-4 w-full max-w-xs">
                    <button onClick={() => navigate('/')} className="bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-2xl font-black shadow-lg shadow-orange-900/30 transition-transform hover:scale-105 active:scale-95 uppercase tracking-widest text-xs">Return to Training</button>
                    <button onClick={() => navigate('/community')} className="text-gray-500 hover:text-white font-black text-[10px] uppercase tracking-widest">New Challenge</button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-screen space-y-6">
            <Loader2 className="animate-spin text-orange-500" size={48} />
            <p className="text-gray-400 font-bold animate-pulse text-sm uppercase tracking-widest">Booting Combat Core...</p>
        </div>
    );
};

export default BattlePage;