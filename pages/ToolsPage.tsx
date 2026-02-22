
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, FlaskConical, Lock, FileText } from 'lucide-react';
import { FORMULA_DATA } from '../data/formulaData';
import type { UserData } from '../types';
import type { User } from 'firebase/auth';
import PeriodicTable from '../components/PeriodicTable';

interface ToolsPageProps {
    user: User | null;
    userData: UserData | null;
}

declare global {
    interface Window {
      MathJax: {
        typesetPromise: (elements?: HTMLElement[]) => Promise<void>;
      };
    }
}

// --- FORMULA VAULT ---
const FormulaVault = () => {
    const [search, setSearch] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('All');
    const containerRef = useRef<HTMLDivElement>(null);

    // Extract unique subjects for the filter
    const subjects = useMemo(() => {
        const uniqueSubjects = Array.from(new Set(FORMULA_DATA.map(f => f.subject)));
        return ['All', ...uniqueSubjects.sort()];
    }, []);

    const filtered = FORMULA_DATA.filter(f => {
        const searchLower = search.toLowerCase();
        const matchesSearch = f.title.toLowerCase().includes(searchLower) || 
                              f.subject.toLowerCase().includes(searchLower) ||
                              f.category.toLowerCase().includes(searchLower) ||
                              f.description.toLowerCase().includes(searchLower);
        
        const matchesSubject = selectedSubject === 'All' || f.subject === selectedSubject;

        return matchesSearch && matchesSubject;
    });

    useEffect(() => {
        if (containerRef.current && window.MathJax) {
            // Small delay to ensure DOM is ready for typesetting
            setTimeout(() => {
                window.MathJax.typesetPromise([containerRef.current!]).catch(err => console.error(err));
            }, 50);
        }
    }, [filtered, selectedSubject]);

    return (
        <div className="space-y-4 w-full" ref={containerRef}>
            <div className="relative">
                <input 
                    type="text" 
                    placeholder="Search formulas (e.g. Area, Velocity)..." 
                    value={search} 
                    onChange={e => setSearch(e.target.value)} 
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 pl-10 pr-4 focus:ring-orange-500 text-white outline-none" 
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            </div>

            {/* Subject Filter Chips - Horizontally Scrollable */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 custom-scrollbar">
                {subjects.map(sub => (
                    <button
                        key={sub}
                        onClick={() => setSelectedSubject(sub)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border flex-shrink-0 ${
                            selectedSubject === sub
                                ? 'bg-orange-600 text-white border-orange-600'
                                : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600 hover:text-gray-200'
                        }`}
                    >
                        {sub}
                    </button>
                ))}
            </div>

            <div className="grid gap-4">
                {filtered.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No formulas found.</p>
                ) : (
                    filtered.map((f, i) => (
                        <div key={i} className="bg-gray-800 p-4 rounded-lg border-l-4 border-orange-500 shadow-md w-full overflow-hidden">
                            <div className="flex justify-between items-start mb-2">
                                <div className="min-w-0 pr-2">
                                    <h3 className="font-bold text-white text-lg truncate">{f.title}</h3>
                                    <p className="text-xs text-orange-400 truncate">{f.category}</p>
                                </div>
                                <span className="text-[10px] bg-gray-700 px-2 py-1 rounded text-gray-300 flex-shrink-0 whitespace-nowrap">{f.subject}</span>
                            </div>
                            
                            {/* MathJax Container - Handles internal overflow */}
                            <div className="my-3 bg-gray-900 p-4 rounded text-center text-green-400 text-xl overflow-x-auto custom-scrollbar flex justify-center items-center">
                                <div className="min-w-fit">
                                    {`\\[${f.formula}\\]`}
                                </div>
                            </div>
                            
                            <p className="text-sm text-gray-400 italic break-words">{f.description}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// --- MAIN PAGE ---
const ToolsPage: React.FC<ToolsPageProps> = ({ user, userData }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('formulas');
    const isPro = userData?.subscriptionStatus === 'pro';

    if (!user) return <div className="text-center mt-20 text-gray-400">Please log in to access tools.</div>;

    return (
        <div className="max-w-2xl mx-auto pb-24 px-4 w-full overflow-x-hidden">
            <div className="flex items-center mb-6">
                <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-800 transition-colors mr-2">
                    <ArrowLeft className="text-orange-500" />
                </button>
                <h1 className="text-2xl font-bold text-white">Tools & Resources</h1>
            </div>

            <div className="flex space-x-2 overflow-x-auto pb-2 mb-6 border-b border-gray-700 w-full no-scrollbar">
                <button onClick={() => setActiveTab('formulas')} className={`px-4 py-2 flex items-center whitespace-nowrap transition-colors ${activeTab === 'formulas' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-400 hover:text-white'}`}>
                    <FileText size={18} className="mr-2"/> Formulas
                </button>
                <button onClick={() => setActiveTab('periodic')} className={`px-4 py-2 flex items-center whitespace-nowrap transition-colors ${activeTab === 'periodic' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-400 hover:text-white'}`}>
                    <FlaskConical size={18} className="mr-2"/> Periodic Table
                </button>
            </div>

            <div className="w-full">
                {activeTab === 'formulas' && (isPro ? <FormulaVault /> : <LockedFeature title="Formula Vault" />)}
                {activeTab === 'periodic' && (isPro ? <PeriodicTable /> : <LockedFeature title="Periodic Table" />)}
            </div>
        </div>
    );
};

const LockedFeature = ({ title }: { title: string }) => (
    <div className="text-center py-12 bg-gray-800 rounded-xl border-2 border-dashed border-gray-700 w-full">
        <Lock size={48} className="mx-auto text-gray-500 mb-4"/>
        <h3 className="text-xl font-bold text-white">{title} is Locked</h3>
        <p className="text-gray-400 mt-2 mb-6">Upgrade to Pro to access this premium tool.</p>
        <a href="/#/upgrade" className="px-6 py-2 bg-orange-600 rounded-lg text-white font-bold inline-block hover:bg-orange-700 transition-colors">Go Pro</a>
    </div>
);

export default ToolsPage;
