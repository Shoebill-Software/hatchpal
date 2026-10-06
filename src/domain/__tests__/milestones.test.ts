import { leopardGeckoConfig } from '@/data/species/gecko';
import { silkieChickenConfig } from '@/data/species/chicken';
import { greenSeaTurtleConfig } from '@/data/species/turtle';
import {
  MS_PER_DAY,
  POST_HATCH_JUVENILE_FRACTION,
  buildJournalTimeline,
  closestSizeReference,
  generateWeightHistory,
  getAchievedPostHatchMilestones,
  getMilestoneTimestamp,
  getNextUpcomingMilestone,
  getPostHatchMilestones,
  getSizeReferences,
  getUnlockedMilestones,
  getWeightMarks,
} from '@/domain/milestones';
import { HATCHLING_MATURATION_THRESHOLD, MS_PER_DAY as ENGINE_DAY_MS } from '@/domain/timeEngine';

describe('Milestone queries', () => {
  const laidAtEpoch = 1_700_000_000_000;

  it('returns only milestones at or before the current incubation progress', () => {
    const progress = 8 / silkieChickenConfig.incubationDays;
    const unlocked = getUnlockedMilestones(silkieChickenConfig, progress);

    expect(unlocked.map((milestone) => milestone.day)).toEqual([0, 3, 8]);
    expect(getUnlockedMilestones(silkieChickenConfig, progress - 0.01).map((milestone) => milestone.day)).toEqual([
      0, 3,
    ]);
    expect(getUnlockedMilestones(silkieChickenConfig, 0).map((milestone) => milestone.day)).toEqual([0]);
    expect(getUnlockedMilestones(silkieChickenConfig, 1)).toHaveLength(silkieChickenConfig.milestones.length);
    expect(getUnlockedMilestones(leopardGeckoConfig, 7 / 50).map((milestone) => milestone.day)).toEqual([0, 7]);

    for (const milestone of unlocked) {
      expect(milestone.day / silkieChickenConfig.incubationDays).toBeLessThanOrEqual(progress + 1e-8);
    }
  });

  it('identifies the next milestone and returns null at completion', () => {
    expect(getNextUpcomingMilestone(silkieChickenConfig, 0)?.day).toBe(3);
    expect(getNextUpcomingMilestone(silkieChickenConfig, 8 / 21)?.day).toBe(14);
    expect(getNextUpcomingMilestone(silkieChickenConfig, 20 / 21)?.day).toBe(21);
    expect(getNextUpcomingMilestone(silkieChickenConfig, 1)).toBeNull();
    expect(getNextUpcomingMilestone(silkieChickenConfig, 1.4)).toBeNull();
    expect(getNextUpcomingMilestone(greenSeaTurtleConfig, 1)).toBeNull();
  });

  it('offsets the laying epoch by milestone days', () => {
    expect(MS_PER_DAY).toBe(86_400_000);
    expect(MS_PER_DAY).toBe(ENGINE_DAY_MS);
    expect(getMilestoneTimestamp(laidAtEpoch, 0)).toBe(laidAtEpoch);
    expect(getMilestoneTimestamp(laidAtEpoch, 3)).toBe(laidAtEpoch + 3 * MS_PER_DAY);
    expect(getMilestoneTimestamp(laidAtEpoch, 19)).toBe(laidAtEpoch + 19 * MS_PER_DAY);
    expect(getMilestoneTimestamp(laidAtEpoch, 21)).toBe(laidAtEpoch + 21 * MS_PER_DAY);
    expect(getMilestoneTimestamp(Number.NaN, 3)).toBe(0);
  });
});

