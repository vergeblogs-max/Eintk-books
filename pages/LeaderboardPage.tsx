
import React, { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import type { UserData } from '../types';
import { getLeaderboardUsers } from '../services/firestoreService';
import LoadingSpinner from '../components/LoadingSpinner';
import { Trophy, Medal, Star, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatPoints } from '../utils/formatters';
import { SKIN_CONFIG } from '../constants';

interface LeaderboardPageProps {
  user: User | null;
  userData: UserData | null;
}

const LeaderboardPage: React.FC<LeaderboardPageProps> = ({ user, userData }) => {
    const [leaderboard, setLeaderboard] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showExactPoints, setShowExactPoints] = useState(false);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }
        getLeaderboardUsers(100)
            .then(users => {
                setLeaderboard(users);
            })
            .catch(err => {
                console.error("Failed to load leaderboard:", err);
                setError("Could not load the leaderboard. This may be due to a permissions issue or a missing database index.");
            }).finally(() => {
                setLoading(false);
            });
    }, [user]);

    const userRank = user ? leaderboard.findIndex(u => u.uid === user.uid) + 1 : 0;
    
    const getRankColor = (rank: number) => {
        if (rank === 1) return "bg-yellow-500 text-yellow-900";
        if (rank === 2) return "bg-gray-400 text-gray-800";
        if (rank === 3) return "bg-yellow-700 text-yellow-100";
        return "bg-gray-700 text-gray-200";
    };

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Trophy size={20} className="text-yellow-300" />;
        if (rank === 2) return <Medal size={20} className="text-gray-200" />;
        if (rank === 3) return <Star size={20} className="text-yellow-600" />;
        return null;
    };

    const displayPoints = (points: number) => {
        return showExactPoints ? points.toLocaleString() : formatPoints(points);
    };

    const ProfileWithSkin = ({ player, size = "w-12 h-12" }: { player: UserData, size?: string }) => {
        const activeSkinId = player.inventory?.activeSkinId || 'default';
        const config = SKIN_CONFIG[activeSkinId] || SKIN_CONFIG.default;
        
        const isFullPro = player.subscriptionStatus === 'pro' && !!player.proExpiryDate;
        
        return (
            <div className={`relative ${size} shrink-0`}>
                {/* The "Rotating Color" Layer */}
                <div className={`absolute inset-0 rounded-full overflow-hidden`}>
                   {/* This div actually holds the centered spinning gradient */}
                   <div 
                     className="absolute top-1/2 left-1/2 w-[250%] h-[250%] animate-spin-slow opacity-100" 
                     style={{ 
                        background: `conic-gradient(from 0deg, ${config.primary}, ${config.secondary}, ${config.primary})`,
                     }}
                   ></div>
                   
                   {/* Black inner circle to make it look like a ring */}
                   <div className="absolute inset-[2.5px] bg-gray-900 rounded-full z-10"></div>
                </div>
                
                {/* Actual Image */}
                <div className="absolute inset-[4px] rounded-full overflow-hidden z-20">
                    <img 
                        src={player.profilePictureUrl || 'https://via.placeholder.com/100'} 
                        alt={player.username} 
                        className="w-full h-full object-cover" 
                    />
                </div>

                {isFullPro && (
                    <div className={`absolute bottom-[-4px] left-1/2 -translate-x-1/2 z-30 bg-gradient-to-br ${config.gradient} text-white text-[7px] font-black px-2 py-0.5 rounded-full border ${config.border} shadow-lg whitespace-nowrap`}>
                        PRO
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh]">
                <LoadingSpinner />
                <p className="mt-4 text-gray-400">Loading Leaderboard...</p>
            </div>
        );
    }
    
    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] text-center">
                <Trophy size={64} className="text-gray-600 mb-4" />
                <h2 className="text-2xl font-bold">Join the Competition!</h2>
                <p className="text-gray-400 mt-2 max-w-sm">You need to be logged in to view the leaderboard and see how you rank against other learners.</p>
                <div className="mt-6 flex gap-4">
                    <Link to="/auth" state={{ isLogin: true }} className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg">Login</Link>
                    <Link to="/auth" state={{ isLogin: false }} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg">Sign Up</Link>
                </div>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-red-500">Error</h2>
                <p className="text-gray-400 mt-2">{error}</p>
                <p className="text-xs text-gray-500 mt-2">Please ensure the 'users' collection has the required index on the 'points' field.</p>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8 relative">
                <Trophy size={48} className="mx-auto text-orange-500" />
                <h1 className="text-4xl font-bold text-orange-500 mt-2">Leaderboard</h1>
                <p className="text-gray-400">See who's at the top of their game!</p>
                
                <button 
                    onClick={() => setShowExactPoints(!showExactPoints)}
                    className="absolute top-0 right-0 p-2 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors border border-gray-700"
                    title={showExactPoints ? "Show abbreviated scores" : "Show exact scores"}
                >
                    {showExactPoints ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>

            {/* Top 3 Users */}
            {leaderboard.length >= 3 && (
                <div className="grid grid-cols-3 gap-4 mb-10 items-end text-center">
                    {/* 2nd Place */}
                    <div className="order-2 pb-2">
                        <ProfileWithSkin player={leaderboard[1]} size="w-24 h-24 mx-auto" />
                        <p className="font-bold mt-4 truncate">{leaderboard[1].username}</p>
                        <p className="text-lg font-semibold text-gray-300" title={`${leaderboard[1].points} pts`}>{displayPoints(leaderboard[1].points)} pts</p>
                        <div className="h-16 w-full bg-gray-600 rounded-t-lg flex items-center justify-center text-3xl font-black">2</div>
                    </div>
                    {/* 1st Place */}
                    <div className="order-1 pb-2">
                        <ProfileWithSkin player={leaderboard[0]} size="w-32 h-32 mx-auto" />
                        <p className="font-bold mt-6 truncate">{leaderboard[0].username}</p>
                        <p className="text-xl font-semibold text-yellow-300" title={`${leaderboard[0].points} pts`}>{displayPoints(leaderboard[0].points)} pts</p>
                        <div className="h-24 w-full bg-yellow-500 rounded-t-lg flex items-center justify-center text-4xl font-black">1</div>
                    </div>
                    {/* 3rd Place */}
                    <div className="order-3 pb-2">
                         <ProfileWithSkin player={leaderboard[2]} size="w-24 h-24 mx-auto" />
                        <p className="font-bold mt-4 truncate">{leaderboard[2].username}</p>
                        <p className="text-lg font-semibold text-yellow-600" title={`${leaderboard[2].points} pts`}>{displayPoints(leaderboard[2].points)} pts</p>
                        <div className="h-12 w-full bg-yellow-800 rounded-t-lg flex items-center justify-center text-2xl font-black">3</div>
                    </div>
                </div>
            )}
            
            <div className="space-y-3">
                {leaderboard.slice(leaderboard.length >= 3 ? 3 : 0).map((player, index) => {
                    const rank = (leaderboard.length >= 3 ? 4 : 1) + index;
                    const isCurrentUser = player.uid === user?.uid;
                    return (
                        <div key={player.uid} className={`flex items-center p-3 rounded-lg ${isCurrentUser ? 'bg-orange-900/50 border-2 border-orange-500' : 'bg-gray-800'}`}>
                            <div className={`w-10 h-10 flex items-center justify-center rounded-full font-bold text-lg mr-4 shrink-0 ${getRankColor(rank)}`}>
                                {rank}
                            </div>
                            <ProfileWithSkin player={player} />
                            <div className="flex-grow ml-4">
                                <p className="font-bold truncate">{player.username}</p>
                                <p className="text-sm text-gray-400">{player.state}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                               {getRankIcon(rank)}
                                <p className="font-bold text-lg text-orange-400" title={`${player.points} pts`}>{displayPoints(player.points)} pts</p>
                            </div>
                        </div>
                    );
                })}
            </div>

             {userRank > 0 && (
                 <div className="sticky bottom-20 mt-8 z-40">
                     <div className="flex items-center p-3 rounded-lg bg-gray-900 border-2 border-orange-500 shadow-lg">
                        <div className={`w-10 h-10 flex items-center justify-center rounded-full font-bold text-lg mr-4 shrink-0 ${getRankColor(userRank)}`}>
                            {userRank}
                        </div>
                        <ProfileWithSkin player={userData!} />
                        <div className="flex-grow ml-4">
                            <p className="font-bold truncate">{userData?.username}</p>
                            <p className="text-sm text-gray-400">Your Rank</p>
                        </div>
                        <p className="font-bold text-lg text-orange-400" title={`${userData?.points} pts`}>{displayPoints(userData?.points || 0)} pts</p>
                    </div>
                 </div>
            )}
        </div>
    );
};

export default LeaderboardPage;
