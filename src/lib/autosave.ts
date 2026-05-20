import Dexie, { type Table } from 'dexie';
import type { Deal, RentRollRow } from '../types';

interface AutosaveRecord {
  id: string;
  deals: Deal[];
  rentRoll: RentRollRow[];
  filename: string;
  savedAt: string;
}

class AutosaveDB extends Dexie {
  snapshots!: Table<AutosaveRecord, string>;

  constructor() {
    super('LeasingTrackerAutosave');
    this.version(2).stores({
      snapshots: 'id, savedAt',
    });
  }
}

const db = new AutosaveDB();
const SNAPSHOT_ID = 'current';

export async function saveSnapshot(deals: Deal[], rentRoll: RentRollRow[], filename: string): Promise<void> {
  await db.snapshots.put({
    id: SNAPSHOT_ID,
    deals,
    rentRoll,
    filename,
    savedAt: new Date().toISOString(),
  });
}

export async function loadSnapshot(): Promise<{
  deals: Deal[];
  rentRoll: RentRollRow[];
  filename: string;
  savedAt: string;
} | null> {
  const snapshot = await db.snapshots.get(SNAPSHOT_ID);
  if (!snapshot) return null;
  return {
    deals: snapshot.deals ?? [],
    rentRoll: snapshot.rentRoll ?? [],
    filename: snapshot.filename,
    savedAt: snapshot.savedAt,
  };
}

export async function clearSnapshot(): Promise<void> {
  await db.snapshots.delete(SNAPSHOT_ID);
}
