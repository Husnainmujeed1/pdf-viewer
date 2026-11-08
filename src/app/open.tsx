import { router, useLocalSearchParams } from 'expo-router';
import { useIncomingShare } from 'expo-sharing';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { useLibrary } from '@/context/LibraryContext';
import { useColors } from '@/context/SettingsContext';
import { toast } from '@/components/ui';

type Source = { uri: string; name?: string | null; size?: number | null };

/** Handles files arriving from other apps ("Open with" and "Share"). */
export default function OpenScreen() {
  const { uri, share } = useLocalSearchParams<{ uri?: string; share?: string }>();
  const c = useColors();
  const { importFiles } = useLibrary();
  const incoming = useIncomingShare();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;

    let sources: Source[] | null = null;
    if (uri) {
      sources = [{ uri }];
    } else if (share) {
      if (incoming.isResolving) return;
      sources = incoming.resolvedSharedPayloads
        .filter((p) => !!p.contentUri)
        .filter(
          (p) =>
            p.contentMimeType === 'application/pdf' ||
            p.mimeType === 'application/pdf' ||
            /\.pdf$/i.test(p.originalName ?? ''),
        )
        .map((p) => ({ uri: p.contentUri as string, name: p.originalName, size: p.contentSize }));
    } else {
      router.replace('/');
      return;
    }

    handled.current = true;

    (async () => {
      if (!sources || sources.length === 0) {
        Alert.alert('Nothing to open', 'No PDF file was received.');
        router.replace('/');
        return;
      }
      const { docs, failed } = await importFiles(sources);
      if (share) incoming.clearSharedPayloads();

      if (docs.length === 1) {
        router.replace({ pathname: '/viewer/[id]', params: { id: docs[0].id } });
      } else {
        router.replace('/');
        if (docs.length > 1) toast(`${docs.length} PDFs added to your library`);
      }
      if (failed > 0) {
        Alert.alert(
          'Could not open file',
          failed === 1 ? 'The file could not be read. It may be damaged or not a PDF.' : `${failed} files could not be read.`,
        );
      }
    })();
  }, [uri, share, incoming, importFiles]);

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <ActivityIndicator size="large" color={c.primary} />
      <Text style={[styles.text, { color: c.textMuted }]}>Opening document…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  text: { fontSize: 15 },
});
