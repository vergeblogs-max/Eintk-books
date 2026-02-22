
import React from 'react';
import { FileChartColumn, TrendingUp, CircleAlert, Trophy, Flame, ChevronRight } from 'lucide-react';
import type { UserData } from '../types';
import { Link } from 'react-router-dom';

interface StudentReportCardProps {
    userData: UserData;
}

const StudentReportCard: React.FC<StudentReportCardProps> = ({ userData }) => {
    const examScores = userData.examScores || {};
    const userInterests = userData.subjectsOfInterest || [];
    
    // Cast and Filter Scores based on Interests
    const scoreEntriesRaw = Object.values(examScores) as { score: number; totalQuestions: number; date: string; subject?: string }[];
    
    // STRICT FILTER: Only include exams where the subject is explicitly in the user's interests list
    // This ignores "fun" attempts in unrelated subjects.
    const scoreEntries = scoreEntriesRaw.filter(entry => 
        entry.subject && userInterests.includes(entry.subject)
    );

    const totalExams = scoreEntries.length;
    const isPro = userData.subscriptionStatus === 'pro';

    if (!isPro) {
        return (
             <div className="bg-gray-800 border-2 border-dashed border-gray-700 p-6 rounded-lg text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900/80 z-0"></div>
                <div className="relative z-10">
                    <FileChartColumn size={48} className="mx-auto text-gray-600 mb-3" />
                    <h3 className="text-xl font-bold text-gray-300">Student Report Card</h3>
                    <p className="text-gray-500 mt-2 mb-4">Unlock detailed analytics, subject breakdowns, and a weekly report card to track your academic growth.</p>
                    <Link to="/upgrade" className="inline-block bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-6 rounded-lg shadow-lg transform transition hover:scale-105">
                        Upgrade to Unlock
                    </Link>
                </div>
            </div>
        );
    }

    if (totalExams === 0) {
        return (
            <div className="bg-gray-800 p-6 rounded-lg text-center border border-gray-700">
                <FileChartColumn size={48} className="mx-auto text-orange-500 mb-3" />
                <h3 className="text-xl font-bold text-white">Your Report Card</h3>
                <p className="text-gray-400 mt-2">Complete tests in your chosen subjects to generate your personalized performance report.</p>
                <Link to="/exams" className="mt-4 inline-block text-orange-400 font-semibold hover:underline">Take a Test Now</Link>
            </div>
        );
    }

    // Calculate Stats
    let totalScorePercentage = 0;
    const subjectPerformance: Record<string, { total: number, count: number }> = {};

    scoreEntries.forEach(entry => {
        const percentage = (entry.score / entry.totalQuestions) * 100;
        totalScorePercentage += percentage;

        const subject = entry.subject || 'General';
        if (!subjectPerformance[subject]) {
            subjectPerformance[subject] = { total: 0, count: 0 };
        }
        subjectPerformance[subject].total += percentage;
        subjectPerformance[subject].count += 1;
    });

    const averageScore = Math.round(totalScorePercentage / totalExams);
    
    const subjectsSorted = Object.entries(subjectPerformance).map(([sub, data]) => ({
        subject: sub,
        average: Math.round(data.total / data.count)
    })).sort((a, b) => b.average - a.average);

    const strongestSubject = subjectsSorted[0];
    const weakestSubject = subjectsSorted[subjectsSorted.length - 1];
    
    // Determine Grade Function
    const getGrade = (pct: number) => {
        if (pct >= 75) return 'A';
        if (pct >= 65) return 'B';
        if (pct >= 50) return 'C';
        if (pct >= 40) return 'D';
        return 'F';
    };

    const getGradeColor = (grade: string) => {
        if (grade === 'A') return 'text-green-500';
        if (grade === 'B') return 'text-green-400';
        if (grade === 'C') return 'text-yellow-500';
        if (grade === 'D') return 'text-orange-500';
        return 'text-red-500';
    };

    const overallGrade = getGrade(averageScore);
    const overallGradeColor = getGradeColor(overallGrade);

    return (
        <div className="bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-700">
            {/* Header */}
            <div className="bg-gray-900 p-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white flex items-center">
                    <FileChartColumn className="mr-2 text-orange-500" /> Performance Report
                </h3>
                <div className="flex items-center space-x-2 bg-gray-800 px-3 py-1 rounded-full border border-orange-500/30">
                    <Flame size={16} className="text-orange-500" fill="currentColor" />
                    <span className="text-white font-bold">{userData.currentStreak || 0} Day Streak</span>
                </div>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Overall Grade Card */}
                    <div className="flex flex-col items-center justify-center p-6 bg-gray-900 rounded-lg border border-gray-700 relative overflow-hidden">
                        <div className={`absolute top-0 right-0 p-4 opacity-10 font-black text-9xl ${overallGradeColor}`}>{overallGrade}</div>
                        <span className="text-sm text-gray-400 uppercase tracking-wider font-semibold">Overall Average</span>
                        <div className={`text-6xl font-black mt-2 ${overallGradeColor}`}>{averageScore}%</div>
                        <span className={`text-2xl font-bold mt-1 ${overallGradeColor}`}>Grade: {overallGrade}</span>
                    </div>

                    {/* Key Insights */}
                    <div className="space-y-4">
                        <div className="bg-green-900/20 p-4 rounded-lg border border-green-900/50 flex items-center">
                            <div className="bg-green-900 p-2 rounded-full mr-4"><Trophy size={24} className="text-green-400" /></div>
                            <div>
                                <p className="text-xs text-green-300 font-bold uppercase tracking-wide">Strongest Subject</p>
                                <p className="font-bold text-white text-lg">{strongestSubject.subject} ({strongestSubject.average}%)</p>
                            </div>
                        </div>

                        {subjectsSorted.length > 1 && (
                            <div className="bg-red-900/20 p-4 rounded-lg border border-red-900/50 flex items-center">
                                <div className="bg-red-900 p-2 rounded-full mr-4"><CircleAlert size={24} className="text-red-400" /></div>
                                <div>
                                    <p className="text-xs text-red-300 font-bold uppercase tracking-wide">Needs Improvement</p>
                                    <p className="font-bold text-white text-lg">{weakestSubject.subject} ({weakestSubject.average}%)</p>
                                </div>
                            </div>
                        )}
                        
                        <div className="flex justify-between items-center text-gray-400 text-sm px-2">
                            <span>Relevant Tests Taken: <span className="text-white font-bold">{totalExams}</span></span>
                        </div>
                    </div>
                </div>

                {/* Detailed Subject Breakdown */}
                <div>
                    <h4 className="text-lg font-bold text-white mb-4 border-b border-gray-700 pb-2">Subject Breakdown</h4>
                    <div className="space-y-3">
                        {subjectsSorted.map((item, idx) => {
                            const grade = getGrade(item.average);
                            const colorClass = grade === 'A' || grade === 'B' ? 'bg-green-500' : grade === 'C' ? 'bg-yellow-500' : 'bg-red-500';
                            
                            return (
                                <div key={idx} className="bg-gray-900/50 p-3 rounded-lg flex items-center justify-between group hover:bg-gray-750 transition-colors">
                                    <div className="flex-1 mr-4">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-sm font-semibold text-gray-200">{item.subject}</span>
                                            <span className={`text-sm font-bold ${getGradeColor(grade)}`}>{item.average}% ({grade})</span>
                                        </div>
                                        <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-1000 ease-out ${colorClass}`} 
                                                style={{ width: `${item.average}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentReportCard;
