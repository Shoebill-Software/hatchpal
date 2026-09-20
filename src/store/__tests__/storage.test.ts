import { createMmkvStateStorage } from '@/store/mmkvStateStorage';
import { readStorageItem } from '@/store/storageSanitizer';

describe('Storage sanitization', () => {
  it('returns null for empty, missing, or corrupt payloads', () => {
    expect(readStorageItem(undefined)).toBeNull();
    expect(readStorageItem(null)).toBeNull();
    expect(readStorageItem('')).toBeNull();
    expect(readStorageItem('   ')).toBeNull();
    expect(readStorageItem('{not-json')).toBeNull();
    expect(readStorageItem('[]')).toBe('[]');
    expect(readStorageItem('{"ok":true}')).toBe('{"ok":true}');
  });

  it('adapts an MMKV-like backend to Zustand StateStorage without crashing on junk', () => {
    const values = new Map<string, string>();
    const storage = createMmkvStateStorage({
      getString: (key) => values.get(key),
      set: (key, value) => {
        values.set(key, String(value));
      },
      remove: (key) => {
        values.delete(key);
        return true;
      },
    });

    expect(storage.getItem('missing')).toBeNull();
    values.set('broken', '{');
    expect(storage.getItem('broken')).toBeNull();
    storage.setItem('pets', '{"state":{}}');
    expect(storage.getItem('pets')).toBe('{"state":{}}');
    storage.removeItem('pets');
    expect(storage.getItem('pets')).toBeNull();
  });
});
