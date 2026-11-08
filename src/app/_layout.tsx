import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LibraryProvider, useLibrary } from '@/context/LibraryContext';
import { SettingsProvider, useSettings } from '@/context/SettingsContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Deep links / "Open with" land on /open; keep the library underneath so Back works.
export const unstable_settings = {
  anchor: 'index',
};

function AppStack() {
  const { colors, ready: settingsReady } = useSettings();
  const { ready: libraryReady } = useLibrary();
  const ready = settingsReady && libraryReady;

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
  }, [colors.bg]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style={colors.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="viewer/[id]" options={{ contentStyle: { backgroundColor: colors.viewerBg } }} />
        <Stack.Screen name="settings" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="open" options={{ animation: 'fade' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <LibraryProvider>
          <AppStack />
        </LibraryProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
