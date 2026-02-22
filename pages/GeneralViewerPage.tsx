
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { Ebook, UserData } from '../types';
import type { User } from 'firebase/auth';
import { getEbookById } from '../services/firestoreService';
import { ArrowLeft, Lock, Crown, Sparkles } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

interface GeneralViewerPageProps {
    user: User | null;
    userData: UserData | null;
}

const GeneralViewerPage: React.FC<GeneralViewerPageProps> = ({ user, userData }) => {
    const { ebookId } = useParams<{ ebookId: string }>();
    const navigate = useNavigate();
    const [ebook, setEbook] = useState<Ebook | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEbook = async () => {
            if (ebookId) {
                try {
                    const fetchedEbook = await getEbookById(ebookId);
                    setEbook(fetchedEbook);
                } catch (e) {
                    console.error(e);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchEbook();
    }, [ebookId]);

    // Redirect if they actually have access
    useEffect(() => {
        if (ebook && userData) {
            const isPro = userData.subscriptionStatus === 'pro';
            if (ebook.accessLevel === 'free' || isPro) {
                navigate(`/general-reader/${ebook.id}`);
            }
        }
    }, [ebook, userData, navigate]);

    if (loading) return <div className="flex justify-center items-center h-screen bg-gray-900"><LoadingSpinner /></div>;
    if (!ebook) return <div className="text-center mt-20 text-gray-400">Story not found.</div>;

    const firstChapter = ebook.chapters && ebook.chapters.length > 0 ? ebook.chapters[0] : null;

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
            {/* Header Image with Overlay */}
            <div className="relative h-[40vh] w-full overflow-hidden">
                <img src={ebook.coverImageUrl} alt={ebook.title} className="absolute inset-0 w-full h-full object-cover blur-sm" />
                <div className="absolute inset-0 bg-black/60 flex flex-col justify-center items-center p-6 text-center">
                    <button 
                        onClick={() => navigate('/')} 
                        className="absolute top-4 left-4 p-2 bg-black/30 backdrop-blur-md rounded-full text-white hover:bg-black/50 transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <span className="inline-block px-3 py-1 bg-yellow-500 text-black text-xs font-bold rounded-full mb-4 uppercase tracking-wide">
                        <Crown size={12} className="inline mr-1"/> Pro Exclusive
                    </span>
                    <h1 className="text-3xl md:text-4xl font-black text-white mb-2">{ebook.title}</h1>
                    <p className="text-gray-300 text-sm max-w-md">{ebook.topic}</p>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-6 py-8 relative">
                {/* Preview Content */}
                {firstChapter && (
                    <div className="prose prose-invert prose-lg max-w-none text-gray-400 leading-relaxed font-serif opacity-80">
                        <div dangerouslySetInnerHTML={{ __html: firstChapter.content.substring(0, 500) + "..." }} />
                    </div>
                )}

                {/* Fade Out Overlay */}
                <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-gray-900 via-gray-900/95 to-transparent flex flex-col items-center justify-end pb-12 z-10">
                    <Lock size={48} className="text-gray-500 mb-4 animate-bounce" />
                    <h2 className="text-2xl font-bold text-white mb-2">Unlock Full Story</h2>
                    <p className="text-gray-400 mb-6 text-center max-w-xs">This is a premium story. Upgrade to Pro to read the rest and access our entire library.</p>
                    
                    <Link 
                        to="/upgrade" 
                        className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold py-4 px-10 rounded-full shadow-lg transform hover:scale-105 transition-all flex items-center"
                    >
                        <Sparkles className="mr-2" /> Go Pro Now
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default GeneralViewerPage;
