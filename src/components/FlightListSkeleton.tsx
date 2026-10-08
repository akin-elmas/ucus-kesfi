import { StyleSheet, View, type DimensionValue } from 'react-native';
import { colors, spacing } from './theme';

const CARD_COUNT = 4;

function Bar({ width, height }: { width: DimensionValue; height: number }) {
  return <View style={[styles.bar, { width, height }]} />;
}

function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Bar width="45%" height={14} />
        <Bar width={72} height={28} />
      </View>
      <View style={styles.row}>
        <Bar width={64} height={26} />
        <Bar width={56} height={14} />
        <Bar width={64} height={26} />
      </View>
      <View style={styles.price}>
        <Bar width={110} height={20} />
      </View>
    </View>
  );
}

export function FlightListSkeleton() {
  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Uçuşlar yükleniyor…"
      testID="list-loading"
    >
      {Array.from({ length: CARD_COUNT }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { alignItems: 'flex-end' },
  bar: { backgroundColor: colors.border, borderRadius: 6 },
});
