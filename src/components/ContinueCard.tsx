import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/context/SettingsContext';
import { baseName } from '@/lib/format';
import { PdfDoc } from '@/lib/types';
import { ProgressBar } from './ui';

export function ContinueCard({ doc, onPress }: { doc: PdfDoc; onPress: () => void }) {
  const c = useColors();
  const progress = doc.pages ? doc.page / doc.pages : 0;
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
      accessibilityRole="button"
      accessibilityLabel={`Continue reading ${doc.name}`}
      style={[styles.card, { backgroundColor: c.primary }]}
    >
      <View style={styles.top}>
        <Text style={styles.kicker}>CONTINUE READING</Text>
        <Ionicons name="arrow-forward-circle" size={26} color="#fff" />
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {baseName(doc.name)}
      </Text>
      <Text style={styles.sub}>
        {doc.pages ? `Page ${doc.page} of ${doc.pages}` : 'Tap to open'}
      </Text>
      {doc.pages ? (
        <ProgressBar value={progress} color="#fff" style={[styles.bar, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 18, overflow: 'hidden' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { color: 'rgba(255,255,255,0.85)', fontSize: 11.5, fontWeight: '800', letterSpacing: 1 },
  title: { color: '#fff', fontSize: 19, fontWeight: '700', marginTop: 8 },
  sub: { color: 'rgba(255,255,255,0.9)', fontSize: 13.5, marginTop: 4 },
  bar: { marginTop: 14 },
});
