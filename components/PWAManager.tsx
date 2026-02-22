
import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share, Layers } from 'lucide-react';
import { User } from 'firebase/auth';

// Interface for the BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    deferredInstallPrompt: BeforeInstallPromptEvent | null;
  }
}

interface PWAManagerProps {
    user: User | null;
}

const PWAManager: React.FC<PWAManagerProps> = ({ user }) => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // If user is logged in, don't show the PWA prompt immediately (Syllabus tour takes precedence)
    if (user) return;

    // 1. Check if app is already installed (Standalone mode)
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                               (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
      return isStandaloneMode;
    };

    if (checkStandalone()) return; // Stop if already installed

    // 2. Detect iOS
    const checkIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };
    const _isIOS = checkIOS();
    setIsIOS(_isIOS);

    // 3. Handle Install Prompt (Android/Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault(); // Prevent mini-infobar
      setInstallPrompt(e as BeforeInstallPromptEvent);
      
      const hasSeenPrompt = sessionStorage.getItem('installPromptSeen');
      if (!hasSeenPrompt) {
          setShowInstallModal(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if event fired before React mounted
    if (window.deferredInstallPrompt) {
        setInstallPrompt(window.deferredInstallPrompt);
        const hasSeenPrompt = sessionStorage.getItem('installPromptSeen');
        if (!hasSeenPrompt) {
            setShowInstallModal(true);
        }
    }

    // 3b. Handle iOS Install Prompt logic
    if (_isIOS && !checkStandalone()) {
         const hasSeenPrompt = sessionStorage.getItem('installPromptSeen');
         if (!hasSeenPrompt) {
             setShowInstallModal(true);
         }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [user]); // Re-run effect if user status changes, but logic essentially exits if user is present

  const handleInstallClick = async () => {
    if (!installPrompt) return;

    // Show native prompt
    await installPrompt.prompt();
    
    // Wait for user choice
    const choiceResult = await installPrompt.userChoice;
    
    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setShowInstallModal(false);
    } else {
      console.log('User dismissed the install prompt');
    }
    setInstallPrompt(null);
    window.deferredInstallPrompt = null;
  };

  const dismissModal = () => {
      setShowInstallModal(false);
      sessionStorage.setItem('installPromptSeen', 'true');
  }

  // Render nothing if app is already installed or user is logged in
  if (isStandalone || user) return null;

  if (!showInstallModal) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={dismissModal}></div>

        {/* Modal Content */}
        <div className="relative bg-gray-900 border border-orange-500/30 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in-up">
            {/* Decorative Background */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-orange-900/20 to-transparent pointer-events-none"></div>
            
            <button 
                onClick={dismissModal} 
                className="absolute top-3 right-3 p-2 bg-gray-800/50 rounded-full text-gray-400 hover:text-white transition-colors z-10"
            >
                <X size={20} />
            </button>

            <div className="p-6 flex flex-col items-center text-center relative z-0">
                <div className="w-20 h-20 bg-gray-800 rounded-2xl flex items-center justify-center mb-4 shadow-lg border border-gray-700">
                    <img src="https://i.ibb.co/v6Mf9F37/android-chrome-192x192.png" alt="App Icon" className="w-12 h-12 rounded-lg" />
                </div>

                <h3 className="text-2xl font-bold text-white mb-2">Install App</h3>
                <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                    For the best experience, install <strong>EINTK</strong> on your device. It's fast, works offline, and feels like a native app.
                </p>

                {isIOS ? (
                    <div className="w-full bg-gray-800 rounded-xl p-4 text-left border border-gray-700">
                        <div className="flex items-center space-x-3 mb-3 text-gray-300 text-sm">
                            <span className="bg-gray-700 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold">1</span>
                            <span>Tap the <Share size={14} className="inline mx-1 text-blue-400" /> <strong>Share</strong> button below.</span>
                        </div>
                        <div className="flex items-center space-x-3 text-gray-300 text-sm">
                            <span className="bg-gray-700 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold">2</span>
                            <span>Select <Layers size={14} className="inline mx-1 text-white" /> <strong>Add to Home Screen</strong>.</span>
                        </div>
                    </div>
                ) : (
                    <button 
                        onClick={handleInstallClick}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-lg hover:shadow-orange-900/20 hover:scale-[1.02]"
                    >
                        <Download size={20} />
                        <span>Install Now</span>
                    </button>
                )}
                
                <button onClick={dismissModal} className="mt-4 text-sm text-gray-500 hover:text-white transition-colors underline decoration-gray-600 underline-offset-4">
                    Continue in Browser
                </button>
            </div>
        </div>
    </div>
  );
};

export default PWAManager;
