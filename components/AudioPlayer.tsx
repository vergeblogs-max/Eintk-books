
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Volume2, VolumeX } from 'lucide-react';

interface AudioPlayerProps {
    src: string;
    fileName?: string;
    autoPlay?: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, fileName = "audio.wav", autoPlay = false }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
        if (autoPlay && audioRef.current) {
            audioRef.current.play().catch(e => console.error("Autoplay failed", e));
        }
    }, [src, autoPlay]);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            audio.play();
        }
        setIsPlaying(!isPlaying);
    };

    const toggleMute = () => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    const handleTimeUpdate = () => {
        const audio = audioRef.current;
        if (audio) {
            setCurrentTime(audio.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        const audio = audioRef.current;
        if (audio) {
            setDuration(audio.duration);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const audio = audioRef.current;
        if (audio) {
            const newTime = parseFloat(e.target.value);
            audio.currentTime = newTime;
            setCurrentTime(newTime);
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        if (audioRef.current) audioRef.current.currentTime = 0;
    };

    const formatTime = (time: number) => {
        if (isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = src;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 shadow-lg w-full max-w-md mx-auto">
            <audio
                ref={audioRef}
                src={src}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
            />

            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={togglePlay}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-orange-600 hover:bg-orange-700 text-white transition-colors shadow-md"
                    >
                        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                    </button>
                    <div>
                        <h4 className="text-sm font-bold text-white">Audio Preview</h4>
                        <p className="text-[10px] text-gray-400">AI Generated Voiceover</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={toggleMute} className="text-gray-400 hover:text-white p-2">
                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                    <button 
                        onClick={handleDownload}
                        className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                        title="Download Audio"
                    >
                        <Download size={18} />
                    </button>
                </div>
            </div>

            {/* Progress Bar Area */}
            <div className="space-y-1">
                <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    style={{
                        background: `linear-gradient(to right, #ea580c ${progressPercent}%, #374151 ${progressPercent}%)`
                    }}
                />
                <div className="flex justify-between text-[10px] text-gray-400 font-mono font-medium">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>
        </div>
    );
};

export default AudioPlayer;
