export interface StudyPlan {
  type: 'jamb_pulse' | 'waec_zenith' | 'nexus' | 'omni';
  startDate: any; // Timestamp
  endDate: any;   // Timestamp (Exam Date)
  durationDays: number;
  intensity: number; // 1, 2, or 3 subjects per day
  excludeWeekends: boolean;
  // Missions are now strings: "Subject|Topic|StartChapter|EndChapter"
  // Start/End chapters are 1-indexed.
  completeSchedule: { [date: string]: string[] }; 
  summarySchedule: { [date: string]: string[] };
  // Legacy support
  generatedSchedule?: { [date: string]: string[] };
}

export interface UserData {
  uid: string;
  username: string;
  username_lowercase?: string;
  email: string;
  role: 'user' | 'central admin';
  profilePictureUrl: string;
  state: string;
  department?: 'Science' | 'Arts' | 'Commercial';
  subjectsOfInterest?: string[];
  
  // Aether Core Study Plan
  studyPlan?: StudyPlan;

  // Security
  installationId?: string; 
  sessionId?: string;

  // Referral System
  referralCode?: string;
  referredBy?: string;
  referralCount?: number;

  // Progress Tracking
  completedBooks?: string[];
  completedExamQSTs?: string[];
  // Tracks unique chapters read in Mission Mode: { [bookId]: [1, 2, 3] }
  completedChapters?: Record<string, number[]>;
  readingProgress?: { [ebookId: string]: { currentPage: number; totalPages: number; lastAccessed?: any } };
  examProgress?: { 
      [examId: string]: { 
          currentQuestionIndex: number; 
          answers: { [key: number]: string };
          mode: 'game' | 'cbt';
          timeLeft?: number;
          questionIndices?: number[];
          lastUpdated: any;
      } 
  };
  completedSyllabusTopics?: string[];
  
  // Stats
  points: number;
  totalReadingTime: number; 
  currentStreak?: number;
  lastStudyDate?: any; 

  // Subscription
  subscriptionStatus: 'free' | 'pro' | 'day_pass';
  trialExpiryDate?: any;
  proExpiryDate?: any;
  dayPassExpiry?: any;
  
  // Economy
  sparks?: number; 
  energy?: number;
  lastRefillMonth?: string;

  // NEW: Battle Quotas
  battleQuota?: number;
  lastBattleResetWeek?: string;

  // NEW: Emporium Inventory
  inventory?: {
      streakFreezes: number;
      megaphoneCount: number;
      ownedSkins: string[]; // IDs of skins
      activeSkinId: string;
      unlockedSubjects: string[]; // List of subjects unlocked permanently
  };

  // Pro Features Data
  bookmarks?: Bookmark[];
  weeklyGoal?: WeeklyGoal;
  examScores?: Record<string, { score: number; totalQuestions: number; date: string; subject?: string }>;
  showFreeBooks?: boolean;
  lastProPromptDate?: any;
  
  // Arcade
  arcadeBoosts?: {
      lastReset: any;
      hintsUsed: number;
      halvesUsed: number;
      solvesUsed: number;
  };
  gameProgress?: { [gameId: string]: number };
}

export interface Bookmark {
    id: string;
    ebookId: string;
    ebookTitle: string;
    pageIndex: number;
    chapterTitle: string;
    note: string;
    highlightedText?: string;
    createdAt: any;
}

export interface WeeklyGoal {
    weekId: string;
    readGoal: number;
    examGoal: number;
    readProgress: number;
    examProgress: number;
}


export interface Flashcard {
  front: string;
  back: string;
}

export interface EbookContent {
  title: string;
  tableOfContents: { chapter: number; title: string }[];
  chapters: {
    chapter: number;
    title: string;
    content: string;
    questions?: Question[];
    imagePrompts?: { placeholder: string; prompt: string }[];
    audioSummaryPrompt?: string;
  }[];
  flashcards?: Flashcard[];
}

// Added extends EbookContent to provide title, chapters, etc.
export interface Ebook extends EbookContent {
  id: string;
  subject: string;
  topic: string;
  syllabusId?: string;
  coverImageUrl: string;
  published: boolean;
  createdAt: any;
  accessLevel: 'free' | 'pro';
  orderIndex?: number;
  linkedVideoIds?: string[];
  imageModel?: 'imagen-4.0-generate-001' | 'gemini-2.5-flash-image' | 'remote-imagen-4' | 'remote-gemini-flash';
  
  averageRating?: number;
  ratingCount?: number;
  totalReads?: number;
}

export interface BookReview {
    id: string;
    userId: string;
    username: string;
    profilePictureUrl?: string;
    rating: number;
    comment: string;
    createdAt: any;
}

export interface Announcement {
  id: string;
  type: 'general' | 'book_update';
  title: string;
  content: string;
  relatedBookId?: string;
  createdAt: any;
}

export enum ExamType {
    JAMB = "JAMB (UTME)",
    WAEC = "WAEC (SSCE)",
    NECO = "NECO",
    ALL = "All Exams (Combined)",
}

export enum QuestionType {
    MCQ = "Multiple Choice Questions (MCQ)",
    THEORY = "Theory/Essay Questions",
}

