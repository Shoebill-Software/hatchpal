import {
  SPOTLIGHT_PADDING,
  TUTORIAL_CARD_GAP,
  TUTORIAL_CARD_MARGIN,
  TUTORIAL_CARD_MAX_WIDTH,
  type TutorialTargetId,
} from '@/constants/tutorial';

/** Layout captured from `View.measure`: parent origin plus page origin. */
export type TutorialRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  pageX: number;
  pageY: number;
};

export type SpotlightHole = {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
};

export type CardPlacement = {
  top: number;
  left: number;
  width: number;
  placement: 'above' | 'below';
  caretLeft: number;
  showCaret: boolean;
};

const MEASURE_EPSILON = 0.5;
const CARET_WIDTH = 16;

export function sameTutorialRect(a: TutorialRect, b: TutorialRect): boolean {
  return (
    Math.abs(a.x - b.x) < MEASURE_EPSILON &&
    Math.abs(a.y - b.y) < MEASURE_EPSILON &&
    Math.abs(a.width - b.width) < MEASURE_EPSILON &&
    Math.abs(a.height - b.height) < MEASURE_EPSILON &&
    Math.abs(a.pageX - b.pageX) < MEASURE_EPSILON &&
    Math.abs(a.pageY - b.pageY) < MEASURE_EPSILON
  );
}

export function holeRadius(target: TutorialTargetId, width: number, height: number): number {
  if (target === 'telemetry_heart') {
    return 16;
  }
  const stadium = Math.min(width, height) / 2;
  if (!Number.isFinite(stadium) || stadium <= 0) {
    return 16;
  }
  return stadium;
}

/** Hole in overlay-local coordinates, padded so the rim does not clip the control. */
export function spotlightHole(
  anchor: TutorialRect,
  originX: number,
  originY: number,
  target: TutorialTargetId
): SpotlightHole {
  const padding = SPOTLIGHT_PADDING[target];
  const width = Math.max(0, anchor.width + padding * 2);
  const height = Math.max(0, anchor.height + padding * 2);
  return {
    x: anchor.pageX - originX - padding,
    y: anchor.pageY - originY - padding,
    width,
    height,
    radius: holeRadius(target, width, height),
  };
}

export function placeTutorialCard(input: {
  hole: { x: number; y: number; width: number; height: number } | null;
  screenWidth: number;
  screenHeight: number;
  cardHeight: number;
  insetTop: number;
  insetBottom: number;
  insetLeft: number;
  insetRight: number;
}): CardPlacement {
  const minLeft = Math.max(TUTORIAL_CARD_MARGIN, input.insetLeft + 12);
  const rightInset = Math.max(TUTORIAL_CARD_MARGIN, input.insetRight + 12);
  const available = Math.max(0, input.screenWidth - minLeft - rightInset);
  const width = Math.min(TUTORIAL_CARD_MAX_WIDTH, available);
  const left = minLeft + Math.max(0, (available - width) / 2);

  const minTop = input.insetTop + 8;
  const maxBottom = input.screenHeight - input.insetBottom - 8;
  const cardHeight = Math.max(0, input.cardHeight);
  const maxTop = Math.max(minTop, maxBottom - cardHeight);

  if (!input.hole || input.hole.width < 1 || input.hole.height < 1) {
    const centered = minTop + Math.max(0, (maxBottom - minTop - cardHeight) / 2);
    return {
      top: clamp(centered, minTop, maxTop),
      left,
      width,
      placement: 'below',
      caretLeft: clamp(width / 2 - CARET_WIDTH / 2, 16, Math.max(16, width - CARET_WIDTH - 16)),
      showCaret: false,
    };
  }

  const hole = input.hole;
  const spaceAbove = hole.y - minTop;
  const spaceBelow = maxBottom - (hole.y + hole.height);
  const needed = cardHeight + TUTORIAL_CARD_GAP;
  const placeBelow = spaceBelow >= needed && spaceBelow >= spaceAbove;

  let placement: 'above' | 'below';
  let top: number;
  if (placeBelow) {
    placement = 'below';
    top = hole.y + hole.height + TUTORIAL_CARD_GAP;
  } else if (spaceAbove >= needed || spaceAbove >= spaceBelow) {
    placement = 'above';
    top = hole.y - TUTORIAL_CARD_GAP - cardHeight;
  } else {
    placement = 'below';
    top = hole.y + hole.height + TUTORIAL_CARD_GAP;
  }

  const holeCenter = hole.x + hole.width / 2;
  const rawCaret = holeCenter - left - CARET_WIDTH / 2;

  return {
    top: clamp(top, minTop, maxTop),
    left,
    width,
    placement,
    caretLeft: clamp(rawCaret, 16, Math.max(16, width - CARET_WIDTH - 16)),
    showCaret: true,
  };
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}
