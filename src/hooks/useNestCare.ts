import { useCallback, useEffect, useRef, useState } from 'react';

import type { CareNotice, CareNoticeTone } from '@/components/ClimateControls';
import { readClimate } from '@/domain/climateEngine';
import {
  LULLABY_SPAN_MS,
  LULLABY_TAPS,
  MIST_SETTLE_MS,
  careLogOf,
  prefersDryNest,
} from '@/domain/nestCare';
import type { CareEvent, CareResult, PetInstance, SpeciesConfig } from '@/domain/types';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useTranslation } from '@/i18n';
import {
  ImpactFeedbackStyle,
  NotificationFeedbackType,
  triggerImpact,
  triggerNotification,
} from '@/services/hapticFeedback';
import { spritzEffect } from '@/services/soundCues';
import { usePreferencesStore } from '@/store/usePreferencesStore';

const NOTICE_MS = 3400;
const WISH_CHIME_DELAY_MS = 380;

export type NestCareApi = {
  notice: CareNotice | null;
  soaking: boolean;
  brooding: boolean;
  /** Shell taps toward the current lullaby, 0 to `LULLABY_TAPS`. */
  lullabyTaps: number;
  warmPulse: number;
  mistPulse: number;
  cheerPulse: number;
  heartPulse: number;
  onBroodStart: () => void;
  onBroodEnd: (startCelsius: number, endCelsius: number) => void;
  onBroodTooShort: () => void;
  onSpritz: () => void;
  onEggTap: () => void;
};

