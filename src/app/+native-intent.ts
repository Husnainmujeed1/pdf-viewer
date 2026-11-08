/**
 * Rewrites incoming Android intents into app routes:
 *  - "Open with" (ACTION_VIEW) delivers a content:// or file:// URI  -> /open?uri=...
 *  - "Share to" (ACTION_SEND) is surfaced by expo-sharing as <scheme>://expo-sharing -> /open?share=1
 * Must never throw.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    if (!path) return '/';
    if (/^(content|file):\/\//i.test(path)) {
      return `/open?uri=${encodeURIComponent(path)}`;
    }
    const url = new URL(path, 'pdfreader://app');
    if (url.hostname === 'expo-sharing') {
      return '/open?share=1';
    }
    return path;
  } catch {
    return '/';
  }
}
