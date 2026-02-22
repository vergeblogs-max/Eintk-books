
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import type { User } from 'firebase/auth';
import { onSnapshot, doc, Timestamp, updateDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import type { UserData } from './types';
import { revertUserToFree, getMaintenanceStatus, checkAndResetBattleQuota } from './services/firestoreService';
import { logOut, getOrCreateInstallationId } from './services/authService';
import { syncManager } from './services/syncManager';
import { syncQueue } from './services/syncQueue';
import { getLocalUserData, saveLocalUserData, requestPersistence } from './services/offlineService';

import BottomNav from './components/BottomNav';
import LoadingSpinner from './components/LoadingSpinner';
import Modal from './components/Modal'; 
import PWAManager from './components/PWAManager'; 
import PWALandingPage from './components/PWALandingPage';
import GlobalAIChat from './components/GlobalAIChat';
import SetupPage from './pages/SetupPage';
import AetherSetupPage from './pages/AetherSetupPage';
import { AlertTriangle, Wifi, CheckCircle2 } from 'lucide-react'; 

const LibraryPage = React.lazy(() => import('./pages/LibraryPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const ReferralPage = React.lazy(() => import('./pages/ReferralPage')); 
const SparksPage = React.lazy(() => import('./pages/SparksPage'));
const ModeratorPage = React.lazy(() => import('./pages/ModeratorPage')); 
const AdminPage = React.lazy(() => import('./pages/AdminPage'));
const SocialPage = React.lazy(() => import('./pages/SocialPage')); 
const AdvertisementPage = React.lazy(() => import('./pages/AdvertisementPage'));
const AuthPage = React.lazy(() => import('./pages/AuthPage'));
const AboutUsPage = React.lazy(() => import('./pages/AboutUsPage'));
const PrivacyPolicyPage = React.lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsOfServicePage = React.lazy(() => import('./pages/TermsOfServicePage'));
const ContactUsPage = React.lazy(() => import('./pages/ContactUsPage'));
const EbookReaderPage = React.lazy(() => import('./pages/EbookReaderPage'));
const AudiobookPage = React.lazy(() => import('./pages/AudiobookPage')); 
const GeneralReaderPage = React.lazy(() => import('./pages/GeneralReaderPage')); 
const GeneralViewerPage = React.lazy(() => import('./pages/GeneralViewerPage')); 
const BadgesPage = React.lazy(() => import('./pages/BadgesPage'));
const ExamQSTReaderPage = React.lazy(() => import('./pages/ExamQSTReaderPage'));
const StudySessionPage = React.lazy(() => import('./pages/StudySessionPage'));
const MediaPage = React.lazy(() => import('./pages/MediaPage'));
const UpgradePage = React.lazy(() => import('./pages/UpgradePage'));
const VerifyPaymentPage = React.lazy(() => import('./pages/VerifyPaymentPage'));
const CommunityPage = React.lazy(() => import('./pages/CommunityPage'));
const ExamsPage = React.lazy(() => import('./pages/ExamsPage'));
const ArcadePage = React.lazy(() => import('./pages/ArcadePage'));
const EbookViewerPage = React.lazy(() => import('./pages/EbookViewerPage'));
const ExamQSTViewerPage = React.lazy(() => import('./pages/ExamQSTViewerPage'));
const NotesPage = React.lazy(() => import('./pages/NotesPage'));
const GoalsPage = React.lazy(() => import('./pages/GoalsPage'));
const ToolsPage = React.lazy(() => import('./pages/ToolsPage'));
const BattlePage = React.lazy(() => import('./pages/BattlePage'));
const JournalPage = React.lazy(() => import('./pages/JournalPage'));
const VerifySparksPage = React.lazy(() => import('./pages/VerifySparksPage')); 
const HighStakesPage = React.lazy(() => import('./pages/HighStakesPage')); 
const StreakMaintenancePage = React.lazy(() => import('./pages/StreakMaintenancePage'));

const MaintenanceScreen: React.FC = () => (
    <div className="fixed inset-0 bg-gray-900 z-[100] flex flex-col items-center justify-center text-center p-6">
        <div className="bg-orange-600/20 p-6 rounded-full mb-6 animate-pulse">
            <AlertTriangle size={64} className="text-orange-500" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">Under Maintenance</h1>
        <p className="text-lg text-gray-300 max-w-md">We are currently updating the platform.</p>
        <div className="mt-8 bg-gray-800 px-6 py-4 rounded-lg border border-gray-700">
            <p className="text-orange-400 font-bold animate-pulse">Please check back in 5 minutes.</p>
        </div>
    </div>
);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const [showSessionAlert, setShowSessionAlert] = useState(false);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isMandatoryPWA, setIsMandatoryPWA] = useState(false);
  const [showOnlineToast, setShowOnlineToast] = useState(false);
  const streakProcessedRef = useRef(false);

  const refreshUserData = useCallback(async (uid: string) => {
    const cachedData = await getLocalUserData(uid);
    if (!cachedData) return;
    const dirtyEntries = await syncManager.getDirtyData();
    let finalData = { ...cachedData };
    if (dirtyEntries.length > 0) {
        for (const entry of dirtyEntries) {
            const keys = entry.field.split('.');
            let current: any = finalData;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) current[keys[i]] = {};
                current = current[keys[i]];
            }
            const lastKey = keys[keys.length - 1];
            if (entry.op === 'ADD') { current[lastKey] = (current[lastKey] || 0) + entry.value; } 
            else { current[lastKey] = entry.value; }
        }
    }
    setUserData(finalData);
  }, []);

  // Referral Bridge: Capture ref code on app load
  useEffect(() => {
    const search = window.location.search || (window.location.hash.includes('?') ? '?' + window.location.hash.split('?')[1] : '');
    const params = new URLSearchParams(search);
    const ref = params.get('ref');
    if (ref) {
      localStorage.setItem('eintk_referrer_code', ref);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setShowOnlineToast(true);
      setTimeout(() => setShowOnlineToast(false), 4000);
      syncManager.flush();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  useEffect(() => {
    const checkPWAEnforcement = () => {
      const hostname = window.location.hostname;
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      const productionURLs = ['eintk.com.ng', 'www.eintk.com.ng', 'eintk.vercel.app', 'eintk-ebooks.web.app', 'eintk-ebooks.firebaseapp.com'];
      
      const userPrefersWeb = localStorage.getItem('eintk_prefer_web') === 'true';
      const isIOS = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
      const isInstallable = ('onbeforeinstallprompt' in window) || isIOS;

      if (productionURLs.includes(hostname) && !isStandalone && !userPrefersWeb && isInstallable) { 
          setIsMandatoryPWA(true); 
      } else { 
          setIsMandatoryPWA(false); 
      }
    };
    checkPWAEnforcement();
  }, []);

  useEffect(() => {
      const unsub = getMaintenanceStatus((status) => { setIsMaintenance(status); });
      return () => unsub();
  }, []);

  useEffect(() => {
    if (user && userData) {
        const unsubscribeSync = syncManager.subscribe(() => { refreshUserData(user.uid); });
        syncManager.setUserId(user.uid);
        syncManager.flush();
        
        // HEARTBEAT: Resume Ghost Sync only if setup is complete
        const isSetupComplete = localStorage.getItem('eintk_setup_complete') === 'true';
        if (isSetupComplete) {
            syncQueue.startGhostSync(userData as UserData);
        }

        const handleVisibilityChange = () => { if (document.visibilityState === 'hidden') syncManager.flush(); };
        const intervalId = window.setInterval(() => { 
            if (window.requestIdleCallback) window.requestIdleCallback(() => { 
                syncManager.flush(); 
                if (localStorage.getItem('eintk_setup_complete') === 'true') {
                    syncQueue.startGhostSync(userData as UserData); 
                }
            }); 
            else { 
                syncManager.flush(); 
                if (localStorage.getItem('eintk_setup_complete') === 'true') {
                    syncQueue.startGhostSync(userData as UserData); 
                }
            }
        }, 5 * 60 * 1000);
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => { 
            document.removeEventListener('visibilitychange', handleVisibilityChange); 
            clearInterval(intervalId); 
            unsubscribeSync();
        };
    } else {
        syncManager.setUserId(null);
    }
  }, [user, refreshUserData, userData]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        requestPersistence();
        refreshUserData(currentUser.uid).then(() => setLoading(false));
        const userRef = doc(db, 'users', currentUser.uid);
        const unsubUserData = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            const cloudData = docSnap.data() as UserData;
            
            // --- BATTLE QUOTA RESET LOGIC ---
            await checkAndResetBattleQuota(currentUser.uid, cloudData);

            const dirtyEntries = await syncManager.getDirtyData();
            let finalData = { ...cloudData };
            if (dirtyEntries.length > 0) {
                for (const entry of dirtyEntries) {
                    const keys = entry.field.split('.');
                    let current: any = finalData;
                    for (let i = 0; i < keys.length - 1; i++) {
                        if (!current[keys[i]]) current[keys[i]] = {};
                        current = current[keys[i]];
                    }
                    const lastKey = keys[keys.length - 1];
                    if (entry.op === 'ADD') { current[lastKey] = (current[lastKey] || 0) + entry.value; } 
                    else { current[lastKey] = entry.value; }
                }
            }
            await saveLocalUserData(finalData);
            setUserData(finalData);
            
            // --- AETHER CORE GATEKEEPER ---
            const hostname = window.location.hostname;
            const isDevEnv = hostname.includes('aistudio') || hostname.includes('localhost');
            const isPublicPath = ['/auth', '/about-us', '/privacy-policy', '/terms-of-service', '/contact-us'].includes(location.pathname);
            const isAdmin = finalData.role === 'central admin';

            // SOURCE OF TRUTH: Firestore defines if a plan exists.
            const hasPlanCloud = !!finalData.studyPlan;
            
            // Sync localStorage based on Cloud Source of Truth
            // If cloud has no plan, we MUST reset local to false to prevent bypassing.
            localStorage.setItem('eintk_plan_exists', hasPlanCloud ? 'true' : 'false');
            
            const planExists = localStorage.getItem('eintk_plan_exists') === 'true';
            const setupComplete = localStorage.getItem('eintk_setup_complete') === 'true';

            if (!isPublicPath && !isAdmin) {
                if (!planExists && !isDevEnv && location.pathname !== '/aether-setup') {
                    navigate('/aether-setup', { replace: true });
                } else if (planExists && !setupComplete && location.pathname !== '/setup' && location.pathname !== '/aether-setup') {
                    // Note: setupComplete is a local machine state (The 60s forge sequence)
                    // If plan exists in DB but user is on a new device/cleared cache, they re-run setup.
                    navigate('/setup', { replace: true });
                }
            }

            const timeNow = new Date();
            let isExpired = false;
            const safeDate = (v: any) => { if (!v) return null; if (v.toDate) return v.toDate(); if (v.seconds) return new Date(v.seconds * 1000); return new Date(v); };
            if (finalData.subscriptionStatus === 'pro') {
                const trialDate = safeDate(finalData.trialExpiryDate);
                const proDate = safeDate(finalData.proExpiryDate);
                if (proDate && timeNow > proDate) { if (!trialDate || timeNow > trialDate) isExpired = true; }
                else if (!proDate && trialDate && timeNow > trialDate) isExpired = true;
            } else if (finalData.subscriptionStatus === 'day_pass') {
                const dayPassExpiry = safeDate(finalData.dayPassExpiry);
                if (dayPassExpiry && timeNow > dayPassExpiry) isExpired = true;
            }
            if (isExpired) { await revertUserToFree(currentUser.uid); finalData.subscriptionStatus = 'free'; setUserData({ ...finalData }); }
            if (!streakProcessedRef.current) {
                const lastStudyDateRaw = finalData.lastStudyDate;
                if (lastStudyDateRaw) {
                    const last = safeDate(lastStudyDateRaw);
                    if (last) {
                        const today = new Date(); today.setHours(0,0,0,0);
                        const lastMid = new Date(last); lastMid.setHours(0,0,0,0);
                        const diffTime = today.getTime() - lastMid.getTime();
                        const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));
                        if (diffDays > 1) {
                            streakProcessedRef.current = true;
                            const freezes = finalData.inventory?.streakFreezes || 0;
                            const prevStreak = finalData.currentStreak || 0;
                            if (freezes > 0 && diffDays === 2) {
                                const newDate = new Date(today.getTime() - (1000 * 3600 * 24));
                                await updateDoc(userRef, { 'inventory.streakFreezes': freezes - 1, lastStudyDate: Timestamp.fromDate(newDate) });
                                navigate('/streak-maintenance', { state: { status: 'repaired', streak: prevStreak, freezesLeft: freezes - 1 } });
                            } else {
                                const stopLoopDate = new Date(today.getTime() - (1000 * 3600 * 24));
                                await updateDoc(userRef, { currentStreak: 0, lastStudyDate: Timestamp.fromDate(stopLoopDate) });
                                navigate('/streak-maintenance', { state: { status: 'lost', streak: prevStreak, freezesLeft: freezes } });
                            }
                        }
                    }
                }
            }
            const currentMonth = `${timeNow.getMonth() + 1}-${timeNow.getFullYear()}`;
            if (finalData.lastRefillMonth !== currentMonth) {
                const proExpiryDate = safeDate(finalData.proExpiryDate);
                const isFullPro = proExpiryDate && proExpiryDate > timeNow;
                const refillAmount = isFullPro ? 30000 : 50;
                await updateDoc(userRef, { energy: refillAmount, lastRefillMonth: currentMonth });
            }
            const localInstallId = getOrCreateInstallationId();
            const isAdminRole = finalData.role === 'central admin';
            const isBypassed = finalData.installationId === 'override' || finalData.installationId === 'none';
            if (!finalData.installationId && !isAdminRole) { updateDoc(userRef, { installationId: localInstallId }); } 
            else if (!isAdminRole && !isBypassed && finalData.installationId && finalData.installationId !== localInstallId) { setShowSessionAlert(true); logOut(); }
          }
          setLoading(false);
        }, () => setLoading(false));
        return () => unsubUserData();
      } else { 
          const publicPaths = ['/auth', '/about-us', '/privacy-policy', '/terms-of-service', '/contact-us'];
          if (!publicPaths.includes(location.pathname)) navigate('/auth');
          setUserData(null); setLoading(false); 
      }
    });
    return () => unsubscribe();
  }, [navigate, location.pathname, refreshUserData]);

  if (isMandatoryPWA) return <PWALandingPage />;
  if (loading) return <div className="flex items-center justify-center h-screen bg-gray-900"><LoadingSpinner /></div>;
  if (isMaintenance && userData?.role !== 'central admin') return <MaintenanceScreen />;

  const isSetupPage = location.pathname === '/setup' || location.pathname === '/aether-setup';
  const isAuthPage = location.pathname === '/auth';
  const isMaintenancePage = location.pathname === '/streak-maintenance';
  const shouldHideBottomNav = isSetupPage || isAuthPage || isMaintenancePage || location.pathname.startsWith('/general-reader/') || location.pathname.startsWith('/audiobook/') || location.pathname.startsWith('/high-stakes') || location.pathname.startsWith('/study-session/') || location.pathname.startsWith('/exam-qst-reader/');

  return (
    <div className={`min-h-screen bg-gray-900 text-gray-100 font-sans ${isSetupPage || isAuthPage || isMaintenancePage ? '' : 'pb-16'}`}>
      <PWAManager user={user} />
      {!isSetupPage && !isAuthPage && !isMaintenancePage && <GlobalAIChat userData={userData} />}
      <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-[2000] w-[90%] max-w-xs transition-all duration-500 pointer-events-none ${showOnlineToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="bg-gray-800 border border-green-500 rounded-full px-5 py-3 shadow-2xl flex items-center gap-3">
              <CheckCircle2 className="text-green-500" size={18} />
              <div className="flex flex-col">
                  <span className="text-xs font-black text-white uppercase tracking-wider">Back Online</span>
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Syncing progress...</span>
              </div>
          </div>
      </div>
      <Modal isOpen={showSessionAlert} title="Access Conflict" showCloseButton={false}>
          <div className="text-center">
              <p className="mb-4">Your account is being used on another device. For security, you've been logged out here.</p>
              <button onClick={() => { setShowSessionAlert(false); window.location.reload(); }} className="bg-orange-600 px-6 py-2 rounded-lg font-bold text-white">OK</button>
          </div>
      </Modal>
      <div className={`${isSetupPage || isAuthPage || isMaintenancePage ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6'}`}>
        <React.Suspense fallback={<div className="flex justify-center pt-20"><LoadingSpinner /></div>}>
          <Routes>
            <Route path="/aether-setup" element={<AetherSetupPage user={user} userData={userData} />} />
            <Route path="/setup" element={<SetupPage userData={userData} />} />
            <Route path="/streak-maintenance" element={<StreakMaintenancePage />} />
            <Route path="/" element={<LibraryPage user={user} userData={userData} />} />
            <Route path="/profile" element={<ProfilePage user={user} userData={userData} />} />
            <Route path="/referral" element={<ReferralPage user={user} userData={userData} />} />
            <Route path="/sparks" element={<SparksPage user={user} userData={userData} />} />
            <Route path="/creator" element={<AdminPage />} /> 
            <Route path="/admin" element={<ModeratorPage />} /> 
            <Route path="/social" element={<SocialPage />} />
            <Route path="/advertisement" element={<AdvertisementPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/about-us" element={<AboutUsPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms-of-service" element={<TermsOfServicePage />} />
            <Route path="/contact-us" element={<ContactUsPage user={user} />} />
            <Route path="/badges" element={<BadgesPage user={user} userData={userData} />} />
            <Route path="/study-session/:type/:id" element={<StudySessionPage user={user} userData={userData} />} />
            <Route path="/media" element={<MediaPage user={user} />} />
            <Route path="/upgrade" element={<UpgradePage user={user} userData={userData} />} />
            <Route path="/verify-payment" element={<VerifyPaymentPage user={user} />} />
            <Route path="/verify-sparks" element={<VerifySparksPage user={user} />} /> 
            <Route path="/high-stakes" element={<HighStakesPage user={user} />} />
            <Route path="/community" element={<CommunityPage user={user} userData={userData} />} />
            <Route path="/exams" element={<ExamsPage user={user} userData={userData} />} />
            <Route path="/arcade" element={<ArcadePage user={user} userData={userData} />} />
            <Route path="/leaderboard" element={<ArcadePage user={user} userData={userData} />} />
            <Route path="/ebook-reader/:ebookId" element={<EbookReaderPage user={user} userData={userData} />} />
            <Route path="/exam-qst-reader/:examId" element={<ExamQSTReaderPage user={user} userData={userData} />} />
            <Route path="/audiobook/:ebookId" element={<AudiobookPage user={user} userData={userData} />} />
            <Route path="/ebook-viewer/:ebookId" element={<EbookViewerPage user={user} userData={userData} />} />
            <Route path="/exam-qst-viewer/:examId" element={<ExamQSTViewerPage user={user} userData={userData} />} />
            <Route path="/general-reader/:ebookId" element={<GeneralReaderPage user={user} userData={userData} />} />
            <Route path="/general-viewer/:ebookId" element={<GeneralViewerPage user={user} userData={userData} />} />
            <Route path="/notes" element={<NotesPage user={user} userData={userData} />} />
            <Route path="/goals" element={<GoalsPage user={user} userData={userData} />} />
            <Route path="/tools" element={<ToolsPage user={user} userData={userData} />} />
            <Route path="/battle" element={<BattlePage user={user} userData={userData} />} />
            <Route path="/journal" element={<JournalPage />} />
          </Routes>
        </React.Suspense>
      </div>
      {!shouldHideBottomNav && <BottomNav isAdmin={userData?.role === 'central admin'} />}
    </div>
  );
};

export default App;
