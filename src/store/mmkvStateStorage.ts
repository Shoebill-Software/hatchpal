import type { MMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';
import { readStorageItem } from './storageSanitizer';

export function createMmkvStateStorage(
  mmkv: Pick<MMKV, 'getString' | 'set' | 'remove'>
): StateStorage {
  return {
    getItem: (name: string): string | null => readStorageItem(mmkv.getString(name)),
    setItem: (name: string, value: string): void => {
      mmkv.set(name, value);
    },
    removeItem: (name: string): void => {
      mmkv.remove(name);
    },
  };
}
