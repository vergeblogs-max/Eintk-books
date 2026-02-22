
import React, { useState } from 'react';
import { UserData } from '../types';
import { Zap, Star, RefreshCw, Crown, X, Loader2 } from 'lucide-react';
import { convertSparksToEnergy, createSparksPaymentToken, buyDayPass } from '../services/firestoreService';
import Modal from './Modal';

interface WalletProps {
    userData: UserData;
    userId: string;
}

const SPARK_PACKAGES = [
    { amount: 100, price: '₦100', link: 'https://selar.com/750nh2j507' },
    { amount: 300, price: '₦300', link: 'https://selar.com/ts772x0635' },
    { amount: 500, price: '₦500', link: 'https://selar.com/1xot691fs3' },
    { amount: 1000, price: '₦1000', link: 'https://selar.com/v3721c605a' },
    { amount: 2000, price: '₦2000', link: 'https://selar.com/48914y9h98' },
];

const Wallet: React.FC<WalletProps> = ({ userData, userId }) => {
    const [showBuyModal, setShowBuyModal] = useState(false);
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [convertAmount, setConvertAmount] = useState(10);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const sparks = userData.sparks || 0;
    const energy = userData.energy || 0;
    const isPro = userData.subscriptionStatus === 'pro';
    const isDayPass = userData.subscriptionStatus === 'day_pass';

    const handleBuySparks = async (pkg: typeof SPARK_PACKAGES[0]) => {
        setIsLoading(true);
        try {
            // Create a token to track this purchase
            const tokenId = await createSparksPaymentToken(userId, pkg.amount);
            localStorage.setItem('sparksPaymentToken', tokenId);
            
            // Redirect to Selar
            const returnUrl = `${window.location.origin}/#/verify-sparks`;
            window.location.href = `${pkg.link}?return_url=${encodeURIComponent(returnUrl)}`;
        } catch (e) {
            console.error("Purchase failed", e);
            setError("Failed to initiate purchase.");
            setIsLoading(false);
        }
    };

    const handleConvert = async () => {
        if (sparks < convertAmount) {
            setError("Insufficient Sparks.");
            return;
        }
        setIsLoading(true);
        try {
            await convertSparksToEnergy(userId, convertAmount);
            setShowConvertModal(false);
            setConvertAmount(10);
        } catch (e) {
            console.error(e);
            setError("Conversion failed.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleBuyDayPass = async () => {
        if (sparks < 200) {
            setError("Need 200 Sparks for Day Pass.");
            return;
        }
        if (isPro || isDayPass) return;

        if (!confirm("Spend 200 Sparks for 24 hours of Pro access + 250 Energy?")) return;

        setIsLoading(true);
        try {
            await buyDayPass(userId);
            alert("Day Pass Activated! Enjoy Pro features.");
        } catch (e) {
            console.error(e);
            setError("Failed to activate Day Pass.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-lg mb-6">
            <h2 className="text-white font-bold mb-4 flex items-center">
                <Star className="text-yellow-500 mr-2" size={20} fill="currentColor"/> My Wallet
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Sparks Card */}
                <div className="bg-gray-900 p-3 rounded-lg border border-gray-700 flex flex-col items-center">
                    <span className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Sparks</span>
                    <span className="text-2xl font-black text-yellow-400 flex items-center">
                        {sparks} <Star size={16} className="ml-1 fill-current"/>
                    </span>
                    <button 
                        onClick={() => setShowBuyModal(true)}
                        className="mt-2 text-xs bg-yellow-600/20 text-yellow-500 px-3 py-1 rounded-full border border-yellow-600/50 hover:bg-yellow-600/40 transition-colors"
                    >
                        + Buy
                    </button>
                </div>

                {/* Energy Card */}
                <div className="bg-gray-900 p-3 rounded-lg border border-gray-700 flex flex-col items-center">
                    <span className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Energy</span>
                    <span className="text-2xl font-black text-green-400 flex items-center">
                        {energy} <Zap size={16} className="ml-1 fill-current"/>
                    </span>
                    <button 
                        onClick={() => setShowConvertModal(true)}
                        className="mt-2 text-xs bg-green-600/20 text-green-500 px-3 py-1 rounded-full border border-green-600/50 hover:bg-green-600/40 transition-colors"
                    >
                        Convert
                    </button>
                </div>
            </div>

            {/* Day Pass Option */}
            {!isPro && !isDayPass && (
                <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 p-3 rounded-lg border border-purple-500/30 flex justify-between items-center">
                    <div>
                        <p className="text-white font-bold text-sm flex items-center"><Crown size={14} className="mr-1 text-purple-400"/> Day Pass</p>
                        <p className="text-[10px] text-gray-400">24h Pro + 250 Energy</p>
                    </div>
                    <button 
                        onClick={handleBuyDayPass}
                        disabled={isLoading}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-1.5 rounded transition-colors"
                    >
                        200 Sparks
                    </button>
                </div>
            )}
            
            {isDayPass && (
                <div className="text-center text-xs text-purple-400 font-bold bg-purple-900/20 p-2 rounded border border-purple-500/30">
                    Day Pass Active
                </div>
            )}

            {/* --- MODALS --- */}

            {/* Buy Sparks Modal */}
            <Modal isOpen={showBuyModal} onClose={() => setShowBuyModal(false)} title="Top Up Sparks">
                <div className="grid grid-cols-1 gap-3 p-2">
                    {SPARK_PACKAGES.map((pkg) => (
                        <button 
                            key={pkg.amount}
                            onClick={() => handleBuySparks(pkg)}
                            disabled={isLoading}
                            className="flex justify-between items-center p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors border border-gray-600"
                        >
                            <span className="flex items-center text-yellow-400 font-bold">
                                {pkg.amount} <Star size={14} className="ml-1 fill-current"/>
                            </span>
                            <span className="text-white font-bold">{pkg.price}</span>
                        </button>
                    ))}
                    {isLoading && <p className="text-center text-gray-400 text-xs mt-2"><Loader2 className="inline animate-spin mr-1"/> Processing...</p>}
                    {error && <p className="text-center text-red-400 text-xs mt-2">{error}</p>}
                </div>
            </Modal>

            {/* Convert Modal */}
            <Modal isOpen={showConvertModal} onClose={() => setShowConvertModal(false)} title="Convert Sparks">
                <div className="text-center p-4">
                    <p className="text-gray-400 text-sm mb-4">Exchange Sparks for Energy. Rate: 1 Spark = 10 Energy.</p>
                    
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-yellow-400">{convertAmount}</p>
                            <p className="text-xs text-gray-500">Sparks</p>
                        </div>
                        <RefreshCw className="text-gray-600" />
                        <div className="text-center">
                            <p className="text-2xl font-bold text-green-400">{convertAmount * 10}</p>
                            <p className="text-xs text-gray-500">Energy</p>
                        </div>
                    </div>

                    <input 
                        type="range" 
                        min="10" 
                        max={Math.min(sparks, 500)} 
                        step="10" 
                        value={convertAmount}
                        onChange={(e) => setConvertAmount(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500 mb-6"
                    />

                    <button 
                        onClick={handleConvert}
                        disabled={isLoading || sparks < convertAmount}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg disabled:opacity-50 transition-colors"
                    >
                        {isLoading ? 'Converting...' : 'Confirm Conversion'}
                    </button>
                    {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
                </div>
            </Modal>
        </div>
    );
};

export default Wallet;
