import { create } from 'zustand';
import type { FlightDto } from '../api/flight.types';
import { appStorage, type KeyValueStorage } from './storage';

export const FAVORITES_STORAGE_KEY = 'favorites:v1';
export const WRITE_ERROR_MESSAGE = 'Favori kaydedilemedi. Tekrar dene.';

type StoredFavorites = { version: 1; items: FlightDto[] };

export type FavoritesState = {
  items: FlightDto[];
  lastWriteError: string | null;
  toggle: (flight: FlightDto) => void;
  remove: (id: string) => void;
};

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
    function commit(next: FlightDto[]) {
      try {
        const payload: StoredFavorites = { version: 1, items: next };
        storage.set(FAVORITES_STORAGE_KEY, JSON.stringify(payload));
        set({ items: next, lastWriteError: null });
      } catch (e) {
        console.warn('Favoriler kaydedilemedi', e);
        set({ lastWriteError: WRITE_ERROR_MESSAGE });
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

export function useIsFavorite(id: string): boolean {
  return useFavoritesStore(s => s.items.some(f => f.id === id));
}
