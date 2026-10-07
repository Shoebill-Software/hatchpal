import { localized, SpeciesConfig } from '@/domain/types';

export const leopardGeckoConfig: SpeciesConfig = {
  id: 'leopard_gecko',
  commonName: localized('Leopard Gecko', 'Leopardgecko'),
  scientificName: 'Eublepharis macularius',
  incubationDays: 50,
  adultMaturationDays: 330,
  hatchWeightGrams: 3,
  adultWeightGrams: 70,
  baseHeartRateBpm: 110,
  temperatureTargetCelsius: 31.0,
  humidityTargetPct: 75,
  turningRequiredUntilDay: 0,
  taxon: 'reptilia',
  tag: 'squamate',
  egg: {
    description: localized(
      'Soft parchment oval with a chalky white shell.',
      'Weiches Pergament-Oval mit kreidig weißer Schale.'
    ),
    lengthMm: 28,
    widthMm: 16,
    massGrams: 4,
    shape: 'elongated',
    speckle: 'fine',
    nest: {
      body: '#F7F1E3',
      stroke: '#D9CBB3',
      highlight: '#FFFFFF',
      speckle: '#C4B49A',
      crack: '#5C4030',
      castShadow: '#3A2A1C',
    },
    candle: {
      body: '#EFE6D4',
      stroke: '#C9B89A',
      highlight: '#FFF8EC',
      speckle: '#B7A48A',
      interior: '#3A2414',
      yolk: '#C47832',
    },
  },
  growth: {
    glow: '#E3B84A',
    shadow: '#4A3A16',
    body: '#E3C15A',
    hatchlingMeasureCm: 8,
    adultMetricKind: 'length',
    adultMeasureCm: 22,
    referenceScale: 'coin',
    referenceCentimeters: 2.6,
    reference: localized('a two-euro coin', 'eine Zwei-Euro-Münze'),
    behavior: localized(
      'A nocturnal terrestrial gecko. The hatchling’s bands break into spots, and the tail becomes a fat store.',
      'Ein nachtaktiver Bodengecko. Die Bänder des Schlüpflings lösen sich in Flecken auf, und der Schwanz wird zum Fettspeicher.'
    ),
    fieldNotes: localized(
      'Leopard gecko eggs are soft-shelled and incubate for about 50 days without turning. The hatchling is only a few grams. Adult spotting is stable near 70 g and about 22 cm including the tail.',
      'Leopardgecko-Eier sind weichschalig und brüten etwa 50 Tage ohne Wenden. Der Schlüpfling wiegt nur wenige Gramm. Die adulte Fleckung ist stabil nahe 70 g und etwa 22 cm einschließlich des Schwanzes.'
    ),
  },
  juvenile: {
    title: localized('Juvenile pattern', 'Jugendzeichnung'),
    scientificSummary: localized(
      'Hatchling bands break into separate spots. The tail thickens as a fat store, and nocturnal hunting on the substrate becomes regular.',
      'Die Bänder des Schlüpflings lösen sich in einzelne Flecken auf. Der Schwanz verdickt sich als Fettspeicher, und die nächtliche Jagd auf dem Substrat wird regelmäßig.'
    ),
  },
  adult: {
    title: localized('Adult pattern', 'Adultzeichnung'),
    scientificSummary: localized(
      'Spotting is stable and body mass has reached the adult plateau near 70 g. Further growth is negligible.',
      'Die Fleckung ist stabil, und die Körpermasse hat das adulte Plateau um 70 g erreicht. Weiteres Wachstum ist vernachlässigbar.'
    ),
  },
  milestones: [
    {
      day: 0,
      stage: 'cleavage',
      title: localized('Freshly Laid Clutch Egg', 'Frisch gelegtes Gelege-Ei'),
      scientificSummary: localized(
        'Calcareous parchment shell is still flexible. Embryonic disc sits on the yolk; adhesive patch anchors the egg to substrate.',
        'Die kalkige Pergamentschale ist noch biegsam. Die Keimscheibe liegt auf dem Dotter; ein Haftfleck verankert das Ei am Substrat.'
      ),
      candling: {
        bloodVesselsVisible: false,
        eyeSpotVisible: false,
        embryoSilhouettePct: 0.03,
        airCellPct: 0.04,
        movementDetectable: false,
      },
      audioTrigger: 'silent',
    },
    {
      day: 7,
      stage: 'vascular',
      title: localized('Extraembryonic Circulation', 'Extraembryonale Zirkulation'),
      scientificSummary: localized(
        'Vitelline vessels spread across the yolk. A faint embryonic heartbeat can be resolved under bright transillumination.',
        'Dottergefäße breiten sich über den Dotter aus. Unter heller Durchleuchtung ist ein schwacher embryonaler Herzschlag erkennbar.'
      ),
      candling: {
        bloodVesselsVisible: true,
        eyeSpotVisible: false,
        embryoSilhouettePct: 0.1,
        airCellPct: 0.06,
        movementDetectable: false,
      },
      audioTrigger: 'heartbeat',
    },
    {
      day: 19,
      stage: 'organogenesis',
      title: localized('Limb Buds & Eye Pigment', 'Gliedmaßenknospen und Augenpigment'),
      scientificSummary: localized(
        'Forelimb and hindlimb buds differentiate. Cranial pigmentation makes the eye spot visible through the translucent shell.',
        'Vorder- und Hintergliedmaßenknospen differenzieren sich. Die Schädelpigmentierung macht den Augenfleck durch die durchscheinende Schale sichtbar.'
      ),
      candling: {
        bloodVesselsVisible: true,
        eyeSpotVisible: true,
        embryoSilhouettePct: 0.28,
        airCellPct: 0.09,
        movementDetectable: true,
      },
      audioTrigger: 'heartbeat',
    },
    {
      day: 33,
      stage: 'organogenesis',
      title: localized('Scale Anlage & Body Flexion', 'Schuppenanlagen und Körperbeugung'),
      scientificSummary: localized(
        'Embryo occupies much of the egg volume. Spontaneous trunk flexion is visible; dermal scale primordia begin patterning.',
        'Der Embryo nimmt einen großen Teil des Eivolumens ein. Spontane Rumpfbeugung ist sichtbar; erste Hautschuppenanlagen zeichnen sich ab.'
      ),
      candling: {
        bloodVesselsVisible: true,
        eyeSpotVisible: true,
        embryoSilhouettePct: 0.58,
        airCellPct: 0.12,
        movementDetectable: true,
      },
      audioTrigger: 'embryo_movement',
    },
    {
      day: 47,
      stage: 'internal_pip',
      title: localized('Internal Pip', 'Innerer Pick'),
      scientificSummary: localized(
        'Snout enters the air space. Pulmonary respiration starts while residual yolk continues to be absorbed.',
        'Die Schnauze tritt in den Luftraum ein. Die Lungenatmung beginnt, während der Restdotter weiter resorbiert wird.'
      ),
      candling: {
        bloodVesselsVisible: false,
        eyeSpotVisible: false,
        embryoSilhouettePct: 0.8,
        airCellPct: 0.18,
        movementDetectable: true,
      },
      audioTrigger: 'internal_chirp',
    },
    {
      day: 49,
      stage: 'external_pip',
      title: localized('External Pip', 'Äußerer Pick'),
      scientificSummary: localized(
        'Egg tooth slits the flexible shell. Emergence is slow; the neonate remains partially enclosed while yolk is finished.',
        'Der Eizahn schlitzt die biegsame Schale. Der Schlupf verläuft langsam; das Jungtier bleibt teilweise eingeschlossen, bis der Dotter aufgebraucht ist.'
      ),
      candling: {
        bloodVesselsVisible: false,
        eyeSpotVisible: false,
        embryoSilhouettePct: 0.9,
        airCellPct: 0.2,
        movementDetectable: true,
      },
      audioTrigger: 'shell_pip',
    },
    {
      day: 50,
      stage: 'hatchling',
      title: localized('Emergence', 'Schlupf'),
      scientificSummary: localized(
        'Hatchling fully exits the shell, often overnight, and begins terrestrial locomotion on moist substrate.',
        'Das Jungtier verlässt die Schale vollständig, oft über Nacht, und beginnt sich auf feuchtem Substrat fortzubewegen.'
      ),
      candling: {
        bloodVesselsVisible: false,
        eyeSpotVisible: false,
        embryoSilhouettePct: 1.0,
        airCellPct: 0.0,
        movementDetectable: true,
      },
      audioTrigger: 'hatch_call',
    },
  ],
};
