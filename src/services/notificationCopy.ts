import type { AudioMilestoneTrigger, BiologicalMilestone, SpeciesConfig } from '@/domain/types';
import { translate, type TranslationKey } from '@/i18n';

export type AlertCopy = {
  title: string;
  body: string;
};

/** Lock-screen preview stays intact at this length. Longer biology falls back sentence by sentence. */
export const ALERT_BODY_LIMIT = 180;

const CUE_KEY: Record<AudioMilestoneTrigger, TranslationKey | null> = {
  silent: null,
  heartbeat: 'alert.cue.candle',
  embryo_movement: 'alert.cue.candle',
  internal_chirp: 'alert.cue.listen',
  shell_pip: 'alert.cue.still',
  hatch_call: 'alert.cue.hatch',
};

/**
 * Alert copy is derived from the species milestone itself, so a journal edit
 * reaches the lock screen on the next schedule. Sentences that only tell the
 * keeper to turn the egg are dropped: turning is not something the nest asks
 * you to do. A short cue points at candling, listening, stillness, or hatch.
 */
export function milestoneAlertCopy(
  milestone: BiologicalMilestone,
  _species: SpeciesConfig
): AlertCopy | null {
  if (!isAlertMilestone(milestone)) {
    return null;
  }
  const title = milestone.title.trim();
  if (title.length === 0) {
    return null;
  }
  const kept = sentences(milestone.scientificSummary);
  const cueKey = CUE_KEY[milestone.audioTrigger];
  const cue = cueKey ? translate(cueKey) : '';
  const body = composeBody(kept, cue);
  if (body.length === 0) {
    return null;
  }
  return { title, body };
}

export function milestoneAlertSubtitle(nickname: string, day: number, fallbackName: string): string {
  const trimmed = nickname.trim();
  const name = trimmed.length > 0 ? trimmed : fallbackName;
  const safeDay = Number.isFinite(day) ? Math.max(0, Math.floor(day)) : 0;
  return translate('alert.subtitle', { name, day: safeDay });
}

export function milestoneChannelCopy(): { name: string; description: string } {
  return {
    name: translate('alert.channel.name'),
    description: translate('alert.channel.description'),
  };
}

function isAlertMilestone(milestone: BiologicalMilestone): boolean {
  return (
    Number.isFinite(milestone.day) &&
    milestone.day > 0 &&
    milestone.stage !== 'cleavage' &&
    milestone.stage !== 'juvenile' &&
    milestone.stage !== 'adult'
  );
}

/** Keeper orders to turn the egg. The embryo turning along its axis stays. */
const TURNING_ORDER = /\bturning\b|\bturned\b|\bturn (?:it|the)\b/i;

function sentences(summary: string): string[] {
  return summary
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => withoutTurningOrders(sentence.trim()))
    .filter((sentence): sentence is string => sentence != null && sentence.length > 0);
}

function withoutTurningOrders(sentence: string): string | null {
  const kept = sentence
    .split(/;\s*/)
    .map((clause) => clause.trim())
    .filter((clause) => clause.length > 0 && !TURNING_ORDER.test(clause));
  if (kept.length === 0) {
    return null;
  }
  let joined = kept.join('; ');
  joined = joined.charAt(0).toUpperCase() + joined.slice(1);
  if (!/[.!?]$/.test(joined)) {
    joined = `${joined}.`;
  }
  return joined;
}

function composeBody(kept: readonly string[], cue: string): string {
  const groups = [kept, kept.slice(0, 2), kept.slice(0, 1)];
  for (const group of groups) {
    const withCue = joinCue(group, cue);
    if (fits(withCue)) {
      return withCue;
    }
    const bare = joinCue(group, '');
    if (fits(bare)) {
      return bare;
    }
  }
  if (fits(cue)) {
    return cue;
  }
  return truncate(kept[0] ?? cue, ALERT_BODY_LIMIT);
}

function joinCue(parts: readonly string[], cue: string): string {
  const lead = parts
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(' ');
  const action = cue.trim();
  if (action.length === 0) {
    return lead;
  }
  if (lead.length === 0) {
    return action;
  }
  const stem = action.replace(/[.!?]+$/, '').toLowerCase();
  if (stem.length > 0 && lead.toLowerCase().includes(stem)) {
    return lead;
  }
  return `${lead} ${action}`;
}

function fits(text: string): boolean {
  return text.length > 0 && text.length <= ALERT_BODY_LIMIT;
}

function truncate(text: string, limit: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= limit) {
    return trimmed;
  }
  const slice = trimmed.slice(0, Math.max(0, limit - 1));
  const space = slice.lastIndexOf(' ');
  const cut = (space > 40 ? slice.slice(0, space) : slice).replace(/[.,;:\s]+$/, '');
  return `${cut}…`;
}
