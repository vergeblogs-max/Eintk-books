import * as firestore from 'firebase/firestore';
import { db } from '../firebase';
import type { UserData, Ebook, ExamQST, ContactSubmission, Announcement, Draft, Video, PaymentToken, CommunityQuestion, Bookmark, WeeklyGoal, CommunityAnswer, GameLevel, JournalEntry, Battle, Question, BattleRequest, Debate, BookReview, StudyPlan } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { shuffleArray } from '../utils/shuffle';
import { syncManager } from './syncManager';

const getFreshUserData = async (transaction: firestore.Transaction, userRef: firestore.DocumentReference) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) throw new Error("User does not exist!");
    return userDoc.data() as UserData;
};

export const checkAndResetBattleQuota = async (uid: string, currentData: UserData): Promise<void> => {
    const now = new Date();
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    const currentWeekId = `${d.getUTCFullYear()}-W${weekNo}`;

    if (currentData.lastBattleResetWeek !== currentWeekId) {
        const isPro = currentData.subscriptionStatus === 'pro' || currentData.subscriptionStatus === 'day_pass';
        const newQuota = isPro ? 10 : 1;
        const userRef = firestore.doc(db, 'users', uid);
        await firestore.updateDoc(userRef, { 
            battleQuota: newQuota, 
            lastBattleResetWeek: currentWeekId 
        });
    }
};

export const decrementBattleQuota = async (uid: string): Promise<boolean> => {
    const userRef = firestore.doc(db, 'users', uid);
    try {
        await firestore.runTransaction(db, async (t) => {
            const data = await getFreshUserData(t, userRef);
            const quota = data.battleQuota || 0;
            if (quota <= 0) throw new Error("Out of Battle energy for this week.");
            t.update(userRef, { battleQuota: quota - 1 });
        });
        return true;
    } catch (e) {
        return false;
    }
};

const safeUpdate = async (ref: firestore.DocumentReference, data: any) => {
    try {
        await firestore.updateDoc(ref, data);
        return true;
    } catch (e: any) {
        if (e.message?.includes('Quota exceeded')) return false;
        throw e;
    }
};

export const isUsernameTaken = async (username: string): Promise<boolean> => {
    const usersRef = firestore.collection(db, 'users');
    const q = firestore.query(usersRef, firestore.where('username_lowercase', '==', username.toLowerCase()));
    const querySnapshot = await firestore.getDocs(q);
    return !querySnapshot.empty;
};

export const consumeEnergy = async (uid: string, amount: number): Promise<boolean> => {
    const userRef = firestore.doc(db, 'users', uid);
    try {
        await firestore.runTransaction(db, async (transaction) => {
            const userData = await getFreshUserData(transaction, userRef);
            if (userData.role === 'central admin') return;
            const currentEnergy = userData.energy || 0;
            if (currentEnergy < amount) throw new Error("Insufficient Energy");
            transaction.update(userRef, { energy: currentEnergy - amount });
        });
        return true;
    } catch (e) { return false; }
};

// --- ADMIN CURRENCY FUNCTIONS ---

export const adminGrantSparks = async (uid: string, amount: number): Promise<void> => {
    const userRef = firestore.doc(db, 'users', uid);
    await firestore.updateDoc(userRef, { sparks: firestore.increment(amount) });
};

export const adminGrantEnergy = async (uid: string, amount: number): Promise<void> => {
    const userRef = firestore.doc(db, 'users', uid);
    await firestore.updateDoc(userRef, { energy: firestore.increment(amount) });
};

export const convertSparksToEnergy = async (uid: string, sparksAmount: number): Promise<void> => {
    const userRef = firestore.doc(db, 'users', uid);
    const ENERGY_PER_SPARK = 10;
    const energyToAdd = sparksAmount * ENERGY_PER_SPARK;
    await firestore.runTransaction(db, async (transaction) => {
        const userData = await getFreshUserData(transaction, userRef);
        const currentSparks = userData.sparks || 0;
        const currentEnergy = userData.energy || 0;
        if (currentSparks < sparksAmount) throw new Error("Insufficient Sparks");
        transaction.update(userRef, { sparks: currentSparks - sparksAmount, energy: currentEnergy + energyToAdd });
    });
};

export const buyDayPass = async (uid: string): Promise<void> => {
    const userRef = firestore.doc(db, 'users', uid);
    const COST = 200;
    const BONUS_ENERGY = 250;
    await firestore.runTransaction(db, async (transaction) => {
        const userData = await getFreshUserData(transaction, userRef);
        const currentSparks = userData.sparks || 0;
        const currentEnergy = userData.energy || 0;
        if (currentSparks < COST) throw new Error("Insufficient Sparks");
        const now = new Date();
        let updates: Partial<UserData> = { sparks: currentSparks - COST, energy: currentEnergy + BONUS_ENERGY, showFreeBooks: false, battleQuota: firestore.increment(10) as any };
        if (userData.subscriptionStatus === 'pro' && userData.proExpiryDate) {
            const currentExpiry = userData.proExpiryDate.toDate();
            const baseDate = currentExpiry > now ? currentExpiry : now;
            const newExpiry = new Date(baseDate.getTime() + (24 * 60 * 60 * 1000));
            updates.proExpiryDate = firestore.Timestamp.fromDate(newExpiry);
        } else {
            const baseDate = (userData.dayPassExpiry && userData.dayPassExpiry.toDate() > now) ? userData.dayPassExpiry.toDate() : now;
            const newExpiry = new Date(baseDate.getTime() + (24 * 60 * 60 * 1000));
            updates.subscriptionStatus = 'day_pass';
            updates.dayPassExpiry = firestore.Timestamp.fromDate(newExpiry);
        }
        transaction.update(userRef, updates as any);
    });
};

// --- SHOP FUNCTIONS ---

export const buyStreakFreezes = async (uid: string, qty: number): Promise<void> => {
    const userRef = firestore.doc(db, 'users', uid);
    const COST_PER_FREEZE = 150;
    const totalCost = COST_PER_FREEZE * qty;
    await firestore.runTransaction(db, async (t) => {
        const data = await getFreshUserData(t, userRef);
        if ((data.sparks || 0) < totalCost) throw new Error("Insufficient Sparks");
        const currentFreezes = data.inventory?.streakFreezes || 0;
        t.update(userRef, { 
            sparks: firestore.increment(-totalCost),
            'inventory.streakFreezes': currentFreezes + qty
        });
    });
};

