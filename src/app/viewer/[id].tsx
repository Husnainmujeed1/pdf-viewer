import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as NavigationBar from 'expo-navigation-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Pdf, { PdfRef, TableContent } from 'react-native-pdf';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PageSlider } from '@/components/PageSlider';
import { Button, IconButton, PromptDialog, Sheet, SheetAction, toast } from '@/components/ui';
import { useDoc, useLibrary } from '@/context/LibraryContext';
import { useSettings } from '@/context/SettingsContext';
import { printDoc, shareDoc } from '@/lib/actions';
import { fileExists } from '@/lib/files';
import { baseName, formatBytes, formatDate } from '@/lib/format';
import { ReadingFilter } from '@/lib/types';

const KEEP_AWAKE_TAG = 'pdf-viewer';

type TocItem = { key: string; title: string; page: number; depth: number };
type Panel = 'menu' | 'bookmarks' | 'toc' | 'filter' | null;

function flattenToc(items: TableContent[] | undefined, depth = 0, out: TocItem[] = []): TocItem[] {
  if (!items) return out;
  for (const it of items) {
    out.push({ key: `${depth}-${out.length}`, title: (it.title || 'Untitled').trim(), page: it.pageIdx + 1, depth });
    if (it.children?.length) flattenToc(it.children, depth + 1, out);
  }
  return out;
}

const FILTER_LABELS: Record<ReadingFilter, string> = {
  none: 'Original',
  night: 'Night (inverted)',
  sepia: 'Eye comfort (warm)',
};

