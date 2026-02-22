
import React, { useState } from 'react';
import { X, Calculator, Delete } from 'lucide-react';

interface CalculatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    zIndex?: number;
}

const CalculatorModal: React.FC<CalculatorModalProps> = ({ isOpen, onClose, zIndex = 50 }) => {
    const [display, setDisplay] = useState('');

    if (!isOpen) return null;

    const handleBtn = (val: string) => {
        if (val === 'C') setDisplay('');
        else if (val === 'DEL') setDisplay(display.slice(0, -1));
        else if (val === '=') {
            try {
                // Replace scientific functions for evaluation
                let expr = display
                    .replace(/sin/g, 'Math.sin')
                    .replace(/cos/g, 'Math.cos')
                    .replace(/tan/g, 'Math.tan')
                    .replace(/log/g, 'Math.log10')
                    .replace(/ln/g, 'Math.log')
                    .replace(/\^/g, '**')
                    .replace(/π/g, 'Math.PI')
                    .replace(/e/g, 'Math.E')
                    .replace(/sqrt/g, 'Math.sqrt');
                
                // Safe eval alternative
                const result = Function('"use strict";return (' + expr + ')')();
                setDisplay(String(result));
            } catch (e) {
                setDisplay('Error');
            }
        } else if (['sin', 'cos', 'tan', 'log', 'ln', 'sqrt'].includes(val)) {
            setDisplay(prev => prev + val + '(');
        } else {
            setDisplay(prev => prev + val);
        }
    };

    const sciBtns = [
        'sin', 'cos', 'tan', 'log',
        'ln', '(', ')', '^',
        'sqrt', 'π', 'e', 'DEL'
    ];
    
    const numBtns = [
        '7', '8', '9', '/',
        '4', '5', '6', '*',
        '1', '2', '3', '-',
        '0', '.', '=', '+'
    ];

    return (
        <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none" style={{ zIndex }}>
            {/* Backdrop is handled by the parent container or implied z-index stacking */}
            <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-600 w-full max-w-sm pointer-events-auto animate-fade-in-up">
                <div className="flex justify-between items-center p-3 border-b border-gray-700 bg-gray-900 rounded-t-xl">
                    <h3 className="text-white font-bold flex items-center"><Calculator size={16} className="mr-2 text-orange-500"/> Scientific Calc</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
                </div>
                <div className="p-4">
                    <div className="bg-gray-900 p-3 rounded-lg mb-4 text-right text-2xl font-mono text-green-400 min-h-[60px] overflow-x-auto border border-gray-700 whitespace-nowrap">
                        {display || '0'}
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2 mb-2">
                        {sciBtns.map(b => (
                            <button key={b} onClick={() => handleBtn(b)} className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-bold text-orange-300 transition-colors active:bg-gray-500">
                                {b}
                            </button>
                        ))}
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2">
                        {numBtns.map(b => (
                            <button key={b} onClick={() => handleBtn(b)} className={`p-3 rounded text-lg font-bold text-white transition-colors active:bg-gray-500 ${['=', 'C'].includes(b) ? 'bg-orange-600 hover:bg-orange-700' : 'bg-gray-600 hover:bg-gray-500'}`}>
                                {b}
                            </button>
                        ))}
                        <button onClick={() => handleBtn('C')} className="col-span-4 p-2 bg-red-600 hover:bg-red-700 rounded font-bold text-white mt-1">CLEAR</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalculatorModal;
