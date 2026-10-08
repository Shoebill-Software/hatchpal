import { type SpeciesConfig } from '@/domain/types';

import { incubationArc } from './incubationArc';
import { speciesShowcase } from './showcase';
import { speciesCopy } from './speciesCopy';

export const saltwaterCrocodileConfig: SpeciesConfig = {
  id: 'saltwater_crocodile',
  commonName: speciesCopy('species.saltwaterCrocodile.name'),
  scientificName: 'Crocodylus porosus',
  incubationDays: 85,
  adultMaturationDays: 4380,
  hatchWeightGrams: 70,
  adultWeightGrams: 450_000,
  baseHeartRateBpm: 55,
  temperatureTargetCelsius: 31.6,
  humidityTargetPct: 98,
  taxon: 'reptilia',
  tag: 'crocodilian',
  egg: {
    description: speciesCopy('species.saltwaterCrocodile.egg'),
    lengthMm: 80,
    widthMm: 50,
    massGrams: 110,
    shape: 'elongated',
    speckle: 'mottled',
    nest: {
      body: '#F3F1EC',
      stroke: '#C8C2B6',
      highlight: '#FFFCF8',
      speckle: '#D5D0C6',
      crack: '#4A463E',
      castShadow: '#1A2420',
    },
    candle: {
      body: '#F7F4EE',
      stroke: '#D2CCC0',
      highlight: '#FFFFFF',
      speckle: '#DDD6CA',
      interior: '#1A2218',
      yolk: '#D8A060',
    },
  },
  growth: {
    glow: '#3E5C48',
    shadow: '#14241C',
    body: '#4A5A3A',
    hatchlingMeasureCm: 28,
    adultMetricKind: 'length',
    adultMeasureCm: 480,
    referenceScale: 'person',
    referenceCentimeters: 170,
    reference: 'an adult person',
    behavior: speciesCopy('species.saltwaterCrocodile.behavior'),
    fieldNotes: speciesCopy('species.saltwaterCrocodile.notes'),
  },
  juvenile: {
    title: speciesCopy('species.saltwaterCrocodile.juvenile'),
    scientificSummary: 'Black bands cross a gold-olive body. The snout is already long, but the animal is still small enough to be carried in a parent’s mouth.',
  },
  adult: {
    title: speciesCopy('species.saltwaterCrocodile.adult'),
    scientificSummary: 'Bands fade and the skull broadens. A large male approaches 4.8 m and a mass near 450 kg on this twelve-year clock.',
  },
  showcase: speciesShowcase.saltwater_crocodile,
  milestones: incubationArc({
    shell: 'calcareous',
    cleavage: {
      day: 0,
      title: 'Cleavage in the mound',
      summary: 'Cleavage begins in a hard white egg buried in a vegetation mound. The shell is an elongated ellipsoid with a rough calcareous texture.',
    },
    vascular: {
      day: 12,
      title: 'Extraembryonic vascular network',
      summary: 'Vitelline vessels spread over the yolk. The embryonic heart is slow, near 55 beats per minute, and visible as a dark pulse.',
    },
    eye: {
      day: 28,
      title: 'Eye pigment and snout bud',
      summary: 'A pigmented eye and the elongated snout are distinct. Limb buds will become the short, clawed legs of a mound hatchling.',
    },
    growth: {
      day: 55,
      title: 'Banded embryo and yolk sac',
      summary: 'Dark bands are already laid down in the skin. The embryo fills most of the shell and shifts when the mound is opened for candling.',
    },
    internalPip: {
      day: 80,
      title: 'Internal pip',
      summary: 'The snout enters the air cell. Hatchlings often grunt before the shell is breached, a signal to the attending adult.',
    },
    externalPip: {
      day: 83,
      title: 'External pip of the calcareous shell',
      summary: 'The egg tooth cracks the hard white shell. Mound eggs are not turned; heat and humidity come from the rotting vegetation.',
    },
    emergence: {
      day: 85,
      title: 'Emergence from the mound',
      summary: 'The hatchling leaves the shell at about 70 g and 28 cm, banded and calling, ready to be carried to the water.',
    },
  }),
};
