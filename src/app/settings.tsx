import Ionicons from '@expo/vector-icons/Ionicons';
import * as Application from 'expo-application';
import { router } from 'expo-router';
import { ReactNode, useMemo } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton, IconName, toast } from '@/components/ui';
import { useLibrary } from '@/context/LibraryContext';
import { useSettings } from '@/context/SettingsContext';
import { clearShareCache, libraryBytes } from '@/lib/files';
import { formatBytes } from '@/lib/format';
import { ReadingFilter, ThemePref } from '@/lib/types';

const PACKAGE = Application.applicationId ?? 'com.azeempro.pdfreader';
const STORE_URL = `https://play.google.com/store/apps/details?id=${PACKAGE}`;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors: c, settings, update } = useSettings();
  const { docs, clearAll } = useLibrary();
  const used = useMemo(() => libraryBytes(), [docs]); // eslint-disable-line react-hooks/exhaustive-deps

  const version = `${Application.nativeApplicationVersion ?? '1.0.0'} (${Application.nativeBuildVersion ?? '1'})`;

  const confirmClear = () => {
    Alert.alert(
      'Clear library?',
      'All documents, bookmarks and reading progress will be removed from this app. Original files on your device are not affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearAll();
            toast('Library cleared');
          },
        },
      ],
    );
  };

  const rate = async () => {
    const market = `market://details?id=${PACKAGE}`;
    try {
      if (Platform.OS === 'android' && (await Linking.canOpenURL(market))) await Linking.openURL(market);
      else await Linking.openURL(STORE_URL);
    } catch {
      Linking.openURL(STORE_URL).catch(() => {});
    }
  };

  const shareApp = () => {
    Share.share({ message: `Fast and simple PDF Reader: ${STORE_URL}` }).catch(() => {});
  };

  return (
    <View style={[styles.flex, { backgroundColor: c.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <IconButton name="arrow-back" label="Back" onPress={() => router.back()} />
        <Text style={[styles.headerTitle, { color: c.text }]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
        <Section title="Appearance">
          <View style={styles.segmentWrap}>
            {(['system', 'light', 'dark'] as ThemePref[]).map((t) => {
              const active = settings.theme === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => update({ theme: t })}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.segment,
                    { backgroundColor: active ? c.primary : c.surfaceAlt },
                  ]}
                >
                  <Ionicons
                    name={t === 'system' ? 'phone-portrait-outline' : t === 'light' ? 'sunny-outline' : 'moon-outline'}
                    size={18}
                    color={active ? c.onPrimary : c.textMuted}
                  />
                  <Text style={[styles.segmentText, { color: active ? c.onPrimary : c.text }]}>
                    {t === 'system' ? 'System' : t === 'light' ? 'Light' : 'Dark'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section title="Reading">
          <ToggleRow
            icon="swap-horizontal-outline"
            title="Horizontal scrolling"
            subtitle="Swipe left/right between pages"
            value={settings.horizontal}
            onChange={(v) => update({ horizontal: v })}
          />
          <ToggleRow
            icon="albums-outline"
            title="Page by page"
            subtitle="Snap to one page at a time"
            value={settings.paging}
            onChange={(v) => update({ paging: v })}
          />
          <ToggleRow
            icon="sunny-outline"
            title="Keep screen on"
            subtitle="Prevent the screen from sleeping while reading"
            value={settings.keepAwake}
            onChange={(v) => update({ keepAwake: v })}
          />
          <ToggleRow
            icon="moon-outline"
            title="Night reading mode"
            subtitle="Invert page colors to reduce glare"
            value={settings.filter === 'night'}
            onChange={(v) => update({ filter: (v ? 'night' : 'none') as ReadingFilter })}
          />
          <ToggleRow
            icon="cafe-outline"
            title="Eye comfort"
            subtitle="Warm tint for reading at night"
            value={settings.filter === 'sepia'}
            onChange={(v) => update({ filter: (v ? 'sepia' : 'none') as ReadingFilter })}
            last
          />
        </Section>

        <Section title="Storage">
          <InfoRow icon="folder-outline" title="Library" value={`${docs.length} files · ${formatBytes(used)}`} />
          <LinkRow
            icon="refresh-outline"
            title="Clear temporary files"
            onPress={() => {
              clearShareCache();
              toast('Temporary files cleared');
            }}
          />
          <LinkRow icon="trash-outline" title="Clear library" destructive onPress={confirmClear} last />
        </Section>

        <Section title="About">
          <LinkRow icon="star-outline" title="Rate this app" onPress={rate} />
          <LinkRow icon="share-social-outline" title="Share this app" onPress={shareApp} />
          <LinkRow icon="shield-checkmark-outline" title="Privacy policy" onPress={() => router.push('/privacy')} />
          <InfoRow icon="information-circle-outline" title="Version" value={version} last />
        </Section>

        <Text style={[styles.footer, { color: c.textFaint }]}>
          Your documents stay on your device. No account, no tracking.
        </Text>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { colors: c } = useSettings();
  return (
    <View style={{ marginBottom: 22 }}>
      <Text style={[styles.sectionTitle, { color: c.textMuted }]}>{title.toUpperCase()}</Text>
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>{children}</View>
    </View>
  );
}

function RowShell({ icon, children, last, color }: { icon: IconName; children: ReactNode; last?: boolean; color?: string }) {
  const { colors: c } = useSettings();
  return (
    <View style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }]}>
      <Ionicons name={icon} size={21} color={color ?? c.textMuted} />
      {children}
    </View>
  );
}

function ToggleRow({
  icon,
  title,
  subtitle,
  value,
  onChange,
  last,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  const { colors: c } = useSettings();
  return (
    <Pressable onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }}>
      <RowShell icon={icon} last={last}>
        <View style={styles.rowBody}>
          <Text style={[styles.rowTitle, { color: c.text }]}>{title}</Text>
          {subtitle ? <Text style={[styles.rowSub, { color: c.textMuted }]}>{subtitle}</Text> : null}
        </View>
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ true: c.primary, false: c.border }}
          thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
        />
      </RowShell>
    </Pressable>
  );
}