export const buyKnowledgeTreeSkin = async (uid: string, skinId: string, cost: number): Promise<void> => {
    const userRef = firestore.doc(db, 'users', uid);
    await firestore.runTransaction(db, async (t) => {
        const data = await getFreshUserData(t, userRef);
        if ((data.sparks || 0) < cost) throw new Error("Insufficient Sparks");
        const owned = data.inventory?.ownedSkins || [];
        if (owned.includes(skinId)) throw new Error("Already owned");
        t.update(userRef, { 
            sparks: firestore.increment(-cost),
            'inventory.ownedSkins': firestore.arrayUnion(skinId),
            'inventory.activeSkinId': skinId
        });
    });
};

export const equipSkin = async (uid: string, skinId: string): Promise<void> => {
    const userRef = firestore.doc(db, 'users', uid);
    await firestore.updateDoc(userRef, { 'inventory.activeSkinId': skinId });
};

export const buyMegaphone = async (uid: string): Promise<void> => {
    const userRef = firestore.doc(db, 'users', uid);
    const COST = 100;
    await firestore.runTransaction(db, async (t) => {
        const data = await getFreshUserData(t, userRef);
        if ((data.sparks || 0) < COST) throw new Error("Insufficient Sparks");
        const currentCount = data.inventory?.megaphoneCount || 0;
        t.update(userRef, { 
            sparks: firestore.increment(-COST),
            'inventory.megaphoneCount': currentCount + 1
        });
    });
};

export const buyBenefactorGift = async (uid: string, targetUsername: string): Promise<void> => {
    const userRef = firestore.doc(db, 'users', uid);
    const COST = 300;
    const usersRef = firestore.collection(db, 'users');
    const q = firestore.query(usersRef, firestore.where('username_lowercase', '==', targetUsername.toLowerCase()));
    const snap = await firestore.getDocs(q);
    if (snap.empty) throw new Error("User not found");
    const targetUser = snap.docs[0];
    const targetData = targetUser.data() as UserData;

    await firestore.runTransaction(db, async (t) => {
        const senderData = await getFreshUserData(t, userRef);
        if ((senderData.sparks || 0) < COST) throw new Error("Insufficient Sparks");
        
        const now = new Date();
        const baseDate = (targetData.dayPassExpiry && targetData.dayPassExpiry.toDate() > now) 
            ? targetData.dayPassExpiry.toDate() 
            : now;
        const newExpiry = new Date(baseDate.getTime() + (24 * 60 * 60 * 1000));
        
        t.update(userRef, { sparks: firestore.increment(-COST) });
        t.update(targetUser.ref, { 
            subscriptionStatus: 'day_pass',
            dayPassExpiry: firestore.Timestamp.fromDate(newExpiry),
            energy: firestore.increment(250),
            battleQuota: firestore.increment(10)
        });
    });
};

export const buySubjectUnlock = async (uid: string, subject: string): Promise<void> => {
    const userRef = firestore.doc(db, 'users', uid);
    const COST = 1000;
    await firestore.runTransaction(db, async (t) => {
        const data = await getFreshUserData(t, userRef);
        if ((data.sparks || 0) < COST) throw new Error("Insufficient Sparks");
        const current = data.inventory?.unlockedSubjects || [];
        if (current.includes(subject)) throw new Error("Subject already unlocked");
        t.update(userRef, { 
            sparks: firestore.increment(-COST),
            'inventory.unlockedSubjects': firestore.arrayUnion(subject)
        });
    });
};

export const useStreakFreeze = async (uid: string): Promise<void> => {
    const userRef = firestore.doc(db, 'users', uid);
    await firestore.runTransaction(db, async (t) => {
        const data = await getFreshUserData(t, userRef);
        const freezes = data.inventory?.streakFreezes || 0;
        if (freezes <= 0) throw new Error("No freezes left");
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        t.update(userRef, { 
            'inventory.streakFreezes': freezes - 1,
            lastStudyDate: firestore.Timestamp.fromDate(yesterday)
        });
    });
};

// --- END SHOP FUNCTIONS ---

export const recordHighStakesResult = async (uid: string, won: boolean): Promise<void> => {
    const userRef = firestore.doc(db, 'users', uid);
    if (won) await firestore.updateDoc(userRef, { sparks: firestore.increment(20) });
};

export const createSparksPaymentToken = async (userId: string, amount: number): Promise<string> => {
    const tokenRef = firestore.doc(firestore.collection(db, 'payment_tokens'));
    await firestore.setDoc(tokenRef, { userId, status: 'pending', type: 'sparks', amount, createdAt: firestore.serverTimestamp() });
    return tokenRef.id;
};

export const verifyAndAddSparks = async (userId: string, tokenId: string): Promise<{ success: boolean; amount?: number }> => {
    const tokenRef = firestore.doc(db, 'payment_tokens', tokenId);
    try {
        let addedAmount = 0;
        await firestore.runTransaction(db, async (transaction) => {
            const tokenSnap = await transaction.get(tokenRef);
            if (!tokenSnap.exists() || tokenSnap.data()?.userId !== userId || tokenSnap.data()?.status !== 'pending') throw new Error("Invalid Token");
            const sparksAmount = tokenSnap.data().amount;
            addedAmount = sparksAmount;
            const userRef = firestore.doc(db, 'users', userId);
            transaction.update(userRef, { sparks: firestore.increment(sparksAmount) });
            transaction.delete(tokenRef);
        });
        return { success: true, amount: addedAmount };
    } catch (e) { return { success: false }; }
};

export const ensureReferralCode = async (uid: string, currentData: UserData): Promise<string> => {
    if (currentData.referralCode) return currentData.referralCode;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const userRef = firestore.doc(db, 'users', uid);
    await firestore.updateDoc(userRef, { referralCode: code, referralCount: currentData.referralCount || 0, sparks: currentData.sparks || 0, energy: currentData.energy || 50 });
    return code;
};

