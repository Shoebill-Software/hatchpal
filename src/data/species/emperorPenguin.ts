import { type SpeciesConfig } from '@/domain/types';

import { incubationArc } from './incubationArc';
import { speciesShowcase } from './showcase';
import { speciesCopy } from './speciesCopy';

export const emperorPenguinConfig: SpeciesConfig = {
  id: 'emperor_penguin',
  commonName: speciesCopy('species.emperorPenguin.name'),
  scientificName: 'Aptenodytes forsteri',
  incubationDays: 64,
  adultMaturationDays: 1460,
  hatchWeightGrams: 315,
  adultWeightGrams: 30_000,
  baseHeartRateBpm: 140,
  temperatureTargetCelsius: 36.1,
  humidityTargetPct: 60,
  taxon: 'aves',
  tag: 'sphenisciform',
  egg: {
    description: speciesCopy('species.emperorPenguin.egg'),
    lengthMm: 120,
    widthMm: 82,
    massGrams: 450,
    shape: 'pear',
    speckle: 'fine',
    nest: {
      body: '#E4F0E6',
      stroke: '#B7C9BC',
      highlight: '#F7FBF7',
      speckle: '#C5D4C8',
      crack: '#4A5A50',
      castShadow: '#1C2A28',
    },
    candle: {
      body: '#F4F8F2',
      stroke: '#C5D4C6',
      highlight: '#FFFFFF',
      speckle: '#D5E0D4',
      interior: '#1E3330',
      yolk: '#E0C070',
    },
  },
  growth: {
    glow: '#7EC8D6',
    shadow: '#0E3A44',
    body: '#1C1C1C',
    hatchlingMeasureCm: 20,
    adultMetricKind: 'length',
    adultMeasureCm: 122,
    referenceScale: 'person',
    referenceCentimeters: 170,
    reference: 'an adult person',
    behavior: speciesCopy('species.emperorPenguin.behavior'),
    fieldNotes: speciesCopy('species.emperorPenguin.notes'),
  },
  juvenile: {
    title: speciesCopy('species.emperorPenguin.juvenile'),
    scientificSummary: 'The chick wears a woolly grey and white down and is still fed in the colony. Flippers are short, and the adult tuxedo pattern has not molted in.',
  },
  adult: {
    title: speciesCopy('species.emperorPenguin.adult'),
    scientificSummary: 'Auricular patches are yellow, the back is black, and standing height is about 122 cm. Mass plateaus near 30 kg, enough for the winter fast.',
  },
  showcase: speciesShowcase.emperor_penguin,
  milestones: incubationArc({
    shell: 'calcareous',
    cleavage: {
      day: 0,
      title: 'Cleavage in the pyriform egg',
      summary: 'Cleavage starts while the chalky, tapered egg rests on the parent’s feet. There is no nest bowl to turn it in.',
    },
    vascular: {
      day: 8,
      title: 'Vitelline vascular network',
      summary: 'Extraembryonic vessels spread over a very large yolk. The embryonic heart is slow compared with a songbird, near the species base rate.',
    },
    eye: {
      day: 16,
      title: 'Eye pigment and flipper buds',
      summary: 'A pigmented eye and the paddles that will become flippers are visible. The air cell sits at the blunt pole of the pear-shaped shell.',
    },
    growth: {
      day: 36,
      title: 'Down and yolk withdrawal',
      summary: 'The embryo fills more than half the shell. Dense down develops, and the remaining yolk is drawn toward the abdomen.',
    },
    internalPip: {
      day: 60,
      title: 'Internal pip at the blunt pole',
      summary: 'The beak breaks into the air cell. Clicks and soft peeps carry through the chalky shell to the parent above.',
    },
    externalPip: {
      day: 62,
      title: 'External pip of the chalky shell',
      summary: 'The egg tooth fractures the outer shell near the blunt end. The parent does not roll the egg; it only shelters it.',
    },
    emergence: {
      day: 64,
      title: 'Emergence onto the feet',
      summary: 'The chick emerges onto the parent’s feet, still under the brood pouch, at about 315 g.',
    },
  }),
};
