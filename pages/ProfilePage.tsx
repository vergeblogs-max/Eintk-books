import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { User } from 'firebase/auth';
import type { UserData } from '../types';
import { logOut } from '../services/authService';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Info, Lock, FileText, Mail, Award, Loader2, Crown, CloudUpload, ChevronRight, BookCheck, Clock, Star, Pencil, Check, X, Target, Settings2, Notebook, Sprout, TreePine, Leaf, Flower2, CalendarClock, ChevronDown, ChevronUp, PenTool, Youtube, Megaphone, Gift, MessageCircle, Video, Rocket, RefreshCw, Zap, Shield, Swords, Brain, AlertTriangle } from 'lucide-react';
import { updateUserProfilePicture, updateUsername, updateUserInterests, ensureReferralCode, recalibrateStudyPlan } from '../services/firestoreService';
import { uploadImage } from '../services/imageUploadService';
import { NIGERIAN_CURRICULUM_SUBJECTS, MANDATORY_SUBJECTS, SKIN_CONFIG } from '../constants';
import Modal from '../components/Modal';
import CircularProgress from '../components/CircularProgress';
import { Timestamp } from 'firebase/firestore';
import { formatPoints } from '../utils/formatters';
import WalletCard from '../components/WalletCard';

interface ProfilePageProps {
  user: User | null;
  userData: UserData | null;
}

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string | number, subtext?: string }> = ({ icon, label, value, subtext }) => {
    const [showExact, setShowExact] = useState(false);
    const displayValue = typeof value === 'number' && !showExact ? formatPoints(value) : value.toLocaleString();

    return (
        <div 
            onClick={() => typeof value === 'number' && setShowExact(!showExact)}
            className={`bg-gray-800 p-4 rounded-xl flex items-center space-x-4 border border-gray-700 ${typeof value === 'number' ? 'cursor-pointer hover:bg-gray-750 transition-colors' : ''}`}
            title={typeof value === 'number' ? "Click to toggle exact value" : ""}
        >
            <div className="p-3 bg-gray-700 rounded-full">
                {icon}
            </div>
            <div>
                <p className="text-2xl font-bold text-white">{displayValue}</p>
                <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
                {subtext && <p className="text-[10px] text-gray-500 mt-0.5">{subtext}</p>}
            </div>
        </div>
    );
};

const NavLinkCard: React.FC<{ to: string, icon: React.ReactNode, label: string, highlight?: boolean }> = ({ to, icon, label, highlight }) => (
    <Link to={to} className={`p-4 rounded-xl flex items-center justify-between transition-colors border ${highlight ? 'bg-blue-900/30 border-blue-500/50 hover:bg-blue-900/50' : 'bg-gray-800 border-gray-700 hover:bg-gray-700'}`}>
        <div className="flex items-center space-x-4">
            {icon}
            <span className={`font-semibold ${highlight ? 'text-blue-200' : 'text-gray-200'}`}>{label}</span>
        </div>
        <ChevronRight className={highlight ? 'text-blue-400' : 'text-gray-500'} />
    </Link>
);

