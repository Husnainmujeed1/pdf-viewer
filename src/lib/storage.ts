import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
  library: 'pdfreader.library.v1',
  settings: 'pdfreader.settings.v1',
} as const;

export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn(`[storage] failed to read ${key}`, e);
    return fallback;
  }
}

export async function saveJSON(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`[storage] failed to write ${key}`, e);
  }
}
