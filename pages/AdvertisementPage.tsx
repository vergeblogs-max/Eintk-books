
import React, { useState, useEffect } from 'react';
import { generateAdScript, generateAdStrategies, generateSpeech } from '../services/geminiService';
import { 
    BookOpen, BookOpenText, Settings2, Sparkles, GraduationCap, 
    BookA, Compass, FileQuestion, CalendarClock, Gamepad2, MonitorPlay, 
    BarChart3, Award, Flame, Swords, Users, Puzzle, Trophy, TreePine, Bookmark, 
    FlaskConical, Notebook, Target, Megaphone, Loader2, Lightbulb, ChevronUp, 
    Video, Music2, Youtube, Copy, ArrowLeft, X, Brain, Save, Folder, Trash2, Clock, Mic, Headphones, Zap, Coins, Ticket, UserPlus, ShoppingBag, Check, MonitorPlay as MonitorPlayIcon, Smartphone, CheckCircle2, Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AudioPlayer from '../components/AudioPlayer';

const LS_SAVED_SCRIPTS_KEY = 'eintk_saved_ad_scripts';

interface SavedScript {
    id: string;
    timestamp: number;
    hook: string;
    full_voiceover: string;
    scenes: { visual: string, audio: string }[], 
    tiktok_metadata: { title: string },
    youtube_metadata: { title: string, description: string };
    features: string[];
}

const AdvertisementPage: React.FC = () => {
    const navigate = useNavigate();

    // --- ADVERTISEMENT CONSTANTS ---
    const AD_FEATURES = [
        // Library & Missions
        { id: 'library_page', name: 'Mission Control', description: 'Your daily Study Plan created specifically for your exam. Every book is delivered exactly when you need it, complete with integrated flashcards and mastery modules. No more guessing what to study next.', icon: Target },
        { id: 'syllabus_tracker', name: 'Curriculum Forge', description: 'An automated progress map that tracks your path through the WAEC/JAMB syllabus. Syncs perfectly with your daily missions for 100% coverage.', icon: GraduationCap },
        { id: 'audiobooks', name: 'Audiobooks', description: 'Listen to your books and understand them while on the go with high-fidelity AI narration.', icon: Headphones },
        { id: 'ebook_reader', name: 'Ebook Reader', description: 'A seamless reading experience designed for academic focus.', icon: BookOpenText },
        { id: 'reader_custom', name: 'Reader Customization', description: 'Change fonts, themes, and reading modes to fit your study vibe.', icon: Settings2 },
        { id: 'reader_ai', name: 'AI Study Tools', description: 'AI Summarizer, Explainer, and Note Taker built directly into your reading workflow.', icon: Sparkles },
        { id: 'dictionary', name: 'Dictionary', description: 'Instant definitions, synonyms, and pronunciation for any difficult word.', icon: BookA },
        { id: 'explore', name: 'Curiosity Engine (Explore)', description: 'Access a universe of General Knowledge books. Rate your favorite stories and join the conversation in the comment sections where students drop their "Gists" on every topic.', icon: Compass },

        // Test Prep
        { id: 'test_prep_hub', name: 'Test Prep Hub', description: 'Realistic practice exams designed to build confidence for JAMB and WAEC.', icon: FileQuestion },
        { id: 'exam_dates', name: 'Exam Countdowns', description: 'Live countdowns showing the exact date and days remaining for major Nigerian exams.', icon: CalendarClock },
        { id: 'game_mode', name: 'Game Mode Tests', description: 'Practice test questions with instant feedback to learn as you play.', icon: Gamepad2 },
        { id: 'cbt_mode', name: 'CBT Simulator', description: 'Full exam simulation with a professional interface and scientific calculator.', icon: MonitorPlayIcon },
        { id: 'analytics', name: 'Smart Analytics', description: 'Detailed subject performance breakdowns and personalized grade reports.', icon: BarChart3 },
        { id: 'performance_badges', name: 'Badges', description: 'Gamified rewards for your academic consistency and achievements.', icon: Award },

        // Community & Social
        { id: 'nova_pulse', name: 'Nova Pulse', description: 'An elite AI feed that drops curriculum-specific questions from different subjects every two hours. Stay sharp with real-time knowledge audits.', icon: Activity },
        { id: 'debate_arena', name: 'Debate Arena', description: 'Vote on controversial weekly topics and see what the student community is thinking.', icon: Flame },
        { id: 'battle_arena', name: 'Battle Arena', description: 'Challenge friends to 1v1 academic duels in Classic or Sabotage modes.', icon: Swords },
        { id: 'community_feed', name: 'Community Feed', description: 'Share takes, ask questions, and engage with thousands of other Nigerian students.', icon: Users },
        { id: 'referral_program', name: 'Refer & Earn', description: 'Invite friends and earn Knowledge Sparks instantly when they join the squad.', icon: UserPlus },

        // Economy (Spark Hub & Emporium)
        { id: 'spark_hub', name: 'Spark Hub', description: 'Manage your assets, buy Sparks, and track your treasury history.', icon: Coins },
        { id: 'the_emporium', name: 'The Emporium', description: 'The grand marketplace for Streak Freezes, Day Passes, Megaphones, and unique Knowledge Tree Skins.', icon: ShoppingBag },
        { id: 'energy_forge', name: 'Energy Forge', description: 'Convert Sparks into Energy to power your AI tools and Arena entries.', icon: Zap },
        { id: 'day_pass', name: 'Day Pass', description: 'Unlock 24 hours of full PRO access for a heavy study marathon.', icon: Ticket },
        { id: 'high_stakes', name: 'High Stakes Arena', description: 'Risk Energy to enter and win Sparks by conquering mixed subject quizzes.', icon: Trophy },

        // Profile & Misc
        { id: 'arcade_games', name: 'Arcade Games', description: 'Sudoku, Crosswords, Flag Master, and more educational brain-teasers.', icon: Puzzle },
        { id: 'knowledge_tree', name: 'Knowledge Tree', description: 'A living visual profile that grows as you learn. Customize it with skins to show off on the leaderboard.', icon: TreePine },
        { id: 'leaderboard', name: 'Global Leaderboard', description: 'Compete with students nationwide and flex your custom Knowledge Tree skin.', icon: Trophy },
        { id: 'saved_notes', name: 'Saved Notes', description: 'Your personal vault for all book highlights and study notes.', icon: Bookmark },
        { id: 'formula_vault', name: 'Formula Vault', description: 'Every essential Math and Physics formula, organized and ready.', icon: Brain },
        { id: 'periodic_table', name: 'Periodic Table', description: 'A fully interactive table of elements with detailed data.', icon: FlaskConical },
        { id: 'journal', name: 'Study Journal', description: 'A private space for daily academic reflection.', icon: Notebook },
        { id: 'weekly_goals', name: 'Weekly Goals', description: 'Set and smash targets for books read and tests passed.', icon: Target }
    ];

    const VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];

    // --- STATE ---
    const [selectedAdFeatures, setSelectedAdFeatures] = useState<string[]>([]);
    const [generatedScript, setGeneratedScript] = useState<{ 
        hook: string, 
        scenes: { visual: string, audio: string }[], 
        full_voiceover: string, 
        tiktok_metadata: { title: string },
        youtube_metadata: { title: string, description: string }
    } | null>(null);
    
    const [savedScripts, setSavedScripts] = useState<SavedScript[]>([]);
    const [showSavedView, setShowSavedView] = useState(false);

    const [adStrategies, setAdStrategies] = useState<{title: string, reason: string, feature_ids: string[]}[]>([]);
    const [isLoadingStrategies, setIsLoadingStrategies] = useState(false);
    const [expandedStrategyIndex, setExpandedStrategyIndex] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("");
    const [error, setError] = useState<string | null>(null);

    // Audio Generation State
    const [selectedVoice, setSelectedVoice] = useState('Puck');
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    // --- EFFECTS ---
    useEffect(() => {
        const stored = localStorage.getItem(LS_SAVED_SCRIPTS_KEY);
        if (stored) {
            try {
                setSavedScripts(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse saved scripts", e);
            }
        }
    }, []);

    // --- HANDLERS ---

    const handleToggleAdFeature = (featureId: string) => {
        setSelectedAdFeatures(prev => 
            prev.includes(featureId) 
                ? prev.filter(f => f !== featureId) 
                : [...prev, featureId]
        );
    };

    const handleGenerateAd = async (featuresToUse?: string[]) => {
        const features = featuresToUse || selectedAdFeatures;

        if (features.length < 10) {
            setError("Please select at least 10 features for a comprehensive ad.");
            return;
        }
        if (features.length > 18) {
            setError("Please limit to 18 features for clarity.");
            return;
        }

        setIsLoading(true);
        setLoadingMessage("Scripting advertisement...");
        setError(null);
        setShowSavedView(false); 
        setAudioUrl(null); 
        
        const featureObjects = features.map(id => {
            const feature = AD_FEATURES.find(f => f.id === id);
            return feature ? { name: feature.name, description: feature.description } : { name: id, description: '' };
        });

        try {
            const script = await generateAdScript(featureObjects);
            setGeneratedScript(script);
        } catch (e: any) {
            setError("Script generation failed: " + e.message);
        } finally {
            setIsLoading(false);
            setLoadingMessage("");
        }
    };

    const handleSaveScript = () => {
        if (!generatedScript) return;
        
        const newScript: SavedScript = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            ...generatedScript,
            features: selectedAdFeatures
        };

        const updated = [newScript, ...savedScripts];
        setSavedScripts(updated);
        localStorage.setItem(LS_SAVED_SCRIPTS_KEY, JSON.stringify(updated));
        alert("Script saved successfully!");
    };

    const handleDeleteScript = (id: string) => {
        if (!confirm("Delete this saved script?")) return;
        const updated = savedScripts.filter(s => s.id !== id);
        setSavedScripts(updated);
        localStorage.setItem(LS_SAVED_SCRIPTS_KEY, JSON.stringify(updated));
    };

    const handleLoadScript = (script: SavedScript) => {
        setGeneratedScript({
            hook: script.hook,
            scenes: script.scenes,
            full_voiceover: script.full_voiceover,
            tiktok_metadata: script.tiktok_metadata,
            youtube_metadata: script.youtube_metadata
        });
        setSelectedAdFeatures(script.features);
        setShowSavedView(false);
        setAudioUrl(null);
    };

    const handleGenerateStrategies = async () => {
        setIsLoadingStrategies(true);
        setError(null);
        setShowSavedView(false);
        
        const allFeaturesInfo = AD_FEATURES.map(f => ({ id: f.id, name: f.name, description: f.description }));

        try {
            const response = await generateAdStrategies(allFeaturesInfo);
            setAdStrategies(response.strategies);
        } catch (e: any) {
            setError("Failed to generate strategies: " + e.message);
        } finally {
            setIsLoadingStrategies(false);
        }
    };

    const handleApplyStrategy = (featureIds: string[]) => {
        setSelectedAdFeatures(featureIds);
        handleGenerateAd(featureIds); 
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Copied to clipboard!");
    };

    const copyVisualGuide = (scenes: { visual: string, audio: string }[]) => {
        const text = scenes.map(s => `[VISUAL]: ${s.visual}\n[AUDIO]: ${s.audio}`).join('\n\n');
        copyToClipboard(text);
    };

    const handleGenerateAudio = async () => {
        if (!generatedScript?.full_voiceover) return;
        
        setIsGeneratingAudio(true);
        setAudioUrl(null);
        setError(null);

        const stylePrompt = "Read aloud in a high-energy, persuasive advertiser tone: The voice should sound enthusiastic, high-pitched, and engaging. It should sound like a question type of voice, dynamic and exciting, optimized to sell the idea.";

        try {
            const wavBlob = await generateSpeech(generatedScript.full_voiceover, selectedVoice, stylePrompt);
            const url = URL.createObjectURL(wavBlob);
            setAudioUrl(url);
        } catch (e: any) {
            console.error("Audio generation failed", e);
            setError("Failed to generate audio: " + e.message);
        } finally {
            setIsGeneratingAudio(false);
        }
    };

    if (showSavedView) {
        return (
            <div className="min-h-screen bg-gray-900 text-white p-4 pb-20 font-sans">
                <div className="flex items-center mb-8 bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-lg">
                    <button onClick={() => setShowSavedView(false)} className="p-2 rounded-full hover:bg-gray-700 mr-4">
                        <ArrowLeft size={20} className="text-orange-500" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center text-white">
                            <Folder className="mr-2 text-blue-500" fill="currentColor"/> Saved Scripts
                        </h1>
                        <p className="text-gray-400 text-sm">Your generated marketing campaigns</p>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
                    {savedScripts.length === 0 ? (
                        <div className="text-center py-20 text-gray-500">
                            <Folder size={64} className="mx-auto mb-4 opacity-50"/>
                            <p className="text-lg">No saved scripts found.</p>
                            <p className="text-sm">Generate a script and click 'Save' to see it here.</p>
                        </div>
                    ) : (
                        savedScripts.map(script => (
                            <div key={script.id} className="bg-gray-800 p-5 rounded-xl border border-gray-700 flex flex-col sm:flex-row justify-between gap-4 hover:border-gray-500 transition-colors shadow-lg">
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg text-white mb-2 line-clamp-1">{script.youtube_metadata.title || "Untitled Script"}</h3>
                                    <p className="text-sm text-gray-300 mb-3 font-medium italic border-l-2 border-orange-500 pl-3">"{script.hook}"</p>
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <span className="flex items-center gap-1"><Clock size={12}/> {new Date(script.timestamp).toLocaleDateString()}</span>
                                        <span className="bg-gray-900 px-2 py-0.5 rounded text-gray-400">{script.features.length} Features</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={() => handleLoadScript(script)}
                                        className="flex-1 sm:flex-none bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2"
                                    >
                                        Load
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteScript(script.id)}
                                        className="p-1.5 bg-gray-700 hover:bg-red-900/50 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={16}/>
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
        <div className="min-h-screen bg-gray-900 text-white p-4 pb-20 font-sans">
            <div className="flex items-center justify-between mb-8 bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-lg">
                <div className="flex items-center">
                    <button onClick={() => navigate('/profile')} className="p-2 rounded-full hover:bg-gray-700 mr-4">
                        <ArrowLeft size={20} className="text-orange-500" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center text-white">
                            <Megaphone className="mr-2 text-blue-500" fill="currentColor"/> Ad Generator
                        </h1>
                        <p className="text-gray-400 text-sm">Create marketing campaigns with AI</p>
                    </div>
                </div>
                <button 
                    onClick={() => setShowSavedView(true)}
                    className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm font-bold text-white transition-colors"
                >
                    <Folder size={18}/> 
                    <span className="hidden sm:inline">Saved ({savedScripts.length})</span>
                </button>
            </div>

            {isLoading && !generatedScript && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-[100]">
                    <Loader2 className="animate-spin text-orange-500" size={48} />
                    <p className="mt-4 text-white font-bold">{loadingMessage}</p>
                </div>
            )}
            
            {error && (
                <div className="bg-red-500 text-white p-4 rounded-lg mb-6 flex justify-between items-center">
                    <span>{error}</span>
                    <button onClick={() => setError(null)}><X className="w-5 h-5"/></button>
                </div>
            )}

            <div className="space-y-6">
                
                <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/30 rounded-xl p-6 mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-bold text-white flex items-center"><Brain className="mr-2 text-blue-400"/> AI Campaign Strategist</h4>
                        <button 
                            onClick={handleGenerateStrategies} 
                            disabled={isLoadingStrategies}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center transition-colors shadow-lg"
                        >
                            {isLoadingStrategies ? <Loader2 className="animate-spin mr-2" size={14}/> : <Sparkles className="mr-2" size={14}/>}
                            Generate New Ideas
                        </button>
                    </div>
                    
                    {adStrategies.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {adStrategies.map((strat, idx) => (
                                <div key={idx} className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-col h-full hover:border-blue-500 transition-colors shadow-md">
                                    <h5 className="font-bold text-white mb-2">{strat.title}</h5>
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {strat.feature_ids.map(fid => {
                                            const feat = AD_FEATURES.find(f => f.id === fid);
                                            return feat ? <feat.icon key={fid} size={14} className="text-gray-400" title={feat.name} /> : null;
                                        })}
                                        <span className="text-xs text-gray-500 ml-1">+{strat.feature_ids.length} features</span>
                                    </div>
                                    
                                    <div className="flex-grow">
                                        {expandedStrategyIndex === idx ? (
                                            <p className="text-xs text-gray-300 italic mb-4 animate-fade-in">{strat.reason}</p>
                                        ) : (
                                            <button onClick={() => setExpandedStrategyIndex(idx)} className="text-xs text-blue-400 hover:underline mb-4 flex items-center">
                                                <Lightbulb size={12} className="mr-1"/> Explain Strategy
                                            </button>
                                        )}
                                    </div>

                                    <button 
                                        onClick={() => handleApplyStrategy(strat.feature_ids)}
                                        className="w-full bg-gray-700 hover:bg-green-600 text-white font-bold py-2 rounded text-xs transition-colors flex items-center justify-center mt-auto"
                                    >
                                        Use This Strategy <ChevronUp className="ml-1 rotate-90" size={14}/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400 text-sm">
                            <p>Need inspiration? Ask the AI to suggest 3 unique marketing angles (10-18 features each).</p>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-fit">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-white font-bold">Manual Feature Selection</h4>
                            <span className={`text-xs font-black px-2 py-1 rounded-full ${selectedAdFeatures.length >= 10 && selectedAdFeatures.length <= 18 ? 'bg-green-900/30 text-green-500' : 'bg-red-900/30 text-red-500'}`}>
                                {selectedAdFeatures.length} / 18 (min 10)
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto custom-scrollbar pr-2 mb-6">
                            {AD_FEATURES.map(feature => {
                                const isSelected = selectedAdFeatures.includes(feature.id);
                                return (
                                    <button
                                        key={feature.id}
                                        onClick={() => handleToggleAdFeature(feature.id)}
                                        className={`p-3 rounded-lg border-2 flex flex-col items-center justify-center text-center transition-all ${isSelected ? 'bg-orange-600/20 border-orange-500' : 'bg-gray-900 border-gray-700 hover:border-gray-500'}`}
                                        title={feature.description}
                                    >
                                        <feature.icon size={24} className={`mb-2 ${isSelected ? 'text-orange-400' : 'text-gray-400'}`} />
                                        <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-gray-400'}`}>{feature.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <button 
                            onClick={() => handleGenerateAd()} 
                            disabled={isLoading || selectedAdFeatures.length < 10 || selectedAdFeatures.length > 18}
                            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all shadow-lg disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Video className="mr-2" size={18} />}
                            Generate Ad Script
                        </button>
                    </div>

                    <div className="space-y-4">
                        {generatedScript ? (
                            <>
                                <div className="flex justify-end">
                                    <button 
                                        onClick={handleSaveScript}
                                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2 transition-all hover:scale-105"
                                    >
                                        <Save size={18}/> Save Script
                                    </button>
                                </div>

                                 <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-xl animate-fade-in">
                                    <div className="bg-gray-900 px-4 py-3 border-b border-gray-700 flex justify-between items-center">
                                        <h4 className="font-bold text-white flex items-center"><Music2 size={16} className="mr-2 text-pink-400"/> TikTok Metadata</h4>
                                        <button onClick={() => copyToClipboard(generatedScript.tiktok_metadata.title)} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-white flex items-center"><Copy size={12} className="mr-1"/> Copy</button>
                                    </div>
                                    <div className="p-4">
                                        <p className="text-sm text-gray-300 font-medium">{generatedScript.tiktok_metadata.title}</p>
                                    </div>
                                </div>

                                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-xl animate-fade-in">
                                    <div className="bg-gray-900 px-4 py-3 border-b border-gray-700 flex justify-between items-center">
                                        <h4 className="font-bold text-white flex items-center"><Youtube size={16} className="mr-2 text-red-500"/> YouTube Metadata</h4>
                                        <div className="flex gap-2">
                                            <button onClick={() => copyToClipboard(generatedScript.youtube_metadata.title)} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-white flex items-center"><Copy size={12} className="mr-1"/> Title</button>
                                            <button onClick={() => copyToClipboard(generatedScript.youtube_metadata.description)} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-white flex items-center"><Copy size={12} className="mr-1"/> Desc</button>
                                        </div>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div>
                                            <label className="text-xs text-gray-500 uppercase font-bold block mb-1">Title</label>
                                            <p className="text-sm text-white font-medium">{generatedScript.youtube_metadata.title}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 uppercase font-bold block mb-1">Description</label>
                                            <p className="text-xs text-gray-300 whitespace-pre-wrap">{generatedScript.youtube_metadata.description}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-xl">
                                    <div className="bg-gray-900 px-4 py-3 border-b border-gray-700 flex justify-between items-center">
                                        <h4 className="font-bold text-white flex items-center"><Video size={16} className="mr-2 text-blue-400"/> Visual Production Guide</h4>
                                        <button onClick={() => copyVisualGuide(generatedScript.scenes)} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-white flex items-center"><Copy size={12} className="mr-1"/> Copy Table</button>
                                    </div>
                                    <div className="p-4 max-h-[300px] overflow-y-auto custom-scrollbar text-sm">
                                        <p className="mb-4 text-gray-300 italic font-medium border-l-2 border-orange-500 pl-3">Hook: "{generatedScript.hook}"</p>
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="text-xs text-gray-500 uppercase border-b border-gray-700">
                                                    <th className="pb-2 w-1/2 p-2">Visual (Do This)</th>
                                                    <th className="pb-2 w-1/2 p-2">Audio (Say This)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-700">
                                                {generatedScript.scenes.map((scene, i) => (
                                                    <tr key={i} className="group hover:bg-gray-750">
                                                        <td className="py-3 pr-2 pl-2 text-gray-300 align-top text-xs leading-relaxed">{scene.visual}</td>
                                                        <td className="py-3 pl-2 text-orange-200 align-top text-xs leading-relaxed font-medium">{scene.audio}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-xl">
                                    <div className="bg-gray-900 px-4 py-3 border-b border-gray-700 flex justify-between items-center">
                                        <h4 className="font-bold text-white flex items-center"><Megaphone size={16} className="mr-2 text-green-400"/> Voiceover Script</h4>
                                        <button onClick={() => copyToClipboard(generatedScript.full_voiceover)} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-white flex items-center"><Copy size={12} className="mr-1"/> Copy Text</button>
                                    </div>
                                    
                                    <div className="p-4 border-t border-gray-700 bg-gray-900/50">
                                        <div className="flex flex-col sm:flex-row items-center gap-4">
                                            <div className="flex-1 w-full">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Select Voice</label>
                                                <select 
                                                    value={selectedVoice}
                                                    onChange={(e) => setSelectedVoice(e.target.value)}
                                                    className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl p-3 outline-none focus:border-orange-500 transition-all"
                                                >
                                                    {VOICES.map(v => <option key={v} value={v}>{v}</option>)}
                                                </select>
                                            </div>
                                            
                                            <button 
                                                onClick={handleGenerateAudio} 
                                                disabled={isGeneratingAudio}
                                                className="w-full sm:w-auto sm:mt-5 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg active:scale-95"
                                            >
                                                {isGeneratingAudio ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} />}
                                                Synthesize
                                            </button>
                                        </div>

                                        {audioUrl && (
                                            <div className="mt-6 animate-fade-in-up">
                                                <AudioPlayer src={audioUrl} fileName={`ad_voiceover_${Date.now()}.wav`} autoPlay />
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-4">
                                        <textarea 
                                            readOnly 
                                            value={generatedScript.full_voiceover} 
                                            className="w-full h-32 bg-black/30 rounded-xl p-4 text-sm text-gray-200 border border-gray-700 resize-none outline-none font-medium leading-relaxed custom-scrollbar"
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500 bg-gray-800/30 rounded-xl border-2 border-dashed border-gray-700 p-8 min-h-[300px]">
                                <Video size={48} className="mb-4 opacity-50" />
                                <p>Select 10-18 features and click Generate to create your script.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdvertisementPage;
