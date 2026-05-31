import type { ActivityEntry, ActivityParentType } from '../types';

export type MailProvider = 'gmail' | 'outlook' | 'apple' | 'other' | null;

export function detectMailProvider(url: string | null | undefined): MailProvider {
  if (!url) return null;
  if (/mail\.google\.com/.test(url)) return 'gmail';
  if (/outlook\.(live|office|office365)\.com/.test(url)) return 'outlook';
  if (/icloud\.com\/mail/.test(url)) return 'apple';
  try {
    new URL(url);
    return 'other';
  } catch {
    return null;
  }
}

export function shortDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function getActivitiesFor(
  all: ActivityEntry[],
  parentType: ActivityParentType,
  parentId: string
): ActivityEntry[] {
  return all
    .filter((a) => a.parentType === parentType && a.parentId === parentId)
    .sort((a, b) => {
      // Newest first by date, then createdAt for stability
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return b.createdAt.localeCompare(a.createdAt);
    });
}

const isoDate = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

export function makeStatusChangeEntry(
  parentType: ActivityParentType,
  parentId: string,
  from: string,
  to: string
): ActivityEntry {
  return {
    id: crypto.randomUUID(),
    parentType,
    parentId,
    date: isoDate(),
    type: 'status-change',
    summary: `${from} → ${to}`,
    link: null,
    author: null,
    metadata: {},
    createdAt: new Date().toISOString(),
  };
}
