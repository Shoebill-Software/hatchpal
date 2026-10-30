import { createEggPath, createPipStar, createVesselTree, layoutEgg } from '@/components/candlingGeometry';
import { buildCandlingAnatomy, candlingBodyPlan } from '@/components/candling/candlingAnatomy';
import {
  resolveCandlingStage,
  resolveCandlingStageFromMilestones,
} from '@/components/candling/candlingStages';
import { getSpeciesConfig } from '@/data/species';
import type { SpeciesId } from '@/domain/types';

const SPECIES: SpeciesId[] = [
  'silkie_chicken',
  'peregrine_falcon',
  'barn_owl',
  'mandarin_duck',
  'american_robin',
  'emperor_penguin',
  'common_ostrich',
  'emu',
  'leopard_gecko',
  'veiled_chameleon',
  'ball_python',
  'green_sea_turtle',
  'saltwater_crocodile',
  'platypus',
];

function chickenLayout() {
  return layoutEgg(400, 680, 24, { aspect: 39 / 52, shape: 'oval' });
}

describe('Candling anatomy', () => {
  it('gives each egg a body plan you could tell apart under a lamp', () => {
    expect(candlingBodyPlan('silkie_chicken')).toBe('avian');
    expect(candlingBodyPlan('emperor_penguin')).toBe('avian');
    expect(candlingBodyPlan('ball_python')).toBe('serpent');
    expect(candlingBodyPlan('leopard_gecko')).toBe('lizard');
    expect(candlingBodyPlan('veiled_chameleon')).toBe('chameleon');
    expect(candlingBodyPlan('green_sea_turtle')).toBe('turtle');
    expect(candlingBodyPlan('saltwater_crocodile')).toBe('crocodilian');
    expect(candlingBodyPlan('platypus')).toBe('monotreme');
  });

  it('grows a chick from a speck on the yolk into a curled body with a beak', () => {
    const layout = chickenLayout();
    const early = buildCandlingAnatomy(layout, resolveCandlingStage(0.08), {
      id: 'silkie_chicken',
      shape: 'oval',
      speckle: 'fine',
    });
    const late = buildCandlingAnatomy(
      layout,
      resolveCandlingStage(0.92),
      { id: 'silkie_chicken', shape: 'oval', speckle: 'fine' },
      { beakInAirCell: true },
    );
    const tucked = buildCandlingAnatomy(layout, resolveCandlingStage(0.92), {
      id: 'silkie_chicken',
      shape: 'oval',
      speckle: 'fine',
    });

    expect(early.metrics.headRadius).toBeLessThan(late.metrics.headRadius * 0.55);
    expect(early.chalazae).not.toBeNull();
    expect(early.germinalDisc).not.toBeNull();
    expect(early.beak).toBeNull();
    expect(early.airCell.depth).toBeLessThan(late.airCell.depth);
    expect(early.metrics.yolkRadius).toBeGreaterThan(late.metrics.yolkRadius);
    expect(late.beak).not.toBeNull();
    expect(late.metrics.beakReach).toBeGreaterThan(tucked.metrics.beakReach);
    expect(late.eye).not.toBeNull();
    expect(late.body.path.endsWith('Z')).toBe(true);
    expect(late.airCell.membrane.startsWith('M ')).toBe(true);

    const midway = buildCandlingAnatomy(layout, resolveCandlingStage(0.55), {
      id: 'silkie_chicken',
      shape: 'oval',
      speckle: 'fine',
    });
    expect(midway.metrics.headRadius).toBeGreaterThan(early.metrics.headRadius * 1.8);
    expect(midway.eye).not.toBeNull();
    expect(midway.limbs.length + (midway.leg ? 1 : 0)).toBeGreaterThan(0);
  });

  it('coils a python and shells a turtle instead of reusing the chick', () => {
    const layout = chickenLayout();
    const stage = resolveCandlingStage(0.7);
    const python = buildCandlingAnatomy(layout, stage, {
      id: 'ball_python',
      shape: 'oval',
      speckle: 'fine',
    });
    const turtle = buildCandlingAnatomy(layout, stage, {
      id: 'green_sea_turtle',
      shape: 'sphere',
      speckle: 'fine',
    });
    const chick = buildCandlingAnatomy(layout, stage, {
      id: 'silkie_chicken',
      shape: 'oval',
      speckle: 'fine',
    });

    expect(python.metrics.coilLength).toBeGreaterThan(layout.rx);
    expect(python.body.path.endsWith('Z')).toBe(true);
    expect(python.head).not.toBeNull();
    expect(turtle.carapace).not.toBeNull();
    expect(turtle.limbs.length).toBeGreaterThan(2);
    expect(chick.carapace).toBeNull();
    expect(chick.body.strokeWidth).toBeUndefined();
    expect(python.body.path).not.toBe(chick.body.path);
  });

  it('builds a finite silhouette for every species across incubation', () => {
    const layout = chickenLayout();
    for (const id of SPECIES) {
      for (const progress of [0, 0.3, 0.55, 0.92]) {
        const anatomy = buildCandlingAnatomy(
          layout,
          resolveCandlingStage(progress),
          { id, shape: 'oval', speckle: 'fine' },
          { beakInAirCell: progress > 0.85 },
        );
        expect(Number.isFinite(anatomy.metrics.headRadius)).toBe(true);
        expect(anatomy.metrics.headRadius).toBeGreaterThan(0);
        expect(anatomy.body.path.startsWith('M ')).toBe(true);
        expect(anatomy.airCell.fill.endsWith('Z')).toBe(true);
        expect(anatomy.yolk.width).toBeGreaterThan(0);
      }
    }
  });

  it('pits an ostrich shell, blotches a falcon shell, and leaves a robin shell clear', () => {
    const layout = chickenLayout();
    const stage = resolveCandlingStage(0.4);
    const ostrich = buildCandlingAnatomy(layout, stage, {
      id: 'common_ostrich',
      shape: 'pitted',
      speckle: 'pitted',
    });
    const falcon = buildCandlingAnatomy(layout, stage, {
      id: 'peregrine_falcon',
      shape: 'oval',
      speckle: 'mottled',
    });
    const robin = buildCandlingAnatomy(layout, stage, {
      id: 'american_robin',
      shape: 'oval',
      speckle: 'none',
    });
    expect(ostrich.shell.pores).toBeGreaterThan(0.5);
    expect(falcon.shell.pigment).toBeGreaterThan(0.5);
    expect(falcon.shell.blotch).toBe(1);
    expect(robin.shell.pigment).toBe(0);
    expect(robin.shell.pores).toBe(0);
    expect(ostrich.shell.seed).not.toBe(robin.shell.seed);
  });

  it('hands the yolk-sac vessels over to the shell membrane as the body grows', () => {
    const layout = chickenLayout();
    const species = getSpeciesConfig('silkie_chicken');
    const subject = { id: species.id, shape: species.egg.shape, speckle: species.egg.speckle } as const;
    const stageAt = (day: number) =>
      resolveCandlingStageFromMilestones(day / species.incubationDays, species.incubationDays, species.milestones);
    const spider = buildCandlingAnatomy(layout, stageAt(3), subject);
    const late = buildCandlingAnatomy(layout, stageAt(19), subject);
    const fresh = buildCandlingAnatomy(layout, stageAt(0), subject);

    expect(spider.vessels.opacity).toBeGreaterThan(0.8);
    expect(spider.vessels.levels.length).toBeGreaterThan(2);
    expect(late.vessels.opacity).toBeLessThan(0.15);
    expect(fresh.membraneVessels).toBeNull();
    expect(late.membraneVessels?.opacity).toBeGreaterThan(0.9);
    expect(late.mass.r).toBeGreaterThan(spider.mass.r);
  });

  it('keeps the albumen out of the air cell', () => {
    const layout = chickenLayout();
    const anatomy = buildCandlingAnatomy(layout, resolveCandlingStage(0.6), {
      id: 'silkie_chicken',
      shape: 'oval',
      speckle: 'fine',
    });
    const membraneCurve = anatomy.airCell.membrane.slice(anatomy.airCell.membrane.indexOf('Q'));
    expect(anatomy.airCell.contents).toContain(membraneCurve);
    expect(anatomy.airCell.fill).toContain(membraneCurve.split(' ').slice(0, 3).join(' '));
    expect(anatomy.airCell.contents.endsWith('Z')).toBe(true);
  });

  it('lights vessels, eye, and movement from milestone features for a live chicken candle', () => {
    const layout = chickenLayout();
    const species = getSpeciesConfig('silkie_chicken');
    const subject = { id: species.id, shape: species.egg.shape, speckle: species.egg.speckle } as const;

    const early = buildCandlingAnatomy(
      layout,
      resolveCandlingStageFromMilestones(0, species.incubationDays, species.milestones),
      subject,
    );
    expect(early.eye).toBeNull();
    expect(early.vessels.opacity).toBe(0);
    expect(early.germinalDisc).not.toBeNull();

    const vascular = buildCandlingAnatomy(
      layout,
      resolveCandlingStageFromMilestones(3 / species.incubationDays, species.incubationDays, species.milestones),
      subject,
    );
    expect(vascular.vessels.opacity).toBeGreaterThan(0.8);
    expect(vascular.eye).toBeNull();

    const eyed = buildCandlingAnatomy(
      layout,
      resolveCandlingStageFromMilestones(8 / species.incubationDays, species.incubationDays, species.milestones),
      subject,
    );
    expect(eyed.eye).not.toBeNull();
    expect(eyed.metrics.headRadius).toBeGreaterThan(early.metrics.headRadius);

    const pip = buildCandlingAnatomy(
      layout,
      resolveCandlingStageFromMilestones(19 / species.incubationDays, species.incubationDays, species.milestones),
      subject,
      { beakInAirCell: true },
    );
    expect(pip.eye).toBeNull();
    expect(pip.vessels.opacity).toBeLessThan(0.2);
    expect(pip.beak).not.toBeNull();
    expect(pip.airCell.depth).toBeGreaterThan(vascular.airCell.depth);
  });
});

