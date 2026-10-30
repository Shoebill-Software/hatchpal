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
    expect(translate('journal.closedProgress')).toBe('Development on this record has stopped.');
    expect(translate('journal.notReached')).toBe('Not reached');
    expect(translate('sanctuary.nestCold')).toBe('Gone cold');
    expect(translate('sanctuary.temperament', { temperament: 'Songful' })).toBe('Songful temperament');
    expect(translate('sanctuary.hearts', { count: 4 })).toBe('♥ 4');
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
    expect(translate('tutorial.mist.dryNest')).toContain('dry nest');
    expect(translate('care.wishGranted', { hearts: 3 })).toBe('Wish granted! ♥ 3');
    expect(translate('care.brood.perfect', { temp: '37.5' })).toBe('Perfect brood! Right on 37.5°.');
    expect(translate('care.brood.cozy')).toContain('perfect brood');
    expect(translate('care.brood.toasty')).toContain('cools off');
    expect(translate('care.brood.chilly')).toContain('chilly');
    expect(translate('care.mist.perfect', { humidity: '55' })).toBe('Dewy perfection! Right on 55%.');
    expect(translate('care.mist.dewy')).toBe('Nicely dewy.');
    expect(translate('care.mist.soggy')).toContain('soggy');
    expect(translate('care.mist.dry')).toContain('spritzes');
    expect(translate('care.lullaby')).toContain('lullaby');
    expect(translate('weather.mild')).toBe('Mild day');
    expect(translate('weather.cold_snap')).toBe('Cold snap');
    expect(translate('weather.balmy')).toBe('Balmy');
    expect(translate('weather.dry_spell')).toBe('Dry spell');
    expect(translate('weather.muggy')).toBe('Muggy');
    expect(translate('weather.effect.cold_snap')).toBe('Heat fades faster');
    expect(translate('weather.effect.dry_spell')).toBe('Mist dries faster');
    expect(translate('weather.a11y', { weather: 'Cold snap', effect: 'Heat fades faster' })).toBe(
      "Today's nest weather: Cold snap. Heat fades faster."
    );
    expect(translate('hearts.a11y', { count: 2 })).toBe('2 hearts from granted wishes');
    expect(translate('wish.perfect_brood', { temp: '37.5' })).toBe('Brood me to exactly 37.5°?');
    expect(translate('wish.perfect_mist', { humidity: 60 })).toBe('A perfect mist to 60%, please!');
    expect(translate('wish.lullaby')).toBe('Sing to me! Tap my shell 3 times.');
    expect(translate('wish.peek')).toContain('candle');
    expect(translate('wish.sweet_spot')).toContain('green');
    expect(translate('wish.hoursCompact', { count: 6 })).toBe('6h');
    expect(translate('wish.minutesCompact', { count: 12 })).toBe('12m');
    expect(translate('wish.a11y', { wish: 'Sing to me!', time: '6 hours' })).toBe(
      'Your egg wishes: Sing to me! 6 hours left.'
    );
    expect(translate('nest.eggGestureHint')).toContain('lullaby');
    expect(translate('nest.emptyEyebrow')).toBe('Open cradle');
    expect(translate('nest.emptyTitle')).toBe('The Cradle is Waiting');
    expect(translate('nest.cradleLabel')).toBe('Waiting cradle');
    expect(translate('adoption.addBody')).toContain('next cradle');
    expect(translate('showcase.add')).toBe('Add This Egg');
    expect(translate('alert.subtitle', { name: 'Pip', day: 19 })).toBe('Pip · Day 19');
    expect(translate('alert.cue.still')).toBe('Keep the nest still and warm.');
    expect(translate('widget.ready')).toBe('Ready to hatch');
    expect(translate('widget.hatched')).toBe('Has emerged');
    expect(translate('widget.emptyBody')).toBe('Choose an egg to nurture.');
    expect(translate('widget.clockPaused')).toBe('Biological clock paused');
    expect(translate('widget.temper.chilly')).toBe('A shiver');
    expect(translate('widget.temper.strike')).toBe('On strike');
    expect(translate('widget.wish.lullaby')).toBe('Sing to me');
    expect(translate('widget.wish.peek')).toBe('Candle me');
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
