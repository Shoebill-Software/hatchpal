import { type SpeciesConfig } from '@/domain/types';

import { incubationArc } from './incubationArc';
import { speciesShowcase } from './showcase';
import { speciesCopy } from './speciesCopy';

export const veiledChameleonConfig: SpeciesConfig = {
  id: 'veiled_chameleon',
  commonName: speciesCopy('species.veiledChameleon.name'),
  scientificName: 'Chamaeleo calyptratus',
  incubationDays: 180,
  adultMaturationDays: 270,
  hatchWeightGrams: 0.5,
  adultWeightGrams: 140,
  baseHeartRateBpm: 70,
  temperatureTargetCelsius: 28,
  humidityTargetPct: 80,
  taxon: 'reptilia',
  tag: 'squamate',
  egg: {
    description: speciesCopy('species.veiledChameleon.egg'),
    lengthMm: 18,
    widthMm: 11,
    massGrams: 1.5,
    shape: 'elongated',
    speckle: 'fine',
    nest: {
      body: '#F4F1EA',
      stroke: '#DDD4C6',
      highlight: '#FFFCF7',
      speckle: '#E4DCCE',
      crack: '#5C5044',
      castShadow: '#243028',
    },
    candle: {
      body: '#F8F4EC',
      stroke: '#E0D6C8',
      highlight: '#FFFFFF',
      speckle: '#E8E0D4',
      interior: '#1C2A20',
      yolk: '#D0A050',
    },
  },
  growth: {
    glow: '#1F7A4D',
    shadow: '#0E3A28',
    body: '#2E8B57',
    hatchlingMeasureCm: 7,
    adultMetricKind: 'length',
    adultMeasureCm: 50,
    referenceScale: 'coin',
    referenceCentimeters: 2.6,
    reference: 'a two-euro coin',
    behavior: speciesCopy('species.veiledChameleon.behavior'),
    fieldNotes: speciesCopy('species.veiledChameleon.notes'),
  },
  juvenile: {
    title: speciesCopy('species.veiledChameleon.juvenile'),
    scientificSummary: 'The casque is only a low ridge, and the pastel banding is faint. The tail is already prehensile, and the animal hunts insects in the branches.',
  },
  adult: {
    title: speciesCopy('species.veiledChameleon.adult'),
    scientificSummary: 'Males carry a tall casque and high-contrast bands. Total length including the tail plateaus near 50 cm, and mass near 140 g.',
  },
  showcase: speciesShowcase.veiled_chameleon,
  milestones: incubationArc({
    shell: 'leathery',
    cleavage: {
      day: 0,
      title: 'Cleavage in a buried capsule',
      summary: 'Cleavage begins inside a small, soft, leathery white egg buried in moist substrate. The shell flexes under light pressure.',
    },
    vascular: {
      day: 20,
      title: 'Extraembryonic vascular network',
      summary: 'Vitelline vessels spread across the yolk. Through the translucent shell a faint heartbeat can be candled.',
    },
    eye: {
      day: 50,
      title: 'Eye turret and limb buds',
      summary: 'The turreted eye and the zygodactyl foot buds are forming. Pigment is still pale compared with the adult.',
    },
    growth: {
      day: 110,
      title: 'Coiled tail and low casque',
      summary: 'The embryo fills most of the capsule. The tail is coiled, and the casque is only a ridge on the skull.',
    },
    internalPip: {
      day: 168,
      title: 'Internal pip',
      summary: 'The snout enters the small air space. The embryo shifts inside the leathery shell before any slit appears.',
    },
    externalPip: {
      day: 176,
      title: 'External slit of the capsule',
      summary: 'The egg tooth slits the soft shell. Buried eggs are not turned; moisture alone keeps the capsule pliable.',
    },
    emergence: {
      day: 180,
      title: 'Emergence of the climber',
      summary: 'The hatchling leaves the capsule at about 0.5 g and climbs at once, already able to grasp with feet and tail.',
    },
  }),
};
