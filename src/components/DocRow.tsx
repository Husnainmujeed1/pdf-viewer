import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/context/SettingsContext';
import { baseName, formatBytes, formatRelative } from '@/lib/format';
import { PdfDoc } from '@/lib/types';
import { IconButton, ProgressBar } from './ui';

type Props = {
  doc: PdfDoc;
  onOpen: (doc: PdfDoc) => void;
  onMore: (doc: PdfDoc) => void;
  onToggleFavorite: (doc: PdfDoc) => void;
};

function DocRowBase({ doc, onOpen, onMore, onToggleFavorite }: Props) {
  const c = useColors();
  const progress = doc.pages > 0 ? doc.page / doc.pages : 0;
  const meta = [formatBytes(doc.size), doc.pages ? `${doc.pages} pages` : null, formatRelative(doc.openedAt)]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <Pressable
      onPress={() => onOpen(doc)}
      onLongPress={() => onMore(doc)}
      android_ripple={{ color: c.border }}
      accessibilityRole="button"
      accessibilityLabel={`Open ${doc.name}`}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: c.surface, borderColor: c.border },
        pressed && Platform.OS !== 'android' && { opacity: 0.7 },
      ]}
    >
      <View style={[styles.thumb, { backgroundColor: c.primarySoft }]}>
        <Ionicons name={doc.locked ? 'lock-closed' : 'document-text'} size={22} color={c.primary} />
        <Text style={[styles.thumbLabel, { color: c.primary }]}>PDF</Text>
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
          {baseName(doc.name)}
        </Text>
        <Text style={[styles.meta, { color: c.textMuted }]} numberOfLines={1}>
          {meta}
        </Text>
        {doc.pages > 0 && doc.openedAt ? (
          <View style={styles.progressRow}>
            <ProgressBar value={progress} style={{ flex: 1 }} />
            <Text style={[styles.progressText, { color: c.textFaint }]}>{Math.round(progress * 100)}%</Text>
          </View>
        ) : null}
      </View>
      <IconButton
        name={doc.favorite ? 'star' : 'star-outline'}
        color={doc.favorite ? c.star : c.textFaint}
        label={doc.favorite ? 'Remove from favorites' : 'Add to favorites'}
        onPress={() => onToggleFavorite(doc)}
        size={20}
      />
      <IconButton name="ellipsis-vertical" color={c.textMuted} label="More options" onPress={() => onMore(doc)} size={20} />
    </Pressable>
  );
}

export const DocRow = memo(DocRowBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 2,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  thumb: { width: 46, height: 56, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  thumbLabel: { fontSize: 9, fontWeight: '800', marginTop: 2, letterSpacing: 0.5 },
  body: { flex: 1, marginLeft: 12, marginRight: 2 },
  title: { fontSize: 15.5, fontWeight: '600' },
  meta: { fontSize: 12.5, marginTop: 3 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  progressText: { fontSize: 11, minWidth: 30, textAlign: 'right' },
});
