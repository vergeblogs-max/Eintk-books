
import React, { useState } from 'react';
import { X, Send, Sparkles, User, Bot } from 'lucide-react';
import { getAIDefinition } from '../services/geminiService'; // Reusing existing service

interface AIChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    ebookContext: {
        title: string;
        subject: string;
        currentChapter: string;
    };
}

const AIChatModal: React.FC<AIChatModalProps> = ({ isOpen, onClose, ebookContext }) => {
    const [messages, setMessages] = useState<{ sender: 'user' | 'ai', text: string }[]>([
        { sender: 'ai', text: `Hi! I'm your AI Tutor. I can help you understand "${ebookContext.title}". Ask me anything about this chapter!` }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input;
        setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
        setInput('');
        setLoading(true);

        try {
            // Reusing getAIDefinition as a generic Q&A function for now since we don't have a dedicated chat endpoint yet.
            // In a real app, this would be a specialized `chatWithContext` function.
            const context = `Book: ${ebookContext.title}, Subject: ${ebookContext.subject}, Chapter: ${ebookContext.currentChapter}`;
            const response = await getAIDefinition(userMsg, context); 
            
            setMessages(prev => [...prev, { sender: 'ai', text: response }]);
        } catch (error) {
            setMessages(prev => [...prev, { sender: 'ai', text: "Sorry, I'm having trouble connecting right now. Please try again." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            
            <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col h-[600px] max-h-[80vh] animate-fade-in-up">
                
                {/* Header */}
                <div className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <div className="bg-orange-600 p-1.5 rounded-full"><Bot size={18} className="text-white"/></div>
                        <div>
                            <h3 className="font-bold text-white text-sm">AI Tutor</h3>
                            <p className="text-xs text-gray-400 truncate max-w-[200px]">{ebookContext.currentChapter}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20}/></button>
                </div>

                {/* Messages */}
                <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-900 custom-scrollbar">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl p-3 text-sm ${msg.sender === 'user' ? 'bg-orange-600 text-white rounded-br-none' : 'bg-gray-800 text-gray-200 border border-gray-700 rounded-bl-none'}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-bl-none p-3 flex items-center space-x-2">
                                <Sparkles size={14} className="animate-spin text-orange-400"/>
                                <span className="text-xs text-gray-400">Thinking...</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input */}
                <form onSubmit={handleSend} className="p-3 bg-gray-800 border-t border-gray-700 flex items-center space-x-2">
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question..."
                        className="flex-1 bg-gray-900 border border-gray-600 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                    />
                    <button type="submit" disabled={!input.trim() || loading} className="p-2 bg-orange-600 rounded-full text-white hover:bg-orange-700 disabled:opacity-50 disabled:bg-gray-600">
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AIChatModal;
