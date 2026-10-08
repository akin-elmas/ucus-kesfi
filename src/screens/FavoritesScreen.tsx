import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { FlightCard } from '../components/FlightCard';
import { MessageView } from '../components/StateViews';
import { colors, spacing } from '../components/theme';
import type { FavoritesStackParamList, RootTabParamList } from '../navigation/types';
import { useFavoritesStore } from '../state/favoritesStore';

type Props = NativeStackScreenProps<FavoritesStackParamList, 'FavoriteList'>;

export function FavoritesScreen({ navigation }: Props) {
  const items = useFavoritesStore(s => s.items);
  const lastWriteError = useFavoritesStore(s => s.lastWriteError);

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

  const writeError = lastWriteError ? (
    <Text style={styles.writeError} accessibilityRole="alert" testID="favorites-write-error">
      {lastWriteError}
    </Text>
  ) : null;

  if (sorted.length === 0) {
    return (
      <View style={styles.screen}>
        {writeError}
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
    <View style={styles.screen}>
      {writeError}
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  count: { fontSize: 15, fontWeight: '600', color: colors.muted },
  writeError: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, fontSize: 13, color: colors.danger },
});
