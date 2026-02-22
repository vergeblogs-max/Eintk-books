
import React, { useState } from 'react';
import { PERIODIC_TABLE_DATA } from '../data/periodicTableData';
import Modal from './Modal';

const PeriodicTable: React.FC = () => {
    const [selectedElement, setSelectedElement] = useState<any>(null);

    const categories: Record<string, string> = {
        'Nonmetal': 'bg-blue-500',
        'Noble Gas': 'bg-purple-500',
        'Alkali Metal': 'bg-red-500',
        'Alkaline Earth': 'bg-orange-400',
        'Metalloid': 'bg-teal-500',
        'Halogen': 'bg-indigo-500',
        'Transition Metal': 'bg-yellow-600',
        'Post-transition': 'bg-green-500',
    };

    return (
        <div>
            <div className="grid grid-cols-5 gap-1 sm:gap-2 p-2 bg-gray-900 rounded-lg border border-gray-700 overflow-x-auto">
                {PERIODIC_TABLE_DATA.map(el => (
                    <div 
                        key={el.number} 
                        onClick={() => setSelectedElement(el)}
                        className={`${categories[el.category] || 'bg-gray-600'} p-1 sm:p-2 rounded cursor-pointer hover:scale-110 transition-transform flex flex-col items-center justify-center w-12 h-12 sm:w-16 sm:h-16`}
                    >
                        <span className="text-[8px] sm:text-xs text-white opacity-80">{el.number}</span>
                        <span className="text-sm sm:text-lg font-bold text-white">{el.symbol}</span>
                    </div>
                ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
                {Object.entries(categories).map(([cat, color]) => (
                    <div key={cat} className="flex items-center">
                        <div className={`w-3 h-3 ${color} rounded-full mr-1`}></div>
                        <span className="text-gray-400">{cat}</span>
                    </div>
                ))}
            </div>

            <Modal isOpen={!!selectedElement} onClose={() => setSelectedElement(null)} title="Element Details">
                {selectedElement && (
                    <div className="text-center">
                        <div className={`w-24 h-24 mx-auto ${categories[selectedElement.category]} rounded-lg flex items-center justify-center text-4xl font-bold text-white mb-4 shadow-lg`}>
                            {selectedElement.symbol}
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">{selectedElement.name}</h2>
                        <div className="grid grid-cols-2 gap-4 text-left bg-gray-700 p-4 rounded-lg">
                            <div>
                                <p className="text-gray-400 text-xs">Atomic Number</p>
                                <p className="text-white font-mono">{selectedElement.number}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs">Atomic Mass</p>
                                <p className="text-white font-mono">{selectedElement.mass}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs">Category</p>
                                <p className="text-white">{selectedElement.category}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs">Group/Period</p>
                                <p className="text-white">{selectedElement.group} / {selectedElement.period}</p>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default PeriodicTable;
