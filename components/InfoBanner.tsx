import React, { useState, useEffect } from 'react';
import { X, Zap } from 'lucide-react';

interface InfoBannerProps {
    title: string;
    children: React.ReactNode;
    storageKey?: string; // If provided, enables dismiss-and-hide logic
}

const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

const InfoBanner: React.FC<InfoBannerProps> = ({ title, children, storageKey }) => {
    const [isVisible, setIsVisible] = useState(!storageKey); // Show by default if no storageKey

    useEffect(() => {
        if (storageKey) {
            try {
                const dismissedAt = localStorage.getItem(storageKey);
                if (!dismissedAt || Date.now() - parseInt(dismissedAt) > WEEK_IN_MS) {
                    setIsVisible(true);
                } else {
                    setIsVisible(false);
                }
            } catch (error) {
                console.error("Could not access localStorage for InfoBanner:", error);
                setIsVisible(true); // Default to showing if storage is inaccessible
            }
        }
    }, [storageKey]);

    const handleDismiss = () => {
        if (storageKey) {
            try {
                localStorage.setItem(storageKey, Date.now().toString());
            } catch (error) {
                console.error("Could not write to localStorage for InfoBanner:", error);
            }
        }
        setIsVisible(false);
    };

    if (!isVisible) {
        return null;
    }

    return (
        <div className="bg-gray-800 border-l-4 border-orange-500 rounded-r-lg p-4 mb-8 relative shadow-lg text-left">
            <div className="flex items-start space-x-3">
                <Zap className="text-orange-400 h-6 w-6 mt-1 flex-shrink-0" />
                <div>
                    <h2 className="text-lg font-bold text-orange-400">{title}</h2>
                    <div className="text-gray-300 mt-1">{children}</div>
                </div>
            </div>
            {storageKey && (
                 <button onClick={handleDismiss} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-white">
                    <X size={20} />
                </button>
            )}
        </div>
    );
};

export default InfoBanner;
