
import React, { useState, useEffect, useMemo, useRef, memo } from 'react';
import type { User } from 'firebase/auth';
import type { UserData, CommunityQuestion, CommunityAnswer, BattleRequest, Debate, Ebook } from '../types';
import { getQuestions, postQuestion, toggleLikeQuestion, getComments, addComment, quizResultAttempt, getQuizAttempt, voteOnPoll, getDebate, voteOnDebate, searchUsers, sendBattleRequest, getMyPendingRequests, rejectBattleRequest, decrementBattleQuota } from '../services/firestoreService';
import LoadingSpinner from '../components/LoadingSpinner';
import { MessageSquare, Plus, Send, X, Heart, MessageCircle, Image as ImageIcon, CircleCheck, CircleHelp, BarChart2, Minus, Swords, Search, Check, XCircle, Flame, Sparkles, Loader2, Book, ChevronRight, Clock, Trophy, ShieldAlert, Zap, Megaphone, CheckCircle2, ChevronUp, Users } from 'lucide-react';
import { NIGERIAN_CURRICULUM_SUBJECTS, SKIN_CONFIG } from '../constants';
import { SYLLABUS_DATA } from '../data/syllabusData';
import { DEBATE_TOPICS } from '../data/debateData';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';

interface CommunityPageProps {
    user: User | null;
    userData: UserData | null;
}

const LS_COMMUNITY_CACHE = 'eintk_community_feed_cache';

// --- HELPER: MathJax Component ---
const MathJaxHtml = memo(({ content, className }: { content: string, className?: string }) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (ref.current && window.MathJax && window.MathJax.typesetPromise) {
            window.MathJax.typesetPromise([ref.current]).catch(err => console.warn('MathJax error', err));
        }
    }, [content]);
    return <div ref={ref} className={className} dangerouslySetInnerHTML={{ __html: content }} />;
});

