import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, useColorScheme } from 'react-native';

import { DEFAULT_SETTINGS, Settings } from '@/lib/types';
import { KEYS, loadJSON, saveJSON } from '@/lib/storage';
import { dark, light, Palette } from '@/theme/colors';

type Ctx = {
  ready: boolean;
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  colors: Palette;
};

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const scheme = useColorScheme();

  useEffect(() => {
    loadJSON<Partial<Settings>>(KEYS.settings, {}).then((saved) => {
      setSettings({ ...DEFAULT_SETTINGS, ...saved });
      setReady(true);
    });
  }, []);

  // Keep native UI (dialogs, pickers, system bars) in sync with the chosen theme.
  useEffect(() => {
    if (!ready) return;
    Appearance.setColorScheme(settings.theme === 'system' ? 'unspecified' : settings.theme);
  }, [ready, settings.theme]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveJSON(KEYS.settings, next);
      return next;
    });
  }, []);

  const isDark = settings.theme === 'system' ? scheme === 'dark' : settings.theme === 'dark';
  const colors = isDark ? dark : light;

  const value = useMemo(() => ({ ready, settings, update, colors }), [ready, settings, update, colors]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}

export function useColors() {
  return useSettings().colors;
}
