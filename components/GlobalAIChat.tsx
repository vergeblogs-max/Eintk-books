import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Send, X, Sparkles, Loader2, Settings, Camera, Trash2, AlertCircle, Zap, Battery, Calendar, TrendingDown, ArrowRight, BookOpen, Navigation, MessageCircle, Info, ChevronLeft, Coins, Maximize2 } from 'lucide-react';
import type { UserData, Ebook } from '../types';
import { getAI, ensureMathJaxSafe } from "../services/geminiService";
import Modal from './Modal'; 
import { consumeEnergy, getPublishedEbooks } from '../services/firestoreService';
import { getAllOfflineBooks } from '../services/offlineService';

interface GlobalAIChatProps {
    userData: UserData | null;
}

interface Message {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    image?: string; // Base64
}

// Sub-component for the aesthetic energy display
const EnergyCircle: React.FC<{ current: number; max: number; size?: number }> = ({ current, max, size = 220 }) => {
    const percentage = Math.min(100, (current / max) * 100);
    const radius = 90;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="transparent"
                    className="text-gray-800"
                />
                <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="transparent"
                    className="text-orange-500"
                    strokeDasharray={circumference}
                    style={{ 
                        strokeDashoffset,
                        transition: 'stroke-dashoffset 1s ease-out',
                        filter: 'drop-shadow(0 0 8px rgba(249, 115, 22, 0.4))'
                    }}
                    strokeLinecap="round"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-black text-white tracking-tighter">{current.toLocaleString()}</span>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mt-1">Energy Units</span>
            </div>
        </div>
    );
};

// IDENTITY INSTRUCTION FOR THE AI
const getSystemInstruction = (firstName: string, context: string, custom: string, availableBooks: string) => `
IDENTITY:
You are "Nova", a professional and friendly AI advisor and psychologist for the EINTK platform.
Your user's name is ${firstName}.

PLATFORM KNOWLEDGE (Use these paths for [NAVIGATE:path:Label]):
- Library Home: "/"
- Test Prep (JAMB/WAEC Exams): "/exams"
- Community Feed: "/community"
- Arcade (Games): "/arcade"
- Profile & Settings: "/profile"
- Spark Hub (Wallet/Energy): "/sparks"
- Private Journal: "/journal"
- Formula Vault: "/tools"
- Referral Page: "/referral"
- High Stakes Arena: "/high-stakes"

AVAILABLE BOOKS IN THE DATABASE (Only suggest these):
${availableBooks}

CONVERSATION RULES (CRITICAL):
1. **Natural Interaction:** NEVER say "Hello ${firstName}" or greet the user in every single message. Only greet them if it's the very first message of the day.
2. **First-Name Only:** Always refer to the user as "${firstName}".
3. **Memory:** Reference past things the user has said if relevant.
4. **No Hashtags:** Never use hashtags (#) in your responses.
5. **MATH:** ALWAYS use \\( ... \\) for inline math and \\[ ... \\] for block math. NEVER EVER USE DOLLAR SIGNS ($). This is vital for rendering.

STYLING & COLORS (MANDATORY):
- You MUST use **bolding** frequently on key terms and subject names.
- In this UI, **bold** text renders as ORANGE and normal text renders as WHITE.

ACTION BUTTONS (USE SPARINGLY):
Only provide navigation or book buttons when it is **absolutely relevant** to the user's specific request. 
- DO NOT suggest a book or page in every message.
- Most of your responses should be pure conversation and advice.
- Use these tags ONLY if the user asks for a recommendation or needs to go somewhere specific:
- To suggest reading a book: [READ_BOOK:book_id:Button Label]
- To suggest going to a page: [NAVIGATE:path:Button Label]
`;

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const ActionButton: React.FC<{ tag: string; onAction: () => void }> = ({ tag, onAction }) => {
    const navigate = useNavigate();
    const parts = tag.slice(1, -1).split(':');
    const type = parts[0];
    const data = parts[1];
    const label = parts[2] || (type === 'READ_BOOK' ? 'Read Book' : 'Go to Page');

    const handleClick = () => {
        onAction(); 
        if (type === 'READ_BOOK') {
            navigate(`/ebook-reader/${data}`);
        } else if (type === 'NAVIGATE') {
            navigate(data);
        }
    };

    return (
        <button 
            onClick={handleClick}
            className="flex items-center gap-2 bg-orange-600/20 hover:bg-orange-600 border border-orange-500/30 text-orange-400 hover:text-white px-4 py-2.5 rounded-xl transition-all active:scale-95 group shadow-lg mb-2 mr-2 shrink-0"
        >
            {type === 'READ_BOOK' ? <BookOpen size={16} /> : <Navigation size={16} />}
            <span className="text-xs font-black uppercase tracking-wider">{label}</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </button>
    );
};

