
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Code, BookOpen, UserCheck } from 'lucide-react';

const AboutUsPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="max-w-4xl mx-auto py-8 text-gray-300">
            <button onClick={() => navigate(-1)} className="flex items-center space-x-2 text-orange-500 mb-8 hover:text-orange-400 transition-colors">
                <ArrowLeft size={20}/>
                <span>Back</span>
            </button>
            
            <section className="mb-12">
                <h1 className="text-4xl font-bold text-orange-500 mb-4">About EINTK</h1>
                <div className="bg-gray-800/50 p-6 rounded-xl border border-orange-500/30 mb-8">
                    <h2 className="text-xl font-bold text-white mb-2 flex items-center">
                        <BookOpen className="mr-2 text-orange-500" />
                        What does EINTK stand for?
                    </h2>
                    <p className="text-lg text-gray-200 font-medium">
                        <span className="text-orange-500 font-bold">E</span>verything <span className="text-orange-500 font-bold">I</span> <span className="text-orange-500 font-bold">N</span>eed <span className="text-orange-500 font-bold">T</span>o <span className="text-orange-500 font-bold">K</span>now.
                    </p>
                </div>

                <div className="space-y-4 leading-relaxed">
                    <p>Welcome to EINTK. Our platform is founded on a simple yet powerful mission: to democratize education and make high-quality learning materials accessible to everyone.</p>
                    <p>We believe that every student, regardless of their background or location, deserves the tools to succeed. In a world of information overload, finding clear, concise, and reliable educational content can be a challenge. EINTK was created to solve this problem.</p>
                    <p>We provide comprehensive eBooks and exam preparation materials tailored specifically to curricula like the Nigerian secondary school system (including JAMB, WAEC, and NECO). Our goal is to break down complex subjects—from Mathematics and Physics to Government and English Language—into easy-to-understand concepts. We aim to create a space where users, especially students, can not only read but truly comprehend everything they need to know for their academic journey.</p>
                    <p>Whether you're preparing for a critical exam or are simply a curious mind eager to expand your knowledge, EINTK is your dedicated digital library, designed for clarity and built for success.</p>
                </div>
            </section>

            <section className="bg-gray-800 p-8 rounded-xl border border-gray-700 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Code size={100} className="text-white"/>
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                    <span className="bg-orange-600 w-2 h-8 mr-3 rounded-full"></span>
                    Built by Constrix Studio
                </h2>
                
                <div className="space-y-6 relative z-10">
                    <p>
                        EINTK is proudly created and maintained by <strong>Constrix Studio</strong>, a forward-thinking software development company dedicated to building innovative web applications that solve real-world problems.
                    </p>
                    
                    <div className="flex items-start bg-gray-900/50 p-4 rounded-lg border border-gray-600">
                        <UserCheck className="text-orange-500 mt-1 mr-3 flex-shrink-0" size={24}/>
                        <div>
                            <h4 className="text-white font-bold text-lg">Leadership</h4>
                            <p className="text-sm text-gray-300 mt-1">
                                Constrix Studio is owned and led by <strong>Onifade Oladipupo Timothy</strong>. His vision drives our commitment to excellence and technological innovation in education.
                            </p>
                        </div>
                    </div>

                    <p className="flex items-start">
                        <Sparkles className="text-orange-500 mt-1 mr-3 flex-shrink-0" size={20}/>
                        <span>
                            <strong>Powered by AI:</strong> We leverage advanced Artificial Intelligence technology to enhance your learning experience on this platform. Our use of AI ensures that our tools are smart, responsive, and tailored to help you achieve your best results.
                        </span>
                    </p>
                </div>
            </section>
        </div>
    );
};

export default AboutUsPage;
