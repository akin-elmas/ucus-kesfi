import { createMMKV } from 'react-native-mmkv';

/** Store'un depodan ihtiyacı olan en küçük yüzey; testte sahte depo enjekte edilir. */
export type KeyValueStorage = {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
};

/**
 * Uygulamanın tek MMKV örneği. Okuma/yazma senkron (JSI üzerinden native).
 * Jest altında kütüphane kendi bellek-içi mock'unu döndürür (lib/isTest).
 */
export const appStorage: KeyValueStorage = createMMKV({ id: 'ucus-kesfi' });
