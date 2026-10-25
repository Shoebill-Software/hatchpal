/** Free nests hold one egg. The Sanctuary Pass opens three concurrent cradles. */
export const FREE_CRADLE_LIMIT = 1;
export const SANCTUARY_CRADLE_LIMIT = 3;

let readIsPro: () => boolean = () => false;

/** The purchases store registers this so incubation limits follow the cached entitlement. */
export function registerProReader(reader: () => boolean): void {
  readIsPro = reader;
}

export function readMaxCradleCount(): number {
  return readIsPro() ? SANCTUARY_CRADLE_LIMIT : FREE_CRADLE_LIMIT;
}
