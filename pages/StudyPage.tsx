
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { User } from 'firebase/auth';
import type { StudyDeck, Ebook } from '../types';
import { getPublishedEbooks, getUserData } from '../services/firestoreService';
import { getAllOfflineBooks } from '../services/offlineService';
import LoadingSpinner from '../components/LoadingSpinner';
import { BrainCircuit, BookCopy, WifiOff } from 'lucide-react';

interface StudyPageProps {
  user: User | null;
}

const StudyPage: React.FC<StudyPageProps> = ({ user }) => {
    const navigate = useNavigate();
    const [studyDecks, setStudyDecks] = useState<StudyDeck[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const handleStatusChange = () => { setIsOffline(!navigator.onLine); };
        window.addEventListener('online', handleStatusChange);
        window.addEventListener('offline', handleStatusChange);
        return () => {
            window.removeEventListener('online', handleStatusChange);
            window.removeEventListener('offline', handleStatusChange);
        };
    }, []);

    useEffect(() => {
        if (!user) {
            navigate('/auth', { state: { from: '/study' } });
            return;
        }

        const fetchDecks = async () => {
            setLoading(true);
            try {
                let onlineEbooks: Ebook[] = [];
                let offlineEbooks: Ebook[] = [];
                let userData = null;

                // 1. Fetch Online Data if available
                if (navigator.onLine) {
                    try {
                        const [books, data] = await Promise.all([
                            getPublishedEbooks(),
                            getUserData(user.uid)
                        ]);
                        onlineEbooks = books;
                        userData = data;
                    } catch (e) {
                        console.warn("Online fetch failed", e);
                    }
                } else {
                    // Try to get cached user data if offline
                    try { userData = await getUserData(user.uid); } catch (e) {}
                }

                // 2. Fetch Offline Data
                offlineEbooks = await getAllOfflineBooks();

                const isProUser = userData?.subscriptionStatus === 'pro';

                // 3. Merge Ebooks
                // We use a Map to ensure unique books by ID.
                const bookMap = new Map<string, Ebook>();
                
                // Add online books first
                onlineEbooks.forEach(b => bookMap.set(b.id, b));
                
                // Add/Overwrite with offline books (ensures we have content even if online fetch failed)
                offlineEbooks.forEach(b => bookMap.set(b.id, b));

                const allEbooks = Array.from(bookMap.values());

                // 4. Filter Accessible Decks
                const accessibleEbooks = allEbooks.filter(ebook => {
                    const isDownloaded = offlineEbooks.some(off => off.id === ebook.id);
                    // Allow access if: Free OR User is Pro OR Book is Downloaded (implies previous access)
                    return ebook.accessLevel === 'free' || isProUser || isDownloaded;
                });

                const ebookDecks: StudyDeck[] = accessibleEbooks
                    .filter(ebook => ebook.flashcards && ebook.flashcards.length > 0)
                    .map(ebook => ({
                        id: ebook.id,
                        title: ebook.title,
                        coverImageUrl: ebook.coverImageUrl,
                        cardCount: ebook.flashcards!.length,
                        type: 'ebook',
                        accessLevel: ebook.accessLevel,
                    }));
                
                ebookDecks.sort((a, b) => a.title.localeCompare(b.title));
                setStudyDecks(ebookDecks);

            } catch (error) {
                console.error("Failed to fetch study decks:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDecks();
    }, [user, navigate, isOffline]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <LoadingSpinner />
                <p className="mt-4 text-gray-400">Loading your study decks...</p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-orange-500 flex items-center space-x-3">
                    <BrainCircuit size={32} />
                    <span>My Study Decks</span>
                </h1>
                {isOffline && <WifiOff className="text-gray-500" title="Offline Mode" />}
            </div>

            {studyDecks.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {studyDecks.map(deck => (
                        <Link 
                            key={`${deck.type}-${deck.id}`} 
                            to={`/study-session/${deck.type}/${deck.id}`}
                            className="block bg-gray-800 rounded-lg shadow-lg overflow-hidden group transform hover:scale-105 transition-transform duration-300"
                        >
                            <div className="relative">
                                <img src={deck.coverImageUrl || 'https://picsum.photos/300/450'} alt={deck.title} className="w-full h-56 object-cover" />
                                <div className="absolute inset-0 bg-black bg-opacity-40 group-hover:bg-opacity-60 transition-opacity duration-300"></div>
                            </div>
                            <div className="p-4">
                                <h3 className="text-lg font-bold truncate text-white" title={deck.title}>{deck.title}</h3>
                                <div className="text-sm text-gray-400 mt-2 flex items-center space-x-2">
                                    <BookCopy size={16} />
                                    <span>{deck.cardCount} Cards</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="text-center mt-20 flex flex-col items-center">
                    <BrainCircuit className="text-gray-500 mb-4" size={64} />
                    <h2 className="text-2xl font-bold text-gray-200">No Study Decks Available</h2>
                    <p className="text-gray-400 mt-2 max-w-sm">
                        {isOffline 
                            ? "You are offline. Download books while online to access their study decks here."
                            : "Study decks are automatically created from key points in your accessible e-books."
                        }
                    </p>
                    {!isOffline && (
                        <Link to="/" className="mt-6 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-300">
                            Explore the Library
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
};

export default StudyPage;
