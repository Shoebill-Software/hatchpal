import type { Temperament } from './types';

const TEMPERAMENTS: readonly Temperament[] = ['sunny', 'dewy', 'songful', 'curious', 'easygoing'];

export interface ArchiveCareSource {
  temperament?: unknown;
  hearts?: unknown;
}

export interface VisibleArchiveCare {
  temperament: Temperament | null;
  /** Granted wishes worth showing. Zero and missing counts stay off the card. */
  hearts: number;
}

/**
 * What an archive card should badge. Legacy specimens archived before care
 * was recorded, and saves with a bad temperament, render with neither chip.
 */
export function visibleArchiveCare(source: ArchiveCareSource | null | undefined): VisibleArchiveCare {
  const temperament = TEMPERAMENTS.find((entry) => entry === source?.temperament) ?? null;
  const raw = source?.hearts;
  const hearts =
    typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? Math.min(999, Math.floor(raw)) : 0;
  return { temperament, hearts };
}
