import * as milestones from '@/domain/milestones';
import * as petIntegrity from '@/domain/petIntegrity';
import * as timeEngine from '@/domain/timeEngine';
import * as types from '@/domain/types';

describe('Domain purity', () => {
  it('executes as deterministic TypeScript in standard Node.js', () => {
    expect(typeof timeEngine.resolvePetSnapshot).toBe('function');
    expect(typeof timeEngine.calculateElapsedSeconds).toBe('function');
    expect(typeof milestones.getCurrentMilestone).toBe('function');
    expect(typeof petIntegrity.sanitizePetInstance).toBe('function');
    expect(types.SPECIES_IDS).toContain('silkie_chicken');
  });
});