export default function ViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const doc = useDoc(id);
  const { updateDoc, toggleBookmark } = useLibrary();
  const { colors: c, settings, update } = useSettings();
  const insets = useSafeAreaInsets();
  const pdfRef = useRef<PdfRef>(null);

  const [startPage, setStartPage] = useState(() => Math.max(1, doc?.page ?? 1));
  const pageRef = useRef(startPage);
  const [page, setPage] = useState(startPage);
  const [pages, setPages] = useState(doc?.pages ?? 0);
  const [loaded, setLoaded] = useState(false);
  const [chrome, setChrome] = useState(true);
  const [password, setPassword] = useState<string | undefined>(undefined);
  const [askPassword, setAskPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [panel, setPanel] = useState<Panel>(null);
  const [gotoOpen, setGotoOpen] = useState(false);
  const [gotoError, setGotoError] = useState<string | null>(null);

  const missing = useMemo(() => (doc ? !fileExists(doc.uri) : false), [doc?.uri]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mark as opened once.
  useEffect(() => {
    if (id && doc) updateDoc(id, { openedAt: Date.now() });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the screen on while reading (optional).
  useEffect(() => {
    if (!settings.keepAwake) return;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, [settings.keepAwake]);

  // Immersive reading: hide system navigation bar together with our toolbars.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    NavigationBar.setVisibilityAsync(chrome ? 'visible' : 'hidden').catch(() => {});
  }, [chrome]);
  useEffect(
    () => () => {
      if (Platform.OS === 'android') NavigationBar.setVisibilityAsync('visible').catch(() => {});
    },
    [],
  );

  const goTo = useCallback(
    (target: number) => {
      if (!pages) return;
      const p = Math.max(1, Math.min(pages, Math.round(target)));
      pdfRef.current?.setPage(p);
      pageRef.current = p;
      setPage(p);
    },
    [pages],
  );

  /** Re-creates the native view (needed for layout changes) while preserving position. */
  const remountAtCurrentPage = () => {
    setStartPage(pageRef.current);
    setLoaded(false);
  };

  const setLayout = (patch: { horizontal?: boolean; paging?: boolean }) => {
    remountAtCurrentPage();
    update(patch);
  };

  const onBookmark = () => {
    if (!doc) return;
    const added = toggleBookmark(doc.id, page);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    toast(added ? `Page ${page} bookmarked` : 'Bookmark removed');
  };

  const onPressLink = (url: string) => {
    Alert.alert('Open link?', url, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open', onPress: () => Linking.openURL(url).catch(() => toast('Cannot open this link')) },
    ]);
  };

  if (!doc || missing) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <Ionicons name="alert-circle-outline" size={52} color={c.textFaint} />
        <Text style={[styles.errTitle, { color: c.text }]}>Document not available</Text>
        <Text style={[styles.errText, { color: c.textMuted }]}>
          {doc ? 'The file could not be found. It may have been removed.' : 'This document is no longer in your library.'}
        </Text>
        <Button title="Back to library" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={{ marginTop: 22 }} />
      </View>
    );
  }

  const isBookmarked = doc.bookmarks.includes(page);
  const filter = settings.filter;

  const menuActions: SheetAction[] = [
    { key: 'goto', label: 'Go to page', icon: 'arrow-redo-outline', onPress: () => setGotoOpen(true), hint: pages ? `1–${pages}` : undefined },
    {
      key: 'vertical',
      label: 'Vertical scrolling',
      icon: 'swap-vertical-outline',
      active: !settings.horizontal,
      onPress: () => !settings.horizontal || setLayout({ horizontal: false }),
    },
    {
      key: 'horizontal',
      label: 'Horizontal scrolling',
      icon: 'swap-horizontal-outline',
      active: settings.horizontal,
      onPress: () => settings.horizontal || setLayout({ horizontal: true }),
    },
    {
      key: 'paging',
      label: 'Page by page',
      icon: 'albums-outline',
      active: settings.paging,
      onPress: () => setLayout({ paging: !settings.paging }),
    },
    {
      key: 'awake',
      label: 'Keep screen on',
      icon: 'sunny-outline',
      active: settings.keepAwake,
      onPress: () => update({ keepAwake: !settings.keepAwake }),
    },
    { key: 'share', label: 'Share', icon: 'share-social-outline', onPress: () => shareDoc(doc) },
    { key: 'print', label: 'Print', icon: 'print-outline', onPress: () => printDoc(doc) },
    {
      key: 'info',
      label: 'File info',
      icon: 'information-circle-outline',
      onPress: () =>
        Alert.alert(
          baseName(doc.name),
          [
            `Size: ${formatBytes(doc.size)}`,
            pages ? `Pages: ${pages}` : null,
            `Bookmarks: ${doc.bookmarks.length}`,
            `Added: ${formatDate(doc.addedAt)}`,
            doc.locked ? 'Password protected' : null,
          ]
            .filter(Boolean)
            .join('\n'),
        ),
    },
  ];

  const pdfKey = `${startPage}-${settings.horizontal}-${settings.paging}-${password ?? ''}`;

  return (
    <View style={[styles.flex, { backgroundColor: c.viewerBg }]}>
      <StatusBar hidden={!chrome} style={c.dark ? 'light' : 'dark'} animated />

      {error ? (
        <View style={[styles.center, { paddingTop: insets.top }]}>
          <Ionicons name="document-outline" size={52} color={c.textFaint} />
          <Text style={[styles.errTitle, { color: c.text }]}>Can’t open this PDF</Text>
          <Text style={[styles.errText, { color: c.textMuted }]}>The file may be damaged or uses an unsupported format.</Text>
          <Button title="Go back" onPress={() => router.back()} style={{ marginTop: 22 }} />
        </View>
      ) : (
        <View style={styles.flex}>
          <Pdf
            key={pdfKey}
            ref={pdfRef}
            source={{ uri: doc.uri }}
            page={startPage}
            password={password}
            horizontal={settings.horizontal}
            enablePaging={settings.paging}
            fitPolicy={settings.horizontal ? 2 : 0}
            spacing={settings.paging ? 0 : 8}
            minScale={1}
            maxScale={6}
            enableDoubleTapZoom
            enableAntialiasing
            enableAnnotationRendering
            trustAllCerts={false}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            style={[styles.flex, { backgroundColor: c.viewerBg }]}
            renderActivityIndicator={() => <ActivityIndicator color={c.primary} size="large" />}
            onLoadComplete={(n, _path, _size, tableContents) => {
              setLoaded(true);
              setPages(n);
              setToc(flattenToc(tableContents));
              setAskPassword(false);
              setPasswordError(null);
              const patch: Partial<typeof doc> = { pages: n, locked: !!password };
              if (pageRef.current > n) {
                pageRef.current = n;
                setPage(n);
                patch.page = n;
              }
              updateDoc(doc.id, patch);
            }}
            onPageChanged={(p, n) => {
              pageRef.current = p;
              setPage(p);
              if (n) setPages(n);
              updateDoc(doc.id, { page: p });
            }}
            onError={(err) => {
              const msg = String((err as Error)?.message ?? err);
              if (/password/i.test(msg)) {
                setPasswordError(password ? 'Incorrect password. Please try again.' : null);
                setAskPassword(true);
                updateDoc(doc.id, { locked: true });
                return;
              }
              console.warn('[pdf] load error', msg);
              setError(msg);
            }}
            onPageSingleTap={() => setChrome((v) => !v)}
            onPressLink={onPressLink}
          />

          {filter !== 'none' ? (
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                filter === 'night'
                  ? { backgroundColor: '#FFFFFF', mixBlendMode: 'difference' }
                  : { backgroundColor: 'rgba(255, 170, 70, 0.16)' },
              ]}
            />
          ) : null}
        </View>
      )}

      {/* Top bar */}
      {chrome ? (
        <View style={[styles.topBar, { paddingTop: insets.top, backgroundColor: c.chrome, borderBottomColor: c.border }]}>
          <IconButton name="arrow-back" label="Back" onPress={() => router.back()} />
          <View style={styles.titleBox}>
            <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
              {baseName(doc.name)}
            </Text>
            <Text style={[styles.subtitle, { color: c.textMuted }]} numberOfLines={1}>
              {pages ? `Page ${page} of ${pages}` : loaded ? '' : 'Loading…'}
            </Text>
          </View>
          <IconButton
            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            color={isBookmarked ? c.primary : c.text}
            label={isBookmarked ? 'Remove bookmark' : 'Bookmark this page'}
            onPress={onBookmark}
            disabled={!loaded}
          />
          <IconButton name="ellipsis-vertical" label="More options" onPress={() => setPanel('menu')} />
        </View>
      ) : null}

      {/* Bottom bar */}
      {chrome && loaded && !error ? (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 6, backgroundColor: c.chrome, borderTopColor: c.border }]}>
          <View style={styles.sliderRow}>
            <IconButton name="chevron-back" label="Previous page" onPress={() => goTo(page - 1)} disabled={page <= 1} />
            <PageSlider page={page} pages={pages} onSeek={goTo} />
            <IconButton name="chevron-forward" label="Next page" onPress={() => goTo(page + 1)} disabled={page >= pages} />
          </View>
          <View style={styles.toolRow}>
            <Tool icon="list-outline" label="Contents" onPress={() => setPanel('toc')} />
            <Tool icon="bookmarks-outline" label="Bookmarks" badge={doc.bookmarks.length} onPress={() => setPanel('bookmarks')} />
            <Pressable onPress={() => setGotoOpen(true)} style={[styles.pagePill, { backgroundColor: c.surfaceAlt }]} accessibilityRole="button" accessibilityLabel="Go to page">
              <Text style={[styles.pagePillText, { color: c.text }]}>
                {page} / {pages}
              </Text>
            </Pressable>
            <Tool icon={filter === 'night' ? 'moon' : 'moon-outline'} label="Reading mode" active={filter !== 'none'} onPress={() => setPanel('filter')} />
            <Tool
              icon={settings.horizontal ? 'swap-horizontal' : 'swap-vertical'}
              label="Scroll"
              onPress={() => setLayout({ horizontal: !settings.horizontal })}
            />
          </View>
        </View>
      ) : null}

      <Sheet visible={panel === 'menu'} onClose={() => setPanel(null)} title={baseName(doc.name)} actions={menuActions} />

      <Sheet
        visible={panel === 'filter'}
        onClose={() => setPanel(null)}
        title="Reading mode"
        actions={(Object.keys(FILTER_LABELS) as ReadingFilter[]).map((f) => ({
          key: f,
          label: FILTER_LABELS[f],
          icon: f === 'night' ? 'moon-outline' : f === 'sepia' ? 'cafe-outline' : 'sunny-outline',
          active: filter === f,
          onPress: () => update({ filter: f }),
        }))}
      />

      <Sheet visible={panel === 'toc'} onClose={() => setPanel(null)} title="Contents" subtitle={toc.length ? `${toc.length} sections` : undefined}>
        {toc.length === 0 ? (
          <Text style={[styles.sheetEmpty, { color: c.textMuted }]}>This document has no table of contents.</Text>
        ) : (
          <FlatList
            data={toc}
            keyExtractor={(t) => t.key}
            initialNumToRender={30}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setPanel(null);
                  goTo(item.page);
                }}
                android_ripple={{ color: c.border }}
                style={[styles.listRow, { paddingLeft: 20 + item.depth * 16 }]}
              >
                <Text
                  style={[styles.listText, { color: c.text, fontWeight: item.depth === 0 ? '600' : '400' }]}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
                <Text style={[styles.listPage, { color: item.page === page ? c.primary : c.textFaint }]}>{item.page}</Text>
              </Pressable>
            )}
          />
        )}
      </Sheet>

      <Sheet
        visible={panel === 'bookmarks'}
        onClose={() => setPanel(null)}
        title="Bookmarks"
        subtitle={doc.bookmarks.length ? 'Tap to jump · long-press to remove' : undefined}
      >
        {doc.bookmarks.length === 0 ? (
          <View style={styles.sheetEmptyBox}>
            <Text style={[styles.sheetEmpty, { color: c.textMuted }]}>No bookmarks yet.</Text>
            <Button
              title={`Bookmark page ${page}`}
              icon="bookmark-outline"
              variant="secondary"
              onPress={() => {
                setPanel(null);
                onBookmark();
              }}
              style={{ marginTop: 14, alignSelf: 'stretch' }}
            />
          </View>
        ) : (
          <FlatList
            data={doc.bookmarks}
            keyExtractor={(p) => String(p)}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setPanel(null);
                  goTo(item);
                }}
                onLongPress={() => {
                  toggleBookmark(doc.id, item);
                  toast('Bookmark removed');
                }}
                android_ripple={{ color: c.border }}
                style={styles.listRow}
              >
                <Ionicons name="bookmark" size={18} color={c.primary} />
                <Text style={[styles.listText, { color: c.text, marginLeft: 14 }]}>Page {item}</Text>
                {item === page ? <Text style={[styles.listPage, { color: c.primary }]}>current</Text> : null}
              </Pressable>
            )}
          />
        )}
      </Sheet>

      <PromptDialog
        visible={gotoOpen}
        title="Go to page"
        message={pages ? `Enter a page between 1 and ${pages}` : undefined}
        initialValue={String(page)}
        keyboardType="number-pad"
        confirmLabel="Go"
        error={gotoError}
        onCancel={() => {
          setGotoOpen(false);
          setGotoError(null);
        }}
        onSubmit={(v) => {
          const n = parseInt(v, 10);
          if (!Number.isFinite(n) || n < 1 || n > pages) {
            setGotoError(`Please enter a number from 1 to ${pages}.`);
            return;
          }
          setGotoError(null);
          setGotoOpen(false);
          goTo(n);
        }}
      />

      <PromptDialog
        visible={askPassword}
        title="Password required"
        message="This PDF is protected. Enter the password to open it."
        placeholder="Password"
        secure
        confirmLabel="Open"
        error={passwordError}
        onCancel={() => {
          setAskPassword(false);
          if (!loaded) router.back();
        }}
        onSubmit={(v) => {
          if (!v) {
            setPasswordError('Please enter the password.');
            return;
          }
          setAskPassword(false);
          remountAtCurrentPage();
          setPassword(v);
        }}
      />
    </View>
  );
}

