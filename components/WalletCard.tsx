
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, Zap, Eye, EyeOff, ArrowRight, Wallet } from 'lucide-react';
import { formatPoints } from '../utils/formatters';

interface WalletCardProps {
    sparks: number;
    energy: number;
}

const WalletCard: React.FC<WalletCardProps> = ({ sparks, energy }) => {
    const [isVisible, setIsVisible] = useState(() => localStorage.getItem('wallet_visible') !== 'false');

    useEffect(() => {
        localStorage.setItem('wallet_visible', isVisible.toString());
    }, [isVisible]);

    return (
        <div className="bg-gray-800/40 backdrop-blur-xl rounded-[2rem] p-6 border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden group mb-8">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/10 rounded-full blur-[50px] -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-600/10 rounded-full blur-[50px] -ml-10 -mb-10"></div>

            <div className="flex justify-between items-center mb-8 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gray-900/80 rounded-2xl border border-white/5 shadow-inner">
                        <Wallet size={20} className="text-orange-500" />
                    </div>
                    <div>
                        <h3 className="text-white font-black text-sm uppercase tracking-tighter">Knowledge Vault</h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Global Balance</p>
                    </div>
                </div>
                <button 
                    onClick={() => setIsVisible(!isVisible)}
                    className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all border border-white/5"
                >
                    {isVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8 relative z-10">
                <div className="space-y-1">
                    <div className="flex items-center gap-1.5 opacity-60">
                        <Star size={10} className="text-yellow-500 fill-current"/>
                        <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Sparks</span>
                    </div>
                    <p className="text-4xl font-black text-white tracking-tighter">
                        {isVisible ? formatPoints(sparks) : '••••'}
                    </p>
                </div>
                <div className="space-y-1">
                    <div className="flex items-center gap-1.5 opacity-60">
                        <Zap size={10} className="text-green-500 fill-current"/>
                        <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Energy</span>
                    </div>
                    <p className="text-4xl font-black text-white tracking-tighter">
                        {isVisible ? formatPoints(energy) : '••••'}
                    </p>
                </div>
            </div>

            <Link 
                to="/sparks" 
                className="w-full py-5 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-2xl shadow-orange-900/40 transform active:scale-95 transition-all group"
            >
                Enter Spark Hub 
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
        </div>
    );
};

export default WalletCard;
