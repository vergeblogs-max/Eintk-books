import { openDB, DBSchema } from 'idb';
import type { Ebook, ExamQST, UserData } from '../types';

interface OfflineDB extends DBSchema {
  books: {
    key: string;
    value: Ebook;
  };
  exams: {
    key: string;
    value: ExamQST;
  };
  user_profile: {
    key: string;
    value: UserData;
  };
  game_assets: {
    key: string;
    value: {
        id: string;
        blob: Blob;
        mimeType: string;
    };
  };
  settings: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'eintk-offline-content';
const DB_VERSION = 5;

export const initOfflineDB = async () => {
  return openDB<OfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      if (!db.objectStoreNames.contains('books')) {
        db.createObjectStore('books', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('exams')) {
        db.createObjectStore('exams', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('user_profile')) {
        db.createObjectStore('user_profile', { keyPath: 'uid' });
      }
      if (!db.objectStoreNames.contains('game_assets')) {
        db.createObjectStore('game_assets', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings');
      }
    },
  });
};

export const requestPersistence = async (): Promise<boolean> => {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persist();
    return isPersisted;
  }
  return false;
};

// --- SETTINGS PERSISTENCE ---

export const saveLocalSetting = async (key: string, value: any) => {
    const db = await initOfflineDB();
    await db.put('settings', value, key);
};

export const getLocalSetting = async (key: string): Promise<any> => {
    const db = await initOfflineDB();
    return await db.get('settings', key);
};

// --- STATUS CHECKS ---

export const isBookDownloaded = async (id: string): Promise<boolean> => {
    const db = await initOfflineDB();
    const count = await db.count('books', id);
    return count > 0;
};

export const isExamDownloaded = async (id: string): Promise<boolean> => {
    const db = await initOfflineDB();
    const count = await db.count('exams', id);
    return count > 0;
};

// --- SEARCH INDEXING ---

export const searchOfflineBooks = async (term: string): Promise<Ebook[]> => {
    const db = await initOfflineDB();
    const all = await db.getAll('books');
    if (!term.trim()) return all;

    const lowerTerm = term.toLowerCase();
    return all.filter(book => 
        book.title.toLowerCase().includes(lowerTerm) ||
        book.topic.toLowerCase().includes(lowerTerm) ||
        book.subject.toLowerCase().includes(lowerTerm)
    );
};

export const searchOfflineExams = async (term: string): Promise<ExamQST[]> => {
    const db = await initOfflineDB();
    const all = await db.getAll('exams');
    if (!term.trim()) return all;

    const lowerTerm = term.toLowerCase();
    return all.filter(exam => 
        exam.title.toLowerCase().includes(lowerTerm) ||
        exam.topic.toLowerCase().includes(lowerTerm) ||
        exam.subject.toLowerCase().includes(lowerTerm)
    );
};

// --- USER DATA PERSISTENCE ---

export const saveLocalUserData = async (userData: UserData) => {
    try {
        const db = await initOfflineDB();
        await db.put('user_profile', userData);
        return true;
    } catch (e) {
        return false;
    }
};

export const getLocalUserData = async (uid: string): Promise<UserData | undefined> => {
    try {
        const db = await initOfflineDB();
        return await db.get('user_profile', uid);
    } catch (e) {
        return undefined;
    }
};

// --- HELPER: URL to Base64 ---
const urlToBase64 = async (url: string): Promise<string> => {
    if (!url || !url.startsWith('http')) return url;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); 
        
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.warn("[OfflineService] Failed to convert image to base64:", url);
        return url; 
    }
};

/**
 * Scans HTML content for <img> tags and converts their remote srcs to Base64.
 */
const processHtmlImages = async (html: string): Promise<string> => {
    const imgRegex = /<img[^>]+src="([^">]+)"/g;
    let match;
    let updatedHtml = html;
    const urlsToConvert = new Set<string>();

    while ((match = imgRegex.exec(html)) !== null) {
        const url = match[1];
        if (url.startsWith('http') && !url.startsWith('data:')) {
            urlsToConvert.add(url);
        }
    }

    for (const url of urlsToConvert) {
        try {
            const b64 = await urlToBase64(url);
            if (b64.startsWith('data:')) {
                updatedHtml = updatedHtml.split(url).join(b64);
            }
        } catch (e) {
            console.warn(`[Offline] Inline image processing failed for: ${url}`, e);
        }
    }

    return updatedHtml;
};

