import React, { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import type { UserData, Ebook, Badge } from '../types';
import { ALL_BADGES } from '../badges';
import { calculateEarnedBadges } from '../utils/badgeUtils';
import { getPublishedEbooks } from '../services/firestoreService';
import LoadingSpinner from '../components/LoadingSpinner';
import { ArrowLeft, Lock, Crown } from 'lucide-react';

interface BadgesPageProps {
    user: User | null;
    userData: UserData | null;
}

const BadgesPage: React.FC<BadgesPageProps> = ({ user, userData }) => {
    const navigate = useNavigate();
    const [allEbooks, setAllEbooks] = useState<Ebook[]>([]);
    const [loading, setLoading] = useState(true);
    const isProUser = userData?.subscriptionStatus === 'pro';

    useEffect(() => {
        if (!user) {
            navigate('/auth');
            return;
        }
        const fetchBooks = async () => {
            setLoading(true);
            const books = await getPublishedEbooks();
            setAllEbooks(books);
            setLoading(false);
        };
        fetchBooks();
    }, [user, navigate]);

    const earnedBadgeIds = useMemo(() => {
        if (!userData || allEbooks.length === 0) return new Set();
        const earnedBadges = calculateEarnedBadges(userData, allEbooks);
        return new Set(earnedBadges.map(b => b.id));
    }, [userData, allEbooks]);

    const unlockedCount = earnedBadgeIds.size;
    const totalCount = ALL_BADGES.length;

    const BadgeCard: React.FC<{ badge: Badge, isUnlocked: boolean }> = ({ badge, isUnlocked }) => {
        const IconComponent = LucideIcons[badge.icon as keyof typeof LucideIcons] as React.ElementType || LucideIcons.Award;
        
        const isLockedProBadge = badge.isPro && !isProUser;

        const cardClasses = isUnlocked
            ? "bg-gray-800 border-orange-500/50"
            : "bg-gray-800/50 border-gray-700";
        const iconContainerClasses = isUnlocked
            ? "bg-orange-500 text-white"
            : isLockedProBadge ? "bg-yellow-800 text-yellow-500" : "bg-gray-700 text-gray-500";
        const textClasses = isUnlocked ? "text-white" : "text-gray-400";

        return (
            <div className={`border ${cardClasses} p-4 rounded-lg flex flex-col items-center text-center transition-all duration-300 ${isUnlocked ? 'shadow-lg shadow-orange-900/20' : ''}`}>
                <div className={`relative w-16 h-16 rounded-full flex items-center justify-center mb-3 ${iconContainerClasses}`}>
                    <IconComponent size={32} />
                    {!isUnlocked && (
                        <div className="absolute -bottom-1 -right-1 bg-gray-600 rounded-full p-1 border-2 border-gray-800">
                             {isLockedProBadge ? <Crown size={12} className="text-yellow-400" /> : <Lock size={12} className="text-gray-300" />}
                        </div>
                    )}
                </div>
                <h3 className={`font-bold ${textClasses}`}>{badge.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{badge.description}</p>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh]">
                <LoadingSpinner />
                <p className="mt-4">Loading Badges...</p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center mb-6">
                 <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-800">
                    <ArrowLeft className="text-orange-500" />
                </button>
                <div className="ml-4">
                    <h1 className="text-3xl font-bold text-orange-500">Your Badges</h1>
                    <p className="text-gray-400">You've unlocked {unlockedCount} of {totalCount} badges.</p>
                </div>
            </div>
            
             <div className="relative w-full h-2 bg-gray-700 rounded-full mb-8">
                <div 
                    className="h-2 bg-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${(unlockedCount / totalCount) * 100}%`}}
                ></div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {ALL_BADGES.map(badge => (
                    <BadgeCard key={badge.id} badge={badge} isUnlocked={earnedBadgeIds.has(badge.id)} />
                ))}
            </div>
        </div>
    );
};

export default BadgesPage;