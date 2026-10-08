import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import { toUserMessage } from '../api/client';
import type { FlightDto, FlightSort } from '../api/flight.types';
import { DEFAULT_FILTERS, type FlightFilters } from '../api/flights';
import { FlightCard } from '../components/FlightCard';
import { LoadingView, MessageView } from '../components/StateViews';
import { colors, spacing } from '../components/theme';
import { useFlightList } from '../hooks/useFlightList';
import type { FlightsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<FlightsStackParamList, 'FlightList'>;

const SORT_OPTIONS: { value: FlightSort; label: string; testID: string }[] = [
  { value: 'price', label: 'En düşük fiyat', testID: 'sort-price' },
  { value: 'duration', label: 'En kısa süre', testID: 'sort-duration' },
];

const keyExtractor = (item: FlightDto) => item.id;

export function FlightListScreen({ navigation }: Props) {
  // Ekran stack'te mounted kaldığı için detaydan dönüşte filtre ve sayfalar korunur.
  const [filters, setFilters] = useState<FlightFilters>(DEFAULT_FILTERS);
  const listRef = useRef<FlatList<FlightDto>>(null);
  const {
    flights,
    total,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    isError,
    isFetchNextPageError,
    error,
    loadMore,
    retry,
  } = useFlightList(filters);

  const changeFilters = useCallback((next: FlightFilters) => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    setFilters(next);
  }, []);

  const openDetail = useCallback(
    (id: string) => navigation.navigate('FlightDetail', { id }),
    [navigation],
  );

  const renderItem: ListRenderItem<FlightDto> = useCallback(
    ({ item }) => <FlightCard flight={item} onPress={openDetail} />,
    [openDetail],
  );

  const filtersActive =
    filters.onlyDirect !== DEFAULT_FILTERS.onlyDirect || filters.sort !== DEFAULT_FILTERS.sort;

  let content: ReactNode;
  if (flights.length === 0 && isFetching) {
    content = <LoadingView />;
  } else if (flights.length === 0 && isError) {
    content = (
      <MessageView
        testID="list-error"
        title="Bir sorun oluştu"
        body={toUserMessage(error)}
        actionLabel="Tekrar dene"
        onAction={retry}
      />
    );
  } else if (flights.length === 0) {
    content = filtersActive ? (
      <MessageView
        testID="list-empty"
        title="Uçuş bulunamadı"
        body="Seçili filtreye uyan uçuş yok. Filtreleri temizleyerek tüm uçuşları görebilirsin."
        actionLabel="Filtreleri temizle"
        onAction={() => changeFilters(DEFAULT_FILTERS)}
      />
    ) : (
      <MessageView
        testID="list-empty"
        title="Uçuş bulunamadı"
        body="Bu rotada şu anda listelenecek uçuş yok."
        actionLabel="Tekrar dene"
        onAction={retry}
      />
    );
  } else {
    content = (
      <FlatList
        ref={listRef}
        data={flights}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={Separator}
        ListFooterComponent={
          <ListFooter
            isFetchingNextPage={isFetchingNextPage}
            isFetchNextPageError={isFetchNextPageError}
            hasNextPage={hasNextPage}
            onRetry={retry}
          />
        }
        testID="flight-list"
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        {/* Satırın tamamı dokunulabilir: daha büyük hedef, ekran okuyucuda tek öğe. */}
        <Pressable
          style={styles.switchRow}
          onPress={() => changeFilters({ ...filters, onlyDirect: !filters.onlyDirect })}
          accessibilityRole="switch"
          accessibilityLabel="Yalnızca direkt uçuşlar"
          accessibilityState={{ checked: filters.onlyDirect }}
          testID="filter-only-direct-row"
        >
          <Text style={styles.switchLabel}>
            Yalnızca direkt
          </Text>
          <Switch
            value={filters.onlyDirect}
            onValueChange={onlyDirect => changeFilters({ ...filters, onlyDirect })}
            testID="filter-only-direct"
          />
        </Pressable>

        <View style={styles.segment} accessible={false} accessibilityRole="radiogroup" accessibilityLabel="Sıralama">
          {SORT_OPTIONS.map(opt => {
            const selected = filters.sort === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => {
                  if (!selected) changeFilters({ ...filters, sort: opt.value });
                }}
                accessibilityRole="radio"
                accessibilityLabel={`Sırala: ${opt.label}`}
                accessibilityState={{ checked: selected }}
                testID={opt.testID}
                style={({ pressed }) => [
                  styles.segmentItem,
                  selected && styles.segmentItemSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                  {selected ? '✓ ' : ''}
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {total !== undefined ? (
          <Text style={styles.count} testID="result-count" accessibilityLiveRegion="polite">
            {total} uçuş
          </Text>
        ) : null}
      </View>

      {content}
    </View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

type FooterProps = {
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
  hasNextPage: boolean;
  onRetry: () => void;
};

function ListFooter({ isFetchingNextPage, isFetchNextPageError, hasNextPage, onRetry }: FooterProps) {
  if (isFetchingNextPage) {
    return (
      <View style={styles.footer} accessibilityLabel="Sonraki uçuşlar yükleniyor">
        <ActivityIndicator color={colors.primary} testID="load-more-indicator" />
      </View>
    );
  }
  if (isFetchNextPageError) {
    return (
      <View style={styles.footer}>
        <Text style={styles.footerError}>Sonraki uçuşlar yüklenemedi.</Text>
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Tekrar dene"
          testID="load-more-retry"
          style={({ pressed }) => [styles.footerButton, pressed && styles.pressed]}
        >
          <Text style={styles.footerButtonText}>Tekrar dene</Text>
        </Pressable>
      </View>
    );
  }
  if (!hasNextPage) {
    return (
      <View style={styles.footer}>
        <Text style={styles.footerText}>Tüm uçuşlar listelendi</Text>
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  controls: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  switchLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  segment: { flexDirection: 'row', gap: spacing.sm },
  segmentItem: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  segmentItemSelected: { borderWidth: 2, borderColor: colors.primary, backgroundColor: '#EEF3FF' },
  segmentText: { fontSize: 14, color: colors.muted, fontWeight: '500' },
  segmentTextSelected: { color: colors.primary, fontWeight: '700' },
  pressed: { opacity: 0.7 },
  count: { fontSize: 14, color: colors.muted },
  listContent: { padding: spacing.lg, paddingBottom: spacing.xl },
  separator: { height: spacing.md },
  footer: { paddingVertical: spacing.lg, alignItems: 'center', gap: spacing.sm },
  footerText: { fontSize: 13, color: colors.muted },
  footerError: { fontSize: 14, color: colors.danger },
  footerButton: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  footerButtonText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
});
