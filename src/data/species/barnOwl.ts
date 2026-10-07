import { localized, type SpeciesConfig } from '@/domain/types';

import { incubationArc } from './incubationArc';
import { speciesCopy } from './speciesCopy';

export const barnOwlConfig: SpeciesConfig = {
  id: 'barn_owl',
  commonName: speciesCopy('species.barnOwl.name'),
  scientificName: 'Tyto alba',
  incubationDays: 32,
  adultMaturationDays: 300,
  hatchWeightGrams: 15,
  adultWeightGrams: 340,
  baseHeartRateBpm: 230,
  temperatureTargetCelsius: 37.2,
  humidityTargetPct: 50,
  turningRequiredUntilDay: 29,
  taxon: 'aves',
  tag: 'strigiform',
  egg: {
    description: speciesCopy('species.barnOwl.egg'),
    lengthMm: 40,
    widthMm: 32,
    massGrams: 20,
    shape: 'elliptical',
    speckle: 'none',
    nest: {
      body: '#F7F4EF',
      stroke: '#E0D8CE',
      highlight: '#FFFFFF',
      speckle: '#E7E0D6',
      crack: '#6A5C50',
      castShadow: '#2C241C',
    },
    candle: {
      body: '#FFF9F2',
      stroke: '#E6DCCA',
      highlight: '#FFFFFF',
      speckle: '#F0E6D8',
      interior: '#2A221C',
      yolk: '#E8A050',
    },
  },
  growth: {
    glow: '#E6D7B0',
    shadow: '#3A342C',
    body: '#E7D7B4',
    hatchlingMeasureCm: 9,
    adultMetricKind: 'wingspan',
    adultMeasureCm: 90,
    referenceScale: 'hand',
    referenceCentimeters: 18,
    reference: localized('an adult hand', 'eine Erwachsenenhand'),
    behavior: speciesCopy('species.barnOwl.behavior'),
    fieldNotes: speciesCopy('species.barnOwl.notes'),
  },
  juvenile: {
    title: speciesCopy('species.barnOwl.juvenile'),
    scientificSummary: localized(
      'The second, mesoptile down is buff and the facial disc is still a shallow oval. Wing quills are in blood, and flight is a short flutter.',
      'Das zweite, mesoptilische Dunenkleid ist beige, und der Gesichtsschleier ist noch ein flaches Oval. Die Schwungfedern sind noch durchblutet, der Flug nur ein kurzes Flattern.'
    ),
  },
  adult: {
    title: speciesCopy('species.barnOwl.adult'),
    scientificSummary: localized(
      'The heart-shaped facial disc, dark eyes, and golden-buff wings are complete. Mass plateaus near 340 g, with a wingspan of about 90 cm.',
      'Der herzförmige Gesichtsschleier, die dunklen Augen und die goldbeigen Flügel sind vollständig. Die Masse liegt nahe 340 g, die Spannweite bei etwa 90 cm.'
    ),
  },
  milestones: incubationArc({
    shell: 'calcareous',
    cleavage: {
      day: 0,
      title: localized('Cleavage in a white egg', 'Furchung in einem weißen Ei'),
      summary: localized(
        'Cleavage begins on the yolk of a smooth, matte-white elliptical egg. No pigment is deposited in the shell.',
        'Die Furchung beginnt auf dem Dotter eines glatten, mattweißen elliptischen Eis. In die Schale wird kein Pigment eingelagert.'
      ),
    },
    vascular: {
      day: 4,
      title: localized('Vitelline vascular network', 'Dotter-Gefäßnetz'),
      summary: localized(
        'The vascular ring is easy to candle through the unpigmented shell. The heart is already audible as a rapid pulse.',
        'Der Gefäßring lässt sich durch die unpigmentierte Schale gut durchleuchten. Das Herz ist bereits als schneller Puls wahrnehmbar.'
      ),
    },
    eye: {
      day: 8,
      title: localized('Dark eye and facial disc buds', 'Dunkles Auge und Schleierknospen'),
      summary: localized(
        'The eye is heavily pigmented early, as in other owls. Limb buds that will carry the facial disc ruff are forming.',
        'Das Auge ist früh stark pigmentiert, wie bei anderen Eulen. Gliedmaßenknospen, die später den Gesichtsschleier tragen, entstehen.'
      ),
    },
    growth: {
      day: 18,
      title: localized('Down and hooked bill', 'Dunen und Hakenschnabel'),
      summary: localized(
        'White down covers the embryo and the bill is already hooked. Spontaneous movement fills the shell under a bright light.',
        'Weißes Dunengefieder bedeckt den Embryo, und der Schnabel ist bereits gehakt. Unter hellem Licht füllt spontane Bewegung die Schale.'
      ),
    },
    internalPip: {
      day: 30,
      title: localized('Internal pip', 'Innerer Pick'),
      summary: localized(
        'The beak enters the air cell. A hiss or soft peep may be heard before any shell star appears.',
        'Der Schnabel dringt in die Luftkammer ein. Ein Zischen oder leises Piepen kann hörbar sein, bevor ein Schalenstern entsteht.'
      ),
    },
    externalPip: {
      day: 31,
      title: localized('External pip of the white shell', 'Äußerer Pick der weißen Schale'),
      summary: localized(
        'The egg tooth cracks the pure white shell. Turning ceases for the final rotation.',
        'Der Eizahn bricht die rein weiße Schale auf. Das Wenden endet für die letzte Drehung.'
      ),
    },
    emergence: {
      day: 32,
      title: localized('Emergence of the owlet', 'Schlupf des Kükens'),
      summary: localized(
        'The owlet emerges sparsely downed and with closed eyes, at about 15 g, into a nest of pellets.',
        'Das Küken schlüpft spärlich bedunt und mit geschlossenen Augen, mit etwa 15 g, in ein Nest aus Gewöllen.'
      ),
    },
  }),
};