export const getAllUsers = async (limit: number = 50): Promise<UserData[]> => {
    const usersRef = firestore.collection(db, 'users');
    const q = firestore.query(usersRef, firestore.orderBy('createdAt', 'desc'), firestore.limit(limit));
    const querySnapshot = await firestore.getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as UserData);
};

export const searchAllUsers = async (searchTerm: string): Promise<UserData[]> => {
    const usersRef = firestore.collection(db, 'users');
    const q = firestore.query(usersRef, firestore.where('username_lowercase', '>=', searchTerm.toLowerCase()), firestore.where('username_lowercase', '<=', searchTerm.toLowerCase() + '\uf8ff'), firestore.limit(20));
    const querySnapshot = await firestore.getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as UserData);
};

export const updateUserSubscriptionStatus = async (uid: string, status: 'free' | 'pro' | 'day_pass'): Promise<void> => {
    const userRef = firestore.doc(db, 'users', uid);
    const updateData: Partial<UserData> = { subscriptionStatus: status };
    if (status === 'pro') {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 30);
        updateData.proExpiryDate = firestore.Timestamp.fromDate(expiry);
        updateData.showFreeBooks = false;
        updateData.energy = 30000;
        updateData.battleQuota = firestore.increment(10) as any;
    } else if (status === 'day_pass') {
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + 24);
        updateData.dayPassExpiry = firestore.Timestamp.fromDate(expiry);
        updateData.showFreeBooks = false;
        updateData.energy = firestore.increment(250) as any;
        updateData.battleQuota = firestore.increment(10) as any;
    } else {
        updateData.proExpiryDate = null;
        updateData.trialExpiryDate = null;
        updateData.dayPassExpiry = null;
        updateData.showFreeBooks = true;
        updateData.battleQuota = 1;
    }
    await firestore.updateDoc(userRef, updateData as any);
};

export const grantProAccessByEmail = async (email: string, days: number): Promise<boolean> => {
    const usersRef = firestore.collection(db, 'users');
    const q = firestore.query(usersRef, firestore.where('email', '==', email));
    const querySnapshot = await firestore.getDocs(q);
    if (querySnapshot.empty) return false;
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    let currentExpiry = new Date();
    if (userData.proExpiryDate) {
        const existing = userData.proExpiryDate.toDate();
        if (existing > currentExpiry) currentExpiry = existing;
    }
    currentExpiry.setDate(currentExpiry.getDate() + days);
    await firestore.updateDoc(userDoc.ref, { 
        subscriptionStatus: 'pro', 
        proExpiryDate: firestore.Timestamp.fromDate(currentExpiry), 
        showFreeBooks: false, 
        energy: 30000,
        battleQuota: firestore.increment(10) 
    });
    return true;
};

export const deleteUserAccount = async (uid: string): Promise<void> => {
    await firestore.deleteDoc(firestore.doc(db, 'users', uid));
};

export const deleteCommunityQuestion = async (questionId: string): Promise<void> => {
    await firestore.deleteDoc(firestore.doc(db, 'community_questions', questionId));
};

export const getUserData = async (uid: string): Promise<UserData | null> => {
  const docSnap = await firestore.getDoc(firestore.doc(db, 'users', uid));
  return docSnap.exists() ? docSnap.data() as UserData : null;
};

export const updateUsername = async (uid: string, newUsername: string): Promise<void> => {
    if (await isUsernameTaken(newUsername)) throw new Error("Username taken.");
    await firestore.updateDoc(firestore.doc(db, 'users', uid), { username: newUsername, username_lowercase: newUsername.toLowerCase() });
};

export const updateUserProfilePicture = async (uid: string, url: string): Promise<void> => {
    await firestore.updateDoc(firestore.doc(db, 'users', uid), { profilePictureUrl: url });
};

export const updateUserDepartment = async (uid: string, department: 'Science' | 'Arts' | 'Commercial'): Promise<void> => {
    await firestore.updateDoc(firestore.doc(db, 'users', uid), { department });
};

export const updateUserInterests = async (uid: string, interests: string[]): Promise<void> => {
    await firestore.updateDoc(firestore.doc(db, 'users', uid), { subjectsOfInterest: interests });
};

export const updateUserStudyPlan = async (uid: string, plan: StudyPlan): Promise<void> => {
    await firestore.updateDoc(firestore.doc(db, 'users', uid), { studyPlan: plan, subjectsOfInterest: [] }); 
};

export const recalibrateStudyPlan = async (uid: string): Promise<void> => {
    await firestore.updateDoc(firestore.doc(db, 'users', uid), { studyPlan: firestore.deleteField() });
};

export const revertUserToFree = async (uid: string): Promise<void> => {
    await firestore.updateDoc(firestore.doc(db, 'users', uid), { subscriptionStatus: 'free', proExpiryDate: null, dayPassExpiry: null, showFreeBooks: true, battleQuota: 1 });
};

export const updateUserReadingProgress = async (uid: string, ebookId: string, currentPage: number, totalPages: number, isMissionMode: boolean = false): Promise<void> => {
    await syncManager.stageUpdate(`readingProgress.${ebookId}`, { currentPage, totalPages, lastAccessed: new Date().toISOString() });
    if (isMissionMode) {
        await updateDailyStreak(uid, true);
    }
    if (navigator.onLine) syncManager.flush();
};

export const updateUserExamProgress = async (uid: string, examId: string, progress: any): Promise<void> => {
    await syncManager.stageUpdate(`examProgress.${examId}`, { ...progress, lastUpdated: new Date().toISOString() });
    if (navigator.onLine) syncManager.flush();
};

export const updateUserReadingTime = async (uid: string, minutesToAdd: number): Promise<void> => {
    await syncManager.stageIncrement('totalReadingTime', minutesToAdd);
    if (navigator.onLine) syncManager.flush();
};

export const updateUserPoints = async (uid: string, pointsToAdd: number): Promise<void> => {
    await syncManager.stageIncrement('points', pointsToAdd);
    if (navigator.onLine) syncManager.flush();
};

