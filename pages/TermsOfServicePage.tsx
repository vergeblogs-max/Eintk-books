import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const TermsOfServicePage: React.FC = () => {
    const navigate = useNavigate();
    const policyDate = "January 1, 2026";

    return (
        <div className="max-w-4xl mx-auto py-8 text-gray-300">
            <button onClick={() => navigate(-1)} className="flex items-center space-x-2 text-orange-500 mb-8 hover:text-orange-400 transition-colors">
                <ArrowLeft size={20}/>
                <span>Back</span>
            </button>
            
            <section>
                <h1 className="text-3xl font-bold text-orange-500 mb-4">Terms of Service</h1>
                <p className="mb-4 text-sm text-gray-500">Last Updated: {policyDate}</p>
                <div className="space-y-6 bg-gray-800 p-6 rounded-lg">
                    <div>
                        <h3 className="text-xl font-semibold text-white mb-2">1. Acceptance of Terms</h3>
                        <p>By creating an account and using the EINTK platform, you agree to be bound by these Terms of Service. If you do not agree, do not use the service.</p>
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold text-white mb-2">2. User Accounts</h3>
                        <p>You are responsible for safeguarding your account information, including your password. You agree to notify us immediately of any unauthorized use of your account.</p>
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold text-white mb-2">3. Intellectual Property</h3>
                        <p>All content provided on the platform, including the text, graphics, and eBooks, is the exclusive property of EINTK. The content is provided for your personal, non-commercial educational use only. You may not distribute, modify, or reproduce any content without our prior written consent.</p>
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold text-white mb-2">4. Disclaimer of Warranties</h3>
                        <p>The educational content on EINTK is provided "as is" for informational purposes. While we strive for accuracy and quality, we make no warranty that the content will be completely accurate, reliable, or error-free. You use the content at your own risk.</p>
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold text-white mb-2">5. Academic Success & Content Usage</h3>
                        <p>EINTK is built to enhance your understanding of complex subjects and break down difficult topics into clearer concepts. However, we do not guarantee specific grades or success in any official examinations (including but not limited to JAMB, WAEC, and NECO).</p>
                        <p className="mt-2">Our platform is designed to be a companion to your studies, not a total replacement for official school textbooks, classroom instructions, and recommended past question resources. Users are strongly advised not to depend solely on this application for their exam preparations. Your academic success is a result of consistent effort across multiple verified study sources.</p>
                    </div>
                     <div>
                        <h3 className="text-xl font-semibold text-white mb-2">6. Limitation of Liability</h3>
                        <p>EINTK shall not be liable for any indirect, incidental, or consequential damages, including but not limited to academic outcomes or personal study results, arising from the use of our platform or its content.</p>
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold text-white mb-2">7. Termination</h3>
                        <p>We reserve the right to terminate or suspend your account at our sole discretion, without notice, for conduct that we believe violates these Terms of Service or is harmful to other users of the platform.</p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default TermsOfServicePage;