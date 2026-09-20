import { SpeciesConfig } from '@/domain/types';

export const leopardGeckoConfig: SpeciesConfig = {
  id: 'leopard_gecko',
  commonName: 'Leopard Gecko',
  scientificName: 'Eublepharis macularius',
  incubationDays: 50,
  adultMaturationDays: 330,
  baseHeartRateBpm: 110,
  temperatureTargetCelsius: 31.0,
  humidityTargetPct: 75,
  turningRequiredUntilDay: 0,
  milestones: [
    {
      day: 0,
      stage: 'cleavage',
      title: 'Freshly Laid Clutch Egg',
      scientificSummary:
        'Calcareous parchment shell is still flexible. Embryonic disc sits on the yolk; adhesive patch anchors the egg to substrate.',
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
      day: 7,
      stage: 'vascular',
      title: 'Extraembryonic Circulation',
      scientificSummary:
        'Vitelline vessels spread across the yolk. A faint embryonic heartbeat can be resolved under bright transillumination.',
      candling: {
        bloodVesselsVisible: true,
        eyeSpotVisible: false,
        embryoSilhouettePct: 0.1,
        airCellPct: 0.06,
        movementDetectable: false,
      },
      audioTrigger: 'heartbeat',
    },
    {
      day: 19,
      stage: 'organogenesis',
      title: 'Limb Buds & Eye Pigment',
      scientificSummary:
        'Forelimb and hindlimb buds differentiate. Cranial pigmentation makes the eye spot visible through the translucent shell.',
      candling: {
        bloodVesselsVisible: true,
        eyeSpotVisible: true,
        embryoSilhouettePct: 0.28,
        airCellPct: 0.09,
        movementDetectable: true,
      },
      audioTrigger: 'heartbeat',
    },
    {
      day: 33,
      stage: 'organogenesis',
      title: 'Scale Anlage & Body Flexion',
      scientificSummary:
        'Embryo occupies much of the egg volume. Spontaneous trunk flexion is visible; dermal scale primordia begin patterning.',
      candling: {
        bloodVesselsVisible: true,
        eyeSpotVisible: true,
        embryoSilhouettePct: 0.58,
        airCellPct: 0.12,
        movementDetectable: true,
      },
      audioTrigger: 'embryo_movement',
    },
    {
      day: 47,
      stage: 'internal_pip',
      title: 'Internal Pip',
      scientificSummary:
        'Snout enters the air space. Pulmonary respiration starts while residual yolk continues to be absorbed.',
      candling: {
        bloodVesselsVisible: false,
        eyeSpotVisible: false,
        embryoSilhouettePct: 0.8,
        airCellPct: 0.18,
        movementDetectable: true,
      },
      audioTrigger: 'internal_chirp',
    },
    {
      day: 49,
      stage: 'external_pip',
      title: 'External Pip',
      scientificSummary:
        'Egg tooth slits the flexible shell. Emergence is slow; the neonate remains partially enclosed while yolk is finished.',
      candling: {
        bloodVesselsVisible: false,
        eyeSpotVisible: false,
        embryoSilhouettePct: 0.9,
        airCellPct: 0.2,
        movementDetectable: true,
      },
      audioTrigger: 'shell_pip',
    },
    {
      day: 50,
      stage: 'hatchling',
      title: 'Emergence',
      scientificSummary:
        'Hatchling fully exits the shell, often overnight, and begins terrestrial locomotion on moist substrate.',
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
