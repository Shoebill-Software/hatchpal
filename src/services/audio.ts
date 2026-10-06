import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioStatus,
} from 'expo-audio';

import { usePreferencesStore } from '@/store/usePreferencesStore';

import { SOUND_EFFECT_IDS, type SoundEffectId } from './soundCues';

const SOUND_SOURCES: Record<SoundEffectId, number> = {
  tap: require('../../assets/audio/tap.wav'),
  pip_tap: require('../../assets/audio/pip_tap.wav'),
  internal_peep: require('../../assets/audio/internal_peep.wav'),
  shell_crack: require('../../assets/audio/shell_crack.wav'),
  hatch_call: require('../../assets/audio/hatch_call.wav'),
  heartbeat: require('../../assets/audio/heartbeat.wav'),
};

const DEFAULT_VOLUME: Record<SoundEffectId, number> = {
  tap: 0.62,
  pip_tap: 0.48,
  internal_peep: 0.26,
  shell_crack: 0.7,
  hatch_call: 0.82,
  heartbeat: 0.34,
};

type CueSubscription = {
  remove: () => void;
};

type LoadedCue = {
  id: SoundEffectId;
  player: AudioPlayer;
  subscription: CueSubscription;
  token: number;
};

const cues = new Map<SoundEffectId, LoadedCue>();
let tokenSeed = 0;
let retainCount = 0;
let audioMode: Promise<void> | null = null;

export type PlaySoundOptions = {
  volume?: number;
};

/**
 * Mixes short biological cues with other audio instead of taking exclusive focus.
 * Playback is allowed while the ringer is silenced so candling still has a pulse.
 */
export function configureSensoryAudio(): Promise<void> {
  if (!audioMode) {
    audioMode = setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
      allowsRecording: false,
    })
      .then(() => undefined)
      .catch((error: unknown) => {
        audioMode = null;
        throw error;
      });
  }
  return audioMode;
}

export async function preloadSoundEffects(
  ids: readonly SoundEffectId[] = SOUND_EFFECT_IDS
): Promise<void> {
  try {
    await configureSensoryAudio();
    for (const id of ids) {
      ensureCue(id);
    }
  } catch {
    // Preload is opportunistic. A later tap can try again.
  }
}

/** Drops every loaded player. Safe to call when the last sensory screen unmounts. */
export function unloadSoundEffects(): void {
  for (const id of [...cues.keys()]) {
    disposeCue(id);
  }
  audioMode = null;
}

/**
 * Keeps the registry loaded while at least one screen is mounted.
 * The returned function releases native players once the last caller unmounts.
 */
export function retainSoundEffects(): () => void {
  retainCount += 1;
  if (retainCount === 1) {
    void preloadSoundEffects();
  }

  let released = false;
  return () => {
    if (released) {
      return;
    }
    released = true;
    retainCount = Math.max(0, retainCount - 1);
    if (retainCount === 0) {
      unloadSoundEffects();
    }
  };
}

export async function playSoundEffect(id: SoundEffectId, options?: PlaySoundOptions): Promise<void> {
  if (!usePreferencesStore.getState().soundEnabled) {
    return;
  }
  try {
    await configureSensoryAudio();
    const cue = ensureCue(id);
    if (!cue) {
      return;
    }

    const requested = options?.volume;
    cue.player.volume =
      requested != null && Number.isFinite(requested)
        ? Math.min(1, Math.max(0, requested))
        : DEFAULT_VOLUME[id];

    if (cue.player.playing) {
      cue.player.pause();
    }

    const token = cue.token;
    await cue.player.seekTo(0);
    const current = cues.get(id);
    if (!current || current.token !== token) {
      return;
    }
    current.player.play();
  } catch {
    // Sensory audio never blocks incubation.
  }
}

function ensureCue(id: SoundEffectId): LoadedCue | null {
  const existing = cues.get(id);
  if (existing) {
    return existing;
  }

  try {
    const player = createAudioPlayer(SOUND_SOURCES[id], {
      updateInterval: 200,
      keepAudioSessionActive: true,
    });
    player.loop = false;
    player.volume = DEFAULT_VOLUME[id];

    const cue: LoadedCue = {
      id,
      player,
      subscription: { remove: () => undefined },
      token: (tokenSeed += 1),
    };

    cue.subscription = player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
      if (!status.didJustFinish) {
        return;
      }
      if (id === 'heartbeat') {
        rewind(player);
        return;
      }
      const token = cue.token;
      queueMicrotask(() => {
        if (cues.get(id)?.token === token) {
          disposeCue(id);
        }
      });
    });

    cues.set(id, cue);
    return cue;
  } catch {
    return null;
  }
}

function rewind(player: AudioPlayer): void {
  try {
    player.pause();
    void player.seekTo(0).catch(() => undefined);
  } catch {
    // The player may already have been removed.
  }
}

function disposeCue(id: SoundEffectId): void {
  const cue = cues.get(id);
  if (!cue) {
    return;
  }
  cues.delete(id);
  try {
    cue.subscription.remove();
  } catch {
    // Listener already detached.
  }
  try {
    cue.player.pause();
  } catch {
    // Player already stopped.
  }
  try {
    cue.player.remove();
  } catch {
    // Native object already released.
  }
}
