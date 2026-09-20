import { SpeciesConfig } from '@/domain/types';

export const greenSeaTurtleConfig: SpeciesConfig = {
  id: 'green_sea_turtle',
  commonName: 'Green Sea Turtle',
  scientificName: 'Chelonia mydas',
  incubationDays: 60,
  adultMaturationDays: 730,
  baseHeartRateBpm: 90,
  temperatureTargetCelsius: 29.0,
  humidityTargetPct: 85,
  turningRequiredUntilDay: 0,
  milestones: [
    {
      day: 0,
      stage: 'cleavage',
      title: 'Nest-Chamber Clutch',
      scientificSummary:
        'Leathery egg is deposited in a humid sand chamber. Cleavage proceeds without turning; moisture preservation is critical.',
      candling: {
        bloodVesselsVisible: false,
        eyeSpotVisible: false,
        embryoSilhouettePct: 0.03,
        airCellPct: 0.04,
        movementDetectable: false,
      },
      audioTrigger: 'silent',
    },
    {
      day: 9,
      stage: 'vascular',
      title: 'Yolk Vascularization',
      scientificSummary:
        'Blood islands coalesce over the yolk sac. A slow embryonic pulse becomes detectable under strong candling light.',
      candling: {
        bloodVesselsVisible: true,
        eyeSpotVisible: false,
        embryoSilhouettePct: 0.09,
        airCellPct: 0.06,
        movementDetectable: false,
      },
      audioTrigger: 'heartbeat',
    },
    {
      day: 23,
      stage: 'organogenesis',
      title: 'Carapace Fold & Eye Spot',
      scientificSummary:
        'Carapacial ridge forms. The pigmented eye is a distinct dark locus; extraembryonic membranes line the shell.',
      candling: {
        bloodVesselsVisible: true,
        eyeSpotVisible: true,
        embryoSilhouettePct: 0.26,
        airCellPct: 0.09,
        movementDetectable: true,
      },
      audioTrigger: 'heartbeat',
    },
    {
      day: 40,
      stage: 'organogenesis',
      title: 'Late Embryo Fill',
      scientificSummary:
        'Body mass occupies most of the egg. Flipper movement is occasionally visible; residual yolk remains substantial.',
      candling: {
        bloodVesselsVisible: true,
        eyeSpotVisible: true,
        embryoSilhouettePct: 0.6,
        airCellPct: 0.13,
        movementDetectable: true,
      },
      audioTrigger: 'embryo_movement',
    },
    {
      day: 57,
      stage: 'internal_pip',
      title: 'Internal Pip',
      scientificSummary:
        'Beak pierces into the air cell. Pulmonary breathing begins in the crowded nest chamber before the shell is opened.',
      candling: {
        bloodVesselsVisible: false,
        eyeSpotVisible: false,
        embryoSilhouettePct: 0.82,
        airCellPct: 0.2,
        movementDetectable: true,
      },
      audioTrigger: 'internal_chirp',
    },
    {
      day: 59,
      stage: 'external_pip',
      title: 'External Pip',
      scientificSummary:
        'Caruncle ruptures the leathery shell. Hatchlings often wait for siblings so the cohort emerges together.',
      candling: {
        bloodVesselsVisible: false,
        eyeSpotVisible: false,
        embryoSilhouettePct: 0.92,
        airCellPct: 0.22,
        movementDetectable: true,
      },
      audioTrigger: 'shell_pip',
    },
    {
      day: 60,
      stage: 'hatchling',
      title: 'Emergence',
      scientificSummary:
        'Hatchling completes yolk internalization, opens the nest plug with siblings, and begins the crawl toward the sea.',
      candling: {
        bloodVesselsVisible: false,
        eyeSpotVisible: false,
        embryoSilhouettePct: 1.0,
        airCellPct: 0.0,
        movementDetectable: true,
      },
      audioTrigger: 'hatch_call',
    },
  ],
};
