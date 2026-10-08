import { type SpeciesConfig } from '@/domain/types';

import { incubationArc } from './incubationArc';
import { speciesShowcase } from './showcase';
import { speciesCopy } from './speciesCopy';

export const peregrineFalconConfig: SpeciesConfig = {
  id: 'peregrine_falcon',
  commonName: speciesCopy('species.peregrineFalcon.name'),
  scientificName: 'Falco peregrinus',
  incubationDays: 33,
  adultMaturationDays: 365,
  hatchWeightGrams: 38,
  adultWeightGrams: 910,
  baseHeartRateBpm: 260,
  temperatureTargetCelsius: 37.5,
  humidityTargetPct: 45,
  taxon: 'aves',
  tag: 'raptor',
  egg: {
    description: speciesCopy('species.peregrineFalcon.egg'),
    lengthMm: 52,
    widthMm: 41,
    massGrams: 47,
    shape: 'oval',
    speckle: 'mottled',
    nest: {
      body: '#C46A45',
      stroke: '#8C3E28',
      highlight: '#F0C2A4',
      speckle: '#6E2E1C',
      crack: '#3A1C12',
      castShadow: '#2A1610',
    },
    candle: {
      body: '#E8A07A',
      stroke: '#A85A38',
      highlight: '#F8D8C4',
      speckle: '#8C4030',
      interior: '#3A1C12',
      yolk: '#D07028',
    },
  },
  growth: {
    glow: '#C4A574',
    shadow: '#3A2418',
    body: '#6E5438',
    hatchlingMeasureCm: 12,
    adultMetricKind: 'wingspan',
    adultMeasureCm: 104,
    referenceScale: 'hand',
    referenceCentimeters: 18,
    reference: 'an adult hand',
    behavior: speciesCopy('species.peregrineFalcon.behavior'),
    fieldNotes: speciesCopy('species.peregrineFalcon.notes'),
  },
  juvenile: {
    title: speciesCopy('species.peregrineFalcon.juvenile'),
    scientificSummary: 'White natal down is replaced by dark brown contour feathers with buff margins. The wings are already long, but the slate crown and black hood of the adult are absent.',
  },
  adult: {
    title: speciesCopy('species.peregrineFalcon.adult'),
    scientificSummary: 'The crown is slate, the malar stripe is black, and the underside is barred. Body mass settles near 910 g, and the wingspan used in a stoop is about 104 cm.',
  },
  showcase: speciesShowcase.peregrine_falcon,
  milestones: incubationArc({
    shell: 'calcareous',
    cleavage: {
      day: 0,
      title: 'Cleavage on the yolk',
      summary: 'Meroblastic cleavage begins in the blastoderm of a newly laid, heavily speckled egg. The germinal disc is still a pale spot on the yolk.',
    },
    vascular: {
      day: 4,
      title: 'Vitelline vascular network',
      summary: 'Blood islands link into a sinus terminalis. A faint embryonic heart is already driving circulation across the yolk.',
    },
    eye: {
      day: 8,
      title: 'Pigmented eye and limb buds',
      summary: 'The chorioallantois spreads under the shell. A dark eye spot and the buds of wings and legs are visible under the light.',
    },
    growth: {
      day: 18,
      title: 'Down and folded wings',
      summary: 'The embryo turns along the long axis. Down covers the body, and the folded wings already hint at the adult span.',
    },
    internalPip: {
      day: 31,
      title: 'Internal pip into the air cell',
      summary: 'The beak enters the air cell at the blunt pole. Pulmonary breathing starts, and faint peeping can be heard through the shell.',
    },
    externalPip: {
      day: 32,
      title: 'External pip of the russet shell',
      summary: 'The egg tooth stars the calcified, speckled shell. Turning stops so the eyas can rotate and zip the cap.',
    },
    emergence: {
      day: 33,
      title: 'Emergence of the eyas',
      summary: 'The chick kicks free, wet and covered in white down, with open eyes. Mass at emergence is about 38 g.',
    },
  }),
};
