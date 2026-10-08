import { create } from 'zustand';
import type { FlightDto } from '../api/flight.types';
import { appStorage, type KeyValueStorage } from './storage';

/**
 * Favoriler: uçuşun tamamı yerelde saklanır (yalnız id değil).
 * Gerekçe: veri seti sabit, favoriler ekranı ağ olmadan anında açılır ve
 * liste/detay/favoriler aynı kaynaktan okuduğu için işaretler anında tutarlı kalır.
 *
 * Neden MMKV: okuma senkron. Store ilk state'ini oluşturulurken diskten okur;
 * "henüz yüklenmedi" diye bir ara durum yok, dolayısıyla boş state'in diskteki
 * kayıtları ezebileceği bir pencere de yok. Oluşturma sırasında depoya yazılmaz;
 * yazma yalnızca kullanıcı aksiyonuyla (toggle/remove) olur.
 */

export const FAVORITES_STORAGE_KEY = 'favorites:v1';
export const WRITE_ERROR_MESSAGE = 'Favori kaydedilemedi. Tekrar dene.';

type StoredFavorites = { version: 1; items: FlightDto[] };

export type FavoritesState = {
  /** Eklenme sırasına göre, en yeni en sonda. */
  items: FlightDto[];
  /** Son yazma başarısızsa kullanıcıya gösterilecek mesaj; başarılı yazmada null. */
  lastWriteError: string | null;
  toggle: (flight: FlightDto) => void;
  remove: (id: string) => void;
};

/** Bozuk/eksik kayıt boş listeye düşer; çökmez. */
function parseStored(raw: string | undefined): FlightDto[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Partial<StoredFavorites> | null;
    return Array.isArray(parsed?.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

export function createFavoritesStore(storage: KeyValueStorage) {
  return create<FavoritesState>((set, get) => {
    /** Önce state'i günceller, sonra yazar; yazma patlarsa önceki listeye döner. */
    function commit(next: FlightDto[]) {
      const prev = get().items;
      set({ items: next });
      try {
        const payload: StoredFavorites = { version: 1, items: next };
        storage.set(FAVORITES_STORAGE_KEY, JSON.stringify(payload));
        set({ lastWriteError: null });
      } catch (e) {
        console.warn('Favoriler kaydedilemedi', e);
        set({ items: prev, lastWriteError: WRITE_ERROR_MESSAGE });
      }
    }

    return {
      items: parseStored(storage.getString(FAVORITES_STORAGE_KEY)),
      lastWriteError: null,

      toggle: flight => {
        const { items } = get();
        commit(
          items.some(f => f.id === flight.id)
            ? items.filter(f => f.id !== flight.id)
            : [...items, flight],
        );
      },

      remove: id => {
        const { items } = get();
        if (!items.some(f => f.id === id)) return;
        commit(items.filter(f => f.id !== id));
      },
    };
  });
}

export const useFavoritesStore = createFavoritesStore(appStorage);

/** Tek uçuşun favori durumu — yalnızca o değer değişince yeniden render eder. */
export function useIsFavorite(id: string): boolean {
  return useFavoritesStore(s => s.items.some(f => f.id === id));
}
