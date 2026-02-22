
import React from 'react';

interface GenerationProgressProps {
    progress: number;
    progressText: string;
    compact?: boolean;
}

const GenerationProgress: React.FC<GenerationProgressProps> = ({ progress, progressText, compact = false }) => {
    if (compact) {
        return (
            <div className="w-full" aria-live="polite">
                <div className="relative h-4 w-full bg-gray-700 rounded-full border border-gray-600 overflow-hidden">
                    <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <p className="text-center text-xs text-gray-400 mt-1 truncate">
                    {progressText}
                </p>
            </div>
        );
    }
    
    return (
        <div className="w-full my-4" aria-live="polite">
            <div className="relative h-6 w-full bg-gray-700 rounded-full border border-gray-600 overflow-hidden">
                <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                        {Math.round(progress)}%
                    </span>
                </div>
            </div>
            <p className="text-center text-sm text-gray-400 mt-2">
                {progressText}
            </p>
        </div>
    );
};

export default GenerationProgress;
