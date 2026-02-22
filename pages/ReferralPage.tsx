
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Share2, Users, Gift, CheckCircle, Smartphone, Star } from 'lucide-react';
import type { User } from 'firebase/auth';
import type { UserData } from '../types';

interface ReferralPageProps {
    user: User | null;
    userData: UserData | null;
}

const ReferralPage: React.FC<ReferralPageProps> = ({ user, userData }) => {
    const navigate = useNavigate();
    const [copied, setCopied] = useState(false);

    if (!user || !userData) {
        navigate('/auth');
        return null;
    }

    // Fallback if code hasn't generated yet (though ProfilePage ensures it)
    const referralCode = userData.referralCode || "LOADING";
    const referralLink = `https://www.eintk.com.ng/#/auth?ref=${referralCode}`; 
    const referralCount = userData.referralCount || 0;
    const sparksEarned = referralCount * 50;

    const handleCopyCode = () => {
        navigator.clipboard.writeText(referralCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShareWhatsApp = () => {
        const text = encodeURIComponent(
            `Yo! I just found the ultimate hack for our exams! 🚀 📚\n\nI'm using EINTK to smash my syllabus. It actually creates a custom study plan for you, so you know exactly what to read every single day until you finish everything before exam day. 📅 ✅\n\nIt's also got the best test prep questions for practice and a cool community where we can all learn and gist together. 🤝 🔥\n\nUse my invitation code *${referralCode}* to get started and join the squad!\n\nGet your plan here: ${referralLink}`
        );
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 pb-20">
            {/* Header */}
            <div className="flex items-center mb-8">
                <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-800 text-orange-500 transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold ml-2">Refer & Earn</h1>
            </div>

            <div className="max-w-md mx-auto text-center space-y-8 animate-fade-in-up">
                
                {/* Hero Icon */}
                <div className="relative inline-block">
                    <div className="absolute inset-0 bg-yellow-500 blur-2xl opacity-20 rounded-full"></div>
                    <div className="bg-gradient-to-br from-yellow-500 to-orange-600 p-6 rounded-full relative z-10 shadow-xl border-4 border-gray-800">
                        <Gift size={48} className="text-white" />
                    </div>
                </div>

                <div>
                    <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-2">
                        Earn 50 Sparks Per Friend
                    </h2>
                    <p className="text-gray-400 text-sm max-w-xs mx-auto">
                        Invite your friends to EINTK. When they sign up using your code, you get **50 Sparks** instantly.
                    </p>
                </div>

                {/* The Code Card */}
                <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/10 rounded-bl-full pointer-events-none transition-all group-hover:bg-yellow-500/20"></div>
                    
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Your Unique Code</p>
                    
                    <div 
                        onClick={handleCopyCode}
                        className="bg-black/30 border-2 border-dashed border-gray-600 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-yellow-500 transition-colors"
                    >
                        <span className="text-3xl font-mono font-bold text-white tracking-wider">{referralCode}</span>
                        <div className="bg-gray-700 p-2 rounded-lg text-gray-300">
                            {copied ? <CheckCircle size={20} className="text-green-400"/> : <Copy size={20}/>}
                        </div>
                    </div>
                    {copied && <p className="text-green-400 text-xs mt-2 font-bold">Copied to clipboard!</p>}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                        <Users className="text-blue-400 mb-2" size={24} />
                        <p className="text-2xl font-bold text-white">{referralCount}</p>
                        <p className="text-xs text-gray-500 font-bold uppercase">Friends Invited</p>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                        <Star className="text-yellow-400 mb-2 fill-current" size={24} />
                        <p className="text-2xl font-bold text-white">{sparksEarned}</p>
                        <p className="text-xs text-gray-500 font-bold uppercase">Sparks Earned</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    <button 
                        onClick={handleShareWhatsApp}
                        className="w-full bg-[#25D366] hover:bg-[#20b85c] text-white font-bold py-4 rounded-xl flex items-center justify-center shadow-lg transition-transform hover:scale-105"
                    >
                        <Share2 size={20} className="mr-2" /> Share on WhatsApp
                    </button>
                    
                    <div className="bg-gray-800/50 p-4 rounded-xl text-left border border-gray-700/50">
                        <h4 className="text-sm font-bold text-gray-300 mb-2 flex items-center"><Smartphone size={16} className="mr-2"/> How it works:</h4>
                        <ul className="text-xs text-gray-400 space-y-2 list-disc list-inside">
                            <li>Share your code with a friend.</li>
                            <li>They enter it when creating a new account.</li>
                            <li>You receive <strong>50 Sparks</strong> instantly in your Wallet.</li>
                            <li>Use Sparks to buy Day Passes, Arcade Boosts, or Energy!</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReferralPage;
