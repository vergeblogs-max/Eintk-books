
import type { Ebook } from '../types';

export interface MissionResult {
    book: Ebook;
    startChapter: number;
    endChapter: number;
    label: string;
}

/**
 * Maps a Granular Mission String (e.g., "Physics|Mechanics|Scalars|1|2") to a specific Ebook and range.
 * Respects the user's subscription tier.
 */
export const resolveMissionToBook = (
    missionId: string, 
    allEbooks: Ebook[], 
    subscriptionStatus: 'free' | 'pro' | 'day_pass'
): MissionResult | null => {
    if (!missionId) return null;

    const parts = missionId.split('|');
    if (parts.length < 3) return null;
    
    const [subject, category, subtopic, startStr, endStr] = parts;
    const startCh = startStr ? parseInt(startStr) : 1;
    const endCh = endStr ? parseInt(endStr) : 1;

    const isProTier = subscriptionStatus === 'pro' || subscriptionStatus === 'day_pass';

    // 1. Filter books matching the specific subject and subtopic
    const matches = allEbooks.filter(b => 
        b.subject === subject && 
        b.topic === subtopic
    );

    if (matches.length === 0) return null;

    // 2. Select based on access level
    let selectedBook: Ebook;
    if (isProTier) {
        const proVersion = matches.find(b => b.accessLevel === 'pro');
        selectedBook = proVersion || matches.find(b => b.accessLevel === 'free') || matches[0];
    } else {
        const freeVersion = matches.find(b => b.accessLevel === 'free');
        selectedBook = freeVersion || matches[0];
    }

    return {
        book: selectedBook,
        startChapter: startCh,
        endChapter: endCh,
        label: startCh === endCh ? `Chapter ${startCh}` : `Chapters ${startCh} - ${endCh}`
    };
};
