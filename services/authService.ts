
import * as firebaseAuth from 'firebase/auth';
import { doc, setDoc, serverTimestamp, Timestamp, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { isUsernameTaken, ensureReferralCode } from './firestoreService';
import { claimReferralReward } from './claim_referral';
import type { UserData } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { syncManager } from './syncManager';

const INSTALL_KEY = 'eintk_installation_id';

/**
 * Returns the existing Installation ID or creates a new one.
 * This ID is permanent for the device/browser.
 */
export const getOrCreateInstallationId = (): string => {
    let installId = localStorage.getItem(INSTALL_KEY);
    if (!installId) {
        installId = uuidv4();
        localStorage.setItem(INSTALL_KEY, installId);
    }
    return installId;
};

export const signUp = async (username: string, email: string, password: string, profilePictureUrl: string, state: string, department: UserData['department'], referralCode?: string): Promise<void> => {
    try {
        if (!username || username.trim().length < 3) {
            throw new Error("Username must be at least 3 characters long.");
        }
        
        const installId = getOrCreateInstallationId();
        const currentUser = auth.currentUser;

        if (!currentUser || !currentUser.isAnonymous) {
             const userCredential = await firebaseAuth.createUserWithEmailAndPassword(auth, email, password);
             const usernameExists = await isUsernameTaken(username);
             
             if (usernameExists) {
                 await userCredential.user.delete();
                 throw new Error(`Username "${username}" is already taken. Please choose another one.`);
             }

             await createFirestoreUser(userCredential.user, username, profilePictureUrl, state, department, installId, referralCode);
             
             // Process referral directly
             if (referralCode) {
                 await claimReferralReward(referralCode);
             }
             
             await firebaseAuth.sendEmailVerification(userCredential.user);
             await firebaseAuth.signOut(auth); 
             return;
        }

        const usernameExists = await isUsernameTaken(username);
        if (usernameExists) {
            throw new Error(`Username "${username}" is already taken. Please choose another one.`);
        }

        const credential = firebaseAuth.EmailAuthProvider.credential(email, password);
        const userCredential = await firebaseAuth.linkWithCredential(currentUser, credential);
        
        await createFirestoreUser(userCredential.user, username, profilePictureUrl, state, department, installId, referralCode);
        
        if (referralCode) {
             await claimReferralReward(referralCode);
        }
        
        await firebaseAuth.sendEmailVerification(userCredential.user);

    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use' || error.code === 'auth/credential-already-in-use') {
            throw new Error('This email address is already in use by another account.');
        }
        if (error.code === 'auth/weak-password') {
            throw new Error('The password is too weak. It must be at least 6 characters long.');
        }
        throw new Error(error.message);
    }
};

export const signInWithGoogle = async (): Promise<{ user: firebaseAuth.User; needsProfileSetup: boolean }> => {
    const provider = new firebaseAuth.GoogleAuthProvider();
    try {
        const result = await firebaseAuth.signInWithPopup(auth, provider);
        const user = result.user;

        const userDocRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
            const currentData = docSnap.data() as UserData;
            const isBypassed = currentData?.installationId === 'override' || currentData?.installationId === 'none';
            const isAdmin = currentData?.role === 'central admin';
            
            const installId = getOrCreateInstallationId();
            // Skip device locking for admins to prevent issues with ephemeral environments (AI Studio)
            if (!isBypassed && !isAdmin) {
                // Device sync: Tell Firestore this is our current device
                await updateDoc(userDocRef, { installationId: installId });
            }
            return { user, needsProfileSetup: false };
        } else {
            return { user, needsProfileSetup: true };
        }
    } catch (error: any) {
        throw new Error(error.message);
    }
};

export const completeGoogleSignup = async (uid: string, email: string, username: string, profilePictureUrl: string, state: string, department: UserData['department'], referralCode?: string): Promise<void> => {
    if (!username || username.trim().length < 3) {
        throw new Error("Username must be at least 3 characters long.");
    }
    
    const usernameExists = await isUsernameTaken(username);
    if (usernameExists) {
        throw new Error(`Username "${username}" is already taken. Please choose another one.`);
    }

    const installId = getOrCreateInstallationId();
    const mockUser = { uid, email } as firebaseAuth.User;
    await createFirestoreUser(mockUser, username, profilePictureUrl, state, department, installId, referralCode);
    
    if (referralCode) {
        await claimReferralReward(referralCode);
    }
};

const createFirestoreUser = async (user: firebaseAuth.User, username: string, profilePictureUrl: string, state: string, department: UserData['department'], installId: string, referralCode?: string) => {
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 3);
    const trialExpiryTimestamp = Timestamp.fromDate(trialEndDate);
    
    // Monthly Refill Tracking
    const now = new Date();
    const refillMonth = `${now.getMonth() + 1}-${now.getFullYear()}`;

    // Generate own referral code immediately on signup
    const myReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        username: username,
        username_lowercase: username.toLowerCase(),
        email: user.email,
        profilePictureUrl: profilePictureUrl,
        state: state,
        department: department,
        subjectsOfInterest: [], // Empty, will be filled in Aether Setup
        role: 'user',
        subscriptionStatus: 'pro', // Start with Pro Trial
        trialExpiryDate: trialExpiryTimestamp, 
        proExpiryDate: null, // Critical: Trial is not "Full Pro"
        points: 0,
        totalReadingTime: 0,
        createdAt: serverTimestamp(),
        installationId: installId,
        referralCode: myReferralCode, 
        referredBy: referralCode || null, 
        referralCount: 0,
        sparks: 0,
        energy: 50, // Trial users get 50 energy
        lastRefillMonth: refillMonth
    });
};

export const logIn = async (email: string, password: string): Promise<void> => {
    try {
        const userCredential = await firebaseAuth.signInWithEmailAndPassword(auth, email, password);
        
        const userDocRef = doc(db, 'users', userCredential.user.uid);
        const userSnap = await getDoc(userDocRef);
        const currentData = userSnap.data() as UserData;
        
        const isBypassed = currentData?.installationId === 'override' || currentData?.installationId === 'none';
        const isAdmin = currentData?.role === 'central admin';
        
        const installId = getOrCreateInstallationId();
        // Skip device locking for admins to prevent issues with ephemeral environments (AI Studio)
        if (!isBypassed && !isAdmin) {
            await updateDoc(userDocRef, { installationId: installId });
        }

    } catch (error) {
        const authError = error as firebaseAuth.AuthError;
        throw new Error(authError.message);
    }
};

export const logOut = async (): Promise<void> => {
    try {
        const currentUser = auth.currentUser;
        if (currentUser) {
            const userRef = doc(db, 'users', currentUser.uid);
            // Phase 1: Device Unlock - Clear installationId on cloud
            await updateDoc(userRef, { installationId: null });
        }
        
        // Sync one last time before logout
        await syncManager.flush();
        await firebaseAuth.signOut(auth);

        // --- CLEAR LOCAL STATE ---
        // Clean up all keys associated with this app to prevent account pollution on shared browsers
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('eintk_')) {
                localStorage.removeItem(key);
            }
        });

    } catch (error) {
        const authError = error as firebaseAuth.AuthError;
        throw new Error(authError.message);
    }
};
