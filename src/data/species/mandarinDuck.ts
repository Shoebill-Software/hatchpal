import { localized, type SpeciesConfig } from '@/domain/types';

import { incubationArc } from './incubationArc';
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
  turningRequiredUntilDay: 25,
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
    reference: localized('an adult hand', 'eine Erwachsenenhand'),
    behavior: speciesCopy('species.mandarinDuck.behavior'),
    fieldNotes: speciesCopy('species.mandarinDuck.notes'),
  },
  juvenile: {
    title: speciesCopy('species.mandarinDuck.juvenile'),
    scientificSummary: localized(
      'The duckling’s yellow down is replaced by a plain grey-brown contour plumage. Crest and sail feathers are still absent in both sexes.',
      'Das gelbe Dunenkleid des Kükens wird durch ein schlichtes graubraunes Konturgefieder ersetzt. Haube und Segelfedern fehlen noch bei beiden Geschlechtern.'
    ),
  },
  adult: {
    title: speciesCopy('species.mandarinDuck.adult'),
    scientificSummary: localized(
      'The male’s orange sails, crest, and white brow are fully expressed after the adult molt. Mass plateaus near 560 g, with a wingspan of about 71 cm.',
      'Die orangefarbenen Segel, die Haube und der weiße Überaugenstreif des Männchens sind nach der Adultmauser voll ausgeprägt. Die Masse liegt nahe 560 g, die Spannweite bei etwa 71 cm.'
    ),
  },
  milestones: incubationArc({
    shell: 'calcareous',
    cleavage: {
      day: 0,
      title: localized('Cleavage in a cavity egg', 'Furchung im Höhlen-Ei'),
      summary: localized(
        'Cleavage begins on the yolk of a lustrous cream-buff egg laid in a tree cavity. The shell has little speckling.',
        'Die Furchung beginnt auf dem Dotter eines glänzenden, cremefarbenen Eis, das in einer Baumhöhle liegt. Die Schale ist kaum gesprenkelt.'
      ),
    },
    vascular: {
      day: 3,
      title: localized('Vitelline vascular network', 'Dotter-Gefäßnetz'),
      summary: localized(
        'The vascular ring closes early, as in other ducks. A rapid embryonic heartbeat is visible under candling by day three.',
        'Der Gefäßring schließt sich früh, wie bei anderen Enten. Ein schneller embryonaler Herzschlag ist beim Durchleuchten schon am dritten Tag sichtbar.'
      ),
    },
    eye: {
      day: 7,
      title: localized('Eye pigment and bill tip', 'Augenpigment und Schnabelspitze'),
      summary: localized(
        'The pigmented eye and the flattened bill tip distinguish the waterfowl embryo. Limb buds will become webbed feet.',
        'Das pigmentierte Auge und die abgeflachte Schnabelspitze kennzeichnen den Entenembryo. Aus den Gliedmaßenknospen werden Schwimmfüße.'
      ),
    },
    growth: {
      day: 16,
      title: localized('Down and webbed feet', 'Dunen und Schwimmfüße'),
      summary: localized(
        'Yellow down covers the body and the webs are formed. The embryo occupies more than half the shell and shifts when candled.',
        'Gelbe Dunen bedecken den Körper, und die Schwimmhäute sind ausgebildet. Der Embryo nimmt mehr als die Hälfte der Schale ein und bewegt sich beim Durchleuchten.'
      ),
    },
    internalPip: {
      day: 26,
      title: localized('Internal pip', 'Innerer Pick'),
      summary: localized(
        'The bill enters the air cell. Peeping from inside a cavity nest is often the first sign that hatch is close.',
        'Der Schnabel dringt in die Luftkammer ein. Piepen aus der Bruthöhle ist oft das erste Zeichen, dass der Schlupf naht.'
      ),
    },
    externalPip: {
      day: 27,
      title: localized('External pip of the cream shell', 'Äußerer Pick der cremefarbenen Schale'),
      summary: localized(
        'The egg tooth cracks the lustrous shell. Turning stops so the duckling can unzip a cap.',
        'Der Eizahn bricht die glänzende Schale auf. Das Wenden endet, damit das Küken eine Kappe aufschneiden kann.'
      ),
    },
    emergence: {
      day: 28,
      title: localized('Emergence of the duckling', 'Schlupf des Kükens'),
      summary: localized(
        'The duckling emerges waterproof and mobile, at about 26 g, ready to leap from the cavity.',
        'Das Küken schlüpft wasserfest und beweglich, mit etwa 26 g, bereit zum Sprung aus der Höhle.'
      ),
    },
  }),
};
