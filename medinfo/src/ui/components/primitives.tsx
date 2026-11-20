import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { InteractionSeverity } from '@/domain/types';
import { font, radius, SEVERITY_LABEL, spacing, useTheme } from '../theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>{children}</View>
  );
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  accessibilityHint?: string;
}

export function Button({ label, onPress, icon, variant = 'primary', disabled, accessibilityHint }: ButtonProps) {
  const { colors } = useTheme();
  const bg = variant === 'primary' ? colors.primary : variant === 'secondary' ? colors.primarySoft : 'transparent';
  const fg = variant === 'primary' ? colors.primaryText : colors.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      {icon && <Ionicons name={icon} size={18} color={fg} />}
      <Text style={[styles.buttonLabel, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function SeverityBadge({ severity }: { severity: InteractionSeverity }) {
  const { colors } = useTheme();
  const c = colors.severity[severity];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]} accessibilityLabel={`Gravedad: ${SEVERITY_LABEL[severity]}`}>
      <Text style={[styles.badgeText, { color: c.fg }]}>{SEVERITY_LABEL[severity]}</Text>
    </View>
  );
}

export function Tag({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'warning' | 'primary' }) {
  const { colors } = useTheme();
  const map = {
    neutral: [colors.surfaceMuted, colors.textMuted],
    warning: [colors.warningSoft, colors.warningText],
    primary: [colors.primarySoft, colors.primary],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      <Text style={[styles.tagText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function Notice({ text, tone = 'warning', icon }: { text: string; tone?: 'warning' | 'danger' | 'info'; icon?: IconName }) {
  const { colors } = useTheme();
  const [bg, fg] =
    tone === 'danger'
      ? [colors.dangerSoft, colors.dangerText]
      : tone === 'info'
        ? [colors.primarySoft, colors.text]
        : [colors.warningSoft, colors.warningText];
  return (
    <View style={[styles.notice, { backgroundColor: bg }]} accessibilityRole="alert">
      <Ionicons name={icon ?? (tone === 'info' ? 'information-circle' : 'warning')} size={18} color={fg} />
      <Text style={[styles.noticeText, { color: fg }]}>{text}</Text>
    </View>
  );
}

export function LoadingView({ label = 'Cargando…' }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.center} accessibilityLiveRegion="polite">
      <ActivityIndicator color={colors.primary} />
      <Text style={[styles.centerText, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

export function MessageView({
  icon,
  title,
  message,
  action,
}: {
  icon: IconName;
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.center}>
      <Ionicons name={icon} size={40} color={colors.textMuted} />
      <Text style={[styles.messageTitle, { color: colors.text }]}>{title}</Text>
      {message && <Text style={[styles.centerText, { color: colors.textMuted }]}>{message}</Text>}
      {action && (
        <View style={{ marginTop: spacing.md }}>
          <Button label={action.label} onPress={action.onPress} icon="refresh" variant="secondary" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg },
  button: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonLabel: { fontSize: font.body, fontWeight: '600' },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill, alignSelf: 'flex-start' },
  badgeText: { fontSize: font.caption, fontWeight: '700' },
  tag: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  tagText: { fontSize: font.caption, fontWeight: '600' },
  notice: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, alignItems: 'flex-start' },
  noticeText: { flex: 1, fontSize: font.caption + 1, lineHeight: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.sm },
  centerText: { fontSize: font.body, textAlign: 'center', lineHeight: 22 },
  messageTitle: { fontSize: font.title, fontWeight: '700', textAlign: 'center' },
});
