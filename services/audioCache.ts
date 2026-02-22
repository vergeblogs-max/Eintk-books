
import { openDB, DBSchema } from 'idb';

interface AudioDB extends DBSchema {
  audio_chunks: {
    key: string;
    value: {
      id: string; // composite key: bookId_voice_chunkIndex
      blob: Blob;
      timestamp: number;
      duration: number;
    };
  };
}

const DB_NAME = 'eintk-audio-cache';
const STORE_NAME = 'audio_chunks';

export const initAudioDB = async () => {
  return openDB<AudioDB>(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
};

export const saveAudioChunk = async (bookId: string, voice: string, chunkIndex: number, blob: Blob, duration: number = 0) => {
  const db = await initAudioDB();
  const id = `${bookId}_${voice}_${chunkIndex}`;
  await db.put(STORE_NAME, {
    id,
    blob,
    timestamp: Date.now(),
    duration
  });
};

export const getAudioChunk = async (bookId: string, voice: string, chunkIndex: number) => {
  const db = await initAudioDB();
  const id = `${bookId}_${voice}_${chunkIndex}`;
  return await db.get(STORE_NAME, id);
};

export const clearAudioCache = async () => {
    const db = await initAudioDB();
    await db.clear(STORE_NAME);
};
