import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps, ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
  ViewStyle,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/context/SettingsContext';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function toast(message: string) {
  if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.SHORT);
  else Alert.alert(message);
}

export function IconButton({
  name,
  onPress,
  color,
  size = 22,
  label,
  disabled,
  style,
}: {
  name: IconName;
  onPress?: () => void;
  color?: string;
  size?: number;
  label: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      android_ripple={{ color: c.border, borderless: true, radius: 22 }}
      style={({ pressed }) => [
        styles.iconBtn,
        { opacity: disabled ? 0.35 : pressed && Platform.OS !== 'android' ? 0.6 : 1 },
        style,
      ]}
    >
      <Ionicons name={name} size={size} color={color ?? c.text} />
    </Pressable>
  );
}

export function Button({
  title,
  onPress,
  icon,
  variant = 'primary',
  style,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  variant?: 'primary' | 'secondary' | 'ghost';
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const bg = variant === 'primary' ? c.primary : variant === 'secondary' ? c.surfaceAlt : 'transparent';
  const fg = variant === 'primary' ? c.onPrimary : variant === 'secondary' ? c.text : c.primary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: pressed && Platform.OS !== 'android' ? 0.8 : 1 },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={fg} style={{ marginRight: 8 }} /> : null}
      <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export type SheetAction = {
  key: string;
  label: string;
  icon: IconName;
  onPress: () => void;
  destructive?: boolean;
  active?: boolean;
  hint?: string;
};

/** Bottom sheet with a title and a list of actions or custom content. */
export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  actions,
  children,
  maxHeight = '75%',
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  actions?: SheetAction[];
  children?: ReactNode;
  maxHeight?: `${number}%` | number;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <Pressable style={[styles.backdrop, { backgroundColor: c.overlay }]} onPress={onClose} accessibilityLabel="Close" />
      <View
        style={[
          styles.sheet,
          { backgroundColor: c.surface, paddingBottom: insets.bottom + 12, maxHeight },
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: c.border }]} />
        {title ? (
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: c.text }]} numberOfLines={2}>
              {title}
            </Text>
            {subtitle ? <Text style={[styles.sheetSubtitle, { color: c.textMuted }]}>{subtitle}</Text> : null}
          </View>
        ) : null}
        {actions ? (
          <ScrollView bounces={false}>
            {actions.map((a) => (
              <Pressable
                key={a.key}
                onPress={() => {
                  onClose();
                  // Let the sheet close before triggering dialogs / navigation.
                  setTimeout(a.onPress, 180);
                }}
                android_ripple={{ color: c.border }}
                style={({ pressed }) => [styles.sheetRow, pressed && Platform.OS !== 'android' && { backgroundColor: c.surfaceAlt }]}
                accessibilityRole="button"
              >
                <Ionicons
                  name={a.icon}
                  size={22}
                  color={a.destructive ? c.danger : a.active ? c.primary : c.textMuted}
                />
                <Text style={[styles.sheetLabel, { color: a.destructive ? c.danger : c.text }]}>{a.label}</Text>
                {a.hint ? <Text style={[styles.sheetHint, { color: c.textFaint }]}>{a.hint}</Text> : null}
                {a.active ? <Ionicons name="checkmark" size={20} color={c.primary} /> : null}
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          children
        )}
      </View>
    </Modal>
  );
}

type PromptProps = {
  visible: boolean;
  title: string;
  message?: string;
  initialValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  keyboardType?: 'default' | 'number-pad';
  secure?: boolean;
  error?: string | null;
  onCancel: () => void;
  onSubmit: (value: string) => void;
};

/** Cross-platform text prompt (Alert.prompt is iOS only). */
export function PromptDialog(props: PromptProps) {
  return (
    <Modal
      visible={props.visible}
      transparent
      animationType="fade"
      onRequestClose={props.onCancel}
      statusBarTranslucent
      navigationBarTranslucent
    >
      {/* Body mounts fresh each time the dialog opens, so the input starts from initialValue. */}
      {props.visible ? <PromptBody {...props} /> : null}
    </Modal>
  );
}

function PromptBody({
  title,
  message,
  initialValue = '',
  placeholder,
  confirmLabel = 'OK',
  keyboardType = 'default',
  secure,
  error,
  onCancel,
  onSubmit,
}: PromptProps) {
  const c = useColors();
  const [value, setValue] = useState(initialValue);

  return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.center, { backgroundColor: c.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View style={[styles.dialog, { backgroundColor: c.surface }]}>
          <Text style={[styles.dialogTitle, { color: c.text }]}>{title}</Text>
          {message ? <Text style={[styles.dialogMsg, { color: c.textMuted }]}>{message}</Text> : null}
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={c.textFaint}
            autoFocus
            selectTextOnFocus
            secureTextEntry={secure}
            keyboardType={keyboardType}
            returnKeyType="done"
            onSubmitEditing={() => onSubmit(value)}
            style={[
              styles.input,
              { color: c.text, backgroundColor: c.surfaceAlt, borderColor: error ? c.danger : c.border },
            ]}
          />
          {error ? <Text style={[styles.error, { color: c.danger }]}>{error}</Text> : null}
          <View style={styles.dialogActions}>
            <Pressable onPress={onCancel} style={styles.dialogBtn} accessibilityRole="button">
              <Text style={[styles.dialogBtnText, { color: c.textMuted }]}>Cancel</Text>
            </Pressable>
            <Pressable onPress={() => onSubmit(value)} style={styles.dialogBtn} accessibilityRole="button">
              <Text style={[styles.dialogBtnText, { color: c.primary }]}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
  );
}

export function LoadingOverlay({ visible, label }: { visible: boolean; label?: string }) {
  const c = useColors();
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent>
      <View style={[styles.center, { backgroundColor: c.overlay }]}>
        <View style={[styles.loadingBox, { backgroundColor: c.surface }]}>
          <ActivityIndicator color={c.primary} size="large" />
          {label ? <Text style={[styles.loadingText, { color: c.text }]}>{label}</Text> : null}
        </View>
      </View>
    </Modal>
  );
}

export function ProgressBar({
  value,
  style,
  color,
}: {
  value: number;
  style?: StyleProp<ViewStyle>;
  color?: string;
}) {
  const c = useColors();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={[styles.track, { backgroundColor: c.surfaceAlt }, style]}>
      <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color ?? c.primary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
  },
  btnText: { fontSize: 16, fontWeight: '600' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 8,
    overflow: 'hidden',
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 8 },
  sheetHeader: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10 },
  sheetTitle: { fontSize: 17, fontWeight: '700' },
  sheetSubtitle: { fontSize: 13, marginTop: 3 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, minHeight: 52, gap: 16 },
  sheetLabel: { flex: 1, fontSize: 16 },
  sheetHint: { fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 420, borderRadius: 20, padding: 22 },
  dialogTitle: { fontSize: 19, fontWeight: '700' },
  dialogMsg: { fontSize: 14, marginTop: 6, lineHeight: 20 },
  input: { marginTop: 16, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 16 },
  error: { fontSize: 13, marginTop: 8 },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 18, gap: 4 },
  dialogBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  dialogBtnText: { fontSize: 15, fontWeight: '700' },
  loadingBox: { borderRadius: 18, paddingHorizontal: 28, paddingVertical: 22, alignItems: 'center', gap: 14 },
  loadingText: { fontSize: 15 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
});
