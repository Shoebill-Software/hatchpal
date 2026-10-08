import { type SpeciesConfig } from '@/domain/types';

import { incubationArc } from './incubationArc';
import { speciesShowcase } from './showcase';
import { speciesCopy } from './speciesCopy';

export const platypusConfig: SpeciesConfig = {
  id: 'platypus',
  commonName: speciesCopy('species.platypus.name'),
  scientificName: 'Ornithorhynchus anatinus',
  incubationDays: 10,
  adultMaturationDays: 365,
  hatchWeightGrams: 1,
  adultWeightGrams: 1600,
  baseHeartRateBpm: 160,
  temperatureTargetCelsius: 32,
  humidityTargetPct: 90,
  taxon: 'monotremata',
  tag: 'monotreme',
  egg: {
    description: speciesCopy('species.platypus.egg'),
    lengthMm: 14,
    widthMm: 13,
    massGrams: 1.5,
    shape: 'sphere',
    speckle: 'none',
    nest: {
      body: '#FBFBF8',
      stroke: '#E4E0D8',
      highlight: '#FFFFFF',
      speckle: '#EEEAE4',
      crack: '#5A564E',
      castShadow: '#1C2424',
    },
    candle: {
      body: '#FFFCF8',
      stroke: '#E8E4DC',
      highlight: '#FFFFFF',
      speckle: '#F2EEE8',
      interior: '#1A2422',
      yolk: '#E8C070',
    },
  },
  growth: {
    glow: '#6A8F88',
    shadow: '#1A3330',
    body: '#6A5344',
    hatchlingMeasureCm: 1.5,
    adultMetricKind: 'length',
    adultMeasureCm: 46,
    referenceScale: 'coin',
    referenceCentimeters: 2.6,
    reference: 'a two-euro coin',
    behavior: speciesCopy('species.platypus.behavior'),
    fieldNotes: speciesCopy('species.platypus.notes'),
  },
  juvenile: {
    title: speciesCopy('species.platypus.juvenile'),
    scientificSummary: 'The young animal remains in the burrow, lapping milk from the mother’s abdominal skin. The bill is short and the tail is still filling with fat.',
  },
  adult: {
    title: speciesCopy('species.platypus.adult'),
    scientificSummary: 'The bill is broad and electroreceptive, the tail is a fat store, and total length plateaus near 46 cm. Mass settles near 1.6 kg.',
  },
  showcase: speciesShowcase.platypus,
  milestones: incubationArc({
    shell: 'monotreme',
    cleavage: {
      day: 0,
      title: 'Cleavage in a sticky sphere',
      summary: 'Cleavage begins in a tiny, leathery, spherical egg held against the mother’s abdomen. The shell is sticky and unpigmented.',
    },
    vascular: {
      day: 2,
      title: 'Vitelline vascular network',
      summary: 'A small vascular net spreads over the yolk within two days. The pulse is mammalian in tempo compared with the reptiles in this roster.',
    },
    eye: {
      day: 4,
      title: 'Bill bud and eye pigment',
      summary: 'The future bill is a short bud, and eye pigment is present. There is no shell pigment to hide the embryo.',
    },
    growth: {
      day: 6,
      title: 'Curled embryo',
      summary: 'The embryo is curled to fit a shell barely 14 mm across. Limb buds already suggest the webbed feet of the adult.',
    },
    internalPip: {
      day: 8,
      title: 'Internal pip',
      summary: 'The embryo fills the shell and the snout meets the small air space. Movement is a faint shift against the abdomen.',
    },
    externalPip: {
      day: 9,
      title: 'External slit of the leathery shell',
      summary: 'An egg tooth slits the sticky shell. The egg is not turned; it stays pressed to the skin.',
    },
    emergence: {
      day: 10,
      title: 'Emergence of the hatchling',
      summary: 'The hatchling leaves the shell at about 1 g and 1.5 cm, then stays in the burrow to lap milk from the mother’s skin. There are no nipples.',
    },
  }),
};
