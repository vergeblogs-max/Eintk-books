import type { UserData, Ebook, Badge } from '../types';
import { ALL_BADGES } from '../badges';
import { SUBJECT_TO_DEPARTMENT_MAP, Department } from '../constants';

export const calculateEarnedBadges = (userData: UserData, allEbooks: Ebook[]): Badge[] => {
    const earnedBadges: Badge[] = [];

    const completedBookIds = userData.completedBooks || [];
    const completedExams = userData.completedExamQSTs || [];
    const points = userData.points || 0;
    const readingTime = userData.totalReadingTime || 0;
    const isProUser = userData.subscriptionStatus === 'pro';

    const completedBooksData = allEbooks.filter(book => completedBookIds.includes(book.id));
    
    // --- Calculate Stats ---
    const bookCompletionCount = completedBooksData.length;
    const examCompletionCount = completedExams.length;
    const proBookCompletionCount = completedBooksData.filter(b => b.accessLevel === 'pro').length;

    const departmentCompletionCounts: { [key in Department]: number } = {
        Science: 0,
        Arts: 0,
        Commercial: 0,
        General: 0, 
    };
    const subjectCompletionCounts: { [key: string]: number } = {};
    
    completedBooksData.forEach(book => {
        const department = SUBJECT_TO_DEPARTMENT_MAP[book.subject] || 'General';
        
        subjectCompletionCounts[book.subject] = (subjectCompletionCounts[book.subject] || 0) + 1;

        if (department === 'General') {
            departmentCompletionCounts.Science++;
            departmentCompletionCounts.Arts++;
            departmentCompletionCounts.Commercial++;
        } else {
             if (department in departmentCompletionCounts) {
                departmentCompletionCounts[department]++;
            }
        }
    });

    // --- Check Badges ---
    for (const badge of ALL_BADGES) {
        let isEarned = false;

        // If it's a pro badge, user must be pro to earn it
        if (badge.isPro && !isProUser) {
            continue;
        }

        switch (badge.criteria.type) {
            case 'complete_books':
                if (bookCompletionCount >= badge.criteria.count) isEarned = true;
                break;
            case 'complete_exams':
                if (examCompletionCount >= badge.criteria.count) isEarned = true;
                break;
            case 'points_earned':
                if (points >= badge.criteria.count) isEarned = true;
                break;
            case 'reading_time':
                if (readingTime >= badge.criteria.minutes) isEarned = true;
                break;
            case 'complete_books_in_department':
                if (departmentCompletionCounts[badge.criteria.department] >= badge.criteria.count) isEarned = true;
                break;
            case 'complete_books_in_subject':
                 if ((subjectCompletionCounts[badge.criteria.subject] || 0) >= badge.criteria.count) isEarned = true;
                break;
            case 'complete_pro_books':
                if (proBookCompletionCount >= badge.criteria.count) isEarned = true;
                break;
        }
        if (isEarned) {
            earnedBadges.push(badge);
        }
    }

    return earnedBadges;
};