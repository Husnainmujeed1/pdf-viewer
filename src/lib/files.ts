import { Directory, File, Paths } from 'expo-file-system';

const LIBRARY_DIR = new Directory(Paths.document, 'library');
const SHARE_DIR = new Directory(Paths.cache, 'share');

export class NotAPdfError extends Error {
  constructor() {
    super('This file is not a valid PDF document.');
    this.name = 'NotAPdfError';
  }
}

function ensureDir(dir: Directory) {
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
}

export function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Produces a safe, human readable display name that ends with `.pdf`. */
export function cleanName(raw?: string | null): string {
  let name = (raw ?? '').trim();
  try {
    name = decodeURIComponent(name);
  } catch {
    // keep raw value
  }
  // Strip any directory parts and provider prefixes such as "primary:Download/x.pdf"
  name = name.split(/[\\/]/).pop() ?? '';
  name = name.replace(/^[a-z]+:/i, '');
  name = name.replace(/[<>:"|?*\u0000-\u001F]/g, '').trim();
  if (!name || !/\.pdf$/i.test(name)) {
    // Content providers often give opaque ids (e.g. "document:1234"); avoid showing them.
    if (!name || /^\d+$/.test(name) || !/[a-z]/i.test(name)) {
      const d = new Date();
      name = `Document ${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate(),
      ).padStart(2, '0')}`;
    }
    name = `${name.replace(/\.pdf$/i, '')}.pdf`;
  }
  return name.length > 120 ? `${name.slice(0, 116)}.pdf` : name;
}

async function isPdf(file: File): Promise<boolean> {
  const handle = file.open();
  try {
    // The PDF header may be preceded by a few junk bytes, so scan the first KB.
    const bytes = await handle.readBytes(1024);
    const head = String.fromCharCode(...bytes);
    return head.includes('%PDF-');
  } finally {
    handle.close();
  }
}

export type ImportedFile = { id: string; name: string; uri: string; size: number };

/**
 * Copies a PDF (file:// or content:// URI) into the app's private library folder so it
 * stays readable after the source app revokes its temporary permission.
 */
export async function importToLibrary(sourceUri: string, displayName?: string | null): Promise<ImportedFile> {
  ensureDir(LIBRARY_DIR);
  const id = makeId();
  const dest = new File(LIBRARY_DIR, `${id}.pdf`);
  const src = new File(sourceUri);
  await src.copy(dest);

  try {
    if (!(await isPdf(dest))) {
      safeDelete(dest.uri);
      throw new NotAPdfError();
    }
  } catch (e) {
    if (e instanceof NotAPdfError) throw e;
    // Could not read the header; let the viewer decide.
  }

  return {
    id,
    name: cleanName(displayName ?? src.name),
    uri: dest.uri,
    size: dest.size,
  };
}

/** Best effort size lookup for a source URI before importing (used for duplicate detection). */
export function sourceSize(uri: string): number | null {
  try {
    const size = new File(uri).size;
    return size > 0 ? size : null;
  } catch {
    return null;
  }
}

export function fileExists(uri: string): boolean {
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

export function safeDelete(uri: string) {
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch (e) {
    console.warn('[files] delete failed', e);
  }
}

/** Copies a library file to cache under its display name so share targets see a real file name. */
export async function prepareForShare(uri: string, name: string): Promise<string> {
  ensureDir(SHARE_DIR);
  const out = new File(SHARE_DIR, cleanName(name));
  if (out.exists) out.delete();
  await new File(uri).copy(out);
  return out.uri;
}

export function clearShareCache() {
  try {
    if (SHARE_DIR.exists) SHARE_DIR.delete();
  } catch {
    // ignore
  }
}

export function libraryBytes(): number {
  try {
    if (!LIBRARY_DIR.exists) return 0;
    return LIBRARY_DIR.size ?? 0;
  } catch {
    return 0;
  }
}

export function wipeLibrary() {
  try {
    if (LIBRARY_DIR.exists) LIBRARY_DIR.delete();
  } catch (e) {
    console.warn('[files] wipe failed', e);
  }
  clearShareCache();
}
