export type PdfDoc = {
  id: string;
  /** Display name, always ends with .pdf */
  name: string;
  /** file:// URI of the app-owned copy */
  uri: string;
  size: number;
  addedAt: number;
  openedAt: number | null;
  /** Last read page (1-based) */
  page: number;
  /** Total pages, 0 until the document has been opened once */
  pages: number;
  favorite: boolean;
  /** Bookmarked page numbers (1-based), sorted ascending */
  bookmarks: number[];
  /** Whether the PDF needed a password last time it was opened */
  locked?: boolean;
};

export type ThemePref = 'system' | 'light' | 'dark';

export type ReadingFilter = 'none' | 'night' | 'sepia';

export type SortKey = 'recent' | 'name' | 'size' | 'added';

export type Settings = {
  theme: ThemePref;
  horizontal: boolean;
  paging: boolean;
  keepAwake: boolean;
  filter: ReadingFilter;
  sort: SortKey;
};

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  horizontal: false,
  paging: false,
  keepAwake: true,
  filter: 'none',
  sort: 'recent',
};
