import { createMMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';
import { createMmkvStateStorage } from './mmkvStateStorage';

const PET_MMKV_ID = 'hatchpal.pets';
const PREFERENCES_MMKV_ID = 'hatchpal.preferences';

let petMmkv: ReturnType<typeof createMMKV> | undefined;
let preferencesMmkv: ReturnType<typeof createMMKV> | undefined;

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

export function getPreferencesMmkv(): ReturnType<typeof createMMKV> {
  if (!preferencesMmkv) {
    preferencesMmkv = createMMKV({ id: PREFERENCES_MMKV_ID });
  }
  return preferencesMmkv;
}

export const preferencesMmkvStateStorage: StateStorage = createMmkvStateStorage({
  getString: (key) => getPreferencesMmkv().getString(key),
  set: (key, value) => {
    getPreferencesMmkv().set(key, value);
  },
  remove: (key) => getPreferencesMmkv().remove(key),
});

export { createMmkvStateStorage } from './mmkvStateStorage';
export { readStorageItem } from './storageSanitizer';
