
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { ExamQST, Question, UserData } from '../types';
import type { User } from 'firebase/auth';
import { getExamQSTById } from '../services/firestoreService';
import { ArrowLeft, ChevronLeft, ChevronRight, Check, X, Sparkles } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import InfoBanner from '../components/InfoBanner';

declare global {
    interface Window { MathJax: { typesetPromise: (elements?: HTMLElement[]) => Promise<void>; }; }
}

interface ExamQSTViewerPageProps { 
    user: User | null;
    userData: UserData | null;
}

const PREVIEW_QUESTION_LIMIT = 3;

const cleanOptionText = (text: string): string => {
    if (!text) return '';
    return text.replace(/^[a-zA-Z][.)]\s*/, '').trim();
};


const ExamQSTViewerPage: React.FC<ExamQSTViewerPageProps> = ({ user, userData }) => {
    const { examId } = useParams<{ examId: string }>();
    const navigate = useNavigate();
    const [exam, setExam] = useState<ExamQST | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(0); 
    const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({});
    const examAreaRef = useRef<HTMLDivElement>(null); // Ref for whole question area (Q + Options)
    const isProUser = userData?.subscriptionStatus === 'pro';

    useEffect(() => {
        if (examId) {
            getExamQSTById(examId).then(fetchedExam => {
                setExam(fetchedExam);
                setLoading(false);
            });
        }
    }, [examId]);

    const pages = useMemo(() => {
        if (!exam) return [];
        const questionPages = exam.questions.slice(0, PREVIEW_QUESTION_LIMIT).map((q, i) => ({ type: 'question' as const, question: q, index: i }));
        return [
            { type: 'cover' as const },
            { type: 'intro' as const },
            ...questionPages,
            { type: 'upgrade' as const }
        ];
    }, [exam]);

    useEffect(() => {
        const typeset = async () => {
             if (pages[currentPage]?.type === 'question' && examAreaRef.current) {
                const el = examAreaRef.current;
                
                if (window.MathJax && window.MathJax.typesetPromise) {
                    try {
                         await window.MathJax.typesetPromise([el]);
                         const errors = el.querySelectorAll('mjx-merror, .mjx-error');
                         errors.forEach(err => err.remove());
                    } catch(e) { console.error(e); }
                } else {
                     const checkInterval = setInterval(() => {
                        if (window.MathJax?.typesetPromise && examAreaRef.current) {
                             window.MathJax.typesetPromise([examAreaRef.current]);
                             clearInterval(checkInterval);
                        }
                     }, 100);
                     setTimeout(() => clearInterval(checkInterval), 5000);
                }
            }
        };
        typeset();
    }, [currentPage, pages]);
    
    useEffect(() => {
        if (exam && exam.accessLevel === 'free' && isProUser) {
             navigate(`/exam-qst-reader/${exam.id}`);
        }
    }, [exam, isProUser, navigate]);


    const handleNextPage = () => { if (currentPage < pages.length - 1) setCurrentPage(p => p + 1); };
    const handlePrevPage = () => { if (currentPage > 0) setCurrentPage(p => p - 1); };

    const handleAnswerSelect = (questionIndex: number, option: string) => {
        setUserAnswers(prev => ({ ...prev, [questionIndex]: option }));
    };

    const renderQuestionPage = (page: { type: 'question', question: Question, index: number }) => {
        const { question, index } = page;
        const userAnswer = userAnswers[index];
        const isAnswered = !!userAnswer;
        const cleanCorrectAnswer = cleanOptionText(question.answer);

        return (
            <div ref={examAreaRef}>
                <h2 className="text-2xl font-bold mb-6 text-orange-500">Question {index + 1}</h2>
                <div className="ebook-content text-xl mb-6" dangerouslySetInnerHTML={{ __html: question.question }} />
                
                {question.type === 'MCQ' && question.options && (
                    <div className="space-y-4">
                        {question.options.map((option, i) => {
                            const cleanOpt = cleanOptionText(option);
                            const isThisOptionTheCorrectAnswer = cleanCorrectAnswer === cleanOpt;
                            const isSelected = userAnswer === option;
                            
                            let buttonClass = "border-gray-700 bg-gray-800 hover:bg-gray-700";
                            if (isAnswered) {
                                if (isThisOptionTheCorrectAnswer) buttonClass = "border-green-500 bg-green-900/50 text-white";
                                else if (isSelected) buttonClass = "border-red-500 bg-red-900/50 text-white";
                            }
                            return (
                                <button key={i} onClick={() => !isAnswered && handleAnswerSelect(index, option)} disabled={isAnswered} className={`w-full text-left p-4 border-2 rounded-lg transition-all flex items-start space-x-3 ${buttonClass}`}>
                                    <span className="font-bold text-orange-400">{String.fromCharCode(65 + i)}.</span>
                                    <span className="flex-1" dangerouslySetInnerHTML={{ __html: cleanOpt }} />
                                    {isAnswered && isThisOptionTheCorrectAnswer && <Check className="text-green-400" />}
                                    {isAnswered && isSelected && !isThisOptionTheCorrectAnswer && <X className="text-red-400" />}
                                </button>
                            );
                        })}
                    </div>
                )}
                {isAnswered && question.type === 'MCQ' && (
                    <div className="mt-6 p-4 bg-gray-900 rounded-lg">
                        <p><strong className="text-orange-400">Correct Answer:</strong> <span dangerouslySetInnerHTML={{ __html: cleanCorrectAnswer }} /></p>
                        {question.explanation && <p className="mt-2"><strong className="text-orange-400">Explanation:</strong> <span dangerouslySetInnerHTML={{ __html: question.explanation }} /></p>}
                    </div>
                )}
            </div>
        );
    };

    if (loading) return <div className="fixed inset-0 bg-gray-900 flex flex-col items-center justify-center"><LoadingSpinner /><p className="mt-4 text-gray-400">Loading Preview...</p></div>;
    if (!exam || pages.length === 0) return <div className="text-center mt-20">Exam questions not found.</div>;
    const currentPageData = pages[currentPage];

    return (
        <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
            <header className="flex items-center justify-between p-4 bg-gray-800 shadow-md"><button onClick={() => navigate('/')} className="flex items-center space-x-2 text-orange-500"><ArrowLeft size={20}/></button><div className="text-center truncate flex-1 mx-4"><h1 className="font-bold">{exam.title}</h1></div><div className="w-10"></div></header>
            <main className="flex-grow overflow-y-auto p-4 md:p-8"><div className="max-w-3xl w-full mx-auto">
                {currentPageData.type === 'cover' && <div className="text-center flex flex-col items-center justify-center min-h-[70vh]"><img src={exam.coverImageUrl} alt={exam.title} className="w-full max-w-xs mx-auto rounded-lg shadow-2xl aspect-square object-cover"/><h1 className="text-4xl font-bold mt-8">{exam.title}</h1></div>}
                {currentPageData.type === 'intro' && <div><h2 className="text-3xl font-bold mb-6 text-orange-500">Introduction</h2><p className="text-lg leading-relaxed text-gray-300">{exam.introduction}</p></div>}
                {currentPageData.type === 'question' && renderQuestionPage(currentPageData)}
                {currentPageData.type === 'upgrade' && (
                    <div className="text-center bg-gray-800 p-8 rounded-lg">
                        {exam.accessLevel === 'pro' && (
                            <div className="mb-4">
                                <InfoBanner title="Unlock All Questions!">
                                    <p className="text-sm">
                                        This is a preview with {PREVIEW_QUESTION_LIMIT} questions. The full Pro version unlocks all {exam.questions.length} questions, model answers, and explanations to supercharge your exam prep.
                                    </p>
                                </InfoBanner>
                            </div>
                        )}
                        <p className="text-2xl mb-4">Enjoying the preview?</p>
                        <div className="flex items-center justify-center space-x-2 mb-6 text-4xl font-bold text-orange-400"><Sparkles/><span>{exam.accessLevel === 'free' ? 'Practice for Free' : 'Unlock with Pro'}</span></div>
                        <p className="text-xl mb-6">Get all {exam.questions.length} questions now!</p>
                        {user ? (
                             <Link
                                to={exam.accessLevel === 'free' ? `/exam-qst-reader/${exam.id}` : '/upgrade'}
                                className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-12 rounded-full text-lg transition-transform transform hover:scale-105"
                            >
                                {exam.accessLevel === 'free' ? 'Start Practicing' : 'Upgrade to Pro'}
                            </Link>
                        ) : (
                             <Link to="/auth" state={{ from: location.pathname }} className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-12 rounded-full text-lg transition-transform transform hover:scale-105">
                                Login to Continue
                            </Link>
                        )}
                    </div>
                )}
            </div></main>
            <footer className="bg-gray-800 p-4 shadow-inner"><div className="flex items-center justify-between max-w-4xl mx-auto"><button onClick={handlePrevPage} disabled={currentPage === 0} className="p-3 rounded-full bg-gray-700 hover:bg-orange-600 disabled:opacity-50 transition-colors"><ChevronLeft /></button><span className="text-sm text-gray-400">{currentPage + 1} / {pages.length}</span><button onClick={handleNextPage} disabled={currentPage === pages.length - 1} className="p-3 rounded-full bg-gray-700 hover:bg-orange-600 disabled:opacity-50 transition-colors"><ChevronRight /></button></div></footer>
        </div>
    );
};

export default ExamQSTViewerPage;
