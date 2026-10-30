export interface FieldJournalExport {
  nickname: string;
  commonName: string;
  scientificName: string;
  laidAtEpoch: number;
  ageDays: number;
  lifeStage: string;
  milestoneTitle: string;
  milestoneSummary: string;
  /** Terminal line when the embryo can no longer develop. Omitted on a living record. */
  closedNote?: string;
}

export interface JournalExportMilestone {
  duringIncubation: boolean;
  status: string;
  stage: string;
  title: string;
  scientificSummary: string;
}

/**
 * Milestone quoted in the shared note.
 * A closed nest keeps the last incubation stage before emergence, so the note
 * does not describe a hatch that did not happen.
 */
export function journalExportMilestone(
  timeline: readonly JournalExportMilestone[],
  fallback: { title: string; scientificSummary: string },
  closed: boolean
): { title: string; scientificSummary: string } {
  if (!closed) {
    return { title: fallback.title, scientificSummary: fallback.scientificSummary };
  }
  const recorded = timeline.filter(
    (entry) => entry.duringIncubation && entry.status === 'completed' && entry.stage !== 'hatchling'
  );
  const last = recorded[recorded.length - 1];
  if (last) {
    return { title: last.title, scientificSummary: last.scientificSummary };
  }
  return { title: fallback.title, scientificSummary: fallback.scientificSummary };
}

/** Plain-text field note shared from the journal. Pro removes the export cap; the text itself stays on device. */
export function buildFieldJournalExport(entry: FieldJournalExport): string {
  const laid = Number.isFinite(entry.laidAtEpoch)
    ? new Date(entry.laidAtEpoch).toISOString().slice(0, 10)
    : 'unknown';
  const lines = [
    'HatchPal Field Journal',
    `${entry.nickname} · ${entry.commonName}`,
    entry.scientificName,
    `Laid ${laid}`,
    `Age ${entry.ageDays} days · ${entry.lifeStage}`,
    '',
    entry.milestoneTitle,
    entry.milestoneSummary,
  ];
  const closed = entry.closedNote?.trim() ?? '';
  if (closed.length > 0) {
    lines.push('', closed);
  }
  return lines.join('\n');
}
