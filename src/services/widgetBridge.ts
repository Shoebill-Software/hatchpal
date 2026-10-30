import { getSpeciesConfig } from '@/data/species';
import {
  readClimate,
  type HumidityStatus,
  type NestTemper,
  type TemperatureStatus,
  type VitalityMood,
} from '@/domain/climateEngine';
import { activeWish, careLogOf, prefersDryNest, WISH_WINDOW_MS } from '@/domain/nestCare';
import { DAY_MS, weatherAt, type NestWeather } from '@/domain/nestWeather';
import { resolveEffectiveEpoch, resolvePetSnapshot } from '@/domain/timeEngine';
import type { EggShape, PetInstance, SpeckleStyle, WishKind } from '@/domain/types';
import { translate, type TranslationKey } from '@/i18n';

export const APP_GROUP_ID = 'group.com.shoebillsoftware.hatchpal';
export const WIDGET_PAYLOAD_KEY = 'hatchpal.widget.payload';
export const WIDGET_KIND = 'HatchPalWidget';

/** How far ahead the home screen can render without opening the app. */
export const WIDGET_HORIZON_MS = 18 * 60 * 60 * 1000;
/** Climate is sampled on this cadence, plus day and wish boundaries. */
export const WIDGET_STEP_MS = 30 * 60 * 1000;
const MAX_FRAMES = 48;

export type WidgetPhase = 'empty' | 'incubating' | 'ready' | 'hatched' | 'unviable';

export type WidgetShell = {
  shape: EggShape;
  speckle: SpeckleStyle;
  body: string;
  stroke: string;
  highlight: string;
  speckleColor: string;
  shadow: string;
  crack: string;
};

export type WidgetFrame = {
  atEpoch: number;
  phase: Exclude<WidgetPhase, 'empty'>;
  headline: string;
  detail: string;
  footer: string | null;
  progressPct: number;
  temperatureText: string;
  warmthLabel: string;
  warmthOptimal: boolean;
  humidityText: string;
  humidityLabel: string;
  humidityOptimal: boolean;
  inSweetSpot: boolean;
  onStrike: boolean;
  pipped: boolean;
  accessibilityLabel: string;
};

export type WidgetPayload = {
  phase: WidgetPhase;
  petId: string;
  speciesId: string;
  nickname: string;
  commonName: string;
  clutchLabel: string | null;
  hearts: number;
  shell: WidgetShell;
  warmthTitle: string;
  humidityTitle: string;
  emptyTitle: string;
  emptyBody: string;
  unviableTitle: string;
  unviableBody: string;
  hatchedDetail: string;
  frames: WidgetFrame[];
};

export type WidgetSyncReason =
  | 'hydrate'
  | 'adopt'
  | 'focus'
  | 'warm'
  | 'mist'
  | 'hatch'
  | 'clear'
  | 'rename'
  | 'care'
  | 'loss'
  | 'clutch';

export type WidgetPetStamp = {
  id: string;
  isHatched: boolean;
  lastWarmedEpoch: number;
  lastMistedEpoch: number;
  nickname?: string;
  status?: string;
  care?: { hearts?: number } | null;
};

export type WidgetWatchState = {
  hasHydrated: boolean;
  activePet: WidgetPetStamp | null;
  cradleOrder?: readonly string[];
  activePetIndex?: number;
};

