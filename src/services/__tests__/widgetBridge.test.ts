import { silkieChickenConfig } from '@/data/species/chicken';
import { emuConfig } from '@/data/species/emu';
import { emptyCareLog } from '@/domain/nestCare';
import { createPetInstance } from '@/domain/petIntegrity';
import type { PetInstance } from '@/domain/types';
import { translate } from '@/i18n';

import {
  APP_GROUP_ID,
  LEGACY_WIDGET_KEYS,
  WIDGET_PAYLOAD_KEY,
  buildWidgetPayload,
  clutchContext,
  emptyWidgetPayload,
  formatIncubationDay,
  publishWidgetForPet,
  widgetFrameEpochs,
  widgetSyncReason,
  type WidgetDefaultsClient,
  type WidgetPayload,
  type WidgetWatchState,
} from '../widgetBridge';

const dayMs = 86_400_000;
const hourMs = 60 * 60 * 1000;
const baseEpoch = 1_700_000_000_000;

function petAt(nowEpoch: number, patch: Partial<PetInstance> = {}): PetInstance {
  return {
    ...createPetInstance({
      id: 'pet-1',
      speciesId: 'silkie_chicken',
      nickname: 'Pip',
      nowEpoch: baseEpoch,
    }),
    ...patch,
  };
}

function watch(pet: WidgetWatchState['activePet'], hasHydrated = true, extra: Partial<WidgetWatchState> = {}): WidgetWatchState {
  return { hasHydrated, activePet: pet, ...extra };
}

function stamp(pet: PetInstance): NonNullable<WidgetWatchState['activePet']> {
  return {
    id: pet.id,
    isHatched: pet.isHatched,
    lastWarmedEpoch: pet.lastWarmedEpoch,
    lastMistedEpoch: pet.lastMistedEpoch,
    nickname: pet.nickname,
    status: pet.status,
    care: pet.care,
  };
}

function memoryClient(): WidgetDefaultsClient & { snapshot: () => { value: string | null; reloads: number } } {
  let value: string | null = null;
  let reloads = 0;
  return {
    set(_key, next) {
      value = next;
    },
    remove() {
      value = null;
    },
    reloadAllTimelines() {
      reloads += 1;
    },
    snapshot: () => ({ value, reloads }),
  };
}

