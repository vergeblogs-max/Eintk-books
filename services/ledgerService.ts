
import { openDB, DBSchema } from 'idb';

interface LedgerDB extends DBSchema {
  transactions: {
    key: string;
    value: {
      id: string;
      timestamp: number;
      type: 'spark' | 'energy';
      amount: number;
      description: string;
    };
    indexes: { 'by-timestamp': number };
  };
}

const DB_NAME = 'eintk-ledger';

export const initLedgerDB = async () => {
  return openDB<LedgerDB>(DB_NAME, 1, {
    upgrade(db) {
      const store = db.createObjectStore('transactions', { keyPath: 'id' });
      store.createIndex('by-timestamp', 'timestamp');
    },
  });
};

export const recordTransaction = async (tx: { type: 'spark' | 'energy', amount: number, description: string }) => {
  const db = await initLedgerDB();
  await db.add('transactions', {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    ...tx
  });
};

export const getTransactionHistory = async () => {
  const db = await initLedgerDB();
  return await db.getAllFromIndex('transactions', 'by-timestamp');
};
