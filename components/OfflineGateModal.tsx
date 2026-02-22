
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { WifiOff, Crown, ArrowLeft, Globe } from 'lucide-react';
import Modal from './Modal';

interface OfflineGateModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
}

const OfflineGateModal: React.FC<OfflineGateModalProps> = ({ isOpen, onClose, title = "Offline Access Restricted" }) => {
    const navigate = useNavigate();

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={title}
            showCloseButton={false}
        >
            <div className="text-center p-2">
                <div className="bg-orange-600/20 p-5 rounded-full w-20 h-20 mx-auto flex items-center justify-center mb-6 border border-orange-500/30">
                    <WifiOff size={40} className="text-orange-500" />
                </div>
                
                <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tighter italic">Pro Feature Only</h3>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                    You are currently offline. The <strong>Offline Library</strong> is a premium feature that allows Pro members to master their subjects without using any data.
                </p>

                <div className="bg-gray-900 p-4 rounded-xl border border-gray-700 mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600/20 p-2 rounded-lg">
                            <Globe size={20} className="text-blue-400" />
                        </div>
                        <div className="text-left">
                            <p className="text-xs text-gray-500 font-bold uppercase">Requirement</p>
                            <p className="text-sm text-gray-200">Connect to the Internet</p>
                        </div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                </div>

                <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => navigate('/upgrade')}
                        className="w-full py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-black rounded-xl shadow-lg transition-transform hover:scale-105 flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                    >
                        <Crown size={16} fill="currentColor"/> Unlock Offline Access
                    </button>
                    <button 
                        onClick={() => navigate('/')}
                        className="flex items-center justify-center gap-2 text-gray-500 hover:text-white text-xs font-bold uppercase tracking-widest py-2 transition-colors"
                    >
                        <ArrowLeft size={14} /> Back to Library
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default OfflineGateModal;