describe('Egg silhouette', () => {
  it('keeps the historic oval and varies the other shell plans', () => {
    const oval = createEggPath(100, 140, 40, 56);
    expect(oval).toBe(createEggPath(100, 140, 40, 56, 'oval'));
    expect(oval).toBe(createEggPath(100, 140, 40, 56, 'pitted'));
    expect(createEggPath(100, 140, 40, 56, 'sphere')).not.toBe(oval);
    expect(createEggPath(100, 140, 40, 56, 'pear')).not.toBe(oval);
    expect(createEggPath(100, 140, 40, 56, 'elongated')).not.toBe(oval);
  });

  it('uses the real egg proportion when candling', () => {
    const round = layoutEgg(400, 680, 24, { aspect: 0.98, shape: 'sphere' });
    const long = layoutEgg(400, 680, 24, { aspect: 0.5, shape: 'elongated' });
    expect(round.rx / round.ry).toBeGreaterThan(long.rx / long.ry);
    expect(round.shape).toBe('sphere');
    expect(long.path).not.toBe(round.path);
  });

  it('only tapers the pointed pole when asked', () => {
    expect(createEggPath(100, 140, 40, 56, 'oval', 0)).toBe(createEggPath(100, 140, 40, 56));
    expect(createEggPath(100, 140, 40, 56, 'oval', 0.75)).not.toBe(createEggPath(100, 140, 40, 56));
    expect(createEggPath(100, 140, 40, 56, 'sphere', 1)).toBe(createEggPath(100, 140, 40, 56, 'sphere'));
  });
});