export const markChapterAsComplete = async (uid: string, bookId: string, chapterIndex: number, isLastChapter: boolean): Promise<void> => {
    const userRef = firestore.doc(db, 'users', uid);
    const snap = await firestore.getDoc(userRef);
    if (!snap.exists()) return;
    const userData = snap.data() as UserData;
    
    const completedChapters = userData.completedChapters || {};
    const bookChapters = completedChapters[bookId] || [];
    
    if (bookChapters.includes(chapterIndex)) return;

    const batch = firestore.writeBatch(db);
    
    let pointsToAdd = 10;
    if (isLastChapter) pointsToAdd += 20;
    
    batch.update(userRef, {
        [`completedChapters.${bookId}`]: firestore.arrayUnion(chapterIndex),
        points: firestore.increment(pointsToAdd)
    });
    
    if (isLastChapter) {
        batch.update(userRef, {
            completedBooks: firestore.arrayUnion(bookId)
        });
        const ebookRef = firestore.doc(db, 'published_ebooks', bookId);
        batch.update(ebookRef, { totalReads: firestore.increment(1) });
    }
    
    await batch.commit();
    await updateDailyStreak(uid, true);
    await updateWeeklyProgress(uid, 'read');
    if (navigator.onLine) syncManager.flush();
};

export const markBookAsComplete = async (uid: string, ebookId: string, earnedPoints: boolean): Promise<void> => {
    const userRef = firestore.doc(db, 'users', uid);
    const ebookRef = firestore.doc(db, 'published_ebooks', ebookId);
    await firestore.updateDoc(ebookRef, { totalReads: firestore.increment(1) });
    await firestore.updateDoc(userRef, { completedBooks: firestore.arrayUnion(ebookId), points: earnedPoints ? firestore.increment(50) : firestore.increment(0) });
    await updateDailyStreak(uid, true);
    await updateWeeklyProgress(uid, 'read');
    if (navigator.onLine) syncManager.flush();
};

export const rateAndReviewBook = async (ebookId: string, userId: string, username: string, rating: number, comment: string, profilePictureUrl?: string): Promise<void> => {
    const ebookRef = firestore.doc(db, 'published_ebooks', ebookId);
    await firestore.addDoc(firestore.collection(ebookRef, 'reviews'), { userId, username, rating, comment, profilePictureUrl, createdAt: firestore.serverTimestamp() });
    const docSnap = await firestore.getDoc(ebookRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        const newCount = (data.ratingCount || 0) + 1;
        const newAvg = (((data.averageRating || 0) * (data.ratingCount || 0)) + rating) / newCount;
        await firestore.updateDoc(ebookRef, { averageRating: newAvg, ratingCount: newCount });
    }
};

export const getBookReviews = async (ebookId: string): Promise<BookReview[]> => {
    const q = firestore.query(firestore.collection(db, 'published_ebooks', ebookId, 'reviews'), firestore.orderBy('createdAt', 'desc'), firestore.limit(20));
    const snapshot = await firestore.getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookReview));
};

export const markExamQSTAsComplete = async (uid: string, examId: string, score: number, totalQuestions: number): Promise<void> => {
    const userRef = firestore.doc(db, 'users', uid);
    let pts = 25;
    if (totalQuestions > 0) {
        const pct = (score/totalQuestions)*100;
        if (pct >= 80) pts = 100; else if (pct >= 50) pts = 50;
    }
    const examDoc = await getExamQSTById(examId);
    await firestore.updateDoc(userRef, { completedExamQSTs: firestore.arrayUnion(examId), points: firestore.increment(pts), [`examProgress.${examId}`]: firestore.deleteField(), [`examScores.${examId}`]: { score, totalQuestions, date: new Date().toISOString(), subject: examDoc?.subject || 'General' } });
    await updateDailyStreak(uid, true);
    await updateWeeklyProgress(uid, 'exam');
    if (navigator.onLine) syncManager.flush();
};

export const updateDailyStreak = async (uid: string, isMissionMode: boolean = false): Promise<void> => {
    if (!isMissionMode) return;
    const userRef = firestore.doc(db, 'users', uid);
    const snap = await firestore.getDoc(userRef);
    if (!snap.exists()) return;
    const userData = snap.data() as UserData;
    const getDayId = (d: any) => {
        if (!d) return null;
        const date = d.toDate ? d.toDate() : new Date(d);
        return date.toDateString(); 
    };
    const todayStr = new Date().toDateString();
    const lastStudyStr = getDayId(userData.lastStudyDate);
    if (lastStudyStr === todayStr) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    const isConsecutive = lastStudyStr === yesterdayStr;
    const currentStreak = userData.currentStreak || 0;
    const newStreak = isConsecutive ? currentStreak + 1 : 1;
    await firestore.updateDoc(userRef, { currentStreak: newStreak, lastStudyDate: firestore.Timestamp.now() });
};

export const getLeaderboardUsers = async (limit: number = 100): Promise<UserData[]> => {
    const q = firestore.query(firestore.collection(db, 'users'), firestore.orderBy('points', 'desc'), firestore.limit(limit));
    const querySnapshot = await firestore.getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as UserData);
};

export const saveDraft = async (draftData: Draft): Promise<void> => {
    await firestore.setDoc(firestore.doc(db, 'drafts', draftData.id!), { ...draftData, updatedAt: firestore.serverTimestamp() }, { merge: true });
};

export const getDrafts = async (adminUid: string): Promise<Draft[]> => {
    const q = firestore.query(firestore.collection(db, 'drafts'), firestore.where('adminUid', '==', adminUid), firestore.orderBy('updatedAt', 'desc'));
    const querySnapshot = await firestore.getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as Draft);
};

export const deleteDraft = async (draftId: string): Promise<void> => {
    await firestore.deleteDoc(firestore.doc(db, 'drafts', draftId));
};

export const publishEbook = async (ebookId: string, ebookData: Ebook): Promise<void> => {
    await firestore.setDoc(firestore.doc(db, 'published_ebooks', ebookId), { ...ebookData, createdAt: firestore.serverTimestamp() }, { merge: true });
};