const FormatMessageText: React.FC<{ text: string; onAction: () => void }> = ({ text, onAction }) => {
    const actionRegex = /\[(READ_BOOK|NAVIGATE):[^\]]+\]/g;
    const actions = text.match(actionRegex) || [];
    // Ensure math safety before rendering
    const safeText = ensureMathJaxSafe(text.replace(actionRegex, '').trim());

    const lines = safeText.split('\n');
    const formattedElements: React.ReactNode[] = [];

    lines.forEach((line, lineIndex) => {
        let content = line;
        let isListItem = false;

        if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
            isListItem = true;
            content = line.trim().substring(2);
        }

        const parts = content.split(/(\*\*.*?\*\*)/g);
        const lineContent = parts.map((part, partIndex) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={partIndex} className="text-orange-400 font-bold">{part.slice(2, -2)}</strong>;
            }
            return <span key={partIndex} dangerouslySetInnerHTML={{ __html: part }} />;
        });

        if (isListItem) {
            formattedElements.push(
                <div key={lineIndex} className="flex items-start ml-2 mb-1">
                    <span className="mr-2 text-orange-500">•</span>
                    <span>{lineContent}</span>
                </div>
            );
        } else {
            if (line.trim() === '') {
                formattedElements.push(<br key={lineIndex} />);
            } else {
                formattedElements.push(<p key={lineIndex} className="mb-1 min-h-[1em]">{lineContent}</p>);
            }
        }
    });

    return (
        <div className="leading-relaxed">
            <div className="nova-chat-content">{formattedElements}</div>
            {actions.length > 0 && (
                <div className="flex flex-wrap mt-4 pt-3 border-t border-white/5">
                    {actions.map((tag, idx) => <ActionButton key={idx} tag={tag} onAction={onAction} />)}
                </div>
            )}
        </div>
    );
};

const NovaAvatar: React.FC<{ size?: number, isAnimated?: boolean }> = ({ size = 32, isAnimated = false }) => (
    <div className="relative flex items-center justify-center rounded-full bg-gradient-to-br from-red-600 to-orange-500 shadow-inner p-[1px]" style={{ width: size, height: size }}>
        <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center">
            <Sparkles 
                size={size * 0.6} 
                className={`text-orange-500 ${isAnimated ? 'animate-[spin_4s_linear_infinite]' : ''}`} 
                fill="currentColor" 
            />
        </div>
    </div>
);

