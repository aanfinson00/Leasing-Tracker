import { db, type FileHandleRecord } from './autosave';

const HANDLE_ID = 'current';

// File System Access API permission descriptor type isn't in lib.dom yet
// in all setups — keep the surface small and typed locally.
type PermissionState = 'granted' | 'denied' | 'prompt';
interface HandleWithPerms extends FileSystemFileHandle {
  queryPermission?: (descriptor: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>;
  requestPermission?: (descriptor: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>;
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window;
}

export async function saveHandle(
  handle: FileSystemFileHandle,
  lastSeenModified: number
): Promise<void> {
  await db.fileHandles.put({
    id: HANDLE_ID,
    handle,
    name: handle.name,
    lastSeenModified,
    savedAt: new Date().toISOString(),
  });
}

export async function loadHandle(): Promise<FileHandleRecord | null> {
  const rec = await db.fileHandles.get(HANDLE_ID);
  return rec ?? null;
}

export async function clearHandle(): Promise<void> {
  await db.fileHandles.delete(HANDLE_ID);
}

export async function updateLastSeenModified(lastSeenModified: number): Promise<void> {
  const rec = await db.fileHandles.get(HANDLE_ID);
  if (!rec) return;
  await db.fileHandles.put({ ...rec, lastSeenModified, savedAt: new Date().toISOString() });
}

export async function queryHandlePermission(
  handle: FileSystemFileHandle
): Promise<PermissionState> {
  const h = handle as HandleWithPerms;
  if (!h.queryPermission) return 'prompt';
  return h.queryPermission({ mode: 'readwrite' });
}

export async function requestHandlePermission(
  handle: FileSystemFileHandle
): Promise<PermissionState> {
  const h = handle as HandleWithPerms;
  if (!h.requestPermission) return 'denied';
  return h.requestPermission({ mode: 'readwrite' });
}

// Pick a new file via the OS picker. MUST be invoked from a user gesture.
export async function pickFile(): Promise<FileSystemFileHandle | null> {
  if (!isFileSystemAccessSupported()) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  try {
    const [handle] = await w.showOpenFilePicker({
      types: [
        {
          description: 'Excel Workbook',
          accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
          },
        },
      ],
      multiple: false,
      excludeAcceptAllOption: false,
    });
    return handle as FileSystemFileHandle;
  } catch (err) {
    // AbortError when the user cancels — not an error worth surfacing
    if ((err as DOMException)?.name === 'AbortError') return null;
    throw err;
  }
}

export async function readFromHandle(handle: FileSystemFileHandle): Promise<File> {
  return handle.getFile();
}

export async function writeToHandle(
  handle: FileSystemFileHandle,
  blob: Blob
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const writable = await (handle as any).createWritable();
  try {
    await writable.write(blob);
  } finally {
    await writable.close();
  }
}