export const publishExamQST = async (examId: string, examData: ExamQST): Promise<void> => {
    await firestore.setDoc(firestore.doc(db, 'published_exam_qsts', examId), { ...examData, createdAt: firestore.serverTimestamp() }, { merge: true });
};

export const getPublishedEbooks = async (): Promise<Ebook[]> => {
    const q = firestore.query(firestore.collection(db, 'published_ebooks'), firestore.where('published', '==', true), firestore.orderBy('createdAt', 'desc'));
    const querySnapshot = await firestore.getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ebook));
};

export const getPublishedExamQSTs = async (): Promise<ExamQST[]> => {
    const q = firestore.query(firestore.collection(db, 'published_exam_qsts'), firestore.where('published', '==', true), firestore.orderBy('createdAt', 'desc'));
    const querySnapshot = await firestore.getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamQST));
};

export const getPublishedVideos = async (): Promise<Video[]> => {
    const q = firestore.query(firestore.collection(db, 'published_videos'), firestore.where('published', '==', true), firestore.orderBy('createdAt', 'desc'));
    const querySnapshot = await firestore.getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Video));
};

export const getVideoById = async (videoId: string): Promise<Video | null> => {
    const docSnap = await firestore.getDoc(firestore.doc(db, 'published_videos', videoId));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Video : null;
};

export const getEbookById = async (ebookId: string): Promise<Ebook | null> => {
    const docSnap = await firestore.getDoc(firestore.doc(db, 'published_ebooks', ebookId));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Ebook : null;
};

export const getEbookBySubjectAndTopic = async (subject: string, topic: string): Promise<Ebook | null> => {
    const q = firestore.query(firestore.collection(db, 'published_ebooks'), firestore.where('subject', '==', subject), firestore.where('topic', '==', topic), firestore.limit(1));
    const snap = await firestore.getDocs(q);
    return !snap.empty ? { id: snap.docs[0].id, ...snap.docs[0].data() } as Ebook : null;
};

export const getExamQSTById = async (examId: string): Promise<ExamQST | null> => {
    const docSnap = await firestore.getDoc(firestore.doc(db, 'published_exam_qsts', examId));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as ExamQST : null;
};

export const deletePublishedEbook = async (ebookId: string): Promise<void> => {
    await firestore.deleteDoc(firestore.doc(db, 'published_ebooks', ebookId));
};

export const deletePublishedExamQST = async (examId: string): Promise<void> => {
    await firestore.deleteDoc(firestore.doc(db, 'published_exam_qsts', examId));
};

export const saveContactSubmission = async (submission: any): Promise<void> => {
    await firestore.addDoc(firestore.collection(db, 'contact_submissions'), { ...submission, createdAt: firestore.serverTimestamp() });
};

export const getContactSubmissions = async (): Promise<ContactSubmission[]> => {
    const querySnapshot = await firestore.getDocs(firestore.query(firestore.collection(db, 'contact_submissions'), firestore.orderBy('createdAt', 'desc')));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContactSubmission));
};

export const deleteContactSubmission = async (id: string): Promise<void> => {
    await firestore.deleteDoc(firestore.doc(db, 'contact_submissions', id));
};

export const createAnnouncement = async (data: any): Promise<void> => {
    await firestore.addDoc(firestore.collection(db, 'announcements'), { ...data, createdAt: firestore.serverTimestamp() });
};

export const getAnnouncements = async (): Promise<Announcement[]> => {
    const querySnapshot = await firestore.getDocs(firestore.query(firestore.collection(db, 'announcements'), firestore.orderBy('createdAt', 'desc')));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
};

export const getRecentAnnouncements = async (limit: number = 10): Promise<Announcement[]> => {
    const querySnapshot = await firestore.getDocs(firestore.query(firestore.collection(db, 'announcements'), firestore.orderBy('createdAt', 'desc'), firestore.limit(limit)));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
};

export const deleteAnnouncement = async (id: string): Promise<void> => {
    await firestore.deleteDoc(firestore.doc(db, 'announcements', id));
};

export const getYouTubeChannelUrl = async (): Promise<string | null> => {
    const docSnap = await firestore.getDoc(firestore.doc(db, 'settings', 'site'));
    return docSnap.exists() ? docSnap.data().youtubeChannelUrl : null;
};

export const updateYouTubeChannelUrl = async (url: string): Promise<void> => {
    firestore.setDoc(firestore.doc(db, 'settings', 'site'), { youtubeChannelUrl: url }, { merge: true });
};

export const getMaintenanceStatus = (callback: (s: boolean) => void) => {
    return firestore.onSnapshot(firestore.doc(db, 'settings', 'site'), (snap) => callback(snap.exists() ? snap.data().maintenanceMode : false));
};

export const toggleMaintenanceMode = async (s: boolean): Promise<void> => {
    await firestore.setDoc(firestore.doc(db, 'settings', 'site'), { maintenanceMode: s }, { merge: true });
};

export const getExamDates = async () => {
    const docSnap = await firestore.getDoc(firestore.doc(db, 'settings', 'exams'));
    return docSnap.exists() ? Object.entries(docSnap.data()).map(([name, date]) => ({ name, date: date as string })) : [];
};

export const subscribeToExamDates = (callback: (d: any[]) => void) => {
    return firestore.onSnapshot(firestore.doc(db, 'settings', 'exams'), (snap) => {
        if (snap.exists()) callback(Object.entries(snap.data()).map(([name, date]) => ({ name, date: date as string })));
        else callback([]);
    });
};

export const updateExamDates = async (exams: any[]): Promise<void> => {
    await firestore.setDoc(firestore.doc(db, 'settings', 'exams'), exams.reduce((acc, curr) => ({ ...acc, [curr.name]: curr.date }), {}));
};

export const resetEbookProgressForAllUsers = async (id: string): Promise<void> => { console.warn(`Manual reset needed for ${id}`); };

export const rebuildLibraryRegistry = async (): Promise<void> => {
    const querySnapshot = await firestore.getDocs(firestore.collection(db, 'published_ebooks'));
    const batch = firestore.writeBatch(db);
    querySnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { lastRegistryRebuild: firestore.serverTimestamp() });
    });
    await batch.commit();
};