const GlobalAIChat: React.FC<GlobalAIChatProps> = ({ userData }) => {
    const location = useLocation();
    const navigate = useNavigate();
    
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [availableBooksText, setAvailableBooksText] = useState<string>('Loading books...');
    
    const [showSettings, setShowSettings] = useState(false);
    const [showEnergyHub, setShowEnergyHub] = useState(false);
    const [customInstructions, setCustomInstructions] = useState('');
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const [position, setPosition] = useState({ bottom: '80px', right: '16px', top: 'auto', left: 'auto' });
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef<{x: number, y: number}>({ x: 0, y: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Visibility Logic: Strictly Library and Exams
    const isVisible = location.pathname === '/' || location.pathname === '/exams';

    // SCROLL LOCKING
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
            document.body.style.paddingRight = '0px'; 
        } else {
            document.body.style.overflow = 'unset';
            document.documentElement.style.overflow = 'unset';
            document.body.style.paddingRight = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
            document.documentElement.style.overflow = 'unset';
            document.body.style.paddingRight = 'unset';
        };
    }, [isOpen]);

    const firstName = useMemo(() => {
        if (!userData?.username) return 'Friend';
        return userData.username.split(' ')[0];
    }, [userData?.username]);

    // Memory persistence logic
    useEffect(() => {
        const savedMsgs = localStorage.getItem('nova_chat_history');
        const savedInstr = localStorage.getItem('nova_custom_instructions');
        if (savedMsgs) {
            try { setMessages(JSON.parse(savedMsgs)); } catch(e) {}
        }
        if (savedInstr) setCustomInstructions(savedInstr);
    }, []);

    useEffect(() => {
        const fetchAvailableBooks = async () => {
            let books: Ebook[] = [];
            try {
                if (navigator.onLine) {
                    books = await getPublishedEbooks();
                } else {
                    books = await getAllOfflineBooks();
                }
            } catch (e) { console.error("Book fetch failed", e); }

            const bookList = books.length > 0 
                ? books.map(b => `- ${b.title} (ID: ${b.id}, Subject: ${b.subject})`).join('\n')
                : 'No books available.';
            setAvailableBooksText(bookList);
        };
        if (isOpen) fetchAvailableBooks();
    }, [isOpen]);

    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem('nova_chat_history', JSON.stringify(messages.slice(-50)));
        }
    }, [messages]);

    useEffect(() => {
        localStorage.setItem('nova_custom_instructions', customInstructions);
    }, [customInstructions]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        if (window.MathJax && window.MathJax.typesetPromise && chatContainerRef.current) {
            setTimeout(() => {
               window.MathJax.typesetPromise([chatContainerRef.current!]).catch(err => console.error('AI Chat MathJax Error:', err));
            }, 100);
        }
    }, [messages, isOpen, loading]);

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            try {
                const file = e.target.files[0];
                const base64 = await fileToBase64(file);
                setSelectedImage(base64);
            } catch (err) { console.error("Failed to read image", err); }
            if (e.target) e.target.value = '';
        }
    };

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if ((!input.trim() && !selectedImage) || loading || !userData) return;

        const cost = selectedImage ? 10 : 2;
        const currentEnergy = userData.energy || 0;

        if (currentEnergy < cost) {
            setShowEnergyHub(true);
            return;
        }

        setLoading(true);
        const newUserMsg: Message = { id: Date.now().toString(), sender: 'user', text: input, image: selectedImage || undefined };
        const aiResponseId = (Date.now() + 1).toString();
        
        setMessages(prev => [...prev, newUserMsg, { id: aiResponseId, sender: 'ai', text: '' }]);
        
        const msgText = input;
        const msgImg = selectedImage;
        setInput(''); setSelectedImage(null);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';

        try {
            const success = await consumeEnergy(userData.uid, cost);
            if (!success) throw new Error("Energy failed.");

            const fullSystemInstruction = getSystemInstruction(firstName, '', customInstructions, availableBooksText);
            const ai = getAI();
            
            const historyContents = messages.slice(-10).map(m => ({
                role: m.sender === 'user' ? 'user' : 'model',
                parts: m.image ? [{ text: m.text }, { inlineData: { mimeType: 'image/jpeg', data: m.image.split(',')[1] } }] : [{ text: m.text }]
            }));

            const currentMessageParts: any[] = [{ text: msgText }];
            if (msgImg) currentMessageParts.push({ inlineData: { mimeType: 'image/jpeg', data: msgImg.split(',')[1] } });

            const allContents = [...historyContents.filter(h => h.parts[0].text !== ''), { role: 'user', parts: currentMessageParts }];
            
            const result = await ai.models.generateContentStream({
                model: "gemini-3-flash-preview", 
                contents: allContents,
                config: { systemInstruction: fullSystemInstruction }
            });

            let fullText = "";
            for await (const chunk of result) {
                fullText += chunk.text || "";
                setMessages(prev => prev.map(m => m.id === aiResponseId ? { ...m, text: fullText } : m));
            }

        } catch (error: any) {
            console.error("AI Error:", error);
            setMessages(prev => prev.map(m => m.id === aiResponseId ? { ...m, text: `Error: ${error.message}` } : m));
        } finally {
            setLoading(false);
        }
    };

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        isDraggingRef.current = false; 
        const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
        dragStartRef.current = { x: clientX, y: clientY };
        if ('touches' in e) {
            document.addEventListener('touchmove', handleDragMove);
            document.addEventListener('touchend', handleDragEnd);
        } else {
            document.addEventListener('mousemove', handleDragMove);
            document.addEventListener('mouseup', handleDragEnd);
        }
    };

    const handleDragMove = (e: MouseEvent | TouchEvent) => {
        const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
        
        // Only trigger drag if moved more than 5 pixels
        if (Math.abs(clientX - dragStartRef.current.x) > 5 || Math.abs(clientY - dragStartRef.current.y) > 5) {
            isDraggingRef.current = true;
            if (buttonRef.current) {
                buttonRef.current.style.position = 'fixed';
                buttonRef.current.style.left = `${clientX - 25}px`; 
                buttonRef.current.style.top = `${clientY - 25}px`;
                buttonRef.current.style.bottom = 'auto';
                buttonRef.current.style.right = 'auto';
            }
        }
    };

    const handleDragEnd = (e: MouseEvent | TouchEvent) => {
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
        document.removeEventListener('touchmove', handleDragMove);
        document.removeEventListener('touchend', handleDragEnd);
        
        if (!isDraggingRef.current) return; 
        
        const clientX = 'changedTouches' in e ? (e as TouchEvent).changedTouches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'changedTouches' in e ? (e as TouchEvent).changedTouches[0].clientY : (e as MouseEvent).clientY;
        const winWidth = window.innerWidth;
        const isLeft = clientX < winWidth / 2;
        setPosition({ top: clientY < 100 ? '80px' : 'auto', bottom: clientY < 100 ? 'auto' : '80px', left: isLeft ? '16px' : 'auto', right: isLeft ? 'auto' : '16px' });
    };

    if (!userData || !isVisible) return null;

    const maxEnergy = userData.subscriptionStatus === 'pro' ? 30000 : 50;
    const energy = userData.energy || 0;
    const energyPercent = Math.min(100, (energy / maxEnergy) * 100);

    return (
        <>
            <Modal
                zIndex={1100}
                isOpen={showClearConfirm}
                onClose={() => setShowClearConfirm(false)}
                title="Clear Conversation?"
                footer={
                    <div className="flex gap-2">
                        <button onClick={() => setShowClearConfirm(false)} className="px-4 py-2 bg-gray-600 rounded-lg text-white font-bold">Cancel</button>
                        <button onClick={() => { setMessages([]); localStorage.removeItem('nova_chat_history'); setShowClearConfirm(false); }} className="px-4 py-2 bg-red-600 rounded-lg text-white font-bold">Clear All</button>
                    </div>
                }
            >
                <div className="text-center">
                    <div className="mx-auto w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center mb-4"><AlertCircle className="text-red-500" size={32} /></div>
                    <p className="text-gray-300">This will erase your chat history with Nova.</p>
                </div>
            </Modal>

            {!isOpen && (
                <button 
                    ref={buttonRef}
                    onMouseDown={handleDragStart}
                    onTouchStart={handleDragStart}
                    onClick={() => { if (!isDraggingRef.current) setIsOpen(true); }}
                    className="fixed z-[1000] touch-none flex items-center justify-center w-14 h-14"
                    style={{ bottom: position.bottom, right: position.right, top: position.top, left: position.left }}
                >
                    <div className="absolute inset-0 rounded-full overflow-hidden shadow-[0_0_15px_rgba(234,88,12,0.6)]">
                        <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#b91c1c_0deg,#f97316_180deg,#b91c1c_360deg)] animate-[spin_3s_linear_infinite]" />
                    </div>
                    <div className="absolute inset-[2px] bg-gray-900 rounded-full flex items-center justify-center">
                        <Sparkles size={24} className="text-orange-500" fill="currentColor" />
                    </div>
                </button>
            )}

            {isOpen && (
                <div 
                    className={`fixed z-[1000] bg-gray-900 overflow-hidden flex flex-col transition-all duration-300 inset-0 w-full h-[100dvh] rounded-none`}
                >
                    <div className="bg-gray-900/95 backdrop-blur-sm p-3 border-b border-gray-800 flex justify-between items-center shrink-0 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500"></div>
                        <div className="flex items-center space-x-3">
                            <NovaAvatar size={32} isAnimated={loading} />
                            <div><h3 className="font-extrabold text-white text-base tracking-tight">Nova</h3></div>
                        </div>
                        <div className="flex items-center space-x-1">
                            <button onClick={() => setShowEnergyHub(true)} className={`p-2 rounded-lg transition-all flex items-center gap-1.5 ${energyPercent < 20 ? 'bg-red-900/20 border border-red-900/50' : 'bg-gray-800 hover:bg-gray-700 border border-gray-700'}`} title="Energy Hub">
                                <Battery size={18} className={energyPercent < 20 ? 'text-red-500 animate-pulse' : 'text-green-500'} />
                                <span className={`text-[10px] font-black ${energyPercent < 20 ? 'text-red-500' : 'text-gray-300'}`}>{Math.round(energyPercent)}%</span>
                            </button>
                            <button onClick={() => setShowSettings(!showSettings)} className={`p-1.5 rounded hover:bg-gray-800 transition-colors ${showSettings ? 'text-orange-500' : 'text-gray-400'}`} title="Settings"><Settings size={16}/></button>
                            {/* User requested 'X' button to close entirely, returning to floating icon state */}
                            <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-gray-800 rounded text-gray-400" title="Close"><X size={18}/></button>
                        </div>
                    </div>

                    {/* AESTHETIC ENERGY HUB MODAL */}
                    {showEnergyHub && (
                        <div className="absolute inset-0 z-[60] bg-gray-900 flex flex-col animate-fade-in-up">
                            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 backdrop-blur-md">
                                <div className="flex items-center gap-2">
                                    <div className="bg-orange-600/20 p-2 rounded-lg border border-orange-500/30">
                                        <Zap size={18} className="text-orange-500" />
                                    </div>
                                    <h4 className="text-lg font-black text-white uppercase tracking-tighter">Energy Hub</h4>
                                </div>
                                <button onClick={() => setShowEnergyHub(false)} className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex-grow overflow-y-auto p-8 flex flex-col items-center custom-scrollbar">
                                <div className="relative mb-10">
                                    <div className="absolute inset-0 bg-orange-600/20 blur-[60px] rounded-full"></div>
                                    <EnergyCircle current={energy} max={maxEnergy} size={220} />
                                </div>

                                <div className="w-full max-w-sm space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-gray-800/50 p-4 rounded-2xl border border-gray-700 text-center group hover:border-orange-500/50 transition-all">
                                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Quota Used</p>
                                            <p className="text-xl font-bold text-white">{(maxEnergy - energy).toLocaleString()}</p>
                                            <TrendingDown size={14} className="mx-auto mt-2 text-red-500" />
                                        </div>
                                        <div className="bg-gray-800/50 p-4 rounded-2xl border border-gray-700 text-center group hover:border-green-500/50 transition-all">
                                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Refill Period</p>
                                            <p className="text-xl font-bold text-white">Monthly</p>
                                            <Info size={14} className="mx-auto mt-2 text-blue-500" />
                                        </div>
                                    </div>

                                    <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700 shadow-xl">
                                        <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center">
                                            <Zap size={14} className="mr-2 text-orange-500" /> Consumption Guide
                                        </h5>
                                        
                                        <div className="space-y-5">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-blue-900/30 p-2.5 rounded-xl border border-blue-500/20">
                                                        <Sparkles size={20} className="text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white">Standard Intelligence</p>
                                                        <p className="text-[10px] text-gray-500">Normal text queries</p>
                                                    </div>
                                                </div>
                                                <span className="text-sm font-black text-gray-300">-2 E</span>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-purple-900/30 p-2.5 rounded-xl border border-purple-500/20">
                                                        <Camera size={20} className="text-purple-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white">Vision Intelligence</p>
                                                        <p className="text-[10px] text-gray-500">Image analysis & OCR</p>
                                                    </div>
                                                </div>
                                                <span className="text-sm font-black text-orange-500">-10 E</span>
                                            </div>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => { setShowEnergyHub(false); setIsOpen(false); navigate('/sparks'); }}
                                        className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white py-5 rounded-2xl font-black text-lg shadow-2xl transform active:scale-95 transition-all flex items-center justify-center gap-3"
                                    >
                                        <Coins size={22} fill="currentColor"/> 
                                        <span>Buy Extra Energy</span>
                                        <ArrowRight size={20} className="ml-2" />
                                    </button>
                                </div>
                                
                                <p className="mt-8 text-center text-xs text-gray-600 max-w-[200px] leading-relaxed">
                                    Energy refilled monthly. Quota: {maxEnergy}E.
                                </p>
                            </div>
                        </div>
                    )}

                    {showSettings && (
                        <div className="bg-gray-900 border-b border-gray-700 p-4 animate-fade-in absolute w-full z-20 shadow-2xl">
                            <div className="flex justify-between items-center mb-3"><h4 className="text-sm font-bold text-white">Customization</h4><button onClick={() => setShowSettings(false)} className="p-1 bg-gray-800 rounded-full text-gray-300"><X size={14}/></button></div>
                            <h4 className="text-xs font-bold text-gray-400 mb-1 mt-2">Personal Instructions</h4>
                            <textarea value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} placeholder="e.g. 'Always answer in simple terms'..." className="w-full bg-black/30 border border-gray-700 rounded-lg p-2 text-xs text-white h-20 outline-none focus:border-orange-500 mb-2 resize-none"/>
                            <button onClick={() => setShowClearConfirm(true)} className="w-full mt-4 flex items-center justify-center p-2 bg-red-900/20 hover:bg-red-900/40 border border-red-900/50 rounded-lg text-red-400 text-xs font-bold transition-colors"><Trash2 size={14} className="mr-2"/> Clear History</button>
                        </div>
                    )}

                    <div ref={chatContainerRef} className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-900 custom-scrollbar flex flex-col overscroll-contain">
                        {messages.length === 0 && (
                            <div className="flex-grow flex flex-col items-center justify-center text-center opacity-60 p-8">
                                <NovaAvatar size={64} />
                                <h3 className="text-xl font-bold text-white mt-4">Welcome back, {firstName}!</h3>
                                <p className="text-sm text-gray-400 mt-2 max-w-xs">I'm Nova, your AI study advisor. How can I help you master your subjects today?</p>
                            </div>
                        )}
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-md ${msg.sender === 'user' ? 'bg-orange-600 text-white rounded-br-none shadow-orange-900/20' : 'bg-gray-800 text-gray-200 border border-gray-700 rounded-bl-none'}`}>
                                    {msg.image && <img src={msg.image} alt="User upload" className="w-full max-h-60 object-contain rounded-lg mb-2" />}
                                    {msg.text === '' && msg.sender === 'ai' ? (
                                        <div className="flex items-center justify-center p-1"><Sparkles size={20} className="animate-spin text-orange-500" fill="currentColor" /></div>
                                    ) : (
                                        <FormatMessageText text={msg.text} onAction={() => setIsOpen(false)} />
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} className="h-4 shrink-0"/> 
                    </div>

                    <div className="p-4 bg-gray-900 border-t border-gray-800 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
                        {selectedImage && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-xl border border-gray-700 mb-2 mx-1 shadow-lg">
                                <img src={selectedImage} className="w-8 h-8 object-cover rounded" />
                                <span className="text-xs text-gray-400 flex-1 truncate font-bold uppercase tracking-wider">Vision Phase (10E)</span>
                                <button onClick={() => setSelectedImage(null)} className="text-red-400 hover:text-white p-1"><X size={14}/></button>
                            </div>
                        )}
                        <form onSubmit={handleSend} className="flex items-end gap-2 bg-gray-800/50 backdrop-blur-md p-2 rounded-[2.5rem] border border-gray-700 shadow-xl">
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 text-gray-400 hover:text-white rounded-full transition-colors shrink-0 mb-0.5"><Camera size={20} /></button>
                            <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageSelect} />
                            <textarea ref={textareaRef} value={input} onChange={(e) => { setInput(e.target.value); if(textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`; } }} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder={`Message Nova...`} className="flex-1 bg-transparent text-white text-sm outline-none resize-none pt-2.5 pb-2.5 px-2 max-h-32 min-h-[44px] placeholder-gray-500" rows={1} style={{ lineHeight: '1.5' }} disabled={loading} />
                            <button type="submit" disabled={(!input.trim() && !selectedImage) || loading} className="w-10 h-10 bg-orange-600 hover:bg-orange-700 rounded-full flex items-center justify-center text-white shadow-lg disabled:opacity-50 disabled:grayscale transition-all shrink-0 mb-0.5">
                                {loading ? <Loader2 size={18} className="animate-spin text-white" /> : <Send size={18} className="ml-0.5" />}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default GlobalAIChat;