import { localized, type SpeciesConfig } from '@/domain/types';

import { incubationArc } from './incubationArc';
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
  turningRequiredUntilDay: 0,
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
    reference: localized('an adult person', 'eine erwachsene Person'),
    behavior: speciesCopy('species.saltwaterCrocodile.behavior'),
    fieldNotes: speciesCopy('species.saltwaterCrocodile.notes'),
  },
  juvenile: {
    title: speciesCopy('species.saltwaterCrocodile.juvenile'),
    scientificSummary: localized(
      'Black bands cross a gold-olive body. The snout is already long, but the animal is still small enough to be carried in a parent’s mouth.',
      'Schwarze Bänder ziehen über einen gold-olivfarbenen Körper. Die Schnauze ist bereits lang, doch das Tier ist noch klein genug, um im Maul eines Elterntiers getragen zu werden.'
    ),
  },
  adult: {
    title: speciesCopy('species.saltwaterCrocodile.adult'),
    scientificSummary: localized(
      'Bands fade and the skull broadens. A large male approaches 4.8 m and a mass near 450 kg on this twelve-year clock.',
      'Die Bänder verblassen, und der Schädel wird breiter. Ein großes Männchen nähert sich 4,8 m und einer Masse nahe 450 kg auf dieser Zwölf-Jahres-Uhr.'
    ),
  },
  milestones: incubationArc({
    shell: 'calcareous',
    cleavage: {
      day: 0,
      title: localized('Cleavage in the mound', 'Furchung im Hügel'),
      summary: localized(
        'Cleavage begins in a hard white egg buried in a vegetation mound. The shell is an elongated ellipsoid with a rough calcareous texture.',
        'Die Furchung beginnt in einem harten weißen Ei, das in einem Pflanzenhügel vergraben ist. Die Schale ist ein langgestrecktes Ellipsoid mit rauer Kalktextur.'
      ),
    },
    vascular: {
      day: 12,
      title: localized('Extraembryonic vascular network', 'Extraembryonales Gefäßnetz'),
      summary: localized(
        'Vitelline vessels spread over the yolk. The embryonic heart is slow, near 55 beats per minute, and visible as a dark pulse.',
        'Dottergefäße breiten sich über den Dotter aus. Das embryonale Herz ist langsam, nahe 55 Schläge pro Minute, und als dunkler Puls sichtbar.'
      ),
    },
    eye: {
      day: 28,
      title: localized('Eye pigment and snout bud', 'Augenpigment und Schnauzenknospe'),
      summary: localized(
        'A pigmented eye and the elongated snout are distinct. Limb buds will become the short, clawed legs of a mound hatchling.',
        'Ein pigmentiertes Auge und die verlängerte Schnauze sind deutlich. Aus den Gliedmaßenknospen werden die kurzen, bekrallten Beine eines Hügelschlüpflings.'
      ),
    },
    growth: {
      day: 55,
      title: localized('Banded embryo and yolk sac', 'Gebänderter Embryo und Dottersack'),
      summary: localized(
        'Dark bands are already laid down in the skin. The embryo fills most of the shell and shifts when the mound is opened for candling.',
        'Dunkle Bänder sind in der Haut bereits angelegt. Der Embryo füllt den größten Teil der Schale und bewegt sich, wenn der Hügel zum Durchleuchten geöffnet wird.'
      ),
    },
    internalPip: {
      day: 80,
      title: localized('Internal pip', 'Innerer Pick'),
      summary: localized(
        'The snout enters the air cell. Hatchlings often grunt before the shell is breached, a signal to the attending adult.',
        'Die Schnauze dringt in die Luftkammer ein. Schlüpflinge grunzen oft, bevor die Schale aufbricht, ein Signal an den anwesenden Altvogel.'
      ),
    },
    externalPip: {
      day: 83,
      title: localized('External pip of the calcareous shell', 'Äußerer Pick der Kalkschale'),
      summary: localized(
        'The egg tooth cracks the hard white shell. Mound eggs are not turned; heat and humidity come from the rotting vegetation.',
        'Der Eizahn bricht die harte weiße Schale auf. Hügel-Eier werden nicht gewendet; Wärme und Feuchte kommen aus der verrottenden Vegetation.'
      ),
    },
    emergence: {
      day: 85,
      title: localized('Emergence from the mound', 'Schlupf aus dem Hügel'),
      summary: localized(
        'The hatchling leaves the shell at about 70 g and 28 cm, banded and calling, ready to be carried to the water.',
        'Der Schlüpfling verlässt die Schale mit etwa 70 g und 28 cm, gebändert und rufend, bereit, zum Wasser getragen zu werden.'
      ),
    },
  }),
};
