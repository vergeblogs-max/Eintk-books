import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { User } from 'firebase/auth';
import type { Video } from '../types';
import { getPublishedVideos, getYouTubeChannelUrl } from '../services/firestoreService';
import { NIGERIAN_CURRICULUM_SUBJECTS } from '../constants';
import LoadingSpinner from '../components/LoadingSpinner';
import { Search, ChevronDown, Filter, ChevronUp, Film, Clapperboard, Youtube } from 'lucide-react';

interface MediaPageProps {
  user: User | null;
}

const SUBJECT_TO_CATEGORY_MAP: { [key: string]: 'Science' | 'Arts' | 'Commercial' | 'General' } = {
    "Agricultural Science": "Science", "Biology": "Science", "Chemistry": "Science", "Physics": "Science", "Further Mathematics": "Science", "Computer Science": "Science", "Mathematics": "Science", "Technical Drawing": "Science",
    "Christian Religious Studies (CRS)": "Arts", "Civic Education": "Arts", "Government": "Arts", "Hausa": "Arts", "History": "Arts", "Igbo": "Arts", "Islamic Studies (IS)": "Arts", "Literature-in-English": "Arts", "Yoruba": "Arts", "English Language": "Arts",
    "Commerce": "Commercial", "Economics": "Commercial", "Financial Accounting": "Commercial",
    "Geography": "General", "Home Economics": "General", "General": "General",
};
const getSubjectCategory = (subject: string) => SUBJECT_TO_CATEGORY_MAP[subject] || 'General';

const initialFilters = {
    searchTerm: '',
    department: 'All' as 'All' | 'Science' | 'Arts' | 'Commercial',
    subject: 'All',
};

