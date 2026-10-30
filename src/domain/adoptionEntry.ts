import type { AdoptionIntent } from './cradleCapacity';

export type ShowcaseActionKey = 'showcase.add' | 'showcase.replace' | 'showcase.begin';

export type AdoptionConfirmKey = 'adoption.addSubmit' | 'adoption.replaceSubmit' | 'showcase.confirmAdopt';

/** Primary dossier button. Matches the visit: begin, add beside an egg, or replace it. */
export function showcaseActionKey(intent: AdoptionIntent): ShowcaseActionKey {
  if (intent === 'add') {
    return 'showcase.add';
  }
  if (intent === 'replace') {
    return 'showcase.replace';
  }
  return 'showcase.begin';
}

/** Naming-sheet confirmation. Same three visits, with the incubation verb. */
export function adoptionConfirmKey(intent: AdoptionIntent): AdoptionConfirmKey {
  if (intent === 'add') {
    return 'adoption.addSubmit';
  }
  if (intent === 'replace') {
    return 'adoption.replaceSubmit';
  }
  return 'showcase.confirmAdopt';
}
