import { silkieChickenConfig } from '@/data/species/chicken';
import { createPetInstance } from '@/domain/petIntegrity';
import type { PetInstance } from '@/domain/types';

import {
  APP_GROUP_ID,
  WIDGET_PAYLOAD_KEY,
  buildWidgetPayload,
  formatIncubationDay,
  publishWidgetForPet,
  toWidgetBand,
  widgetSyncReason,
  type WidgetDefaultsClient,
  type WidgetPayload,
  type WidgetWatchState,
} from '../widgetBridge';

const dayMs = 86_400_000;
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

function watch(pet: WidgetWatchState['activePet'], hasHydrated = true): WidgetWatchState {
  return { hasHydrated, activePet: pet };
}

function stamp(pet: PetInstance): NonNullable<WidgetWatchState['activePet']> {
  return {
    id: pet.id,
    isHatched: pet.isHatched,
    lastWarmedEpoch: pet.lastWarmedEpoch,
    lastMistedEpoch: pet.lastMistedEpoch,
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

  it('collapses climate readings outside the sweet spot to a warning band', () => {
    expect(toWidgetBand('optimal')).toBe('optimal');
    expect(toWidgetBand('too_cold')).toBe('warning');
    expect(toWidgetBand('too_warm')).toBe('warning');
    expect(toWidgetBand('dry')).toBe('warning');
    expect(toWidgetBand('humid')).toBe('warning');
  });

  it('serializes the active egg with decayed climate and incubation progress', () => {
    const now = baseEpoch + 8 * dayMs;
    const payload = buildWidgetPayload(petAt(now), now);
    expect(payload).toEqual<WidgetPayload>({
      petId: 'pet-1',
      speciesId: 'silkie_chicken',
      nickname: 'Pip',
      incubationDayDisplay: 'Day 8 of 21',
      progressPct: 8 / 21,
      temperatureCelsius: expect.any(Number),
      temperatureStatus: 'warning',
      humidityPct: expect.any(Number),
      humidityStatus: 'warning',
      isReadyToHatch: false,
      lastUpdatedEpoch: now,
    });
    expect(payload?.temperatureCelsius).toBeLessThan(silkieChickenConfig.temperatureTargetCelsius);
    expect(payload?.humidityPct).toBeLessThan(silkieChickenConfig.humidityTargetPct);
    expect(payload?.progressPct).toBeGreaterThan(0);
    expect(payload?.progressPct).toBeLessThanOrEqual(1);
  });

  it('reports an optimal nest immediately after the egg is laid', () => {
    const payload = buildWidgetPayload(petAt(baseEpoch), baseEpoch);
    expect(payload?.temperatureCelsius).toBe(silkieChickenConfig.temperatureTargetCelsius);
    expect(payload?.temperatureStatus).toBe('optimal');
    expect(payload?.humidityPct).toBe(silkieChickenConfig.humidityTargetPct);
    expect(payload?.humidityStatus).toBe('optimal');
    expect(payload?.incubationDayDisplay).toBe('Day 0 of 21');
    expect(payload?.isReadyToHatch).toBe(false);
  });

  it('marks the egg ready once incubation progress reaches the hatch boundary', () => {
    const now = baseEpoch + silkieChickenConfig.incubationDays * dayMs;
    const payload = buildWidgetPayload(petAt(now), now);
    expect(payload?.progressPct).toBe(1);
    expect(payload?.isReadyToHatch).toBe(true);
    expect(payload?.incubationDayDisplay).toBe('Day 21 of 21');
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
        'humidityPct',
        'humidityStatus',
        'incubationDayDisplay',
        'isReadyToHatch',
        'lastUpdatedEpoch',
        'nickname',
        'petId',
        'progressPct',
        'speciesId',
        'temperatureCelsius',
        'temperatureStatus',
      ].sort()
    );
    expect(WIDGET_PAYLOAD_KEY).toBe('hatchpal.widget.payload');
  });

  it('clears the shared payload when the nest is empty and still reloads timelines', () => {
    const client = memoryClient();
    client.set(WIDGET_PAYLOAD_KEY, '{"petId":"stale"}');
    const payload = publishWidgetForPet(null, baseEpoch, { client, reload: true });
    expect(payload).toBeNull();
    expect(client.snapshot()).toEqual({ value: null, reloads: 1 });
  });

  it('can write telemetry without reloading when a caller asks to defer the refresh', () => {
    const client = memoryClient();
    publishWidgetForPet(petAt(baseEpoch), baseEpoch, { client, reload: false });
    expect(client.snapshot().value).toContain('"petId":"pet-1"');
    expect(client.snapshot().reloads).toBe(0);
  });

  it('reloads after adoption, warming, misting, and hatching, and ignores the display clock', () => {
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

    const other = { ...hatched, id: 'pet-2' };
    expect(widgetSyncReason(watch(hatched), watch(other))).toBe('focus');
    expect(widgetSyncReason(watch(hatched), watch(null))).toBe('clear');
    expect(widgetSyncReason(watch(misted), watch({ ...misted }))).toBeNull();
  });
});
