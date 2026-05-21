import Dexie, { type Table } from 'dexie';
import type { ActivityEntry, Deal, OnboardingChecklist, RentRollRow } from '../types';

interface AutosaveRecord {
  id: string;
  deals: Deal[];
  rentRoll: RentRollRow[];
  activities: ActivityEntry[];
  onboardings?: OnboardingChecklist[];
  filename: string;
  savedAt: string;
}

export interface FileHandleRecord {
  id: 'current';
  handle: FileSystemFileHandle;
  name: string;
  lastSeenModified: number;
  savedAt: string;
}

class AutosaveDB extends Dexie {
  snapshots!: Table<AutosaveRecord, string>;
  fileHandles!: Table<FileHandleRecord, string>;

  constructor() {
    super('LeasingTrackerAutosave');
    this.version(3).stores({
      snapshots: 'id, savedAt',
    });
    this.version(4).stores({
      snapshots: 'id, savedAt',
      fileHandles: 'id',
    });
    // Phase 10 added `onboardings` to the snapshot payload. No index
    // changes — the field rides along in the existing JSON blob — but
    // the version bump signals the shape to Dexie consumers.
    this.version(5).stores({
      snapshots: 'id, savedAt',
      fileHandles: 'id',
    });
  }
}

export const db = new AutosaveDB();
const SNAPSHOT_ID = 'current';

export async function saveSnapshot(
  deals: Deal[],
  rentRoll: RentRollRow[],
  activities: ActivityEntry[],
  onboardings: OnboardingChecklist[],
  filename: string
): Promise<void> {
  await db.snapshots.put({
    id: SNAPSHOT_ID,
    deals,
    rentRoll,
    activities,
    onboardings,
    filename,
    savedAt: new Date().toISOString(),
  });
}

export async function loadSnapshot(): Promise<{
  deals: Deal[];
  rentRoll: RentRollRow[];
  activities: ActivityEntry[];
  onboardings: OnboardingChecklist[];
  filename: string;
  savedAt: string;
} | null> {
  const snapshot = await db.snapshots.get(SNAPSHOT_ID);
  if (!snapshot) return null;
  return {
    deals: snapshot.deals ?? [],
    rentRoll: snapshot.rentRoll ?? [],
    activities: snapshot.activities ?? [],
    onboardings: snapshot.onboardings ?? [],
    filename: snapshot.filename,
    savedAt: snapshot.savedAt,
  };
}

export async function clearSnapshot(): Promise<void> {
  await db.snapshots.delete(SNAPSHOT_ID);
}
