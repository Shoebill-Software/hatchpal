import { getSpeciesConfig } from '@/data/species';
import { readClimate } from '@/domain/climateEngine';
import { resolvePetSnapshot } from '@/domain/timeEngine';
import type { PetInstance } from '@/domain/types';

export const APP_GROUP_ID = 'group.com.shoebillsoftware.hatchpal';
export const WIDGET_PAYLOAD_KEY = 'hatchpal.widget.payload';
export const WIDGET_KIND = 'HatchPalWidget';

export const WIDGET_TIMELINE_REFRESH_MINUTES = 45;

export type WidgetBand = 'optimal' | 'warning';

export type WidgetPayload = {
  petId: string;
  speciesId: string;
  nickname: string;
  incubationDayDisplay: string;
  progressPct: number;
  temperatureCelsius: number;
  temperatureStatus: WidgetBand;
  humidityPct: number;
  humidityStatus: WidgetBand;
  isReadyToHatch: boolean;
  lastUpdatedEpoch: number;
};

export type WidgetSyncReason = 'hydrate' | 'adopt' | 'focus' | 'warm' | 'mist' | 'hatch' | 'clear';

export type WidgetPetStamp = {
  id: string;
  isHatched: boolean;
  lastWarmedEpoch: number;
  lastMistedEpoch: number;
};

export type WidgetWatchState = {
  hasHydrated: boolean;
  activePet: WidgetPetStamp | null;
};

export type WidgetDefaultsClient = {
  set(key: string, value: string): void;
  remove(key: string): void;
  reloadAllTimelines(): void;
};

type ExtensionStorageModule = {
  new (appGroup: string): {
    set(key: string, value?: string): void;
    remove(key: string): void;
  };
  reloadWidget(name?: string): void;
};

let cachedClient: WidgetDefaultsClient | null = null;

export function formatIncubationDay(ageDays: number, incubationDays: number): string {
  const total = Math.max(1, Math.round(Number.isFinite(incubationDays) ? incubationDays : 1));
  const elapsed = Number.isFinite(ageDays) ? Math.floor(ageDays) : 0;
  const day = Math.min(total, Math.max(0, elapsed));
  return `Day ${day} of ${total}`;
}

export function toWidgetBand(status: string): WidgetBand {
  return status === 'optimal' ? 'optimal' : 'warning';
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function roundTemperature(celsius: number): number {
  if (!Number.isFinite(celsius)) {
    return 0;
  }
  return Math.round(celsius * 10) / 10;
}

function roundHumidity(pct: number): number {
  if (!Number.isFinite(pct)) {
    return 0;
  }
  return Math.round(pct);
}

export function buildWidgetPayload(pet: PetInstance, nowEpoch: number): WidgetPayload | null {
  if (!pet.id) {
    return null;
  }
  const species = getSpeciesConfig(pet.speciesId);
  const now = Number.isFinite(nowEpoch) ? nowEpoch : Date.now();
  const snapshot = resolvePetSnapshot(pet, species, now);
  const climate = readClimate(pet, species, now);
  const nickname = pet.nickname.trim();

  return {
    petId: pet.id,
    speciesId: pet.speciesId,
    nickname: nickname.length > 0 ? nickname : 'Egg',
    incubationDayDisplay: formatIncubationDay(snapshot.ageDays, species.incubationDays),
    progressPct: clampUnit(snapshot.incubationProgress),
    temperatureCelsius: roundTemperature(climate.temperatureCelsius),
    temperatureStatus: toWidgetBand(climate.temperatureStatus),
    humidityPct: roundHumidity(climate.humidityPct),
    humidityStatus: toWidgetBand(climate.humidityStatus),
    isReadyToHatch: snapshot.isReadyToHatch,
    lastUpdatedEpoch: Math.round(now),
  };
}

export function widgetSyncReason(
  previous: WidgetWatchState,
  next: WidgetWatchState
): WidgetSyncReason | null {
  if (!next.hasHydrated) {
    return null;
  }
  if (!previous.hasHydrated) {
    return 'hydrate';
  }

  const before = previous.activePet;
  const after = next.activePet;
  if (before?.id !== after?.id) {
    if (!after) {
      return 'clear';
    }
    if (!before) {
      return 'adopt';
    }
    return 'focus';
  }
  if (!before || !after) {
    return null;
  }
  if (!before.isHatched && after.isHatched) {
    return 'hatch';
  }
  if (before.lastWarmedEpoch !== after.lastWarmedEpoch) {
    return 'warm';
  }
  if (before.lastMistedEpoch !== after.lastMistedEpoch) {
    return 'mist';
  }
  return null;
}

function loadIosWidgetClient(): WidgetDefaultsClient | null {
  if (process.env.JEST_WORKER_ID) {
    return null;
  }
  try {
    const reactNative = require('react-native') as { Platform?: { OS?: string } };
    if (reactNative.Platform?.OS !== 'ios') {
      return null;
    }
    const imported = require('@bacons/apple-targets') as { ExtensionStorage: ExtensionStorageModule };
    const storage = new imported.ExtensionStorage(APP_GROUP_ID);
    return {
      set(key, value) {
        storage.set(key, value);
      },
      remove(key) {
        storage.remove(key);
      },
      reloadAllTimelines() {
        imported.ExtensionStorage.reloadWidget();
      },
    };
  } catch {
    return null;
  }
}

function resolveClient(override?: WidgetDefaultsClient): WidgetDefaultsClient | null {
  if (override) {
    return override;
  }
  if (cachedClient) {
    return cachedClient;
  }
  const client = loadIosWidgetClient();
  if (client) {
    cachedClient = client;
  }
  return client;
}

export function reloadWidgetTimelines(client?: WidgetDefaultsClient): void {
  const resolved = resolveClient(client);
  if (!resolved) {
    return;
  }
  try {
    resolved.reloadAllTimelines();
  } catch {
    // A widget refresh must never interrupt nest care.
  }
}

export function publishWidgetForPet(
  pet: PetInstance | null,
  nowEpoch: number,
  options?: { reload?: boolean; client?: WidgetDefaultsClient }
): WidgetPayload | null {
  const client = resolveClient(options?.client);
  const payload = pet ? buildWidgetPayload(pet, nowEpoch) : null;
  if (!client) {
    return payload;
  }

  try {
    if (payload) {
      client.set(WIDGET_PAYLOAD_KEY, JSON.stringify(payload));
    } else {
      client.remove(WIDGET_PAYLOAD_KEY);
    }
  } catch {
    return payload;
  }

  if (options?.reload !== false) {
    reloadWidgetTimelines(client);
  }
  return payload;
}
