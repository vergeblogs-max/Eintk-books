
import { db } from '../firebase';
import { collection, query, where, getDocs, updateDoc, increment } from 'firebase/firestore';

export const claimReferralReward = async (referralCode: string): Promise<{ success: boolean; rewardType?: string; amount?: number; error?: string }> => {
    try {
        // 1. Find the referrer
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('referralCode', '==', referralCode));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.error("Invalid referral code");
            return { success: false, error: 'Invalid referral code' };
        }

        const referrerDoc = querySnapshot.docs[0];
        
        // 2. Define Reward (50 Sparks)
        const REWARD_SPARKS = 50; 
        
        // 3. Apply Update
        // Increment referral count and add Sparks
        await updateDoc(referrerDoc.ref, {
            referralCount: increment(1),
            sparks: increment(REWARD_SPARKS)
        });

        return { success: true, rewardType: 'sparks', amount: REWARD_SPARKS };

    } catch (error: any) {
        console.error('Error claiming referral:', error);
        return { success: false, error: error.message };
    }
};
