
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// Added X to the imports to fix "Cannot find name 'X'" error on line 59.
import { Flame, ShieldCheck, Zap, ArrowRight, ShoppingBag, Ghost, AlertTriangle, Sparkles, X } from 'lucide-react';

const StreakMaintenancePage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // State passed from App.tsx navigation
    const { status, streak, freezesLeft } = location.state || { status: 'lost', streak: 0, freezesLeft: 0 };
    const isRepaired = status === 'repaired';

    useEffect(() => {
        // Scroll lock
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const handleContinue = () => {
        navigate('/', { replace: true });
    };

    const handleEmporium = () => {
        navigate('/sparks', { replace: true });
    };

    return (
        <div className="fixed inset-0 z-[600] bg-gray-900 flex flex-col items-center justify-center p-8 overflow-hidden font-sans">
            {/* Ambient Background Layers */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] transition-colors duration-1000 ${isRepaired ? 'bg-blue-600/10' : 'bg-red-600/10'}`}></div>
                <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] transition-colors duration-1000 ${isRepaired ? 'bg-orange-600/10' : 'bg-gray-600/10'}`}></div>
            </div>

            <div className="relative z-10 max-w-md w-full flex flex-col items-center text-center animate-fade-in">
                
                {/* Hero Visual Block */}
                <div className="mb-10 relative">
                    <div className={`absolute inset-0 blur-3xl opacity-30 animate-pulse ${isRepaired ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                    
                    <div className={`relative p-8 rounded-[3.5rem] border-4 shadow-2xl transition-all duration-700 ${isRepaired ? 'bg-blue-900/20 border-blue-500/50' : 'bg-gray-800 border-gray-700'}`}>
                        {isRepaired ? (
                            <div className="relative">
                                <div className="absolute -top-4 -right-4 bg-orange-600 p-2 rounded-full border-4 border-gray-900 animate-bounce">
                                    <Sparkles size={24} className="text-white" />
                                </div>
                                <ShieldCheck size={100} className="text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.5)]" />
                                <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                                    <Flame size={40} className="text-orange-500 fill-current animate-pulse" />
                                </div>
                            </div>
                        ) : (
                            <div className="relative grayscale opacity-40">
                                <Ghost size={100} className="text-gray-400" />
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                    <X size={48} className="text-red-500" strokeWidth={3} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Text Content */}
                <div className="space-y-4 mb-12">
                    <h1 className={`text-4xl font-black uppercase tracking-tighter italic leading-none ${isRepaired ? 'text-blue-400' : 'text-white'}`}>
                        {isRepaired ? 'Streak Shielded!' : 'The Flame Out'}
                    </h1>
                    
                    <p className="text-gray-400 text-lg leading-relaxed px-2 font-medium">
                        {isRepaired 
                            ? `You missed yesterday, but your **Streak Freeze** automatically deployed to save your **${streak} day streak**!` 
                            : `A tragic skip. Your **${streak} day streak** has reset to zero because no Shields were found in your inventory.`}
                    </p>

                    {isRepaired ? (
                        <div className="inline-flex items-center gap-2 bg-gray-800/80 px-4 py-2 rounded-full border border-white/5 shadow-inner">
                            <Zap size={16} className="text-blue-400" />
                            <span className="text-xs font-black uppercase tracking-widest text-gray-300">
                                {freezesLeft} Freezes Remaining
                            </span>
                        </div>
                    ) : (
                        <div className="inline-flex items-center gap-2 bg-red-900/20 px-4 py-2 rounded-full border border-red-500/30">
                            <AlertTriangle size={16} className="text-red-500" />
                            <span className="text-xs font-black uppercase tracking-widest text-red-400">
                                Preparations Required
                            </span>
                        </div>
                    )}
                </div>

                {/* Action Grid */}
                <div className="grid grid-cols-1 gap-4 w-full">
                    <button 
                        onClick={handleEmporium}
                        className="group w-full bg-white text-gray-900 font-black py-5 rounded-[2rem] flex items-center justify-center gap-3 shadow-[0_20px_50px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-[0.1em] text-sm"
                    >
                        <ShoppingBag size={20} className="group-hover:rotate-12 transition-transform" />
                        {isRepaired ? 'Restock Shields' : 'Buy Streak Freezes'}
                    </button>

                    <button 
                        onClick={handleContinue}
                        className="w-full bg-gray-800/50 hover:bg-gray-800 text-gray-400 hover:text-white font-black py-5 rounded-[2rem] flex items-center justify-center gap-3 border border-white/5 transition-all uppercase tracking-widest text-[10px]"
                    >
                        {isRepaired ? 'Enter the Library' : 'Start Fresh'}
                        <ArrowRight size={14} />
                    </button>
                </div>

                {/* Footer Wisdom */}
                <p className="mt-12 text-[10px] text-gray-600 font-black uppercase tracking-[0.3em] max-w-[200px] leading-relaxed">
                    {isRepaired 
                        ? "Don't let the battery run dry. A warrior is always prepared." 
                        : "Failure is just a reset button. Buy a Shield to stay invincible next time."}
                </p>
            </div>

            <style>{`
                .nova-chat-content strong {
                    color: #fb923c !important;
                }
            `}</style>
        </div>
    );
};

export default StreakMaintenancePage;
