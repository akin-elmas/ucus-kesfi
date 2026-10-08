import { Pressable, StyleSheet, Text } from 'react-native';
import type { FlightDto } from '../api/flight.types';
import { useFavoritesStore, useIsFavorite } from '../state/favoritesStore';
import { colors, spacing } from './theme';

type Props = { flight: FlightDto; size?: 'sm' | 'lg' };

/**
 * Favori aç/kapa. Durum yalnız renkle değil, şekil (★/☆) + metin + erişilebilirlik
 * state'i ile aktarılır. Karta gömülü olsa da kendi Pressable'ı olduğu için
 * dokunuş kartın navigasyonunu tetiklemez.
 */
export function FavoriteButton({ flight, size = 'sm' }: Props) {
  const isFavorite = useIsFavorite(flight.id);
  const toggle = useFavoritesStore(s => s.toggle);
  const label = isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle';

  return (
    <Pressable
      onPress={() => toggle(flight)}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${flight.airline} ${flight.flightNumber}`}
      accessibilityState={{ selected: isFavorite }}
      testID={`favorite-${flight.id}`}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' && styles.lg,
        isFavorite && styles.active,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.icon, isFavorite && styles.activeText]}>{isFavorite ? '★' : '☆'}</Text>
      <Text style={[styles.text, isFavorite && styles.activeText]}>
        {size === 'lg' ? label : isFavorite ? 'Favoride' : 'Favori'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 32,
  },
  lg: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, minHeight: 44, alignSelf: 'flex-start' },
  active: { borderColor: colors.favorite, backgroundColor: '#FFF4EE' },
  pressed: { opacity: 0.6 },
  icon: { fontSize: 16, color: colors.muted },
  text: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  activeText: { color: colors.favorite },
});