const QuestionCard: React.FC<{ 
    question: CommunityQuestion, 
    user: User | null, 
    userData: UserData | null, 
    compact?: boolean,
    onOpenPulse?: (q: CommunityQuestion) => void 
}> = ({ question, user, userData, compact, onOpenPulse }) => {
    const [liked, setLiked] = useState(user ? (question.likes || []).includes(user.uid) : false);
    const [likeCount, setLikeCount] = useState(question.likes ? question.likes.length : 0);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<CommunityAnswer[]>([]);
    const [newComment, setNewComment] = useState('');
    const [hasVoted, setHasVoted] = useState(user ? (question.voters || []).includes(user.uid) : false);
    const [pollOptions, setPollOptions] = useState(question.pollOptions || []);
    const [selectedQuizOption, setSelectedQuizOption] = useState<string | null>(null);
    const [quizResult, setQuizResult] = useState<'correct' | 'wrong' | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);

    useEffect(() => { 
        setLiked(user ? (question.likes || []).includes(user.uid) : false); 
        setLikeCount(question.likes ? question.likes.length : 0); 
        if (user && question.type === 'quiz') {
            getQuizAttempt(question.id, user.uid).then(attempt => {
                if (attempt) {
                    setIsAnswered(true);
                    setQuizResult(attempt.correct ? 'correct' : 'wrong');
                    setSelectedQuizOption(attempt.selectedOption || null);
                }
            });
        }
    }, [question, user]);

    const handleLike = async (e: React.MouseEvent) => { 
        e.stopPropagation();
        if (!user) return; 
        setLiked(!liked); 
        setLikeCount(prev => liked ? prev - 1 : prev + 1); 
        await toggleLikeQuestion(question.id, user.uid); 
    };

    const toggleComments = (e: React.MouseEvent) => { 
        e.stopPropagation();
        if (!showComments) getComments(question.id, setComments); 
        setShowComments(!showComments); 
    };

    const handlePostComment = async (e: React.FormEvent) => { 
        e.preventDefault(); 
        if (!user || !newComment.trim()) return; 
        await addComment(question.id, { 
            content: newComment, 
            authorId: user.uid, 
            authorUsername: userData?.username || 'User', 
            authorProfilePic: userData?.profilePictureUrl || '' 
        }); 
        setNewComment(''); 
    };

    const handleVote = async (idx: number) => { 
        if (hasVoted || !user) return; 
        const newOpts = [...pollOptions]; 
        newOpts[idx].votes++; 
        setPollOptions(newOpts); 
        setHasVoted(true); 
        await voteOnPoll(question.id, idx, user.uid); 
    };
    
    const handleQuizAttempt = async (opt: string) => {
        if (!user || isAnswered) return;
        setSelectedQuizOption(opt);
        const isCorrect = opt === question.correctAnswer;
        setQuizResult(isCorrect ? 'correct' : 'wrong');
        setIsAnswered(true);
        await quizResultAttempt(question.id, user.uid, isCorrect, opt);
    };

    const isNova = question.isAIPost || question.authorId === 'NOVA_AI_CORE';

    if (compact) {
        return (
            <div 
                onClick={() => onOpenPulse?.(question)}
                className={`shrink-0 w-72 bg-gray-800 p-5 rounded-[2rem] border transition-all snap-start relative overflow-hidden flex flex-col justify-between cursor-pointer group hover:border-orange-500/50 ${isNova ? 'border-orange-500 shadow-[0_10px_30px_rgba(234,88,12,0.1)]' : 'border-gray-700'}`}
            >
                {isNova && (
                    <div className="absolute top-0 right-0 bg-gradient-to-l from-orange-600 to-amber-600 text-white text-[7px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl flex items-center gap-1.5 z-10">
                        <Sparkles size={8} fill="currentColor"/> Nova AI
                    </div>
                )}
                <div>
                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-2">{question.subject} • {question.type.toUpperCase()}</p>
                    <h4 className="text-white font-black text-base leading-tight mb-2 line-clamp-2 group-hover:text-orange-400 transition-colors">{question.title}</h4>
                    <MathJaxHtml content={question.content} className="text-gray-400 text-xs leading-relaxed line-clamp-4 mb-4" />
                </div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-700/50">
                        <div className="flex items-center gap-4">
                            <div className={`flex items-center gap-1.5 text-[10px] font-bold ${liked ? 'text-orange-500' : 'text-gray-500'}`}>
                                <Heart size={14} fill={liked ? 'currentColor' : 'none'}/> {likeCount}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
                                <MessageCircle size={14}/> {question.answerCount}
                            </div>
                        </div>
                        <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest animate-pulse">Tap to view</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-gray-800 p-4 rounded-2xl border mb-4 shadow-lg relative overflow-hidden transition-all hover:scale-[1.01] ${isNova ? `border-orange-500 ring-1 ring-orange-500/20` : (question.isMegaphone ? 'border-orange-500 ring-1 ring-orange-500/20' : 'border-gray-700')}`}>
            {isNova && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-orange-600 to-amber-600 text-white text-[8px] font-black uppercase tracking-widest px-4 py-1 rounded-bl-xl flex items-center gap-1.5 z-10 shadow-xl">
                    <Sparkles size={10} fill="currentColor" className="animate-pulse"/> Nova AI Core
                </div>
            )}
            {question.isMegaphone && !isNova && (
                <div className="absolute top-0 right-0 bg-orange-600 text-white text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-lg flex items-center gap-1 z-10 shadow-lg">
                    <Megaphone size={10} fill="currentColor"/> Featured
                </div>
            )}
            <div className="flex items-center mb-3">
                <div className={`w-10 h-10 rounded-full overflow-hidden mr-3 border-2 ${isNova ? 'border-orange-500 animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.4)]' : 'border-gray-600'}`}>
                    <img src={question.authorProfilePic || ''} className="w-full h-full object-cover" onError={(e:any)=>{e.target.style.display='none'}}/>
                </div>
                <div>
                    <div className="flex items-center gap-1.5">
                        <p className={`font-black text-sm ${isNova ? 'text-orange-400' : 'text-white'}`}>{question.authorUsername}</p>
                        {isNova && <CheckCircle2 size={12} className="text-blue-400" fill="currentColor"/>}
                    </div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">{question.subject} • {question.type.toUpperCase()}</p>
                </div>
            </div>
            <h3 className={`font-black text-lg mb-1 tracking-tight ${isNova ? 'text-white' : 'text-orange-400'}`}>{question.title}</h3>
            <MathJaxHtml content={question.content} className="text-gray-300 text-sm mb-4 leading-relaxed" />
            {question.type === 'poll' && pollOptions.length > 0 && (
                <div className="space-y-2">
                    {pollOptions.map((opt, i) => {
                        const total = pollOptions.reduce((a,b)=>a+b.votes,0);
                        const pct = total > 0 ? Math.round((opt.votes/total)*100) : 0;
                        return (
                            <div key={i} onClick={()=>handleVote(i)} className="bg-gray-900 p-2 rounded-lg cursor-pointer relative overflow-hidden border border-gray-700 h-10 flex items-center px-3">
                                <div className="absolute top-0 left-0 h-full bg-blue-900/40 transition-all duration-500" style={{width: `${pct}%`}}></div>
                                <div className="relative flex justify-between text-sm w-full z-10 font-medium">
                                    <span>{opt.text}</span>
                                    <span>{pct}%</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
            {question.type === 'quiz' && question.quizOptions && (
                <div className="grid grid-cols-1 gap-2">
                    {question.quizOptions.map((opt, i) => {
                        let btnClass = isNova ? "bg-gray-900 border-gray-700 hover:border-orange-500/50" : "bg-gray-700 hover:bg-gray-600";
                        if (isAnswered) {
                            if (opt === question.correctAnswer) btnClass = "bg-green-600 border-green-400 text-white";
                            else if (opt === selectedQuizOption) btnClass = "bg-red-600 border-red-400 text-white";
                            else btnClass = "bg-gray-900 border-gray-800 opacity-50";
                        }
                        return (
                            <button key={i} onClick={() => handleQuizAttempt(opt)} disabled={isAnswered} className={`p-3 rounded-xl text-left text-sm font-bold border transition-all ${btnClass}`}>
                                <MathJaxHtml content={opt} />
                            </button>
                        )
                    })}
                </div>
            )}
            <div className="flex space-x-6 mt-4 pt-3 border-t border-gray-700 text-gray-400 text-sm">
                <button onClick={handleLike} className={`flex items-center space-x-2 hover:text-white transition-colors ${liked ? 'text-red-500' : ''}`}>
                    <Heart size={18} fill={liked ? "currentColor" : "none"}/>
                    <span>{likeCount}</span>
                </button>
                <button onClick={toggleComments} className={`flex items-center space-x-2 hover:text-white transition-colors ${showComments ? 'text-orange-500' : ''}`}>
                    <MessageCircle size={18}/>
                    <span>{question.answerCount}</span>
                </button>
            </div>
            {showComments && (
                <div className="mt-4 space-y-3 pl-4 border-l-2 border-gray-700 animate-fade-in">
                    {comments.map(c => (
                        <div key={c.id} className="text-sm text-gray-300 bg-gray-900/50 p-3 rounded-xl border border-white/5">
                            <span className="font-black text-orange-400 block text-[10px] uppercase tracking-widest mb-1">{c.authorUsername}</span>
                            {c.content}
                        </div>
                    ))}
                    {user && (
                        <form onSubmit={handlePostComment} className="flex mt-3 shadow-xl">
                            <input value={newComment} onChange={e=>setNewComment(e.target.value)} placeholder="Add a comment..." className="flex-1 bg-gray-900 border border-gray-700 rounded-l-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-orange-500 outline-none text-white"/>
                            <button className="bg-orange-600 px-5 rounded-r-xl hover:bg-orange-700">
                                <Send size={18} className="text-white"/>
                            </button>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
};

const MinimalDebate: React.FC<{ isOpen: boolean, onClose: () => void, user: User | null }> = ({ isOpen, onClose, user }) => {
    const [hasVoted, setHasVoted] = useState(false);
    const [debate, setDebate] = useState<Debate | null>(null);
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    const currentWeekNum = Math.ceil((days + start.getDay() + 1) / 7);
    const currentYear = now.getFullYear();
    const weekId = `week-${currentWeekNum}-${currentYear}`;
    const topicLength = DEBATE_TOPICS.length || 1;
    const topicIndex = (currentWeekNum - 1 + topicLength) % topicLength;
    const question = DEBATE_TOPICS[topicIndex]?.question || "Should school uniform be abolished?";
    useEffect(() => { 
        if (!isOpen) return; 
        const unsub = getDebate(weekId, (data) => { 
            setDebate(data); 
            if (user && data?.voters.includes(user.uid)) setHasVoted(true); 
        }); 
        return () => unsub(); 
    }, [isOpen, weekId, user]);
    const handleVote = async (type: 'yes' | 'no') => { 
        if (!user || hasVoted) return; 
        await voteOnDebate(weekId, type, user.uid); 
        setHasVoted(true); 
    };
    const yes = debate?.yesVotes || 0; 
    const no = debate?.noVotes || 0; 
    const total = yes + no; 
    const yesPct = total ? Math.round((yes/total)*100) : 50;
    return ( 
        <Modal isOpen={isOpen} onClose={onClose} title="Debate Arena"> 
            <div className="text-center pt-2"> 
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Week {currentWeekNum} Debate</p> 
                <div className="bg-gray-900 p-4 rounded-xl mb-6 border border-gray-700"> 
                    <h3 className="text-lg font-bold text-white leading-snug">"{question}"</h3> 
                </div> 
                <div className="flex items-center justify-between mb-2 px-2"> 
                    <span className="text-green-400 font-bold text-xs">AGREE {yesPct}%</span> 
                    <span className="text-red-400 font-bold text-xs">{(100 - yesPct) || 0}% DISAGREE</span> 
                </div> 
                <div className="flex h-12 rounded-full overflow-hidden mb-8 shadow-inner relative bg-gray-800"> 
                    <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-black/50 z-10 transform -translate-x-1/2"></div> 
                    <div className="bg-gradient-to-r from-green-600 to-green-500 flex items-center justify-start pl-4 text-white font-black text-xl transition-all duration-700" style={{ width: `${yesPct}%` }}> 
                        {yes > 0 && <Check size={24} />} 
                    </div> 
                    <div className="bg-gradient-to-l from-red-600 to-red-500 flex items-center justify-end pr-4 text-white font-black text-xl transition-all duration-700" style={{ width: `${(100 - yesPct) || 0}%` }}> 
                        {no > 0 && <X size={24} />} 
                    </div> 
                </div> 
                <div className="flex justify-center gap-4"> 
                    <button onClick={() => handleVote('yes')} disabled={hasVoted} className="flex-1 py-3 bg-gray-700 hover:bg-green-600 rounded-xl font-bold text-white disabled:opacity-50 disabled:bg-gray-800 transition-colors border border-gray-600 hover:border-green-500"> I Agree </button> 
                    <button onClick={() => handleVote('no')} disabled={hasVoted} className="flex-1 py-3 bg-gray-700 hover:bg-red-600 rounded-xl font-bold text-white disabled:opacity-50 disabled:bg-gray-800 transition-colors border border-gray-600 hover:border-red-500"> I Disagree </button> 
                </div> 
                {hasVoted && <p className="text-xs text-gray-500 mt-6 font-mono">Vote recorded.</p>} 
            </div> 
        </Modal> 
    );
};

const BattleArena: React.FC<{ user: User | null, userData: UserData | null }> = ({ user, userData }) => {
    const [step, setStep] = useState<1 | 2 | 3>(1); 
    const [battleMode, setBattleMode] = useState<'Classic' | 'Sabotage Twist'>('Classic'); 
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedTopic, setSelectedTopic] = useState('');
    const [searchQuery, setSearchQuery] = useState(''); 
    const [searchResults, setSearchResults] = useState<{id: string, username: string}[]>([]); 
    const [selectedOpponent, setSelectedOpponent] = useState<{id: string, name: string} | null>(null); 
    const [questionCount, setQuestionCount] = useState(10); 
    const [myPendingRequests, setMyPendingRequests] = useState<BattleRequest[]>([]); 
    const [loading, setLoading] = useState(false); 
    const [showModal, setShowModal] = useState(false); 

    useEffect(() => { 
        if (!user) return; 
        const unsub = getMyPendingRequests(user.uid, setMyPendingRequests); 
        return () => unsub(); 
    }, [user]); 

    useEffect(() => { 
        const delayDebounceFn = setTimeout(async () => { 
            if (searchQuery.trim().length >= 3) { 
                setLoading(true); 
                const res = await searchUsers(searchQuery); 
                setSearchResults(res.filter(u => u.id !== user?.uid)); 
                setLoading(false); 
            } else { 
                setSearchResults([]); 
            } 
        }, 500); 
        return () => clearTimeout(delayDebounceFn); 
    }, [searchQuery, user]); 

    const resetWizard = () => { 
        setStep(1); 
        setSelectedSubject('');
        setSelectedTopic('');
        setBattleMode('Classic'); 
        setQuestionCount(10); 
        setSelectedOpponent(null); 
        setSearchQuery(''); 
        setSearchResults([]); 
        setShowModal(false); 
    }; 

    const handleSendChallenge = async () => { 
        if (!user || !selectedOpponent || !selectedSubject || !selectedTopic) return; 
        setLoading(true); 
        try { 
            const canSend = await decrementBattleQuota(user.uid);
            if (!canSend) {
                alert("You've reached your weekly battle limit! Upgrade to Pro for 10 weekly battles.");
                setLoading(false);
                return;
            }
            await sendBattleRequest( user.uid, userData?.username || 'User', selectedOpponent.id, selectedOpponent.name, selectedSubject, selectedTopic, { mode: battleMode, numQuestions: questionCount } ); 
            alert(`Challenge sent to ${selectedOpponent.name}!`); 
            resetWizard(); 
        } catch (e) { 
            console.error(e); 
            alert("Failed to send challenge."); 
        } finally { 
            setLoading(false); 
        } 
    }; 

    const handleCancelRequest = async (reqId: string) => { 
        if (!confirm("Cancel this battle challenge?")) return; 
        try { await rejectBattleRequest(reqId); } catch (e) { console.error("Failed to cancel request", e); } 
    }; 

    const renderStep1 = () => ( 
        <div className="space-y-6"> 
            <div> 
                <h4 className="text-white font-bold text-lg mb-1">Select Room Type</h4> 
                <p className="text-xs text-gray-400 mb-4">Choose the twist that will rule your battle.</p> 
                <div className="grid grid-cols-1 gap-3"> 
                    <button onClick={() => { setBattleMode('Classic'); setStep(2); }} className="p-5 rounded-2xl border-2 border-gray-700 bg-gray-800 hover:border-blue-500 hover:bg-blue-900/10 text-left transition-all group"> 
                        <div className="flex items-center gap-4"> 
                            <div className="bg-blue-600/20 p-3 rounded-xl group-hover:bg-blue-600 transition-colors"> 
                                <Trophy className="text-blue-500 group-hover:text-white" size={24} /> 
                            </div> 
                            <div> 
                                <span className="font-black text-white text-base">The Classic Duel</span> 
                                <p className="text-xs text-gray-400 mt-1">Simple and fair. Most correct answers wins.</p> 
                            </div> 
                        </div> 
                    </button> 
                    <button onClick={() => { setBattleMode('Sabotage Twist'); setStep(2); }} className="p-5 rounded-2xl border-2 border-gray-700 bg-gray-800 hover:border-red-500 hover:bg-red-900/10 text-left transition-all group"> 
                        <div className="flex items-center gap-4"> 
                            <div className="bg-red-600/20 p-3 rounded-xl group-hover:bg-red-600 transition-colors"> 
                                <ShieldAlert className="text-red-500 group-hover:text-white" size={24} /> 
                            </div> 
                            <div> 
                                <span className="font-black text-white text-base">Sabotage Twist</span> 
                                <p className="text-xs text-gray-400 mt-1">Steal points when you're right and they're wrong!</p> 
                            </div> 
                        </div> 
                    </button> 
                </div> 
            </div> 
        </div> 
    ); 

    const renderStep2 = () => { 
        const topics = selectedSubject ? (SYLLABUS_DATA[selectedSubject]?.flatMap(cat => cat.subtopics || []) || []) : [];
        return ( 
            <div className="space-y-4 animate-fade-in"> 
                <div className="flex items-center justify-between mb-2"> 
                    <h4 className="text-white font-bold text-lg">Battle Logistics</h4> 
                    <button onClick={() => setStep(1)} className="text-[10px] text-gray-500 font-bold uppercase tracking-widest hover:text-white">Change Mode</button> 
                </div> 
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Subject</label>
                        <select value={selectedSubject} onChange={(e) => { setSelectedSubject(e.target.value); setSelectedTopic(''); }} className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white outline-none focus:border-orange-500" >
                            <option value="">Select Subject</option>
                            {Object.keys(NIGERIAN_CURRICULUM_SUBJECTS).sort().map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    {selectedSubject && (
                        <div className="animate-fade-in-up">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Topic Focus</label>
                            <select value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white outline-none focus:border-orange-500" >
                                <option value="">Select Topic</option>
                                {topics.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    )}
                    <div> 
                        <div className="flex justify-between items-end mb-2"> 
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Questions: {questionCount}</label> 
                        </div> 
                        <input type="range" min="5" max="20" step="5" value={questionCount} onChange={(e) => setQuestionCount(parseInt(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500" /> 
                    </div> 
                </div>
                <button onClick={() => setStep(3)} disabled={!selectedTopic} className="w-full py-4 bg-orange-600 hover:bg-orange-700 rounded-xl font-bold text-white disabled:bg-gray-700 mt-4 shadow-lg shadow-orange-900/20">Next: Opponent</button> 
            </div> 
        ); 
    }; 

    const renderStep3 = () => ( 
        <div className="space-y-4"> 
            <h4 className="text-white font-bold text-lg mb-2">Find Your Rival</h4> 
            <div className="relative"> 
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Type a username..." className="w-full bg-gray-900 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white outline-none focus:border-orange-500" /> 
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"> 
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />} 
                </div> 
            </div> 
            <div className="max-h-40 overflow-y-auto space-y-2 min-h-[50px] custom-scrollbar"> 
                {searchResults.length > 0 ? searchResults.map(u => ( 
                    <div key={u.id} onClick={() => setSelectedOpponent({ id: u.id, name: u.username })} className={`flex justify-between items-center p-3 rounded-xl cursor-pointer border-2 transition-all ${selectedOpponent?.id === u.id ? 'bg-orange-900/20 border-orange-500' : 'bg-gray-800 border-gray-700 hover:bg-gray-750'}`}> 
                        <span className="text-white font-bold">{u.username}</span> 
                        {selectedOpponent?.id === u.id && <Check size={16} className="text-orange-500"/>} 
                    </div> 
                )) : searchQuery.length >= 3 && !loading && <p className="text-xs text-gray-500 text-center py-4">No users found.</p>} 
            </div> 
            <div className="flex gap-3 pt-4"> 
                <button onClick={() => setStep(2)} className="flex-1 py-3 bg-gray-700 rounded-lg font-bold text-gray-300">Back</button> 
                <button onClick={handleSendChallenge} disabled={!selectedOpponent || loading} className="flex-1 py-4 bg-red-600 hover:bg-red-700 rounded-xl font-bold text-white flex items-center justify-center disabled:bg-gray-600 shadow-lg shadow-red-900/30"> 
                    {loading ? <Loader2 className="animate-spin mr-2"/> : <Swords className="mr-2"/>} Send Duel 
                </button> 
            </div> 
        </div> 
    ); 

    return ( 
        <div className="px-4"> 
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 text-center mb-6 shadow-xl relative overflow-hidden group"> 
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-500"><Swords size={120} /></div> 
                <div className="inline-block p-4 bg-orange-900/30 rounded-full mb-4 border border-orange-500/50 shadow-inner"> 
                    <Swords size={48} className="text-orange-500" /> 
                </div> 
                <h3 className="text-2xl font-black text-white mb-1 uppercase tracking-tight">Battle Arena</h3> 
                <p className="text-gray-400 mb-6 text-sm">Synchronized duels. Sabotage your rivals.</p> 
                
                {userData && (
                    <div className="mb-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-900 border border-white/5 shadow-inner">
                        <Zap size={14} className="text-orange-500" fill="currentColor"/>
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                            Weekly Quota: <span className="text-white">{userData.battleQuota || 0}</span> remaining
                        </span>
                    </div>
                )}

                <button onClick={() => { if (!user) { alert("Login required."); return; } setShowModal(true); }} className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-orange-900/40 transition-all hover:scale-105 active:scale-95 flex items-center mx-auto" > 
                    <Plus size={20} className="mr-2"/> Create duel 
                </button> 
            </div> 
            {myPendingRequests.length > 0 && ( 
                <div className="mb-8 animate-fade-in"> 
                    <h4 className="text-gray-400 text-[10px] font-black mb-3 uppercase tracking-widest px-2">Outgoing Challenges</h4> 
                    <div className="space-y-3"> 
                        {myPendingRequests.map(req => ( 
                            <div key={req.id} className="bg-gray-900 border border-gray-700 p-4 rounded-xl flex justify-between items-center shadow-lg"> 
                                <div className="flex items-center space-x-4 overflow-hidden"> 
                                    <div className="bg-gray-800 p-2 rounded-lg border border-gray-600 shrink-0"> 
                                        {req.mode === 'Sabotage Twist' ? <ShieldAlert size={20} className="text-red-500"/> : <Swords size={20} className="text-blue-500"/>} 
                                    </div> 
                                    <div className="truncate"> 
                                        <p className="text-white font-black text-sm truncate max-w-[150px]">{req.ebookTopic}</p> 
                                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">vs <span className="text-orange-400">{req.toName}</span></p> 
                                    </div> 
                                </div> 
                                <div className="flex items-center gap-3 flex-shrink-0"> 
                                    <span className="text-[10px] font-black bg-yellow-900/30 text-yellow-500 px-3 py-1 rounded-full border border-yellow-500/20 animate-pulse"> Waiting... </span> 
                                    <button onClick={() => handleCancelRequest(req.id)} className="p-2 bg-gray-800 hover:bg-red-900/50 text-gray-500 hover:text-red-400 rounded-full transition-colors border border-gray-700" title="Cancel Request" > 
                                        <X size={14}/> 
                                    </button> 
                                </div> 
                            </div> 
                        ))} 
                    </div> 
                </div> 
            )} 
            <Modal isOpen={showModal} onClose={resetWizard} title="Configure Battle"> 
                <div className="flex justify-center mb-6 space-x-2"> 
                    <div className={`h-1.5 w-8 rounded-full transition-colors ${step >= 1 ? 'bg-orange-500 shadow-[0_0_8px_rgba(234,88,12,0.5)]' : 'bg-gray-700'}`}></div> 
                    <div className={`h-1.5 w-8 rounded-full transition-colors ${step >= 2 ? 'bg-orange-500 shadow-[0_0_8px_rgba(234,88,12,0.5)]' : 'bg-gray-700'}`}></div> 
                    <div className={`h-1.5 w-8 rounded-full transition-colors ${step >= 3 ? 'bg-orange-500 shadow-[0_0_8px_rgba(234,88,12,0.5)]' : 'bg-gray-700'}`}></div> 
                </div> 
                {step === 1 && renderStep1()} 
                {step === 2 && renderStep2()} 
                {step === 3 && renderStep3()} 
            </Modal> 
        </div> 
    );
};

const CommunityPage: React.FC<CommunityPageProps> = ({ user, userData }) => {
    const [questions, setQuestions] = useState<CommunityQuestion[]>([]);
    const [tab, setTab] = useState<'feed' | 'arena'>('feed');
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [showDebateModal, setShowDebateModal] = useState(false);

    // Post Creation States
    const [showPostModal, setShowPostModal] = useState(false);
    const [postType, setPostType] = useState<'discussion' | 'quiz'>('discussion');
    const [postTitle, setPostTitle] = useState('');
    const [postContent, setPostContent] = useState('');
    const [postSubject, setPostSubject] = useState('');
    const [quizOptions, setQuizOptions] = useState(['', '', '', '']);
    const [correctOptionIndex, setCorrectOptionIndex] = useState(0);
    const [useMegaphone, setUseMegaphone] = useState(false);

    // Pulse (AI Post) Modal States
    const [selectedPulse, setSelectedPulse] = useState<CommunityQuestion | null>(null);
    const [pulseComments, setPulseComments] = useState<CommunityAnswer[]>([]);
    const [pulseCommentInput, setPulseCommentInput] = useState('');
    const [pulseIsAnswered, setPulseIsAnswered] = useState(false);
    const [pulseQuizResult, setPulseQuizResult] = useState<'correct' | 'wrong' | null>(null);
    const [selectedPulseQuizOption, setSelectedPulseQuizOption] = useState<string | null>(null);

    // --- COMMUNITY SMART CACHE ---
    useEffect(() => {
        const cached = localStorage.getItem(LS_COMMUNITY_CACHE);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                // Filtering out items older than 24 hours
                const oneDayAgo = Date.now() - 86400000;
                const fresh = parsed.filter((q: any) => {
                    const time = q.createdAt?.seconds ? q.createdAt.seconds * 1000 : new Date(q.createdAt).getTime();
                    return time > oneDayAgo;
                });
                setQuestions(fresh);
            } catch (e) {}
        }

        const unsub = getQuestions((newQuestions) => {
            setQuestions(prev => {
                const combined = [...newQuestions];
                prev.forEach(p => {
                    if (!combined.find(c => c.id === p.id)) combined.push(p);
                });
                const final = combined.sort((a,b) => {
                    const tA = a.createdAt?.seconds ? a.createdAt.seconds : new Date(a.createdAt).getTime()/1000;
                    const tB = b.createdAt?.seconds ? b.createdAt.seconds : new Date(b.createdAt).getTime()/1000;
                    return tB - tA;
                }).slice(0, 100);
                
                localStorage.setItem(LS_COMMUNITY_CACHE, JSON.stringify(final));
                return final;
            });
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        const handleScroll = () => { setShowScrollTop(window.scrollY > 400); };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (selectedPulse) {
            // IMMEDIATELY RESET TO PREVENT SPOILERS
            setPulseIsAnswered(false);
            setPulseQuizResult(null);
            setSelectedPulseQuizOption(null);

            const unsub = getComments(selectedPulse.id, setPulseComments);
            if (user && selectedPulse.type === 'quiz') {
                getQuizAttempt(selectedPulse.id, user.uid).then(attempt => {
                    if (attempt) {
                        setPulseIsAnswered(true);
                        setPulseQuizResult(attempt.correct ? 'correct' : 'wrong');
                        setSelectedPulseQuizOption(attempt.selectedOption || null);
                    }
                });
            }
            return () => unsub();
        }
    }, [selectedPulse, user]);

    const handlePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !userData) return;
        const baseData = { title: postTitle, content: postContent, subject: postSubject, authorId: user.uid, authorUsername: userData.username, authorProfilePic: userData.profilePictureUrl || '', isMegaphone: useMegaphone };
        try {
            if (postType === 'quiz') {
                if (quizOptions.some(o => !o.trim())) { alert("Please fill all options."); return; }
                await postQuestion({ ...baseData, type: 'quiz', quizOptions, correctAnswer: quizOptions[correctOptionIndex] });
            } else { await postQuestion({ ...baseData, type: 'discussion' }); }
            setShowPostModal(false); setPostTitle(''); setPostContent(''); setPostSubject(''); setQuizOptions(['','','','']); setCorrectOptionIndex(0); setUseMegaphone(false);
        } catch (err: any) { alert(err.message); }
    };

    const handlePulseComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !selectedPulse || !pulseCommentInput.trim()) return;
        await addComment(selectedPulse.id, { content: pulseCommentInput, authorId: user.uid, authorUsername: userData?.username || 'User', authorProfilePic: userData?.profilePictureUrl || '' });
        setPulseCommentInput('');
    };

    const handlePulseQuizAttempt = async (opt: string) => {
        if (!user || !selectedPulse || pulseIsAnswered) return;
        setSelectedPulseQuizOption(opt);
        const isCorrect = opt === selectedPulse.correctAnswer;
        setPulseQuizResult(isCorrect ? 'correct' : 'wrong');
        setPulseIsAnswered(true);
        await quizResultAttempt(selectedPulse.id, user.uid, isCorrect, opt);
    };

    const handlePulseLike = async () => { if (!user || !selectedPulse) return; await toggleLikeQuestion(selectedPulse.id, user.uid); };

    const aiPosts = useMemo(() => questions.filter(q => q.isAIPost || q.authorId === 'NOVA_AI_CORE'), [questions]);
    const userPosts = useMemo(() => questions.filter(q => !q.isAIPost && q.authorId !== 'NOVA_AI_CORE'), [questions]);

    const currentActivePulse = useMemo(() => {
        if (!selectedPulse) return null;
        return questions.find(q => q.id === selectedPulse.id) || selectedPulse;
    }, [questions, selectedPulse]);

    const megaphoneCount = userData?.inventory?.megaphoneCount || 0;

    return (
        <div className="max-w-2xl mx-auto pb-24">
            <div className="bg-gray-900 pt-4 pb-6 px-4">
                <div className="flex justify-between items-center bg-gray-800 p-2 rounded-xl border border-gray-700 shadow-lg">
                    <button onClick={() => setTab('feed')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${tab === 'feed' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}>Discussion Feed</button>
                    <button onClick={() => setTab('arena')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${tab === 'arena' ? 'bg-orange-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}>Battle Arena</button>
                </div>
            </div>

            {tab === 'feed' && (
                <div className="fixed bottom-20 right-4 z-40 flex flex-col items-center gap-4">
                    <button onClick={() => setShowPostModal(true)} className="bg-orange-600 text-white w-12 h-12 rounded-full shadow-2xl border-2 border-white/10 hover:scale-110 active:scale-95 transition-all flex items-center justify-center group" title="Start Discussion"><Plus size={24} className="group-hover:rotate-90 transition-transform"/></button>
                    <button onClick={() => setShowDebateModal(true)} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white w-12 h-12 rounded-full shadow-2xl border-2 border-white/10 hover:scale-110 active:scale-95 transition-all flex items-center justify-center" title="Weekly Debate"><Flame size={24} className="animate-pulse" /></button>
                </div>
            )}

            <MinimalDebate isOpen={showDebateModal} onClose={() => setShowDebateModal(false)} user={user} />

            {showScrollTop && (
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-20 left-4 z-40 bg-gray-800 text-orange-500 p-3 rounded-full shadow-2xl border border-gray-700 hover:bg-gray-700 active:scale-90 transition-all flex items-center justify-center animate-fade-in" title="Back to Top"><ChevronUp size={24} /></button>
            )}

            <div className="px-4">
                {tab === 'arena' ? (
                    <BattleArena user={user} userData={userData} />
                ) : (
                    <>
                        {aiPosts.length > 0 && (
                            <div className="mb-10 animate-fade-in">
                                <div className="flex items-center gap-2 mb-4 px-2">
                                    <Sparkles size={18} className="text-orange-500 animate-pulse" />
                                    <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.25em]">The Nova Pulse</h2>
                                </div>
                                <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x px-2 pb-6">
                                    {aiPosts.map(q => <QuestionCard key={q.id} question={q} user={user} userData={userData} compact onOpenPulse={(q) => { setSelectedPulse(q); }} />)}
                                </div>
                            </div>
                        )}
                        <div className="flex items-center gap-2 mb-4 px-2">
                            <MessageSquare size={16} className="text-orange-500" />
                            <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.25em]">Discussion Feed</h2>
                        </div>
                        <div className="space-y-4">
                            {userPosts.map(q => <QuestionCard key={q.id} question={q} user={user} userData={userData} />)}
                            {userPosts.length === 0 && (
                                <div className="text-center py-20 bg-gray-800/50 rounded-[3rem] border-2 border-dashed border-gray-700">
                                    <MessageSquare className="mx-auto text-gray-700 mb-4" size={64} />
                                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Feed is quiet.</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            <Modal isOpen={showPostModal} onClose={() => setShowPostModal(false)} title="Create New Post">
                <form onSubmit={handlePost} className="space-y-4">
                    <div className="flex bg-gray-900 p-1 rounded-lg mb-4">
                        <button type="button" onClick={() => setPostType('discussion')} className={`flex-1 py-2 rounded-md text-sm font-bold ${postType === 'discussion' ? 'bg-gray-700 text-white' : 'text-gray-500'}`}>Discussion</button>
                        <button type="button" onClick={() => setPostType('quiz')} className={`flex-1 py-2 rounded-md text-sm font-bold ${postType === 'quiz' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>Quiz</button>
                    </div>
                    <select required value={postSubject} onChange={e => setPostSubject(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-sm outline-none focus:border-orange-500">
                        <option value="">Select Subject</option>
                        {Object.keys(NIGERIAN_CURRICULUM_SUBJECTS).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <input required value={postTitle} onChange={e => setPostTitle(e.target.value)} placeholder="Title" className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-sm outline-none focus:border-orange-500" />
                    <textarea required value={postContent} onChange={e => setPostContent(e.target.value)} placeholder={postType === 'quiz' ? "Ask your question here..." : "What's on your mind?"} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-sm h-32 outline-none focus:border-orange-500 resize-none" />
                    {postType === 'quiz' && (
                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 font-bold uppercase">Options</label>
                            {quizOptions.map((opt, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <input type="radio" name="correct" checked={correctOptionIndex === i} onChange={() => setCorrectOptionIndex(i)} className="accent-blue-500 w-4 h-4" />
                                    <input required value={opt} onChange={(e) => { const newOpts = [...quizOptions]; newOpts[i] = e.target.value; setQuizOptions(newOpts); }} placeholder={`Option ${String.fromCharCode(65+i)}`} className="flex-1 bg-gray-900 border border-gray-700 rounded-md p-2 text-sm text-white" />
                                </div>
                            ))}
                        </div>
                    )}
                    {megaphoneCount > 0 && (
                        <div className="bg-orange-900/20 p-4 rounded-xl border border-orange-500/30 flex items-center justify-between">
                            <div className="flex items-center gap-3"><Megaphone className="text-orange-500" /><div><p className="text-xs font-bold text-white uppercase tracking-tight">Community Megaphone</p><p className="text-[10px] text-orange-400">Available: {megaphoneCount}</p></div></div>
                            <button type="button" onClick={() => setUseMegaphone(!useMegaphone)} className={`px-4 py-1.5 rounded-lg font-black text-[10px] uppercase transition-all ${useMegaphone ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-400'}`}>{useMegaphone ? 'USING' : 'USE'}</button>
                        </div>
                    )}
                    <button type="submit" className="w-full bg-orange-600 py-4 rounded-xl font-black uppercase text-xs tracking-widest text-white hover:bg-orange-700 transition-colors shadow-lg shadow-orange-900/30">Post to Feed</button>
                </form>
            </Modal>

            {selectedPulse && currentActivePulse && (
                <Modal isOpen={!!selectedPulse} onClose={() => setSelectedPulse(null)} title={`${currentActivePulse.subject} • ${currentActivePulse.type.toUpperCase()}`}>
                    <div className="flex flex-col h-full max-h-[80vh]">
                        <div className="shrink-0 mb-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full border-2 border-orange-500 p-0.5 animate-pulse"><img src={currentActivePulse.authorProfilePic} className="w-full h-full rounded-full object-cover" /></div>
                                <div><div className="flex items-center gap-1.5"><h4 className="font-black text-white text-sm">{currentActivePulse.authorUsername}</h4><CheckCircle2 size={12} className="text-blue-400" fill="currentColor"/></div><span className="text-[8px] bg-orange-600 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Verified AI Core</span></div>
                            </div>

                            {/* ATTEMPT COUNTER */}
                            {currentActivePulse.type === 'quiz' && (
                                <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 bg-gray-900 border border-white/5 rounded-full shadow-inner">
                                    <Users size={10} className="text-orange-500"/>
                                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-[0.2em]">
                                        Tactical Intel: <span className="text-white">{currentActivePulse.answerCount || 0}</span> Learners Attempted
                                    </span>
                                </div>
                            )}

                            <h3 className="text-xl font-black text-white leading-tight mb-2 tracking-tight">{currentActivePulse.title}</h3>
                            <MathJaxHtml content={currentActivePulse.content} className="text-gray-300 text-sm leading-relaxed mb-6 bg-gray-900/50 p-4 rounded-2xl border border-white/5" />
                            {currentActivePulse.type === 'quiz' && currentActivePulse.quizOptions && (
                                <div className="grid grid-cols-1 gap-2">
                                    {currentActivePulse.quizOptions.map((opt, i) => {
                                        let btnClass = "bg-gray-800 border-gray-700 hover:bg-gray-750 text-gray-200";
                                        if (pulseIsAnswered) {
                                            if (opt === currentActivePulse.correctAnswer) btnClass = "bg-green-600 border-green-500 text-white";
                                            else if (pulseQuizResult === 'wrong' && opt === selectedPulseQuizOption) btnClass = "bg-red-600 border-red-400";
                                            else btnClass = "bg-gray-900 border-gray-800 opacity-50";
                                        }
                                        return (
                                            <button key={i} onClick={() => handlePulseQuizAttempt(opt)} disabled={pulseIsAnswered} className={`p-4 rounded-xl text-left text-sm font-bold border-2 transition-all flex items-center gap-3 ${btnClass}`}><div className="w-6 h-6 rounded-lg bg-black/20 flex items-center justify-center text-[10px] font-black">{String.fromCharCode(65+i)}</div><MathJaxHtml content={opt} className="flex-1" /></button>
                                        );
                                    })}
                                </div>
                            )}
                            <div className="flex items-center gap-6 mt-6 py-4 border-t border-b border-gray-700/50">
                                <button onClick={handlePulseLike} className={`flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-colors ${user && (currentActivePulse.likes || []).includes(user.uid) ? 'text-orange-500' : 'text-gray-400 hover:text-white'}`}><Heart size={20} fill={user && (currentActivePulse.likes || []).includes(user.uid) ? 'currentColor' : 'none'}/> {currentActivePulse.likes?.length || 0} Likes</button>
                                <div className="flex items-center gap-2 text-gray-400 font-black text-xs uppercase tracking-widest"><MessageCircle size={20}/> {currentActivePulse.answerCount} Comments</div>
                            </div>
                        </div>
                        <div className="flex-grow overflow-y-auto custom-scrollbar space-y-3 py-4 min-h-[150px]">
                            {pulseComments.length === 0 ? <div className="text-center py-10 text-gray-500 italic text-sm">Be the first to share your thoughts.</div> : pulseComments.map(c => (
                                    <div key={c.id} className="bg-gray-900/50 p-4 rounded-2xl border border-white/5 animate-fade-in-up"><div className="flex items-center gap-2 mb-2"><img src={c.authorProfilePic} className="w-5 h-5 rounded-full object-cover bg-gray-700" /><span className="font-black text-orange-400 text-[10px] uppercase tracking-widest">{c.authorUsername}</span></div><p className="text-sm text-gray-300 leading-relaxed">{c.content}</p></div>
                                ))
                            }
                        </div>
                        <div className="shrink-0 pt-4 mt-auto">
                            {user ? (
                                <form onSubmit={handlePulseComment} className="flex items-center gap-2 bg-gray-900 p-2 rounded-2xl border border-gray-700 shadow-inner focus-within:border-orange-500 transition-colors"><input value={pulseCommentInput} onChange={e => setPulseCommentInput(e.target.value)} placeholder="Discuss with Nova..." className="flex-1 bg-transparent text-white px-3 py-2 text-sm outline-none placeholder-gray-600" /><button type="submit" disabled={!pulseCommentInput.trim()} className="p-2.5 bg-orange-600 text-white rounded-xl shadow-lg hover:bg-orange-700 disabled:opacity-50 active:scale-95 transition-all"><Send size={18}/></button></form>
                            ) : <p className="text-center text-gray-500 text-xs py-2">Log in to join the discussion.</p>}
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default CommunityPage;
