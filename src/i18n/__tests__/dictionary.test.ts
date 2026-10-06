import { SPECIES_REGISTRY } from '@/data/species';
import type { LocalizedCopy } from '@/domain/types';

import { de } from '../de';
import { en, type TranslationKey } from '../en';
import { formatTurnPhrase, getElapsedSpan } from '../format';
import { resolveActiveLocale, resolveLocale } from '../locale';
import { createTranslator, translate } from '../translate';

function expectLocalized(copy: LocalizedCopy): void {
  expect(copy.en.trim().length).toBeGreaterThan(0);
  expect(copy.de.trim().length).toBeGreaterThan(0);
}

describe('translation dictionaries', () => {
  const englishKeys = Object.keys(en).sort();
  const germanKeys = Object.keys(de).sort();

  it('includes every English key in German and rejects empty copy', () => {
    expect(germanKeys).toEqual(englishKeys);

    for (const key of englishKeys) {
      const translationKey = key as TranslationKey;
      expect(en[translationKey].trim().length).toBeGreaterThan(0);
      expect(de[translationKey].trim().length).toBeGreaterThan(0);
    }
  });

  it('resolves German device languages and falls back to English', () => {
    expect(resolveLocale('en')).toBe('en');
    expect(resolveLocale('en-US')).toBe('en');
    expect(resolveLocale('de')).toBe('de');
    expect(resolveLocale('de-DE')).toBe('de');
    expect(resolveLocale('de-AT')).toBe('de');
    expect(resolveLocale('fr')).toBe('en');
    expect(resolveLocale('fr-FR')).toBe('en');
    expect(resolveLocale(null)).toBe('en');
    expect(resolveLocale(undefined)).toBe('en');
    expect(resolveLocale('')).toBe('en');
  });

  it('lets a saved language override replace the device language immediately', () => {
    expect(resolveActiveLocale('system', 'de-DE')).toBe('de');
    expect(resolveActiveLocale('system', 'fr')).toBe('en');
    expect(resolveActiveLocale('en', 'de')).toBe('en');
    expect(resolveActiveLocale('de', 'en-US')).toBe('de');
  });

  it('interpolates turn status and the clock warning in both locales', () => {
    expect(translate('en', 'turn.swipe')).toBe('Swipe egg to turn');
    expect(translate('en', 'turn.justNow')).toBe('Turned just now');
    expect(translate('en', 'turn.ago', { time: '5 minutes' })).toBe('Turned 5 minutes ago');
    expect(translate('en', 'turn.lockdown')).toBe('Lockdown mode: Turning paused until hatch');
    expect(translate('en', 'clock.paused')).toBe(
      'Biological clock paused: Device time was modified'
    );
    expect(translate('en', 'candling.backToNest')).toBe('Back to Nest');
    expect(translate('en', 'candling.toggleLight')).toBe('Toggle Light');
    expect(translate('en', 'candling.embryoHeartRate')).toBe('Embryo Heart Rate');
    expect(translate('en', 'metric.undetected')).toBe('Undetected');
    expect(translate('en', 'metric.optimal')).toBe('Optimal');

    expect(translate('en', 'hatch.welcome', { nickname: 'Pip' })).toBe('Welcome to the world, Pip!');
    expect(translate('en', 'hatch.cracking')).toBe('The egg is cracking!');
    expect(translate('en', 'hatch.tapToAssist')).toBe('Tap to assist');
    expect(translate('en', 'metric.lifeStage')).toBe('Life Stage');
    expect(translate('en', 'stage.hatchling')).toBe('Hatchling');
    expect(translate('en', 'care.weighedRecently')).toBe('Weighed recently');
    expect(translate('de', 'hatch.welcome', { nickname: 'Pip' })).toBe('Willkommen auf der Welt, Pip!');
    expect(translate('de', 'hatch.help')).toBe('Hilf beim Schlupf');
    expect(translate('de', 'metric.age')).toBe('Alter');
    expect(translate('de', 'metric.ageDay', { day: 3 })).toBe('Tag 3');
    expect(translate('de', 'stage.juvenile')).toBe('Jungtier');
    expect(translate('de', 'turn.ago', { time: '5 Minuten' })).toBe('Vor 5 Minuten gewendet');
    expect(translate('en', 'nav.journal')).toBe('Field Journal');
    expect(translate('de', 'nav.journal')).toBe('Feldtagebuch');
    expect(translate('en', 'journal.completed')).toBe('Completed');
    expect(translate('de', 'journal.completed')).toBe('Abgeschlossen');
    expect(translate('en', 'journal.inProgress')).toBe('In Progress');
    expect(translate('de', 'journal.inProgress')).toBe('In Entwicklung');
    expect(translate('en', 'journal.upcoming')).toBe('Upcoming');
    expect(translate('de', 'journal.upcoming')).toBe('Bevorstehend');
    expect(translate('en', 'journal.scientificObservation')).toBe('Scientific Observation');
    expect(translate('de', 'journal.scientificObservation')).toBe('Wissenschaftliche Beobachtung');
    expect(translate('en', 'journal.candlingReadout')).toBe('Candling Readout');
    expect(translate('de', 'journal.candlingReadout')).toBe('Durchleuchtungs-Befund');
    expect(translate('en', 'journal.replaySound')).toBe('Replay Sound');
    expect(translate('de', 'journal.replaySound')).toBe('Audio abspielen');
    expect(translate('en', 'journal.sizeComparison')).toBe('Size comparison');
    expect(translate('de', 'journal.sizeComparison')).toBe('Größenvergleich');
    expect(translate('en', 'journal.weightLog')).toBe('Weight log');
    expect(translate('de', 'journal.weightLog')).toBe('Gewichtsverlauf');
    expect(de['nav.nest']).toBe(en['nav.nest']);
  });

  it('formats a fresh turn and an older turn without leaving template tokens', () => {
    const t = createTranslator('en');
    const now = 1_700_000_000_000;
    expect(formatTurnPhrase(false, getElapsedSpan(now, now), t)).toBe('Swipe egg to turn');
    expect(formatTurnPhrase(true, getElapsedSpan(now, now + 5_000), t)).toBe('Turned just now');
    expect(formatTurnPhrase(true, getElapsedSpan(now, now + 5 * 60_000), t)).toBe(
      'Turned 5 minutes ago'
    );

    const german = createTranslator('de');
    const phrase = formatTurnPhrase(true, getElapsedSpan(now, now + 2 * 60 * 60_000), german);
    expect(phrase).toBe('Vor 2 Stunden gewendet');
    expect(phrase.includes('{{')).toBe(false);
  });

  it('provides species names, stage titles, and summaries in English and German', () => {
    for (const species of Object.values(SPECIES_REGISTRY)) {
      expectLocalized(species.commonName);
      expect(species.milestones.length).toBeGreaterThan(0);
      for (const milestone of species.milestones) {
        expectLocalized(milestone.title);
        expectLocalized(milestone.scientificSummary);
      }
    }
  });
});