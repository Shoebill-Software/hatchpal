import {
  candlingStageLabelKey,
  clamp01,
  ramp,
  resolveCandlingStage,
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
