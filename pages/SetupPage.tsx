
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Atom, Brain, Rocket, BookOpen, Microscope, Pi, Sigma, Orbit, Sparkles, 
  ShieldCheck, Swords, Trophy, Zap, Battery, Cloud, Cpu, Globe, GraduationCap, 
  Lightbulb, Map, Pencil, PenTool, School, Shapes, Star, Target, TestTube,
  CheckCircle, ArrowRight
} from 'lucide-react';
import { syncQueue } from '../services/syncQueue';
import type { UserData } from '../types';

interface SetupPageProps {
  userData: UserData | null;
}

const ENGAGEMENT_TEXTS = [
  "Nova is weaving your neural knowledge web...",
  "Forging offline sanctuary... master the world without data.",
  "Mapping the syllabus into your digital DNA...",
  "Optimizing the Hub for your subject interests...",
  "Converting complex theories into digital wisdom...",
  "Preparing high-fidelity academic assets...",
  "Your library is taking root. Prepare for growth.",
  "Synchronizing the vital core..."
];

const ICONS_POOL = [
  Atom, Brain, Rocket, BookOpen, Microscope, Pi, Sigma, Orbit, Sparkles, 
  ShieldCheck, Swords, Trophy, Zap, Battery, Cloud, Cpu, Globe, GraduationCap, 
  Lightbulb, Map, Pencil, PenTool, School, Shapes, Star, Target, TestTube
];

const SetupPage: React.FC<SetupPageProps> = ({ userData }) => {
  const navigate = useNavigate();
  
  // UI Display Progress (Moves to 100% in 60 seconds)
  const [displayProgress, setDisplayProgress] = useState(0);
  const [realSyncFinished, setRealSyncFinished] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  const [messageIndex, setMessageIndex] = useState(0);

  // 1. ROTATE ENGAGEMENT TEXTS (Every 4 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isComplete) {
        setMessageIndex(prev => (prev + 1) % ENGAGEMENT_TEXTS.length);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [isComplete]);

  // 2. SMOOTH 60-SECOND PROGRESS BAR ENGINE
  useEffect(() => {
    if (!userData || isComplete) return;

    const startTime = Date.now();
    const duration = 60000; // 60 seconds in milliseconds
    
    const engineInterval = setInterval(() => {
        if (isComplete) {
            clearInterval(engineInterval);
            return;
        }

        const elapsed = Date.now() - startTime;
        let p = (elapsed / duration) * 100;
        
        // Add minor jitter for visual realism
        p += (Math.random() - 0.5) * 0.5;
        
        const capped = Math.min(100, Math.round(p));
        setDisplayProgress(prev => Math.max(prev, capped));

        // When we reach 100% time, mark as complete regardless of download status
        if (elapsed >= duration) {
            setIsComplete(true);
            setDisplayProgress(100);
            clearInterval(engineInterval);
        }
    }, 1000);

    return () => clearInterval(engineInterval);
  }, [userData, isComplete]);

  // 3. ACTUAL VITAL SYNC (IN BACKGROUND)
  useEffect(() => {
    if (userData && !realSyncFinished) {
      syncQueue.startVitalSync(userData, (p) => {
        // If the download actually finishes before 60s, jump to 100%
        if (p >= 100) {
            setRealSyncFinished(true);
            setIsComplete(true);
            setDisplayProgress(100);
        }
      });
    }
  }, [userData, realSyncFinished]);

  const handleLaunch = () => {
    localStorage.setItem('eintk_setup_complete', 'true');
    navigate('/', { replace: true });
  };

  const floatingIcons = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => {
      const Icon = ICONS_POOL[i % ICONS_POOL.length];
      const duration = 15 + Math.random() * 20;
      const delay = Math.random() * -30;
      const startX = Math.random() * 100;
      const startY = Math.random() * 100;
      const moveX = (Math.random() - 0.5) * 400;
      const moveY = (Math.random() - 0.5) * 400;

      return (
        <div 
          key={i}
          className="absolute text-orange-500/20 pointer-events-none animate-float-icon"
          style={{
            left: `${startX}%`,
            top: `${startY}%`,
            '--tw-translate-x': `${moveX}px`,
            '--tw-translate-y': `${moveY}px`,
            '--float-duration': `${duration}s`,
            '--float-delay': `${delay}s`,
          } as any}
        >
          <Icon size={24 + Math.random() * 24} strokeWidth={1.5} />
        </div>
      );
    });
  }, []);

  return (
    <div className="fixed inset-0 z-[500] bg-gray-900 flex flex-col items-center justify-center p-8 overflow-hidden font-sans">
      <div className="absolute inset-0 bg-starry opacity-30 pointer-events-none"></div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {floatingIcons}
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        <div className="relative mb-12">
          <div className="w-64 h-64 rounded-full border-4 border-white/5 flex items-center justify-center relative shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <svg className="absolute inset-0 transform -rotate-90" width="100%" height="100%" viewBox="0 0 100 100">
               <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
              <circle
                cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray="301.59"
                style={{ strokeDashoffset: 301.59 - (displayProgress / 100) * 301.59, transition: 'stroke-dashoffset 1s linear' }}
                strokeLinecap="round" className="text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]"
              />
            </svg>
            <div className="w-52 h-52 rounded-full bg-gray-900/80 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center p-6 text-center shadow-inner">
               {isComplete ? (
                 <div className="animate-bounce-slow">
                    <CheckCircle size={64} className="text-green-500 mb-2" />
                    <p className="text-white font-black uppercase tracking-widest text-xs">Forged</p>
                 </div>
               ) : (
                 <>
                    <div className="text-4xl font-black text-white mb-2 tracking-tighter">{displayProgress}%</div>
                    <div className="h-px w-12 bg-orange-500/50 mb-4"></div>
                    <div key={messageIndex} className="animate-fade-in-up">
                      <p className="text-[11px] font-bold text-gray-300 leading-relaxed italic">
                        {ENGAGEMENT_TEXTS[messageIndex]}
                      </p>
                    </div>
                 </>
               )}
            </div>
          </div>
        </div>

        <div className="w-full text-center space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-white uppercase tracking-widest italic">The Forge</h2>
            <p className="text-orange-500 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">
              {isComplete ? "Initialization Perfected" : "Synchronizing Vital Assets"}
            </p>
          </div>

          {isComplete ? (
            <button onClick={handleLaunch} className="w-full bg-white text-gray-900 font-black py-5 rounded-2xl flex items-center justify-center gap-3 shadow-2xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-sm animate-fade-in">
              Open Library <ArrowRight size={20} />
            </button>
          ) : (
            <div className="space-y-4">
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div className="h-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-1000 ease-out" style={{ width: `${displayProgress}%` }}></div>
              </div>
              <p className="text-[9px] text-gray-600 font-medium leading-relaxed px-6">
                This initialization sequence occurs only once. Please keep the app open to ensure your library is forged perfectly. 
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupPage;
