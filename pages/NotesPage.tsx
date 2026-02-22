
import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import type { UserData, Bookmark as BookmarkType } from '../types';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Bookmark, Calendar, ChevronRight, Trash2, AlertCircle, BookOpen } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { deleteBookmark } from '../services/firestoreService';
import Modal from '../components/Modal';

interface NotesPageProps {
  user: User | null;
  userData: UserData | null;
}

const NotesPage: React.FC<NotesPageProps> = ({ user, userData }) => {
    const navigate = useNavigate();
    
    // Delete Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState<BookmarkType | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    if (!user || !userData) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh]">
                <LoadingSpinner />
            </div>
        );
    }

    if (userData.subscriptionStatus !== 'pro') {
        navigate('/upgrade');
        return null;
    }

    // Safety check: bookmarks might be undefined in DB
    const bookmarks = userData.bookmarks || [];

    // Group bookmarks by Ebook ID
    const groupedBookmarks = bookmarks.reduce((acc: Record<string, BookmarkType[]>, bookmark) => {
        const id = bookmark.ebookId || 'unknown';
        (acc[id] = acc[id] || []).push(bookmark);
        return acc;
    }, {} as Record<string, BookmarkType[]>);

    const initiateDelete = (bookmark: BookmarkType) => {
        setNoteToDelete(bookmark);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!user || !noteToDelete) return;
        setIsDeleting(true);
        try {
            await deleteBookmark(user.uid, noteToDelete);
            setShowDeleteModal(false);
            setNoteToDelete(null);
        } catch (error) {
            console.error("Error deleting note:", error);
            alert("Failed to delete note.");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div>
            <div className="flex items-center mb-6">
                <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-800 transition-colors">
                    <ArrowLeft className="text-orange-500" />
                </button>
                <div className="ml-4">
                    <h1 className="text-3xl font-bold text-orange-500">My Notes</h1>
                    <p className="text-gray-400 text-sm">You have {bookmarks.length} saved notes.</p>
                </div>
            </div>

            {bookmarks.length === 0 ? (
                <div className="text-center mt-20 flex flex-col items-center p-4">
                    <div className="bg-gray-800 p-6 rounded-full mb-4 border border-gray-700">
                         <Bookmark className="text-gray-500" size={48} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-200">No Notes Yet</h2>
                    <p className="text-gray-400 mt-2 max-w-xs text-center">
                        Read a book and click the bookmark icon to save important points here.
                    </p>
                    <Link to="/" className="mt-6 px-6 py-3 bg-orange-600 rounded-lg font-bold hover:bg-orange-700 transition-colors shadow-lg">Start Reading</Link>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(groupedBookmarks).map(([ebookId, items]) => {
                        const bookBookmarks = items as BookmarkType[];
                        const bookTitle = bookBookmarks[0]?.ebookTitle || 'Unknown Book';
                        
                        return (
                            <div key={ebookId} className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden shadow-sm">
                                <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex items-center">
                                    <h2 className="text-lg font-bold text-orange-400 truncate">{bookTitle}</h2>
                                </div>
                                <div className="p-4 space-y-4">
                                    {bookBookmarks.map(bookmark => (
                                        <div 
                                            key={bookmark.id} 
                                            className="bg-gray-800 p-5 rounded-lg border border-gray-700 hover:border-gray-600 transition-all shadow-md group relative"
                                        >
                                            {/* Header: Chapter & Actions */}
                                            <div className="flex justify-between items-start mb-3">
                                                <span className="text-xs font-bold text-gray-400 bg-black/30 px-2 py-1 rounded uppercase tracking-wide border border-gray-700">
                                                    {bookmark.chapterTitle}
                                                </span>
                                                <div className="flex items-center space-x-3">
                                                    {bookmark.createdAt && (
                                                        <span className="text-xs text-gray-500 flex items-center">
                                                            <Calendar size={10} className="mr-1"/>
                                                            {bookmark.createdAt.seconds 
                                                                ? new Date(bookmark.createdAt.seconds * 1000).toLocaleDateString()
                                                                : new Date(bookmark.createdAt).toLocaleDateString()
                                                            }
                                                        </span>
                                                    )}
                                                    <button 
                                                        onClick={() => initiateDelete(bookmark)}
                                                        className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-900/20 rounded-md transition-colors z-10"
                                                        title="Delete Note"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            {/* Note Content */}
                                            <p className="font-medium text-gray-200 text-base mb-3 leading-relaxed whitespace-pre-wrap">"{bookmark.note}"</p>
                                            
                                            {/* Highlighted Text Context */}
                                            {bookmark.highlightedText && (
                                                <div className="pl-3 border-l-2 border-orange-500/30 bg-black/20 p-2 rounded-r-md mb-4">
                                                    <p className="text-xs text-gray-500 italic line-clamp-3">...{bookmark.highlightedText}...</p>
                                                </div>
                                            )}
                                            
                                            {/* Conditional Go To Page Button */}
                                            {bookmark.highlightedText ? (
                                                <div className="flex justify-end mt-2 pt-2 border-t border-gray-700/50">
                                                    <Link 
                                                        to={`/ebook-reader/${bookmark.ebookId}`}
                                                        className="flex items-center text-xs font-bold text-orange-500 hover:text-white bg-orange-900/10 hover:bg-orange-600 border border-orange-500/20 hover:border-orange-600 px-3 py-1.5 rounded-full transition-all duration-300 group-hover:translate-x-1"
                                                    >
                                                        <BookOpen size={14} className="mr-1.5"/>
                                                        Go to page
                                                        <ChevronRight size={14} className="ml-1"/>
                                                    </Link>
                                                </div>
                                            ) : (
                                                /* For typed-only notes, preserve spacing but no button */
                                                <div className="h-2"></div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Custom Delete Confirmation Modal */}
            <Modal 
                isOpen={showDeleteModal} 
                onClose={() => setShowDeleteModal(false)} 
                title="Delete Note?"
                footer={
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setShowDeleteModal(false)} 
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-bold transition-colors text-sm"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmDelete} 
                            disabled={isDeleting}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-bold transition-colors text-sm flex items-center"
                        >
                            {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                        </button>
                    </div>
                }
            >
                <div className="text-center py-2">
                    <div className="bg-red-900/20 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-4 border border-red-500/30">
                        <Trash2 size={32} className="text-red-500" />
                    </div>
                    <p className="text-gray-300 text-base">
                        Are you sure you want to delete this note? 
                        <br/>
                        <span className="text-sm text-gray-500">This action cannot be undone.</span>
                    </p>
                </div>
            </Modal>
        </div>
    );
};

export default NotesPage;
