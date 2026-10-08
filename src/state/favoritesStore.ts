import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import type { FlightDto } from '../api/flight.types';

/**
 * Favoriler: uçuşun tamamı yerelde saklanır (yalnız id değil).
 * Gerekçe: veri seti sabit, favoriler ekranı ağ olmadan anında açılır ve
 * liste/detay/favoriler aynı kaynaktan okuduğu için işaretler anında tutarlı kalır.
 *
 * Kalıcılık kuralı: depolamaya yazma YALNIZCA hydrate tamamlandıktan sonra ve
 * yalnızca kullanıcı aksiyonuyla olur. Böylece açılışta boş state mevcut kayıtları ezemez.
 */

export const FAVORITES_STORAGE_KEY = 'favorites:v1';

type StoredFavorites = { version: 1; items: FlightDto[] };

type FavoritesState = {
  /** Depolamadan okuma tamamlandı mı? false iken aksiyonlar yok sayılır. */
  hydrated: boolean;
  /** Eklenme sırasına göre, en yeni en sonda. */
  items: FlightDto[];
  hydrate: () => Promise<void>;
  toggle: (flight: FlightDto) => void;
  remove: (id: string) => void;
};

function persist(items: FlightDto[]) {
  const payload: StoredFavorites = { version: 1, items };
  AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(payload)).catch(e => {
    console.warn('Favoriler kaydedilemedi', e);
  });
}

function parseStored(raw: string | null): FlightDto[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Partial<StoredFavorites>;
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

let hydratePromise: Promise<void> | null = null;

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  hydrated: false,
  items: [],

  hydrate: () => {
    // Birden çok çağrı tek okumaya bağlanır.
    hydratePromise ??= AsyncStorage.getItem(FAVORITES_STORAGE_KEY)
      .then(raw => set({ items: parseStored(raw), hydrated: true }))
      .catch(e => {
        // Okuma başarısızsa hydrated=false kalır: yazma da kapalı kalır,
        // böylece diskteki olası kayıtlar boş state ile ezilmez.
        console.warn('Favoriler okunamadı', e);
        hydratePromise = null;
      });
    return hydratePromise;
  },

  toggle: flight => {
    const { hydrated, items } = get();
    if (!hydrated) return;
    const next = items.some(f => f.id === flight.id)
      ? items.filter(f => f.id !== flight.id)
      : [...items, flight];
    set({ items: next });
    persist(next);
  },

  remove: id => {
    const { hydrated, items } = get();
    if (!hydrated || !items.some(f => f.id === id)) return;
    const next = items.filter(f => f.id !== id);
    set({ items: next });
    persist(next);
  },
}));

/** Tek uçuşun favori durumu — yalnızca o değer değişince yeniden render eder. */
export function useIsFavorite(id: string): boolean {
  return useFavoritesStore(s => s.items.some(f => f.id === id));
}

/** Testler için: modül düzeyindeki hydrate kilidini ve state'i sıfırlar. */
export function __resetFavoritesStoreForTests() {
  hydratePromise = null;
  useFavoritesStore.setState({ hydrated: false, items: [] });
}