export const verifyAndUpgradeUser = async (userId: string, tokenId: string, plan: string): Promise<boolean> => {
    const tokenRef = firestore.doc(db, 'payment_tokens', tokenId);
    const tokenSnap = await firestore.getDoc(tokenRef);
    if (!tokenSnap.exists() || tokenSnap.data()?.userId !== userId || tokenSnap.data()?.status !== 'pending') return false;
    const userRef = firestore.doc(db, 'users', userId);
    const userSnap = await firestore.getDoc(userRef);
    let expiry = new Date();
    if (userSnap.exists() && userSnap.data().proExpiryDate) {
        const existing = userSnap.data().proExpiryDate.toDate();
        if (existing > expiry) expiry = existing;
    }
    if (plan === 'monthly') expiry.setDate(expiry.getDate() + 30);
    else if (plan === 'termly') expiry.setDate(expiry.getDate() + 90);
    const batch = firestore.writeBatch(db);
    batch.update(userRef, { subscriptionStatus: 'pro', trialExpiryDate: null, proExpiryDate: firestore.Timestamp.fromDate(expiry), showFreeBooks: false, energy: 30000, battleQuota: firestore.increment(10) as any });
    batch.delete(tokenRef);
    await batch.commit();
    return true;
};

export const deleteExpiredCommunityQuestions = async (): Promise<number> => {
    const q = firestore.query(firestore.collection(db, 'community_questions'), firestore.where('expiresAt', '<', firestore.Timestamp.now()), firestore.limit(500));
    const snapshot = await firestore.getDocs(q);
    const batch = firestore.writeBatch(db);
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    return snapshot.size;
};

export const postQuestion = async (data: any): Promise<void> => {
    const isAI = data.authorId === 'NOVA_AI_CORE';
    const now = firestore.Timestamp.now();
    if (isAI) {
        await firestore.addDoc(firestore.collection(db, 'community_questions'), { ...data, likes: [], answerCount: 0, createdAt: now, expiresAt: firestore.Timestamp.fromMillis(now.toMillis() + 86400000) });
        return;
    }
    const userRef = firestore.doc(db, 'users', data.authorId);
    await firestore.runTransaction(db, async (t) => {
        const userSnap = await t.get(userRef);
        if (!userSnap.exists()) throw new Error("Poster not found");
        const userData = userSnap.data() as UserData;
        const megaphoneCount = userData.inventory?.megaphoneCount || 0;
        const updates: any = { points: firestore.increment(5) };
        if (data.isMegaphone) {
            if (megaphoneCount <= 0) throw new Error("No megaphones");
            updates['inventory.megaphoneCount'] = megaphoneCount - 1;
        }
        const newQuestionRef = firestore.doc(firestore.collection(db, 'community_questions'));
        t.set(newQuestionRef, { ...data, likes: [], answerCount: 0, createdAt: now, expiresAt: firestore.Timestamp.fromMillis(now.toMillis() + 86400000) });
        t.update(userRef, updates);
    });
};

export const getQuestions = (callback: (q: CommunityQuestion[]) => void) => {
    const d = new Date(); d.setHours(d.getHours() - 24);
    const q = firestore.query(
        firestore.collection(db, 'community_questions'), 
        firestore.where('createdAt', '>', firestore.Timestamp.fromDate(d)), 
        firestore.orderBy('createdAt', 'desc')
    );
    return firestore.onSnapshot(q, (snap) => {
        const questions = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommunityQuestion));
        const sorted = questions.sort((a, b) => {
            if (a.isMegaphone && !b.isMegaphone) return -1;
            if (!a.isMegaphone && b.isMegaphone) return 1;
            return 0;
        });
        callback(sorted);
    });
};

export const toggleLikeQuestion = async (id: string, uid: string): Promise<void> => {
    const ref = firestore.doc(db, 'community_questions', id);
    const snap = await firestore.getDoc(ref);
    if (snap.exists()) {
        const likes = snap.data().likes || [];
        const isLiked = likes.includes(uid);
        const batch = firestore.writeBatch(db);
        if (isLiked) batch.update(ref, { likes: firestore.arrayRemove(uid) });
        else {
            batch.update(ref, { likes: firestore.arrayUnion(uid) });
            batch.update(firestore.doc(db, 'users', uid), { points: firestore.increment(5) });
        }
        await batch.commit();
    }
};

export const getComments = (id: string, callback: (c: CommunityAnswer[]) => void) => {
    return firestore.onSnapshot(firestore.query(firestore.collection(db, 'community_questions', id, 'answers'), firestore.orderBy('createdAt', 'asc')), (snap) => callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommunityAnswer))));
};

export const addComment = async (id: string, data: any): Promise<void> => {
    const batch = firestore.writeBatch(db);
    batch.set(firestore.doc(firestore.collection(db, 'community_questions', id, 'answers')), { ...data, createdAt: firestore.serverTimestamp() });
    batch.update(firestore.doc(db, 'community_questions', id), { answerCount: firestore.increment(1) });
    batch.update(firestore.doc(db, 'users', data.authorId), { points: firestore.increment(10) });
    await batch.commit();
};

export const getQuizAttempt = async (id: string, uid: string): Promise<{ correct: boolean, selectedOption?: string } | null> => {
    const ref = firestore.doc(db, 'community_questions', id, 'attempts', uid);
    const snap = await firestore.getDoc(ref);
    return snap.exists() ? snap.data() as any : null;
};

export const quizResultAttempt = async (id: string, uid: string, correct: boolean, selectedOption?: string): Promise<boolean> => {
    const ref = firestore.doc(db, 'community_questions', id, 'attempts', uid);
    const snap = await firestore.getDoc(ref);
    if (snap.exists()) return false;
    const batch = firestore.writeBatch(db);
    batch.set(ref, { attemptedAt: firestore.serverTimestamp(), correct, selectedOption: selectedOption || null });
    if (correct) batch.update(firestore.doc(db, 'users', uid), { points: firestore.increment(5) });
    await batch.commit();
    return true;
};

