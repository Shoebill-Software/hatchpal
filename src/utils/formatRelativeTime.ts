const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function formatRelativeTime(fromEpoch: number, nowEpoch: number): string {
  const deltaMs = Math.max(0, nowEpoch - fromEpoch);

  if (deltaMs < MINUTE_MS) {
    return 'just now';
  }

  const minutes = Math.floor(deltaMs / MINUTE_MS);
  if (minutes < 60) {
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  }

  const hours = Math.floor(deltaMs / HOUR_MS);
  if (hours < 24) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }

  const days = Math.floor(deltaMs / DAY_MS);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

/** Compact elapsed readout for action-bar countdowns (e.g. "2h 14m"). */
export function formatElapsedClock(fromEpoch: number, nowEpoch: number): string {
  const deltaMs = Math.max(0, nowEpoch - fromEpoch);
  if (deltaMs < MINUTE_MS) {
    return 'just now';
  }

  const totalMinutes = Math.floor(deltaMs / MINUTE_MS);
  const days = Math.floor(deltaMs / DAY_MS);
  const hours = Math.floor((deltaMs % DAY_MS) / HOUR_MS);
  const minutes = totalMinutes % 60;

  if (days >= 1) {
    return hours === 0 ? `${days}d` : `${days}d ${hours}h`;
  }
  if (totalMinutes >= 60) {
    return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
  }
  return `${totalMinutes}m`;
}

export function formatElapsedAgo(fromEpoch: number, nowEpoch: number): string {
  const clock = formatElapsedClock(fromEpoch, nowEpoch);
  return clock === 'just now' ? 'just now' : `${clock} ago`;
}