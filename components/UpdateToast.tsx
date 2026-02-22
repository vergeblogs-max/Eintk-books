
import React from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';

interface UpdateToastProps {
    show: boolean;
    onRefresh: () => void;
}

const UpdateToast: React.FC<UpdateToastProps> = ({ show, onRefresh }) => {
    if (!show) return null;

    return (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[2000] w-[90%] max-w-sm animate-slide-up-bottom">
            <div className="bg-gray-800 border-2 border-orange-500 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-orange-600/20 p-2 rounded-full">
                        <Sparkles size={20} className="text-orange-500 animate-pulse" />
                    </div>
                    <div>
                        <p className="text-white font-bold text-sm">Update Available</p>
                        <p className="text-gray-400 text-[10px] uppercase tracking-widest font-black">New features added</p>
                    </div>
                </div>
                <button 
                    onClick={onRefresh}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg"
                >
                    <RefreshCw size={14} />
                    Refresh
                </button>
            </div>
        </div>
    );
};

export default UpdateToast;
