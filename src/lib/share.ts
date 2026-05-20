import type { Deal, RentRollRow } from '../types';

export interface SharedPayload {
  v: 1;
  filename: string;
  deals: Deal[];
  rentRoll: RentRollRow[];
  sharedAt: string;
}

const toBase64Url = (bytes: Uint8Array): string => {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (s: string): Uint8Array => {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const raw = atob(s);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
};

const compress = async (text: string): Promise<Uint8Array> => {
  const cs = new CompressionStream('gzip');
  const blob = new Blob([new TextEncoder().encode(text)]);
  const stream = blob.stream().pipeThrough(cs);
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
};

const decompress = async (bytes: Uint8Array): Promise<string> => {
  const ds = new DecompressionStream('gzip');
  // Copy into a fresh ArrayBuffer-backed view to satisfy strict BlobPart typing
  const fresh = new Uint8Array(bytes);
  const blob = new Blob([fresh as unknown as BlobPart]);
  const stream = blob.stream().pipeThrough(ds);
  const buf = await new Response(stream).arrayBuffer();
  return new TextDecoder().decode(buf);
};

export async function encodeShare(
  deals: Deal[],
  rentRoll: RentRollRow[],
  filename: string
): Promise<string> {
  const payload: SharedPayload = {
    v: 1,
    filename,
    deals,
    rentRoll,
    sharedAt: new Date().toISOString(),
  };
  const json = JSON.stringify(payload);
  const compressed = await compress(json);
  return toBase64Url(compressed);
}

export async function decodeShare(encoded: string): Promise<SharedPayload | null> {
  try {
    const bytes = fromBase64Url(encoded);
    const json = await decompress(bytes);
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === 'object' && parsed.v === 1) {
      return parsed as SharedPayload;
    }
    return null;
  } catch (err) {
    console.error('Failed to decode share link:', err);
    return null;
  }
}

export function readShareFromUrl(): string | null {
  const hash = window.location.hash;
  if (!hash.startsWith('#data=')) return null;
  return hash.slice('#data='.length);
}

export function clearShareFromUrl(): void {
  history.replaceState(null, '', window.location.pathname + window.location.search);
}
