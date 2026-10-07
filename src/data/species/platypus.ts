import { localized, type SpeciesConfig } from '@/domain/types';

import { incubationArc } from './incubationArc';
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
  turningRequiredUntilDay: 0,
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
    reference: localized('a two-euro coin', 'eine Zwei-Euro-Münze'),
    behavior: speciesCopy('species.platypus.behavior'),
    fieldNotes: speciesCopy('species.platypus.notes'),
  },
  juvenile: {
    title: speciesCopy('species.platypus.juvenile'),
    scientificSummary: localized(
      'The young animal remains in the burrow, lapping milk from the mother’s abdominal skin. The bill is short and the tail is still filling with fat.',
      'Das Jungtier bleibt im Bau und leckt Milch von der Bauchhaut der Mutter. Der Schnabel ist kurz, und der Schwanz füllt sich noch mit Fett.'
    ),
  },
  adult: {
    title: speciesCopy('species.platypus.adult'),
    scientificSummary: localized(
      'The bill is broad and electroreceptive, the tail is a fat store, and total length plateaus near 46 cm. Mass settles near 1.6 kg.',
      'Der Schnabel ist breit und elektrorezeptiv, der Schwanz ist ein Fettspeicher, und die Gesamtlänge liegt nahe 46 cm. Die Masse pendelt sich nahe 1,6 kg ein.'
    ),
  },
  milestones: incubationArc({
    shell: 'monotreme',
    cleavage: {
      day: 0,
      title: localized('Cleavage in a sticky sphere', 'Furchung in einer klebrigen Kugel'),
      summary: localized(
        'Cleavage begins in a tiny, leathery, spherical egg held against the mother’s abdomen. The shell is sticky and unpigmented.',
        'Die Furchung beginnt in einem winzigen, ledrigen, kugeligen Ei, das am Bauch der Mutter gehalten wird. Die Schale ist klebrig und unpigmentiert.'
      ),
    },
    vascular: {
      day: 2,
      title: localized('Vitelline vascular network', 'Dotter-Gefäßnetz'),
      summary: localized(
        'A small vascular net spreads over the yolk within two days. The pulse is mammalian in tempo compared with the reptiles in this roster.',
        'Ein kleines Gefäßnetz breitet sich innerhalb von zwei Tagen über den Dotter aus. Der Puls ist im Vergleich zu den Reptilien dieses Geleges säugetierhaft schnell.'
      ),
    },
    eye: {
      day: 4,
      title: localized('Bill bud and eye pigment', 'Schnabelknospe und Augenpigment'),
      summary: localized(
        'The future bill is a short bud, and eye pigment is present. There is no shell pigment to hide the embryo.',
        'Der künftige Schnabel ist eine kurze Knospe, und Augenpigment ist vorhanden. Es gibt kein Schalenpigment, das den Embryo verbergen würde.'
      ),
    },
    growth: {
      day: 6,
      title: localized('Curled embryo', 'Eingerollter Embryo'),
      summary: localized(
        'The embryo is curled to fit a shell barely 14 mm across. Limb buds already suggest the webbed feet of the adult.',
        'Der Embryo ist eingerollt, um in eine kaum 14 mm große Schale zu passen. Die Gliedmaßenknospen deuten bereits die Schwimmfüße des Alttiers an.'
      ),
    },
    internalPip: {
      day: 8,
      title: localized('Internal pip', 'Innerer Pick'),
      summary: localized(
        'The embryo fills the shell and the snout meets the small air space. Movement is a faint shift against the abdomen.',
        'Der Embryo füllt die Schale, und die Schnauze erreicht den kleinen Luftraum. Die Bewegung ist nur ein schwaches Verschieben am Bauch.'
      ),
    },
    externalPip: {
      day: 9,
      title: localized('External slit of the leathery shell', 'Äußerer Schlitz der ledrigen Schale'),
      summary: localized(
        'An egg tooth slits the sticky shell. The egg is not turned; it stays pressed to the skin.',
        'Ein Eizahn schlitzt die klebrige Schale auf. Das Ei wird nicht gewendet; es bleibt an die Haut gedrückt.'
      ),
    },
    emergence: {
      day: 10,
      title: localized('Emergence of the hatchling', 'Schlupf des Jungtiers'),
      summary: localized(
        'The hatchling leaves the shell at about 1 g and 1.5 cm, then stays in the burrow to lap milk from the mother’s skin. There are no nipples.',
        'Der Schlüpfling verlässt die Schale mit etwa 1 g und 1,5 cm und bleibt im Bau, um Milch von der Haut der Mutter zu lecken. Zitzen fehlen.'
      ),
    },
  }),
};
