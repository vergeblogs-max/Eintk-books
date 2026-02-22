
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import { ArrowLeft, Send, MessageCircle } from 'lucide-react';
import { saveContactSubmission } from '../services/firestoreService';

interface ContactUsPageProps {
    user: User | null;
}

const REASONS = [
    "Suggest a new Book",
    "Suggest a new Game",
    "Suggest a new Exam Category",
    "Suggest a feature",
    "Report a Bug",
    "Report Content Error (Typos/Facts)",
    "Report a Broken Link",
    "Report a Video Issue",
    "Payment Issue - Subscription not active",
    "Payment Issue - Double Charge",
    "Account Issue - Login problems",
    "Account Issue - Profile update",
    "Account Issue - Forgotten Password / Recovery",
    "Request Account Deletion",
    "General Feedback",
    "Partnership Inquiry",
    "Sponsorship & Advertisement",
    "Bulk School Licensing / Portal",
    "Scholarship Support Inquiry",
    "Brand Ambassador Application",
    "Copyright / Content Takedown Request",
    "Become a Content Contributor",
    "Technical Support",
    "Suggest a Study Deck topic",
    "Suggest a Community Quiz topic",
    "Game - Level too hard",
    "Game - Glitch report",
    "Request for specific past questions",
    "Complaint about a user",
    "Privacy Concern",
    "Accessibility Issue",
    "App Performance/Speed",
    "Question about Badges",
    "Question about Points/Leaderboard",
    "Other"
];

const ContactUsPage: React.FC<ContactUsPageProps> = ({ user }) => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        whatsapp: '',
        reason: '',
        message: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (user) {
            setFormData(prev => ({ ...prev, name: user.displayName || '', email: user.email || '' }));
        }
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.reason || !formData.message) {
            setError('Please fill out all required fields.');
            return;
        }
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await saveContactSubmission({
                ...formData,
                userId: user?.uid,
            });
            setSuccess('Your message has been sent successfully! We will get back to you shortly.');
            setFormData({ name: '', email: '', whatsapp: '', reason: '', message: '' });
        } catch (err: any) {
            setError('Failed to send message. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-8 text-gray-300">
            <button onClick={() => navigate(-1)} className="flex items-center space-x-2 text-orange-500 mb-8 hover:text-orange-400 transition-colors">
                <ArrowLeft size={20}/>
                <span>Back</span>
            </button>
            <div className="bg-gray-800 p-8 rounded-lg shadow-lg">
                <h1 className="text-3xl font-bold text-orange-500 mb-2">Contact Us</h1>
                <p className="text-gray-400 mb-6">Have a question or feedback? We'd love to hear from you.</p>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-300">Full Name</label>
                            <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500" />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email Address</label>
                            <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500" />
                        </div>
                    </div>
                     <div>
                        <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-300">WhatsApp Number (Optional)</label>
                        <input type="tel" name="whatsapp" id="whatsapp" value={formData.whatsapp} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500" />
                    </div>
                     <div>
                        <label htmlFor="reason" className="block text-sm font-medium text-gray-300">Reason for Contact</label>
                        <select name="reason" id="reason" value={formData.reason} onChange={handleChange} required className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-sm">
                            <option value="">-- Select a Topic --</option>
                            {REASONS.map(reason => (
                                <option key={reason} value={reason}>{reason}</option>
                            ))}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="message" className="block text-sm font-medium text-gray-300">Message</label>
                        <textarea name="message" id="message" rows={5} value={formData.message} onChange={handleChange} required className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"></textarea>
                    </div>

                    {error && <p className="text-sm text-red-500">{error}</p>}
                    {success && <p className="text-sm text-green-500">{success}</p>}
                    
                    <div>
                        <button type="submit" disabled={loading} className="w-full flex justify-center items-center space-x-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-gray-500">
                           {loading ? 'Sending...' : 'Send Message'}
                           {!loading && <Send size={16}/>}
                        </button>
                    </div>
                </form>

                <div className="mt-12 pt-8 border-t border-gray-700 text-center">
                    <p className="text-gray-400 mb-4">Message us for any personal questions.</p>
                    <a 
                        href="https://wa.me/2349162242604" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-6 py-3 bg-[#25D366] hover:bg-[#20b85c] text-white font-bold rounded-xl transition-all shadow-lg hover:scale-105 active:scale-95"
                    >
                        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white mr-3"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                        Chat on WhatsApp
                    </a>
                </div>
            </div>
        </div>
    );
};

export default ContactUsPage;
