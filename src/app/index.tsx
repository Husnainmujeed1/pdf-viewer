import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ContinueCard } from '@/components/ContinueCard';
import { DocRow } from '@/components/DocRow';
import { Button, IconButton, LoadingOverlay, PromptDialog, Sheet, SheetAction, toast } from '@/components/ui';
import { useLibrary } from '@/context/LibraryContext';
import { useSettings } from '@/context/SettingsContext';
import { pickPdfs, printDoc, shareDoc } from '@/lib/actions';
import { baseName, formatBytes, formatDate } from '@/lib/format';
import { PdfDoc, SortKey } from '@/lib/types';

type Tab = 'all' | 'favorites';

const SORT_LABELS: Record<SortKey, string> = {
  recent: 'Recently opened',
  added: 'Date added',
  name: 'Name (A–Z)',
  size: 'Size (largest first)',
};

function sortDocs(docs: PdfDoc[], key: SortKey) {
  const arr = [...docs];
  switch (key) {
    case 'name':
      return arr.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }));
    case 'size':
      return arr.sort((a, b) => b.size - a.size);
    case 'added':
      return arr.sort((a, b) => b.addedAt - a.addedAt);
    case 'recent':
    default:
      return arr.sort((a, b) => (b.openedAt ?? b.addedAt) - (a.openedAt ?? a.addedAt));
  }
}

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const { colors: c, settings, update } = useSettings();
  const { docs, importFiles, toggleFavorite, renameDoc, removeDoc } = useLibrary();

  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [importing, setImporting] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [menuDoc, setMenuDoc] = useState<PdfDoc | null>(null);
  const [renameTarget, setRenameTarget] = useState<PdfDoc | null>(null);

  const lastOpened = useMemo(
    () => docs.filter((d) => d.openedAt).sort((a, b) => (b.openedAt ?? 0) - (a.openedAt ?? 0))[0],
    [docs],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = tab === 'favorites' ? docs.filter((d) => d.favorite) : docs;
    if (q) list = list.filter((d) => d.name.toLowerCase().includes(q));
    return sortDocs(list, settings.sort);
  }, [docs, tab, query, settings.sort]);

  const openDoc = useCallback((doc: PdfDoc) => {
    router.push({ pathname: '/viewer/[id]', params: { id: doc.id } });
  }, []);

  const onToggleFavorite = useCallback(
    (doc: PdfDoc) => {
      Haptics.selectionAsync().catch(() => {});
      toggleFavorite(doc.id);
    },
    [toggleFavorite],
  );

  const onAdd = useCallback(async () => {
    try {
      const picked = await pickPdfs();
      if (!picked.length) return;
      setImporting(true);
      const { docs: added, failed } = await importFiles(picked);
      setImporting(false);
      if (failed) {
        Alert.alert('Some files could not be added', `${failed} file(s) could not be read. They may be damaged or not PDFs.`);
      }
      if (added.length === 1 && !failed) openDoc(added[0]);
      else if (added.length > 1) toast(`${added.length} PDFs added`);
    } catch (e) {
      setImporting(false);
      console.warn('[import]', e);
      Alert.alert('Could not open file', 'Please try again or choose a different file.');
    }
  }, [importFiles, openDoc]);

  const confirmDelete = (doc: PdfDoc) => {
    Alert.alert(
      'Remove from library?',
      `"${baseName(doc.name)}" will be removed from this app. The original file on your device is not affected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            removeDoc(doc.id);
            toast('Removed');
          },
        },
      ],
    );
  };

  const showInfo = (doc: PdfDoc) => {
    Alert.alert(
      baseName(doc.name),
      [
        `Size: ${formatBytes(doc.size)}`,
        doc.pages ? `Pages: ${doc.pages}` : null,
        doc.pages ? `Last read: page ${doc.page}` : null,
        `Bookmarks: ${doc.bookmarks.length}`,
        `Added: ${formatDate(doc.addedAt)}`,
        doc.openedAt ? `Last opened: ${formatDate(doc.openedAt)}` : null,
        doc.locked ? 'Password protected' : null,
      ]
        .filter(Boolean)
        .join('\n'),
    );
  };

  const docActions = (doc: PdfDoc): SheetAction[] => [
    { key: 'open', label: 'Open', icon: 'book-outline', onPress: () => openDoc(doc) },
    {
      key: 'fav',
      label: doc.favorite ? 'Remove from favorites' : 'Add to favorites',
      icon: doc.favorite ? 'star' : 'star-outline',
      onPress: () => toggleFavorite(doc.id),
    },
    { key: 'rename', label: 'Rename', icon: 'create-outline', onPress: () => setRenameTarget(doc) },
    { key: 'share', label: 'Share', icon: 'share-social-outline', onPress: () => shareDoc(doc) },
    { key: 'print', label: 'Print', icon: 'print-outline', onPress: () => printDoc(doc) },
    { key: 'info', label: 'File info', icon: 'information-circle-outline', onPress: () => showInfo(doc) },
    { key: 'delete', label: 'Remove from library', icon: 'trash-outline', destructive: true, onPress: () => confirmDelete(doc) },
  ];

  const showContinue = tab === 'all' && !query && lastOpened && docs.length > 0;

  const header = (
    <View>
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.text }]}>PDF Reader</Text>
          <Text style={[styles.subtitle, { color: c.textMuted }]}>
            {docs.length === 0 ? 'Your library is empty' : `${docs.length} document${docs.length === 1 ? '' : 's'}`}
          </Text>
        </View>
        <IconButton name="swap-vertical" label="Sort" onPress={() => setSortOpen(true)} />
        <IconButton name="settings-outline" label="Settings" onPress={() => router.push('/settings')} />
      </View>

      {docs.length > 0 ? (
        <>
          <View style={[styles.search, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Ionicons name="search" size={18} color={c.textFaint} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search documents"
              placeholderTextColor={c.textFaint}
              style={[styles.searchInput, { color: c.text }]}
              returnKeyType="search"
              autoCorrect={false}
            />
            {query ? <IconButton name="close-circle" size={18} color={c.textFaint} label="Clear search" onPress={() => setQuery('')} /> : null}
          </View>

          {showContinue ? (
            <View style={{ marginTop: 16 }}>
              <ContinueCard doc={lastOpened} onPress={() => openDoc(lastOpened)} />
            </View>
          ) : null}

          <View style={styles.tabs}>
            {(['all', 'favorites'] as Tab[]).map((t) => {
              const active = tab === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => setTab(t)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.tab,
                    { backgroundColor: active ? c.text : c.surface, borderColor: active ? c.text : c.border },
                  ]}
                >
                  <Ionicons name={t === 'all' ? 'documents-outline' : 'star'} size={15} color={active ? c.bg : c.textMuted} />
                  <Text style={[styles.tabText, { color: active ? c.bg : c.textMuted }]}>
                    {t === 'all' ? 'All files' : 'Favorites'}
                  </Text>
                </Pressable>
              );
            })}
            <Text style={[styles.sortHint, { color: c.textFaint }]} numberOfLines={1}>
              {SORT_LABELS[settings.sort]}
            </Text>
          </View>
        </>
      ) : null}
    </View>
  );

  const empty =
    docs.length === 0 ? (
      <View style={styles.empty}>
        <View style={[styles.emptyIcon, { backgroundColor: c.primarySoft }]}>
          <Ionicons name="document-text" size={44} color={c.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: c.text }]}>Open your first PDF</Text>
        <Text style={[styles.emptyText, { color: c.textMuted }]}>
          Pick a PDF from your phone, or use “Open with” / “Share” from any app. Your reading progress, bookmarks and
          favorites are saved automatically.
        </Text>
        <Button title="Open PDF" icon="folder-open-outline" onPress={onAdd} style={{ marginTop: 22, alignSelf: 'stretch' }} />
      </View>
    ) : (
      <View style={styles.emptySmall}>
        <Ionicons name={tab === 'favorites' && !query ? 'star-outline' : 'search'} size={36} color={c.textFaint} />
        <Text style={[styles.emptyText, { color: c.textMuted, marginTop: 10 }]}>
          {query ? `No documents match “${query}”` : 'No favorites yet. Tap the star on any document.'}
        </Text>
      </View>
    );

  return (
    <View style={[styles.flex, { backgroundColor: c.bg }]}>
      <FlatList
        data={visible}
        keyExtractor={(d) => d.id}
        renderItem={({ item }) => (
          <DocRow doc={item} onOpen={openDoc} onMore={setMenuDoc} onToggleFavorite={onToggleFavorite} />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 110,
          paddingHorizontal: 16,
          flexGrow: 1,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />

      {docs.length > 0 ? (
        <Pressable
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel="Open PDF"
          android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
          style={[styles.fab, { backgroundColor: c.primary, bottom: insets.bottom + 20 }]}
        >
          <Ionicons name="add" size={24} color={c.onPrimary} />
          <Text style={[styles.fabText, { color: c.onPrimary }]}>Open PDF</Text>
        </Pressable>
      ) : null}

      <Sheet
        visible={sortOpen}
        onClose={() => setSortOpen(false)}
        title="Sort by"
        actions={(Object.keys(SORT_LABELS) as SortKey[]).map((k) => ({
          key: k,
          label: SORT_LABELS[k],
          icon: k === 'name' ? 'text-outline' : k === 'size' ? 'resize-outline' : k === 'added' ? 'calendar-outline' : 'time-outline',
          active: settings.sort === k,
          onPress: () => update({ sort: k }),
        }))}
      />

      <Sheet
        visible={!!menuDoc}
        onClose={() => setMenuDoc(null)}
        title={menuDoc ? baseName(menuDoc.name) : undefined}
        subtitle={menuDoc ? `${formatBytes(menuDoc.size)}${menuDoc.pages ? ` · ${menuDoc.pages} pages` : ''}` : undefined}
        actions={menuDoc ? docActions(menuDoc) : []}
      />

      <PromptDialog
        visible={!!renameTarget}
        title="Rename"
        initialValue={renameTarget ? baseName(renameTarget.name) : ''}
        confirmLabel="Save"
        onCancel={() => setRenameTarget(null)}
        onSubmit={(v) => {
          if (renameTarget && v.trim()) renameDoc(renameTarget.id, v);
          setRenameTarget(null);
        }}
      />

      <LoadingOverlay visible={importing} label="Adding to library…" />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 13.5, marginTop: 2 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: 14,
    height: 48,
  },
  searchInput: { flex: 1, fontSize: 15.5, marginLeft: 10, paddingVertical: 0 },
  tabs: { flexDirection: 'row', alignItems: 'center', marginTop: 18, marginBottom: 12, gap: 8 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tabText: { fontSize: 13.5, fontWeight: '600' },
  sortHint: { flex: 1, textAlign: 'right', fontSize: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingBottom: 40 },
  emptyIcon: { width: 96, height: 96, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  emptyTitle: { fontSize: 22, fontWeight: '700' },
  emptyText: { fontSize: 15, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  emptySmall: { alignItems: 'center', paddingTop: 50, paddingHorizontal: 24 },
  fab: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  fabText: { fontSize: 16, fontWeight: '700' },
});
