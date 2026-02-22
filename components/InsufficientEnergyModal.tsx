
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BatteryLow, Zap, ArrowRight, Coins } from 'lucide-react';
import Modal from './Modal';

interface InsufficientEnergyModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentEnergy: number;
    requiredEnergy: number;
}

const InsufficientEnergyModal: React.FC<InsufficientEnergyModalProps> = ({ isOpen, onClose, currentEnergy, requiredEnergy }) => {
    const navigate = useNavigate();

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Low Energy"
        >
            <div className="text-center p-2">
                <div className="bg-red-900/20 p-5 rounded-full w-20 h-20 mx-auto flex items-center justify-center mb-6 border border-red-500/30">
                    <BatteryLow size={40} className="text-red-500 animate-pulse" />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2">Not Enough Actions</h3>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                    Performing this AI action requires <span className="text-white font-bold">{requiredEnergy} Energy</span>, but you only have <span className="text-red-400 font-bold">{currentEnergy}</span>.
                </p>

                <div className="bg-gray-900 p-4 rounded-xl border border-gray-700 mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-yellow-500/20 p-2 rounded-lg">
                            <Coins size={20} className="text-yellow-500" />
                        </div>
                        <div className="text-left">
                            <p className="text-xs text-gray-500 font-bold uppercase">Sparks Solution</p>
                            <p className="text-sm text-gray-200">Convert Sparks to Energy</p>
                        </div>
                    </div>
                    <ArrowRight size={16} className="text-gray-600" />
                </div>

                <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => {
                            onClose();
                            navigate('/sparks');
                        }}
                        className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl shadow-lg transition-transform hover:scale-105 flex items-center justify-center gap-2"
                    >
                        Visit Spark Shop
                    </button>
                    <button 
                        onClick={onClose}
                        className="text-gray-500 hover:text-white text-xs font-bold uppercase tracking-widest py-2"
                    >
                        Maybe Later
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default InsufficientEnergyModal;