describe('Widget bridge', () => {
  it('formats the incubation day inside the species window', () => {
    expect(formatIncubationDay(8, 21)).toBe('Day 8 of 21');
    expect(formatIncubationDay(0, 21)).toBe('Day 0 of 21');
    expect(formatIncubationDay(40, 21)).toBe('Day 21 of 21');
  });

  it('samples wish windows and the next incubation day inside the horizon', () => {
    const now = baseEpoch + 20 * hourMs;
    const epochs = widgetFrameEpochs(baseEpoch, now);
    expect(epochs[0]).toBe(now);
    expect(epochs).toContain(baseEpoch + dayMs);
    expect(epochs).toContain(baseEpoch + 24 * hourMs);
    expect(epochs.every((epoch, index) => index === 0 || epoch > epochs[index - 1]!)).toBe(true);
    expect(epochs[epochs.length - 1]).toBeLessThanOrEqual(now + 18 * hourMs);
  });

  it('names a second cradle only when the nest holds more than one egg', () => {
    expect(clutchContext({ cradleOrder: ['a'], activePetIndex: 0 })).toBeNull();
    expect(clutchContext({ cradleOrder: ['a', 'b'], activePetIndex: 1 })).toEqual({ index: 1, count: 2 });
  });

  it('paints a fresh egg in the sweet spot, with its shell, weather, and first wish', () => {
    const payload = buildWidgetPayload(petAt(baseEpoch), baseEpoch);
    const frame = payload?.frames[0];
    expect(payload?.phase).toBe('incubating');
    expect(payload?.nickname).toBe('Pip');
    expect(payload?.commonName).toBe('Silkie Chicken');
    expect(payload?.shell).toEqual({
      shape: 'oval',
      speckle: 'fine',
      body: '#F3E4B8',
      stroke: '#D7C28A',
      highlight: '#FFF8E6',
      speckleColor: '#C4A66A',
      shadow: '#3A2A1C',
      crack: '#5C4030',
    });
    expect(frame).toMatchObject({
      atEpoch: baseEpoch,
      phase: 'incubating',
      headline: 'Day 0 of 21',
      detail: `${translate('weather.mild')} · ${translate('weather.effect.mild')}`,
      warmthLabel: translate('climate.optimal'),
      warmthOptimal: true,
      humidityLabel: translate('climate.optimal'),
      humidityOptimal: true,
      inSweetSpot: true,
      onStrike: false,
      pipped: false,
      temperatureText: '37.5°',
      humidityText: '55%',
      footer: `${translate('widget.wish.lullaby')} · ${translate('wish.hoursCompact', { count: 6 })}`,
    });
    expect(payload?.frames.length).toBeGreaterThan(8);
    expect(payload?.frames.some((entry) => entry.warmthLabel === translate('climate.tooCold'))).toBe(true);
    expect(payload?.frames.some((entry) => entry.atEpoch === baseEpoch + 6 * hourMs)).toBe(true);
    expect(payload?.frames.every((entry) => entry.phase !== 'unviable')).toBe(true);
    expect(frame?.accessibilityLabel).toContain('Pip');
    expect(frame?.accessibilityLabel).toContain('Warmth 37.5°');
  });

  it('lets a tended nest cool on the home screen before the embryo is lost', () => {
    const now = baseEpoch + 10 * hourMs;
    const payload = buildWidgetPayload(petAt(baseEpoch), now);
    const frame = payload?.frames[0];
    expect(frame?.phase).toBe('incubating');
    expect(frame?.warmthOptimal).toBe(false);
    expect(frame?.warmthLabel).toBe(translate('climate.tooCold'));
    expect(frame?.headline).toBe('Day 0 of 21');
    const later = payload?.frames[payload.frames.length - 1];
    expect(later && frame && later.atEpoch > frame.atEpoch).toBe(true);
    expect(Number.parseFloat(later?.temperatureText ?? '0')).toBeLessThan(
      Number.parseFloat(frame?.temperatureText ?? '0')
    );
  });

  it('tells the truth when neglect has already ended the incubation', () => {
    const now = baseEpoch + 8 * dayMs;
    const payload = buildWidgetPayload(
      petAt(baseEpoch, { care: { ...emptyCareLog(), hearts: 4 } }),
      now
    );
    expect(payload?.phase).toBe('unviable');
    expect(payload?.hearts).toBe(4);
    expect(payload?.frames).toHaveLength(1);
    expect(payload?.frames[0]).toMatchObject({
      phase: 'unviable',
      headline: translate('sanctuary.nestCold'),
      detail: translate('nest.unviableBody'),
      footer: null,
    });
    expect(payload?.frames[0]?.progressPct).toBeLessThan(8 / 21);
    expect(payload?.frames[0]?.progressPct).toBeGreaterThan(0);
    const later = buildWidgetPayload(petAt(baseEpoch), now + 5 * dayMs);
    expect(later?.frames[0]?.progressPct).toBe(payload?.frames[0]?.progressPct);
    expect(payload?.incubationDayDisplay).toBe(translate('sanctuary.nestCold'));
    expect(payload?.isReadyToHatch).toBe(false);
    expect(payload?.unviableTitle).toBe(translate('nest.unviableTitle'));
    expect(payload?.frames[0]?.accessibilityLabel).toContain(translate('nest.unviableTitle'));
  });

  it('shows a strike now and freezes progress once the embryo is lost', () => {
    const now = baseEpoch + 36 * hourMs;
    const payload = buildWidgetPayload(petAt(baseEpoch), now);
    expect(payload?.phase).toBe('incubating');
    expect(payload?.frames[0]?.footer).toContain(translate('widget.temper.strike'));
    expect(payload?.frames.filter((frame) => frame.phase === 'unviable')).toHaveLength(1);
    expect(payload?.frames.at(-1)?.phase).toBe('unviable');
    const frozen = payload?.frames.at(-1)?.progressPct;
    const muchLater = buildWidgetPayload(petAt(baseEpoch), baseEpoch + 10 * dayMs);
    expect(muchLater?.frames).toHaveLength(1);
    expect(muchLater?.frames[0]?.progressPct).toBe(frozen);
    expect(frozen).toBeLessThan(10 / 21);
  });

  it('marks a tended egg ready at the hatch boundary', () => {
    const now = baseEpoch + silkieChickenConfig.incubationDays * dayMs;
    const tended = buildWidgetPayload(
      petAt(baseEpoch, {
        lastWarmedEpoch: now,
        lastMistedEpoch: now,
        currentTemperatureCelsius: silkieChickenConfig.temperatureTargetCelsius,
        currentHumidityPct: silkieChickenConfig.humidityTargetPct,
      }),
      now
    );
    expect(tended?.phase).toBe('ready');
    expect(tended?.isReadyToHatch).toBe(true);
    expect(tended?.incubationDayDisplay).toBe(translate('widget.ready'));
    expect(tended?.temperatureStatus).toBe('optimal');
    expect(tended?.frames[0]).toMatchObject({
      phase: 'ready',
      headline: translate('widget.ready'),
      progressPct: 1,
      inSweetSpot: true,
    });
  });

  it('holds a hatched creature as one sanctuary frame', () => {
    const payload = buildWidgetPayload(petAt(baseEpoch, { isHatched: true, hatchedAtEpoch: baseEpoch }), baseEpoch + hourMs);
    expect(payload?.phase).toBe('hatched');
    expect(payload?.frames).toHaveLength(1);
    expect(payload?.isReadyToHatch).toBe(false);
    expect(payload?.incubationDayDisplay).toBe(translate('widget.hatched'));
    expect(payload?.frames[0]?.headline).toBe(translate('widget.hatched'));
    expect(payload?.frames[0]?.detail).toBe(translate('nest.placeHatched'));
    expect(payload?.frames[0]?.footer).toBeNull();
  });

  it('says a dry-country egg likes it dry instead of asking for mist', () => {
    const emu = {
      ...createPetInstance({
        id: 'emu-1',
        speciesId: 'emu',
        nickname: 'Stripe',
        nowEpoch: baseEpoch,
      }),
      care: { ...emptyCareLog(), grantedWindows: [0] },
    };
    const payload = buildWidgetPayload(emu, baseEpoch);
    expect(payload?.frames[0]?.footer).toBe(translate('care.prefersDry'));
    expect(payload?.shell.shape).toBe('elliptical');
    expect(payload?.frames[0]?.humidityLabel).toBe(translate('climate.optimal'));
    expect(emuConfig.humidityTargetPct).toBeLessThanOrEqual(35);
  });

  it('freezes the picture when the device clock rolls backward', () => {
    const payload = buildWidgetPayload(
      petAt(baseEpoch, { lastVerifiedEpoch: baseEpoch + 2 * hourMs }),
      baseEpoch
    );
    expect(payload?.frames).toHaveLength(1);
    expect(payload?.frames[0]?.detail).toBe(translate('widget.clockPaused'));
    expect(payload?.phase).not.toBe('unviable');
  });

  it('labels a second nest when the clutch is passed in', () => {
    const payload = buildWidgetPayload(petAt(baseEpoch), baseEpoch, { index: 1, count: 2 });
    expect(payload?.clutchLabel).toBe('Nest 2 of 2');
    expect(payload?.frames[0]?.footer).toContain('Sing to me');
  });

  it('writes the shared JSON payload and asks WidgetKit to reload every timeline', () => {
    const client = memoryClient();
    const payload = publishWidgetForPet(petAt(baseEpoch), baseEpoch, { client, reload: true });
    const stored = client.snapshot();
    expect(APP_GROUP_ID).toBe('group.com.shoebillsoftware.hatchpal');
    expect(stored.reloads).toBe(1);
    expect(stored.value).toBe(JSON.stringify(payload));
    const parsed = JSON.parse(stored.value ?? '{}') as WidgetPayload;
    expect(Object.keys(parsed).sort()).toEqual(
      [
        'clutchLabel',
        'commonName',
        'emptyBody',
        'emptyTitle',
        'frames',
        'hatchedDetail',
        'hearts',
        'humidityPct',
        'humidityStatus',
        'humidityTitle',
        'incubationDayDisplay',
        'isReadyToHatch',
        'lastUpdatedEpoch',
        'nickname',
        'petId',
        'phase',
        'progressPct',
        'shell',
        'speciesId',
        'temperatureCelsius',
        'temperatureStatus',
        'unviableBody',
        'unviableTitle',
        'warmthTitle',
      ].sort()
    );
    expect(LEGACY_WIDGET_KEYS.every((key) => key in parsed)).toBe(true);
    expect(parsed.temperatureStatus).toBe('optimal');
    expect(parsed.humidityStatus).toBe('optimal');
    expect(parsed.incubationDayDisplay).toBe('Day 0 of 21');
    expect(parsed.temperatureCelsius).toBe(37.5);
    expect(parsed.humidityPct).toBe(55);
    expect(parsed.isReadyToHatch).toBe(false);
    expect(WIDGET_PAYLOAD_KEY).toBe('hatchpal.widget.payload');
    expect(parsed.frames[0]?.temperatureText).toBe('37.5°');
  });

  it('publishes an explicit empty nest instead of leaving a stale egg behind', () => {
    const client = memoryClient();
    client.set(WIDGET_PAYLOAD_KEY, '{"petId":"stale"}');
    const payload = publishWidgetForPet(null, baseEpoch, { client, reload: true });
    expect(payload).toEqual(emptyWidgetPayload());
    expect(payload.phase).toBe('empty');
    expect(payload.frames).toEqual([]);
    expect(payload.emptyTitle).toBe(translate('nest.emptyTitle'));
    expect(JSON.parse(client.snapshot().value ?? '{}').incubationDayDisplay).toBeUndefined();
    expect(JSON.parse(client.snapshot().value ?? '{}').isReadyToHatch).toBeUndefined();
    expect(client.snapshot().reloads).toBe(1);
    expect(JSON.parse(client.snapshot().value ?? '{}')).toMatchObject({ phase: 'empty' });
  });

  it('can write telemetry without reloading when a caller asks to defer the refresh', () => {
    const client = memoryClient();
    publishWidgetForPet(petAt(baseEpoch), baseEpoch, { client, reload: false });
    expect(client.snapshot().value).toContain('"petId":"pet-1"');
    expect(client.snapshot().reloads).toBe(0);
  });

  it('reloads after care, loss, rename, and a clutch change, and ignores an unchanged egg', () => {
    const laid = stamp(petAt(baseEpoch));
    const cold = watch(null, false);
    expect(widgetSyncReason(cold, watch(null, false))).toBeNull();
    expect(widgetSyncReason(cold, watch(laid))).toBe('hydrate');
    expect(widgetSyncReason(watch(null), watch(laid))).toBe('adopt');

    const warmed = { ...laid, lastWarmedEpoch: baseEpoch + 1000 };
    expect(widgetSyncReason(watch(laid), watch(warmed))).toBe('warm');

    const misted = { ...warmed, lastMistedEpoch: baseEpoch + 2000 };
    expect(widgetSyncReason(watch(warmed), watch(misted))).toBe('mist');

    const hatched = { ...misted, isHatched: true };
    expect(widgetSyncReason(watch(misted), watch(hatched))).toBe('hatch');

    const lost = { ...misted, status: 'unviable' };
    expect(widgetSyncReason(watch(misted), watch(lost))).toBe('loss');

    const renamed = { ...misted, nickname: 'Pebble' };
    expect(widgetSyncReason(watch(misted), watch(renamed))).toBe('rename');

    const loved = { ...misted, care: { hearts: 1 } };
    expect(widgetSyncReason(watch(misted), watch(loved))).toBe('care');

    const other = { ...hatched, id: 'pet-2' };
    expect(widgetSyncReason(watch(hatched), watch(other))).toBe('focus');
    expect(widgetSyncReason(watch(hatched), watch(null))).toBe('clear');
    expect(widgetSyncReason(watch(misted), watch({ ...misted }))).toBeNull();
    expect(
      widgetSyncReason(
        watch(misted, true, { cradleOrder: ['pet-1'], activePetIndex: 0 }),
        watch(misted, true, { cradleOrder: ['pet-1', 'pet-2'], activePetIndex: 0 })
      )
    ).toBe('clutch');
  });
});
