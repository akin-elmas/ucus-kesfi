import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { FlightDto } from '../api/flight.types';
import {
  arrivesNextDay,
  formatDuration,
  formatPrice,
  formatStops,
  formatTime,
} from '../domain/format';
import { FavoriteButton } from './FavoriteButton';
import { colors, spacing } from './theme';

type Props = { flight: FlightDto; onPress: (id: string) => void };

/** Liste ve favoriler ekranının ortak uçuş kartı. */
export const FlightCard = memo(function FlightCard({ flight, onPress }: Props) {
  const dep = formatTime(flight.departureAt);
  const arr = formatTime(flight.arrivalAt);
  const nextDay = arrivesNextDay(flight.departureAt, flight.arrivalAt);

  return (
    <Pressable
      onPress={() => onPress(flight.id)}
      accessibilityRole="button"
      accessibilityHint="Uçuş detayını açar"
      testID={`flight-card-${flight.id}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.row}>
        <Text style={styles.airline}>
          {flight.airline} · {flight.flightNumber}
        </Text>
        <FavoriteButton flight={flight} />
      </View>

      <View style={[styles.row, styles.times]}>
        <View>
          <Text style={styles.time}>{dep}</Text>
          <Text style={styles.code}>{flight.origin.code}</Text>
        </View>
        <View style={styles.middle}>
          <Text style={styles.muted}>{formatDuration(flight.durationMinutes)}</Text>
          <Text style={[styles.stops, flight.stops === 0 ? styles.direct : styles.transfer]}>
            {formatStops(flight.stops)}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.time}>
            {arr}
            {nextDay ? <Text style={styles.nextDay}> +1</Text> : null}
          </Text>
          <Text style={styles.code}>{flight.destination.code}</Text>
        </View>
      </View>

      <Text style={styles.price}>{formatPrice(flight.priceMinor)}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.md,
  },
  pressed: { opacity: 0.85 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  times: { alignItems: 'flex-start' },
  airline: { fontSize: 14, fontWeight: '600', color: colors.text, flexShrink: 1 },
  time: { fontSize: 22, fontWeight: '700', color: colors.text },
  code: { fontSize: 13, color: colors.muted, marginTop: 2 },
  middle: { alignItems: 'center', paddingTop: 4 },
  right: { alignItems: 'flex-end' },
  muted: { fontSize: 13, color: colors.muted },
  stops: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  direct: { color: '#2B8A3E' },
  transfer: { color: '#B35C00' },
  nextDay: { fontSize: 12, color: colors.muted },
  price: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'right' },
});
