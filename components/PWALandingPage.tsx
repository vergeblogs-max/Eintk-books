
import React, { useState, useEffect } from 'react';
import { Download, Share, Layers, WifiOff, Zap, Smartphone, Sparkles, ShieldCheck, ChevronRight, X, Apple, ExternalLink, AlertTriangle } from 'lucide-react';
import Modal from './Modal';

const PWALandingPage: React.FC = () => {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const _isIOS = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(_isIOS);

    // Detect In-App Browsers (common strings in UA for FB, Instagram, WhatsApp, etc)
    const inAppStrings = ['fban', 'fbav', 'instagram', 'whatsapp', 'threads', 'wv'];
    const _isInApp = inAppStrings.some(str => userAgent.includes(str));
    setIsInAppBrowser(_isInApp);

    // Catch the install prompt for Android/Chrome
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    if ((window as any).deferredInstallPrompt) {
      setInstallPrompt((window as any).deferredInstallPrompt);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        // App will reload in standalone mode automatically
      }
    }
  };

  const handleWebBypass = () => {
    localStorage.setItem('eintk_prefer_web', 'true');
    window.location.reload();
  };

  const IOSInstructions = () => (
    <div className="space-y-8 py-4">
        <div className="flex items-start gap-5">
            <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center font-black text-white shrink-0 shadow-lg shadow-orange-900/20">1</div>
            <div>
                <p className="text-base text-gray-100 font-bold mb-1">Open in Safari</p>
                <p className="text-sm text-gray-400 leading-relaxed">
                    Apple only allows installation through the **Safari browser**. Make sure you aren't in the Facebook, Instagram, or TikTok browser.
                </p>
            </div>
        </div>
        <div className="flex items-start gap-5">
            <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center font-black text-white shrink-0 border border-white/10">2</div>
            <div>
                <p className="text-base text-gray-100 font-bold mb-1">Tap Share</p>
                <p className="text-sm text-gray-400 leading-relaxed">
                    Tap the <Share size={18} className="inline-block mx-1 text-blue-400" /> **Share icon** at the bottom of your screen.
                </p>
            </div>
        </div>
        <div className="flex items-start gap-5">
            <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center font-black text-white shrink-0 border border-white/10">3</div>
            <div>
                <p className="text-base text-gray-100 font-bold mb-1">Add to Home Screen</p>
                <p className="text-sm text-gray-400 leading-relaxed">
                    Scroll down the share menu and select **Add to Home Screen** <Layers size={18} className="inline-block mx-1 text-white" />.
                </p>
            </div>
        </div>
        <div className="mt-10 pt-6 border-t border-white/5 flex items-center gap-2 text-gray-600 font-bold text-[9px] justify-center uppercase tracking-widest">
            <ShieldCheck size={12}/> Verified Secure Native Environment
        </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[500] bg-[#0f172a] flex flex-col items-center justify-start p-6 text-center overflow-y-auto font-sans">
      {/* Premium Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[40%] bg-orange-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[40%] bg-blue-600/5 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 max-w-md w-full flex flex-col items-center py-12 md:py-20 animate-fade-in">
        
        {/* Branding & Logo */}
        <div className="mb-12">
            <div className="inline-block p-1 rounded-[2.5rem] bg-gradient-to-br from-orange-500 to-red-600 shadow-2xl shadow-orange-900/20 mb-6">
                <div className="bg-gray-900 rounded-[2.4rem] p-6">
                    <img 
                        src="https://i.ibb.co/v6Mf9F37/android-chrome-192x192.png" 
                        alt="EINTK Logo" 
                        className="w-20 h-20 rounded-2xl shadow-lg" 
                    />
                </div>
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-white uppercase italic">
                EINTK
            </h1>
            <div className="h-1 w-12 bg-orange-500 mx-auto rounded-full mt-2"></div>
        </div>

        {/* Messaging */}
        <div className="mb-12 px-2">
            <h2 className="text-2xl font-bold text-gray-100 mb-4 leading-tight">
                Install the official app for the full experience.
            </h2>
            <p className="text-gray-400 text-base leading-relaxed">
                You are currently accessing the web version. To unlock high-speed learning, offline study, and real-time alerts, please install the EINTK app on your device.
            </p>
        </div>

        {/* In-App Browser Warning for iOS */}
        {isIOS && isInAppBrowser && (
            <div className="w-full bg-red-900/30 border border-red-500/50 p-6 rounded-[2rem] mb-12 text-left animate-pulse">
                <div className="flex items-center gap-3 mb-3 text-red-400">
                    <AlertTriangle size={24}/>
                    <span className="font-black uppercase tracking-widest text-xs">External Browser Detected</span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-4">
                    Installation and rewards may fail in this browser. Please tap the <ExternalLink size={14} className="inline"/> icon or "..." and select <strong>'Open in Safari'</strong> before installing.
                </p>
            </div>
        )}

        {/* Benefit Cards */}
        <div className="grid grid-cols-1 gap-4 w-full mb-12">
            <div className="bg-gray-800/40 backdrop-blur-md border border-white/5 p-5 rounded-3xl flex items-center gap-4 text-left group hover:border-orange-500/30 transition-all">
                <div className="bg-orange-600/20 p-3 rounded-2xl text-orange-500 shadow-inner group-hover:scale-110 transition-transform">
                    <WifiOff size={24}/>
                </div>
                <div>
                    <p className="font-black text-white text-xs uppercase tracking-widest mb-0.5">Study Offline</p>
                    <p className="text-xs text-gray-500 font-medium">Download everything and study without using data.</p>
                </div>
            </div>

            <div className="bg-gray-800/40 backdrop-blur-md border border-white/5 p-5 rounded-3xl flex items-center gap-4 text-left group hover:border-blue-500/30 transition-all">
                <div className="bg-blue-600/20 p-3 rounded-2xl text-blue-400 shadow-inner group-hover:scale-110 transition-transform">
                    <Zap size={24}/>
                </div>
                <div>
                    <p className="font-black text-white text-xs uppercase tracking-widest mb-0.5">Instant Access</p>
                    <p className="text-xs text-gray-500 font-medium">Faster navigation and a distraction-free environment.</p>
                </div>
            </div>
        </div>

        {/* Dynamic Action Area */}
        {isIOS && !isInAppBrowser ? (
            <div className="w-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-[2.5rem] p-8 text-left border border-white/5 shadow-2xl animate-fade-in-up">
                <h4 className="text-white font-black mb-8 flex items-center gap-3 uppercase tracking-[0.2em] text-[10px]">
                    <Apple size={16} className="text-orange-500" /> Setup Guide (iOS)
                </h4>
                <div className="space-y-8">
                    <div className="flex items-center gap-5">
                        <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center font-black text-white shrink-0 shadow-lg shadow-orange-900/20">1</div>
                        <p className="text-sm text-gray-300 font-medium leading-snug">
                            Tap the <Share size={18} className="inline-block mx-1 text-blue-400" /> <strong>Share</strong> button in your Safari browser bar.
                        </p>
                    </div>
                    <div className="flex items-center gap-5">
                        <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center font-black text-white shrink-0">2</div>
                        <p className="text-sm text-gray-300 font-medium leading-snug">
                            Scroll down the menu and select <strong><Layers size={16} className="inline-block mx-1 text-white" /> Add to Home Screen</strong>.
                        </p>
                    </div>
                </div>
                <div className="mt-10 pt-6 border-t border-white/5 flex flex-col items-center gap-4">
                    <button 
                        onClick={handleWebBypass}
                        className="text-orange-500 hover:text-orange-400 text-[11px] font-black uppercase tracking-widest transition-colors flex items-center gap-2"
                    >
                        I'll use the browser for now <ChevronRight size={14}/>
                    </button>
                    <div className="flex items-center gap-2 text-gray-600 font-bold text-[9px] uppercase tracking-widest">
                        <ShieldCheck size={12}/> Verified Secure Native Environment
                    </div>
                </div>
            </div>
        ) : (
            <div className="w-full space-y-6">
                <button 
                    onClick={handleInstallClick}
                    disabled={!installPrompt && !isIOS}
                    className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-black py-6 rounded-[2rem] flex flex-col items-center justify-center gap-1 shadow-2xl shadow-orange-900/40 transform active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                >
                    <div className="flex items-center gap-3">
                        <Download size={24} />
                        <span className="text-lg uppercase tracking-widest">Install EINTK App</span>
                    </div>
                </button>
                
                <div className="flex flex-col gap-4">
                    <button 
                      onClick={() => setShowIOSModal(true)}
                      className="w-full py-4 px-4 rounded-[2rem] bg-gray-800/50 border border-white/10 text-gray-400 hover:text-white transition-all text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <Apple size={16} /> Are you an iOS user?
                    </button>

                    <button 
                        onClick={handleWebBypass}
                        className="text-orange-500 hover:text-orange-400 text-[10px] font-black uppercase tracking-widest transition-colors underline decoration-orange-500/30 underline-offset-4"
                    >
                        Skip and use Browser Version
                    </button>
                </div>

                <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.3em] pt-4">
                    Available for Android & Chrome Desktop
                </p>
            </div>
        )}

        <div className="mt-16 text-[8px] text-gray-700 font-black uppercase tracking-[0.5em] flex flex-col items-center gap-6">
            <span>Official Distribution</span>
            <div className="flex gap-8 opacity-20">
                <Smartphone size={16}/>
                <Zap size={16}/>
                <ShieldCheck size={16}/>
            </div>
        </div>
      </div>

      {/* iOS Installation Modal */}
      <Modal 
        isOpen={showIOSModal} 
        onClose={() => setShowIOSModal(false)} 
        title="iOS Installation Guide"
      >
        <IOSInstructions />
      </Modal>
    </div>
  );
};

export default PWALandingPage;
