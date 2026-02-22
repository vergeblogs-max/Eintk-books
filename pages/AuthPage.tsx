
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { signUp, logIn, signInWithGoogle, completeGoogleSignup } from '../services/authService';
import { uploadImage } from '../services/imageUploadService';
import { auth } from '../firebase';
import { Eye, EyeOff, UserCircle, CloudUpload, Loader2, ArrowRight, Mail, Atom, Book, Dna, Calculator, Microscope, Pi, Sigma, Orbit, Sparkles, Target, TestTube, Globe, School, Shapes, Lightbulb, AlertCircle, CheckCircle2 } from 'lucide-react';
import { NIGERIAN_STATES, DEPARTMENTS } from '../constants';
import type { UserData } from '../types';
import type { User } from 'firebase/auth';

const ICONS_POOL = [
    Atom, Book, Dna, Calculator, Microscope, Pi, Sigma, Orbit, Sparkles, Target, TestTube, Globe, School, Shapes, Lightbulb
];

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Environment Detection for Initial View
  const getInitialView = () => {
    // If navigation state specifies a view, use it
    if (location.state?.isLogin !== undefined) return location.state.isLogin;

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    const signupComplete = localStorage.getItem('eintk_signup_complete') === 'true';

    // PWA logic: Show Signup first if not completed before, otherwise show Login
    if (isStandalone) {
        return signupComplete; // if signupComplete is false, isLogin is false (shows signup)
    }

    // Browser logic: Always show Login first
    return true;
  };

  // States
  const [isLogin, setIsLogin] = useState(getInitialView());
  const [isCompletingProfile, setIsCompletingProfile] = useState(false); // For Google Flow
  const [googleAuthUser, setGoogleAuthUser] = useState<User | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [state, setState] = useState('');
  const [department, setDepartment] = useState<UserData['department']>('Science');
  const [referralCode, setReferralCode] = useState('');
  
  // File Upload
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);

  // UI States
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');

  // Auto-fill referral from localStorage
  useEffect(() => {
      const storedRef = localStorage.getItem('eintk_referrer_code');
      if (storedRef) setReferralCode(storedRef);
  }, []);

  // Redirect Logic
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (loading || verificationSent) return;
      if (user && !user.isAnonymous && !isCompletingProfile) {
        const from = location.state?.from || '/';
        navigate(from, { replace: true });
      }
    });
    return () => unsubscribe();
  }, [navigate, isCompletingProfile, loading, location.state, verificationSent]);

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePicFile(file);
      setProfilePicPreview(URL.createObjectURL(file));
    }
  };

  const handleGoogleSignIn = async () => {
      setLoading(true);
      setError('');
      try {
          const { user, needsProfileSetup } = await signInWithGoogle();
          if (needsProfileSetup) {
              setGoogleAuthUser(user);
              setIsCompletingProfile(true);
              setEmail(user.email || '');
              setUsername(user.displayName || '');
              setProfilePicPreview(user.photoURL || null);
          }
      } catch (err: any) {
          setError(err.message);
      } finally {
          setLoading(false);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (isLogin) {
        setLoading(true);
        try {
            await logIn(email, password);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
        return;
    }

    // Signup Validation
    if (!username || !state || !department) {
        setError("Please fill out all fields.");
        return;
    }
    if (!profilePicFile && !isCompletingProfile) {
         setError("Profile picture is required.");
         return;
    }

    setLoading(true);
    try {
      if (isCompletingProfile && googleAuthUser) {
          setMessage('Finalizing profile setup...');
          let finalPhotoUrl = googleAuthUser.photoURL || '';
          if (profilePicFile) {
              const uploadedUrl = await uploadImage(profilePicFile);
              if (!uploadedUrl) throw new Error("Failed to upload profile picture.");
              finalPhotoUrl = uploadedUrl;
          }
          await completeGoogleSignup(googleAuthUser.uid, googleAuthUser.email!, username, finalPhotoUrl, state, department, referralCode || undefined);
          localStorage.setItem('eintk_signup_complete', 'true');
          setIsCompletingProfile(false);
      } else {
        setMessage('Uploading profile picture...');
        const profilePictureUrl = await uploadImage(profilePicFile!);
        if (!profilePictureUrl) throw new Error("Failed to upload profile picture.");

        setMessage('Creating your account...');
        await signUp(username, email, password, profilePictureUrl, state, department, referralCode || undefined);
        localStorage.setItem('eintk_signup_complete', 'true');
        setVerificationSent(true);
        localStorage.removeItem('eintk_referrer_code');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const AnimatedBackground = useMemo(() => () => (
    <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#111827]"></div>
        <div className="absolute inset-0 opacity-20 bg-starry"></div>
        {Array.from({ length: 40 }).map((_, i) => {
          const Icon = ICONS_POOL[i % ICONS_POOL.length];
          return (
            <div key={i} className="absolute text-orange-500/15 pointer-events-none animate-float-icon"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                '--tw-translate-x': `${(Math.random() - 0.5) * 400}px`,
                '--tw-translate-y': `${(Math.random() - 0.5) * 400}px`,
                '--float-duration': `${15 + Math.random() * 20}s`,
                '--float-delay': `${Math.random() * -30}s`,
              } as any}
            >
              <Icon size={16 + Math.random() * 20} strokeWidth={1.5} />
            </div>
          );
        })}
    </div>
  ), []);

  if (verificationSent) {
      return (
          <div className="h-screen w-screen flex items-center justify-center bg-gray-900 p-4 relative overflow-hidden">
              <AnimatedBackground />
              <div className="w-full max-w-sm p-10 bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-blue-500/20 text-center relative z-10">
                  <div className="mx-auto w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6 border border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                      <Mail size={48} className="text-green-400" />
                  </div>
                  <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">Verification Required</h2>
                  
                  <div className="space-y-2 mb-8">
                      <p className="text-gray-300 text-sm leading-relaxed">
                          We have sent a verification link to <span className="font-bold text-orange-400">{email}</span>.
                      </p>
                      <div className="flex items-center justify-center gap-2 text-orange-500 bg-orange-500/10 py-2 rounded-xl border border-orange-500/20 animate-pulse">
                          <AlertCircle size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Check your spam folder</span>
                      </div>
                  </div>

                  <button 
                      onClick={() => { setVerificationSent(false); setIsLogin(true); }} 
                      className="w-full h-14 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-lg flex items-center justify-center transition-all active:scale-95"
                  >
                      Return to Login
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-gray-900 p-6 md:p-12 relative overflow-hidden font-sans">
      <AnimatedBackground />
      <div className="w-full max-w-sm py-10 px-8 space-y-8 bg-slate-900/85 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/5 relative z-10 overflow-y-auto max-h-[90vh] custom-scrollbar">
        <div className="text-center">
            <h2 className="text-3xl font-black bg-gradient-to-r from-orange-400 to-red-500 text-transparent bg-clip-text mb-1 uppercase tracking-tight">
                {isLogin ? 'Welcome back' : 'Welcome to EINTK'}
            </h2>
            <p className="text-gray-400 text-[11px] font-black uppercase tracking-[0.2em]">{isLogin ? "Continue mastering your subjects" : "Start your learning journey"}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
            {!isCompletingProfile && (
                <>
                    <button type="button" onClick={handleGoogleSignIn} disabled={loading} className="w-full h-14 flex items-center justify-center space-x-3 bg-white hover:bg-gray-100 text-gray-800 font-bold rounded-2xl transition-all shadow-sm text-sm active:scale-95">
                        <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                        <span>Continue with Google</span>
                    </button>
                    <div className="flex items-center justify-between"><span className="w-1/4 border-b border-gray-700"></span><span className="text-[10px] text-gray-500 uppercase font-black tracking-widest px-2">or email</span><span className="w-1/4 border-b border-gray-700"></span></div>
                </>
            )}

            {!isLogin && (
                <div className="flex flex-col items-center">
                    <input type="file" id="profilePic" className="hidden" accept="image/*" onChange={handleProfilePicChange} />
                    <label htmlFor="profilePic" className="cursor-pointer">
                        <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-gray-500 ring-2 ring-white/10 hover:ring-orange-500 relative group overflow-hidden transition-all">
                            {profilePicPreview ? <img src={profilePicPreview} className="w-full h-full object-cover" /> : <UserCircle size={48} />}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all"><CloudUpload className="text-white" size={24}/></div>
                        </div>
                    </label>
                </div>
            )}

            <div className="space-y-4">
                {!isLogin && (
                    <div className="space-y-1.5">
                        <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full h-14 px-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-1 focus:ring-orange-500 text-sm" placeholder="Username" />
                    </div>
                )}
                <div className="space-y-1.5">
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-14 px-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-1 focus:ring-orange-500 text-sm" placeholder="Email Address" />
                </div>
                {!isCompletingProfile && (
                    <div className="relative space-y-1.5">
                        <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full h-14 px-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-1 focus:ring-orange-500 text-sm" placeholder="Password" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-4 flex items-center text-gray-500 hover:text-white"><Eye size={20} /></button>
                    </div>
                )}
                {!isLogin && (
                    <>
                        <div className="grid grid-cols-2 gap-3">
                            <select required value={state} onChange={(e) => setState(e.target.value)} className="w-full h-14 px-4 bg-slate-800 border border-white/10 rounded-2xl text-white text-[11px] font-bold outline-none cursor-pointer">
                                <option value="">State</option>
                                {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select required value={department} onChange={(e) => setDepartment(e.target.value as any)} className="w-full h-14 px-4 bg-slate-800 border border-white/10 rounded-2xl text-white text-[11px] font-bold outline-none cursor-pointer">
                                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5 pt-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                                Invitation Code (Optional)
                                {referralCode && <Sparkles size={10} className="text-orange-400 animate-pulse" />}
                            </label>
                            <div className="relative">
                                <input type="text" value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} className={`w-full h-14 px-5 bg-white/5 border rounded-2xl text-white outline-none focus:ring-1 focus:ring-orange-500 text-sm uppercase tracking-widest font-mono transition-colors ${referralCode ? 'border-orange-500/50' : 'border-white/10'}`} placeholder="e.g. X8Y2Z4" />
                                {referralCode && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-500">
                                        <CheckCircle2 size={18} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {error && <p className="text-red-400 text-[11px] text-center font-bold bg-red-900/20 p-3 rounded-xl border border-red-500/20">{error}</p>}
            {message && <p className="text-green-400 text-[11px] text-center font-bold bg-green-900/20 p-3 rounded-xl border border-green-500/20">{message}</p>}

            <button type="submit" disabled={loading} className="w-full h-14 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-lg transform active:scale-95 transition-all flex items-center justify-center">
                {loading ? <Loader2 className="animate-spin" size={20}/> : (isLogin ? 'Sign In' : (isCompletingProfile ? 'Complete Setup' : 'Create Account'))}
            </button>
            <p className="text-center text-[13px] text-gray-500">{isLogin ? "New here?" : "Already have an account?"} <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-orange-400 hover:text-orange-300 font-bold">{isLogin ? "Create Account" : "Sign In"}</button></p>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;