describe('Journal growth calculations', () => {
  const laidAtEpoch = 1_700_000_000_000;
  const hatchEpoch = laidAtEpoch + silkieChickenConfig.incubationDays * MS_PER_DAY;

  it('places post-hatch stages on the maturation clock', () => {
    expect(POST_HATCH_JUVENILE_FRACTION).toBe(HATCHLING_MATURATION_THRESHOLD);

    const stages = getPostHatchMilestones(silkieChickenConfig);
    expect(stages.map((stage) => stage.id)).toEqual(['emergence', 'juvenile', 'adult']);
    expect(stages[0]?.postHatchDay).toBe(0);
    expect(stages[0]?.day).toBe(21);
    expect(stages[1]?.postHatchDay).toBe(21);
    expect(stages[1]?.day).toBe(42);
    expect(stages[2]?.postHatchDay).toBe(126);

    expect(getAchievedPostHatchMilestones(silkieChickenConfig, -1)).toEqual([]);
    expect(getAchievedPostHatchMilestones(silkieChickenConfig, 0).map((stage) => stage.id)).toEqual(['emergence']);
    expect(getAchievedPostHatchMilestones(silkieChickenConfig, 20.9).map((stage) => stage.id)).toEqual(['emergence']);
    expect(getAchievedPostHatchMilestones(silkieChickenConfig, 21).map((stage) => stage.id)).toEqual([
      'emergence',
      'juvenile',
    ]);
    expect(getAchievedPostHatchMilestones(silkieChickenConfig, 126).map((stage) => stage.id)).toEqual([
      'emergence',
      'juvenile',
      'adult',
    ]);
  });

  it('marks the active phase and dates juvenile growth from the logged hatch', () => {
    const incubating = buildJournalTimeline({
      species: silkieChickenConfig,
      laidAtEpoch,
      progress: 8 / 21,
      isHatched: false,
      postHatchAgeDays: 0,
      hatchEpoch,
    });
    const byDay = new Map(
      incubating.filter((entry) => entry.postHatchDay == null).map((entry) => [entry.day, entry.status])
    );
    expect(byDay.get(0)).toBe('completed');
    expect(byDay.get(3)).toBe('completed');
    expect(byDay.get(8)).toBe('active');
    expect(byDay.get(14)).toBe('upcoming');
    expect(incubating.find((entry) => entry.stage === 'juvenile')?.status).toBe('upcoming');
    expect(incubating.find((entry) => entry.day === 3 && entry.postHatchDay == null)?.unlockEpoch).toBe(
      laidAtEpoch + 3 * MS_PER_DAY
    );

    const newborn = buildJournalTimeline({
      species: silkieChickenConfig,
      laidAtEpoch,
      progress: 1,
      isHatched: true,
      postHatchAgeDays: 0,
      hatchEpoch,
    });
    expect(newborn.find((entry) => entry.stage === 'hatchling')?.status).toBe('active');
    expect(newborn.find((entry) => entry.stage === 'juvenile')?.status).toBe('upcoming');

    const juvenile = buildJournalTimeline({
      species: silkieChickenConfig,
      laidAtEpoch,
      progress: 1,
      isHatched: true,
      postHatchAgeDays: 21,
      hatchEpoch,
    });
    expect(juvenile.find((entry) => entry.stage === 'hatchling')?.status).toBe('completed');
    expect(juvenile.find((entry) => entry.stage === 'juvenile')?.status).toBe('active');
    expect(juvenile.find((entry) => entry.stage === 'adult')?.status).toBe('upcoming');

    const lateHatch = laidAtEpoch + 24 * MS_PER_DAY;
    const shifted = buildJournalTimeline({
      species: silkieChickenConfig,
      laidAtEpoch,
      progress: 1,
      isHatched: true,
      postHatchAgeDays: 0,
      hatchEpoch: lateHatch,
    });
    expect(shifted.find((entry) => entry.stage === 'juvenile')?.unlockEpoch).toBe(lateHatch + 21 * MS_PER_DAY);
    expect(shifted.find((entry) => entry.stage === 'hatchling')?.unlockEpoch).toBe(laidAtEpoch + 21 * MS_PER_DAY);
  });

  it('samples weight from hatch mass up to the adult plateau', () => {
    const adultEpoch = hatchEpoch + silkieChickenConfig.adultMaturationDays * MS_PER_DAY;
    const samples = generateWeightHistory(silkieChickenConfig, hatchEpoch, adultEpoch, 5);

    expect(generateWeightHistory(silkieChickenConfig, hatchEpoch, hatchEpoch - 1)).toEqual([]);
    expect(generateWeightHistory(silkieChickenConfig, Number.NaN, adultEpoch)).toEqual([]);
    expect(samples).toHaveLength(5);
    expect(samples[0]).toMatchObject({ epoch: hatchEpoch, postHatchDay: 0, grams: 32 });
    expect(samples[samples.length - 1]).toMatchObject({
      epoch: adultEpoch,
      grams: silkieChickenConfig.adultWeightGrams,
    });

    for (let index = 1; index < samples.length; index += 1) {
      const previous = samples[index - 1];
      const current = samples[index];
      expect(previous).toBeDefined();
      expect(current).toBeDefined();
      if (!previous || !current) {
        continue;
      }
      expect(current.epoch).toBeGreaterThan(previous.epoch);
      expect(current.grams).toBeGreaterThanOrEqual(previous.grams);
    }

    const monthEpoch = hatchEpoch + 30 * MS_PER_DAY;
    expect(getWeightMarks(silkieChickenConfig, hatchEpoch, hatchEpoch).map((mark) => mark.id)).toEqual([
      'emergence',
    ]);
    expect(getWeightMarks(silkieChickenConfig, hatchEpoch, monthEpoch).map((mark) => mark.id)).toEqual([
      'emergence',
      'juvenile',
      'current',
    ]);
    const adultMarks = getWeightMarks(silkieChickenConfig, hatchEpoch, adultEpoch);
    expect(adultMarks.map((mark) => mark.id)).toEqual(['emergence', 'juvenile', 'adult']);
    expect(adultMarks[0]?.grams).toBe(32);
    expect(adultMarks[2]?.grams).toBe(1300);
    expect(adultMarks[1]?.grams).toBeGreaterThan(32);
    expect(adultMarks[1]?.grams).toBeLessThan(1300);
  });

  it('matches the living animal to the nearest field reference', () => {
    expect(getSizeReferences(silkieChickenConfig).map((reference) => reference.weightGrams)).toEqual([32, 600, 1300]);
    expect(closestSizeReference(silkieChickenConfig, 32).id).toBe('silkie_golf_ball');
    expect(closestSizeReference(silkieChickenConfig, 590).id).toBe('silkie_grapefruit');
    expect(closestSizeReference(silkieChickenConfig, 1100).id).toBe('silkie_teapot');
    expect(getSizeReferences(leopardGeckoConfig)).toHaveLength(3);
    expect(getSizeReferences(greenSeaTurtleConfig)).toHaveLength(3);
    expect(closestSizeReference(greenSeaTurtleConfig, 25).id).toBe('turtle_lime');
    expect(closestSizeReference(greenSeaTurtleConfig, 150_000).id).toBe('turtle_adults');
  });
});
