import { localized, type SpeciesConfig } from '@/domain/types';

import { incubationArc } from './incubationArc';
import { speciesCopy } from './speciesCopy';

export const ballPythonConfig: SpeciesConfig = {
  id: 'ball_python',
  commonName: speciesCopy('species.ballPython.name'),
  scientificName: 'Python regius',
  incubationDays: 55,
  adultMaturationDays: 1095,
  hatchWeightGrams: 58,
  adultWeightGrams: 1500,
  baseHeartRateBpm: 48,
  temperatureTargetCelsius: 31.5,
  humidityTargetPct: 90,
  turningRequiredUntilDay: 0,
  taxon: 'reptilia',
  tag: 'squamate',
  egg: {
    description: speciesCopy('species.ballPython.egg'),
    lengthMm: 70,
    widthMm: 40,
    massGrams: 65,
    shape: 'oval',
    speckle: 'fine',
    nest: {
      body: '#F6F0E4',
      stroke: '#E0D2BE',
      highlight: '#FFF9F0',
      speckle: '#E6D8C4',
      crack: '#5C4A38',
      castShadow: '#2A2218',
    },
    candle: {
      body: '#FBF6EC',
      stroke: '#E6D8C4',
      highlight: '#FFFFFF',
      speckle: '#EADFC8',
      interior: '#2A2016',
      yolk: '#E0A048',
    },
  },
  growth: {
    glow: '#C6A15A',
    shadow: '#3A2C18',
    body: '#C4A15A',
    hatchlingMeasureCm: 35,
    adultMetricKind: 'length',
    adultMeasureCm: 140,
    referenceScale: 'hand',
    referenceCentimeters: 18,
    reference: localized('an adult hand', 'eine Erwachsenenhand'),
    behavior: speciesCopy('species.ballPython.behavior'),
    fieldNotes: speciesCopy('species.ballPython.notes'),
  },
  juvenile: {
    title: speciesCopy('species.ballPython.juvenile'),
    scientificSummary: localized(
      'The hatchling pattern of gold blotches on brown is already stable. The body thickens as a constriction hunter, and the defensive ball-curl remains the typical response.',
      'Das Schlüpflingsmuster aus goldenen Flecken auf Braun ist bereits stabil. Der Körper wird als Würgejäger kräftiger, und das Einrollen zur Kugel bleibt die typische Antwort.'
    ),
  },
  adult: {
    title: speciesCopy('species.ballPython.adult'),
    scientificSummary: localized(
      'Pattern contrast remains, and mass plateaus near 1.5 kg. Total length is typically about 140 cm after three years.',
      'Der Musterkontrast bleibt, und die Masse liegt nahe 1,5 kg. Die Gesamtlänge beträgt nach drei Jahren typischerweise etwa 140 cm.'
    ),
  },
  milestones: incubationArc({
    shell: 'leathery',
    cleavage: {
      day: 0,
      title: localized('Cleavage in an adherent egg', 'Furchung im anhaftenden Ei'),
      summary: localized(
        'Cleavage begins in a large, leathery, cream-white egg stuck to its clutch-mates. The female’s coils supply the heat.',
        'Die Furchung beginnt in einem großen, ledrigen, cremeweißen Ei, das an den Geschwistern des Geleges haftet. Die Windungen des Weibchens liefern die Wärme.'
      ),
    },
    vascular: {
      day: 8,
      title: localized('Extraembryonic vascular network', 'Extraembryonales Gefäßnetz'),
      summary: localized(
        'Vessels spread over the yolk and show clearly through the parchment shell. The pulse is slow, near 48 beats per minute.',
        'Gefäße breiten sich über den Dotter aus und scheinen deutlich durch die Pergamentschale. Der Puls ist langsam, nahe 48 Schläge pro Minute.'
      ),
    },
    eye: {
      day: 18,
      title: localized('Eye pigment and coiled body', 'Augenpigment und eingerollter Körper'),
      summary: localized(
        'A pigmented eye sits on a body already coiled to fit the shell. Scales are forming over the trunk.',
        'Ein pigmentiertes Auge sitzt auf einem Körper, der sich bereits einrollt, um in die Schale zu passen. Schuppen bilden sich über dem Rumpf.'
      ),
    },
    growth: {
      day: 35,
      title: localized('Patterned embryo', 'Gezeichneter Embryo'),
      summary: localized(
        'Gold blotches are visible through the shell under a strong light. The embryo occupies most of the egg and shifts when the clutch is candled.',
        'Goldene Flecken sind unter starkem Licht durch die Schale sichtbar. Der Embryo nimmt den größten Teil des Eis ein und bewegt sich, wenn das Gelege durchleuchtet wird.'
      ),
    },
    internalPip: {
      day: 50,
      title: localized('Internal pip', 'Innerer Pick'),
      summary: localized(
        'The snout enters the air cell. The adherent eggs stay in the female’s coil; they are never rolled.',
        'Die Schnauze dringt in die Luftkammer ein. Die anhaftenden Eier bleiben in der Windung des Weibchens; sie werden nie gerollt.'
      ),
    },
    externalPip: {
      day: 53,
      title: localized('External slit of the leathery shell', 'Äußerer Schlitz der ledrigen Schale'),
      summary: localized(
        'The egg tooth slits the cream shell. Neighboring eggs often pip within the same day.',
        'Der Eizahn schlitzt die cremefarbene Schale auf. Benachbarte Eier picken oft am selben Tag.'
      ),
    },
    emergence: {
      day: 55,
      title: localized('Emergence of the neonate', 'Schlupf des Jungtiers'),
      summary: localized(
        'The hatchling leaves the shell at about 58 g and 35 cm, patterned and independent, and may roll into a defensive ball.',
        'Der Schlüpfling verlässt die Schale mit etwa 58 g und 35 cm, gezeichnet und selbstständig, und kann sich zur Verteidigung zur Kugel rollen.'
      ),
    },
  }),
};
