import { useRef, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/context/SettingsContext';

/** Lightweight page scrubber built on the responder system (no extra native deps). */
export function PageSlider({
  page,
  pages,
  onSeek,
}: {
  page: number;
  pages: number;
  onSeek: (page: number) => void;
}) {
  const c = useColors();
  const width = useRef(0);
  const [dragPage, setDragPage] = useState<number | null>(null);

  const shown = dragPage ?? page;
  const ratio = pages > 1 ? (shown - 1) / (pages - 1) : 0;

  const pageAt = (e: GestureResponderEvent) => {
    if (width.current <= 0 || pages <= 1) return 1;
    const x = Math.max(0, Math.min(width.current, e.nativeEvent.locationX));
    return Math.round((x / width.current) * (pages - 1)) + 1;
  };

  const onLayout = (e: LayoutChangeEvent) => {
    width.current = e.nativeEvent.layout.width;
  };

  return (
    <View style={styles.wrap}>
      {dragPage !== null ? (
        <View style={[styles.bubble, { backgroundColor: c.text, left: `${ratio * 100}%` }]} pointerEvents="none">
          <Text style={[styles.bubbleText, { color: c.bg }]}>{dragPage}</Text>
        </View>
      ) : null}
      <View
        style={styles.hit}
        onLayout={onLayout}
        onStartShouldSetResponder={() => pages > 1}
        onMoveShouldSetResponder={() => pages > 1}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => setDragPage(pageAt(e))}
        onResponderMove={(e) => setDragPage(pageAt(e))}
        onResponderRelease={(e) => {
          const p = pageAt(e);
          setDragPage(null);
          if (p !== page) onSeek(p);
        }}
        onResponderTerminate={() => setDragPage(null)}
        accessibilityRole="adjustable"
        accessibilityLabel="Page"
        accessibilityValue={{ min: 1, max: Math.max(1, pages), now: shown }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'increment' && page < pages) onSeek(page + 1);
          if (e.nativeEvent.actionName === 'decrement' && page > 1) onSeek(page - 1);
        }}
      >
        <View pointerEvents="none" style={[styles.track, { backgroundColor: c.border }]}>
          <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: c.primary }]} />
        </View>
        <View
          pointerEvents="none"
          style={[
            styles.thumb,
            { left: `${ratio * 100}%`, backgroundColor: c.primary, transform: [{ scale: dragPage !== null ? 1.25 : 1 }] },
          ]}
        />
      </View>
    </View>
  );
}

const THUMB = 18;

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', marginHorizontal: THUMB / 2 },
  hit: { height: 40, justifyContent: 'center' },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%' },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    marginLeft: -THUMB / 2,
    top: (40 - THUMB) / 2,
  },
  bubble: {
    position: 'absolute',
    bottom: 38,
    minWidth: 44,
    marginLeft: -22,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleText: { fontSize: 14, fontWeight: '700' },
});
