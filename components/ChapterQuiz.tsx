
import React, { useState, useEffect, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import type { Question } from '../types';
import { ChevronRight, Check, X, RefreshCw, Calculator, ArrowLeft, Brain, Award, HelpCircle } from 'lucide-react';
import CalculatorModal from './CalculatorModal';

interface ChapterQuizProps {
    questions: Question[];
    themeClasses?: string; // e.g. "bg-gray-900 text-gray-300"
}

// --- HELPER: MathJax Processor ---
// Processes raw LaTeX to ensure it plays nice with MathJax
const processMathJax = (html: string) => {
    if (!html) return "";
    let processed = html;
    
    const fixLatex = (text: string) => {
        try {
            return text.replace(/(?<!\\)%/g, '\\%');
        } catch (e) {
            return text.replace(/([^\\])%/g, '$1\\%');
        }
    };

    processed = processed.replace(/\\\((.*?)\\\)/gs, (_, content) => `\\(${fixLatex(content)}\\)`);
    processed = processed.replace(/\\\[(.*?)\\\]/gs, (_, content) => `\\[${fixLatex(content)}\\]`);

    return processed;
};

// --- COMPONENT: MathJaxHtml ---
// This component is memoized to prevent React from re-rendering the HTML string 
// and wiping out the MathJax typesetting when parent state (like userAnswers) changes.
const MathJaxHtml = memo(({ content, className }: { content: string, className?: string }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (ref.current && window.MathJax && window.MathJax.typesetPromise) {
            // Clear previous errors if any
            const errors = ref.current.querySelectorAll('mjx-merror, .mjx-error');
            errors.forEach(err => err.remove());
            
            window.MathJax.typesetPromise([ref.current]).catch(err => console.warn('MathJax error', err));
        }
    }, [content]);

    return (
        <div 
            ref={ref} 
            className={className} 
            dangerouslySetInnerHTML={{ __html: processMathJax(content) }} 
        />
    );
});

const cleanOptionText = (text: string): string => {
    if (!text) return '';
    return text.replace(/^[a-zA-Z][.)]\s*/, '').trim();
};

