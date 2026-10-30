import { getSpeciesConfig } from '@/data/species';
import {
  candlingStageIdForDevelopment,
  candlingStageLabelKey,
  clamp01,
  ramp,
  resolveCandlingStage,
  resolveCandlingStageFromMilestones,
  resolveCandlingStageId,
} from '@/components/candling/candlingStages';

describe('Progressive candling stages', () => {
  it('maps incubation progress onto the four developmental windows', () => {
    expect(resolveCandlingStageId(0)).toBe('early');
    expect(resolveCandlingStageId(0.19)).toBe('early');
    expect(resolveCandlingStageId(0.2)).toBe('vascular');
    expect(resolveCandlingStageId(0.39)).toBe('vascular');
    expect(resolveCandlingStageId(0.4)).toBe('embryo');
    expect(resolveCandlingStageId(0.74)).toBe('embryo');
    expect(resolveCandlingStageId(0.75)).toBe('prehatch');
    expect(resolveCandlingStageId(1)).toBe('prehatch');
  });

  it('maps biological development stages onto candling captions', () => {
    expect(candlingStageIdForDevelopment('cleavage')).toBe('early');
    expect(candlingStageIdForDevelopment('vascular')).toBe('vascular');
    expect(candlingStageIdForDevelopment('organogenesis')).toBe('embryo');
    expect(candlingStageIdForDevelopment('internal_pip')).toBe('prehatch');
    expect(candlingStageIdForDevelopment('external_pip')).toBe('prehatch');
    expect(candlingStageIdForDevelopment('hatchling')).toBe('prehatch');
  });

  it('clamps non-finite and out-of-range progress before classifying', () => {
    expect(resolveCandlingStageId(Number.NaN)).toBe('early');
    expect(resolveCandlingStageId(-4)).toBe('early');
    expect(resolveCandlingStageId(8)).toBe('prehatch');
    expect(clamp01(Number.POSITIVE_INFINITY)).toBe(0);
    expect(ramp(0.1, 0.8, 0.2)).toBe(0);
    expect(ramp(0.5, 0.8, 0.2)).toBe(1);
  });

  it('starts as a floating yolk and grows into a crowded silhouette', () => {
    const early = resolveCandlingStage(0.08);
    expect(early.id).toBe('early');
    expect(early.yolk).toBeGreaterThan(0.7);
    expect(early.vessels).toBeLessThan(0.1);
    expect(early.embryo).toBeLessThan(0.2);
    expect(early.eye).toBe(0);
    expect(early.crowding).toBe(0);
    expect(early.airCell).toBeGreaterThan(0.05);
    expect(early.airCell).toBeLessThan(0.25);

    const vascular = resolveCandlingStage(0.3);
    expect(vascular.id).toBe('vascular');
    expect(vascular.vessels).toBeGreaterThan(0.4);
    expect(vascular.yolk).toBeGreaterThan(0.4);

    const embryo = resolveCandlingStage(0.55);
    expect(embryo.id).toBe('embryo');
    expect(embryo.embryo).toBeGreaterThan(0.3);
    expect(embryo.eye).toBeGreaterThan(0.5);
    expect(embryo.airCell).toBeGreaterThan(0.1);
    expect(embryo.movement).toBeGreaterThan(0);

    const prehatch = resolveCandlingStage(0.92);
    expect(prehatch.id).toBe('prehatch');
    expect(prehatch.crowding).toBeGreaterThan(0.6);
    expect(prehatch.embryo).toBeGreaterThan(0.7);
    expect(prehatch.airCell).toBeGreaterThan(embryo.airCell);
    expect(prehatch.yolk).toBeLessThan(early.yolk);
  });

  it('exposes translation keys for every stage caption', () => {
    expect(candlingStageLabelKey('early')).toBe('candling.stage.early');
    expect(candlingStageLabelKey('vascular')).toBe('candling.stage.vascular');
    expect(candlingStageLabelKey('embryo')).toBe('candling.stage.embryo');
    expect(candlingStageLabelKey('prehatch')).toBe('candling.stage.prehatch');
  });
});

describe('Milestone-driven candling stages', () => {
  const chicken = getSpeciesConfig('silkie_chicken');

  it('follows species milestone candling features instead of a global progress timer', () => {
    // Day 3 of 21 is only ~14% progress; the generic curve still hides vessels.
    const day3 = 3 / chicken.incubationDays;
    const milestone = resolveCandlingStageFromMilestones(day3, chicken.incubationDays, chicken.milestones);
    const generic = resolveCandlingStage(day3);

    expect(milestone.id).toBe('vascular');
    expect(milestone.vessels).toBe(1);
    expect(milestone.eye).toBe(0);
    expect(milestone.movement).toBe(0);
    expect(generic.vessels).toBeLessThan(0.05);

    const day8 = 8 / chicken.incubationDays;
    const organogenesis = resolveCandlingStageFromMilestones(
      day8,
      chicken.incubationDays,
      chicken.milestones,
    );
    expect(organogenesis.id).toBe('embryo');
    expect(organogenesis.eye).toBe(1);
    expect(organogenesis.movement).toBe(1);
    expect(organogenesis.embryo).toBeCloseTo(0.25, 5);
    expect(organogenesis.airCell).toBeCloseTo(0.1, 5);
  });

  it('lerps silhouette and air cell between neighboring milestones', () => {
    const mid = resolveCandlingStageFromMilestones(
      5.5 / chicken.incubationDays,
      chicken.incubationDays,
      chicken.milestones,
    );
    // Halfway from day-3 (0.08 / 0.07) toward day-8 (0.25 / 0.10).
    expect(mid.embryo).toBeCloseTo((0.08 + 0.25) / 2, 5);
    expect(mid.airCell).toBeCloseTo((0.07 + 0.1) / 2, 5);
    expect(mid.eye).toBeCloseTo(0.5, 5);
    expect(mid.vessels).toBe(1);
  });

  it('fades vessels once late milestones mark them covered', () => {
    const internalPip = resolveCandlingStageFromMilestones(
      19 / chicken.incubationDays,
      chicken.incubationDays,
      chicken.milestones,
    );
    expect(internalPip.id).toBe('prehatch');
    expect(internalPip.vessels).toBe(0);
    expect(internalPip.eye).toBe(0);
    expect(internalPip.embryo).toBeCloseTo(0.82, 5);
    expect(internalPip.movement).toBe(1);
    expect(internalPip.crowding).toBeGreaterThan(0.7);
  });

  it('falls back to the generic curve when milestones are missing', () => {
    const stage = resolveCandlingStageFromMilestones(0.55, 21, []);
    expect(stage).toEqual(resolveCandlingStage(0.55));
  });

  it('keeps every roster species finite across incubation', () => {
    const roster = [
      'silkie_chicken',
      'ball_python',
      'green_sea_turtle',
      'platypus',
      'emu',
    ] as const;
    for (const id of roster) {
      const species = getSpeciesConfig(id);
      for (const progress of [0, 0.15, 0.4, 0.7, 0.95, 1]) {
        const stage = resolveCandlingStageFromMilestones(
          progress,
          species.incubationDays,
          species.milestones,
        );
        for (const key of ['yolk', 'vessels', 'embryo', 'eye', 'airCell', 'crowding', 'movement'] as const) {
          expect(Number.isFinite(stage[key])).toBe(true);
          expect(stage[key]).toBeGreaterThanOrEqual(0);
          expect(stage[key]).toBeLessThanOrEqual(1);
        }
      }
    }
  });
});
