import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from './theme';

export function LoadingView({ label = 'Uçuşlar yükleniyor…' }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.body}>{label}</Text>
    </View>
  );
}

type MessageProps = {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
};

export function MessageView({ title, body, actionLabel, onAction, testID }: MessageProps) {
  return (
    <View style={styles.center} testID={testID}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
  body: { fontSize: 15, color: colors.muted, textAlign: 'center' },
  button: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  buttonText: { color: colors.primaryText, fontWeight: '700', fontSize: 15 },
});