describe('Vessel tree', () => {
  it('is deterministic and keeps its branching as it spreads', () => {
    const small = createVesselTree(100, 120, 40, { seed: 9, depth: 4 });
    const again = createVesselTree(100, 120, 40, { seed: 9, depth: 4 });
    const large = createVesselTree(100, 120, 80, { seed: 9, depth: 4 });
    const other = createVesselTree(100, 120, 40, { seed: 10, depth: 4 });

    expect(small).toEqual(again);
    expect(small.levels).toHaveLength(4);
    expect(other.levels[0]).not.toBe(small.levels[0]);
    for (let level = 0; level < 4; level += 1) {
      expect(large.levels[level].split('M').length).toBe(small.levels[level].split('M').length);
    }
    expect(small.levels[3].split('M').length).toBeGreaterThan(small.levels[0].split('M').length);
    expect(small.terminalis.endsWith('Z')).toBe(true);
  });
});

describe('Pip fracture', () => {
  it('opens a hole only once the shell is broken through', () => {
    const internal = createPipStar(100, 140, 40, 56, false);
    const external = createPipStar(100, 140, 40, 56, true);
    expect(internal.hole).toBeNull();
    expect(external.hole?.endsWith('Z')).toBe(true);
    expect(external.cracks.split('M').length).toBeGreaterThan(internal.cracks.split('M').length);
  });
});
