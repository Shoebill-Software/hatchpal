import { type SpeciesConfig } from '@/domain/types';

import { incubationArc } from './incubationArc';
import { speciesShowcase } from './showcase';
import { speciesCopy } from './speciesCopy';

export const barnOwlConfig: SpeciesConfig = {
  id: 'barn_owl',
  commonName: speciesCopy('species.barnOwl.name'),
  scientificName: 'Tyto alba',
  incubationDays: 32,
  adultMaturationDays: 300,
  hatchWeightGrams: 15,
  adultWeightGrams: 340,
  baseHeartRateBpm: 230,
  temperatureTargetCelsius: 37.2,
  humidityTargetPct: 50,
  taxon: 'aves',
  tag: 'strigiform',
  egg: {
    description: speciesCopy('species.barnOwl.egg'),
    lengthMm: 40,
    widthMm: 32,
    massGrams: 20,
    shape: 'elliptical',
    speckle: 'none',
    nest: {
      body: '#F7F4EF',
      stroke: '#E0D8CE',
      highlight: '#FFFFFF',
      speckle: '#E7E0D6',
      crack: '#6A5C50',
      castShadow: '#2C241C',
    },
    candle: {
      body: '#FFF9F2',
      stroke: '#E6DCCA',
      highlight: '#FFFFFF',
      speckle: '#F0E6D8',
      interior: '#2A221C',
      yolk: '#E8A050',
    },
  },
  growth: {
    glow: '#E6D7B0',
    shadow: '#3A342C',
    body: '#E7D7B4',
    hatchlingMeasureCm: 9,
    adultMetricKind: 'wingspan',
    adultMeasureCm: 90,
    referenceScale: 'hand',
    referenceCentimeters: 18,
    reference: 'an adult hand',
    behavior: speciesCopy('species.barnOwl.behavior'),
    fieldNotes: speciesCopy('species.barnOwl.notes'),
  },
  juvenile: {
    title: speciesCopy('species.barnOwl.juvenile'),
    scientificSummary: 'The second, mesoptile down is buff and the facial disc is still a shallow oval. Wing quills are in blood, and flight is a short flutter.',
  },
  adult: {
    title: speciesCopy('species.barnOwl.adult'),
    scientificSummary: 'The heart-shaped facial disc, dark eyes, and golden-buff wings are complete. Mass plateaus near 340 g, with a wingspan of about 90 cm.',
  },
  showcase: speciesShowcase.barn_owl,
  milestones: incubationArc({
    shell: 'calcareous',
    cleavage: {
      day: 0,
      title: 'Cleavage in a white egg',
      summary: 'Cleavage begins on the yolk of a smooth, matte-white elliptical egg. No pigment is deposited in the shell.',
    },
    vascular: {
      day: 4,
      title: 'Vitelline vascular network',
      summary: 'The vascular ring is easy to candle through the unpigmented shell. The heart is already audible as a rapid pulse.',
    },
    eye: {
      day: 8,
      title: 'Dark eye and facial disc buds',
      summary: 'The eye is heavily pigmented early, as in other owls. Limb buds that will carry the facial disc ruff are forming.',
    },
    growth: {
      day: 18,
      title: 'Down and hooked bill',
      summary: 'White down covers the embryo and the bill is already hooked. Spontaneous movement fills the shell under a bright light.',
    },
    internalPip: {
      day: 30,
      title: 'Internal pip',
      summary: 'The beak enters the air cell. A hiss or soft peep may be heard before any shell star appears.',
    },
    externalPip: {
      day: 31,
      title: 'External pip of the white shell',
      summary: 'The egg tooth cracks the pure white shell. Turning ceases for the final rotation.',
    },
    emergence: {
      day: 32,
      title: 'Emergence of the owlet',
      summary: 'The owlet emerges sparsely downed and with closed eyes, at about 15 g, into a nest of pellets.',
    },
  }),
};
