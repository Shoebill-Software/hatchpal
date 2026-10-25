export interface FieldJournalExport {
  nickname: string;
  commonName: string;
  scientificName: string;
  laidAtEpoch: number;
  ageDays: number;
  lifeStage: string;
  milestoneTitle: string;
  milestoneSummary: string;
}

/** Plain-text field note shared from the journal. Pro removes the export cap; the text itself stays on device. */
export function buildFieldJournalExport(entry: FieldJournalExport): string {
  const laid = Number.isFinite(entry.laidAtEpoch)
    ? new Date(entry.laidAtEpoch).toISOString().slice(0, 10)
    : 'unknown';
  return [
    'HatchPal Field Journal',
    `${entry.nickname} · ${entry.commonName}`,
    entry.scientificName,
    `Laid ${laid}`,
    `Age ${entry.ageDays} days · ${entry.lifeStage}`,
    '',
    entry.milestoneTitle,
    entry.milestoneSummary,
  ].join('\n');
}
