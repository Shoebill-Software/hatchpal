import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

import type { DevelopmentStage } from '@/domain/types';
import { playSoundEffect, retainSoundEffects, type PlaySoundOptions } from '@/services/audio';
import {
  nestPipIntervalMs,
  resolveNestPipEffect,
  type SoundEffectId,
} from '@/services/soundCues';
import { usePreferencesStore } from '@/store/usePreferencesStore';

export type SoundEffectsApi = {
  play: (id: SoundEffectId, options?: PlaySoundOptions) => void;
};

/** Preloads the biological cue registry and releases it when this screen unmounts. */
export function useSoundEffects(): SoundEffectsApi {
  useEffect(() => retainSoundEffects(), []);

  const play = useCallback((id: SoundEffectId, options?: PlaySoundOptions) => {
    if (!usePreferencesStore.getState().soundEnabled) {
      return;
    }
    void playSoundEffect(id, options);
  }, []);

  return { play };
}

/**
 * Faint clicking or peeping while a pipped egg is on the nest.
 * The loop stops when the app backgrounds or the pip stage ends.
 */
export function useNestPipAudio(isPipped: boolean, stage: DevelopmentStage | null): void {
  const { play } = useSoundEffects();
  const soundEnabled = usePreferencesStore((state) => state.soundEnabled);

  useEffect(() => {
    if (!isPipped || !soundEnabled) {
      return;
    }

    const effect = resolveNestPipEffect(stage);
    if (!effect) {
      return;
    }

    let interval: ReturnType<typeof setInterval> | null = null;
    let appActive = AppState.currentState === 'active';
    const volume = 0.22;

    const start = (): void => {
      if (interval != null || !appActive) {
        return;
      }
      interval = setInterval(() => {
        play(effect, { volume });
      }, nestPipIntervalMs(effect));
    };

    const stop = (): void => {
      if (interval != null) {
        clearInterval(interval);
        interval = null;
      }
    };

    const kickoff = setTimeout(() => {
      if (!appActive) {
        return;
      }
      play(effect, { volume });
      start();
    }, 1600);

    const subscription = AppState.addEventListener('change', (status) => {
      appActive = status === 'active';
      if (appActive) {
        start();
      } else {
        stop();
      }
    });

    return () => {
      clearTimeout(kickoff);
      stop();
      subscription.remove();
    };
  }, [isPipped, play, soundEnabled, stage]);
}
