import { createMMKV } from 'react-native-mmkv';

export type KeyValueStorage = {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
};

export const appStorage: KeyValueStorage = createMMKV({ id: 'ucus-kesfi' });
