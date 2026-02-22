import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { ExamQST, Question, UserData } from '../types';
import type { User } from 'firebase/auth';
import { getExamQSTById, markExamQSTAsComplete, updateUserExamProgress } from '../services/firestoreService';
import { getOfflineExam, saveOfflineExam } from '../services/offlineService';
import { ArrowLeft, ChevronLeft, ChevronRight, Play, Pause, Check, X, Eye, RefreshCw, Timer, Calculator, MonitorPlay, Gamepad2, Award, ListFilter, WifiOff } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import CalculatorModal from '../components/CalculatorModal';
import { shuffleArray } from '../utils/shuffle';
import OfflineGateModal from '../components/OfflineGateModal';

declare global { interface Window { MathJax: { typesetPromise: (elements?: HTMLElement[]) => Promise<void>; }; } }

interface ExamQSTReaderPageProps { 
    user: User | null;
    userData: UserData | null;
}

// --- UTILITIES FROM REFERENCE ---

const cleanAndNormalize = (text: string): string => {
    if (!text) return '';
    let cleaned = text;
    cleaned = cleaned.replace(/(\s|^)imes(\s|$)/g, '$1x$2');
    cleaned = cleaned.replace(/^(?:Option\s+)?[a-eA-E][.):\s]\s*/, '').trim();
    cleaned = cleaned.replace(/^\([a-eA-E]\)\s*/, '').trim();
    cleaned = cleaned.replace(/\s+/g, ' ');
    return cleaned;
};

const processContentForDisplay = (content: string) => {
    if (!content) return '';
    let processed = content;
    processed = processed.replace(/(\s|^)imes(\s|$)/g, '$1\\times$2');
    const isWrapped = processed.includes('\\(') || processed.includes('\\[');
    const specificMathPatterns = /(_\{|\^\{|\\times|\\frac|\\sqrt|\\ce|\\pu|\\sum|\\int|\\pm|\\div)/;
    if (!isWrapped && specificMathPatterns.test(processed)) {
        processed = `\\(${processed}\\)`;
    }
    return processed;
};

const checkAnswer = (question: Question, userAnswer: string | null, optionIndex?: number): boolean => {
    if (!userAnswer) return false;
    const cleanUser = cleanAndNormalize(userAnswer);
    const cleanCorrect = cleanAndNormalize(question.answer);
    if (cleanUser.toLowerCase() === cleanCorrect.toLowerCase()) return true;
    const rawAnswer = question.answer.trim();
    const letterMatch = rawAnswer.match(/^(?:Option\s+)?([A-E])$/i);
    if (letterMatch && optionIndex !== undefined) {
        const correctLetter = letterMatch[1].toUpperCase();
        const userLetter = String.fromCharCode(65 + optionIndex); 
        if (correctLetter === userLetter) return true;
    }
    return false;
};

// --- FLICKER-FREE COMPONENT FROM REFERENCE ---
const MathJaxHtml = memo(({ content, className }: { content: string; className?: string }) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (ref.current && window.MathJax && window.MathJax.typesetPromise) {
            window.MathJax.typesetPromise([ref.current]).catch((err) => console.warn('MathJax error', err));
        }
    }, [content]);
    return (
        <div 
            ref={ref} 
            className={className} 
            dangerouslySetInnerHTML={{ __html: processContentForDisplay(content) }} 
        />
    );
});

type ExamMode = 'game' | 'cbt';

