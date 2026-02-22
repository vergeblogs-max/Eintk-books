
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from 'firebase/auth';
import type { UserData } from '../types';
import { Search, Book, Volume2, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

interface DictionaryPageProps {
    user: User | null;
    userData: UserData | null;
}

// Types for the API response
interface Phonetic {
    text?: string;
    audio?: string;
}

interface Definition {
    definition: string;
    example?: string;
    synonyms: string[];
    antonyms: string[];
}

interface Meaning {
    partOfSpeech: string;
    definitions: Definition[];
    synonyms: string[];
    antonyms: string[];
}

interface DictionaryEntry {
    word: string;
    phonetic?: string;
    phonetics: Phonetic[];
    meanings: Meaning[];
    origin?: string;
}

const DictionaryPage: React.FC<DictionaryPageProps> = ({ user }) => {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [result, setResult] = useState<DictionaryEntry | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!search.trim()) return;

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${search.trim()}`);
            
            if (!response.ok) {
                throw new Error("Word not found.");
            }

            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
                setResult(data[0]);
            } else {
                setError("No definition found.");
            }
        } catch (err: any) {
            setError("Could not find that word. Please check spelling.");
        } finally {
            setLoading(false);
        }
    };

    const playAudio = () => {
        if (!result) return;
        
        // Find the first available audio source
        const audioSrc = result.phonetics.find(p => p.audio && p.audio.length > 0)?.audio;

        if (audioSrc) {
            const finalSrc = audioSrc.startsWith('//') ? `https:${audioSrc}` : audioSrc;
            if (audioRef.current) {
                audioRef.current.src = finalSrc;
                audioRef.current.play().catch(e => console.error("Audio play failed", e));
            }
        } else {
            alert("No pronunciation audio available for this word.");
        }
    };

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-screen text-center p-4">
                <Book size={64} className="text-gray-600 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Dictionary Access</h2>
                <p className="text-gray-400 mb-6">Please log in to use the dictionary.</p>
                <button onClick={() => navigate('/auth')} className="bg-orange-600 text-white px-6 py-2 rounded-lg font-bold">Login</button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto pb-20">
            <audio ref={audioRef} className="hidden" />
            
            <div className="bg-gray-900 sticky top-0 z-10 p-4 border-b border-gray-800">
                <div className="flex items-center mb-4">
                    {/* Back Button Removed per request */}
                    <h1 className="text-2xl font-bold text-white flex items-center">
                        <Book className="mr-2" /> Dictionary
                    </h1>
                </div>

                <form onSubmit={handleSearch} className="relative">
                    <input 
                        type="text" 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search for a word..." 
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-10 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-gray-500"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    {search && (
                        <button 
                            type="submit" 
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-orange-600 p-1.5 rounded-lg text-white hover:bg-orange-700"
                        >
                            <ArrowLeft size={16} className="rotate-180" />
                        </button>
                    )}
                </form>
            </div>

            <div className="p-4">
                {loading && (
                    <div className="flex justify-center py-12">
                        <Loader2 className="animate-spin text-orange-500" size={48} />
                    </div>
                )}

                {error && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <AlertCircle className="text-red-500 mb-4" size={48} />
                        <p className="text-gray-300 font-medium">{error}</p>
                    </div>
                )}

                {!loading && !result && !error && (
                    <div className="text-center text-gray-500 mt-20 flex flex-col items-center opacity-50">
                        <Book size={64} className="mb-4"/>
                        <p>Type a word to search the online dictionary.</p>
                    </div>
                )}

                {result && (
                    <div className="space-y-6 animate-fade-in-up">
                        {/* Header Section */}
                        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-bl-full pointer-events-none"></div>
                            
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-4xl font-black text-white capitalize mb-2">{result.word}</h2>
                                    <p className="text-orange-400 font-mono text-lg">{result.phonetic}</p>
                                </div>
                                <button 
                                    onClick={playAudio}
                                    className="p-3 bg-orange-600 rounded-full text-white shadow-lg hover:bg-orange-700 transition-transform hover:scale-110 active:scale-95"
                                >
                                    <Volume2 size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Meanings Section */}
                        {result.meanings.map((meaning, index) => (
                            <div key={index} className="bg-gray-800 p-5 rounded-xl border border-gray-700">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-xs font-bold bg-gray-700 text-gray-300 px-3 py-1 rounded uppercase tracking-wider">
                                        {meaning.partOfSpeech}
                                    </span>
                                    <div className="h-px bg-gray-700 flex-grow"></div>
                                </div>

                                <ul className="space-y-4">
                                    {meaning.definitions.slice(0, 3).map((def, i) => (
                                        <li key={i} className="text-gray-300 leading-relaxed">
                                            <span className="text-orange-500 mr-2">•</span>
                                            {def.definition}
                                            {def.example && (
                                                <p className="text-gray-500 text-sm mt-1 italic ml-4">
                                                    "{def.example}"
                                                </p>
                                            )}
                                        </li>
                                    ))}
                                </ul>

                                {(meaning.synonyms.length > 0) && (
                                    <div className="mt-4 pt-4 border-t border-gray-700">
                                        <p className="text-sm text-gray-400 mb-2">Synonyms:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {meaning.synonyms.slice(0, 5).map(syn => (
                                                <button 
                                                    key={syn}
                                                    onClick={() => { setSearch(syn); handleSearch(); }}
                                                    className="text-xs bg-gray-900 text-gray-300 px-2 py-1 rounded hover:text-white hover:bg-gray-700 transition-colors"
                                                >
                                                    {syn}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        
                        {result.origin && (
                            <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                                <h4 className="text-sm font-bold text-gray-400 mb-1">Origin</h4>
                                <p className="text-sm text-gray-300 italic">{result.origin}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DictionaryPage;
