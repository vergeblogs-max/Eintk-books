
import React, { useState, useEffect, useMemo } from 'react';
import { getPublishedEbooks } from '../services/firestoreService';
import { generateSocialContent, generateImage, generateSpeech } from '../services/geminiService';
import { uploadImage, base64ToFile } from '../services/imageUploadService';
import type { Ebook } from '../types';
import { ArrowLeft, Youtube, Video, BookOpen, Layers, Copy, RefreshCw, Download, Check, Sparkles, Wand2, Loader2, Image as ImageIcon, Plus, X, MonitorPlay, Smartphone, Save, Folder, Trash2, Clock, Calendar, Mic } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import AudioPlayer from '../components/AudioPlayer';

const LS_CREATED_VIDEOS_KEY = 'eintk_social_videos_created';
const LS_SAVED_PROJECTS_KEY = 'eintk_saved_social_projects';

interface SavedProject {
    id: string;
    timestamp: number;
    bookTitle: string;
    chapterTitle: string; // "Combined" title
    content: any; // The generated content object
    videoFormat: 'video' | 'short';
    durationMinutes: number;
    selectedChapters: number[];
    bookId: string;
    // We save the minimal book object needed to restore context
    bookData: Ebook;
}

const SocialPage: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    
    // View State
    const [showSavedProjects, setShowSavedProjects] = useState(false);
    const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);

    // Data State
    const [allBooks, setAllBooks] = useState<Ebook[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [createdVideoIds, setCreatedVideoIds] = useState<string[]>([]);

    // Selection State
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [selectedBook, setSelectedBook] = useState<Ebook | null>(null);
    const [selectedChapters, setSelectedChapters] = useState<number[]>([]); // Multi-select
    
    // Config State
    const [videoFormat, setVideoFormat] = useState<'video' | 'short'>('video');
    const [durationMinutes, setDurationMinutes] = useState<number>(5); // Default 5 minutes
    const [imageModel, setImageModel] = useState<'imagen-4.0-generate-001' | 'gemini-2.5-flash-image'>('gemini-2.5-flash-image');

    // Generation State
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState<any>(null);
    
    // Thumbnail State
    const [generatingThumbnails, setGeneratingThumbnails] = useState<Record<number, boolean>>({});
    const [thumbnailImages, setThumbnailImages] = useState<Record<number, string>>({});

    // Audio Generation State
    const [selectedVoice, setSelectedVoice] = useState('Puck');
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    const VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];

    // Load Data & Saved Projects
    useEffect(() => {
        const load = async () => {
            try {
                const books = await getPublishedEbooks();
                // Filter for "Free" books (Summary books) per user request
                const summaryBooks = books.filter(b => b.accessLevel === 'free');
                setAllBooks(summaryBooks);
                
                const storedVideos = localStorage.getItem(LS_CREATED_VIDEOS_KEY);
                if (storedVideos) setCreatedVideoIds(JSON.parse(storedVideos));

                const storedProjects = localStorage.getItem(LS_SAVED_PROJECTS_KEY);
                if (storedProjects) setSavedProjects(JSON.parse(storedProjects));

            } catch (e) {
                console.error("Failed to load books", e);
            } finally {
                setLoadingData(false);
            }
        };
        load();
    }, []);

    const subjects = useMemo(() => Array.from(new Set(allBooks.map(b => b.subject))).sort(), [allBooks]);
    
    const filteredBooks = useMemo(() => {
        if (!selectedSubject) return [];
        return allBooks.filter(b => b.subject === selectedSubject);
    }, [allBooks, selectedSubject]);

    const toggleChapterSelect = (index: number) => {
        setSelectedChapters(prev => 
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
        );
    };

    // --- SAVE / LOAD LOGIC ---

    const handleSaveProject = () => {
        if (!generatedContent || !selectedBook) return;

        const newProject: SavedProject = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            bookTitle: selectedBook.title,
            chapterTitle: generatedContent.metadata.title, // Use generated title as ref
            content: generatedContent,
            videoFormat,
            durationMinutes,
            selectedChapters,
            bookId: selectedBook.id,
            bookData: selectedBook
        };

        const updatedProjects = [newProject, ...savedProjects];
        setSavedProjects(updatedProjects);
        localStorage.setItem(LS_SAVED_PROJECTS_KEY, JSON.stringify(updatedProjects));
        alert("Project saved to local storage!");
    };

    const handleDeleteProject = (id: string) => {
        if (!confirm("Are you sure you want to delete this saved project?")) return;
        const updatedProjects = savedProjects.filter(p => p.id !== id);
        setSavedProjects(updatedProjects);
        localStorage.setItem(LS_SAVED_PROJECTS_KEY, JSON.stringify(updatedProjects));
    };

    const handleLoadProject = (project: SavedProject) => {
        // Restore State
        setSelectedBook(project.bookData);
        setSelectedChapters(project.selectedChapters);
        setVideoFormat(project.videoFormat);
        setDurationMinutes(project.durationMinutes);
        setGeneratedContent(project.content);
        setAudioUrl(null); // Reset audio
        
        // Restore View
        setShowSavedProjects(false);
        setStep(3); // Go directly to result view
    };

    // --- GENERATION LOGIC ---

    const handleGenerate = async () => {
        if (!selectedBook || selectedChapters.length === 0) return;
        
        setIsGenerating(true);
        setAudioUrl(null);
        
        // Combine content from selected chapters
        const sortedIndices = [...selectedChapters].sort((a, b) => a - b);
        
        let combinedTitle = selectedBook.chapters[sortedIndices[0]].title;
        if (sortedIndices.length > 1) {
            combinedTitle += ` + ${sortedIndices.length - 1} more`;
        }

        let combinedContent = "";
        sortedIndices.forEach(idx => {
            combinedContent += `\n\n--- CHAPTER: ${selectedBook.chapters[idx].title} ---\n${selectedBook.chapters[idx].content}`;
        });
        
        try {
            const content = await generateSocialContent(
                selectedBook.title,
                combinedTitle, 
                combinedContent,
                videoFormat,
                durationMinutes // Pass selected duration
            );
            setGeneratedContent(content);
            setStep(3);
            
            // Mark as created
            const videoId = `${selectedBook.id}_chs_${sortedIndices.join('-')}_${videoFormat}`;
            if (!createdVideoIds.includes(videoId)) {
                const newIds = [...createdVideoIds, videoId];
                setCreatedVideoIds(newIds);
                localStorage.setItem(LS_CREATED_VIDEOS_KEY, JSON.stringify(newIds));
            }
        } catch (e) {
            console.error(e);
            alert("Generation failed. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateThumbnail = async (index: number, prompt: string) => {
        setGeneratingThumbnails(prev => ({ ...prev, [index]: true }));
        try {
            // Using 16:9 for YouTube Video
            const imgBase64 = await generateImage(prompt, '16:9', imageModel);
            setThumbnailImages(prev => ({ ...prev, [index]: imgBase64 }));
        } catch (e) {
            console.error(e);
            alert("Thumbnail generation failed.");
        } finally {
            setGeneratingThumbnails(prev => ({ ...prev, [index]: false }));
        }
    };

    const handleGenerateAudio = async () => {
        if (!generatedContent?.voiceover) return;
        
        setIsGeneratingAudio(true);
        setAudioUrl(null);

        const stylePrompt = "Read aloud in a warm and friendly tone: The voice should sound like a calm and confident young educator in their early to mid twenties, someone who explains ideas clearly and patiently with the goal of helping the listener truly understand. The tone is warm, steady, and reassuring, not too rushed, slightly excited, and never robotic. It should feel like a good teacher or tutor speaking directly to one learner, guiding them step by step. The pitch is medium and natural, not high or playful and not deep, with smooth delivery and very clear pronunciation. The pacing is fast, with slight pauses around important ideas so the listener has little time to think. Emphasis is gentle and intentional, placed only on key words, not entire sentences. The voice carries quiet confidence and intelligence, avoiding slang, hype, or dramatic expressions. Overall, it should feel focused, trustworthy, and easy to follow, like learning with someone who understands the topic deeply and genuinely wants the listener to understand it too.";

        try {
            const wavBlob = await generateSpeech(generatedContent.voiceover, selectedVoice, stylePrompt);
            const url = URL.createObjectURL(wavBlob);
            setAudioUrl(url);
        } catch (e: any) {
            console.error("Audio generation failed", e);
            alert("Failed to generate audio: " + e.message);
        } finally {
            setIsGeneratingAudio(false);
        }
    };

    const downloadThumbnail = (index: number) => {
        const base64 = thumbnailImages[index];
        if (!base64) return;
        
        const link = document.createElement('a');
        link.href = `data:image/png;base64,${base64}`;
        link.download = `thumbnail_youtube_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Copied!");
    };

    if (loadingData) return <div className="flex h-screen items-center justify-center bg-gray-900"><LoadingSpinner /></div>;

    // --- SAVED PROJECTS VIEW ---
    if (showSavedProjects) {
        return (
            <div className="min-h-screen bg-gray-900 text-gray-100 p-4 pb-20 font-sans">
                <div className="flex items-center justify-between mb-8 bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-lg sticky top-0 z-50">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setShowSavedProjects(false)} className="p-2 hover:bg-gray-700 rounded-full transition-colors">
                            <ArrowLeft size={20} className="text-gray-400" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-white flex items-center gap-2">
                                <Folder className="text-orange-500" /> Saved Projects
                            </h1>
                            <p className="text-xs text-gray-400">Local Storage</p>
                        </div>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
                    {savedProjects.length === 0 ? (
                        <div className="text-center py-20 text-gray-500">
                            <Folder size={64} className="mx-auto mb-4 opacity-50"/>
                            <p className="text-lg">No saved projects found.</p>
                            <p className="text-sm">Generate a script and click 'Save' to see it here.</p>
                        </div>
                    ) : (
                        savedProjects.map(proj => (
                            <div key={proj.id} className="bg-gray-800 p-5 rounded-xl border border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-gray-500 transition-colors">
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg text-white mb-1">{proj.bookTitle}</h3>
                                    <p className="text-sm text-gray-300 mb-2 truncate font-medium">{proj.chapterTitle}</p>
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(proj.timestamp).toLocaleDateString()}</span>
                                        <span className="flex items-center gap-1"><Clock size={12}/> {new Date(proj.timestamp).toLocaleTimeString()}</span>
                                        <span className={`px-2 py-0.5 rounded uppercase font-bold text-[10px] ${proj.videoFormat === 'video' ? 'bg-blue-900/30 text-blue-400' : 'bg-pink-900/30 text-pink-400'}`}>
                                            {proj.videoFormat}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={() => handleLoadProject(proj)}
                                        className="flex-1 sm:flex-none bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Layers size={16}/> Load
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteProject(proj.id)}
                                        className="p-2 bg-gray-700 hover:bg-red-900/50 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={18}/>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-4 pb-20 font-sans">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-lg sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <button onClick={() => step > 1 ? setStep(s => s-1 as any) : navigate('/profile')} className="p-2 hover:bg-gray-700 rounded-full transition-colors">
                        <ArrowLeft size={20} className="text-gray-400" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-white flex items-center gap-2">
                            <Video className="text-red-500" /> Social Factory
                        </h1>
                        <p className="text-xs text-gray-400">Educational Content Generator</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    {/* Saved Projects Button */}
                    <button 
                        onClick={() => setShowSavedProjects(true)}
                        className="bg-gray-700 hover:bg-gray-600 p-2.5 rounded-lg text-gray-300 hover:text-white transition-colors flex items-center gap-2"
                        title="Open Saved Projects"
                    >
                        <Folder size={18} />
                        <span className="hidden sm:inline text-sm font-bold">Saved ({savedProjects.length})</span>
                    </button>

                    {step === 3 && (
                        <button onClick={() => { setStep(1); setGeneratedContent(null); setSelectedBook(null); setSelectedSubject(''); setSelectedChapters([]); }} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                            New Project
                        </button>
                    )}
                </div>
            </div>

            {/* STEP 1: SELECTION */}
            {step === 1 && (
                <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
                    {/* Subject Selector */}
                    {!selectedSubject ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {subjects.map(sub => (
                                <button 
                                    key={sub} 
                                    onClick={() => setSelectedSubject(sub)}
                                    className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-orange-500 hover:bg-gray-750 transition-all text-left group"
                                >
                                    <h3 className="font-bold text-white group-hover:text-orange-400">{sub}</h3>
                                    <p className="text-xs text-gray-500 mt-1">{allBooks.filter(b => b.subject === sub).length} Books</p>
                                </button>
                            ))}
                        </div>
                    ) : !selectedBook ? (
                        <div>
                            <button onClick={() => setSelectedSubject('')} className="mb-4 text-xs font-bold text-gray-400 hover:text-white uppercase tracking-wider flex items-center gap-1">
                                <ArrowLeft size={12}/> Change Subject
                            </button>
                            <h2 className="text-2xl font-bold text-white mb-4">Select a Book</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {filteredBooks.map(book => (
                                    <div 
                                        key={book.id} 
                                        onClick={() => setSelectedBook(book)}
                                        className="bg-gray-800 p-4 rounded-xl border border-gray-700 hover:border-blue-500 cursor-pointer flex gap-4 transition-all"
                                    >
                                        <img src={book.coverImageUrl} className="w-16 h-20 object-cover rounded bg-gray-900" />
                                        <div>
                                            <h4 className="font-bold text-white">{book.title}</h4>
                                            <p className="text-xs text-gray-400 mt-1">{book.chapters.length} Chapters</p>
                                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded mt-2 inline-block bg-green-900/30 text-green-500">Summary</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <button onClick={() => { setSelectedBook(null); setSelectedChapters([]); }} className="text-xs font-bold text-gray-400 hover:text-white uppercase tracking-wider flex items-center gap-1">
                                    <ArrowLeft size={12}/> Back to Books
                                </button>
                                <span className="text-gray-600">/</span>
                                <span className="text-xs text-orange-500 font-bold truncate max-w-[200px]">{selectedBook.title}</span>
                            </div>
                            
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-white">Select Chapters</h2>
                                <button 
                                    onClick={() => {
                                        if (selectedChapters.length === 0) return;
                                        setStep(2);
                                    }}
                                    disabled={selectedChapters.length === 0}
                                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Proceed ({selectedChapters.length})
                                </button>
                            </div>

                            <div className="space-y-2">
                                {selectedBook.chapters.map((ch, idx) => {
                                    const isSelected = selectedChapters.includes(idx);
                                    return (
                                        <div 
                                            key={idx} 
                                            onClick={() => toggleChapterSelect(idx)}
                                            className={`p-4 rounded-lg border cursor-pointer flex justify-between items-center transition-all ${isSelected ? 'bg-orange-900/20 border-orange-500' : 'bg-gray-800 border-gray-700 hover:bg-gray-750'}`}
                                        >
                                            <span className={`font-medium ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                                                {ch.chapter}. {ch.title}
                                            </span>
                                            {isSelected ? <Check size={20} className="text-orange-500" /> : <div className="w-5 h-5 rounded-full border border-gray-600"></div>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* STEP 2: CONFIGURATION */}
            {step === 2 && selectedBook && (
                <div className="max-w-md mx-auto animate-fade-in text-center pt-10">
                    <h2 className="text-3xl font-black text-white mb-2">Configure Video</h2>
                    <p className="text-gray-400 mb-8">
                        {selectedChapters.length} Chapter{selectedChapters.length > 1 ? 's' : ''} Selected
                    </p>

                    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 mb-8 text-left space-y-6">
                        
                        {/* Format Selector */}
                        <div>
                            <label className="text-sm font-bold text-gray-400 block mb-3 uppercase tracking-wide">Video Format</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => setVideoFormat('video')}
                                    className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${videoFormat === 'video' ? 'bg-gray-700 border-orange-500 text-white shadow-lg' : 'bg-gray-900 border-gray-700 text-gray-500 hover:border-gray-600'}`}
                                >
                                    <MonitorPlay size={24} className="mb-2"/>
                                    <span className="font-bold text-sm">YouTube Video</span>
                                    <span className="text-[10px] opacity-70">Long Form</span>
                                </button>
                                <button 
                                    onClick={() => setVideoFormat('short')}
                                    className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${videoFormat === 'short' ? 'bg-gray-700 border-pink-500 text-white shadow-lg' : 'bg-gray-900 border-gray-700 text-gray-500 hover:border-gray-600'}`}
                                >
                                    <Smartphone size={24} className="mb-2"/>
                                    <span className="font-bold text-sm">YouTube Short</span>
                                    <span className="text-[10px] opacity-70">60 Seconds</span>
                                </button>
                            </div>
                        </div>

                        {/* Duration Slider (Only for Long Video) */}
                        {videoFormat === 'video' && (
                            <div className="animate-fade-in">
                                <label className="text-sm font-bold text-gray-400 block mb-2 uppercase tracking-wide flex justify-between">
                                    <span>Target Duration</span>
                                    <span className="text-orange-500">{durationMinutes} Minutes</span>
                                </label>
                                <input 
                                    type="range" 
                                    min="2" 
                                    max="10" 
                                    step="1" 
                                    value={durationMinutes} 
                                    onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                />
                                <p className="text-xs text-gray-500 mt-2">Content density will adjust to fill approximately {durationMinutes} minutes.</p>
                            </div>
                        )}

                        {/* Thumbnail Config (Only for Long Video) */}
                        {videoFormat === 'video' && (
                            <div className="animate-fade-in">
                                <label className="text-sm font-bold text-gray-400 block mb-2 uppercase tracking-wide">Thumbnail Engine</label>
                                <select 
                                    value={imageModel} 
                                    onChange={(e) => setImageModel(e.target.value as any)} 
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-orange-500 outline-none"
                                >
                                    <option value="gemini-2.5-flash-image">Gemini 2.5 Flash (Fast)</option>
                                    <option value="imagen-4.0-generate-001">Imagen 4 (High Quality)</option>
                                </select>
                            </div>
                        )}

                        <div className="pt-2 border-t border-gray-700">
                            <h4 className="text-white font-bold mb-2 text-sm">Plan:</h4>
                            <ul className="text-sm text-gray-300 list-disc list-inside space-y-1">
                                <li>Role: <strong>Strict Nigerian Teacher</strong></li>
                                <li>Target: <strong>WAEC/JAMB Students</strong></li>
                                <li>Visuals: <strong>Navy Blue BG + {videoFormat === 'video' ? 'Diagrams' : 'Definitions'}</strong></li>
                                <li>Goal: <strong>{videoFormat === 'video' ? 'Comprehensive Lesson' : 'Quick Definition'}</strong></li>
                            </ul>
                        </div>
                    </div>

                    <button 
                        onClick={handleGenerate} 
                        disabled={isGenerating}
                        className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold py-4 rounded-xl shadow-xl transition-all flex items-center justify-center disabled:opacity-50"
                    >
                        {isGenerating ? <Loader2 className="animate-spin mr-2" /> : <Wand2 className="mr-2" />}
                        {isGenerating ? 'Generating Script...' : 'Generate Script & Assets'}
                    </button>
                    
                    <button onClick={() => setStep(1)} className="mt-4 text-gray-500 hover:text-white text-sm">Back to Selection</button>
                </div>
            )}

            {/* STEP 3: RESULT DASHBOARD */}
            {step === 3 && generatedContent && (
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
                    
                    {/* LEFT COL: VISUAL GUIDE & VOICEOVER */}
                    <div className="space-y-6">
                        
                        {/* SAVE BUTTON */}
                        <div className="flex justify-end">
                            <button 
                                onClick={handleSaveProject} 
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg shadow-lg flex items-center transition-transform hover:scale-105"
                            >
                                <Save className="mr-2" size={20} /> Save Project
                            </button>
                        </div>

                        {/* Visual Blueprint */}
                        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                            <div className="bg-gray-900 p-3 border-b border-gray-700 flex justify-between items-center">
                                <h3 className="font-bold text-white flex items-center"><Layers className="mr-2 text-blue-400" size={18}/> Visual Blueprint ({videoFormat === 'short' ? 'Vertical' : 'Horizontal'})</h3>
                                <button onClick={() => copyToClipboard(JSON.stringify(generatedContent.script, null, 2))} className="text-xs bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-white border border-gray-600">Copy JSON</button>
                            </div>
                            <div className="p-0 max-h-96 overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase sticky top-0">
                                        <tr>
                                            <th className="p-3 w-1/2">Visual (On Screen)</th>
                                            <th className="p-3 w-1/2">Audio (Voiceover)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700">
                                        {generatedContent.script.map((scene: any, i: number) => (
                                            <tr key={i} className="hover:bg-gray-750">
                                                <td className="p-3 text-gray-300 align-top">{scene.visual}</td>
                                                <td className="p-3 text-orange-200 align-top font-medium">{scene.audio}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Voiceover Card */}
                        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                            <div className="bg-gray-900 p-3 border-b border-gray-700 flex justify-between items-center">
                                <h3 className="font-bold text-white flex items-center"><Sparkles className="mr-2 text-purple-400" size={18}/> Full Voiceover</h3>
                                <button onClick={() => copyToClipboard(generatedContent.voiceover)} className="text-xs bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-white border border-gray-600 flex items-center"><Copy size={12} className="mr-1"/> Copy Text</button>
                            </div>
                            
                            {/* --- VOICE GENERATION SECTION --- */}
                            <div className="p-4 border-b border-gray-700">
                                <div className="flex items-center gap-3">
                                    <select 
                                        value={selectedVoice}
                                        onChange={(e) => setSelectedVoice(e.target.value)}
                                        className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg p-2.5 outline-none focus:border-orange-500"
                                    >
                                        {VOICES.map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                    
                                    <button 
                                        onClick={handleGenerateAudio} 
                                        disabled={isGeneratingAudio}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isGeneratingAudio ? <Loader2 size={16} className="animate-spin" /> : <Mic size={16} />}
                                        Generate Audio
                                    </button>
                                </div>

                                {audioUrl && (
                                    <div className="mt-4">
                                        <AudioPlayer src={audioUrl} fileName={`social_voiceover_${Date.now()}.wav`} autoPlay />
                                    </div>
                                )}
                            </div>

                            <div className="p-4">
                                <textarea 
                                    readOnly 
                                    value={generatedContent.voiceover} 
                                    className="w-full h-40 bg-black/20 rounded-lg p-3 text-sm text-gray-200 border border-gray-600 outline-none resize-none font-medium leading-relaxed"
                                />
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COL: METADATA & THUMBNAILS */}
                    <div className="space-y-6">
                        {/* Metadata Card */}
                        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                            <div className="bg-gray-900 p-3 border-b border-gray-700">
                                <h3 className="font-bold text-white flex items-center"><BookOpen className="mr-2 text-green-400" size={18}/> YouTube Metadata</h3>
                            </div>
                            <div className="p-4 space-y-4">
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase block">Video Title</label>
                                        <button onClick={() => copyToClipboard(generatedContent.metadata.title)} className="text-[10px] text-blue-400 hover:text-white">Copy</button>
                                    </div>
                                    <div className="bg-gray-900 p-2 rounded text-sm text-white font-bold">{generatedContent.metadata.title}</div>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase block">Description & Hashtags</label>
                                        <button onClick={() => copyToClipboard(generatedContent.metadata.description)} className="text-[10px] text-blue-400 hover:text-white">Copy</button>
                                    </div>
                                    <div className="bg-gray-900 p-2 rounded text-xs text-gray-300 h-32 overflow-y-auto whitespace-pre-wrap">{generatedContent.metadata.description}</div>
                                </div>
                            </div>
                        </div>

                        {/* Thumbnails Card (Conditional) */}
                        {videoFormat === 'video' && generatedContent.thumbnails && (
                            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden animate-fade-in">
                                <div className="bg-gray-900 p-3 border-b border-gray-700 flex justify-between items-center">
                                    <h3 className="font-bold text-white flex items-center"><ImageIcon className="mr-2 text-pink-400" size={18}/> Thumbnails (16:9)</h3>
                                    <span className="text-[10px] bg-gray-800 px-2 py-1 rounded text-gray-400 border border-gray-600">{imageModel}</span>
                                </div>
                                <div className="p-4 grid grid-cols-1 gap-4">
                                    {generatedContent.thumbnails.map((thumb: any, i: number) => (
                                        <div key={i} className="bg-gray-900 p-3 rounded-lg border border-gray-700">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <span className="text-xs font-bold text-gray-500 uppercase">Option {i+1}</span>
                                                    <p className="text-xs text-white font-bold mt-1">Text: <span className="text-orange-400">"{thumb.textOverlay}"</span></p>
                                                </div>
                                                <button 
                                                    onClick={() => handleGenerateThumbnail(i, thumb.prompt)} 
                                                    disabled={generatingThumbnails[i]}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors disabled:opacity-50"
                                                    title="Generate Image"
                                                >
                                                    {generatingThumbnails[i] ? <Loader2 size={16} className="animate-spin"/> : <RefreshCw size={16}/>}
                                                </button>
                                            </div>
                                            
                                            <div className="w-full bg-black rounded-lg overflow-hidden flex items-center justify-center relative aspect-video">
                                                {thumbnailImages[i] ? (
                                                    <>
                                                        <img src={`data:image/png;base64,${thumbnailImages[i]}`} className="w-full h-full object-cover" />
                                                        <button 
                                                            onClick={() => downloadThumbnail(i)}
                                                            className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-sm transition-colors"
                                                        >
                                                            <Download size={16} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="text-center p-4">
                                                        <ImageIcon className="mx-auto text-gray-700 mb-2" size={32} />
                                                        <p className="text-xs text-gray-500">Not generated yet</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {videoFormat === 'short' && (
                            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 text-center">
                                <Smartphone className="mx-auto text-pink-500 mb-2" size={32}/>
                                <p className="text-gray-400 text-sm">Thumbnails are not required for YouTube Shorts.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SocialPage;