function Tool({
  icon,
  label,
  onPress,
  active,
  badge,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  active?: boolean;
  badge?: number;
}) {
  const { colors: c } = useSettings();
  return (
    <View>
      <IconButton name={icon} label={label} onPress={onPress} color={active ? c.primary : c.text} />
      {badge ? (
        <View style={[styles.badge, { backgroundColor: c.primary }]} pointerEvents="none">
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  errTitle: { fontSize: 20, fontWeight: '700', marginTop: 14 },
  errText: { fontSize: 15, textAlign: 'center', marginTop: 8, lineHeight: 21 },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleBox: { flex: 1, marginHorizontal: 4 },
  title: { fontSize: 16, fontWeight: '600' },
  subtitle: { fontSize: 12.5, marginTop: 1 },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 6,
    paddingTop: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sliderRow: { flexDirection: 'row', alignItems: 'center' },
  toolRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  pagePill: { paddingHorizontal: 14, height: 34, borderRadius: 17, justifyContent: 'center', minWidth: 84, alignItems: 'center' },
  pagePillText: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  badge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  listRow: { flexDirection: 'row', alignItems: 'center', minHeight: 50, paddingHorizontal: 20, paddingVertical: 10 },
  listText: { flex: 1, fontSize: 15 },
  listPage: { fontSize: 13, marginLeft: 12, fontVariant: ['tabular-nums'] },
  sheetEmptyBox: { paddingHorizontal: 20, paddingBottom: 8 },
  sheetEmpty: { fontSize: 15, paddingHorizontal: 20, paddingVertical: 12 },
});
