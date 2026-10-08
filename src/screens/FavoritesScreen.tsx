import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { FlightCard } from '../components/FlightCard';
import { LoadingView, MessageView } from '../components/StateViews';
import { colors, spacing } from '../components/theme';
import type { FavoritesStackParamList, RootTabParamList } from '../navigation/types';
import { useFavoritesStore } from '../state/favoritesStore';

type Props = NativeStackScreenProps<FavoritesStackParamList, 'FavoriteList'>;

export function FavoritesScreen({ navigation }: Props) {
  const hydrated = useFavoritesStore(s => s.hydrated);
  const items = useFavoritesStore(s => s.items);
  const loadFailed = useFavoritesStore(s => s.loadFailed);
  const hydrate = useFavoritesStore(s => s.hydrate);

  // Store eklenme sırasını tutar; ekranda kalkış saatine göre artan gösteriyoruz
  // (aynı gün, aynı rota — kullanıcı için en doğal sıra). ISO + aynı ofset olduğu için
  // Date.parse ile karşılaştırma güvenli; eşitlikte id ile sabit sıra.
  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) => Date.parse(a.departureAt) - Date.parse(b.departureAt) || a.id.localeCompare(b.id),
      ),
    [items],
  );

  const openDetail = useCallback(
    (id: string) => navigation.navigate('FlightDetail', { id }),
    [navigation],
  );

  if (!hydrated && loadFailed) {
    return (
      <View style={styles.screen}>
        <MessageView
          title="Favoriler okunamadı"
          body="Kayıtlı favorilerin silinmedi; tekrar denemek ister misin?"
          actionLabel="Tekrar dene"
          onAction={hydrate}
          testID="favorites-load-error"
        />
      </View>
    );
  }

  if (!hydrated) {
    return (
      <View style={styles.screen}>
        <LoadingView label="Favoriler yükleniyor…" />
      </View>
    );
  }

  if (sorted.length === 0) {
    return (
      <View style={styles.screen}>
        <MessageView
          title="Henüz favori uçuş yok"
          body="Listedeki ☆ ile uçuş kaydedebilirsin."
          actionLabel="Uçuşlara göz at"
          onAction={() =>
            navigation
              .getParent<BottomTabNavigationProp<RootTabParamList>>()
              ?.navigate('FlightsTab', { screen: 'FlightList' })
          }
          testID="favorites-empty"
        />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      data={sorted}
      keyExtractor={f => f.id}
      renderItem={({ item }) => <FlightCard flight={item} onPress={openDetail} />}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <Text style={styles.count} accessibilityRole="header" testID="favorites-count">
          {sorted.length} favori uçuş
        </Text>
      }
      testID="favorites-list"
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  count: { fontSize: 15, fontWeight: '600', color: colors.muted },
});