export const voteOnPoll = async (id: string, idx: number, uid: string): Promise<boolean> => {
    const ref = firestore.doc(db, 'community_questions', id);
    const snap = await firestore.getDoc(ref);
    if (!snap.exists() || snap.data().type !== 'poll' || (snap.data().voters || []).includes(uid)) return false;
    const opts = [...snap.data().pollOptions]; opts[idx].votes++;
    await firestore.updateDoc(ref, { pollOptions: opts, voters: firestore.arrayUnion(uid) });
    return true;
};

export const addBookmark = async (uid: string, b: any): Promise<void> => {
    const ref = firestore.doc(db, 'users', uid);
    await firestore.updateDoc(ref, { bookmarks: firestore.arrayUnion({ ...b, id: uuidv4(), createdAt: firestore.Timestamp.now() }) });
};

export const deleteBookmark = async (uid: string, b: Bookmark): Promise<void> => {
    await firestore.updateDoc(firestore.doc(db, 'users', uid), { bookmarks: firestore.arrayRemove(b) });
};

export const setWeeklyGoal = async (uid: string, goal: WeeklyGoal): Promise<void> => {
    await firestore.updateDoc(firestore.doc(db, 'users', uid), { weeklyGoal: goal });
};

export const updateWeeklyProgress = async (uid: string, type: 'read' | 'exam'): Promise<void> => {
    const userRef = firestore.doc(db, 'users', uid);
    const userData = await getUserData(uid);
    if (!userData || !userData.weeklyGoal) return;
    const now = new Date();
    const currentWeekId = now.getFullYear() + "-" + Math.ceil(((now).getTime() - (new Date(now.getFullYear(), 0, 1)).getTime())/86400000/7);
    if (userData.weeklyGoal.weekId === currentWeekId) {
        await firestore.updateDoc(userRef, { [`weeklyGoal.${type}Progress`]: firestore.increment(1) });
    }
};

export const saveGameLevel = async (data: any): Promise<void> => {
    await firestore.addDoc(firestore.collection(db, 'game_levels'), { ...data, createdAt: firestore.serverTimestamp() });
};

export const getGameLevels = async (gameId: string): Promise<GameLevel[]> => {
    const snapshot = await firestore.getDocs(firestore.query(firestore.collection(db, 'game_levels'), firestore.where('gameId', '==', gameId)));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GameLevel));
};

export const saveGameProgress = async (uid: string, gid: string, lvl: number): Promise<void> => {
    await syncManager.stageUpdate(`gameProgress.${gid}`, lvl);
    if (navigator.onLine) syncManager.flush();
};

export const useArcadeBoost = async (uid: string, type: string): Promise<boolean> => {
    const ref = firestore.doc(db, 'users', uid);
    try {
        await firestore.runTransaction(db, async (t) => {
            const snap = await t.get(ref);
            if (!snap.exists()) return;
            const data = snap.data() as UserData;
            let boosts = data.arcadeBoosts || { lastReset: firestore.Timestamp.now(), hintsUsed: 0, halvesUsed: 0, solvesUsed: 0 };
            const limits = (data.subscriptionStatus === 'pro' || data.subscriptionStatus === 'day_pass') ? { hint: 5, half: 3, solve: 1 } : { hint: 1, half: 0, solve: 0 };
            if (type === 'hint' && boosts.hintsUsed >= limits.hint) throw "Limit";
            if (type === 'half' && boosts.halvesUsed >= limits.half) throw "Limit";
            if (type === 'solve' && boosts.solvesUsed >= limits.solve) throw "Limit";
            boosts[`${type}sUsed`]++;
            t.update(ref, { arcadeBoosts: boosts });
        });
        return true;
    } catch { return false; }
};

export const toggleSyllabusTopic = async (uid: string, tid: string): Promise<void> => {
    const ref = firestore.doc(db, 'users', uid);
    const snap = await firestore.getDoc(ref);
    if (!snap.exists()) return;
    const current = snap.data().completedSyllabusTopics || [];
    await firestore.updateDoc(ref, { completedSyllabusTopics: current.includes(tid) ? firestore.arrayRemove(tid) : firestore.arrayUnion(tid) });
};

export const addJournalEntry = async (uid: string, c: string): Promise<void> => {
    const userRef = firestore.doc(db, 'users', uid);
    await firestore.addDoc(firestore.collection(db, 'users', uid, 'journal'), { content: c, createdAt: firestore.serverTimestamp() });
};

export const getJournalEntries = async (uid: string): Promise<JournalEntry[]> => {
    const snapshot = await firestore.getDocs(firestore.query(firestore.collection(db, 'users', uid, 'journal'), firestore.orderBy('createdAt', 'desc')));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JournalEntry));
};

export const updateJournalEntry = async (uid: string, eid: string, c: string): Promise<void> => {
    await firestore.updateDoc(firestore.doc(db, 'users', uid, 'journal', eid), { content: c });
};

export const deleteJournalEntry = async (uid: string, eid: string): Promise<void> => {
    await firestore.deleteDoc(firestore.doc(db, 'users', uid, 'journal', eid));
};

export const createBattle = async (uid: string, uname: string, subject: string, topic: string, cfg: any): Promise<string> => {
    const eb = await getEbookBySubjectAndTopic(subject, topic);
    if (!eb) throw new Error("Operational book not found for this topic.");
    let allQs: Question[] = []; eb.chapters.forEach(ch => { if (ch.questions) allQs = [...allQs, ...ch.questions]; });
    if (allQs.length === 0) throw new Error("This topic has no battle questions ready.");
    const hostTrack = shuffleArray(allQs).slice(0, cfg.numQuestions);
    const docRef = await firestore.addDoc(firestore.collection(db, 'battles'), { hostId: uid, hostName: uname, status: 'waiting', ebookId: eb.id, ebookTopic: eb.topic, hostQuestions: hostTrack, opponentQuestions: [], currentIndex: 0, hostFinishedTurn: false, opponentFinishedTurn: false, hostScore: 0, opponentScore: 0, mode: cfg.mode, numQuestions: cfg.numQuestions, createdAt: firestore.serverTimestamp() });
    return docRef.id;
};

