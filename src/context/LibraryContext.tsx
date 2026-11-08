import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { cleanName, fileExists, importToLibrary, safeDelete, sourceSize, wipeLibrary } from '@/lib/files';
import { KEYS, loadJSON, saveJSON } from '@/lib/storage';
import { PdfDoc } from '@/lib/types';

type ImportSource = { uri: string; name?: string | null; size?: number | null };

type Ctx = {
  ready: boolean;
  docs: PdfDoc[];
  getDoc: (id: string) => PdfDoc | undefined;
  importFiles: (sources: ImportSource[]) => Promise<{ docs: PdfDoc[]; failed: number }>;
  updateDoc: (id: string, patch: Partial<PdfDoc>) => void;
  toggleFavorite: (id: string) => void;
  toggleBookmark: (id: string, page: number) => boolean;
  renameDoc: (id: string, name: string) => void;
  removeDoc: (id: string) => void;
  clearAll: () => void;
};

const LibraryContext = createContext<Ctx | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [docs, setDocs] = useState<PdfDoc[]>([]);
  const docsRef = useRef<PdfDoc[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadJSON<PdfDoc[]>(KEYS.library, []).then((saved) => {
      // Drop entries whose underlying file disappeared (e.g. app data partially cleared).
      const valid = Array.isArray(saved) ? saved.filter((d) => d && d.id && fileExists(d.uri)) : [];
      docsRef.current = valid;
      setDocs(valid);
      setReady(true);
    });
  }, []);

  /** Single write path: updates state + ref and schedules a debounced persist. */
  const commit = useCallback((updater: (prev: PdfDoc[]) => PdfDoc[]) => {
    const next = updater(docsRef.current);
    docsRef.current = next;
    setDocs(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveJSON(KEYS.library, docsRef.current), 300);
  }, []);

  useEffect(
    () => () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveJSON(KEYS.library, docsRef.current);
      }
    },
    [],
  );

  const getDoc = useCallback((id: string) => docsRef.current.find((d) => d.id === id), []);

  const importFiles = useCallback(
    async (sources: ImportSource[]) => {
      const result: PdfDoc[] = [];
      let failed = 0;
      for (const src of sources) {
        try {
          // Reuse an existing entry when the same file (name + size) was imported before.
          const size = src.size ?? sourceSize(src.uri);
          const lowerName = src.name ? cleanName(src.name).toLowerCase() : undefined;
          const existing =
            size && lowerName
              ? docsRef.current.find((d) => d.size === size && d.name.toLowerCase() === lowerName)
              : undefined;
          if (existing) {
            result.push(existing);
            continue;
          }
          const file = await importToLibrary(src.uri, src.name);
          const doc: PdfDoc = {
            ...file,
            addedAt: Date.now(),
            openedAt: null,
            page: 1,
            pages: 0,
            favorite: false,
            bookmarks: [],
          };
          commit((prev) => [doc, ...prev]);
          result.push(doc);
        } catch (e) {
          console.warn('[library] import failed', e);
          failed++;
        }
      }
      return { docs: result, failed };
    },
    [commit],
  );

  const updateDoc = useCallback(
    (id: string, patch: Partial<PdfDoc>) => commit((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d))),
    [commit],
  );

  const toggleFavorite = useCallback(
    (id: string) => commit((prev) => prev.map((d) => (d.id === id ? { ...d, favorite: !d.favorite } : d))),
    [commit],
  );

  const toggleBookmark = useCallback(
    (id: string, page: number) => {
      const doc = docsRef.current.find((d) => d.id === id);
      if (!doc) return false;
      const has = doc.bookmarks.includes(page);
      const bookmarks = has ? doc.bookmarks.filter((p) => p !== page) : [...doc.bookmarks, page].sort((a, b) => a - b);
      commit((prev) => prev.map((d) => (d.id === id ? { ...d, bookmarks } : d)));
      return !has;
    },
    [commit],
  );

  const renameDoc = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim().replace(/[\\/<>:"|?*]/g, '');
      if (!trimmed) return;
      const finalName = /\.pdf$/i.test(trimmed) ? trimmed : `${trimmed}.pdf`;
      commit((prev) => prev.map((d) => (d.id === id ? { ...d, name: finalName } : d)));
    },
    [commit],
  );

  const removeDoc = useCallback(
    (id: string) => {
      const doc = docsRef.current.find((d) => d.id === id);
      if (doc) safeDelete(doc.uri);
      commit((prev) => prev.filter((d) => d.id !== id));
    },
    [commit],
  );

  const clearAll = useCallback(() => {
    wipeLibrary();
    commit(() => []);
  }, [commit]);

  const value = useMemo(
    () => ({ ready, docs, getDoc, importFiles, updateDoc, toggleFavorite, toggleBookmark, renameDoc, removeDoc, clearAll }),
    [ready, docs, getDoc, importFiles, updateDoc, toggleFavorite, toggleBookmark, renameDoc, removeDoc, clearAll],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used inside LibraryProvider');
  return ctx;
}

export function useDoc(id: string | undefined) {
  const { docs } = useLibrary();
  return useMemo(() => docs.find((d) => d.id === id), [docs, id]);
}
