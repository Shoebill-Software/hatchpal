import { localized, type SpeciesConfig } from '@/domain/types';

import { incubationArc } from './incubationArc';
import { speciesCopy } from './speciesCopy';

export const commonOstrichConfig: SpeciesConfig = {
  id: 'common_ostrich',
  commonName: speciesCopy('species.commonOstrich.name'),
  scientificName: 'Struthio camelus',
  incubationDays: 42,
  adultMaturationDays: 912,
  hatchWeightGrams: 850,
  adultWeightGrams: 105_000,
  baseHeartRateBpm: 110,
  temperatureTargetCelsius: 36.4,
  humidityTargetPct: 25,
  turningRequiredUntilDay: 39,
  taxon: 'aves',
  tag: 'ratite',
  egg: {
    description: speciesCopy('species.commonOstrich.egg'),
    lengthMm: 150,
    widthMm: 125,
    massGrams: 1400,
    shape: 'pitted',
    speckle: 'pitted',
    nest: {
      body: '#F6EFE2',
      stroke: '#D9CBB4',
      highlight: '#FFF9F0',
      speckle: '#CDBBA0',
      crack: '#6A5844',
      castShadow: '#3A3024',
    },
    candle: {
      body: '#FBF6EC',
      stroke: '#E4D5BC',
      highlight: '#FFFFFF',
      speckle: '#D9C8AE',
      interior: '#3A2C1C',
      yolk: '#E0A040',
    },
  },
  growth: {
    glow: '#E2C07A',
    shadow: '#5A4630',
    body: '#1C1C1C',
    hatchlingMeasureCm: 25,
    adultMetricKind: 'length',
    adultMeasureCm: 250,
    referenceScale: 'person',
    referenceCentimeters: 170,
    reference: localized('an adult person', 'eine erwachsene Person'),
    behavior: speciesCopy('species.commonOstrich.behavior'),
    fieldNotes: speciesCopy('species.commonOstrich.notes'),
  },
  juvenile: {
    title: speciesCopy('species.commonOstrich.juvenile'),
    scientificSummary: localized(
      'The chick’s natal stripes give way to mottled brown body feathers. The neck is lengthening, but the bird is still far below adult standing height.',
      'Die Schlupfstreifen weichen einem gescheckten braunen Körperfedernkleid. Der Hals wird länger, doch der Vogel liegt noch weit unter der adulten Standhöhe.'
    ),
  },
  adult: {
    title: speciesCopy('species.commonOstrich.adult'),
    scientificSummary: localized(
      'Standing height reaches about 2.5 m in a large male, and mass plateaus near 105 kg. The wings remain small relative to the legs.',
      'Die Standhöhe erreicht bei einem großen Hahn etwa 2,5 m, und die Masse liegt nahe 105 kg. Die Flügel bleiben im Verhältnis zu den Beinen klein.'
    ),
  },
  milestones: incubationArc({
    shell: 'calcareous',
    cleavage: {
      day: 0,
      title: localized('Cleavage in a giant egg', 'Furchung im Riesenei'),
      summary: localized(
        'Cleavage begins on an enormous yolk inside a thick, pitted, porcelain-cream shell. The pores are visible to the naked eye.',
        'Die Furchung beginnt auf einem gewaltigen Dotter in einer dicken, porigen, porzellancremefarbenen Schale. Die Poren sind mit bloßem Auge sichtbar.'
      ),
    },
    vascular: {
      day: 6,
      title: localized('Vitelline vascular network', 'Dotter-Gefäßnetz'),
      summary: localized(
        'Vessels colonize a yolk larger than in any other living bird. The heartbeat is slow, matching the large embryonic mass.',
        'Gefäße erschließen einen Dotter, der größer ist als bei jedem anderen lebenden Vogel. Der Herzschlag ist langsam, passend zur großen embryonalen Masse.'
      ),
    },
    eye: {
      day: 12,
      title: localized('Eye pigment and long-neck bud', 'Augenpigment und Halsknospe'),
      summary: localized(
        'The pigmented eye and an already elongated neck are visible. Legs are the dominant limb buds.',
        'Das pigmentierte Auge und ein bereits verlängerter Hals sind sichtbar. Die Beine sind die dominanten Gliedmaßenknospen.'
      ),
    },
    growth: {
      day: 24,
      title: localized('Striped down and heavy legs', 'Gestreifte Dunen und schwere Beine'),
      summary: localized(
        'The embryo fills most of the shell. Down is patterned, and the legs are thick enough that the chick will stand on hatch day.',
        'Der Embryo füllt den größten Teil der Schale. Das Dunengefieder ist gezeichnet, und die Beine sind kräftig genug, dass das Küken am Schlupftag steht.'
      ),
    },
    internalPip: {
      day: 39,
      title: localized('Internal pip', 'Innerer Pick'),
      summary: localized(
        'The beak enters the air cell of the massive shell. Clicks are low and carry through the thick calcite.',
        'Der Schnabel dringt in die Luftkammer der massiven Schale ein. Das Klicken ist tief und trägt durch den dicken Kalk.'
      ),
    },
    externalPip: {
      day: 41,
      title: localized('External pip of the pitted shell', 'Äußerer Pick der porigen Schale'),
      summary: localized(
        'The egg tooth cracks the glossy shell. Turning of the communal clutch stops for this egg.',
        'Der Eizahn bricht die glänzende Schale auf. Das Wenden des Gemeinschaftsgeleges endet für dieses Ei.'
      ),
    },
    emergence: {
      day: 42,
      title: localized('Emergence of the striped chick', 'Schlupf des gestreiften Kükens'),
      summary: localized(
        'The chick kicks free and stands within hours, at about 850 g, already striped buff and brown.',
        'Das Küken streift die Schale ab und steht innerhalb von Stunden, mit etwa 850 g, bereits beige-braun gestreift.'
      ),
    },
  }),
};
