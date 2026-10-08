import { type SpeciesConfig } from '@/domain/types';

import { incubationArc } from './incubationArc';
import { speciesShowcase } from './showcase';
import { speciesCopy } from './speciesCopy';

export const commonOstrichConfig: SpeciesConfig = {
  id: 'common_ostrich',
  commonName: speciesCopy('species.commonOstrich.name'),
  scientificName: 'Struthio camelus',
  incubationDays: 42,
  adultMaturationDays: 912,
  hatchWeightGrams: 850,
  adultWeightGrams: 105_000,
  baseHeartRateBpm: 110,
  temperatureTargetCelsius: 36.4,
  humidityTargetPct: 25,
  taxon: 'aves',
  tag: 'ratite',
  egg: {
    description: speciesCopy('species.commonOstrich.egg'),
    lengthMm: 150,
    widthMm: 125,
    massGrams: 1400,
    shape: 'pitted',
    speckle: 'pitted',
    nest: {
      body: '#F6EFE2',
      stroke: '#D9CBB4',
      highlight: '#FFF9F0',
      speckle: '#CDBBA0',
      crack: '#6A5844',
      castShadow: '#3A3024',
    },
    candle: {
      body: '#FBF6EC',
      stroke: '#E4D5BC',
      highlight: '#FFFFFF',
      speckle: '#D9C8AE',
      interior: '#3A2C1C',
      yolk: '#E0A040',
    },
  },
  growth: {
    glow: '#E2C07A',
    shadow: '#5A4630',
    body: '#1C1C1C',
    hatchlingMeasureCm: 25,
    adultMetricKind: 'length',
    adultMeasureCm: 250,
    referenceScale: 'person',
    referenceCentimeters: 170,
    reference: 'an adult person',
    behavior: speciesCopy('species.commonOstrich.behavior'),
    fieldNotes: speciesCopy('species.commonOstrich.notes'),
  },
  juvenile: {
    title: speciesCopy('species.commonOstrich.juvenile'),
    scientificSummary: 'The chick’s natal stripes give way to mottled brown body feathers. The neck is lengthening, but the bird is still far below adult standing height.',
  },
  adult: {
    title: speciesCopy('species.commonOstrich.adult'),
    scientificSummary: 'Standing height reaches about 2.5 m in a large male, and mass plateaus near 105 kg. The wings remain small relative to the legs.',
  },
  showcase: speciesShowcase.common_ostrich,
  milestones: incubationArc({
    shell: 'calcareous',
    cleavage: {
      day: 0,
      title: 'Cleavage in a giant egg',
      summary: 'Cleavage begins on an enormous yolk inside a thick, pitted, porcelain-cream shell. The pores are visible to the naked eye.',
    },
    vascular: {
      day: 6,
      title: 'Vitelline vascular network',
      summary: 'Vessels colonize a yolk larger than in any other living bird. The heartbeat is slow, matching the large embryonic mass.',
    },
    eye: {
      day: 12,
      title: 'Eye pigment and long-neck bud',
      summary: 'The pigmented eye and an already elongated neck are visible. Legs are the dominant limb buds.',
    },
    growth: {
      day: 24,
      title: 'Striped down and heavy legs',
      summary: 'The embryo fills most of the shell. Down is patterned, and the legs are thick enough that the chick will stand on hatch day.',
    },
    internalPip: {
      day: 39,
      title: 'Internal pip',
      summary: 'The beak enters the air cell of the massive shell. Clicks are low and carry through the thick calcite.',
    },
    externalPip: {
      day: 41,
      title: 'External pip of the pitted shell',
      summary: 'The egg tooth cracks the glossy shell. Turning of the communal clutch stops for this egg.',
    },
    emergence: {
      day: 42,
      title: 'Emergence of the striped chick',
      summary: 'The chick kicks free and stands within hours, at about 850 g, already striped buff and brown.',
    },
  }),
};
