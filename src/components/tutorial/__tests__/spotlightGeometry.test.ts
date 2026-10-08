import { NEST_TUTORIAL_STEPS, NEST_TUTORIAL_STEP_COUNT, tutorialStartDelay } from '@/constants/tutorial';

import { placeTutorialCard, spotlightHole, sameTutorialRect } from '../spotlightGeometry';

describe('nest tutorial geometry', () => {
  it('walks egg, heart, warmth, moisture, then candling on the egg', () => {
    expect(NEST_TUTORIAL_STEP_COUNT).toBe(5);
    expect(NEST_TUTORIAL_STEPS.map((step) => step.target)).toEqual([
      'egg',
      'telemetry_heart',
      'warm_control',
      'mist_control',
      'egg',
    ]);
  });

  it('pads the measured page rect and uses a stadium around the egg', () => {
    const anchor = { x: 10, y: 12, width: 100, height: 140, pageX: 30, pageY: 80 };
    const hole = spotlightHole(anchor, 0, 0, 'egg');
    expect(hole.x).toBe(12);
    expect(hole.y).toBe(62);
    expect(hole.width).toBe(136);
    expect(hole.height).toBe(176);
    expect(hole.radius).toBe(68);

    const shifted = spotlightHole(anchor, 5, 7, 'telemetry_heart');
    expect(shifted.x).toBe(13);
    expect(shifted.y).toBe(61);
    expect(shifted.radius).toBe(16);
  });

  it('ignores sub-pixel measure noise', () => {
    const base = { x: 1, y: 2, width: 40, height: 20, pageX: 8, pageY: 9 };
    expect(sameTutorialRect(base, { ...base, pageX: 8.4 })).toBe(true);
    expect(sameTutorialRect(base, { ...base, pageY: 11 })).toBe(false);
  });

  it('places the card below a high target and above a target near the bottom', () => {
    const screen = {
      screenWidth: 390,
      screenHeight: 844,
      cardHeight: 240,
      insetTop: 47,
      insetBottom: 34,
      insetLeft: 0,
      insetRight: 0,
    };
    const below = placeTutorialCard({
      ...screen,
      hole: { x: 40, y: 160, width: 200, height: 260 },
    });
    expect(below.placement).toBe('below');
    expect(below.top).toBeGreaterThanOrEqual(160 + 260);
    expect(below.left).toBeGreaterThanOrEqual(20);
    expect(below.left + below.width).toBeLessThanOrEqual(370);

    const above = placeTutorialCard({
      ...screen,
      hole: { x: 80, y: 700, width: 72, height: 90 },
    });
    expect(above.placement).toBe('above');
    expect(above.top + screen.cardHeight).toBeLessThanOrEqual(700);
    expect(above.showCaret).toBe(true);
  });

  it('keeps a wide-screen card within the editorial measure and centers it', () => {
    const placed = placeTutorialCard({
      hole: null,
      screenWidth: 900,
      screenHeight: 800,
      cardHeight: 220,
      insetTop: 0,
      insetBottom: 0,
      insetLeft: 0,
      insetRight: 0,
    });
    expect(placed.width).toBe(420);
    expect(placed.left).toBe(240);
    expect(placed.showCaret).toBe(false);
    expect(placed.top).toBeGreaterThanOrEqual(8);
  });

  it('uses a shorter delay once the nest entrance has settled', () => {
    expect(tutorialStartDelay(false, false)).toBeGreaterThan(tutorialStartDelay(true, false));
    expect(tutorialStartDelay(false, true)).toBe(tutorialStartDelay(true, true));
  });
});
