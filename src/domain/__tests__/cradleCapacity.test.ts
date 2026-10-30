import {
  adjacentCradle,
  adoptionIntent,
  chooseCradleSlot,
  cradleOffer,
  type CradleGate,
} from '@/domain/cradleCapacity';

describe('cradle gates', () => {
  const free: CradleGate = { occupied: 1, allowance: 1, isPro: false };
  const earned: CradleGate = { occupied: 1, allowance: 2, isPro: false };
  const earnedFull: CradleGate = { occupied: 2, allowance: 2, isPro: false };
  const pro: CradleGate = { occupied: 2, allowance: 3, isPro: true };

  it('keeps a swipe inside the eggs that are already home', () => {
    expect(adjacentCradle(0, -1, 1)).toBeNull();
    expect(adjacentCradle(0, 1, 1)).toBeNull();
    expect(adjacentCradle(0, 1, 2)).toBe(1);
    expect(adjacentCradle(1, -1, 2)).toBe(0);
    expect(adjacentCradle(1, 1, 2)).toBeNull();
    expect(adjacentCradle(1.5, 1, 2)).toBeNull();
  });

  it('opens the next nest for free, earned, and pro keepers', () => {
    expect(chooseCradleSlot(0, { occupied: 0, allowance: 1, isPro: false })).toBe('adopt');
    expect(chooseCradleSlot(0, free)).toBe('switch');
    expect(chooseCradleSlot(1, free)).toBe('paywall');
    expect(cradleOffer(free)).toBe('earn');

    expect(chooseCradleSlot(1, earned)).toBe('adopt');
    expect(cradleOffer(earned)).toBe('open');
    expect(chooseCradleSlot(2, earnedFull)).toBe('paywall');
    expect(cradleOffer(earnedFull)).toBe('pass');

    expect(chooseCradleSlot(2, pro)).toBe('adopt');
    expect(cradleOffer(pro)).toBe('open');
    expect(chooseCradleSlot(3, { occupied: 3, allowance: 3, isPro: true })).toBe('none');
    expect(cradleOffer({ occupied: 3, allowance: 3, isPro: true })).toBe('hidden');
  });

  it('does not let a pro allowance lag close the third nest', () => {
    const stale = { occupied: 2, allowance: 1, isPro: true };
    expect(chooseCradleSlot(2, stale)).toBe('adopt');
    expect(cradleOffer(stale)).toBe('open');
  });

  it('agrees on the add control for an empty, single, and double nest', () => {
    const gates: CradleGate[] = [
      { occupied: 0, allowance: 1, isPro: false },
      free,
      earned,
      earnedFull,
      pro,
      { occupied: 3, allowance: 3, isPro: true },
    ];
    for (const gate of gates) {
      const offer = cradleOffer(gate);
      const choice = chooseCradleSlot(gate.occupied, gate);
      if (offer === 'hidden') {
        expect(choice).toBe('none');
      } else if (offer === 'open') {
        expect(choice).toBe('adopt');
      } else {
        expect(choice).toBe('paywall');
      }
    }
  });
});

describe('adoption entry', () => {
  it('begins on an empty nest, even if a replace or add flag was left behind', () => {
    expect(adoptionIntent({ adding: false, hasPet: false })).toBe('begin');
    expect(adoptionIntent({ adding: true, hasPet: false })).toBe('begin');
  });

  it('adds beside an egg and replaces when the visit is not an add', () => {
    expect(adoptionIntent({ adding: true, hasPet: true })).toBe('add');
    expect(adoptionIntent({ adding: false, hasPet: true })).toBe('replace');
  });
});
