export function readStorageItem(value: string | undefined | null): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  try {
    JSON.parse(trimmed);
    return trimmed;
  } catch {
    return null;
  }
}
