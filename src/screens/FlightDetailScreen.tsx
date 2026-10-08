import { useRoute, type RouteProp } from '@react-navigation/native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Airport, FlightDto } from '../api/flight.types';
import { toUserMessage } from '../api/client';
import { FavoriteButton } from '../components/FavoriteButton';
import { LoadingView, MessageView } from '../components/StateViews';
import { colors, spacing } from '../components/theme';
import {
  formatBaggage,
  formatDate,
  formatDuration,
  formatPrice,
  formatStops,
  formatTime,
} from '../domain/format';
import { useFlight } from '../hooks/useFlight';
import type { FavoritesStackParamList, FlightsStackParamList } from '../navigation/types';

// İki stack'te de aynı ekran ve aynı param şekli ({ id }) kullanılıyor.
type DetailRoute =
  | RouteProp<FlightsStackParamList, 'FlightDetail'>
  | RouteProp<FavoritesStackParamList, 'FlightDetail'>;

export function FlightDetailScreen() {
  const { id } = useRoute<DetailRoute>().params;
  const { data: flight, error, refetch } = useFlight(id);

  // Tek durum: veri varsa göster; yoksa hata; ikisi de yoksa yükleniyor.
  if (flight) return <FlightDetail flight={flight} />;
  if (error) {
    return (
      <View style={styles.screen}>
        <MessageView
          title={toUserMessage(error, 'detail')}
          actionLabel="Tekrar dene"
          onAction={() => refetch()}
          testID="detail-error"
        />
      </View>
    );
  }
  return (
    <View style={styles.screen}>
      <LoadingView label="Uçuş yükleniyor…" />
    </View>
  );
}

function FlightDetail({ flight }: { flight: FlightDto }) {
  return (
    <ScrollView
      style={styles.screen}
      // Alt güvenli alanı tab bar zaten karşılar (ekran tab bar'ın üstünde biter);
      // iOS'ta yatay çentik/kenar boşlukları için otomatik inset.
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <View style={styles.card}>
        <Text style={styles.title} accessibilityRole="header">
          {flight.airline} · {flight.flightNumber}
        </Text>
        <FavoriteButton flight={flight} size="lg" />
      </View>

      <View style={styles.card}>
        <Endpoint
          heading="Kalkış"
          airport={flight.origin}
          iso={flight.departureAt}
          dateTestID="detail-departure-date"
        />
        <View style={styles.divider} />
        <Endpoint
          heading="Varış"
          airport={flight.destination}
          iso={flight.arrivalAt}
          dateTestID="detail-arrival-date"
        />
      </View>

      <View style={styles.card}>
        <Row label="Toplam süre" value={formatDuration(flight.durationMinutes)} />
        <Row label="Aktarma" value={formatStops(flight.stops)} />
        <Row label="Bagaj" value={formatBaggage(flight.baggageKg)} testID="detail-baggage" />
        <Row label="Fiyat" value={formatPrice(flight.priceMinor)} strong />
      </View>
    </ScrollView>
  );
}

type EndpointProps = { heading: string; airport: Airport; iso: string; dateTestID: string };

function Endpoint({ heading, airport, iso, dateTestID }: EndpointProps) {
  return (
    <View style={styles.endpoint}>
      <Text style={styles.sectionHeading} accessibilityRole="header">
        {heading}
      </Text>
      <Text style={styles.time}>{formatTime(iso)}</Text>
      <Text style={styles.date} testID={dateTestID}>
        {formatDate(iso)}
      </Text>
      <Text style={styles.airport}>
        {airport.code} · {airport.name}
      </Text>
      <Text style={styles.muted}>{airport.city}</Text>
    </View>
  );
}

type RowProps = { label: string; value: string; strong?: boolean; testID?: string };

function Row({ label, value, strong, testID }: RowProps) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={[styles.value, strong && styles.strong]} testID={testID}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.md,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  sectionHeading: { fontSize: 13, fontWeight: '600', color: colors.muted, textTransform: 'uppercase' },
  endpoint: { gap: 2 },
  time: { fontSize: 26, fontWeight: '700', color: colors.text },
  date: { fontSize: 15, color: colors.text },
  airport: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: spacing.xs },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  muted: { fontSize: 14, color: colors.muted },
  value: { fontSize: 15, color: colors.text, fontWeight: '500' },
  strong: { fontSize: 18, fontWeight: '700' },
});
