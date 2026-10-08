import { createMMKV } from 'react-native-mmkv';
import flightsJson from '../case-kit/flights.json';
import type { FlightDto } from '../src/api/flight.types';
import {
  FAVORITES_STORAGE_KEY,
  WRITE_ERROR_MESSAGE,
  createFavoritesStore,
} from '../src/state/favoritesStore';
import type { KeyValueStorage } from '../src/state/storage';

const flights = flightsJson as FlightDto[];
const byId = (id: string) => {
  const f = flights.find(x => x.id === id);
  if (!f) throw new Error(`fixture yok: ${id}`);
  return f;
};
const FL001 = byId('FL001');
const FL007 = byId('FL007');
const FL024 = byId('FL024');

/** Bellek-içi depo; disk gibi davranır: store'dan bağımsız yaşar. */
function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const storage = {
    getString: jest.fn((key: string) => data.get(key)),
    set: jest.fn((key: string, value: string) => {
      data.set(key, value);
    }),
  } satisfies KeyValueStorage;
  return { storage, data };
}

const stored = (items: FlightDto[]) => JSON.stringify({ version: 1, items });
const ids = (store: ReturnType<typeof createFavoritesStore>) =>
  store.getState().items.map(f => f.id);
const readPayload = (data: Map<string, string>) =>
  JSON.parse(data.get(FAVORITES_STORAGE_KEY) ?? 'null');

describe('favoritesStore — açılışta senkron yükleme', () => {
  it('depoda kayıt varsa items oluşturma anında dolu; oluşturma depoya yazmaz', () => {
    const { storage } = memoryStorage({ [FAVORITES_STORAGE_KEY]: stored([FL001, FL024]) });

    const store = createFavoritesStore(storage);

    expect(store.getState().items).toEqual([FL001, FL024]);
    expect(store.getState().lastWriteError).toBeNull();
    expect(storage.getString).toHaveBeenCalledWith(FAVORITES_STORAGE_KEY);
    expect(storage.set).not.toHaveBeenCalled();
  });

  it('depo boşsa boş liste ile açılır ve yazmaz', () => {
    const { storage } = memoryStorage();
    const store = createFavoritesStore(storage);
    expect(store.getState().items).toEqual([]);
    expect(storage.set).not.toHaveBeenCalled();
  });

  it.each([
    ['bozuk JSON', '{bozuk json'],
    ['items dizi değil', JSON.stringify({ version: 1, items: 'x' })],
    ['null payload', 'null'],
  ])('%s: çökmez, boş liste ile açılır, kaydın üzerine yazmaz', (_l, raw) => {
    const { storage, data } = memoryStorage({ [FAVORITES_STORAGE_KEY]: raw });

    const store = createFavoritesStore(storage);

    expect(store.getState().items).toEqual([]);
    expect(storage.set).not.toHaveBeenCalled();
    expect(data.get(FAVORITES_STORAGE_KEY)).toBe(raw);
  });
});

describe('favoritesStore — ekle / çıkar / yeniden aç', () => {
  it('ekleme doğru payload ile kaydedilir ve yeniden açılışta geri gelir', () => {
    const { storage, data } = memoryStorage();
    const store = createFavoritesStore(storage);

    store.getState().toggle(FL001);
    store.getState().toggle(FL024);

    expect(ids(store)).toEqual(['FL001', 'FL024']);
    expect(storage.set).toHaveBeenCalledTimes(2);
    const [key, value] = storage.set.mock.calls[1];
    expect(key).toBe(FAVORITES_STORAGE_KEY);
    expect(JSON.parse(value)).toEqual({ version: 1, items: [FL001, FL024] });

    // Uygulamayı kapatıp aç: yeni store, aynı depo.
    const reopened = createFavoritesStore(storage);
    expect(reopened.getState().items).toEqual([FL001, FL024]);
    expect(readPayload(data)).toEqual({ version: 1, items: [FL001, FL024] });
  });

  it('toggle ile çıkarılan favori yeniden açılışta gelmez', () => {
    const { storage, data } = memoryStorage();
    const first = createFavoritesStore(storage);
    first.getState().toggle(FL001);
    first.getState().toggle(FL007);

    const second = createFavoritesStore(storage);
    expect(ids(second)).toEqual(['FL001', 'FL007']);

    second.getState().toggle(FL001); // çıkar
    expect(ids(second)).toEqual(['FL007']);
    expect(readPayload(data)).toEqual({ version: 1, items: [FL007] });

    expect(ids(createFavoritesStore(storage))).toEqual(['FL007']);
  });

  it('remove ile son favori çıkarılınca depo boş listeyi tutar ve açılışta boş gelir', () => {
    const { storage, data } = memoryStorage({ [FAVORITES_STORAGE_KEY]: stored([FL024]) });
    const store = createFavoritesStore(storage);

    store.getState().remove('FL024');

    expect(store.getState().items).toEqual([]);
    expect(readPayload(data)).toEqual({ version: 1, items: [] });
    expect(createFavoritesStore(storage).getState().items).toEqual([]);
  });

  it('olmayan bir id için remove depoya yazmaz', () => {
    const { storage } = memoryStorage({ [FAVORITES_STORAGE_KEY]: stored([FL001]) });
    const store = createFavoritesStore(storage);

    store.getState().remove('FL999');

    expect(ids(store)).toEqual(['FL001']);
    expect(storage.set).not.toHaveBeenCalled();
  });
});

describe('favoritesStore — yazma hatası', () => {
  it('set throw ederse state geri alınır ve lastWriteError dolar; sonraki başarılı yazmada temizlenir', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { storage, data } = memoryStorage({ [FAVORITES_STORAGE_KEY]: stored([FL001]) });
    const store = createFavoritesStore(storage);
    storage.set.mockImplementationOnce(() => {
      throw new Error('disk dolu');
    });

    store.getState().toggle(FL007);

    expect(ids(store)).toEqual(['FL001']);
    expect(store.getState().lastWriteError).toBe(WRITE_ERROR_MESSAGE);
    expect(readPayload(data)).toEqual({ version: 1, items: [FL001] });

    // Çıkarma da başarısız olursa çıkarılan geri gelir.
    storage.set.mockImplementationOnce(() => {
      throw new Error('disk dolu');
    });
    store.getState().remove('FL001');
    expect(ids(store)).toEqual(['FL001']);

    store.getState().toggle(FL007);

    expect(ids(store)).toEqual(['FL001', 'FL007']);
    expect(store.getState().lastWriteError).toBeNull();
    expect(readPayload(data)).toEqual({ version: 1, items: [FL001, FL007] });
    warn.mockRestore();
  });
});

describe('favoritesStore — gerçek MMKV (jest mock) ile uçtan uca', () => {
  it('createMMKV örneğine yazar ve aynı örnekten yeniden açılışta okur', () => {
    const mmkv = createMMKV({ id: 'favorites-test' });
    const store = createFavoritesStore(mmkv);
    expect(store.getState().items).toEqual([]);

    store.getState().toggle(FL001);
    store.getState().toggle(FL024);
    store.getState().toggle(FL001);

    expect(JSON.parse(mmkv.getString(FAVORITES_STORAGE_KEY)!)).toEqual({
      version: 1,
      items: [FL024],
    });
    expect(createFavoritesStore(mmkv).getState().items).toEqual([FL024]);
  });
});
