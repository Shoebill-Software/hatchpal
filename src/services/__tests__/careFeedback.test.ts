import { existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  WISH_GRANTED_CUE,
  broodLanded,
  careReleaseFeel,
  mistLanded,
  moistureReleaseCues,
  nestAcceptsCare,
  spritzLanded,
  warmthReleaseCues,
} from '@/services/careFeedback';
import { SOUND_EFFECT_IDS, resolveShellTapEffect, spritzEffect, type ShellTapSnapshot } from '@/services/soundCues';

const AUDIO_DIR = join(__dirname, '../../../assets/audio');

describe('care cue map', () => {
  it('keeps wish, perfect, and settle cues on real samples', () => {
    expect(warmthReleaseCues('perfect').map((cue) => cue.id)).toEqual(['warm_settle', 'perfect_chime']);
    expect(warmthReleaseCues('chilly').map((cue) => cue.id)).toEqual(['warm_settle']);
    expect(warmthReleaseCues('toasty').map((cue) => cue.id)).toEqual(['warm_settle']);
    expect(warmthReleaseCues('cozy').map((cue) => cue.id)).toEqual(['warm_settle']);
    expect(moistureReleaseCues('perfect').map((cue) => cue.id)).toEqual(['mist_settle', 'perfect_chime']);
    expect(moistureReleaseCues('dry').map((cue) => cue.id)).toEqual(['mist_settle']);
    expect(moistureReleaseCues('soggy').map((cue) => cue.id)).toEqual(['mist_settle']);
    expect(moistureReleaseCues('dewy').map((cue) => cue.id)).toEqual(['mist_settle']);
    expect(WISH_GRANTED_CUE.id).toBe('wish_granted');

    const played = [
      ...warmthReleaseCues('perfect'),
      ...moistureReleaseCues('perfect'),
      WISH_GRANTED_CUE,
    ];
    for (const cue of played) {
      expect(SOUND_EFFECT_IDS).toContain(cue.id);
      expect(existsSync(join(AUDIO_DIR, `${cue.id}.wav`))).toBe(true);
    }
  });

  it('does not revive deleted mist or heat loops', () => {
    expect(SOUND_EFFECT_IDS).not.toContain('mist_whoosh');
    expect(SOUND_EFFECT_IDS).not.toContain('thermal_hum');
    expect(existsSync(join(AUDIO_DIR, 'mist_whoosh.wav'))).toBe(false);
    expect(existsSync(join(AUDIO_DIR, 'thermal_hum.wav'))).toBe(false);
    for (const id of SOUND_EFFECT_IDS) {
      expect(existsSync(join(AUDIO_DIR, `${id}.wav`))).toBe(true);
    }
  });

  it('rotates spritz samples and leaves a plain shell tap on an unpipped egg', () => {
    expect(spritzEffect(0)).toBe('mist_spritz_a');
    expect(spritzEffect(1)).toBe('mist_spritz_b');
    expect(spritzEffect(2)).toBe('mist_spritz_c');
    expect(spritzEffect(3)).toBe('mist_spritz_a');
    expect(spritzEffect(-1)).toBe('mist_spritz_b');
    const resting: ShellTapSnapshot = {
      isPipped: false,
      isHatched: false,
      isReadyToHatch: false,
      currentMilestone: {
        day: 0,
        stage: 'cleavage',
        title: 'Laid',
        scientificSummary: 'The clutch is freshly laid.',
        candling: {
          bloodVesselsVisible: false,
          eyeSpotVisible: false,
          embryoSilhouettePct: 0,
          airCellPct: 0.1,
          movementDetectable: false,
        },
        audioTrigger: 'silent',
      },
    };
    expect(resolveShellTapEffect(resting)).toBe('tap');
  });
});

describe('care release guards', () => {
  it('treats a refused result as if the hands never landed', () => {
    const refused = { granted: null };
    expect(spritzLanded(refused)).toBe(false);
    expect(broodLanded(refused)).toBe(false);
    expect(mistLanded(refused)).toBe(false);
    expect(spritzLanded(null)).toBe(false);
    expect(spritzLanded({ granted: null, addedPct: 0 })).toBe(true);
    expect(broodLanded({ granted: null, brood: 'cozy' })).toBe(true);
    expect(mistLanded({ granted: 'perfect_mist', mist: 'perfect' })).toBe(true);
  });

  it('closes care for hatched and unviable eggs', () => {
    expect(nestAcceptsCare({ isHatched: false })).toBe(true);
    expect(nestAcceptsCare({ isHatched: false, status: 'incubating' })).toBe(true);
    expect(nestAcceptsCare({ isHatched: true, status: 'incubating' })).toBe(false);
    expect(nestAcceptsCare({ isHatched: false, status: 'unviable' })).toBe(false);
  });

  it('maps perfect, steady, and missed landings onto different haptics', () => {
    expect(careReleaseFeel('perfect')).toBe('success');
    expect(careReleaseFeel('cozy')).toBe('light');
    expect(careReleaseFeel('dewy')).toBe('light');
    expect(careReleaseFeel('toasty')).toBe('warning');
    expect(careReleaseFeel('chilly')).toBe('warning');
    expect(careReleaseFeel('soggy')).toBe('warning');
    expect(careReleaseFeel('dry')).toBe('warning');
  });
});
