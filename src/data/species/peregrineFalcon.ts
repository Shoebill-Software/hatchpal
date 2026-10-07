import { localized, type SpeciesConfig } from '@/domain/types';

import { incubationArc } from './incubationArc';
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
  turningRequiredUntilDay: 30,
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
    reference: localized('an adult hand', 'eine Erwachsenenhand'),
    behavior: speciesCopy('species.peregrineFalcon.behavior'),
    fieldNotes: speciesCopy('species.peregrineFalcon.notes'),
  },
  juvenile: {
    title: speciesCopy('species.peregrineFalcon.juvenile'),
    scientificSummary: localized(
      'White natal down is replaced by dark brown contour feathers with buff margins. The wings are already long, but the slate crown and black hood of the adult are absent.',
      'Das weiße Nestdunenkleid wird durch dunkelbraune Konturfedern mit beigen Säumen ersetzt. Die Flügel sind bereits lang, doch die schiefergraue Kappe und die schwarze Maske des Altvogels fehlen noch.'
    ),
  },
  adult: {
    title: speciesCopy('species.peregrineFalcon.adult'),
    scientificSummary: localized(
      'The crown is slate, the malar stripe is black, and the underside is barred. Body mass settles near 910 g, and the wingspan used in a stoop is about 104 cm.',
      'Die Kappe ist schiefergrau, der Bartstreif schwarz, die Unterseite gebändert. Die Körpermasse liegt nahe 910 g, und die Spannweite im Sturzflug beträgt etwa 104 cm.'
    ),
  },
  milestones: incubationArc({
    shell: 'calcareous',
    cleavage: {
      day: 0,
      title: localized('Cleavage on the yolk', 'Furchung auf dem Dotter'),
      summary: localized(
        'Meroblastic cleavage begins in the blastoderm of a newly laid, heavily speckled egg. The germinal disc is still a pale spot on the yolk.',
        'Die meroblastische Furchung beginnt im Blastoderm eines frisch gelegten, stark gesprenkelten Eis. Die Keimscheibe ist noch ein heller Fleck auf dem Dotter.'
      ),
    },
    vascular: {
      day: 4,
      title: localized('Vitelline vascular network', 'Dotter-Gefäßnetz'),
      summary: localized(
        'Blood islands link into a sinus terminalis. A faint embryonic heart is already driving circulation across the yolk.',
        'Blutinseln verbinden sich zum Sinus terminalis. Ein schwaches embryonales Herz treibt bereits den Kreislauf über den Dotter.'
      ),
    },
    eye: {
      day: 8,
      title: localized('Pigmented eye and limb buds', 'Pigmentiertes Auge und Gliedmaßenknospen'),
      summary: localized(
        'The chorioallantois spreads under the shell. A dark eye spot and the buds of wings and legs are visible under the light.',
        'Die Chorioallantois breitet sich unter der Schale aus. Ein dunkler Augenfleck sowie Flügel- und Beinknospen sind im Licht sichtbar.'
      ),
    },
    growth: {
      day: 18,
      title: localized('Down and folded wings', 'Dunen und angelegte Flügel'),
      summary: localized(
        'The embryo turns along the long axis. Down covers the body, and the folded wings already hint at the adult span.',
        'Der Embryo dreht sich entlang der Längsachse. Dunen bedecken den Körper, und die angelegten Flügel deuten bereits die adulte Spannweite an.'
      ),
    },
    internalPip: {
      day: 31,
      title: localized('Internal pip into the air cell', 'Innerer Pick in die Luftkammer'),
      summary: localized(
        'The beak enters the air cell at the blunt pole. Pulmonary breathing starts, and faint peeping can be heard through the shell.',
        'Der Schnabel dringt am stumpfen Pol in die Luftkammer ein. Die Lungenatmung beginnt, und leises Piepen ist durch die Schale hörbar.'
      ),
    },
    externalPip: {
      day: 32,
      title: localized('External pip of the russet shell', 'Äußerer Pick der rotbraunen Schale'),
      summary: localized(
        'The egg tooth stars the calcified, speckled shell. Turning stops so the eyas can rotate and zip the cap.',
        'Der Eizahn sprengt die verkalkte, gesprenkelte Schale sternförmig auf. Das Wenden endet, damit der Ästling sich drehen und die Kappe aufschneiden kann.'
      ),
    },
    emergence: {
      day: 33,
      title: localized('Emergence of the eyas', 'Schlupf des Ästlings'),
      summary: localized(
        'The chick kicks free, wet and covered in white down, with open eyes. Mass at emergence is about 38 g.',
        'Das Küken streift die Schale ab, nass und weiß bedunt, mit offenen Augen. Die Masse beim Schlupf liegt bei etwa 38 g.'
      ),
    },
  }),
};
