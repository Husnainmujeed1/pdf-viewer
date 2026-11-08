import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui';
import { useColors } from '@/context/SettingsContext';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'Summary',
    body: 'PDF Reader works entirely on your device. We do not collect, store, sell or share any personal information, and the app has no accounts, ads, analytics or tracking.',
  },
  {
    title: 'Your documents',
    body: 'When you open a PDF, the app keeps a private copy inside its own storage so you can reopen it later. These copies never leave your device unless you choose to share or print them. Removing a document from the library or uninstalling the app deletes these copies. Original files are never modified.',
  },
  {
    title: 'Permissions',
    body: 'The app does not request access to your photos, media, contacts, camera, microphone or location. Files are opened only through the Android system file picker or when you choose “Open with” / “Share” from another app.',
  },
  {
    title: 'Passwords',
    body: 'Passwords for protected PDFs are used only to open the document and are never saved.',
  },
  {
    title: 'Children',
    body: 'The app does not knowingly collect any information from anyone, including children under 13.',
  },
  {
    title: 'Changes',
    body: 'If this policy changes, the updated version will be published in the app and on its store listing.',
  },
  {
    title: 'Contact',
    body: 'Questions about this policy can be sent to the developer email address shown on the Google Play store listing.',
  },
];

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  return (
    <View style={[styles.flex, { backgroundColor: c.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <IconButton name="arrow-back" label="Back" onPress={() => router.back()} />
        <Text style={[styles.headerTitle, { color: c.text }]}>Privacy policy</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}>
        {SECTIONS.map((s) => (
          <View key={s.title} style={{ marginBottom: 20 }}>
            <Text style={[styles.h, { color: c.text }]}>{s.title}</Text>
            <Text style={[styles.p, { color: c.textMuted }]}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700', marginLeft: 4 },
  h: { fontSize: 16.5, fontWeight: '700', marginBottom: 6 },
  p: { fontSize: 15, lineHeight: 22 },
});