const BeautifulTree: React.FC<{ points: number, skinId?: string }> = ({ points, skinId }) => {
    const levels = [
        { name: 'Seed', min: 0, icon: Sprout, color: 'text-gray-400' },
        { name: 'Sprout', min: 1000, icon: Leaf, color: 'text-green-300' },
        { name: 'Sapling', min: 10000, icon: Flower2, color: 'text-green-400' },
        { name: 'Young Tree', min: 100000, icon: TreePine, color: 'text-green-500' },
        { name: 'Strong Tree', min: 1000000, icon: TreePine, color: 'text-emerald-500' },
        { name: 'Ancient Tree', min: 10000000, icon: Crown, color: 'text-yellow-400' },
        { name: 'World Tree', min: 100000000, icon: Crown, color: 'text-purple-400' },
    ];

    let currentLevelIndex = 0;
    for (let i = levels.length - 1; i >= 0; i--) {
        if (points >= levels[i].min) {
            currentLevelIndex = i;
            break;
        }
    }

    const currentLevel = levels[currentLevelIndex];
    const nextLevel = levels[currentLevelIndex + 1];
    
    let progressPercent = 100;
    let pointsToNext = 0;

    if (nextLevel) {
        const range = nextLevel.min - currentLevel.min;
        const gained = points - currentLevel.min;
        progressPercent = Math.min((gained / range) * 100, 100);
        pointsToNext = nextLevel.min - points;
    }

    const Icon = currentLevel.icon;
    const config = SKIN_CONFIG[skinId || 'default'] || SKIN_CONFIG.default;

    return (
        <div className={`bg-gradient-to-br ${config.gradient} rounded-2xl p-6 mb-8 shadow-xl border relative overflow-hidden transition-all duration-700 ${config.border}`}>
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <TreePine size={200} className="absolute -bottom-10 -right-10 text-white"/>
            </div>

            <div className="relative z-10 flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-white font-bold text-lg uppercase tracking-widest opacity-60">Knowledge Tree</h3>
                    <p className="text-3xl font-black text-white mt-1">{currentLevel.name}</p>
                </div>
                <div className={`p-4 bg-white/10 rounded-full backdrop-blur-sm shadow-inner ${currentLevel.color}`}>
                    <Icon size={40} strokeWidth={2.5} />
                </div>
            </div>

            <div className="relative z-10">
                <div className="flex justify-between text-xs text-white/70 mb-2 font-semibold">
                    <span title={`${points} Points`}>{formatPoints(points)} PTS</span>
                    {nextLevel ? <span>{formatPoints(nextLevel.min)} PTS</span> : <span>MAX LEVEL</span>}
                </div>
                <div className="h-4 bg-black/30 rounded-full overflow-hidden border border-white/10">
                    <div 
                        className={`h-full bg-gradient-to-r ${config.barGradient} rounded-full transition-all duration-1000 ease-out ${config.glow}`}
                        style={{ width: `${progressPercent}%` }}
                    ></div>
                </div>
                <p className="text-center text-xs text-white/80 mt-3 font-medium">
                    {nextLevel 
                        ? `${formatPoints(pointsToNext)} points until you grow into a ${nextLevel.name}` 
                        : "You have reached the pinnacle of knowledge!"}
                </p>
            </div>
        </div>
    );
};

