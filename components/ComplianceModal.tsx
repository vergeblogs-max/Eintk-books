import React, { useState, useEffect, useMemo } from 'react';
import { ShieldAlert, CheckCircle2, Clock, Info, Globe, Zap, ArrowRight, FileText, ShieldCheck, WifiOff, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ComplianceModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ComplianceModal: React.FC<ComplianceModalProps> = ({ isOpen, onClose }) => {
    const [step, setStep] = useState<1 | 2>(1);
    const [timeLeft, setTimeLeft] = useState(30);
    const [isChecked, setIsChecked] = useState(false);
    const [timerFinished, setTimerFinished] = useState(true);

    // Domain detection to bypass in dev/testing environments
    const isProduction = useMemo(() => {
        const hostname = window.location.hostname;
        const productionURLs = [
            'eintk.com.ng', 
            'www.eintk.com.ng', 
            'eintk.vercel.app', 
            'eintk-ebooks.web.app', 
            'eintk-ebooks.firebaseapp.com'
        ];
        return productionURLs.includes(hostname);
    }, []);

    useEffect(() => {
        // Automatically bypass if not on a production domain
        if (isOpen && !isProduction) {
            onClose();
            return;
        }

        if (!isOpen || !isProduction) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setTimerFinished(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isOpen, isProduction, onClose]);

    if (!isOpen || !isProduction) return null;

    const canProceedFinal = timerFinished && isChecked;

    return (
        <div className="fixed inset-0 z-[3000] bg-gray-950 overflow-y-auto custom-scrollbar flex flex-col items-center animate-fade-in">
            {/* Ambient Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-600/5 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/5 rounded-full blur-[120px]"></div>
            </div>

            <div className="relative z-10 w-full max-w-2xl min-h-screen flex flex-col items-center justify-center pt-24 pb-12 px-6 md:px-12 text-center">
                
                {/* Progress Indicators */}
                <div className="flex gap-2 mb-8">
                    <div className={`h-1.5 w-12 rounded-full transition-all duration-500 ${step >= 1 ? 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]' : 'bg-gray-800'}`}></div>
                    <div className={`h-1.5 w-12 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]' : 'bg-gray-800'}`}></div>
                </div>

                {/* PHASE 1: ACADEMIC INTEGRITY */}
                {step === 1 && (
                    <div className="animate-fade-in space-y-8 w-full">
                        <div className="w-24 h-24 bg-orange-600/20 rounded-[2rem] flex items-center justify-center mx-auto border border-orange-500/30 shadow-2xl shadow-orange-900/20">
                            <ShieldAlert size={48} className="text-orange-500 animate-pulse" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter italic">Academic Protocol</h2>
                            <p className="text-orange-500 text-[10px] font-black uppercase tracking-[0.3em]">Operational Guardrail</p>
                        </div>

                        <div className="space-y-6">
                            <p className="text-lg text-gray-200 leading-relaxed max-w-lg mx-auto">
                                EINTK is engineered to <strong className="text-white">deepen your understanding</strong> and explain complex subjects with absolute clarity.
                            </p>

                            <div className="bg-gray-900/50 p-8 rounded-[2.5rem] border border-white/5 space-y-6 text-left shadow-inner">
                                <div className="flex gap-4">
                                    <div className="mt-1 shrink-0 p-2 bg-orange-600/20 rounded-xl border border-orange-500/20 h-fit">
                                        <Sparkles size={18} className="text-orange-400" />
                                    </div>
                                    <p className="text-sm text-gray-400 leading-relaxed">
                                        <strong className="text-white block mb-1 uppercase tracking-wider text-xs">Our Commitment</strong>
                                        We promise to do our absolute best to ensure you grasp every concept and topic that was once confusing.
                                    </p>
                                </div>

                                <div className="flex gap-4">
                                    <div className="mt-1 shrink-0 p-2 bg-blue-600/20 rounded-xl border border-blue-500/20 h-fit">
                                        <Info size={18} className="text-blue-400" />
                                    </div>
                                    <p className="text-sm text-gray-400 leading-relaxed">
                                        <strong className="text-white block mb-1 uppercase tracking-wider text-xs">Study Companion</strong>
                                        This platform is a powerful tool, but it is <strong className="text-orange-500">not a replacement</strong> for your official textbooks, classroom instructions, and recommended past question materials.
                                    </p>
                                </div>

                                <div className="flex gap-4">
                                    <div className="mt-1 shrink-0 p-2 bg-red-900/20 rounded-xl border border-red-500/20 h-fit">
                                        <AlertTriangle size={18} className="text-red-500" />
                                    </div>
                                    <p className="text-sm text-gray-400 leading-relaxed">
                                        <strong className="text-white block mb-1 uppercase tracking-wider text-xs">Success Disclaimer</strong>
                                        Do not depend solely on EINTK to pass your examinations. Your results depend on your personal discipline and use of multiple verified resources.
                                    </p>
                                </div>
                            </div>

                            <button 
                                onClick={() => setStep(2)}
                                className="w-full max-w-sm bg-white text-gray-950 font-black py-5 rounded-2xl flex items-center justify-center gap-3 shadow-2xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-xs mx-auto"
                            >
                                Technical Briefing
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* PHASE 2: TECHNICAL ARCHITECTURE */}
                {step === 2 && (
                    <div className="animate-fade-in space-y-8 w-full">
                        <div className="w-24 h-24 bg-blue-600/20 rounded-[2rem] flex items-center justify-center mx-auto border border-blue-500/30 shadow-2xl shadow-blue-900/20">
                            <Globe size={48} className="text-blue-400" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter italic">Web Architecture</h2>
                            <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em]">System Reality</p>
                        </div>

                        <div className="space-y-6">
                            <p className="text-lg text-gray-200 leading-relaxed max-w-lg mx-auto">
                                EINTK is a <strong className="text-white">Web-Powered Application</strong>. It is designed to feel like an app, but it remains a website at its core.
                            </p>

                            <div className="grid grid-cols-1 gap-4 text-left">
                                <div className="p-5 bg-gray-900/50 rounded-2xl border border-white/5 flex gap-5 group hover:border-blue-500/20 transition-all">
                                    <div className="bg-gray-800 p-3 rounded-xl h-fit border border-white/5 shadow-inner group-hover:scale-110 transition-transform">
                                        <Zap size={22} className="text-yellow-500"/>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-white uppercase tracking-widest mb-1">Internet Boosts</p>
                                        <p className="text-xs text-gray-400 leading-relaxed">Navigation between different subjects and AI analysis requires a stable <strong className="text-gray-200">internet connection</strong> to reach our central servers.</p>
                                    </div>
                                </div>

                                <div className="p-5 bg-gray-900/50 rounded-2xl border border-white/5 flex gap-5 group hover:border-red-500/20 transition-all">
                                    <div className="bg-gray-800 p-3 rounded-xl h-fit border border-white/5 shadow-inner group-hover:scale-110 transition-transform">
                                        <WifiOff size={22} className="text-red-500"/>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-white uppercase tracking-widest mb-1">Connection Limits</p>
                                        <p className="text-xs text-gray-400 leading-relaxed">Reading a book on a single page works without a connection, but switching pages or subjects will require an <strong className="text-gray-200">internet boost</strong> to avoid a blank screen.</p>
                                    </div>
                                </div>

                                <div className="p-5 bg-gray-900/50 rounded-2xl border border-white/5 flex gap-5 group hover:border-blue-500/20 transition-all">
                                    <div className="bg-gray-800 p-3 rounded-xl h-fit border border-white/5 shadow-inner group-hover:scale-110 transition-transform">
                                        <Loader2 size={22} className="text-blue-500 animate-spin"/>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-white uppercase tracking-widest mb-1">Latency Profile</p>
                                        <p className="text-xs text-gray-400 leading-relaxed">High web traffic may occasionally affect load speeds. Stay online for the smoothest and fastest learning experience.</p>
                                    </div>
                                </div>
                            </div>

                            {/* AGREEMENT AREA */}
                            <div className="pt-6 space-y-6 w-full max-w-sm mx-auto">
                                <label className="flex items-start gap-4 cursor-pointer group text-left">
                                    <div className="relative flex items-center h-6 mt-1">
                                        <input 
                                            type="checkbox" 
                                            checked={isChecked} 
                                            onChange={() => setIsChecked(!isChecked)}
                                            className="w-6 h-6 rounded-lg border-gray-700 bg-gray-800 text-orange-600 focus:ring-orange-500/20 transition-all cursor-pointer"
                                        />
                                    </div>
                                    <span className="text-xs text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors">
                                        I have read and fully understand the academic and technical compliance briefing. I agree to use EINTK as a study companion.
                                    </span>
                                </label>

                                <div className="space-y-4">
                                    <button 
                                        onClick={onClose}
                                        disabled={!canProceedFinal}
                                        className={`w-full font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all uppercase tracking-[0.2em] text-xs shadow-2xl ${canProceedFinal ? 'bg-orange-600 text-white shadow-orange-900/40 hover:scale-[1.02] active:scale-95' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}
                                    >
                                        {!timerFinished && <Clock size={16} className="text-orange-500 animate-pulse" />}
                                        {canProceedFinal ? 'Synchronize & Enter' : timerFinished ? 'Signature Required' : `Briefing Lock (${timeLeft}s)`}
                                    </button>

                                    {/* LEGAL LINKS */}
                                    <div className="flex justify-center gap-8 pt-2">
                                        <Link to="/terms-of-service" target="_blank" className="flex items-center gap-1.5 text-[10px] font-black text-gray-500 hover:text-orange-500 uppercase tracking-widest transition-colors">
                                            <FileText size={14}/> Terms
                                        </Link>
                                        <Link to="/privacy-policy" target="_blank" className="flex items-center gap-1.5 text-[10px] font-black text-gray-500 hover:text-orange-500 uppercase tracking-widest transition-colors">
                                            <ShieldCheck size={14}/> Privacy
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer Quote */}
                <div className="mt-16 pb-12 border-t border-white/5 pt-8 w-full text-center">
                    <p className="text-[9px] text-gray-700 font-black uppercase tracking-[0.5em]">Verified Academic Integrity Protocol v3.1</p>
                </div>
            </div>
        </div>
    );
};

export default ComplianceModal;