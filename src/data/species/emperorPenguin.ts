import { localized, type SpeciesConfig } from '@/domain/types';

import { incubationArc } from './incubationArc';
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
  turningRequiredUntilDay: 0,
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
    reference: localized('an adult person', 'eine erwachsene Person'),
    behavior: speciesCopy('species.emperorPenguin.behavior'),
    fieldNotes: speciesCopy('species.emperorPenguin.notes'),
  },
  juvenile: {
    title: speciesCopy('species.emperorPenguin.juvenile'),
    scientificSummary: localized(
      'The chick wears a woolly grey and white down and is still fed in the colony. Flippers are short, and the adult tuxedo pattern has not molted in.',
      'Das Küken trägt ein wolliges grau-weißes Dunenkleid und wird in der Kolonie noch gefüttert. Die Flossen sind kurz, und das adulte Frackmuster ist noch nicht vermausert.'
    ),
  },
  adult: {
    title: speciesCopy('species.emperorPenguin.adult'),
    scientificSummary: localized(
      'Auricular patches are yellow, the back is black, and standing height is about 122 cm. Mass plateaus near 30 kg, enough for the winter fast.',
      'Die Ohrflecken sind gelb, der Rücken schwarz, die Standhöhe beträgt etwa 122 cm. Die Masse liegt auf einem Plateau nahe 30 kg, ausreichend für das Winterfasten.'
    ),
  },
  milestones: incubationArc({
    shell: 'calcareous',
    cleavage: {
      day: 0,
      title: localized('Cleavage in the pyriform egg', 'Furchung im birnenförmigen Ei'),
      summary: localized(
        'Cleavage starts while the chalky, tapered egg rests on the parent’s feet. There is no nest bowl to turn it in.',
        'Die Furchung beginnt, während das kreidige, verjüngte Ei auf den Füßen des Elterntiers liegt. Es gibt keine Nestmulde, in der es gewendet würde.'
      ),
    },
    vascular: {
      day: 8,
      title: localized('Vitelline vascular network', 'Dotter-Gefäßnetz'),
      summary: localized(
        'Extraembryonic vessels spread over a very large yolk. The embryonic heart is slow compared with a songbird, near the species base rate.',
        'Extraembryonale Gefäße breiten sich über einen sehr großen Dotter aus. Das embryonale Herz ist im Vergleich zu einem Singvogel langsam, nahe der arttypischen Grundfrequenz.'
      ),
    },
    eye: {
      day: 16,
      title: localized('Eye pigment and flipper buds', 'Augenpigment und Flossenknospen'),
      summary: localized(
        'A pigmented eye and the paddles that will become flippers are visible. The air cell sits at the blunt pole of the pear-shaped shell.',
        'Ein pigmentiertes Auge und die Paddel, die zu Flossen werden, sind sichtbar. Die Luftkammer sitzt am stumpfen Pol der birnenförmigen Schale.'
      ),
    },
    growth: {
      day: 36,
      title: localized('Down and yolk withdrawal', 'Dunen und Dotterrückzug'),
      summary: localized(
        'The embryo fills more than half the shell. Dense down develops, and the remaining yolk is drawn toward the abdomen.',
        'Der Embryo füllt mehr als die Hälfte der Schale. Dichtes Dunengefieder entsteht, und der restliche Dotter wird zum Bauch hin eingezogen.'
      ),
    },
    internalPip: {
      day: 60,
      title: localized('Internal pip at the blunt pole', 'Innerer Pick am stumpfen Pol'),
      summary: localized(
        'The beak breaks into the air cell. Clicks and soft peeps carry through the chalky shell to the parent above.',
        'Der Schnabel bricht in die Luftkammer ein. Klicken und leises Piepen dringen durch die kreidige Schale zum Elterntier darüber.'
      ),
    },
    externalPip: {
      day: 62,
      title: localized('External pip of the chalky shell', 'Äußerer Pick der kreidigen Schale'),
      summary: localized(
        'The egg tooth fractures the outer shell near the blunt end. The parent does not roll the egg; it only shelters it.',
        'Der Eizahn bricht die Außenschale nahe dem stumpfen Ende auf. Das Elterntier rollt das Ei nicht; es schützt es nur.'
      ),
    },
    emergence: {
      day: 64,
      title: localized('Emergence onto the feet', 'Schlupf auf die Füße'),
      summary: localized(
        'The chick emerges onto the parent’s feet, still under the brood pouch, at about 315 g.',
        'Das Küken schlüpft auf die Füße des Elterntiers, noch unter der Brutfalte, mit etwa 315 g.'
      ),
    },
  }),
};