export function useNestCare({
  pet,
  species,
  performCare,
}: {
  pet: PetInstance;
  species: SpeciesConfig;
  performCare: (event: CareEvent) => CareResult | null;
}): NestCareApi {
  const { t } = useTranslation();
  const { play, loop, stop } = useSoundEffects();
  const signalTutorial = usePreferencesStore((state) => state.signalTutorial);
  const [notice, setNotice] = useState<CareNotice | null>(null);
  const [soaking, setSoaking] = useState(false);
  const [brooding, setBrooding] = useState(false);
  const [lullabyTaps, setLullabyTaps] = useState(0);
  const [warmPulse, setWarmPulse] = useState(0);
  const [mistPulse, setMistPulse] = useState(0);
  const [cheerPulse, setCheerPulse] = useState(0);
  const [heartPulse, setHeartPulse] = useState(0);

  const petRef = useRef(pet);
  petRef.current = pet;
  const noticeId = useRef(0);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chimeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mistStart = useRef<number | null>(null);
  const spritzCount = useRef(0);
  const taps = useRef<number[]>([]);

  const clearTimer = (timer: { current: ReturnType<typeof setTimeout> | null }) => {
    if (timer.current != null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearTimer(noticeTimer);
      clearTimer(settleTimer);
      clearTimer(tapTimer);
      clearTimer(chimeTimer);
      stop('ember_loop', 120);
      mistStart.current = null;
      taps.current = [];
      setSoaking(false);
      setBrooding(false);
      setLullabyTaps(0);
      setNotice(null);
    };
  }, [pet.id, stop]);

  const announce = useCallback((text: string, tone: CareNoticeTone) => {
    noticeId.current += 1;
    setNotice({ id: noticeId.current, text, tone });
    clearTimer(noticeTimer);
    noticeTimer.current = setTimeout(() => {
      noticeTimer.current = null;
      setNotice(null);
    }, NOTICE_MS);
  }, []);

  const celebrateWish = useCallback(
    (result: CareResult, heartsBefore: number): boolean => {
      if (!result.granted) {
        return false;
      }
      setHeartPulse((pulse) => pulse + 1);
      setCheerPulse((pulse) => pulse + 1);
      void triggerNotification(NotificationFeedbackType.Success);
      clearTimer(chimeTimer);
      chimeTimer.current = setTimeout(() => {
        chimeTimer.current = null;
        play('wish_granted');
      }, WISH_CHIME_DELAY_MS);
      announce(t('care.wishGranted', { hearts: heartsBefore + 1 }), 'great');
      return true;
    },
    [announce, play, t]
  );

  const onBroodStart = useCallback(() => {
    setBrooding(true);
    loop('ember_loop');
  }, [loop]);

  const onBroodTooShort = useCallback(() => {
    setBrooding(false);
    stop('ember_loop', 120);
    announce(t('care.brood.hint'), 'info');
  }, [announce, stop, t]);

  const onBroodEnd = useCallback(
    (startCelsius: number, endCelsius: number) => {
      setBrooding(false);
      stop('ember_loop', 260);
      const heartsBefore = careLogOf(petRef.current).hearts;
      const result = performCare({ kind: 'brood', startCelsius, celsius: endCelsius });
      if (!result?.brood) {
        return;
      }
      play('warm_settle');
      setWarmPulse((pulse) => pulse + 1);
      const perfect = result.brood === 'perfect';
      if (perfect) {
        play('perfect_chime', { volume: 0.5 });
        void triggerNotification(NotificationFeedbackType.Success);
        setCheerPulse((pulse) => pulse + 1);
      }
      signalTutorial('brood', result.brood);
      if (celebrateWish(result, heartsBefore)) {
        return;
      }
      const temp = species.temperatureTargetCelsius.toFixed(1);
      const tone: CareNoticeTone = perfect ? 'great' : result.brood === 'cozy' ? 'good' : 'warn';
      announce(t(`care.brood.${result.brood}`, { temp }), tone);
    },
    [announce, celebrateWish, performCare, play, signalTutorial, species.temperatureTargetCelsius, stop, t]
  );

  const settleMist = useCallback(() => {
    settleTimer.current = null;
    const startPct = mistStart.current;
    mistStart.current = null;
    setSoaking(false);
    if (startPct == null) {
      return;
    }
    const heartsBefore = careLogOf(petRef.current).hearts;
    const result = performCare({ kind: 'mist_settled', startPct });
    if (!result?.mist) {
      return;
    }
    play('mist_settle');
    const perfect = result.mist === 'perfect';
    if (perfect) {
      play('perfect_chime', { volume: 0.45 });
      void triggerNotification(NotificationFeedbackType.Success);
      setCheerPulse((pulse) => pulse + 1);
    }
    signalTutorial('mist', result.mist);
    if (celebrateWish(result, heartsBefore)) {
      return;
    }
    const humidity = String(Math.round(species.humidityTargetPct));
    const tone: CareNoticeTone = perfect ? 'great' : result.mist === 'dewy' ? 'good' : 'warn';
    announce(t(`care.mist.${result.mist}`, { humidity }), tone);
  }, [announce, celebrateWish, performCare, play, signalTutorial, species.humidityTargetPct, t]);

  const onSpritz = useCallback(() => {
    if (prefersDryNest(species)) {
      return;
    }
    if (mistStart.current == null) {
      mistStart.current = readClimate(petRef.current, species, Date.now()).humidityPct;
    }
    const result = performCare({ kind: 'spritz' });
    if (!result) {
      mistStart.current = null;
      return;
    }
    play(spritzEffect(spritzCount.current));
    spritzCount.current += 1;
    void triggerImpact(ImpactFeedbackStyle.Light);
    setMistPulse((pulse) => pulse + 1);
    setSoaking(true);
    clearTimer(settleTimer);
    settleTimer.current = setTimeout(settleMist, MIST_SETTLE_MS);
  }, [performCare, play, settleMist, species]);

  const onEggTap = useCallback(() => {
    signalTutorial('egg_taps');
    const now = Date.now();
    taps.current = [...taps.current.filter((at) => now - at <= LULLABY_SPAN_MS), now];
    clearTimer(tapTimer);
    if (taps.current.length < LULLABY_TAPS) {
      setLullabyTaps(taps.current.length);
      tapTimer.current = setTimeout(() => {
        tapTimer.current = null;
        taps.current = [];
        setLullabyTaps(0);
      }, LULLABY_SPAN_MS);
      return;
    }
    taps.current = [];
    setLullabyTaps(LULLABY_TAPS);
    tapTimer.current = setTimeout(() => {
      tapTimer.current = null;
      setLullabyTaps(0);
    }, 700);
    const heartsBefore = careLogOf(petRef.current).hearts;
    const result = performCare({ kind: 'lullaby' });
    if (!result) {
      return;
    }
    if (celebrateWish(result, heartsBefore)) {
      return;
    }
    if (result.credited) {
      setCheerPulse((pulse) => pulse + 1);
      announce(t('care.lullaby'), 'good');
    }
  }, [announce, celebrateWish, performCare, signalTutorial, t]);

  return {
    notice,
    soaking,
    brooding,
    lullabyTaps,
    warmPulse,
    mistPulse,
    cheerPulse,
    heartPulse,
    onBroodStart,
    onBroodEnd,
    onBroodTooShort,
    onSpritz,
    onEggTap,
  };
}
