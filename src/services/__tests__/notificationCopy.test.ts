import { listSpeciesConfigs } from '@/data/species';
import { americanRobinConfig } from '@/data/species/robin';
import { silkieChickenConfig } from '@/data/species/chicken';
import type { BiologicalMilestone } from '@/domain/types';

import { ALERT_BODY_LIMIT, milestoneAlertCopy, milestoneAlertSubtitle } from '../notificationCopy';

const TURNING_ORDER = /\bturning\b|\bturned\b|\bturn (?:it|the)\b/i;

describe('milestone alert copy', () => {
  it('names the keeper and the incubation day', () => {
    expect(milestoneAlertSubtitle('  Pip  ', 19.8, 'Silkie Chicken')).toBe('Pip · Day 19');
    expect(milestoneAlertSubtitle('   ', 3, 'Silkie Chicken')).toBe('Silkie Chicken · Day 3');
  });

  it('follows the species milestone and never orders a turn', () => {
    const external = milestone(silkieChickenConfig.milestones, 20);
    const copy = milestoneAlertCopy(external, silkieChickenConfig);
    expect(copy).toEqual({
      title: 'External Pip',
      body: 'Egg tooth fractures the outer calcified shell. Keep the nest still and warm.',
    });
    expect(copy?.body).not.toMatch(TURNING_ORDER);
  });

  it('keeps the embryo turning along its axis and drops the order to stop', () => {
    const growth = milestoneAlertCopy(milestone(silkieChickenConfig.milestones, 14), silkieChickenConfig);
    expect(growth?.body).toContain('Embryo turns along the long axis.');
    expect(growth?.body).not.toMatch(TURNING_ORDER);

    const robin = milestoneAlertCopy(milestone(americanRobinConfig.milestones, 12), americanRobinConfig);
    expect(robin?.body).toContain('Pulmonary breathing begins.');
    expect(robin?.body).not.toMatch(TURNING_ORDER);
  });

  it('stays quiet for the moment of laying', () => {
    const cleavage = milestone(silkieChickenConfig.milestones, 0);
    expect(milestoneAlertCopy(cleavage, silkieChickenConfig)).toBeNull();
  });

  it('covers every living species without drifting past the lock screen', () => {
    for (const species of listSpeciesConfigs()) {
      const notifiable = species.milestones.filter(
        (entry) => entry.day > 0 && entry.stage !== 'cleavage'
      );
      expect(notifiable.length).toBeGreaterThanOrEqual(6);
      const stages = new Set(notifiable.map((entry) => entry.stage));
      expect(stages.has('internal_pip')).toBe(true);
      expect(stages.has('external_pip')).toBe(true);
      expect(stages.has('hatchling')).toBe(true);

      for (const entry of species.milestones) {
        const copy = milestoneAlertCopy(entry, species);
        if (entry.day <= 0 || entry.stage === 'cleavage') {
          expect(copy).toBeNull();
          continue;
        }
        expect(copy?.title).toBe(entry.title.trim());
        expect(copy?.body.length).toBeGreaterThan(12);
        expect(copy?.body.length).toBeLessThanOrEqual(ALERT_BODY_LIMIT);
        expect(copy?.body).not.toMatch(TURNING_ORDER);
      }
    }
  });
});

function milestone(milestones: readonly BiologicalMilestone[], day: number): BiologicalMilestone {
  const found = milestones.find((entry) => entry.day === day);
  if (!found) {
    throw new Error(`missing milestone day ${day}`);
  }
  return found;
}
