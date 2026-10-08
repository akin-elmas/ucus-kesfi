import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FAVORITES_STORAGE_KEY,
  __resetFavoritesStoreForTests,
  useFavoritesStore,
} from '../src/state/favoritesStore';
import flightsJson from '../case-kit/flights.json';
import type { FlightDto } from '../src/api/flight.types';

const flights = flightsJson as FlightDto[];
const byId = (id: string) => {
  const f = flights.find(x => x.id === id);
  if (!f) throw new Error(`fixture yok: ${id}`);
  return f;
};
const FL001 = byId('FL001');
const FL007 = byId('FL007');
const FL024 = byId('FL024');

const store = () => useFavoritesStore.getState();
const ids = () => store().items.map(f => f.id);
const setItemMock = AsyncStorage.setItem as jest.Mock;
const getItemMock = AsyncStorage.getItem as jest.Mock;

/** Fire-and-forget yazmaların depoya ulaşmasını bekler. */
const flush = () => new Promise<void>(resolve => setImmediate(resolve));

/** Uygulamayı tamamen kapatıp yeniden açmayı simüle eder: bellek sıfır, depo kalır. */
async function reopenApp() {
  await flush();
  __resetFavoritesStoreForTests();
  expect(store().items).toEqual([]);
  await store().hydrate();
}

async function readStored(): Promise<unknown> {
  const raw = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
  return raw === null ? null : JSON.parse(raw);
}

beforeEach(async () => {
  await AsyncStorage.clear();
  __resetFavoritesStoreForTests();
  jest.clearAllMocks();
});

describe('favoritesStore — depolamadan geri yükleme', () => {
  it('depoda kayıtlı favoriler hydrate ile geri gelir', async () => {
    await AsyncStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify({ version: 1, items: [FL001, FL024] }),
    );

    await store().hydrate();

    expect(store().hydrated).toBe(true);
    expect(store().loadFailed).toBe(false);
    expect(store().items).toEqual([FL001, FL024]);
  });

  it('depo boşsa hydrate boş liste ile tamamlanır', async () => {
    await store().hydrate();
    expect(store().hydrated).toBe(true);
    expect(store().items).toEqual([]);
  });

  it('bozuk JSON depoda: hydrate çökmez, boş liste ile tamamlanır', async () => {
    await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, '{bozuk json');

    await expect(store().hydrate()).resolves.toBeUndefined();

    expect(store().hydrated).toBe(true);
    expect(store().items).toEqual([]);
  });

  it('beklenmeyen şekil (items dizi değil) de boş listeye düşer', async () => {
    await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify({ version: 1, items: 'x' }));
    await store().hydrate();
    expect(store().items).toEqual([]);
  });
});

describe('favoritesStore — açılışta boş state kayıtları ezmez', () => {
  it('hydrate bitmeden toggle/remove yok sayılır ve setItem hiç çağrılmaz', async () => {
    const saved = JSON.stringify({ version: 1, items: [FL001] });
    await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, saved);
    setItemMock.mockClear();

    // Depo okumasını elle bırakılana kadar beklet.
    let release!: (raw: string | null) => void;
    getItemMock.mockImplementationOnce(
      () => new Promise<string | null>(resolve => (release = resolve)),
    );

    const hydrating = store().hydrate();
    expect(store().hydrated).toBe(false);

    // Kullanıcı açılışta hemen dokunuyor.
    store().toggle(FL007);
    store().toggle(FL001);
    store().remove('FL001');
    await flush();

    expect(store().items).toEqual([]);
    expect(setItemMock).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(FAVORITES_STORAGE_KEY)).toBe(saved);

    release(saved);
    await hydrating;

    // Diskteki kayıt korunmuş ve geri gelmiş olmalı.
    expect(store().hydrated).toBe(true);
    expect(store().items).toEqual([FL001]);
    expect(setItemMock).not.toHaveBeenCalled();
  });

  it('hydrate okuma hatası verirse yazma kapalı kalır', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    getItemMock.mockImplementationOnce(() => Promise.reject(new Error('disk')));

    await store().hydrate();
    store().toggle(FL001);
    await flush();

    expect(store().hydrated).toBe(false);
    expect(store().loadFailed).toBe(true);
    expect(store().items).toEqual([]);
    expect(setItemMock).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('okuma hatasından sonra tekrar hydrate başarılı olursa loadFailed temizlenir', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify({ version: 1, items: [FL007] }));
    getItemMock.mockImplementationOnce(() => Promise.reject(new Error('disk')));

    await store().hydrate();
    expect(store().loadFailed).toBe(true);

    await store().hydrate();
    expect(store().loadFailed).toBe(false);
    expect(store().hydrated).toBe(true);
    expect(ids()).toEqual(['FL007']);
    warn.mockRestore();
  });

  it('eşzamanlı hydrate çağrıları tek okumaya bağlanır', async () => {
    await Promise.all([store().hydrate(), store().hydrate()]);
    expect(getItemMock).toHaveBeenCalledTimes(1);
  });
});

describe('favoritesStore — ekle / çıkar / yeniden aç', () => {
  it('ekleme doğru payload ile kaydedilir ve yeniden açılışta geri gelir', async () => {
    await store().hydrate();

    store().toggle(FL001);
    store().toggle(FL024);

    expect(ids()).toEqual(['FL001', 'FL024']);
    expect(setItemMock).toHaveBeenCalledTimes(2);
    const [key, value] = setItemMock.mock.calls[1];
    expect(key).toBe(FAVORITES_STORAGE_KEY);
    expect(JSON.parse(value)).toEqual({ version: 1, items: [FL001, FL024] });

    await reopenApp();

    expect(store().hydrated).toBe(true);
    expect(store().items).toEqual([FL001, FL024]);
  });

  it('toggle ile çıkarılan favori yeniden açılışta gelmez', async () => {
    await store().hydrate();
    store().toggle(FL001);
    store().toggle(FL007);
    await reopenApp();
    expect(ids()).toEqual(['FL001', 'FL007']);

    store().toggle(FL001); // çıkar

    expect(ids()).toEqual(['FL007']);
    await flush();
    expect(await readStored()).toEqual({ version: 1, items: [FL007] });

    await reopenApp();
    expect(ids()).toEqual(['FL007']);
  });

  it('remove ile son favori çıkarılınca depo boş listeyi tutar ve açılışta boş gelir', async () => {
    await store().hydrate();
    store().toggle(FL024);
    await reopenApp();
    expect(ids()).toEqual(['FL024']);

    store().remove('FL024');
    await flush();
    expect(await readStored()).toEqual({ version: 1, items: [] });

    await reopenApp();
    expect(store().items).toEqual([]);
  });

  it('olmayan bir id için remove depoya yazmaz', async () => {
    await store().hydrate();
    store().toggle(FL001);
    setItemMock.mockClear();

    store().remove('FL999');

    expect(ids()).toEqual(['FL001']);
    expect(setItemMock).not.toHaveBeenCalled();
  });
});