// --- BOOKS ---

export const saveOfflineBook = async (book: Ebook) => {
  try {
    const db = await initOfflineDB();
    // Deep clone to avoid mutating original object
    const offlineBook = JSON.parse(JSON.stringify(book));
    
    // 1. Convert Cover Image
    if (offlineBook.coverImageUrl && offlineBook.coverImageUrl.startsWith('http')) {
        offlineBook.coverImageUrl = await urlToBase64(offlineBook.coverImageUrl);
    }

    // 2. Scan and Convert Inline Images in Chapters
    if (offlineBook.chapters) {
        for (let i = 0; i < offlineBook.chapters.length; i++) {
            offlineBook.chapters[i].content = await processHtmlImages(offlineBook.chapters[i].content);
        }
    }

    await db.put('books', offlineBook);
    return true;
  } catch (error) {
    console.error("Failed to save book offline", error);
    return false;
  }
};

export const deleteOfflineBook = async (id: string) => {
  const db = await initOfflineDB();
  await db.delete('books', id);
};

export const saveBatchBooksToOffline = async (books: Ebook[]) => {
    for (const book of books) {
        const exists = await isBookDownloaded(book.id);
        if (exists) continue;
        await saveOfflineBook(book);
    }
};

export const getOfflineBook = async (id: string): Promise<Ebook | undefined> => {
  try {
    const db = await initOfflineDB();
    return await db.get('books', id);
  } catch (e) {
    return undefined;
  }
};

export const getAllOfflineBookIds = async (): Promise<string[]> => {
  try {
    const db = await initOfflineDB();
    return await db.getAllKeys('books') as string[];
  } catch (e) {
    return [];
  }
};

export const getAllOfflineBooks = async (): Promise<Ebook[]> => {
  try {
    const db = await initOfflineDB();
    return await db.getAll('books');
  } catch (e) {
    return [];
  }
};

// --- EXAMS ---

export const saveOfflineExam = async (exam: ExamQST) => {
    try {
        const db = await initOfflineDB();
        const offlineExam = JSON.parse(JSON.stringify(exam));
        if (offlineExam.coverImageUrl && offlineExam.coverImageUrl.startsWith('http')) {
            offlineExam.coverImageUrl = await urlToBase64(offlineExam.coverImageUrl);
        }
        // Exams usually don't have heavy HTML content in questions, but we could add processHtmlImages if needed.
        await db.put('exams', offlineExam);
        return true;
    } catch (error) {
        return false;
    }
};

export const deleteOfflineExam = async (id: string) => {
  const db = await initOfflineDB();
  await db.delete('exams', id);
};

export const saveBatchExamsToOffline = async (exams: ExamQST[]) => {
    for (const exam of exams) {
        const exists = await isExamDownloaded(exam.id);
        if (exists) continue;
        await saveOfflineExam(exam);
    }
}

export const getOfflineExam = async (id: string): Promise<ExamQST | undefined> => {
    try {
        const db = await initOfflineDB();
        return await db.get('exams', id);
    } catch (e) {
        return undefined;
    }
};

export const getAllOfflineExamIds = async (): Promise<string[]> => {
    try {
        const db = await initOfflineDB();
        return await db.getAllKeys('exams') as string[];
    } catch (e) {
        return [];
    }
};

export const getAllOfflineExams = async (): Promise<ExamQST[]> => {
  try {
    const db = await initOfflineDB();
    return await db.getAll('exams');
  } catch (e) {
    return [];
  }
};

// --- GAME ASSETS ---

export const saveGameAsset = async (id: string, url: string) => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const db = await initOfflineDB();
        await db.put('game_assets', { id, blob, mimeType: blob.type });
        return true;
    } catch (e) {
        return false;
    }
};

export const getGameAsset = async (id: string): Promise<string | null> => {
    try {
        const db = await initOfflineDB();
        const record = await db.get('game_assets', id);
        if (record) {
            return URL.createObjectURL(record.blob);
        }
        return null;
    } catch (e) {
        return null;
    }
};

export const hasGameAsset = async (id: string): Promise<boolean> => {
    try {
        const db = await initOfflineDB();
        const record = await db.getKey('game_assets', id);
        return !!record;
    } catch (e) {
        return false;
    }
}