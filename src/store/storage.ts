import { createMMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';
import { createMmkvStateStorage } from './mmkvStateStorage';

const PET_MMKV_ID = 'hatchpal.pets';

let petMmkv: ReturnType<typeof createMMKV> | undefined;

export function getPetMmkv(): ReturnType<typeof createMMKV> {
  if (!petMmkv) {
    petMmkv = createMMKV({ id: PET_MMKV_ID });
  }
  return petMmkv;
}

export const mmkvStateStorage: StateStorage = createMmkvStateStorage({
  getString: (key) => getPetMmkv().getString(key),
  set: (key, value) => {
    getPetMmkv().set(key, value);
  },
  remove: (key) => getPetMmkv().remove(key),
});

export { createMmkvStateStorage } from './mmkvStateStorage';
export { readStorageItem } from './storageSanitizer';
