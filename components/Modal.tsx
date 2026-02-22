
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose?: () => void; 
    title?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    showCloseButton?: boolean;
    zIndex?: number; 
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, showCloseButton = true, zIndex = 50 }) => {
    // Prevent background scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const zIndexStyle = { zIndex: zIndex };

    return (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={zIndexStyle}>
            {/* Backdrop with Blur */}
            <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-md max-h-[90vh] overflow-hidden animate-fade-in-up transform transition-all flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center shrink-0">
                    {title && <h3 className="text-xl font-bold text-orange-500">{title}</h3>}
                    {showCloseButton && onClose && (
                        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    )}
                </div>

                {/* Body */}
                <div className="px-6 py-6 text-gray-300 overflow-y-auto custom-scrollbar flex-grow">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="px-6 py-4 bg-gray-900/50 border-t border-gray-700 flex justify-end space-x-3 shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;
