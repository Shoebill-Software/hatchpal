import { type SpeciesConfig } from '@/domain/types';

import { incubationArc } from './incubationArc';
import { speciesShowcase } from './showcase';
import { speciesCopy } from './speciesCopy';

export const ballPythonConfig: SpeciesConfig = {
  id: 'ball_python',
  commonName: speciesCopy('species.ballPython.name'),
  scientificName: 'Python regius',
  incubationDays: 55,
  adultMaturationDays: 1095,
  hatchWeightGrams: 58,
  adultWeightGrams: 1500,
  baseHeartRateBpm: 48,
  temperatureTargetCelsius: 31.5,
  humidityTargetPct: 90,
  taxon: 'reptilia',
  tag: 'squamate',
  egg: {
    description: speciesCopy('species.ballPython.egg'),
    lengthMm: 70,
    widthMm: 40,
    massGrams: 65,
    shape: 'oval',
    speckle: 'fine',
    nest: {
      body: '#F6F0E4',
      stroke: '#E0D2BE',
      highlight: '#FFF9F0',
      speckle: '#E6D8C4',
      crack: '#5C4A38',
      castShadow: '#2A2218',
    },
    candle: {
      body: '#FBF6EC',
      stroke: '#E6D8C4',
      highlight: '#FFFFFF',
      speckle: '#EADFC8',
      interior: '#2A2016',
      yolk: '#E0A048',
    },
  },
  growth: {
    glow: '#C6A15A',
    shadow: '#3A2C18',
    body: '#C4A15A',
    hatchlingMeasureCm: 35,
    adultMetricKind: 'length',
    adultMeasureCm: 140,
    referenceScale: 'hand',
    referenceCentimeters: 18,
    reference: 'an adult hand',
    behavior: speciesCopy('species.ballPython.behavior'),
    fieldNotes: speciesCopy('species.ballPython.notes'),
  },
  juvenile: {
    title: speciesCopy('species.ballPython.juvenile'),
    scientificSummary: 'The hatchling pattern of gold blotches on brown is already stable. The body thickens as a constriction hunter, and the defensive ball-curl remains the typical response.',
  },
  adult: {
    title: speciesCopy('species.ballPython.adult'),
    scientificSummary: 'Pattern contrast remains, and mass plateaus near 1.5 kg. Total length is typically about 140 cm after three years.',
  },
  showcase: speciesShowcase.ball_python,
  milestones: incubationArc({
    shell: 'leathery',
    cleavage: {
      day: 0,
      title: 'Cleavage in an adherent egg',
      summary: 'Cleavage begins in a large, leathery, cream-white egg stuck to its clutch-mates. The female’s coils supply the heat.',
    },
    vascular: {
      day: 8,
      title: 'Extraembryonic vascular network',
      summary: 'Vessels spread over the yolk and show clearly through the parchment shell. The pulse is slow, near 48 beats per minute.',
    },
    eye: {
      day: 18,
      title: 'Eye pigment and coiled body',
      summary: 'A pigmented eye sits on a body already coiled to fit the shell. Scales are forming over the trunk.',
    },
    growth: {
      day: 35,
      title: 'Patterned embryo',
      summary: 'Gold blotches are visible through the shell under a strong light. The embryo occupies most of the egg and shifts when the clutch is candled.',
    },
    internalPip: {
      day: 50,
      title: 'Internal pip',
      summary: 'The snout enters the air cell. The adherent eggs stay in the female’s coil; they are never rolled.',
    },
    externalPip: {
      day: 53,
      title: 'External slit of the leathery shell',
      summary: 'The egg tooth slits the cream shell. Neighboring eggs often pip within the same day.',
    },
    emergence: {
      day: 55,
      title: 'Emergence of the neonate',
      summary: 'The hatchling leaves the shell at about 58 g and 35 cm, patterned and independent, and may roll into a defensive ball.',
    },
  }),
};
