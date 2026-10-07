import { localized, SpeciesConfig } from '@/domain/types';

export const greenSeaTurtleConfig: SpeciesConfig = {
  id: 'green_sea_turtle',
  commonName: localized('Green Sea Turtle', 'Grüne Meeresschildkröte'),
  scientificName: 'Chelonia mydas',
  incubationDays: 60,
  adultMaturationDays: 730,
  hatchWeightGrams: 25,
  adultWeightGrams: 150_000,
  baseHeartRateBpm: 90,
  temperatureTargetCelsius: 29.0,
  humidityTargetPct: 85,
  turningRequiredUntilDay: 0,
  taxon: 'reptilia',
  tag: 'testudine',
  egg: {
    description: localized(
      'Spherical, soft-shelled clutch egg, pale and chalky.',
      'Kugeliges, weichschaliges Gelege-Ei, blass und kreidig.'
    ),
    lengthMm: 45,
    widthMm: 44,
    massGrams: 40,
    shape: 'sphere',
    speckle: 'fine',
    nest: {
      body: '#F3DFD0',
      stroke: '#D7B8A4',
      highlight: '#FFF6EF',
      speckle: '#C9A08A',
      crack: '#5A3828',
      castShadow: '#4A3A22',
    },
    candle: {
      body: '#F0D6C6',
      stroke: '#D2B09C',
      highlight: '#FFF4EC',
      speckle: '#C49A86',
      interior: '#3A1C14',
      yolk: '#C45A32',
    },
  },
  growth: {
    glow: '#3D8F86',
    shadow: '#123430',
    body: '#2F6B4F',
    hatchlingMeasureCm: 5,
    adultMetricKind: 'length',
    adultMeasureCm: 110,
    referenceScale: 'person',
    referenceCentimeters: 170,
    reference: localized('an adult person', 'eine erwachsene Person'),
    behavior: localized(
      'A marine turtle. The hatchling crawls to the surf, and the adult carapace is a long oceanic life compressed onto this clock.',
      'Eine Meeresschildkröte. Der Schlüpfling kriecht zur Brandung, und der adulte Carapax ist ein langes ozeanisches Leben, das auf diese Uhr verdichtet ist.'
    ),
    fieldNotes: localized(
      'Green turtle eggs are nearly spherical and incubate for about 60 days in beach sand. The hatchling is lime-sized. On this compressed clock the adult plateau sits near 150 kg and a carapace length of about 110 cm.',
      'Eier der Grünen Meeresschildkröte sind fast kugelig und brüten etwa 60 Tage im Strandsand. Der Schlüpfling hat die Größe einer Limette. Auf dieser verdichteten Uhr liegt das adulte Plateau nahe 150 kg und einer Carapaxlänge von etwa 110 cm.'
    ),
  },
  juvenile: {
    title: localized('Juvenile carapace', 'Juveniler Carapax'),
    scientificSummary: localized(
      'Scutes keratinize and the flipper stroke lengthens. On this compressed clock the turtle leaves the surface drift and begins sustained swimming.',
      'Die Schilde verhornen, und der Flossenschlag wird länger. Auf dieser verdichteten Uhr verlässt die Schildkröte die oberflächennahe Drift und beginnt ausdauernd zu schwimmen.'
    ),
  },
  adult: {
    title: localized('Adult ocean mass', 'Adulte Meeresmasse'),
    scientificSummary: localized(
      'The carapace is fully ossified and mass has reached the compressed adult plateau near 150 kg, enough for sustained oceanic travel.',
      'Der Carapax ist vollständig verknöchert, und die Masse hat das verdichtete adulte Plateau um 150 kg erreicht, ausreichend für anhaltende ozeanische Wanderung.'
    ),
  },
  milestones: [
    {
      day: 0,
      stage: 'cleavage',
      title: localized('Nest-Chamber Clutch', 'Gelege in der Nestkammer'),
      scientificSummary: localized(
        'Leathery egg is deposited in a humid sand chamber. Cleavage proceeds without turning; moisture preservation is critical.',
        'Das ledrige Ei liegt in einer feuchten Sandkammer. Die Furchung verläuft ohne Wenden; der Feuchtigkeitserhalt ist entscheidend.'
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
      day: 9,
      stage: 'vascular',
      title: localized('Yolk Vascularization', 'Dottervaskularisation'),
      scientificSummary: localized(
        'Blood islands coalesce over the yolk sac. A slow embryonic pulse becomes detectable under strong candling light.',
        'Blutinseln verbinden sich über dem Dottersack. Unter starkem Durchlicht wird ein langsamer embryonaler Puls erkennbar.'
      ),
      candling: {
        bloodVesselsVisible: true,
        eyeSpotVisible: false,
        embryoSilhouettePct: 0.09,
        airCellPct: 0.06,
        movementDetectable: false,
      },
      audioTrigger: 'heartbeat',
    },
    {
      day: 23,
      stage: 'organogenesis',
      title: localized('Carapace Fold & Eye Spot', 'Carapaxfalte und Augenfleck'),
      scientificSummary: localized(
        'Carapacial ridge forms. The pigmented eye is a distinct dark locus; extraembryonic membranes line the shell.',
        'Die Carapaxleiste bildet sich. Das pigmentierte Auge ist ein deutlicher dunkler Punkt; extraembryonale Membranen kleiden die Schale aus.'
      ),
      candling: {
        bloodVesselsVisible: true,
        eyeSpotVisible: true,
        embryoSilhouettePct: 0.26,
        airCellPct: 0.09,
        movementDetectable: true,
      },
      audioTrigger: 'heartbeat',
    },
    {
      day: 40,
      stage: 'organogenesis',
      title: localized('Late Embryo Fill', 'Späte Embryofüllung'),
      scientificSummary: localized(
        'Body mass occupies most of the egg. Flipper movement is occasionally visible; residual yolk remains substantial.',
        'Die Körpermasse füllt den größten Teil des Eis. Flossenbewegung ist gelegentlich sichtbar; ein erheblicher Restdotter bleibt.'
      ),
      candling: {
        bloodVesselsVisible: true,
        eyeSpotVisible: true,
        embryoSilhouettePct: 0.6,
        airCellPct: 0.13,
        movementDetectable: true,
      },
      audioTrigger: 'embryo_movement',
    },
    {
      day: 57,
      stage: 'internal_pip',
      title: localized('Internal Pip', 'Innerer Pick'),
      scientificSummary: localized(
        'Beak pierces into the air cell. Pulmonary breathing begins in the crowded nest chamber before the shell is opened.',
        'Der Schnabel stößt in die Luftkammer. Die Lungenatmung beginnt in der engen Nestkammer, bevor die Schale geöffnet wird.'
      ),
      candling: {
        bloodVesselsVisible: false,
        eyeSpotVisible: false,
        embryoSilhouettePct: 0.82,
        airCellPct: 0.2,
        movementDetectable: true,
      },
      audioTrigger: 'internal_chirp',
    },
    {
      day: 59,
      stage: 'external_pip',
      title: localized('External Pip', 'Äußerer Pick'),
      scientificSummary: localized(
        'Caruncle ruptures the leathery shell. Hatchlings often wait for siblings so the cohort emerges together.',
        'Die Caruncula reißt die ledrige Schale auf. Die Schlüpflinge warten oft auf Geschwister, damit die Gruppe gemeinsam erscheint.'
      ),
      candling: {
        bloodVesselsVisible: false,
        eyeSpotVisible: false,
        embryoSilhouettePct: 0.92,
        airCellPct: 0.22,
        movementDetectable: true,
      },
      audioTrigger: 'shell_pip',
    },
    {
      day: 60,
      stage: 'hatchling',
      title: localized('Emergence', 'Schlupf'),
      scientificSummary: localized(
        'Hatchling completes yolk internalization, opens the nest plug with siblings, and begins the crawl toward the sea.',
        'Das Jungtier schließt die Dotteraufnahme ab, öffnet mit den Geschwistern den Nestpfropfen und beginnt den Marsch zum Meer.'
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
