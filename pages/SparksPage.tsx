
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, Star, Zap, RefreshCw, Crown, Coins, ShoppingBag, Swords, 
    History, Info, Check, ChevronRight, Loader2, Sparkles, ShieldAlert, 
    ArrowDown, Trophy, Ticket, Eye, EyeOff, Play, Clock, AlertCircle,
    UserPlus, Lock, Package, CheckCircle, Search, Megaphone, Gift, ArrowRight, Wallet
} from 'lucide-react';
import type { UserData, Ebook } from '../types';
import type { User } from 'firebase/auth';
import { 
    convertSparksToEnergy, buyDayPass, createSparksPaymentToken, 
    buyStreakFreezes, buyKnowledgeTreeSkin, buyMegaphone, 
    buyBenefactorGift, buySubjectUnlock, equipSkin, getPublishedEbooks, searchAllUsers
} from '../services/firestoreService';
import { getTransactionHistory, recordTransaction } from '../services/ledgerService';
import { saveBatchBooksToOffline } from '../services/offlineService';
import Modal from '../components/Modal';
import HighStakesModal from '../components/HighStakesModal';
import { formatPoints } from '../utils/formatters';
import { NIGERIAN_CURRICULUM_SUBJECTS, SKIN_CONFIG } from '../constants';

interface SparksPageProps {
    user: User | null;
    userData: UserData | null;
}

const SPARK_PACKAGES = [
    { id: 'micro', name: 'Micro', amount: 100, price: '₦100', link: 'https://selar.com/750nh2j507' },
    { id: 'mini', name: 'Mini', amount: 300, price: '₦300', link: 'https://selar.com/ts772x0635' },
    { id: 'standard', name: 'Standard', amount: 500, price: '₦500', link: 'https://selar.com/1xot691fs3' },
    { id: 'mega', name: 'Mega', amount: 1000, price: '₦1000', link: 'https://selar.com/v3721c605a' },
    { id: 'jumbo', name: 'Jumbo', amount: 2000, price: '₦2000', link: 'https://selar.com/48914y9h98' },
];

const SKINS = [
    { id: 'default', cost: 0 },
    { id: 'frozen-pine', cost: 100 },
    { id: 'neon-cyber', cost: 200 },
    { id: 'golden-baobab', cost: 300 },
    { id: 'burning-iroko', cost: 400 },
    { id: 'void-willow', cost: 500 },
    { id: 'crystal-mangrove', cost: 600 },
    { id: 'solar-palm', cost: 700 },
    { id: 'emerald-bamboo', cost: 850 },
    { id: 'galactic-redwood', cost: 1000 },
];