const MediaPage: React.FC<MediaPageProps> = ({ user }) => {
    // Return the "Coming Soon" page. To re-activate the Media Hub, remove this return block.
    return (
        <div className="flex flex-col items-center justify-center text-center h-[70vh] relative overflow-hidden">
            <style>{`
                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                    100% { transform: translateY(0px); }
                }
                .float-1 { animation: float 6s ease-in-out infinite; animation-delay: 0s; }
                .float-2 { animation: float 6s ease-in-out infinite; animation-delay: -2s; }
                .float-3 { animation: float 6s ease-in-out infinite; animation-delay: -4s; }
            `}</style>
            
            {/* Animated background icons */}
            <Film size={64} className="absolute top-10 left-10 text-gray-800 opacity-50 float-1" />
            <Youtube size={80} className="absolute bottom-20 right-5 text-gray-800 opacity-50 float-2" />
            <Clapperboard size={72} className="absolute top-1/2 left-1/4 -translate-y-1/2 text-gray-800 opacity-50 float-3" />
            
            <div className="z-10 bg-gray-900/50 backdrop-blur-sm p-8 rounded-lg">
                <h1 className="text-5xl font-bold text-orange-500 mb-4">Coming Soon!</h1>
                <p className="text-xl text-gray-300">
                    Our Media Hub is currently under construction.
                </p>
                <p className="text-lg text-gray-400 mt-2">
                    We're working hard to bring you exciting video content. Please check back later!
                </p>
            </div>
        </div>
    );

    // --- Original Media Page Code ---
    // This code will not run until the "Coming Soon" block above is removed.
    const [allVideos, setAllVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState(initialFilters);
    const [sortBy, setSortBy] = useState<'latest' | 'relevance'>('latest');
    const [youtubeChannelUrl, setYoutubeChannelUrl] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [videos, channelUrl] = await Promise.all([
                    getPublishedVideos(),
                    getYouTubeChannelUrl()
                ]);
                setAllVideos(videos);
                if (channelUrl) {
                    setYoutubeChannelUrl(channelUrl);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);
    
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const videoId = params.get('videoId');
        if (videoId && allVideos.length > 0) {
            const videoToPlay = allVideos.find(v => v.id === videoId);
            if (videoToPlay && videoToPlay.videoType === 'video') {
                 setTimeout(() => {
                    document.getElementById(videoId)?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
            navigate(location.pathname, { replace: true });
        }
    }, [location.search, allVideos, navigate]);

    const handleFilterChange = (key: keyof typeof filters, value: any) => {
        const newFilters = { ...filters, [key]: value };
        if (key === 'department') newFilters.subject = 'All';
        setFilters(newFilters);
    };
    
    const availableSubjects = useMemo(() => {
        if (filters.department === 'All') return Object.keys(NIGERIAN_CURRICULUM_SUBJECTS).sort();
        return Object.keys(NIGERIAN_CURRICULUM_SUBJECTS).filter(subj => getSubjectCategory(subj) === filters.department).sort();
    }, [filters.department]);

    const videos = useMemo(() => {
        let result = allVideos.filter(video => {
            if (video.videoType !== 'video') {
                return false;
            }
            const searchTermMatch = filters.searchTerm === '' || video.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) || video.topic.toLowerCase().includes(filters.searchTerm.toLowerCase());
            const departmentMatch = filters.department === 'All' || getSubjectCategory(video.subject) === filters.department;
            const subjectMatch = filters.subject === 'All' || video.subject === filters.subject;
            return searchTermMatch && departmentMatch && subjectMatch;
        });

        result.sort((a, b) => {
            if (sortBy === 'relevance' && filters.searchTerm) {
                 const scoreA = (a.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) ? 2 : 0) + (a.topic.toLowerCase().includes(filters.searchTerm.toLowerCase()) ? 1 : 0);
                 const scoreB = (b.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) ? 2 : 0) + (b.topic.toLowerCase().includes(filters.searchTerm.toLowerCase()) ? 1 : 0);
                 return scoreB - scoreA;
            }
            return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
        });

        return result;
    }, [allVideos, filters, sortBy]);

    if (loading) return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;

    return (
        <div>
            <h1 className="text-4xl font-bold text-orange-500 mb-6 text-center">Media Hub</h1>
            
            <div className="bg-gray-800 p-4 rounded-lg mb-8 sticky top-0 z-20 shadow-lg">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-grow">
                        <input type="text" placeholder="Search for videos..." value={filters.searchTerm} onChange={(e) => handleFilterChange('searchTerm', e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    </div>
                    <button onClick={() => setShowFilters(!showFilters)} className="flex items-center justify-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors md:w-auto w-full">
                        <Filter size={18} /><span>Filters</span>{showFilters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                </div>
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showFilters ? 'max-h-96 mt-4 pt-4 border-t border-gray-700' : 'max-h-0'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Sort by</label>
                            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500">
                                <option value="latest">Latest</option>
                                <option value="relevance">Relevance</option>
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Department</label>
                            <select value={filters.department} onChange={e => handleFilterChange('department', e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500"><option value="All">All Departments</option><option value="Science">Science</option><option value="Arts">Arts</option><option value="Commercial">Commercial</option></select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Subject</label>
                            <select value={filters.subject} onChange={e => handleFilterChange('subject', e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500"><option value="All">All Subjects</option>{availableSubjects.map(subject => <option key={subject} value={subject}>{subject}</option>)}</select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {videos.length > 0 ? videos.map(video => {
                    return (
                        <div key={video.id} id={video.id} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg flex flex-col">
                            <div className="relative aspect-video bg-black">
                                <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                            </div>
                            <div className="p-4 flex flex-col flex-grow">
                                <h3 className="text-lg font-bold truncate flex-grow" title={video.title}>{video.title}</h3>
                                <div className="mt-4">
                                    <a 
                                        href={video.youtubeUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="block w-full text-center bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg transition-colors"
                                    >
                                        Watch on YouTube
                                    </a>
                                    <p className="text-center text-xs text-gray-400 mt-2">Make sure to like, subscribe, and comment.</p>
                                </div>
                            </div>
                        </div>
                    )
                }) : <p className="col-span-full text-center text-gray-400 py-10">No videos found matching your criteria.</p>}
            </div>
        </div>
    );
};

export default MediaPage;
