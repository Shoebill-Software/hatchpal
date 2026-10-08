import { type SpeciesConfig } from '@/domain/types';

import { incubationArc } from './incubationArc';
import { speciesShowcase } from './showcase';
import { speciesCopy } from './speciesCopy';

export const mandarinDuckConfig: SpeciesConfig = {
  id: 'mandarin_duck',
  commonName: speciesCopy('species.mandarinDuck.name'),
  scientificName: 'Aix galericulata',
  incubationDays: 28,
  adultMaturationDays: 180,
  hatchWeightGrams: 26,
  adultWeightGrams: 560,
  baseHeartRateBpm: 250,
  temperatureTargetCelsius: 37.5,
  humidityTargetPct: 60,
  taxon: 'aves',
  tag: 'waterfowl',
  egg: {
    description: speciesCopy('species.mandarinDuck.egg'),
    lengthMm: 54,
    widthMm: 40,
    massGrams: 48,
    shape: 'oval',
    speckle: 'fine',
    nest: {
      body: '#F3E2C0',
      stroke: '#D7C39A',
      highlight: '#FFF6E6',
      speckle: '#E2C99A',
      crack: '#6A4E30',
      castShadow: '#3A2A18',
    },
    candle: {
      body: '#F8E8C8',
      stroke: '#D9C4A0',
      highlight: '#FFF8EC',
      speckle: '#E6D0A4',
      interior: '#3A2814',
      yolk: '#E09030',
    },
  },
  growth: {
    glow: '#E07A3A',
    shadow: '#4A2A18',
    body: '#C45A28',
    hatchlingMeasureCm: 10,
    adultMetricKind: 'wingspan',
    adultMeasureCm: 71,
    referenceScale: 'hand',
    referenceCentimeters: 18,
    reference: 'an adult hand',
    behavior: speciesCopy('species.mandarinDuck.behavior'),
    fieldNotes: speciesCopy('species.mandarinDuck.notes'),
  },
  juvenile: {
    title: speciesCopy('species.mandarinDuck.juvenile'),
    scientificSummary: 'The duckling’s yellow down is replaced by a plain grey-brown contour plumage. Crest and sail feathers are still absent in both sexes.',
  },
  adult: {
    title: speciesCopy('species.mandarinDuck.adult'),
    scientificSummary: 'The male’s orange sails, crest, and white brow are fully expressed after the adult molt. Mass plateaus near 560 g, with a wingspan of about 71 cm.',
  },
  showcase: speciesShowcase.mandarin_duck,
  milestones: incubationArc({
    shell: 'calcareous',
    cleavage: {
      day: 0,
      title: 'Cleavage in a cavity egg',
      summary: 'Cleavage begins on the yolk of a lustrous cream-buff egg laid in a tree cavity. The shell has little speckling.',
    },
    vascular: {
      day: 3,
      title: 'Vitelline vascular network',
      summary: 'The vascular ring closes early, as in other ducks. A rapid embryonic heartbeat is visible under candling by day three.',
    },
    eye: {
      day: 7,
      title: 'Eye pigment and bill tip',
      summary: 'The pigmented eye and the flattened bill tip distinguish the waterfowl embryo. Limb buds will become webbed feet.',
    },
    growth: {
      day: 16,
      title: 'Down and webbed feet',
      summary: 'Yellow down covers the body and the webs are formed. The embryo occupies more than half the shell and shifts when candled.',
    },
    internalPip: {
      day: 26,
      title: 'Internal pip',
      summary: 'The bill enters the air cell. Peeping from inside a cavity nest is often the first sign that hatch is close.',
    },
    externalPip: {
      day: 27,
      title: 'External pip of the cream shell',
      summary: 'The egg tooth cracks the lustrous shell. Turning stops so the duckling can unzip a cap.',
    },
    emergence: {
      day: 28,
      title: 'Emergence of the duckling',
      summary: 'The duckling emerges waterproof and mobile, at about 26 g, ready to leap from the cavity.',
    },
  }),
};
