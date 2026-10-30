import { SPECIES_REGISTRY } from '@/data/species';

import { en, type TranslationKey } from '../en';
import { formatAgo, getElapsedSpan } from '../format';
import { APP_LOCALE } from '../locale';
import { createTranslator, translate } from '../translate';

describe('English dictionary', () => {
  it('locks the app locale to English and rejects empty copy', () => {
    expect(APP_LOCALE).toBe('en');
    const keys = Object.keys(en) as TranslationKey[];
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(en[key].trim().length).toBeGreaterThan(0);
    }
  });

  it('interpolates climate status, clock warnings, and journal labels in English', () => {
    expect(translate('climate.optimal')).toBe('Optimal');
    expect(translate('climate.tooCold')).toBe('Too Cold');
    expect(translate('climate.dry')).toBe('Dry');
    expect(translate('climate.sweetSpot', { low: '36.5', high: '38.5' })).toBe('Sweet spot 36.5–38.5');
    expect(translate('climate.thriving')).toBe('Thriving');
    expect(translate('nest.warmNest')).toBe('Warm Nest');
    expect(translate('nest.mistNest')).toBe('Mist Substrate');
    expect(translate('clock.paused')).toBe('Biological clock paused: Device time was modified');
    expect(translate('candling.backToNest')).toBe('Back to Nest');
    expect(translate('candling.alwaysOnHint')).toContain('backlight stays on');
    expect(translate('candling.stage.vascular')).toBe('Vascular spider');
    expect(translate('candling.embryoHeartRate')).toBe('Embryo Heart Rate');
    expect(translate('metric.undetected')).toBe('Undetected');
    expect(translate('metric.optimal')).toBe('Optimal');
    expect(translate('hatch.welcome', { nickname: 'Pip' })).toBe('Welcome to the world, Pip!');
    expect(translate('hatch.cracking')).toBe('The egg is cracking!');
    expect(translate('hatch.tapToAssist')).toBe('Tap to assist');
    expect(translate('metric.lifeStage')).toBe('Life Stage');
    expect(translate('stage.hatchling')).toBe('Hatchling');
    expect(translate('nest.unviableBody')).toBe(
      'The embryo did not survive the prolonged climate drop.'
    );
    expect(translate('sanctuary.title')).toBe('Sanctuary');
    expect(translate('nav.journal')).toBe('Field Journal');
    expect(translate('journal.completed')).toBe('Completed');
    expect(translate('journal.inProgress')).toBe('In Progress');
    expect(translate('journal.upcoming')).toBe('Upcoming');
    expect(translate('journal.scientificObservation')).toBe('Scientific Observation');
    expect(translate('journal.candlingReadout')).toBe('Candling Readout');
    expect(translate('journal.replaySound')).toBe('Replay Sound');
    expect(translate('journal.subtitle')).toBe('A record of this nest, written as it happens.');
    expect(translate('journal.shellChapter')).toBe('In the shell');
    expect(translate('journal.growthChapter')).toBe('After emergence');
    expect(translate('journal.adoptedLabel')).toBe('Adopted');
    expect(translate('journal.weightLog')).toBe('Weight log');
    expect(translate('journal.beforeHatchWeight')).toBe('Mass is logged from emergence.');
    expect(translate('climate.driftWarmth', { temp: '37.5' })).toBe('Settles near 37.5°.');
    expect(translate('climate.strike', { temp: '37.5', humidity: '55' })).toContain('37.5°');
    expect(translate('climate.strike', { temp: '37.5', humidity: '55' })).toContain('Twelve more hours');
    expect(translate('tutorial.stakes.body')).toContain('full day');
    expect(translate('tutorial.stakes.body')).toContain('Twelve hours');
    expect(translate('keeper.first_hatch.progress', { current: 0, goal: 1 })).toBe('Hatches 0 of 1');
    expect(translate('settings.appearance.light')).toBe('Light');
    expect(translate('settings.appearance.dark')).toBe('Dark');
    expect(translate('metric.ageDay', { day: 3 })).toBe('Day 3');
    expect(translate('tutorial.step', { current: 2, total: 5 })).toBe('Step 2 of 5');
    expect(translate('tutorial.heart.body')).toContain('Day 3');
    expect(translate('tutorial.heart.body')).toContain('None');
    expect(translate('tutorial.hello.title', { name: 'Pebble' })).toBe('Meet Pebble!');
    expect(translate('care.wishGranted', { hearts: 3 })).toBe('Wish granted! ♥ 3');
    expect(translate('alert.subtitle', { name: 'Pip', day: 19 })).toBe('Pip · Day 19');
    expect(translate('alert.cue.still')).toBe('Keep the nest still and warm.');
    expect(translate('widget.ready')).toBe('Ready to hatch');
    expect(translate('widget.wish.lullaby')).toBe('Wants a lullaby');
    expect(translate('widget.clutch', { index: 2, count: 3 })).toBe('Nest 2 of 3');
  });

  it('formats a fresh mist and an older mist without leaving template tokens', () => {
    const t = createTranslator();
    const now = 1_700_000_000_000;
    expect(formatAgo(getElapsedSpan(now, now), t)).toBe('just now');
    expect(formatAgo(getElapsedSpan(now, now + 5 * 60_000), t)).toBe('5 minutes ago');
    const phrase = formatAgo(getElapsedSpan(now, now + 2 * 60 * 60_000), t);
    expect(phrase).toBe('2 hours ago');
    expect(phrase.includes('{{')).toBe(false);
    expect(translate('nest.lastMist', { time: phrase })).toBe('Last mist 2 hours ago');
  });

  it('provides species names, stage titles, and summaries as English strings', () => {
    for (const species of Object.values(SPECIES_REGISTRY)) {
      expect(species.commonName.trim().length).toBeGreaterThan(0);
      expect(species.milestones.length).toBeGreaterThan(0);
      for (const milestone of species.milestones) {
        expect(milestone.title.trim().length).toBeGreaterThan(0);
        expect(milestone.scientificSummary.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
