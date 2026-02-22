import type { Badge, BadgeCriteria } from './types';

const GENERAL_BADGES: Badge[] = [
    // --- Book Completion ---
    { id: 1, name: "Page Turner", description: "Complete your first book.", icon: "BookCheck", criteria: { type: 'complete_books', count: 1 } },
    { id: 2, name: "Knowledge Seeker", description: "Complete 5 books.", icon: "GraduationCap", criteria: { type: 'complete_books', count: 5 } },
    { id: 3, name: "Dedicated Learner", description: "Complete 10 books.", icon: "Target", criteria: { type: 'complete_books', count: 10 } },
    { id: 4, name: "Scholar", description: "Complete 20 books.", icon: "ScrollText", criteria: { type: 'complete_books', count: 20 } },
    { id: 5, name: "Sage", description: "Complete 50 books.", icon: "Brain", criteria: { type: 'complete_books', count: 50 } },
    { id: 6, name: "Enlightened One", description: "Complete 100 books.", icon: "Sparkles", criteria: { type: 'complete_books', count: 100 } },
    
    // --- Exam Completion ---
    { id: 10, name: "Test Taker", description: "Complete your first exam.", icon: "ClipboardCheck", criteria: { type: 'complete_exams', count: 1 } },
    { id: 11, name: "Pro Examiner", description: "Complete 5 exams.", icon: "ClipboardList", criteria: { type: 'complete_exams', count: 5 } },
    { id: 12, name: "Exam Veteran", description: "Complete 10 exams.", icon: "FileCheck", criteria: { type: 'complete_exams', count: 10 } },
    { id: 13, name: "Assessment Ace", description: "Complete 25 exams.", icon: "Award", criteria: { type: 'complete_exams', count: 25 } },

    // --- Points & Leaderboard ---
    { id: 20, name: "Point Collector", description: "Earn your first 10 points.", icon: "Star", criteria: { type: 'points_earned', count: 10 } },
    { id: 21, name: "Contender", description: "Earn 100 points.", icon: "TrendingUp", criteria: { type: 'points_earned', count: 100 } },
    { id: 22, name: "High Scorer", description: "Earn 500 points.", icon: "Gem", criteria: { type: 'points_earned', count: 500 } },
    { id: 23, name: "Leaderboard Legend", description: "Earn 1000 points.", icon: "Trophy", criteria: { type: 'points_earned', count: 1000 } },

    // --- Reading Time ---
    { id: 30, name: "Quick Start", description: "Read for a total of 1 hour.", icon: "Timer", criteria: { type: 'reading_time', minutes: 60 } },
    { id: 31, name: "Bookworm", description: "Read for a total of 5 hours.", icon: "Clock", criteria: { type: 'reading_time', minutes: 300 } },
    { id: 32, name: "Reading Marathoner", description: "Read for a total of 10 hours.", icon: "BookOpen", criteria: { type: 'reading_time', minutes: 600 } },
    { id: 33, name: "Literary Fiend", description: "Read for a total of 24 hours.", icon: "Library", criteria: { type: 'reading_time', minutes: 1440 } },
];

const DEPARTMENT_BADGES: Badge[] = [
    // SCIENCE Department Completion
    { id: 101, name: "Science Explorer", description: "Complete 5 Science books.", icon: "FlaskConical", criteria: { type: 'complete_books_in_department', department: 'Science', count: 5 } },
    { id: 102, name: "Science Scholar", description: "Complete 10 Science books.", icon: "Beaker", criteria: { type: 'complete_books_in_department', department: 'Science', count: 10 } },
    { id: 103, name: "Science Sage", description: "Complete 25 Science books.", icon: "Atom", criteria: { type: 'complete_books_in_department', department: 'Science', count: 25 } },

    // ARTS Department Completion
    { id: 201, name: "Arts Aficionado", description: "Complete 5 Arts books.", icon: "Palette", criteria: { type: 'complete_books_in_department', department: 'Arts', count: 5 } },
    { id: 202, name: "Arts Connoisseur", description: "Complete 10 Arts books.", icon: "Feather", criteria: { type: 'complete_books_in_department', department: 'Arts', count: 10 } },
    { id: 203, name: "Master of Arts", description: "Complete 25 Arts books.", icon: "Scroll", criteria: { type: 'complete_books_in_department', department: 'Arts', count: 25 } },

    // COMMERCIAL Department Completion
    { id: 301, name: "Business Beginner", description: "Complete 5 Commercial books.", icon: "Briefcase", criteria: { type: 'complete_books_in_department', department: 'Commercial', count: 5 } },
    { id: 302, name: "Commerce Captain", description: "Complete 10 Commercial books.", icon: "AreaChart", criteria: { type: 'complete_books_in_department', department: 'Commercial', count: 10 } },
    { id: 303, name: "Market Mogul", description: "Complete 25 Commercial books.", icon: "Landmark", criteria: { type: 'complete_books_in_department', department: 'Commercial', count: 25 } },
];


