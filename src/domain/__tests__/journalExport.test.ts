import { buildFieldJournalExport, journalExportMilestone } from '@/domain/journalExport';

const entry = {
  nickname: 'Pip',
  commonName: 'Silkie Chicken',
  scientificName: 'Gallus gallus domesticus',
  laidAtEpoch: Date.UTC(2026, 0, 2),
  ageDays: 8,
  lifeStage: 'Egg',
  milestoneTitle: 'Organogenesis',
  milestoneSummary: 'The eye spot is visible.',
};

describe('field journal export', () => {
  it('writes a device-local note with no remote address', () => {
    const message = buildFieldJournalExport(entry);
    expect(message).toContain('HatchPal Field Journal');
    expect(message).toContain('Pip · Silkie Chicken');
    expect(message).toContain('Gallus gallus domesticus');
    expect(message).toContain('Laid 2026-01-02');
    expect(message).toContain('Age 8 days · Egg');
    expect(message).toContain('Organogenesis');
    expect(message).toContain('The eye spot is visible.');
    expect(message).not.toMatch(/https?:\/\//);
  });

  it('appends the closed-nest line when development has stopped', () => {
    const message = buildFieldJournalExport({
      ...entry,
      laidAtEpoch: Number.NaN,
      closedNote: '  The embryo did not survive the prolonged climate drop.  ',
    });
    expect(message).toContain('Laid unknown');
    expect(message.endsWith('The embryo did not survive the prolonged climate drop.')).toBe(true);
  });

  it('quotes the last pre-emergence stage once the nest has closed', () => {
    const timeline = [
      { duringIncubation: true, status: 'completed', stage: 'organogenesis', title: 'Eye spot', scientificSummary: 'Visible.' },
      { duringIncubation: true, status: 'completed', stage: 'hatchling', title: 'Emergence', scientificSummary: 'The chick emerges.' },
      { duringIncubation: false, status: 'upcoming', stage: 'juvenile', title: 'Juvenile', scientificSummary: 'Growing.' },
    ];
    expect(journalExportMilestone(timeline, { title: 'Emergence', scientificSummary: 'The chick emerges.' }, true)).toEqual({
      title: 'Eye spot',
      scientificSummary: 'Visible.',
    });
    expect(journalExportMilestone(timeline, { title: 'Emergence', scientificSummary: 'The chick emerges.' }, false)).toEqual({
      title: 'Emergence',
      scientificSummary: 'The chick emerges.',
    });
  });
});