const ChapterQuiz: React.FC<ChapterQuizProps> = ({ questions, themeClasses = "bg-gray-900 text-gray-100" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<(string | null)[]>(Array(questions.length).fill(null));
    const [showResults, setShowResults] = useState(false);
    const [showCalculator, setShowCalculator] = useState(false);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleAnswerSelect = (selectedOption: string) => {
        const newAnswers = [...userAnswers];
        newAnswers[currentQIndex] = selectedOption;
        setUserAnswers(newAnswers);
    };
    
    const handleReset = () => {
        setCurrentQIndex(0);
        setUserAnswers(Array(questions.length).fill(null));
        setShowResults(false);
    };

    const score = userAnswers.reduce((acc, answer, index) => {
        const question = questions[index];
        const cleanCorrectAnswer = cleanOptionText(question.answer);
        const cleanUserAnswer = answer ? cleanOptionText(answer) : null;
        return acc + (cleanUserAnswer === cleanCorrectAnswer ? 1 : 0);
    }, 0);
    
    if (!questions || questions.length === 0) {
        return null;
    }

    const currentQuestion = questions[currentQIndex];
    const userAnswer = userAnswers[currentQIndex];
    const isAnswered = userAnswer !== null;

    // Separate background and text color from themeClasses to apply specifically
    const bgClass = themeClasses.split(' ').find(c => c.startsWith('bg-')) || 'bg-gray-900';
    
    // Modal Content Component to be rendered via Portal
    const ModalContent = (
        <div className={`fixed inset-0 z-[60] flex flex-col ${themeClasses} animate-slide-up-bottom overflow-y-auto`}>
            {/* Render Calculator inside the portal context with higher z-index */}
            <CalculatorModal isOpen={showCalculator} onClose={() => setShowCalculator(false)} zIndex={70} />

            {/* Header */}
            <div className={`flex items-center justify-between p-4 border-b border-white/10 ${bgClass} sticky top-0 z-10 shadow-md`}>
                <button 
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                
                <div className="text-center">
                    <h2 className="font-bold text-lg">Chapter Quiz</h2>
                    {!showResults && <p className="text-xs opacity-70">Question {currentQIndex + 1} of {questions.length}</p>}
                </div>

                <button 
                    onClick={() => setShowCalculator(true)}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors text-orange-500"
                >
                    <Calculator size={24} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-grow flex flex-col items-center p-4 md:p-8 max-w-3xl mx-auto w-full">
                
                {showResults ? (
                    <div className="w-full text-center animate-fade-in py-10">
                        <Award size={80} className="mx-auto text-yellow-500 mb-6 drop-shadow-lg" />
                        <h2 className="text-3xl font-bold mb-2">Quiz Completed!</h2>
                        <p className="text-lg opacity-80 mb-8">You scored</p>
                        
                        <div className="text-6xl font-black text-orange-500 mb-8">
                            {score}<span className="text-2xl text-gray-500">/{questions.length}</span>
                        </div>

                        <div className="w-full bg-gray-700 h-4 rounded-full overflow-hidden mb-8 max-w-md mx-auto">
                            <div 
                                className="bg-orange-500 h-full transition-all duration-1000" 
                                style={{ width: `${(score / questions.length) * 100}%` }}
                            ></div>
                        </div>

                        <button 
                            onClick={handleReset} 
                            className="px-8 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold transition-transform hover:scale-105 flex items-center justify-center mx-auto"
                        >
                            <RefreshCw size={20} className="mr-2" /> Retry Quiz
                        </button>
                    </div>
                ) : (
                    <div className="w-full animate-fade-in space-y-6">
                        {/* Question */}
                        <div className="text-xl md:text-2xl font-medium leading-relaxed min-h-[100px]">
                            <MathJaxHtml content={currentQuestion.question} />
                        </div>

                        {/* Options */}
                        <div className="space-y-3">
                            {currentQuestion.options?.map((option, i) => {
                                const cleanOpt = cleanOptionText(option);
                                const cleanCorrectAnswer = cleanOptionText(currentQuestion.answer);
                                
                                const isSelected = cleanOptionText(userAnswer || '') === cleanOpt;
                                const isCorrect = cleanCorrectAnswer === cleanOpt;

                                let buttonClass = "border-2 border-white/10 bg-white/5 hover:bg-white/10";
                                let icon = null;

                                if (isAnswered) {
                                    if (isCorrect) {
                                        buttonClass = "border-green-500 bg-green-900/30 text-green-100";
                                        icon = <Check className="text-green-400" />;
                                    } else if (isSelected) {
                                        buttonClass = "border-red-500 bg-red-900/30 text-red-100";
                                        icon = <X className="text-red-400" />;
                                    } else {
                                        buttonClass = "border-transparent opacity-50";
                                    }
                                }

                                return (
                                    <button
                                        key={i}
                                        onClick={() => !isAnswered && handleAnswerSelect(option)}
                                        disabled={isAnswered}
                                        className={`w-full text-left p-4 rounded-xl transition-all flex items-start space-x-4 group ${buttonClass}`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isAnswered ? 'bg-black/20' : 'bg-orange-600 text-white'}`}>
                                            {String.fromCharCode(65 + i)}
                                        </div>
                                        <div className="flex-grow pt-1 text-lg">
                                            <MathJaxHtml content={cleanOpt} />
                                        </div>
                                        {icon && <div className="flex-shrink-0 pt-1">{icon}</div>}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Feedback Area */}
                        {isAnswered && (
                            <div className="mt-6 p-5 rounded-xl bg-black/20 border border-white/10 animate-fade-in-up">
                                <div className="flex items-start gap-3">
                                    <HelpCircle className="text-orange-400 mt-1 flex-shrink-0" />
                                    <div>
                                        <p className="font-bold text-orange-400 mb-1">Answer & Explanation</p>
                                        <div className="text-lg font-semibold mb-2">
                                            <MathJaxHtml content={cleanOptionText(currentQuestion.answer)} />
                                        </div>
                                        {currentQuestion.explanation && (
                                            <div className="text-sm opacity-80 leading-relaxed border-l-2 border-white/20 pl-3">
                                                <MathJaxHtml content={currentQuestion.explanation} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer / Nav */}
            {!showResults && (
                <div className={`p-4 border-t border-white/10 ${bgClass} sticky bottom-0`}>
                    <div className="max-w-3xl mx-auto flex justify-end">
                        {currentQIndex < questions.length - 1 ? (
                            <button 
                                onClick={() => setCurrentQIndex(i => i + 1)} 
                                disabled={!isAnswered} 
                                className="px-8 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center"
                            >
                                Next Question <ChevronRight className="ml-2" size={20}/>
                            </button>
                        ) : (
                            <button 
                                onClick={() => setShowResults(true)} 
                                disabled={!isAnswered} 
                                className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center"
                            >
                                View Results <Award className="ml-2" size={20}/>
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="mt-12 mb-20 font-sans">
            {/* --- TRIGGER CARD --- */}
            <div 
                onClick={() => setIsOpen(true)}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-600 to-red-600 p-1 cursor-pointer transform transition-all duration-300 hover:scale-[1.02] shadow-xl"
            >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-20 transition-opacity"></div>
                <div className="relative bg-gray-900 rounded-xl p-6 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="bg-orange-500/20 p-3 rounded-full text-orange-500 group-hover:text-white group-hover:bg-orange-500 transition-colors">
                            <Brain size={32} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white group-hover:text-orange-400 transition-colors">Test Your Understanding</h3>
                            <p className="text-gray-400 text-sm mt-1">{questions.length} Questions • Assess your mastery of this chapter</p>
                        </div>
                    </div>
                    <div className="bg-gray-800 p-2 rounded-full text-gray-400 group-hover:text-white group-hover:bg-orange-600 transition-all">
                        <ChevronRight size={24} />
                    </div>
                </div>
            </div>

            {/* --- FULL SCREEN MODAL (PORTAL) --- */}
            {isOpen && createPortal(ModalContent, document.body)}
        </div>
    );
};

export default ChapterQuiz;
