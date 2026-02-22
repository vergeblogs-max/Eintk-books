
export const IMGBB_API_KEY = "4d66fcaa7a396f0a6c05c69b3908fddf";

export const MANDATORY_SUBJECTS = ["English Language", "General"];

export interface SkinColors {
    name: string;
    gradient: string;
    border: string;
    glow: string;
    barGradient: string;
    primary: string;
    secondary: string;
}

export const SKIN_CONFIG: Record<string, SkinColors> = {
    'default': { 
        name: 'Standard Green', 
        gradient: 'from-green-900 to-emerald-950', 
        border: 'border-green-500', 
        glow: 'shadow-[0_0_10px_rgba(34,197,94,0.5)]',
        barGradient: 'from-green-400 to-emerald-500',
        primary: '#4ade80',
        secondary: '#10b981'
    },
    'frozen-pine': { 
        name: 'Frozen Pine', 
        gradient: 'from-blue-900 to-cyan-950', 
        border: 'border-blue-400', 
        glow: 'shadow-[0_0_15px_rgba(96,165,250,0.6)]',
        barGradient: 'from-blue-400 to-cyan-500',
        primary: '#60a5fa',
        secondary: '#06b6d4'
    },
    'neon-cyber': { 
        name: 'Neon Cyber', 
        gradient: 'from-purple-900 to-pink-950', 
        border: 'border-pink-500', 
        glow: 'shadow-[0_0_15px_rgba(236,72,153,0.6)]',
        barGradient: 'from-purple-400 to-pink-500',
        primary: '#c084fc',
        secondary: '#ec4899'
    },
    'golden-baobab': { 
        name: 'Golden Baobab', 
        gradient: 'from-yellow-900 to-orange-950', 
        border: 'border-yellow-500', 
        glow: 'shadow-[0_0_15px_rgba(234,179,8,0.6)]',
        barGradient: 'from-yellow-400 to-orange-500',
        primary: '#fbbf24',
        secondary: '#f97316'
    },
    'burning-iroko': { 
        name: 'Burning Iroko', 
        gradient: 'from-red-900 to-orange-950', 
        border: 'border-red-600', 
        glow: 'shadow-[0_0_15px_rgba(220,38,38,0.6)]',
        barGradient: 'from-red-500 to-orange-500',
        primary: '#ef4444',
        secondary: '#f97316'
    },
    'void-willow': { 
        name: 'Void Willow', 
        gradient: 'from-gray-900 to-black', 
        border: 'border-gray-400', 
        glow: 'shadow-[0_0_15px_rgba(156,163,175,0.4)]',
        barGradient: 'from-gray-400 to-slate-200',
        primary: '#9ca3af',
        secondary: '#f8fafc'
    },
    'crystal-mangrove': { 
        name: 'Crystal Mangrove', 
        gradient: 'from-teal-900 to-emerald-950', 
        border: 'border-teal-400', 
        glow: 'shadow-[0_0_15px_rgba(45,212,191,0.6)]',
        barGradient: 'from-teal-400 to-emerald-500',
        primary: '#2dd4bf',
        secondary: '#10b981'
    },
    'solar-palm': { 
        name: 'Solar Palm', 
        gradient: 'from-orange-800 to-yellow-900', 
        border: 'border-orange-400', 
        glow: 'shadow-[0_0_15px_rgba(251,146,60,0.6)]',
        barGradient: 'from-orange-400 to-yellow-500',
        primary: '#fb923c',
        secondary: '#eab308'
    },
    'emerald-bamboo': { 
        name: 'Emerald Bamboo', 
        gradient: 'from-emerald-900 to-green-950', 
        border: 'border-emerald-500', 
        glow: 'shadow-[0_0_15px_rgba(16,185,129,0.6)]',
        barGradient: 'from-emerald-400 to-green-500',
        primary: '#34d399',
        secondary: '#22c55e'
    },
    'galactic-redwood': { 
        name: 'Galactic Redwood', 
        gradient: 'from-indigo-900 to-purple-950', 
        border: 'border-indigo-500', 
        glow: 'shadow-[0_0_15px_rgba(99,102,241,0.6)]',
        barGradient: 'from-indigo-400 to-purple-500',
        primary: '#818cf8',
        secondary: '#a855f7'
    },
};

export const NIGERIAN_CURRICULUM_SUBJECTS: { [key: string]: string[] } = {
    "Mathematics": [],
    "English Language": [],
    "Physics": [],
    "Chemistry": [],
    "Biology": [],
    "Further Mathematics": [],
    "Technical Drawing": [],
    "Economics": [],
    "Government": [],
    "Commerce": [],
    "Financial Accounting": [],
    "Geography": [],
    "Literature-in-English": [],
    "Christian Religious Studies (CRS)": [],
    "Islamic Studies (IS)": [],
    "Agricultural Science": [],
    "Home Management": [],
    "Visual Arts": [],
    "French": [],
    "Yoruba": [],
    "Igbo": [],
    "Hausa": [],
    "Data Processing": [],
    "Office Practice": [],
    "Civic Education": [],
    "Fisheries": [],
    "Insurance": [],
    "Marketing": [],
    "Physical Education": [],
    "General": [] 
};

export const NIGERIAN_STATES = [
    "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", 
    "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", 
    "FCT - Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", 
    "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", 
    "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

export type Department = 'Science' | 'Arts' | 'Commercial' | 'General';

export const DEPARTMENTS: Department[] = ['Science', 'Arts', 'Commercial'];

export const SUBJECT_TO_DEPARTMENT_MAP: { [key: string]: Department } = {
    "Physics": "Science",
    "Chemistry": "Science",
    "Biology": "Science",
    "Agricultural Science": "Science",
    "Technical Drawing": "Science",
    "Data Processing": "Science", 
    "Physical Education": "Science",
    "Government": "Arts",
    "Literature-in-English": "Arts",
    "Christian Religious Studies (CRS)": "Arts",
    "Islamic Studies (IS)": "Arts",
    "Visual Arts": "Arts",
    "French": "Arts",
    "Hausa": "Arts",
    "Igbo": "Arts",
    "Yoruba": "Arts",
    "History": "Arts",
    "Commerce": "Commercial",
    "Financial Accounting": "Commercial",
    "Office Practice": "Commercial",
    "Insurance": "Commercial",
    "Marketing": "Commercial",
    "Mathematics": "General",
    "English Language": "General",
    "Civic Education": "General",
    "Economics": "General", 
    "Geography": "General", 
    "Home Management": "General", 
    "Further Mathematics": "General", 
    "Fisheries": "General", 
    "General": "General"
};