const SparksPage: React.FC<SparksPageProps> = ({ user, userData }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'forge' | 'emporium'>('forge');
    const [emporiumTab, setEmporiumTab] = useState<'market' | 'inventory'>('market');
    
    // UI Flow States
    const [pendingPurchase, setPendingPurchase] = useState<{
        type: string;
        name: string;
        cost: number;
        action: () => Promise<void>;
        successMsg: string;
    } | null>(null);
    const [successInfo, setSuccessInfo] = useState<{ title: string; message: string } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    // Added missing isLoading state to fix errors on line 212
    const [isLoading, setIsLoading] = useState(false);

    // Specific Feature Modals
    const [showGiftModal, setShowGiftModal] = useState(false);
    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const [showFreezeModal, setShowFreezeModal] = useState(false);
    const [showHighStakesModal, setShowHighStakesModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    // Renamed history state to avoid conflict with browser History API and fix error on line 444
    const [transactionHistory, setTransactionHistory] = useState<any[]>([]);

    // Inputs
    const [energyInput, setEnergyInput] = useState<string>('');
    const [freezeQty, setFreezeQty] = useState(1);
    const [unlockSubject, setUnlockSubject] = useState('');
    const [giftSearch, setGiftSearch] = useState('');
    const [giftResults, setGiftResults] = useState<UserData[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const sparks = userData?.sparks || 0;
    const energy = userData?.energy || 0;

    // Search Debounce for Gifts
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (giftSearch.length >= 3) {
                setIsSearching(true);
                const res = await searchAllUsers(giftSearch);
                setGiftResults(res.filter(u => u.uid !== user?.uid));
                setIsSearching(false);
            } else setGiftResults([]);
        }, 500);
        return () => clearTimeout(timer);
    }, [giftSearch, user]);

    // Added Effect to fetch history when the modal opens
    useEffect(() => {
        if (showHistoryModal && user) {
            getTransactionHistory().then(setTransactionHistory).catch(console.error);
        }
    }, [showHistoryModal, user]);

    // --- PURCHASE EXECUTION ---
    const executePurchase = async () => {
        if (!pendingPurchase || !user) return;
        setIsProcessing(true);
        try {
            await pendingPurchase.action();
            setSuccessInfo({ title: 'Transaction Successful', message: pendingPurchase.successMsg });
            setPendingPurchase(null);
        } catch (e: any) {
            alert(e.message || "Transaction failed.");
        } finally {
            setIsProcessing(false);
        }
    };

    // --- MARKET TRIGGERS ---

    const triggerDayPass = () => {
        if (sparks < 200) { alert("Need 200 Sparks."); return; }
        setPendingPurchase({
            type: 'Day Pass',
            name: '24h Pro Access + 250 Energy',
            cost: 200,
            successMsg: 'Day Pass active! All Pro books and features are unlocked for 24 hours.',
            action: () => buyDayPass(user!.uid).then(() => recordTransaction({ type: 'spark', amount: -200, description: "Day Pass Purchase" }))
        });
    };

    const triggerFreeze = () => {
        const cost = 150 * freezeQty;
        if (sparks < cost) { alert(`Need ${cost} Sparks.`); return; }
        setPendingPurchase({
            type: 'Streak Freeze',
            name: `${freezeQty} Shield(s)`,
            cost,
            successMsg: `Secured ${freezeQty} Streak Freeze(s). Your consistency is safe.`,
            action: () => buyStreakFreezes(user!.uid, freezeQty).then(() => recordTransaction({ type: 'spark', amount: -cost, description: `Bought ${freezeQty} Streak Freezes` }))
        });
        setShowFreezeModal(false);
    };

    const triggerMegaphone = () => {
        if (sparks < 100) { alert("Need 100 Sparks."); return; }
        setPendingPurchase({
            type: 'Megaphone',
            name: 'Community Post Pin',
            cost: 100,
            successMsg: 'Megaphone added to inventory. Use it when posting to the community!',
            action: () => buyMegaphone(user!.uid).then(() => recordTransaction({ type: 'spark', amount: -100, description: "Bought Megaphone" }))
        });
    };

    const triggerUnlock = () => {
        if (sparks < 1000 || !unlockSubject) return;
        setPendingPurchase({
            type: 'Permanent Unlock',
            name: `Full ${unlockSubject} Library`,
            cost: 1000,
            successMsg: `${unlockSubject} is now permanently yours. All related Pro content is unlocked and downloaded.`,
            action: async () => {
                await buySubjectUnlock(user!.uid, unlockSubject);
                await recordTransaction({ type: 'spark', amount: -1000, description: `Unlocked ${unlockSubject}` });
                const books = await getPublishedEbooks();
                const filtered = books.filter(b => b.subject === unlockSubject);
                if (filtered.length > 0) await saveBatchBooksToOffline(filtered);
            }
        });
        setShowUnlockModal(false);
    };

    const triggerSkin = (skinId: string, cost: number) => {
        if (sparks < cost) { alert(`Need ${cost} Sparks.`); return; }
        setPendingPurchase({
            type: 'Tree Skin',
            name: SKIN_CONFIG[skinId].name,
            cost,
            successMsg: `The ${SKIN_CONFIG[skinId].name} skin is now equipped!`,
            action: () => buyKnowledgeTreeSkin(user!.uid, skinId, cost).then(() => recordTransaction({ type: 'spark', amount: -cost, description: `Bought ${SKIN_CONFIG[skinId].name} Skin` }))
        });
    };

    // --- OTHER HANDLERS ---
    const handleConvert = async () => {
        const cost = energyInput ? Math.ceil(parseInt(energyInput) / 10) : 0;
        if (cost <= 0 || cost > sparks || !user) return;
        setIsProcessing(true);
        try {
            await convertSparksToEnergy(user.uid, cost);
            await recordTransaction({ type: 'spark', amount: -cost, description: `Forged ${cost * 10} Energy` });
            setEnergyInput('');
            setSuccessInfo({ title: 'Energy Forged', message: `Successfully added ${cost * 10} Energy to your battery.` });
        } catch (e) { alert("Forge failed."); } finally { setIsProcessing(false); }
    };

    // --- RENDERS ---

    const renderForge = () => (
        <div className="space-y-10 animate-fade-in">
            <div className="bg-gray-800 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
                <div className="flex items-center gap-3 mb-8">
                    <div className="bg-green-600/20 p-3 rounded-2xl border border-green-500/20"><RefreshCw size={24} className="text-green-500" /></div>
                    <div><h3 className="text-lg font-black uppercase tracking-tighter">Energy Forge</h3><p className="text-xs text-gray-500">Convert Sparks to Action Potential</p></div>
                </div>
                <div className="space-y-6">
                    <input type="number" value={energyInput} onChange={(e) => setEnergyInput(e.target.value)} placeholder="0" className="w-full bg-gray-900 border border-white/5 rounded-3xl p-6 text-2xl font-black text-white outline-none focus:border-green-500/50 transition-all placeholder-gray-800"/>
                    <div className="bg-gray-900 p-6 rounded-[1.5rem] flex justify-between items-center border border-white/5">
                        <p className="text-xl font-black text-yellow-500 tracking-tighter">{Math.ceil(parseInt(energyInput || '0') / 10)} <span className="text-sm opacity-50 font-bold uppercase">Sparks</span></p>
                        <button onClick={handleConvert} disabled={!energyInput || parseInt(energyInput) <= 0 || (Math.ceil(parseInt(energyInput) / 10) > sparks) || isProcessing} className="px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all bg-green-600 hover:bg-green-500 text-white disabled:bg-gray-700 shadow-lg">{isProcessing ? <Loader2 size={18} className="animate-spin"/> : 'Forge'}</button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
                <h3 className="text-gray-500 font-bold uppercase tracking-widest text-[10px] ml-4 mb-2">Acquire Sparks</h3>
                {SPARK_PACKAGES.map((pkg) => (
                    <button key={pkg.id} onClick={() => { setIsLoading(true); createSparksPaymentToken(user!.uid, pkg.amount).then(tid => { localStorage.setItem('sparksPaymentToken', tid); window.location.href = `${pkg.link}?return_url=${encodeURIComponent(window.location.origin + '/#/verify-sparks')}`; }); }} disabled={isLoading} className="bg-gray-800 hover:bg-gray-750 border border-white/5 p-5 rounded-3xl flex items-center justify-between transition-all group active:scale-95">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gray-900 rounded-xl border border-white/5 group-hover:border-yellow-500/50 transition-colors text-yellow-500"><Star size={24} fill="currentColor"/></div>
                            <div className="text-left"><p className="text-[10px] text-gray-500 font-black uppercase mb-0.5">{pkg.name}</p><span className="text-xl font-black text-white">{pkg.amount} Sparks</span></div>
                        </div>
                        <span className="bg-gray-900 px-4 py-2 rounded-xl font-black text-sm text-green-500 border border-white/5">{pkg.price}</span>
                    </button>
                ))}
            </div>

            <div className="bg-gradient-to-br from-indigo-900/40 to-gray-900 p-8 rounded-[2.5rem] shadow-2xl border border-red-600/30 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Trophy size={100} className="text-red-600" /></div>
                <h4 className="text-3xl font-black text-white leading-none mb-4 italic tracking-tighter uppercase">High Stakes Arena</h4>
                <p className="text-white/60 text-sm mb-6 max-w-[200px]">30 Mixed Subject Questions. Score 26+ to win 20 Sparks.</p>
                <button onClick={() => setShowHighStakesModal(true)} disabled={energy < 60} className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${energy >= 60 ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'bg-gray-700 text-gray-500'}`}>{energy >= 60 ? 'Enter Arena (60E)' : 'Need 60 Energy'}</button>
            </div>
        </div>
    );

    const renderMarket = () => (
        <div className="grid grid-cols-1 gap-4 animate-fade-in pb-10">
            <div className="bg-gradient-to-r from-purple-900/60 to-blue-900/60 p-6 rounded-3xl border border-white/10 flex justify-between items-center shadow-xl">
                <div><p className="text-white font-black text-lg flex items-center uppercase tracking-tighter"><Ticket size={20} className="mr-2 text-purple-400" /> Day Pass</p><p className="text-xs text-purple-200/70">24h Pro + 250 Energy</p></div>
                <button onClick={triggerDayPass} className="bg-white text-purple-900 px-6 py-3 rounded-2xl font-black text-sm shadow-lg hover:bg-gray-100">200 SPARKS</button>
            </div>

            <div className="bg-gray-800 p-6 rounded-3xl border border-white/5 flex justify-between items-center shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-600/20 p-3 rounded-2xl"><Zap size={24} className="text-blue-500" /></div>
                    <div><h4 className="text-white font-black text-base uppercase tracking-tighter">Streak Freeze</h4><p className="text-xs text-gray-500">Protect consistency</p></div>
                </div>
                <button onClick={() => setShowFreezeModal(true)} className="bg-gray-900 border border-white/5 text-blue-400 px-5 py-3 rounded-2xl font-black text-sm">150 SPARKS</button>
            </div>

            <div className="bg-gray-800 p-6 rounded-3xl border border-white/5 flex justify-between items-center shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="bg-orange-600/20 p-3 rounded-2xl"><Megaphone size={24} className="text-orange-500" /></div>
                    <div><h4 className="text-white font-black text-base uppercase tracking-tighter">Megaphone</h4><p className="text-xs text-gray-500">Highlight community post</p></div>
                </div>
                <button onClick={triggerMegaphone} className="bg-gray-900 border border-white/5 text-orange-400 px-5 py-3 rounded-2xl font-black text-sm">100 SPARKS</button>
            </div>

            <div className="bg-gradient-to-r from-red-900/40 to-pink-900/40 p-6 rounded-3xl border border-red-500/20 flex justify-between items-center shadow-xl">
                <div><p className="text-white font-black text-lg flex items-center uppercase tracking-tighter"><Gift size={20} className="mr-2 text-pink-500" /> Benefactor</p><p className="text-xs text-pink-200/70">Gift Pro to a friend</p></div>
                <button onClick={() => setShowGiftModal(true)} className="bg-pink-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg">300 SPARKS</button>
            </div>

            <div className="bg-gray-800 p-6 rounded-3xl border border-yellow-500/20 flex justify-between items-center shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="bg-yellow-600/20 p-3 rounded-2xl"><Lock size={24} className="text-yellow-500" /></div>
                    <div><h4 className="text-white font-black text-base uppercase tracking-tighter">Subject Unlock</h4><p className="text-xs text-gray-500">Permanent Pro Access</p></div>
                </div>
                <button onClick={() => setShowUnlockModal(true)} className="bg-yellow-600 text-white px-5 py-3 rounded-2xl font-black text-sm shadow-lg">1000 SPARKS</button>
            </div>

            <h3 className="text-gray-500 font-bold uppercase tracking-widest text-[10px] ml-4 mt-6">Knowledge Tree Skins</h3>
            <div className="grid grid-cols-2 gap-3">
                {SKINS.filter(s => s.id !== 'default').map(skin => {
                    const config = SKIN_CONFIG[skin.id];
                    const isOwned = userData?.inventory?.ownedSkins?.includes(skin.id);
                    return (
                        <div key={skin.id} className="bg-gray-800 p-4 rounded-3xl border border-white/5 flex flex-col items-center text-center shadow-lg group relative overflow-hidden">
                            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${config.gradient} mb-3 border ${config.border} ${config.glow}`}></div>
                            <span className="text-[10px] font-black text-white uppercase tracking-tighter mb-2">{config.name}</span>
                            {isOwned ? (
                                <span className="text-[8px] font-black text-green-500 uppercase tracking-widest bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">Owned</span>
                            ) : (
                                <button onClick={() => triggerSkin(skin.id, skin.cost)} className="w-full bg-gray-900 hover:bg-white hover:text-black py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1 border border-white/5">{skin.cost} SPARKS</button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const renderInventory = () => (
        <div className="space-y-10 animate-fade-in pb-10">
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800 p-6 rounded-[2rem] border border-white/5 text-center group">
                    <Zap size={24} className="mx-auto mb-2 text-blue-400 group-hover:scale-110 transition-transform" />
                    <p className="text-2xl font-black text-white">{userData?.inventory?.streakFreezes || 0}</p>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Freezes</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-[2rem] border border-white/5 text-center group">
                    <Megaphone size={24} className="mx-auto mb-2 text-orange-400 group-hover:scale-110 transition-transform" />
                    <p className="text-2xl font-black text-white">{userData?.inventory?.megaphoneCount || 0}</p>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Megaphones</p>
                </div>
            </div>
            <div>
                <h3 className="text-gray-500 font-bold uppercase tracking-widest text-[10px] ml-4 mb-4">Equip Tree Skin</h3>
                <div className="grid grid-cols-1 gap-2">
                    {SKINS.map(skin => {
                        const config = SKIN_CONFIG[skin.id];
                        const isOwned = skin.id === 'default' || userData?.inventory?.ownedSkins?.includes(skin.id);
                        const isActive = userData?.inventory?.activeSkinId === skin.id || (!userData?.inventory?.activeSkinId && skin.id === 'default');
                        if (!isOwned) return null;
                        return (
                            <button key={skin.id} onClick={() => equipSkin(user?.uid || '', skin.id)} className={`p-4 rounded-2xl flex items-center justify-between border transition-all ${isActive ? 'bg-orange-600 border-orange-500 text-white shadow-lg' : 'bg-gray-800 border-white/5 text-gray-400 hover:border-gray-600'}`}>
                                <div className="flex items-center gap-3"><div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${config.gradient} border ${config.border}`}></div><span className="font-black text-sm uppercase tracking-tighter">{config.name}</span></div>
                                {isActive ? <CheckCircle size={18} /> : <div className="w-5 h-5 rounded-full border-2 border-gray-600"></div>}
                            </button>
                        );
                    })}
                </div>
            </div>
            {userData?.inventory?.unlockedSubjects && userData.inventory.unlockedSubjects.length > 0 && (
                <div>
                    <h3 className="text-gray-500 font-bold uppercase tracking-widest text-[10px] ml-4 mb-4">Permanent Subjects</h3>
                    <div className="flex flex-wrap gap-2">{userData.inventory.unlockedSubjects.map(sub => (<div key={sub} className="bg-yellow-900/20 border border-yellow-500/30 text-yellow-500 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2"><Crown size={14} fill="currentColor"/> {sub}</div>))}</div>
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-[#111827] text-white p-4 pb-20 font-sans max-w-2xl mx-auto">
            {/* Header */}
            <header className="flex justify-between items-center mb-10 sticky top-0 z-50 bg-[#111827]/80 backdrop-blur-xl py-3">
                <button onClick={() => navigate(-1)} className="p-2.5 bg-gray-800 rounded-2xl text-orange-500 border border-white/5"><ArrowLeft size={22} /></button>
                <div className="text-center"><h1 className="text-xl font-black uppercase tracking-tighter">Spark Hub</h1><p className="text-[9px] text-gray-500 font-bold tracking-[0.2em] uppercase">Economy & Marketplace</p></div>
                <button onClick={() => setShowHistoryModal(true)} className="p-2.5 bg-gray-800 rounded-2xl text-gray-400 border border-white/5"><History size={20} /></button>
            </header>

            <div className="flex bg-gray-900 rounded-3xl p-1.5 mb-10 border border-white/5 shadow-2xl sticky top-20 z-40">
                <button onClick={() => setActiveTab('forge')} className={`flex-1 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'forge' ? 'bg-gray-800 text-white shadow-xl' : 'text-gray-500 hover:text-gray-300'}`}><RefreshCw size={14} className={activeTab === 'forge' ? 'animate-spin-slow' : ''}/> The Forge</button>
                <button onClick={() => setActiveTab('emporium')} className={`flex-1 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'emporium' ? 'bg-orange-600 text-white shadow-xl shadow-orange-900/20' : 'text-gray-500 hover:text-gray-300'}`}><ShoppingBag size={14}/> The Emporium</button>
            </div>

            {activeTab === 'forge' ? renderForge() : (
                <>
                    <div className="flex gap-2 mb-8 bg-gray-900/50 p-1 rounded-2xl border border-white/5 w-fit mx-auto">
                        <button onClick={() => setEmporiumTab('market')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${emporiumTab === 'market' ? 'bg-gray-700 text-white shadow-md' : 'text-gray-500'}`}>Market</button>
                        <button onClick={() => setEmporiumTab('inventory')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${emporiumTab === 'inventory' ? 'bg-gray-700 text-white shadow-md' : 'text-gray-500'}`}>Inventory</button>
                    </div>
                    {emporiumTab === 'market' ? renderMarket() : renderInventory()}
                </>
            )}

            {/* --- CORE MODALS --- */}

            {/* CONFIRMATION MODAL */}
            <Modal isOpen={!!pendingPurchase} onClose={() => setPendingPurchase(null)} title="Confirm Transaction">
                {pendingPurchase && (
                    <div className="text-center p-2">
                        <div className="bg-orange-600/10 p-5 rounded-full w-20 h-20 mx-auto flex items-center justify-center mb-6 border border-orange-500/20">
                            <ShoppingBag size={40} className="text-orange-500" />
                        </div>
                        <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">{pendingPurchase.type}</h3>
                        <p className="text-gray-400 text-sm mb-8">{pendingPurchase.name}</p>
                        <div className="bg-gray-900 p-6 rounded-[2rem] border border-white/5 mb-8 flex justify-between items-center">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Cost</span>
                            <span className="text-2xl font-black text-yellow-500">{pendingPurchase.cost} <Star className="inline mb-1" size={18} fill="currentColor"/></span>
                        </div>
                        <div className="flex flex-col gap-3">
                            <button onClick={executePurchase} disabled={isProcessing} className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl shadow-xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs">
                                {isProcessing ? <Loader2 className="animate-spin" size={18}/> : 'Complete Purchase'}
                            </button>
                            <button onClick={() => setPendingPurchase(null)} className="text-gray-500 font-bold uppercase tracking-widest text-[10px] py-2">Abort</button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* SUCCESS MODAL */}
            <Modal isOpen={!!successInfo} onClose={() => setSuccessInfo(null)} title="Transaction Complete">
                {successInfo && (
                    <div className="text-center p-2">
                        <div className="bg-green-500/20 p-5 rounded-full w-24 h-24 mx-auto flex items-center justify-center mb-6 border border-green-500/30">
                            <CheckCircle size={56} className="text-green-500" />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-tighter italic">{successInfo.title}</h3>
                        <p className="text-gray-300 mb-10 leading-relaxed text-sm">{successInfo.message}</p>
                        <button onClick={() => setSuccessInfo(null)} className="w-full py-4 bg-gray-800 hover:bg-gray-700 text-white font-black rounded-2xl uppercase tracking-[0.2em] text-xs">Acknowledge</button>
                    </div>
                )}
            </Modal>

            <HighStakesModal isOpen={showHighStakesModal} onClose={() => setShowHighStakesModal(false)} userId={user?.uid || ''} onSuccess={(s) => setSuccessInfo({ title: 'Arena Loot Claimed', message: `Victory! +${s} Sparks have been deposited into your Knowledge Vault.` })}/>

            {/* Gift Modal */}
            <Modal isOpen={showGiftModal} onClose={() => setShowGiftModal(false)} title="The Benefactor">
                <div className="space-y-4 pt-2">
                    <p className="text-xs text-gray-400">Search for a username to gift 24h of Pro access.</p>
                    <div className="relative">
                        <input value={giftSearch} onChange={e => setGiftSearch(e.target.value)} placeholder="Type username..." className="w-full bg-gray-900 border border-white/5 rounded-2xl p-4 text-white outline-none focus:border-pink-500/50 pl-12"/>
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
                        {isSearching ? <div className="flex justify-center py-4"><Loader2 className="animate-spin text-pink-500" /></div> : 
                        giftResults.map(res => (
                            <button key={res.uid} onClick={() => { setShowGiftModal(false); setPendingPurchase({ type: 'Gift Pass', name: `24h Pro for ${res.username}`, cost: 300, successMsg: `Pro access granted to ${res.username}!`, action: () => buyBenefactorGift(user!.uid, res.username).then(() => recordTransaction({ type: 'spark', amount: -300, description: `Gifted Day Pass to ${res.username}` })) }); }} className="w-full p-4 bg-gray-800 rounded-2xl border border-white/5 flex items-center justify-between hover:border-pink-500/50 transition-all">
                                <div className="flex items-center gap-3"><img src={res.profilePictureUrl} className="w-10 h-10 rounded-xl object-cover" /><span className="font-bold text-white">{res.username}</span></div>
                                <ArrowRight size={16} className="text-gray-500" />
                            </button>
                        ))}
                    </div>
                </div>
            </Modal>

            {/* Unlock Modal */}
            <Modal isOpen={showUnlockModal} onClose={() => setShowUnlockModal(false)} title="Subject Unlock">
                <div className="space-y-4 pt-2">
                    <p className="text-xs text-gray-400">Select a subject to unlock permanently for 1000 Sparks.</p>
                    <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                        {Object.keys(NIGERIAN_CURRICULUM_SUBJECTS).sort().map(sub => (
                            <button key={sub} onClick={() => setUnlockSubject(sub)} className={`p-3 rounded-xl border text-xs font-bold transition-all ${unlockSubject === sub ? 'bg-yellow-600 border-yellow-500 text-white' : 'bg-gray-800 border-white/5 text-gray-400'}`}>{sub}</button>
                        ))}
                    </div>
                    <button onClick={triggerUnlock} disabled={!unlockSubject} className="w-full py-4 bg-yellow-600 hover:bg-yellow-500 text-white font-black rounded-2xl mt-4 shadow-lg flex items-center justify-center gap-2 uppercase tracking-widest text-xs">Unlock Selected</button>
                </div>
            </Modal>

            {/* Freeze Modal */}
            <Modal isOpen={showFreezeModal} onClose={() => setShowFreezeModal(false)} title="Streak Freeze">
                <div className="text-center p-4">
                    <div className="bg-blue-600/20 p-5 rounded-full w-20 h-20 mx-auto flex items-center justify-center mb-6 border border-blue-500/30"><ShieldAlert size={40} className="text-blue-500 animate-pulse" /></div>
                    <p className="text-sm text-gray-400 mb-6">How many freezes do you want to secure? Each costs 150 Sparks.</p>
                    <div className="flex items-center justify-center gap-6 mb-8">
                        <button onClick={() => setFreezeQty(q => Math.max(1, q-1))} className="w-12 h-12 bg-gray-800 rounded-2xl border border-white/5 font-black text-2xl">-</button>
                        <span className="text-4xl font-black text-white">{freezeQty}</span>
                        <button onClick={() => setFreezeQty(q => Math.min(10, q+1))} className="w-12 h-12 bg-gray-800 rounded-2xl border border-white/5 font-black text-2xl">+</button>
                    </div>
                    <button onClick={triggerFreeze} className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-xs">Purchase Shield</button>
                </div>
            </Modal>

            {/* History Modal */}
            <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title="Vault Ledger">
                <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar p-1">
                    {transactionHistory.length === 0 && <p className="text-center text-gray-500 py-20 italic">Ledger is empty.</p>}
                    {transactionHistory.map(tx => (
                        <div key={tx.id} className="p-4 bg-gray-800 rounded-2xl border border-white/5 flex justify-between items-center shadow-lg">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-xl ${tx.amount > 0 ? 'bg-green-900/20 text-green-500' : 'bg-red-900/20 text-red-500'}`}>{tx.type === 'spark' ? <Star size={16} fill="currentColor"/> : <Zap size={16} fill="currentColor"/>}</div>
                                <div className="overflow-hidden"><p className="text-sm font-bold text-white truncate max-w-[140px]">{tx.description}</p><p className="text-[9px] text-gray-500 font-mono">{new Date(tx.timestamp).toLocaleString()}</p></div>
                            </div>
                            <span className={`text-sm font-black ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>{tx.amount > 0 ? '+' : ''}{tx.amount}</span>
                        </div>
                    ))}
                </div>
            </Modal>
        </div>
    );
};

export default SparksPage;