const ProfilePage: React.FC<ProfilePageProps> = ({ user, userData }) => {
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(userData?.username || '');
  const [usernameError, setUsernameError] = useState('');
  const [usernameLoading, setUsernameLoading] = useState(false);
  
  const [showInterestsModal, setShowInterestsModal] = useState(false);
  const [editedInterests, setEditedInterests] = useState<string[]>(userData?.subjectsOfInterest || []);
  const [isSavingInterests, setIsSavingInterests] = useState(false);
  
  const [showMoreLinks, setShowMoreLinks] = useState(false);
  const [isRecalibrating, setIsRecalibrating] = useState(false);
  const [showRecalibrateModal, setShowRecalibrateModal] = useState(false);

  useEffect(() => {
      if (user && userData && !userData.referralCode) {
          ensureReferralCode(user.uid, userData);
      }
  }, [user, userData]);

  const handleLogout = async () => {
    await logOut();
    navigate('/auth');
  };

  const handleProfilePicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && user) {
        setIsUploading(true);
        try {
            const imageUrl = await uploadImage(e.target.files[0]);
            if (imageUrl) {
                await updateUserProfilePicture(user.uid, imageUrl);
            }
        } catch (error) {
            console.error("Failed to upload profile picture:", error);
        } finally {
            setIsUploading(false);
        }
    }
  };
  
  const handleUsernameChange = async () => {
    if (!user || !userData) return;
    if (newUsername === userData.username) {
        setIsEditingUsername(false);
        return;
    }
    if (newUsername.length < 3) {
        setUsernameError("Username must be at least 3 characters.");
        return;
    }

    setUsernameLoading(true);
    setUsernameError('');
    try {
        await updateUsername(user.uid, newUsername);
        setIsEditingUsername(false);
    } catch (error: any) {
        setUsernameError(error.message);
    } finally {
        setUsernameLoading(false);
    }
  };

  const initiateRecalibrate = () => {
      setShowRecalibrateModal(true);
  };

  const handleRecalibrate = async () => {
    if (!user || !userData) return;
    
    setShowRecalibrateModal(false);
    setIsRecalibrating(true);
    try {
        // Step 1: Clear Local Memory IMMEDIATELY to prevent App.tsx from thinking everything is fine
        localStorage.setItem('eintk_setup_complete', 'false');
        localStorage.setItem('eintk_plan_exists', 'false');
        
        // Step 2: Clear DB
        await recalibrateStudyPlan(user.uid);
        
        // Step 3: Hard redirect to Aether Setup
        // Using a short delay to allow DB state to at least initiate
        setTimeout(() => {
            window.location.href = '/#/aether-setup';
        }, 300);

    } catch (e) {
        console.error("Recalibrate error:", e);
        alert("Action failed. Check your internet connection.");
        setIsRecalibrating(false);
    }
  };

  if (!user || !userData) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <h2 className="text-2xl font-bold mb-6">Join EINTK</h2>
        <div className="space-y-4 w-full max-w-xs">
           <Link to="/auth" state={{ isLogin: false }} className="block w-full text-center bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-lg transition-colors">
            Create Account
          </Link>
          <Link to="/auth" state={{ isLogin: true }} className="block w-full text-center bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors">
            Login
          </Link>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => name.charAt(0).toUpperCase();
  const formatTime = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  
  const safeDate = (v: any) => {
      if (!v) return null;
      if (v.toDate) return v.toDate();
      if (v.seconds) return new Date(v.seconds * 1000);
      return new Date(v);
  };

  const isProUser = userData.subscriptionStatus === 'pro';
  const isAdmin = userData.role === 'central admin';
  
  const proExpiry = safeDate(userData.proExpiryDate);
  const trialExpiry = safeDate(userData.trialExpiryDate);
  const dayPassExpiry = safeDate(userData.dayPassExpiry);

  let effectiveExpiry = proExpiry && proExpiry > new Date() ? proExpiry : trialExpiry;
  if (dayPassExpiry && dayPassExpiry > new Date()) effectiveExpiry = dayPassExpiry;
  
  const daysLeft = effectiveExpiry ? Math.max(0, Math.ceil((effectiveExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

  const planInfo = useMemo(() => {
    if (!userData?.studyPlan) return null;
    const typeMap: any = {
        jamb_pulse: { label: 'JAMB Pulse', icon: Rocket, color: 'text-orange-500' },
        waec_zenith: { label: 'WAEC Zenith', icon: Shield, color: 'text-blue-500' },
        nexus: { label: 'The Nexus', icon: Swords, color: 'text-purple-500' },
        omni: { label: 'Omniscience', icon: Brain, color: 'text-green-500' }
    };
    return typeMap[userData.studyPlan.type] || { label: 'Aether Core', icon: Zap, color: 'text-white' };
  }, [userData?.studyPlan]);

  return (
    <div className="max-w-4xl mx-auto pb-8">
      <div className="flex flex-col items-center p-6 bg-gray-800 rounded-2xl shadow-lg relative mb-8 border border-gray-700">
        
        <Link 
            to="/referral"
            className="absolute top-4 left-4 flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 pl-1 pr-3 py-1 rounded-full shadow-lg border border-orange-400/30 hover:scale-105 transition-all group z-20"
        >
            <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-sm">
                <Gift size={14} className="text-white group-hover:rotate-12 transition-transform" />
            </div>
            <span className="text-[10px] font-bold text-white uppercase tracking-wide">Refer</span>
        </Link>

        {isAdmin && (
            <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                <div className="flex gap-2">
                    <Link to="/social" className="p-2 bg-gray-700 rounded-full text-red-500 hover:text-white hover:bg-red-600 border border-gray-600"><Youtube size={20} /></Link>
                    <Link to="/creator" className="p-2 bg-gray-700 rounded-full text-orange-400 hover:text-white hover:bg-orange-600 border border-gray-600"><PenTool size={20} /></Link>
                </div>
                <Link to="/advertisement" className="p-2 bg-gray-700 rounded-full text-blue-400 hover:text-white hover:bg-blue-600 border border-gray-600"><Megaphone size={20} /></Link>
            </div>
        )}

        <div className="relative mb-4 group">
          <div className="w-24 h-24 bg-orange-600 rounded-full flex items-center justify-center text-5xl font-bold text-white ring-4 ring-gray-700 overflow-hidden">
            {userData.profilePictureUrl ? (
              <img src={userData.profilePictureUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              getInitials(userData.username)
            )}
          </div>
          <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 rounded-full flex items-center justify-center transition-opacity duration-300" disabled={isUploading}>
             {isUploading ? <Loader2 className="animate-spin text-white" /> : <CloudUpload className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />}
          </button>
          <input type="file" ref={fileInputRef} onChange={handleProfilePicUpload} accept="image/*" className="hidden" />
        </div>

        <div className="flex items-center space-x-2">
           {isEditingUsername ? (
               <div className="flex items-center space-x-2">
                   <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md py-1 px-2 text-xl font-bold w-48 text-white focus:ring-1 focus:ring-orange-500 outline-none"/>
                   <button onClick={handleUsernameChange} disabled={usernameLoading} className="p-1 text-green-500">{usernameLoading ? <Loader2 className="animate-spin" /> : <Check />}</button>
                   <button onClick={() => setIsEditingUsername(false)} className="p-1 text-red-500"><X /></button>
               </div>
           ) : (
                <h2 className="text-2xl font-bold text-white">{userData.username}</h2>
           )}
            {(isProUser || userData.subscriptionStatus === 'day_pass') && (
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-1 rounded-full shadow-sm" title="Pro Member"><Crown size={16} className="text-white"/></div>
            )}
             {!isEditingUsername && (
                <button onClick={() => { setIsEditingUsername(true); setNewUsername(userData.username); setUsernameError(''); }} className="text-gray-400 hover:text-white transition-colors"><Pencil size={16} /></button>
            )}
        </div>
        {isEditingUsername && usernameError && <p className="text-red-500 text-sm mt-1">{usernameError}</p>}
        {daysLeft > 0 && (
            <div className="mt-2 flex items-center text-sm font-bold text-green-400 bg-green-900/30 px-3 py-1 rounded-full border border-green-500/50"><CalendarClock size={14} className="mr-1.5"/>{userData.subscriptionStatus === 'day_pass' ? 'Day Pass Active' : `${daysLeft} Days Remaining`}</div>
        )}
        <p className="text-gray-400 text-sm mt-2">{userData.email}</p>
        
        {isProUser ? (
            <Link to="/upgrade" className="mt-6 bg-gray-700 border border-green-500/50 hover:bg-green-900/30 text-green-400 font-bold py-2 px-6 rounded-lg shadow-lg hover:scale-105 transition-transform flex items-center text-sm">Extend Subscription</Link>
        ) : (
            <Link to="/upgrade" className="mt-6 bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:scale-105 transition-transform flex items-center"><Crown className="mr-2" size={20} /> Upgrade to PRO</Link>
        )}
      </div>

      <BeautifulTree points={userData.points || 0} skinId={userData.inventory?.activeSkinId} />
      
      <WalletCard sparks={userData.sparks || 0} energy={userData.energy || 0} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={<Star className="text-orange-400" />} label="Points Earned" value={userData.points || 0} subtext="Click to see total"/>
        <StatCard icon={<Clock className="text-orange-400" />} label="Reading Time" value={formatTime(userData.totalReadingTime || 0)} />
        <StatCard icon={<BookCheck className="text-orange-400" />} label="Books Read" value={userData.completedBooks?.length || 0} />
      </div>

      <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-300 mb-4 px-2 flex items-center"><Settings2 className="mr-2 text-orange-500"/> Tools & Resources</h3>
          <div className="grid grid-cols-2 gap-4">
              <NavLinkCard to="/tools" icon={<FileText className="text-teal-400" />} label="Formulas & Periodic" />
              {isProUser || userData.subscriptionStatus === 'day_pass' ? (
                  <NavLinkCard to="/journal" icon={<Notebook className="text-pink-400" />} label="Private Journal" />
              ) : (
                  <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 flex items-center justify-between opacity-60 cursor-not-allowed">
                      <div className="flex items-center space-x-4"><Notebook className="text-gray-500" /><span className="font-semibold text-gray-500">Journal (Pro)</span></div>
                      <Lock size={16} className="text-gray-500" />
                  </div>
              )}
          </div>
      </div>

      {(isProUser || userData.subscriptionStatus === 'day_pass') && (
          <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-300 mb-4 px-2 flex items-center"><Target className="mr-2 text-orange-500"/> Pro Dashboard</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Link to="/goals" className="bg-gray-800 p-4 rounded-xl flex items-center justify-between hover:bg-gray-700 border border-gray-700 transition-colors group">
                      <div className="flex items-center space-x-4"><div className="p-2 bg-blue-900/30 rounded-full text-blue-400 group-hover:text-blue-300"><CircularProgress percentage={userData.weeklyGoal ? Math.round((userData.weeklyGoal.readProgress / userData.weeklyGoal.readGoal) * 100) : 0} size={40} strokeWidth={4} color="#60a5fa"/></div><div><span className="block font-bold text-gray-200 text-lg">Weekly Goals</span><span className="text-xs text-gray-400">{userData.weeklyGoal ? `${userData.weeklyGoal.readProgress}/${userData.weeklyGoal.readGoal} Books Read` : "Set your targets"}</span></div></div>
                      <ChevronRight className="text-gray-500" />
                  </Link>
                  <Link to="/notes" className="bg-gray-800 p-4 rounded-xl flex items-center justify-between hover:bg-gray-700 border border-gray-700 transition-colors group">
                      <div className="flex items-center space-x-4"><div className="p-2 bg-purple-900/30 rounded-full text-purple-400 group-hover:text-purple-300"><FileText size={24}/></div><div><span className="block font-bold text-gray-200 text-lg">My Notes</span><span className="text-xs text-gray-400">{(userData.bookmarks?.length || 0)} Saved Highlights</span></div></div>
                      <ChevronRight className="text-gray-500" />
                  </Link>
              </div>
          </div>
      )}

      {/* PLAN MANAGEMENT SECTION - Moved exactly on top of Badges */}
      {userData.studyPlan && planInfo && (
          <div className="bg-gray-800 rounded-[2rem] p-8 border border-gray-700 mb-4 shadow-xl overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700"><planInfo.icon size={140} /></div>
              
              <div className="flex items-center gap-4 mb-8">
                  <div className="p-4 bg-gray-900 rounded-[1.5rem] border border-white/5 shadow-inner">
                      <planInfo.icon className={planInfo.color} size={32} />
                  </div>
                  <div>
                      <h3 className="text-white font-black text-xl uppercase tracking-tighter italic">Mission: {planInfo.label}</h3>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Aether Core Protocol</p>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-10">
                  <div className="bg-gray-900/50 p-4 rounded-2xl border border-white/5">
                      <p className="text-[10px] text-gray-500 font-black uppercase mb-1 flex items-center gap-2"><CalendarClock size={12}/> Goal Date</p>
                      <p className="text-sm font-bold text-white">
                          {safeDate(userData.studyPlan.endDate)?.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                  </div>
                  <div className="bg-gray-900/50 p-4 rounded-2xl border border-white/5">
                      <p className="text-[10px] text-gray-500 font-black uppercase mb-1 flex items-center gap-2"><Zap size={12}/> Load</p>
                      <p className="text-sm font-bold text-orange-500">{userData.studyPlan.intensity} Subj / Day</p>
                  </div>
              </div>

              <button 
                  onClick={initiateRecalibrate}
                  disabled={isRecalibrating}
                  className="w-full py-5 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-orange-600 hover:to-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 group/btn"
              >
                  {isRecalibrating ? <Loader2 className="animate-spin" size={18}/> : <RefreshCw size={18} className="group-hover/btn:rotate-180 transition-transform duration-500"/>}
                  {isRecalibrating ? "Clearing..." : "Reset Study Plan"}
              </button>
          </div>
      )}

      {/* RECALIBRATE CONFIRMATION MODAL */}
      <Modal isOpen={showRecalibrateModal} onClose={() => setShowRecalibrateModal(false)} title="Reset Mission Path?">
          <div className="text-center p-2">
              <div className="bg-orange-600/20 p-5 rounded-full w-20 h-20 mx-auto flex items-center justify-center mb-6 border border-orange-500/30">
                  <AlertTriangle size={40} className="text-orange-500 animate-pulse" />
              </div>
              <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tighter italic">Timeline Warning</h3>
              <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                  This will clear your current mission schedule and remaining tasks. Your learning path will **restart from today** using your selected intensity and subjects.
              </p>
              <div className="flex flex-col gap-3">
                  <button 
                      onClick={handleRecalibrate}
                      className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl shadow-lg transition-transform hover:scale-105 flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                  >
                      Confirm Reset
                  </button>
                  <button 
                      onClick={() => setShowRecalibrateModal(false)}
                      className="text-gray-500 hover:text-white text-xs font-bold uppercase tracking-widest py-2 transition-colors"
                  >
                      Abort
                  </button>
              </div>
          </div>
      </Modal>

      <div className="space-y-3">
        <NavLinkCard to="/badges" icon={<Award className="text-gray-400" />} label="My Badges" />

        <button onClick={() => setShowMoreLinks(!showMoreLinks)} className="w-full bg-gray-800 p-4 rounded-xl flex items-center justify-center hover:bg-gray-700 transition-colors border border-gray-700 text-gray-400">
            <div className="flex items-center space-x-4">{showMoreLinks ? <ChevronUp size={24} className="text-gray-400" /> : <ChevronDown size={24} className="text-gray-400" />}<span className="font-semibold text-gray-200">Show More</span></div>
        </button>
        {showMoreLinks && (
            <div className="space-y-3 animate-fade-in">
                <NavLinkCard to="/about-us" icon={<Info className="text-gray-400" />} label="About Us" />
                <NavLinkCard to="/contact-us" icon={<Mail className="text-gray-400" />} label="Contact & Support" />
                <NavLinkCard to="/privacy-policy" icon={<Lock className="text-gray-400" />} label="Privacy Policy" />
                <NavLinkCard to="/terms-of-service" icon={<FileText className="text-gray-400" />} label="Terms of Service" />
                <div className="flex gap-4 pt-4 border-t border-gray-700 mt-2 w-full">
                    <a href="https://youtube.com/@eintkweb" target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center bg-gray-800 border border-gray-700 rounded-xl h-16 hover:bg-gray-750 transition-all shadow-md group">
                        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-[#FF0000] group-hover:scale-110 transition-transform"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                    </a>
                    <a href="https://www.tiktok.com/@eintkedu" target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center bg-gray-800 border border-gray-700 rounded-xl h-16 hover:bg-gray-750 transition-all shadow-md group">
                        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white group-hover:scale-110 transition-transform"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.9-.32-1.98-.23-2.81.31-.75.42-1.24 1.25-1.31 2.1-.05.56.06 1.15.35 1.64.44.83 1.34 1.33 2.27 1.41.69.07 1.4-.09 2-.44.75-.41 1.22-1.2 1.3-2.05.06-2.22.01-4.43.01-6.65V.02z"/></svg>
                    </a>
                    <a href="https://whatsapp.com/channel/0029VbBtbWx2Jl8H2jeMAQ3x" target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center bg-gray-800 border border-gray-700 rounded-xl h-16 hover:bg-gray-750 transition-all shadow-md group">
                        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-[#25D366] group-hover:scale-110 transition-transform"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                    </a>
                </div>
            </div>
        )}
      </div>

      <div className="mt-8">
        <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-3 p-4 bg-gray-800 hover:bg-red-900/20 text-red-500 font-bold rounded-xl transition-colors border border-gray-700 group">
          <LogOut size={20} className="group-hover:scale-110 transition-transform" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;