type Tier = { count: number; name: string; };
const subjectTiers: Tier[] = [
  { count: 1, name: "Novice" },
  { count: 3, name: "Adept" },
  { count: 5, name: "Expert" },
];

let badgeIdCounter = 1000;
const createSubjectBadges = (subject: string, icon: string, tiers: Tier[]): Badge[] => {
    return tiers.map(tier => ({
        id: badgeIdCounter++,
        name: `${subject} ${tier.name}`,
        description: `Complete ${tier.count} book(s) on ${subject}.`,
        icon: icon,
        criteria: { type: 'complete_books_in_subject', subject: subject, count: tier.count }
    }));
};

const SUBJECT_SPECIFIC_BADGES: Badge[] = [
    // Science Subjects
    ...createSubjectBadges("Agricultural Science", "Tractor", subjectTiers),
    ...createSubjectBadges("Biology", "Dna", subjectTiers),
    ...createSubjectBadges("Chemistry", "FlaskConical", subjectTiers),
    ...createSubjectBadges("Computer Science", "Laptop", subjectTiers),
    ...createSubjectBadges("Further Mathematics", "FunctionSquare", subjectTiers),
    ...createSubjectBadges("Mathematics", "Calculator", subjectTiers),
    ...createSubjectBadges("Physics", "Atom", subjectTiers),
    ...createSubjectBadges("Technical Drawing", "PenRuler", subjectTiers),
    // Arts Subjects
    ...createSubjectBadges("Christian Religious Studies (CRS)", "BookMarked", subjectTiers),
    ...createSubjectBadges("Civic Education", "Vote", subjectTiers),
    ...createSubjectBadges("English Language", "MessageCircleQuote", subjectTiers),
    ...createSubjectBadges("Government", "Scale", subjectTiers),
    ...createSubjectBadges("History", "ScrollText", subjectTiers),
    ...createSubjectBadges("Islamic Studies (IS)", "MoonStar", subjectTiers),
    ...createSubjectBadges("Literature-in-English", "Feather", subjectTiers),
     ...createSubjectBadges("Yoruba", "Users", subjectTiers),
    ...createSubjectBadges("Igbo", "Users2", subjectTiers),
    ...createSubjectBadges("Hausa", "User", subjectTiers),
    // Commercial Subjects
    ...createSubjectBadges("Commerce", "Store", subjectTiers),
    ...createSubjectBadges("Economics", "TrendingUp", subjectTiers),
    ...createSubjectBadges("Financial Accounting", "NotebookPen", subjectTiers),
    // General Subjects
    ...createSubjectBadges("Geography", "Globe", subjectTiers),
    ...createSubjectBadges("Home Economics", "CookingPot", subjectTiers),
].flat();

const PRO_BADGES: Badge[] = [
    { id: 500, name: "Pro Reader", description: "Complete your first Pro book.", icon: "Crown", criteria: { type: 'complete_pro_books', count: 1 }, isPro: true },
    { id: 501, name: "Pro Scholar", description: "Complete 5 Pro books.", icon: "Gem", criteria: { type: 'complete_pro_books', count: 5 }, isPro: true },
    { id: 502, name: "Pro Sage", description: "Complete 10 Pro books.", icon: "ShieldCheck", criteria: { type: 'complete_pro_books', count: 10 }, isPro: true },
];


export const ALL_BADGES: Badge[] = [
    ...GENERAL_BADGES,
    ...DEPARTMENT_BADGES,
    ...SUBJECT_SPECIFIC_BADGES,
    ...PRO_BADGES,
];