const ExamQSTReaderPage: React.FC<ExamQSTReaderPageProps> = ({ user, userData }) => {
    const { examId } = useParams<{ examId: string }>();
    const navigate = useNavigate();
    
    const [exam, setExam] = useState<ExamQST | null>(null);
    const [loading, setLoading] = useState(true);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    
    // Core Exam State
    const [questionsToPlay, setQuestionsToPlay] = useState<Question[]>([]);
    const [qIndex, setQIndex] = useState(0); 
    const [showResults, setShowResults] = useState(false);
    const [isReviewing, setIsReviewing] = useState(false);
    
    // TTS State
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [speechState, setSpeechState] = useState<'stopped' | 'playing' | 'paused'>('stopped');
    const [selectedVoiceURI, setSelectedVoiceURI] = useState<string | undefined>();
    const [speechRate, setSpeechRate] = useState(1);
    
    const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({});
    const [showTheoryAnswer, setShowTheoryAnswer] = useState<{ [key: number]: boolean }>({});
    const [showCalculator, setShowCalculator] = useState(false);
    
    // CBT Mode state
    const [examMode, setExamMode] = useState<ExamMode | null>(null);
    const [isCbtSetup, setIsCbtSetup] = useState(false); 
    const [isPaused, setIsPaused] = useState(false);
    const [showOfflineGate, setShowOfflineGate] = useState(false);
    
    // Configuration
    const [customHours, setCustomHours] = useState(0);
    const [customMinutes, setCustomMinutes] = useState(30);
    const [customSeconds, setCustomSeconds] = useState(0);
    const [selectedQuestionCount, setSelectedQuestionCount] = useState(10);
    const [timeLeft, setTimeLeft] = useState(1800); 

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    const isProUser = userData?.subscriptionStatus === 'pro' || userData?.subscriptionStatus === 'day_pass' || userData?.role === 'central admin';

    // MAIN FETCH LOGIC
    useEffect(() => {
        const fetchExam = async () => {
            if (!examId) return;
            
            // Critical fix for blank screen: Wait for user data to arrive before checking permissions
            if (user && !userData) return;
            
            setLoading(true);
            try {
                let fetchedExam: ExamQST | undefined;

                if (isStandalone) {
                    // PWA Behavior: User access - prioritize IndexedDB
                    fetchedExam = await getOfflineExam(examId);
                    if (!fetchedExam && navigator.onLine) {
                        fetchedExam = await getExamQSTById(examId) || undefined;
                        if (fetchedExam) await saveOfflineExam(fetchedExam);
                    }
                } else {
                    // Browser Behavior: Admin access - prioritize Firestore
                    if (navigator.onLine) {
                        fetchedExam = await getExamQSTById(examId) || undefined;
                    } else {
                        // Fallback for admins if they happen to have offline data
                        fetchedExam = await getOfflineExam(examId);
                    }
                }

                if (!fetchedExam) {
                    if (!navigator.onLine && isStandalone) setShowOfflineGate(true);
                    else setAlertMessage("Exam content unreachable. Please check your connection.");
                    setLoading(false);
                    return;
                }

                // Security Check
                if (fetchedExam.accessLevel === 'pro' && !isProUser) {
                    navigate(`/exam-qst-viewer/${examId}`);
                    return;
                }

                // --- BUSINESS RULE: DIFFICULTY-BASED QUESTION CAPPING ---
                const diff = fetchedExam.difficulty || "";
                let maxQuestions = fetchedExam.questions.length;
                if (diff.includes("Junior")) maxQuestions = 100;
                else if (diff.includes("Senior")) maxQuestions = 400;
                else if (diff.includes("Tertiary")) maxQuestions = 600;

                // Slice based on the rule
                const finalPool = fetchedExam.questions.slice(0, maxQuestions);
                
                setExam({ ...fetchedExam, questions: finalPool });
                setQuestionsToPlay(finalPool);
                setSelectedQuestionCount(finalPool.length);
                setLoading(false);
            } catch (err) { 
                console.error("Reader boot error:", err);
                setAlertMessage("An error occurred while loading the examHall.");
                setLoading(false);
            }
        };
        fetchExam();
    }, [examId, isProUser, navigate, user, userData, isStandalone]);

    // RESTORE PROGRESS (PWA Standalone Only)
    useEffect(() => {
        if (isStandalone && exam && userData && isProUser && userData?.examProgress?.[examId!] && !examMode) {
            const isCompleted = userData.completedExamQSTs?.includes(examId!);
            if (isCompleted) return;

            const progress = userData.examProgress[examId!];
            if (progress.questionIndices && progress.questionIndices.length > 0) {
                 // Re-map saved indices to actual question objects
                 const restoredQuestions = progress.questionIndices
                    .map(i => exam.questions[i])
                    .filter(q => !!q);
                 
                 if (restoredQuestions.length > 0) {
                     setQuestionsToPlay(restoredQuestions);
                     setExamMode(progress.mode as any);
                     setQIndex(progress.currentQuestionIndex || 0);
                     setUserAnswers(progress.answers || {});
                     if (progress.timeLeft) setTimeLeft(progress.timeLeft);
                     setIsCbtSetup(false); 
                 }
            }
        }
    }, [exam, isProUser, userData, examId, examMode, isStandalone]);

    // AUTO SAVE (PWA Standalone Only) - Stages dirty data for single batch cloud sync
    useEffect(() => {
        if (isStandalone && isProUser && examMode && questionsToPlay.length > 0 && exam && user && !showResults) {
            const timeout = setTimeout(() => {
                // We use global IDs relative to the original pool
                const indices = questionsToPlay.map(q => exam.questions.findIndex(eq => eq.question === q.question));
                updateUserExamProgress(user.uid, examId!, {
                    currentQuestionIndex: qIndex,
                    answers: userAnswers,
                    mode: examMode,
                    timeLeft: timeLeft,
                    questionIndices: indices
                });
            }, 5000); 
            return () => clearTimeout(timeout);
        }
    }, [qIndex, userAnswers, examMode, timeLeft, questionsToPlay, exam, isProUser, user, examId, showResults, isStandalone]);
    
    const handleBackAndSave = async () => {
        if (isReviewing) { setShowResults(true); setIsReviewing(false); return; }
        if (showResults || !examMode) { navigate('/exams'); return; }
        
        // Only save on exit if in PWA
        if (isStandalone && isProUser && user && exam && examId) {
            const indices = questionsToPlay.map(q => exam.questions.findIndex(eq => eq.question === q.question));
            const progressData = {
                currentQuestionIndex: qIndex,
                answers: userAnswers,
                mode: examMode,
                timeLeft: timeLeft, 
                questionIndices: indices
            };
            try { await updateUserExamProgress(user.uid, examId, progressData); } catch (e) {}
            navigate('/exams');
        } else {
            if (confirm("Exit session? Progress will not be saved.")) { navigate('/exams'); }
        }
    };

    const finishExam = useCallback(async () => {
        if (showResults) return;
        setShowResults(true);
        
        // Only mark complete in cloud if in PWA
        if (isStandalone && user && examId && exam) {
            const calculatedScore = Object.keys(userAnswers).reduce((acc, idxStr) => {
                const idx = parseInt(idxStr);
                const question = questionsToPlay[idx];
                if (question && question.type === 'MCQ') {
                    const isCorrect = checkAnswer(question, userAnswers[idx], idx); 
                    return acc + (isCorrect ? 1 : 0);
                }
                return acc;
            }, 0);
            const mcqCount = questionsToPlay.filter(q => q.type === 'MCQ').length;
            await markExamQSTAsComplete(user.uid, examId, calculatedScore, mcqCount);
        }
    }, [user, examId, exam, userAnswers, questionsToPlay, showResults, isStandalone]);

    useEffect(() => {
        if (examMode !== 'cbt' || showResults || isPaused || isReviewing) return;
        if (timeLeft <= 0) { finishExam(); return; }
        const timerId = setInterval(() => { setTimeLeft(t => t - 1); }, 1000);
        return () => clearInterval(timerId);
    }, [examMode, timeLeft, showResults, finishExam, isPaused, isReviewing]);

    // TTS LOGIC
    useEffect(() => {
        const synth = window.speechSynthesis;
        const updateVoices = () => setVoices(synth.getVoices());
        updateVoices();
        if(synth.onvoiceschanged !== undefined) synth.onvoiceschanged = updateVoices;
        return () => { synth.onvoiceschanged = null; };
    }, []);

    const currentQuestion = qIndex >= 0 && questionsToPlay.length > 0 ? questionsToPlay[qIndex] : null;

    const stopTTS = useCallback(() => {
        const synth = window.speechSynthesis;
        if (synth.speaking || synth.paused) synth.cancel();
        setSpeechState('stopped');
    }, []);

    useEffect(() => stopTTS, [qIndex, stopTTS]);
    useEffect(() => () => stopTTS(), [stopTTS]);

    const handleTTS = useCallback(() => {
        if (!isProUser) { navigate('/upgrade'); return; }
        const synth = window.speechSynthesis;
        if (speechState === 'playing') { synth.pause(); setSpeechState('paused'); return; }
        if (speechState === 'paused') { synth.resume(); setSpeechState('playing'); return; }
        if (!currentQuestion) return;
        
        let contentToRead = currentQuestion.question;
        if (currentQuestion.type === 'MCQ' && currentQuestion.options) {
            contentToRead += ". " + currentQuestion.options.map((opt, i) => `Option ${String.fromCharCode(65 + i)}: ${cleanAndNormalize(opt)}`).join('. ');
        }
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = contentToRead.replace(/\\\(.*?\\\)|\\\[.*?\\\]/g, '(math equation)');
        contentToRead = tempDiv.textContent || tempDiv.innerText;
        
        const utterance = new SpeechSynthesisUtterance(contentToRead);
        const selectedVoice = voices.find(v => v.voiceURI === selectedVoiceURI);
        if (selectedVoice) utterance.voice = selectedVoice;
        utterance.rate = speechRate;
        utterance.onend = () => setSpeechState('stopped');
        utterance.onerror = () => setSpeechState('stopped');
        synth.speak(utterance);
        setSpeechState('playing');
    }, [isProUser, navigate, speechState, currentQuestion, voices, selectedVoiceURI, speechRate]);

    const handleAnswerSelect = (questionIndex: number, value: string) => {
        if (showResults && !isReviewing) return; 
        if (isReviewing) return; 
        setUserAnswers(prev => ({ ...prev, [questionIndex]: value }));
    };

    const handleNext = () => {
        if (qIndex < questionsToPlay.length - 1) setQIndex(qIndex + 1);
        else if (qIndex === questionsToPlay.length - 1) { finishExam(); }
    };
    const handlePrev = () => { if (qIndex > 0) setQIndex(qIndex - 1); };

    const handleStartExam = (mode: ExamMode) => {
        if (mode === 'cbt') {
            const totalSeconds = (customHours * 3600) + (customMinutes * 60) + customSeconds;
            setTimeLeft(totalSeconds > 0 ? totalSeconds : 1800);
            if (exam && selectedQuestionCount < exam.questions.length) {
                const shuffled = shuffleArray([...exam.questions]);
                setQuestionsToPlay(shuffled.slice(0, selectedQuestionCount));
            } else {
                setQuestionsToPlay(shuffleArray([...(exam?.questions || [])]));
            }
        } else {
            setQuestionsToPlay(shuffleArray([...(exam?.questions || [])]));
        }
        setExamMode(mode);
        setIsCbtSetup(false);
    };

    const handleReset = () => {
        setQIndex(0); setUserAnswers({}); setShowTheoryAnswer({}); setShowResults(false);
        setIsReviewing(false); setIsPaused(false); setExamMode(null); setIsCbtSetup(false);
    };

    const togglePause = () => { if (!isProUser) return; setIsPaused(!isPaused); };

    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        return `${hours > 0 ? hours + ':' : ''}${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    if (loading) return <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-900 z-50"><LoadingSpinner /><p className="mt-4 text-gray-300">Initializing ExamHall...</p></div>;
    if (showOfflineGate) return <OfflineGateModal isOpen={showOfflineGate} onClose={() => setShowOfflineGate(false)} />;

    if (!exam) return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-900 z-50 p-4 text-center">
            <WifiOff size={48} className="text-gray-500 mb-4"/>
            <h2 className="text-xl font-bold text-white">Access Error</h2>
            <p className="text-gray-400 mt-2 max-w-sm">{alertMessage || "This exam is currently unavailable."}</p>
            <button onClick={() => navigate('/exams')} className="mt-6 px-6 py-2 bg-orange-600 rounded-lg font-bold text-white">Back to List</button>
        </div>
    );

    const score = Object.keys(userAnswers).reduce((acc, idxStr) => {
        const idx = parseInt(idxStr);
        const question = questionsToPlay[idx];
        if (question && question.type === 'MCQ') return acc + (checkAnswer(question, userAnswers[idx], idx) ? 1 : 0);
        return acc;
    }, 0);
    const mcqCount = questionsToPlay.filter(q => q.type === 'MCQ').length;

    // --- RENDER SELECTION SCREEN ---
    if (!examMode) {
        return (
            <div className="fixed inset-0 z-50 bg-gray-900 overflow-y-auto custom-scrollbar">
                 <button onClick={handleBackAndSave} className="fixed top-4 left-4 z-50 flex items-center space-x-2 text-orange-500 hover:text-orange-400 transition-colors bg-gray-900/50 rounded-full px-3 py-1 backdrop-blur-sm"><ArrowLeft size={20}/><span>Back</span></button>
                 <div className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 pb-10">
                     <div className="text-center mb-10 max-w-2xl px-4">
                         <h1 className="text-2xl md:text-3xl font-black text-white mb-2 break-words leading-tight">{exam.title}</h1>
                         <p className="text-gray-400">{exam.questions.length} Questions • {exam.difficulty || 'Standard Level'}</p>
                     </div>
                     {!isCbtSetup ? (
                         <div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl px-4">
                            <div onClick={() => handleStartExam('game')} className="flex-1 bg-gray-800 hover:bg-gray-750 border-2 border-gray-700 hover:border-blue-500 rounded-2xl p-8 cursor-pointer transition-all group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Gamepad2 size={100} className="text-blue-500" /></div>
                                <div className="relative z-10">
                                    <div className="w-12 h-12 bg-blue-900/50 rounded-xl flex items-center justify-center mb-4 text-blue-400 group-hover:text-blue-300"><Gamepad2 size={28} /></div>
                                    <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">Game Mode</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">Immediate feedback. See correct answer instantly. Best for learning and revision.</p>
                                </div>
                            </div>
                            <div onClick={() => isProUser ? setIsCbtSetup(true) : navigate('/upgrade')} className={`flex-1 bg-gray-800 hover:bg-gray-750 border-2 border-gray-700 hover:border-orange-500 rounded-2xl p-8 transition-all group relative overflow-hidden flex flex-col cursor-pointer ${!isProUser ? 'opacity-80' : ''}`}>
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><MonitorPlay size={100} className="text-orange-500" /></div>
                                <div className="relative z-10 flex-grow">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-12 h-12 bg-orange-900/50 rounded-xl flex items-center justify-center text-orange-400 group-hover:text-orange-300"><MonitorPlay size={28} /></div>
                                        {!isProUser && <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded">PRO</span>}
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-orange-400 transition-colors">CBT Mode</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed mb-4">Simulate a real exam. Customize timer and question count. Review score at end.</p>
                                </div>
                            </div>
                         </div>
                     ) : (
                         <div className="w-full max-w-md bg-gray-800 rounded-2xl border border-gray-700 p-6 shadow-2xl relative">
                             <button onClick={() => setIsCbtSetup(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20}/></button>
                             <div className="text-center mb-6"><MonitorPlay size={40} className="text-orange-500 mx-auto mb-2"/><h2 className="text-2xl font-bold text-white">Configure Exam</h2><p className="text-sm text-gray-400">Set your preferences for this practice session.</p></div>
                             <div className="space-y-6">
                                 <div>
                                     <label className="text-xs text-gray-500 uppercase font-bold mb-3 block flex items-center"><Timer size={14} className="mr-1"/> Set Duration</label>
                                     <div className="flex gap-2">
                                         <div className="flex-1"><input type="number" min="0" value={customHours} onChange={e => setCustomHours(Number(e.target.value))} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-center text-white outline-none text-lg" /><span className="text-[10px] text-gray-500 text-center block mt-1">Hours</span></div>
                                         <div className="flex-1"><input type="number" min="0" max="59" value={customMinutes} onChange={e => setCustomMinutes(Number(e.target.value))} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-center text-white outline-none text-lg" /><span className="text-[10px] text-gray-500 text-center block mt-1">Mins</span></div>
                                         <div className="flex-1"><input type="number" min="0" max="59" value={customSeconds} onChange={e => setCustomSeconds(Number(e.target.value))} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-center text-white outline-none text-lg" /><span className="text-[10px] text-gray-500 text-center block mt-1">Secs</span></div>
                                     </div>
                                 </div>
                                 <div>
                                     <div className="flex justify-between items-end mb-3"><label className="text-xs text-gray-500 uppercase font-bold flex items-center"><ListFilter size={14} className="mr-1"/> Question Count</label><span className="text-orange-400 font-bold text-sm">{selectedQuestionCount} / {exam.questions.length}</span></div>
                                     <input type="range" min="1" max={exam.questions.length} value={selectedQuestionCount} onChange={(e) => setSelectedQuestionCount(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"/>
                                 </div>
                                 <button onClick={() => handleStartExam('cbt')} className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-105 flex items-center justify-center">Start CBT Exam</button>
                             </div>
                         </div>
                     )}
                 </div>
            </div>
        )
    }

    const renderQuestionPage = (question: Question, index: number) => {
        if (isPaused) {
            return (
                <div className="flex flex-col items-center justify-center h-[50vh] text-center p-8">
                    <div className="bg-orange-900/30 p-6 rounded-full mb-4 animate-pulse"><Pause size={48} className="text-orange-500" /></div>
                    <h2 className="text-2xl font-bold text-white mb-2">Exam Paused</h2>
                    <p className="text-gray-400 mb-6">Timer is stopped. Click resume to continue.</p>
                    <button onClick={togglePause} className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-full font-bold transition-transform hover:scale-105">Resume Exam</button>
                </div>
            );
        }
        const userAnswer = userAnswers[index];
        const isAnswered = !!userAnswer;
        const showValidation = (examMode === 'game' && isAnswered) || (examMode === 'cbt' && isReviewing);
        
        return (
            <div className="max-w-3xl w-full mx-auto p-4 sm:p-6 md:p-8">
                <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-orange-500">Question {index + 1} of {questionsToPlay.length}</h2><select value={index} onChange={e => setQIndex(Number(e.target.value))} className="bg-gray-700 border-gray-600 rounded-md p-2 text-white outline-none"><option value={index}>Jump to Question...</option>{questionsToPlay.map((_, i) => <option key={i} value={i}>Question {i + 1}</option>)}</select></div>
                <MathJaxHtml className="ebook-content text-xl mb-6" content={question.question} />
                {question.type === 'MCQ' && question.options && (
                    <div className="space-y-4">
                        {question.options.map((option, i) => {
                            const cleanOpt = cleanAndNormalize(option);
                            const isSelected = cleanAndNormalize(userAnswer || '') === cleanOpt;
                            const isCorrectChoice = checkAnswer(question, option, i);
                            let buttonClass = "border-gray-700 bg-gray-800 hover:bg-gray-700"; 
                            if (showValidation) {
                                if (isCorrectChoice) buttonClass = "border-green-500 bg-green-900/50 text-white ring-1 ring-green-500";
                                else if (isSelected) buttonClass = "border-red-500 bg-red-900/50 text-white ring-1 ring-red-500";
                                else if (isAnswered && !isCorrectChoice) buttonClass = "border-gray-700 bg-gray-800 opacity-50"; 
                            } else { if (isSelected) buttonClass = "border-blue-500 bg-blue-900/50 text-white ring-1 ring-blue-500"; }
                            return (
                                <button key={i} onClick={() => handleAnswerSelect(index, option)} className={`w-full text-left p-4 border-2 rounded-lg flex items-start space-x-3 transition-all ${buttonClass}`} disabled={showValidation}>
                                    <span className={`font-bold ${isSelected || (showValidation && isCorrectChoice) ? 'text-white' : 'text-orange-400'}`}>{String.fromCharCode(65 + i)}.</span>
                                    <div className="flex-1"><MathJaxHtml content={cleanOpt} /></div>
                                    {showValidation && isCorrectChoice && <Check className="text-green-400 ml-auto" />}
                                    {showValidation && isSelected && !isCorrectChoice && <X className="text-red-400 ml-auto" />}
                                </button>
                            );
                        })}
                    </div>
                )}
                {question.type === 'Theory' && (
                    <div className="space-y-4">
                        <textarea value={userAnswer || ''} onChange={(e) => handleAnswerSelect(index, e.target.value)} placeholder="Type your answer here..." rows={8} disabled={isReviewing} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 focus:ring-orange-500 text-white placeholder-gray-500"/>
                        {(showValidation || (examMode === 'game')) && (
                            <button onClick={() => setShowTheoryAnswer(prev => ({ ...prev, [index]: !prev[index] }))} className="flex items-center space-x-2 text-orange-400 hover:text-orange-300"><Eye size={18}/><span>{showTheoryAnswer[index] ? 'Hide' : 'Show'} Model Answer</span></button>
                        )}
                    </div>
                )}
                {(showValidation && question.type === 'MCQ' && (isAnswered || isReviewing)) && (
                    <div className="mt-6 p-4 bg-gray-800 border border-gray-700 rounded-lg animate-fade-in">
                        <p className="mb-2"><strong className="text-green-400">Correct Answer:</strong> <MathJaxHtml className="inline ml-1" content={question.answer} /></p>
                        {question.explanation && (<div><strong className="text-orange-400 block mb-1">Explanation:</strong><MathJaxHtml className="text-gray-300 text-sm leading-relaxed" content={question.explanation} /></div>)}
                    </div>
                )}
                {showTheoryAnswer[index] && question.type === 'Theory' && (
                    <div className="mt-6 p-4 bg-gray-800 border border-gray-700 rounded-lg space-y-4 animate-fade-in">
                        <div><p className="font-bold text-green-400 mb-1">Model Answer:</p><MathJaxHtml className="text-gray-300" content={question.answer} /></div>
                        {question.answerVariations && (<div><p className="font-bold text-orange-400 mb-1">Other ways to answer:</p><ul className="list-disc list-inside space-y-1 text-gray-300 text-sm">{question.answerVariations.map((v, i) => (<li key={i}><MathJaxHtml className="inline" content={v} /></li>))}</ul></div>)}
                    </div>
                )}
            </div>
        )
    };
    
    const renderResultsPage = () => (
         <div className="text-center flex flex-col items-center justify-center min-h-[70vh] max-w-3xl w-full mx-auto p-4 animate-fade-in">
            <Award size={80} className="text-yellow-500 mb-6 drop-shadow-lg" />
            <h2 className="text-4xl font-black text-white mb-2">Session Complete!</h2>
            <p className="text-lg text-gray-400 mb-8">Performance data finalized.</p>
            <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 w-full max-w-md shadow-2xl mb-8">
                <div className="flex justify-between items-end mb-2"><span className="text-gray-400 font-bold uppercase tracking-wider text-xs">Total Score</span><span className="text-4xl font-black text-white">{score} <span className="text-lg text-gray-500">/ {mcqCount}</span></span></div>
                <div className="w-full bg-gray-700 h-4 rounded-full overflow-hidden mb-6"><div className="bg-gradient-to-r from-orange-500 to-yellow-500 h-full transition-all duration-1000" style={{ width: `${mcqCount > 0 ? (score/mcqCount)*100 : 0}%` }}></div></div>
                <div className="grid grid-cols-2 gap-4 text-left"><div className="bg-gray-900 p-3 rounded-lg border border-gray-700"><p className="text-xs text-gray-500">Exam Mode</p><p className="font-bold text-white capitalize">{examMode}</p></div><div className="bg-gray-900 p-3 rounded-lg border border-gray-700"><p className="text-xs text-gray-500">Questions</p><p className="font-bold text-white">{questionsToPlay.length}</p></div></div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                <button onClick={() => { setShowResults(false); setIsReviewing(true); setQIndex(0); }} className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center space-x-2 transition-colors"><Eye size={20} /><span>View Correction</span></button>
                <button onClick={handleReset} className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl flex items-center justify-center space-x-2 transition-colors"><RefreshCw size={20} /><span>Try Again</span></button>
            </div>
            <button onClick={() => navigate('/exams')} className="mt-6 text-gray-500 hover:text-white underline text-sm">Back to Hall</button>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
            <CalculatorModal isOpen={showCalculator} onClose={() => setShowCalculator(false)} />
            <header className="flex items-center justify-between p-4 bg-gray-800 shadow-md z-10 border-b border-gray-700">
                <button onClick={handleBackAndSave} className="flex items-center space-x-2 text-orange-500 hover:text-orange-400"><ArrowLeft size={20}/></button>
                <div className="text-center truncate flex-1 mx-4">
                    {examMode === 'cbt' && !showResults ? (
                        <div className="flex items-center justify-center space-x-3">
                            <div className={`flex items-center space-x-2 font-mono text-lg font-bold px-3 py-1 rounded bg-black/30 border ${timeLeft < 60 ? 'border-red-500/50 text-red-500 animate-pulse' : 'border-gray-600 text-gray-300'}`}><Timer size={18} /><span>{formatTime(timeLeft)}</span></div>
                            {isProUser && (<button onClick={togglePause} className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-md text-white transition-colors" title={isPaused ? "Resume" : "Pause"}>{isPaused ? <Play size={16} fill="currentColor"/> : <Pause size={16} fill="currentColor"/>}</button>)}
                        </div>
                    ) : (<h1 className="font-bold text-gray-200">{isReviewing ? "Correction Mode" : (exam ? exam.title : "Exam")}</h1>)}
                </div>
                <div className="flex items-center space-x-2">
                    {!showResults && !isReviewing && (<button onClick={() => setShowCalculator(true)} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full text-gray-300 hover:text-white transition-colors"><Calculator size={18}/></button>)}
                    {isProUser && !showResults && (<button onClick={handleTTS} className={`p-2 rounded-full transition-colors ${speechState === 'playing' ? 'bg-orange-600 text-white animate-pulse' : 'bg-gray-700 text-gray-300 hover:text-white'}`}>{speechState === 'playing' ? <Pause size={18}/> : <Play size={18}/>}</button>)}
                </div>
            </header>
            <main className="flex-grow overflow-y-auto bg-gray-900 custom-scrollbar">
                {showResults && !isReviewing ? renderResultsPage() : currentQuestion ? renderQuestionPage(currentQuestion, qIndex) : (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-400">
                        <LoadingSpinner />
                        <p className="mt-4">Initializing Hall...</p>
                    </div>
                )}
            </main>
            {!showResults && (
                <footer className="bg-gray-800 p-4 shadow-inner z-10 pb-8 md:pb-[env(safe-area-inset-bottom)] border-t border-gray-700">
                    <div className="flex items-center justify-between max-w-4xl mx-auto">
                        <button onClick={handlePrev} disabled={qIndex === 0} className="p-3 rounded-full bg-gray-700 hover:bg-orange-600 disabled:opacity-30 transition-colors text-white"><ChevronLeft /></button>
                        {!isReviewing && qIndex === questionsToPlay.length - 1 ? (
                            <button onClick={finishExam} className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-lg transition-transform hover:scale-105">Submit Exam</button>
                        ) : (<span className="text-sm font-bold text-gray-500">{isReviewing ? "Reviewing Answers" : "Select an option"}</span>)}
                        <button onClick={handleNext} disabled={qIndex === questionsToPlay.length - 1} className="p-3 rounded-full bg-gray-700 hover:bg-orange-600 disabled:opacity-30 transition-colors text-white"><ChevronRight /></button>
                    </div>
                </footer>
            )}
            {alertMessage && (
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-yellow-900 border border-yellow-500 text-yellow-100 px-4 py-2 rounded-lg shadow-lg z-[100] animate-fade-in-down flex items-center"><WifiOff size={16} className="mr-2"/><span className="text-sm">{alertMessage}</span><button onClick={() => setAlertMessage(null)} className="ml-3"><X size={14}/></button></div>
            )}
        </div>
    );
};

export default ExamQSTReaderPage;