export const joinBattle = async (bid: string, uid: string, uname: string): Promise<boolean> => {
    const ref = firestore.doc(db, 'battles', bid);
    const snap = await firestore.getDoc(ref);
    if (!snap.exists() || snap.data().status !== 'waiting') return false;
    const eb = await getEbookById(snap.data().ebookId);
    if (!eb) return false;
    let allQs: Question[] = []; eb.chapters.forEach(ch => { if (ch.questions) allQs = [...allQs, ...ch.questions]; });
    const oppTrack = shuffleArray(allQs).slice(0, snap.data().numQuestions);
    await firestore.updateDoc(ref, { opponentId: uid, opponentName: uname, status: 'active', opponentQuestions: oppTrack });
    return true;
};

export const updateBattleScore = async (bid: string, uid: string, s: number): Promise<void> => {
    const ref = firestore.doc(db, 'battles', bid);
    const snap = await firestore.getDoc(ref);
    if (!snap.exists()) return;
    const update = snap.data().hostId === uid ? { hostScore: s, hostFinishedTurn: true } : { opponentScore: s, opponentFinishedTurn: true };
    await firestore.updateDoc(ref, update);
};

export const completeBattleTurn = async (bid: string): Promise<void> => {
    const ref = firestore.doc(db, 'battles', bid);
    const snap = await firestore.getDoc(ref);
    if (!snap.exists()) return;
    const d = snap.data();
    if (d.hostFinishedTurn && d.opponentFinishedTurn) {
        const next = d.currentIndex + 1;
        await firestore.updateDoc(ref, { currentIndex: next, hostFinishedTurn: false, opponentFinishedTurn: false, status: next >= d.numQuestions ? 'finished' : 'active' });
    }
};

export const subscribeToBattle = (bid: string, callback: (b: Battle | null) => void) => {
    return firestore.onSnapshot(firestore.doc(db, 'battles', bid), (doc) => callback(doc.exists() ? { id: doc.id, ...doc.data() } as Battle : null));
};

export const deleteBattle = async (bid: string): Promise<void> => { await firestore.deleteDoc(firestore.doc(db, 'battles', bid)); };

export const searchUsers = async (q: string): Promise<{id: string, username: string}[]> => {
    const snap = await firestore.getDocs(firestore.query(firestore.collection(db, 'users'), firestore.where('username_lowercase', '>=', q.toLowerCase()), firestore.where('username_lowercase', '<=', q.toLowerCase() + '\uf8ff'), firestore.limit(5)));
    return snap.docs.map(doc => ({ id: doc.id, username: doc.data().username }));
};

export const sendBattleRequest = async (fid: string, fname: string, tid: string, tname: string, subject: string, topic: string, cfg: any): Promise<void> => {
    await firestore.addDoc(firestore.collection(db, 'battle_requests'), { fromId: fid, fromName: fname, toId: tid, toName: tname, ebookId: 'DYNAMIC_TOPIC', ebookTopic: topic, subject: subject, mode: cfg.mode, numQuestions: cfg.numQuestions, status: 'pending', createdAt: firestore.serverTimestamp() });
};

export const getBattleRequests = (uid: string, callback: (r: BattleRequest[]) => void) => {
    return firestore.onSnapshot(firestore.query(firestore.collection(db, 'battle_requests'), firestore.where('toId', '==', uid), firestore.where('status', '==', 'pending'), firestore.orderBy('createdAt', 'desc')), (snap) => callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BattleRequest))));
};

export const getMyAcceptedRequests = (uid: string, callback: (r: BattleRequest[]) => void) => {
    return firestore.onSnapshot(firestore.query(firestore.collection(db, 'battle_requests'), firestore.where('fromId', '==', uid), firestore.where('status', '==', 'accepted'), firestore.limit(1)), (snap) => callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BattleRequest))));
};

export const getMyPendingRequests = (uid: string, callback: (r: BattleRequest[]) => void) => {
    return firestore.onSnapshot(firestore.query(firestore.collection(db, 'battle_requests'), firestore.where('fromId', '==', uid), firestore.where('status', '==', 'pending'), firestore.orderBy('createdAt', 'desc')), (snap) => callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BattleRequest))));
};

export const acceptBattleRequest = async (rid: string, bid: string): Promise<void> => {
    await firestore.updateDoc(firestore.doc(db, 'battle_requests', rid), { status: 'accepted', battleId: bid });
};

export const rejectBattleRequest = async (rid: string): Promise<void> => {
    await firestore.updateDoc(firestore.doc(db, 'battle_requests', rid), { status: 'rejected' });
};

export const voteOnDebate = async (wid: string, v: string, uid: string): Promise<void> => {
    const ref = firestore.doc(db, 'debates', wid);
    const snap = await firestore.getDoc(ref);
    if (!snap.exists()) await firestore.setDoc(ref, { weekId: wid, yesVotes: v === 'yes' ? 1 : 0, noVotes: v === 'no' ? 1 : 0, voters: [uid] });
    else {
        if (snap.data().voters.includes(uid)) return;
        await firestore.updateDoc(ref, { [`${v}Votes`]: firestore.increment(1), voters: firestore.arrayUnion(uid) });
    }
};

export const getDebate = (wid: string, callback: (d: Debate | null) => void) => {
    return firestore.onSnapshot(firestore.doc(db, 'debates', wid), (doc) => callback(doc.exists() ? { id: doc.id, ...doc.data() } as Debate : null));
};

export const updateShowFreeBooks = async (uid: string, s: boolean): Promise<void> => {
    await firestore.updateDoc(firestore.doc(db, 'users', uid), { showFreeBooks: s });
};

export const updateLastProPromptDate = async (uid: string): Promise<void> => {
    await firestore.updateDoc(firestore.doc(db, 'users', uid), { lastProPromptDate: firestore.serverTimestamp() });
};

export const createPaymentToken = async (uid: string): Promise<string> => {
    const ref = firestore.doc(firestore.collection(db, 'payment_tokens'));
    await firestore.setDoc(ref, { userId: uid, status: 'pending', createdAt: firestore.serverTimestamp() });
    return ref.id;
};