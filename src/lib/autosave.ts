import Dexie, { type Table } from 'dexie';
import type { ActivityEntry, Deal, RentRollRow } from '../types';

interface AutosaveRecord {
  id: string;
  deals: Deal[];
  rentRoll: RentRollRow[];
  activities: ActivityEntry[];
  filename: string;
  savedAt: string;
}

class AutosaveDB extends Dexie {
  snapshots!: Table<AutosaveRecord, string>;

  constructor() {
    super('LeasingTrackerAutosave');
    this.version(3).stores({
      snapshots: 'id, savedAt',
    });
  }
}

const db = new AutosaveDB();
const SNAPSHOT_ID = 'current';

export async function saveSnapshot(
  deals: Deal[],
  rentRoll: RentRollRow[],
  activities: ActivityEntry[],
  filename: string
): Promise<void> {
  await db.snapshots.put({
    id: SNAPSHOT_ID,
    deals,
    rentRoll,
    activities,
    filename,
    savedAt: new Date().toISOString(),
  });
}

export async function loadSnapshot(): Promise<{
  deals: Deal[];
  rentRoll: RentRollRow[];
  activities: ActivityEntry[];
  filename: string;
  savedAt: string;
} | null> {
  const snapshot = await db.snapshots.get(SNAPSHOT_ID);
  if (!snapshot) return null;
  return {
    deals: snapshot.deals ?? [],
    rentRoll: snapshot.rentRoll ?? [],
    activities: snapshot.activities ?? [],
    filename: snapshot.filename,
    savedAt: snapshot.savedAt,
  };
}

export async function clearSnapshot(): Promise<void> {
  await db.snapshots.delete(SNAPSHOT_ID);
}
