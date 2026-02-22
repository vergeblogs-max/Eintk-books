import type { Ebook, ExamQST } from '../types';

/**
 * PROJECT ZERO-LATENCY: THE CONTENT VAULT (PHASE 1)
 * This service acts as a synchronous memory mirror for IndexedDB.
 * It allows the UI to render content on the first frame without async delays (flicker deletion).
 */

interface VaultData {
    missions: Ebook[];
    backlog: Ebook[];
    exams: ExamQST[];
    explore: Ebook[];
    dailyKey: string | null;
}

let vault: VaultData = {
    missions: [],
    backlog: [],
    exams: [],
    explore: [],
    dailyKey: null
};

// Use 'en-CA' for consistent YYYY-MM-DD format regardless of locale
const getTodayKey = () => new Date().toLocaleDateString('en-CA');

export const contentVault = {
    /**
     * Sets today's mission data and updates the daily key.
     */
    setMissions: (missions: Ebook[], backlog: Ebook[]) => {
        vault.missions = missions;
        vault.backlog = backlog;
        vault.dailyKey = getTodayKey();
    },

    /**
     * Synchronously returns today's missions from RAM.
     */
    getMissions: () => vault.missions,

    /**
     * Synchronously returns the mission backlog from RAM.
     */
    getBacklog: () => vault.backlog,

    /**
     * Sets the static exam list.
     * Sorts them by title to ensure the UI order remains permanent and predictable.
     */
    setExams: (exams: ExamQST[]) => {
        vault.exams = [...exams].sort((a, b) => a.title.localeCompare(b.title));
    },

    /**
     * Synchronously returns the exam list from RAM.
     */
    getExams: () => vault.exams,

    /**
     * Sets the explore feed content.
     */
    setExplore: (books: Ebook[]) => {
        vault.explore = books;
    },

    /**
     * Synchronously returns the explore feed from RAM.
     */
    getExplore: () => vault.explore,

    /**
     * Validation Logic:
     * Checks if the vault is empty or if the date has shifted (midnight transition).
     */
    needsHydration: () => {
        const today = getTodayKey();
        const isNewDay = vault.dailyKey !== today;
        const isEmpty = vault.missions.length === 0 && vault.exams.length === 0;
        return isNewDay || isEmpty;
    },

    /**
     * Resets the vault. 
     * Useful for logouts or manual plan recalibrations to ensure clean memory.
     */
    clear: () => {
        vault = {
            missions: [],
            backlog: [],
            exams: [],
            explore: [],
            dailyKey: null
        };
    }
};