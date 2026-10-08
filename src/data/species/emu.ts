import type { SpeciesConfig } from '@/domain/types';

import { speciesShowcase } from './showcase';

export const emuConfig: SpeciesConfig = {
  id: 'emu',
  commonName: 'Emu',
  scientificName: 'Dromaius novaehollandiae',
  incubationDays: 56,
  adultMaturationDays: 540,
  hatchWeightGrams: 500,
  adultWeightGrams: 36_000,
  baseHeartRateBpm: 175,
  temperatureTargetCelsius: 35.8,
  humidityTargetPct: 30,
  taxon: 'aves',
  tag: 'ratite',
  egg: {
    description: 'Heavy, dark green egg with a thick granulated shell.',
    lengthMm: 134,
    widthMm: 89,
    massGrams: 580,
    shape: 'elliptical',
    speckle: 'pitted',
    nest: {
      body: '#1B3F2C',
      stroke: '#0E2418',
      highlight: '#4A7A58',
      speckle: '#0F2A1C',
      crack: '#0A1810',
      castShadow: '#07140E',
    },
    candle: {
      body: '#2A5A3C',
      stroke: '#143222',
      highlight: '#6A9A74',
      speckle: '#163828',
      interior: '#1A1208',
      yolk: '#C45A1C',
    },
  },
  growth: {
    glow: '#3E6B4A',
    shadow: '#14281C',
    body: '#4A5C48',
    hatchlingMeasureCm: 25,
    adultMetricKind: 'length',
    adultMeasureCm: 170,
    referenceScale: 'person',
    referenceCentimeters: 170,
    reference: 'an adult person',
    behavior:
      'A ground-nesting ratite. The male incubates the dark green clutch, and the striped chick walks within hours. Adult height is in the legs and neck, not in the wings.',
    fieldNotes:
      'Emu eggs incubate for about 56 days at a relatively cool 35.8 °C and low humidity. Turn through day 49, then lock down. The chick internally pips around day 52 and opens the thick shell near day 54. Full stature takes about 18 months.',
  },
  juvenile: {
    title: 'Striped juvenile plumage',
    scientificSummary:
      'The hatchling’s longitudinal stripes fade as contour feathers replace the down. The legs lengthen quickly, and daily mass gain is steepest in this window.',
  },
  adult: {
    title: 'Adult body mass',
    scientificSummary:
      'The shaggy grey-brown plumage, bare blue neck skin, and long legs are fully expressed. Body mass settles near 36 kg and standing height near 170 cm.',
  },
  showcase: speciesShowcase.emu,
  milestones: [
    {
      day: 0,
      stage: 'cleavage',
      title: 'Freshly Laid Ratite Egg',
      scientificSummary:
        'The dark, granulated shell conceals a large yolk. Cleavage proceeds on the blastodisc while the heavy egg rests in a stable nest.',
      candling: {
        bloodVesselsVisible: false,
        eyeSpotVisible: false,
        embryoSilhouettePct: 0.03,
        airCellPct: 0.05,
        movementDetectable: false,
      },
      audioTrigger: 'silent',
    },
    {
      day: 8,
      stage: 'vascular',
      title: 'Vitelline Circulation',
      scientificSummary:
        'Blood islands coalesce across the yolk. A slow embryonic pulse can be resolved only under intense transillumination through the thick shell.',
      candling: {
        bloodVesselsVisible: true,
        eyeSpotVisible: false,
        embryoSilhouettePct: 0.1,
        airCellPct: 0.07,
        movementDetectable: false,
      },
      audioTrigger: 'heartbeat',
    },
    {
      day: 21,
      stage: 'organogenesis',
      title: 'Limb Buds & Eye Pigment',
      scientificSummary:
        'Forelimb and hindlimb buds differentiate. Cranial pigmentation makes a faint eye locus visible where the shell is thinnest.',
      candling: {
        bloodVesselsVisible: true,
        eyeSpotVisible: true,
        embryoSilhouettePct: 0.28,
        airCellPct: 0.1,
        movementDetectable: true,
      },
      audioTrigger: 'heartbeat',
    },
    {
      day: 38,
      stage: 'organogenesis',
      title: 'Late Embryo Fill',
      scientificSummary:
        'The chick occupies most of the egg volume. Spontaneous limb movement is occasionally detectable; residual yolk remains substantial.',
      candling: {
        bloodVesselsVisible: true,
        eyeSpotVisible: true,
        embryoSilhouettePct: 0.62,
        airCellPct: 0.14,
        movementDetectable: true,
      },
      audioTrigger: 'embryo_movement',
    },
    {
      day: 52,
      stage: 'internal_pip',
      title: 'Internal Pip',
      scientificSummary:
        'The beak enters the air cell. Pulmonary respiration begins while the chick finishes absorbing yolk and orients for external pip.',
      candling: {
        bloodVesselsVisible: false,
        eyeSpotVisible: false,
        embryoSilhouettePct: 0.84,
        airCellPct: 0.2,
        movementDetectable: true,
      },
      audioTrigger: 'internal_chirp',
    },
    {
      day: 54,
      stage: 'external_pip',
      title: 'External Pip',
      scientificSummary:
        'The egg tooth stars the thick green shell. Turning has already ceased; hatching is slow and must not be assisted.',
      candling: {
        bloodVesselsVisible: false,
        eyeSpotVisible: false,
        embryoSilhouettePct: 0.92,
        airCellPct: 0.23,
        movementDetectable: true,
      },
      audioTrigger: 'shell_pip',
    },
    {
      day: 56,
      stage: 'hatchling',
      title: 'Emergence',
      scientificSummary:
        'The striped chick completes rotation, pushes the cap open, and emerges exhausted onto the nest floor.',
      candling: {
        bloodVesselsVisible: false,
        eyeSpotVisible: false,
        embryoSilhouettePct: 1,
        airCellPct: 0,
        movementDetectable: true,
      },
      audioTrigger: 'hatch_call',
    },
  ],
};