function LinkRow({
  icon,
  title,
  onPress,
  destructive,
  last,
}: {
  icon: IconName;
  title: string;
  onPress: () => void;
  destructive?: boolean;
  last?: boolean;
}) {
  const { colors: c } = useSettings();
  return (
    <Pressable onPress={onPress} android_ripple={{ color: c.border }} accessibilityRole="button">
      <RowShell icon={icon} last={last} color={destructive ? c.danger : undefined}>
        <Text style={[styles.rowTitle, styles.rowBody, { color: destructive ? c.danger : c.text }]}>{title}</Text>
        <Ionicons name="chevron-forward" size={18} color={c.textFaint} />
      </RowShell>
    </Pressable>
  );
}

function InfoRow({ icon, title, value, last }: { icon: IconName; title: string; value: string; last?: boolean }) {
  const { colors: c } = useSettings();
  return (
    <RowShell icon={icon} last={last}>
      <Text style={[styles.rowTitle, styles.rowBody, { color: c.text }]}>{title}</Text>
      <Text style={[styles.rowValue, { color: c.textMuted }]}>{value}</Text>
    </RowShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700', marginLeft: 4 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8, marginLeft: 6 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minHeight: 56, paddingVertical: 10, gap: 14 },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 15.5 },
  rowSub: { fontSize: 12.5, marginTop: 2 },
  rowValue: { fontSize: 14 },
  segmentWrap: { flexDirection: 'row', padding: 8, gap: 8 },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 4 },
  segmentText: { fontSize: 13.5, fontWeight: '600' },
  footer: { textAlign: 'center', fontSize: 12.5, marginTop: 4 },
});
