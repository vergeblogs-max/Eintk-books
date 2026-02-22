
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { doc, writeBatch, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { getLocalUserData, saveLocalUserData } from './offlineService';

interface SyncEntry {
  field: string;
  value: any;
  timestamp: number;
  op: 'SET' | 'ADD';
}

interface SyncDB extends DBSchema {
  sync_buffer: {
    key: string;
    value: SyncEntry;
  };
}

const DB_NAME = 'eintk-sync-manager';
const STORE_NAME = 'sync_buffer';

class SyncManager {
  private dbPromise: Promise<IDBPDatabase<SyncDB>>;
  private userId: string | null = null;
  private isSyncing = false;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.dbPromise = openDB<SyncDB>(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'field' });
        }
      },
    });
  }

  setUserId(uid: string | null) {
    this.userId = uid;
  }

  /**
   * Subscribe to local data changes.
   */
  subscribe(callback: () => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify() {
    this.listeners.forEach(cb => cb());
  }

  /**
   * Updates the local user profile in IndexedDB immediately so UI reflects changes
   * even before cloud sync.
   */
  private async updateLocalProfile(field: string, value: any, op: 'SET' | 'ADD') {
    if (!this.userId) return;
    const localData = await getLocalUserData(this.userId);
    if (!localData) return;

    const keys = field.split('.');
    let current: any = localData;

    // Handle nested fields (e.g., readingProgress.bookId)
    for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
    }

    const lastKey = keys[keys.length - 1];
    if (op === 'ADD') {
        current[lastKey] = (current[lastKey] || 0) + value;
    } else {
        current[lastKey] = value;
    }

    await saveLocalUserData(localData);
    this.notify(); // Alert the app that IndexedDB has new local state
  }

  /**
   * Stages an update (Last-Write-Wins).
   */
  async stageUpdate(field: string, value: any) {
    const db = await this.dbPromise;

    // Conflict Resolution for progress: only update if newer
    if (field.startsWith('readingProgress.')) {
        const existing = await db.get(STORE_NAME, field);
        if (existing && existing.value?.lastAccessed && value.lastAccessed) {
            const existingTime = new Date(existing.value.lastAccessed).getTime();
            const newTime = new Date(value.lastAccessed).getTime();
            if (newTime < existingTime) return;
        }
    }

    await db.put(STORE_NAME, {
      field,
      value,
      timestamp: Date.now(),
      op: 'SET'
    });

    // Mirror to local profile immediately
    await this.updateLocalProfile(field, value, 'SET');
  }

  /**
   * Stages a numeric increment (Additive).
   */
  async stageIncrement(field: string, amount: number) {
    const db = await this.dbPromise;
    const existing = await db.get(STORE_NAME, field);
    
    // Accumulate the increment in the buffer
    const currentBufferValue = (existing && existing.op === 'ADD') ? Number(existing.value) : 0;
    
    await db.put(STORE_NAME, {
      field,
      value: currentBufferValue + amount,
      timestamp: Date.now(),
      op: 'ADD'
    });

    // Mirror to local profile immediately
    await this.updateLocalProfile(field, amount, 'ADD');
  }

  /**
   * Returns all pending updates in the buffer.
   */
  async getDirtyData(): Promise<SyncEntry[]> {
    const db = await this.dbPromise;
    return await db.getAll(STORE_NAME);
  }

  /**
   * Clears the buffer.
   */
  async clearBuffer() {
    const db = await this.dbPromise;
    await db.clear(STORE_NAME);
  }

  /**
   * Pushes all buffered changes to Firestore using atomic operations.
   */
  async flush() {
    if (!this.userId || this.isSyncing || !navigator.onLine) return;

    try {
      const dirtyEntries = await this.getDirtyData();
      if (dirtyEntries.length === 0) return;

      this.isSyncing = true;
      const userRef = doc(db, 'users', this.userId);
      const batch = writeBatch(db);
      
      const updatePayload: Record<string, any> = {
        lastSyncTimestamp: serverTimestamp()
      };

      for (const entry of dirtyEntries) {
          if (entry.op === 'ADD') {
              updatePayload[entry.field] = increment(entry.value);
          } else {
              updatePayload[entry.field] = entry.value;
          }
      }

      batch.update(userRef, updatePayload);
      await batch.commit();
      
      await this.clearBuffer();
      console.log("[SyncManager] Successful background flush.");
    } catch (e) {
      console.error("[SyncManager] Background flush failed:", e);
    } finally {
      this.isSyncing = false;
    }
  }
}

export const syncManager = new SyncManager();
