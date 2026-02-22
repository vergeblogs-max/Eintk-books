
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { addJournalEntry, getJournalEntries, updateJournalEntry, deleteJournalEntry } from '../services/firestoreService';
import type { JournalEntry } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { ArrowLeft, Save, Clock, Lock, Notebook, Pencil, Trash2, X, Check } from 'lucide-react';

const JournalPage: React.FC = () => {
    const navigate = useNavigate();
    const user = auth.currentUser;
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [newEntry, setNewEntry] = useState('');
    const [loading, setLoading] = useState(true);

    // Editing State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    useEffect(() => {
        if (!user) {
            navigate('/auth');
            return;
        }
        loadEntries();
    }, [user, navigate]);

    const loadEntries = () => {
        if (user) {
            getJournalEntries(user.uid).then(data => {
                setEntries(data);
                setLoading(false);
            });
        }
    };

    const handleSaveNew = async () => {
        if (!newEntry.trim() || !user) return;
        await addJournalEntry(user.uid, newEntry);
        setNewEntry('');
        loadEntries();
    };

    const startEditing = (entry: JournalEntry) => {
        setEditingId(entry.id);
        setEditContent(entry.content);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditContent('');
    };

    const saveEdit = async (entryId: string) => {
        if (!user || !editContent.trim()) return;
        setIsSavingEdit(true);
        try {
            await updateJournalEntry(user.uid, entryId, editContent);
            setEditingId(null);
            loadEntries();
        } catch (error) {
            console.error("Failed to update entry", error);
            alert("Failed to save changes.");
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleDelete = async (entryId: string) => {
        if (!user || !confirm("Are you sure you want to delete this entry? This cannot be undone.")) return;
        try {
            await deleteJournalEntry(user.uid, entryId);
            setEntries(prev => prev.filter(e => e.id !== entryId));
        } catch (error) {
            console.error("Failed to delete entry", error);
            alert("Failed to delete entry.");
        }
    };

    if (!user) return null;

    return (
        <div className="max-w-2xl mx-auto pb-20">
            <div className="flex items-center mb-6">
                <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-800 transition-colors"><ArrowLeft className="text-orange-500" /></button>
                <h1 className="text-2xl font-bold ml-2 text-white flex items-center"><Notebook className="mr-2"/> Study Journal</h1>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700 mb-8">
                <textarea 
                    value={newEntry} 
                    onChange={e => setNewEntry(e.target.value)} 
                    placeholder="Reflect on your study session. What did you learn today?" 
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-4 h-40 focus:ring-2 focus:ring-orange-500 text-gray-200 placeholder-gray-500 resize-none"
                />
                <div className="flex justify-end mt-4">
                    <button onClick={handleSaveNew} disabled={!newEntry.trim()} className="flex items-center px-6 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg font-bold text-white disabled:opacity-50 transition-colors">
                        <Save size={18} className="mr-2"/> Save Entry
                    </button>
                </div>
            </div>
            
            <h2 className="text-xl font-bold text-gray-300 mb-4">Previous Entries</h2>
            {loading ? <LoadingSpinner /> : (
                <div className="space-y-4">
                    {entries.length === 0 ? <p className="text-gray-500 text-center italic">Your journal is empty.</p> : 
                    entries.map(entry => (
                        <div key={entry.id} className="bg-gray-800 p-5 rounded-lg border border-gray-700 relative group">
                            {editingId === entry.id ? (
                                <div className="space-y-3">
                                    <textarea 
                                        value={editContent} 
                                        onChange={e => setEditContent(e.target.value)} 
                                        className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-gray-200 focus:ring-1 focus:ring-orange-500 resize-none min-h-[100px]"
                                    />
                                    <div className="flex justify-end space-x-2">
                                        <button onClick={cancelEditing} disabled={isSavingEdit} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm font-bold text-gray-300">Cancel</button>
                                        <button onClick={() => saveEdit(entry.id)} disabled={isSavingEdit} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm font-bold text-white flex items-center">
                                            {isSavingEdit ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center text-xs text-orange-400 font-mono">
                                            <Clock size={12} className="mr-1"/>
                                            {entry.createdAt?.toDate().toLocaleString()}
                                        </div>
                                        
                                        {/* Action Buttons */}
                                        <div className="flex space-x-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => startEditing(entry)} 
                                                className="p-1.5 bg-gray-700 hover:bg-blue-600 text-gray-300 hover:text-white rounded-md transition-colors"
                                                title="Edit"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(entry.id)} 
                                                className="p-1.5 bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white rounded-md transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{entry.content}</p>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default JournalPage;
