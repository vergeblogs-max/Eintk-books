
import { getPublishedEbooks, getPublishedExamQSTs } from './firestoreService';
import { 
  saveOfflineBook, saveOfflineExam, 
  getAllOfflineBookIds, getAllOfflineExamIds, saveGameAsset, hasGameAsset
} from './offlineService';
import { resolveMissionToBook } from './missionResolver';
import type { UserData, Ebook, ExamQST } from '../types';
import { FLAGS } from '../data/gameData';

type SyncTask = 
  | { type: 'book'; name: string; data: Ebook }
  | { type: 'exam'; name: string; data: ExamQST }
  | { type: 'asset'; name: string; data: { id: string; url: string } };

const LS_SYNC_STAGE_KEY = 'eintk_sync_stage'; 
const BATCH_SIZE = 2; 
const COOLING_PERIOD_MS = 1500; 

class SyncQueue {
  private queue: SyncTask[] = [];
  private isProcessing = false;
  private onProgressCallback: ((progress: number) => void) | null = null;
  private totalInQueue = 0;
  private processedCount = 0;

  /**
   * PHASE 1: VITAL SYNC
   * Implementing Step 2 & 3 of the Priority Protocol:
   * Downloads immediate mission books (Today/Tomorrow) in 'Complete' tier.
   */
  async startVitalSync(userData: UserData, onProgress: (p: number) => void) {
    if (this.isProcessing) return;
    if (!navigator.onLine) {
        onProgress(100);
        return;
    }

    this.onProgressCallback = onProgress;
    this.isProcessing = true;
    this.processedCount = 0;

    try {
        const allEbooks = await getPublishedEbooks();
        const localIds = await getAllOfflineBookIds();
        const localSet = new Set(localIds);
        
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

        // Step 2 & 3: Books containing chapters assigned for Today and Tomorrow
        const currentMissions = [
            ...(userData.studyPlan?.completeSchedule?.[today] || []),
            ...(userData.studyPlan?.completeSchedule?.[tomorrow] || [])
        ];

        const vitalTasks: SyncTask[] = [];

        currentMissions.forEach(mStr => {
            const res = resolveMissionToBook(mStr, allEbooks, 'pro');
            if (res && !localSet.has(res.book.id)) {
                vitalTasks.push({ type: 'book', name: res.book.title, data: res.book });
            }
        });

        if (vitalTasks.length === 0) {
            onProgress(100);
            this.isProcessing = false;
            return;
        }

        this.totalInQueue = vitalTasks.length;
        this.queue = vitalTasks;
        
        await this.processSteadyPulse(true); 
        localStorage.setItem(LS_SYNC_STAGE_KEY, 'ghost');
    } catch (e) {
        console.error("[Sync] Vital Sync Error:", e);
        onProgress(100); 
    } finally {
        this.isProcessing = false;
    }
  }

  /**
   * PHASE 2: GHOST SYNC (Steps 4, 5, 6)
   * 4. Explore feed books, Arcade, Exams.
   * 5. Remaining Complete books in user plan.
   * 6. Summary books for everything at once.
   */
  async startGhostSync(userData: UserData) {
    if (this.isProcessing) return;
    if (!navigator.onLine) return;

    this.isProcessing = true;
    this.processedCount = 0;

    try {
        const [allEbooks, allExams, localBookIds, localExamIds] = await Promise.all([
            getPublishedEbooks(),
            getPublishedExamQSTs(),
            getAllOfflineBookIds(),
            getAllOfflineExamIds()
        ]);

        const localBookSet = new Set(localBookIds);
        const localExamSet = new Set(localExamIds);
        const tasks: SyncTask[] = [];

        // --- STEP 4: EXPLORE, ARCADE, EXAMS ---
        allExams.forEach(e => {
            if (!localExamSet.has(e.id)) tasks.push({ type: 'exam', name: e.title, data: e });
        });
        for (const flag of FLAGS) {
            const id = `flag_${flag.code}`;
            if (!(await hasGameAsset(id))) {
                tasks.push({ type: 'asset', name: `Flag: ${flag.name}`, data: { id, url: `https://flagcdn.com/w320/${flag.code}.png` } });
            }
        }
        allEbooks.filter(b => b.subject === 'General').forEach(b => {
            if (!localBookSet.has(b.id)) tasks.push({ type: 'book', name: `[Explore] ${b.title}`, data: b });
        });

        // --- STEP 5: REMAINING COMPLETE PLAN BOOKS ---
        const schedule = userData.studyPlan?.completeSchedule || {};
        Object.values(schedule).flat().forEach(mStr => {
            const res = resolveMissionToBook(mStr, allEbooks, 'pro');
            if (res && !localBookSet.has(res.book.id)) {
                tasks.push({ type: 'book', name: res.book.title, data: res.book });
            }
        });

        // --- STEP 6: GLOBAL SUMMARY FALLBACK ---
        // Download summary versions for every book in the library (Safety fallback)
        allEbooks.filter(b => b.accessLevel === 'free').forEach(b => {
            if (!localBookSet.has(b.id)) {
                tasks.push({ type: 'book', name: `[Summary] ${b.title}`, data: b });
            }
        });

        if (tasks.length === 0) {
            localStorage.setItem(LS_SYNC_STAGE_KEY, 'complete');
            this.isProcessing = false;
            return;
        }

        this.totalInQueue = tasks.length;
        this.queue = tasks;
        
        await this.processSteadyPulse(false);
        localStorage.setItem(LS_SYNC_STAGE_KEY, 'complete');

    } catch (e) {
        console.error("[Sync] Ghost Sync Error:", e);
    } finally {
        this.isProcessing = false;
    }
  }

  private async processSteadyPulse(isVital: boolean) {
    while (this.queue.length > 0) {
        const batch = this.queue.splice(0, BATCH_SIZE);
        
        await Promise.all(batch.map(async (task) => {
            try {
                if (task.type === 'book') await saveOfflineBook(task.data);
                else if (task.type === 'exam') await saveOfflineExam(task.data);
                else if (task.type === 'asset') await saveGameAsset(task.data.id, task.data.url);
                
                this.processedCount++;
                
                if (isVital && this.onProgressCallback) {
                    const pct = Math.round((this.processedCount / this.totalInQueue) * 100);
                    this.onProgressCallback(pct);
                }
            } catch (err) {
                this.processedCount++; 
            }
        }));

        if (this.queue.length > 0) {
            await new Promise(resolve => setTimeout(resolve, COOLING_PERIOD_MS));
        }
    }

    if (isVital && this.onProgressCallback) {
        this.onProgressCallback(100);
    }
  }
}

export const syncQueue = new SyncQueue();
