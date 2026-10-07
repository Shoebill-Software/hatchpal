import { localized, type SpeciesConfig } from '@/domain/types';

import { incubationArc } from './incubationArc';
import { speciesCopy } from './speciesCopy';

export const veiledChameleonConfig: SpeciesConfig = {
  id: 'veiled_chameleon',
  commonName: speciesCopy('species.veiledChameleon.name'),
  scientificName: 'Chamaeleo calyptratus',
  incubationDays: 180,
  adultMaturationDays: 270,
  hatchWeightGrams: 0.5,
  adultWeightGrams: 140,
  baseHeartRateBpm: 70,
  temperatureTargetCelsius: 28,
  humidityTargetPct: 80,
  turningRequiredUntilDay: 0,
  taxon: 'reptilia',
  tag: 'squamate',
  egg: {
    description: speciesCopy('species.veiledChameleon.egg'),
    lengthMm: 18,
    widthMm: 11,
    massGrams: 1.5,
    shape: 'elongated',
    speckle: 'fine',
    nest: {
      body: '#F4F1EA',
      stroke: '#DDD4C6',
      highlight: '#FFFCF7',
      speckle: '#E4DCCE',
      crack: '#5C5044',
      castShadow: '#243028',
    },
    candle: {
      body: '#F8F4EC',
      stroke: '#E0D6C8',
      highlight: '#FFFFFF',
      speckle: '#E8E0D4',
      interior: '#1C2A20',
      yolk: '#D0A050',
    },
  },
  growth: {
    glow: '#1F7A4D',
    shadow: '#0E3A28',
    body: '#2E8B57',
    hatchlingMeasureCm: 7,
    adultMetricKind: 'length',
    adultMeasureCm: 50,
    referenceScale: 'coin',
    referenceCentimeters: 2.6,
    reference: localized('a two-euro coin', 'eine Zwei-Euro-Münze'),
    behavior: speciesCopy('species.veiledChameleon.behavior'),
    fieldNotes: speciesCopy('species.veiledChameleon.notes'),
  },
  juvenile: {
    title: speciesCopy('species.veiledChameleon.juvenile'),
    scientificSummary: localized(
      'The casque is only a low ridge, and the pastel banding is faint. The tail is already prehensile, and the animal hunts insects in the branches.',
      'Der Helm ist nur ein niedriger Kamm, und die pastellfarbene Bänderung ist schwach. Der Schwanz ist bereits greiffähig, und das Tier jagt Insekten im Geäst.'
    ),
  },
  adult: {
    title: speciesCopy('species.veiledChameleon.adult'),
    scientificSummary: localized(
      'Males carry a tall casque and high-contrast bands. Total length including the tail plateaus near 50 cm, and mass near 140 g.',
      'Männchen tragen einen hohen Helm und kontrastreiche Bänder. Die Gesamtlänge einschließlich des Schwanzes liegt nahe 50 cm, die Masse nahe 140 g.'
    ),
  },
  milestones: incubationArc({
    shell: 'leathery',
    cleavage: {
      day: 0,
      title: localized('Cleavage in a buried capsule', 'Furchung in einer vergrabenen Kapsel'),
      summary: localized(
        'Cleavage begins inside a small, soft, leathery white egg buried in moist substrate. The shell flexes under light pressure.',
        'Die Furchung beginnt in einem kleinen, weichen, ledrigen weißen Ei, das in feuchtem Substrat vergraben ist. Die Schale gibt unter leichtem Druck nach.'
      ),
    },
    vascular: {
      day: 20,
      title: localized('Extraembryonic vascular network', 'Extraembryonales Gefäßnetz'),
      summary: localized(
        'Vitelline vessels spread across the yolk. Through the translucent shell a faint heartbeat can be candled.',
        'Dottergefäße breiten sich über den Dotter aus. Durch die durchscheinende Schale lässt sich ein schwacher Herzschlag durchleuchten.'
      ),
    },
    eye: {
      day: 50,
      title: localized('Eye turret and limb buds', 'Augenköpfchen und Gliedmaßenknospen'),
      summary: localized(
        'The turreted eye and the zygodactyl foot buds are forming. Pigment is still pale compared with the adult.',
        'Das türmchenartige Auge und die zygodaktylen Fußknospen entstehen. Das Pigment ist im Vergleich zum Alttier noch blass.'
      ),
    },
    growth: {
      day: 110,
      title: localized('Coiled tail and low casque', 'Eingerollter Schwanz und niedriger Helm'),
      summary: localized(
        'The embryo fills most of the capsule. The tail is coiled, and the casque is only a ridge on the skull.',
        'Der Embryo füllt den größten Teil der Kapsel. Der Schwanz ist eingerollt, und der Helm ist nur ein Kamm auf dem Schädel.'
      ),
    },
    internalPip: {
      day: 168,
      title: localized('Internal pip', 'Innerer Pick'),
      summary: localized(
        'The snout enters the small air space. The embryo shifts inside the leathery shell before any slit appears.',
        'Die Schnauze dringt in den kleinen Luftraum ein. Der Embryo bewegt sich in der ledrigen Schale, bevor ein Schlitz entsteht.'
      ),
    },
    externalPip: {
      day: 176,
      title: localized('External slit of the capsule', 'Äußerer Schlitz der Kapsel'),
      summary: localized(
        'The egg tooth slits the soft shell. Buried eggs are not turned; moisture alone keeps the capsule pliable.',
        'Der Eizahn schlitzt die weiche Schale auf. Vergrabene Eier werden nicht gewendet; allein die Feuchtigkeit hält die Kapsel geschmeidig.'
      ),
    },
    emergence: {
      day: 180,
      title: localized('Emergence of the climber', 'Schlupf des Kletterers'),
      summary: localized(
        'The hatchling leaves the capsule at about 0.5 g and climbs at once, already able to grasp with feet and tail.',
        'Der Schlüpfling verlässt die Kapsel mit etwa 0,5 g und klettert sofort, bereits fähig, mit Füßen und Schwanz zu greifen.'
      ),
    },
  }),
};