export type WidgetClutch = {
  index: number;
  count: number;
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

const WARMTH_KEY: Record<TemperatureStatus, TranslationKey> = {
  optimal: 'climate.optimal',
  too_cold: 'climate.tooCold',
  too_warm: 'climate.tooWarm',
};

const HUMIDITY_KEY: Record<HumidityStatus, TranslationKey> = {
  optimal: 'climate.optimal',
  dry: 'climate.dry',
  humid: 'climate.humid',
};

const TEMPER_KEY: Record<Exclude<NestTemper, 'content'>, TranslationKey> = {
  chilly: 'widget.temper.chilly',
  parched: 'widget.temper.parched',
  fussy: 'widget.temper.fussy',
  on_strike: 'widget.temper.strike',
};

const WISH_KEY: Record<WishKind, TranslationKey> = {
  perfect_brood: 'widget.wish.perfect_brood',
  perfect_mist: 'widget.wish.perfect_mist',
  lullaby: 'widget.wish.lullaby',
  peek: 'widget.wish.peek',
  sweet_spot: 'widget.wish.sweet_spot',
};

const WEATHER_KEY: Record<NestWeather, TranslationKey> = {
  mild: 'weather.mild',
  cold_snap: 'weather.cold_snap',
  balmy: 'weather.balmy',
  dry_spell: 'weather.dry_spell',
  muggy: 'weather.muggy',
};

const MOOD_KEY: Record<VitalityMood, TranslationKey> = {
  thriving: 'climate.thriving',
  steady: 'climate.steady',
  sluggish: 'climate.sluggish',
  chilled: 'climate.chilled',
};

const WEATHER_EFFECT_KEY: Record<NestWeather, TranslationKey> = {
  mild: 'weather.effect.mild',
  cold_snap: 'weather.effect.cold_snap',
  balmy: 'weather.effect.balmy',
  dry_spell: 'weather.effect.dry_spell',
  muggy: 'weather.effect.muggy',
};

const FALLBACK_SHELL: WidgetShell = {
  shape: 'oval',
  speckle: 'fine',
  body: '#F3E4B8',
  stroke: '#D7C28A',
  highlight: '#FFF8E6',
  speckleColor: '#C4A66A',
  shadow: '#3A2A1C',
  crack: '#5C4030',
};

let cachedClient: WidgetDefaultsClient | null = null;

export function formatIncubationDay(ageDays: number, incubationDays: number): string {
  const total = Math.max(1, Math.round(Number.isFinite(incubationDays) ? incubationDays : 1));
  const elapsed = Number.isFinite(ageDays) ? Math.floor(ageDays) : 0;
  const day = Math.min(total, Math.max(0, elapsed));
  return translate('metric.dayOf', { day, total });
}

export function clutchContext(state: {
  cradleOrder?: readonly string[];
  activePetIndex?: number;
}): WidgetClutch | null {
  const count = state.cradleOrder?.length ?? 0;
  if (count <= 1) {
    return null;
  }
  const raw = state.activePetIndex ?? 0;
  const index = Number.isFinite(raw) ? Math.min(count - 1, Math.max(0, Math.floor(raw))) : 0;
  return { index, count };
}

/**
 * Epochs the widget can render on its own. Climate decay, the next wish, and
 * the next incubation day are all closed-form, so the home screen stays honest
 * after HatchPal leaves the foreground.
 */
export function widgetFrameEpochs(laidAtEpoch: number, nowEpoch: number): number[] {
  const now = Math.round(nowEpoch);
  if (!Number.isFinite(now)) {
    return [];
  }
  const end = now + WIDGET_HORIZON_MS;
  const marks = new Set<number>([now]);
  for (let cursor = now + WIDGET_STEP_MS; cursor <= end; cursor += WIDGET_STEP_MS) {
    marks.add(Math.round(cursor));
  }
  if (Number.isFinite(laidAtEpoch)) {
    addBoundaries(marks, laidAtEpoch, now, end, DAY_MS);
    addBoundaries(marks, laidAtEpoch, now, end, WISH_WINDOW_MS);
  }
  return [...marks]
    .filter((epoch) => epoch >= now && epoch <= end)
    .sort((left, right) => left - right)
    .slice(0, MAX_FRAMES);
}

export function emptyWidgetPayload(): WidgetPayload {
  return {
    phase: 'empty',
    petId: '',
    speciesId: '',
    nickname: '',
    commonName: '',
    clutchLabel: null,
    hearts: 0,
    shell: FALLBACK_SHELL,
    warmthTitle: translate('widget.warmth'),
    humidityTitle: translate('widget.humidity'),
    emptyTitle: translate('widget.emptyTitle'),
    emptyBody: translate('widget.emptyBody'),
    unviableTitle: translate('nest.unviableTitle'),
    unviableBody: translate('nest.unviableBody'),
    hatchedDetail: translate('widget.hatchedDetail'),
    frames: [],
  };
}

export function buildWidgetPayload(
  pet: PetInstance,
  nowEpoch: number,
  clutch?: WidgetClutch | null
): WidgetPayload | null {
  if (!pet.id) {
    return null;
  }
  const species = getSpeciesConfig(pet.speciesId);
  const now = Number.isFinite(nowEpoch) ? Math.round(nowEpoch) : Date.now();
  const shell = shellOf(species);
  const nickname = displayName(pet.nickname, species.commonName);
  const hearts = heartCount(pet);
  const clutchLabel =
    clutch && clutch.count > 1
      ? translate('widget.clutch', { index: clutch.index + 1, count: clutch.count })
      : null;
  const shared = {
    petId: pet.id,
    speciesId: pet.speciesId,
    nickname,
    commonName: species.commonName,
    clutchLabel,
    hearts,
    shell,
    warmthTitle: translate('widget.warmth'),
    humidityTitle: translate('widget.humidity'),
    emptyTitle: translate('widget.emptyTitle'),
    emptyBody: translate('widget.emptyBody'),
    unviableTitle: translate('nest.unviableTitle'),
    unviableBody: translate('nest.unviableBody'),
    hatchedDetail: translate('widget.hatchedDetail'),
  };

  const snapshot = resolvePetSnapshot(pet, species, now);
  if (snapshot.isHatched || snapshot.isUnviable || snapshot.isClockTampered) {
    const frame = makeFrame(pet, species, now, shared);
    return { phase: frame.phase, ...shared, frames: [frame] };
  }

  const frames: WidgetFrame[] = [];
  let previousKey = '';
  for (const epoch of widgetFrameEpochs(pet.laidAtEpoch, now)) {
    const frame = makeFrame(pet, species, epoch, shared);
    const key = pictureKey(frame);
    if (key !== previousKey) {
      frames.push(frame);
      previousKey = key;
    }
    if (frame.phase === 'unviable') {
      break;
    }
  }
  const safeFrames = frames.length > 0 ? frames : [makeFrame(pet, species, now, shared)];
  return {
    phase: safeFrames[0]?.phase ?? 'incubating',
    ...shared,
    frames: safeFrames,
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
  if (statusOf(before) !== statusOf(after)) {
    return 'loss';
  }
  if (before.lastWarmedEpoch !== after.lastWarmedEpoch) {
    return 'warm';
  }
  if (before.lastMistedEpoch !== after.lastMistedEpoch) {
    return 'mist';
  }
  if ((before.nickname ?? '') !== (after.nickname ?? '')) {
    return 'rename';
  }
  if (heartsOf(before) !== heartsOf(after)) {
    return 'care';
  }
  if (clutchSignature(previous) !== clutchSignature(next)) {
    return 'clutch';
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

export function publishWidgetSnapshot(
  state: {
    activePet: PetInstance | null;
    cradleOrder?: readonly string[];
    activePetIndex?: number;
  },
  nowEpoch: number,
  options?: { reload?: boolean; client?: WidgetDefaultsClient }
): WidgetPayload {
  return publishWidgetForPet(state.activePet, nowEpoch, {
    ...options,
    clutch: clutchContext(state),
  });
}

export function publishWidgetForPet(
  pet: PetInstance | null,
  nowEpoch: number,
  options?: { reload?: boolean; client?: WidgetDefaultsClient; clutch?: WidgetClutch | null }
): WidgetPayload {
  const client = resolveClient(options?.client);
  const payload = pet ? (buildWidgetPayload(pet, nowEpoch, options?.clutch) ?? emptyWidgetPayload()) : emptyWidgetPayload();
  if (!client) {
    return payload;
  }

  try {
    client.set(WIDGET_PAYLOAD_KEY, JSON.stringify(payload));
  } catch {
    return payload;
  }

  if (options?.reload !== false) {
    reloadWidgetTimelines(client);
  }
  return payload;
}

type FrameShared = {
  nickname: string;
  commonName: string;
  clutchLabel: string | null;
  hearts: number;
  unviableTitle: string;
  unviableBody: string;
  hatchedDetail: string;
};

function makeFrame(pet: PetInstance, species: ReturnType<typeof getSpeciesConfig>, epoch: number, shared: FrameShared): WidgetFrame {
  const clock = resolveEffectiveEpoch(epoch, pet.lastVerifiedEpoch);
  const snapshot = resolvePetSnapshot(pet, species, epoch);
  const climate = readClimate(pet, species, clock.effectiveEpoch);
  const phase: WidgetFrame['phase'] = snapshot.isUnviable
    ? 'unviable'
    : snapshot.isHatched
      ? 'hatched'
      : snapshot.isReadyToHatch
        ? 'ready'
        : 'incubating';
  const weather = weatherAt(pet, epoch);
  const weatherLabel = translate(WEATHER_KEY[weather]);
  const weatherDetail =
    weather === 'mild' ? weatherLabel : `${weatherLabel} · ${translate(WEATHER_EFFECT_KEY[weather])}`;
  const wish = phase === 'incubating' || phase === 'ready' ? activeWish(pet, species, epoch) : null;
  const headline =
    phase === 'unviable'
      ? translate('widget.goneCold')
      : phase === 'hatched'
        ? translate('widget.hatched')
        : phase === 'ready'
          ? translate('widget.ready')
          : formatIncubationDay(snapshot.ageDays, species.incubationDays);
  let detail =
    phase === 'unviable' ? shared.unviableBody : phase === 'hatched' ? shared.hatchedDetail : weatherDetail;
  if (snapshot.isClockTampered && phase !== 'unviable' && phase !== 'hatched') {
    detail = translate('widget.clockPaused');
  }
  const footer = frameFooter({
    temper: climate.temper,
    wish: wish?.kind ?? null,
    hearts: shared.hearts,
    clutchLabel: shared.clutchLabel,
    prefersDry: prefersDryNest(species),
    quiet: phase === 'incubating' || phase === 'ready',
  });
  const temperatureText = formatTemperature(climate.temperatureCelsius);
  const humidityText = formatHumidity(climate.humidityPct);
  const warmthLabel = translate(WARMTH_KEY[climate.temperatureStatus]);
  const humidityLabel = translate(HUMIDITY_KEY[climate.humidityStatus]);
  const mood = climate.temper === 'content' ? translate(MOOD_KEY[climate.mood]) : null;

  return {
    atEpoch: Math.round(epoch),
    phase,
    headline,
    detail,
    footer,
    progressPct: clampUnit(snapshot.incubationProgress),
    temperatureText,
    warmthLabel,
    warmthOptimal: climate.temperatureStatus === 'optimal',
    humidityText,
    humidityLabel,
    humidityOptimal: climate.humidityStatus === 'optimal',
    inSweetSpot: climate.inSweetSpot,
    onStrike: climate.temper === 'on_strike',
    pipped: snapshot.isPipped,
    accessibilityLabel: accessibilityLabel({
      nickname: shared.nickname,
      commonName: shared.commonName,
      phase,
      headline,
      detail,
      footer,
      temperatureText,
      warmthLabel,
      humidityText,
      humidityLabel,
      mood,
      clutchLabel: shared.clutchLabel,
      unviableTitle: shared.unviableTitle,
      unviableBody: shared.unviableBody,
      prefersDry: prefersDryNest(species),
    }),
  };
}

function frameFooter(input: {
  temper: NestTemper;
  wish: WishKind | null;
  hearts: number;
  clutchLabel: string | null;
  prefersDry: boolean;
  quiet: boolean;
}): string | null {
  if (!input.quiet) {
    return input.hearts > 0 ? translate('widget.heartsLine', { count: input.hearts }) : null;
  }
  const urgent: string[] = [];
  if (input.temper !== 'content') {
    urgent.push(translate(TEMPER_KEY[input.temper]));
  }
  if (input.wish) {
    urgent.push(translate(WISH_KEY[input.wish]));
  }
  if (urgent.length > 0) {
    return urgent.join(' · ');
  }
  const calm: string[] = [];
  if (input.hearts > 0) {
    calm.push(translate('widget.heartsLine', { count: input.hearts }));
  }
  if (input.clutchLabel) {
    calm.push(input.clutchLabel);
  }
  if (calm.length === 0 && input.prefersDry) {
    calm.push(translate('care.prefersDry'));
  }
  return calm.length > 0 ? calm.join(' · ') : null;
}

function accessibilityLabel(input: {
  nickname: string;
  commonName: string;
  phase: WidgetFrame['phase'];
  headline: string;
  detail: string;
  footer: string | null;
  temperatureText: string;
  warmthLabel: string;
  humidityText: string;
  humidityLabel: string;
  mood: string | null;
  clutchLabel: string | null;
  unviableTitle: string;
  unviableBody: string;
  prefersDry: boolean;
}): string {
  if (input.phase === 'unviable') {
    return `${input.nickname}. ${input.unviableTitle}. ${input.unviableBody}`;
  }
  if (input.phase === 'hatched') {
    return [input.nickname, input.commonName, input.detail, input.footer].filter(Boolean).join('. ');
  }
  return [
    input.nickname,
    input.commonName,
    input.headline,
    input.detail,
    `${translate('widget.warmth')} ${input.temperatureText}, ${input.warmthLabel}`,
    `${translate('widget.humidity')} ${input.humidityText}, ${input.humidityLabel}`,
    input.prefersDry ? translate('care.prefersDry') : null,
    input.clutchLabel,
    input.footer,
    input.mood,
  ]
    .filter((part): part is string => Boolean(part && part.length > 0))
    .join('. ');
}

function pictureKey(frame: WidgetFrame): string {
  return [
    frame.phase,
    frame.headline,
    frame.detail,
    frame.footer ?? '',
    frame.temperatureText,
    frame.warmthLabel,
    frame.humidityText,
    frame.humidityLabel,
    frame.onStrike ? '1' : '0',
    frame.pipped ? '1' : '0',
  ].join('|');
}

function shellOf(species: ReturnType<typeof getSpeciesConfig>): WidgetShell {
  const nest = species.egg.nest;
  return {
    shape: species.egg.shape,
    speckle: species.egg.speckle,
    body: nest.body,
    stroke: nest.stroke,
    highlight: nest.highlight,
    speckleColor: nest.speckle,
    shadow: nest.castShadow,
    crack: nest.crack,
  };
}

function displayName(nickname: string, fallback: string): string {
  const trimmed = nickname.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function heartCount(pet: PetInstance): number {
  const hearts = careLogOf(pet).hearts;
  if (!Number.isFinite(hearts) || hearts <= 0) {
    return 0;
  }
  return Math.min(999, Math.floor(hearts));
}

function formatTemperature(celsius: number): string {
  if (!Number.isFinite(celsius)) {
    return '0.0°';
  }
  return `${(Math.round(celsius * 10) / 10).toFixed(1)}°`;
}

function formatHumidity(pct: number): string {
  if (!Number.isFinite(pct)) {
    return '0%';
  }
  return `${Math.round(pct)}%`;
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function addBoundaries(marks: Set<number>, origin: number, now: number, end: number, period: number): void {
  if (!Number.isFinite(origin) || !Number.isFinite(period) || period <= 0) {
    return;
  }
  const elapsed = now - origin;
  let next = origin + (Math.floor(elapsed / period) + 1) * period;
  if (next <= now) {
    next += period;
  }
  while (next <= end && marks.size < MAX_FRAMES + 8) {
    marks.add(Math.round(next));
    next += period;
  }
}

function statusOf(pet: WidgetPetStamp): string {
  return pet.status === 'unviable' ? 'unviable' : 'incubating';
}

function heartsOf(pet: WidgetPetStamp): number {
  const hearts = pet.care?.hearts;
  if (typeof hearts !== 'number' || !Number.isFinite(hearts) || hearts <= 0) {
    return 0;
  }
  return Math.floor(hearts);
}

function clutchSignature(state: WidgetWatchState): string {
  const count = state.cradleOrder?.length ?? 0;
  const index = state.activePetIndex ?? 0;
  return `${index}/${count}`;
}
