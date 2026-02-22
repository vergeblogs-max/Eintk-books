
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const PrivacyPolicyPage: React.FC = () => {
    const navigate = useNavigate();
    const policyDate = "December 12, 2025";

    return (
        <div className="max-w-4xl mx-auto py-8 text-gray-300">
            <button onClick={() => navigate(-1)} className="flex items-center space-x-2 text-orange-500 mb-8 hover:text-orange-400 transition-colors">
                <ArrowLeft size={20}/>
                <span>Back</span>
            </button>
            
            <section>
                <h1 className="text-4xl font-bold text-orange-500 mb-4">Privacy Policy</h1>
                <p className="mb-4 text-sm text-gray-500">Effective Date: {policyDate}</p>
                <div className="space-y-6 bg-gray-800 p-6 rounded-lg">
                    <div>
                        <h3 className="text-xl font-semibold text-white mb-2">1. Information We Collect</h3>
                        <ul className="list-disc list-inside space-y-2">
                            <li><strong>Account Information:</strong> When you create an account, we collect your username and email address.</li>
                            <li><strong>Usage Data:</strong> We track your purchased books, reading progress (e.g., current page), and a list of completed books to enhance your user experience.</li>
                            <li><strong>Contact Information:</strong> If you use our contact form, we collect your name, email, and any other information you provide.</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold text-white mb-2">2. How We Use Your Information</h3>
                        <ul className="list-disc list-inside space-y-2">
                            <li>To provide, operate, and maintain our services.</li>
                            <li>To personalize your library and display your reading progress.</li>
                            <li>To process your transactions and verify purchases made through our third-party payment processor (Selar).</li>
                            <li>To communicate with you, including responding to your support requests and contact form submissions.</li>
                        </ul>
                    </div>
                     <div>
                        <h3 className="text-xl font-semibold text-white mb-2">3. Data Security</h3>
                        <p>Your security is important to us. We utilize Firebase Authentication and Firestore, industry-standard services provided by Google, which employ robust security measures to protect your data. We do not sell your personal information to third parties.</p>
                    </div>
                     <div>
                        <h3 className="text-xl font-semibold text-white mb-2">4. Changes to This Policy</h3>
                        <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes.</p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default PrivacyPolicyPage;