export interface Question {
    type: 'MCQ' | 'Theory';
    question: string;
    options?: string[];
    answer: string;
    answerVariations?: string[];
    explanation?: string;
}

export interface ExamQST {
  id: string;
  title: string;
  subject: string;
  topic: string;
  introduction: string;
  coverImageUrl: string;
  questions: Question[];
  published: boolean;
  createdAt: any;
  accessLevel: 'free' | 'pro';
  orderIndex?: number;
  difficulty?: string;
  imageModel?: 'imagen-4.0-generate-001' | 'gemini-2.5-flash-image' | 'remote-imagen-4' | 'remote-gemini-flash';
}

export interface ContactSubmission {
    id?: string;
    name: string;
    email: string;
    whatsapp?: string;
    reason: string;
    message: string;
    createdAt: any;
    userId?: string;
}

export interface StudyDeck {
  id: string;
  title: string;
  coverImageUrl: string;
  cardCount: number;
  type: 'ebook' | 'exam';
  accessLevel: 'free' | 'pro';
  subject?: string;
}

export interface Video {
  id:string;
  ebookId: string;
  ebookTitle: string;
  title: string;
  description: string;
  script: string;
  hashtags: string[];
  tags: string[];
  videoPrompt: string;
  thumbnailUrl: string;
  youtubeUrl: string;
  videoType: 'video' | 'short';
  subject: string;
  topic: string;
  published: boolean;
  createdAt: any;
}

export interface NovaPulseItem {
    type: 'quiz' | 'discussion';
    title: string;
    content: string;
    subject: string;
    quizOptions?: string[];
    correctAnswer?: string;
}

export type Draft = 
  | (Partial<Ebook> & { draftType: 'ebook'; adminUid: string; updatedAt?: any; accessLevel: 'free' | 'pro' })
  | (Partial<ExamQST> & { draftType: 'exam'; adminUid: string; updatedAt?: any; accessLevel: 'free' | 'pro' })
  | (Partial<Video> & { draftType: 'video'; adminUid: string; updatedAt?: any; });

export interface PaymentToken {
    id?: string;
    userId: string;
    status: 'pending';
    createdAt: any;
    type?: 'subscription' | 'sparks';
    amount?: number;
}

export interface CommunityQuestion {
  id: string;
  type: 'discussion' | 'quiz' | 'poll';
  title: string;
  content: string;
  imageUrl?: string;
  
  // Nova Pulse Meta
  isAIPost?: boolean;

  // Emporium Meta
  isMegaphone?: boolean;

  quizOptions?: string[];
  correctAnswer?: string;

  pollOptions?: { text: string; votes: number }[];
  voters?: string[];

  subject: string;
  authorId: string;
  authorUsername: string;
  authorProfilePic?: string;
  createdAt: any;
  expiresAt?: any;
  
  likes: string[];
  answerCount: number;
}

export interface CommunityAnswer {
    id: string;
    content: string;
    authorId: string;
    authorUsername: string;
    authorProfilePic?: string;
    createdAt: any;
}

export type BadgeCriteria =
    | { type: 'complete_books'; count: number }
    | { type: 'complete_exams'; count: number }
    | { type: 'points_earned'; count: number }
    | { type: 'reading_time'; minutes: number }
    | { type: 'complete_books_in_department'; department: 'Science' | 'Arts' | 'Commercial'; count: number }
    | { type: 'complete_books_in_subject'; subject: string; count: number }
    | { type: 'complete_pro_books'; count: number };


export interface Badge {
    id: number;
    name: string;
    description: string;
    icon: string;
    criteria: BadgeCriteria;
    isPro?: boolean;
}

export interface GameLevel {
    id?: string;
    gameId: string;
    question?: string;
    answer?: string;
    options?: string[];
    grid?: string[][];
    clues?: { across: any[], down: any[] };
    items?: any[];
    difficulty: 'easy' | 'medium' | 'hard';
    createdAt: any;
}

export interface JournalEntry {
    id: string;
    content: string;
    createdAt: any;
}

export interface Battle {
    id: string;
    hostId: string;
    hostName: string;
    opponentId?: string;
    opponentName?: string;
    status: 'waiting' | 'active' | 'finished';
    ebookId: string;
    ebookTopic: string;
    
    hostQuestions: Question[];
    opponentQuestions: Question[];
    currentIndex: number;
    hostFinishedTurn: boolean;
    opponentFinishedTurn: boolean;

    hostScore: number;
    opponentScore: number;
    mode: 'Classic' | 'Sabotage Twist';
    numQuestions: number;
    createdAt: any;
}

export interface BattleRequest {
    id: string;
    fromId: string;
    fromName: string;
    toId: string;
    toName: string;
    status: 'pending' | 'accepted' | 'rejected';
    battleId?: string;
    ebookId: string;
    ebookTopic: string;
    mode: 'Classic' | 'Sabotage Twist';
    numQuestions: number;
    createdAt: any;
}

export interface PeriodicElement {
    number: number;
    symbol: string;
    name: string;
    mass: number;
    category: string;
}

export interface Debate {
    id: string;
    question: string;
    yesVotes: number;
    noVotes: number;
    voters: string[];
    weekId: string;
}