import { localized, SpeciesConfig } from '@/domain/types';

export const silkieChickenConfig: SpeciesConfig = {
  id: 'silkie_chicken',
  commonName: localized('Silkie Chicken', 'Seidenhuhn'),
  scientificName: 'Gallus gallus domesticus',
  incubationDays: 21,
  adultMaturationDays: 126, // ~18 weeks to full adult plumage
  hatchWeightGrams: 32,
  adultWeightGrams: 1300,
  baseHeartRateBpm: 220,
  temperatureTargetCelsius: 37.5,
  humidityTargetPct: 55,
  turningRequiredUntilDay: 18,
  taxon: 'aves',
  tag: 'galliform',
  egg: {
    description: localized(
      'Warm buff oval with a faint chalky bloom.',
      'Warmes, beigefarbenes Oval mit zartem Kalkschleier.'
    ),
    lengthMm: 52,
    widthMm: 39,
    massGrams: 48,
    shape: 'oval',
    speckle: 'fine',
    nest: {
      body: '#F3E4B8',
      stroke: '#D7C28A',
      highlight: '#FFF8E6',
      speckle: '#C4A66A',
      crack: '#5C4030',
      castShadow: '#3A2A1C',
    },
    candle: {
      body: '#EED9A0',
      stroke: '#D0B474',
      highlight: '#FFF6D8',
      speckle: '#C4A066',
      interior: '#3A220C',
      yolk: '#D07028',
    },
  },
  growth: {
    glow: '#E7C56A',
    shadow: '#4A3420',
    body: '#F6E4B4',
    hatchlingMeasureCm: 8,
    adultMetricKind: 'length',
    adultMeasureCm: 28,
    referenceScale: 'hand',
    referenceCentimeters: 18,
    reference: localized('an adult hand', 'eine Erwachsenenhand'),
    behavior: localized(
      'A domestic bantam with a crest and feathered feet. The chick is precocial, and the adult silhouette is round rather than long-winged.',
      'Ein Haushuhn mit Haube und befiederten Füßen. Das Küken ist nestflüchtig, und die adulte Silhouette ist rund statt langflügelig.'
    ),
    fieldNotes: localized(
      'Silkie eggs incubate in 21 days at a steady 37.5 °C. The chick hatches covered in fluffy down, and the adult crest, mulberry comb, and feathered shanks are fully expressed by about 18 weeks.',
      'Seidenhuhneier brüten in 21 Tagen bei gleichmäßigen 37,5 °C. Das Küken schlüpft mit flauschigem Dunenkleid, und Haube, Maulbeerkamm sowie befiederte Läufe sind nach etwa 18 Wochen voll ausgeprägt.'
    ),
  },
  juvenile: {
    title: localized('Juvenile plumage', 'Jugendgefieder'),
    scientificSummary: localized(
      'Natal down is replaced by contour feathers. The crest and feathered shanks start to read as silkie traits, and daily mass gain is steepest in this window.',
      'Die Nestdaunen werden durch Konturfedern ersetzt. Haube und befiederte Läufe werden als Seidenhuhn-Merkmale lesbar, und die tägliche Massenzunahme ist in diesem Fenster am steilsten.'
    ),
  },
  adult: {
    title: localized('Adult plumage', 'Adultgefieder'),
    scientificSummary: localized(
      'Crest, mulberry comb, and feathered feet are fully expressed. Body mass settles on the adult plateau near 1,300 g and linear growth stops.',
      'Haube, Maulbeerkamm und befiederte Füße sind vollständig ausgeprägt. Die Körpermasse liegt auf dem adulten Plateau um 1.300 g, das Längenwachstum endet.'
    ),
  },
  milestones: [
    {
      day: 0,
      stage: 'cleavage',
      title: localized('Freshly Laid Blastoderm', 'Frisch gelegter Blastoderm'),
      scientificSummary: localized(
        'Cellular division begins atop the yolk. Germinal disc is barely visible.',
        'Die Zellteilung beginnt auf dem Dotter. Die Keimscheibe ist kaum sichtbar.'
      ),
      candling: {
        bloodVesselsVisible: false,
        eyeSpotVisible: false,
        embryoSilhouettePct: 0.02,
        airCellPct: 0.05,
        movementDetectable: false,
      },
      audioTrigger: 'silent',
    },
    {
      day: 3,
      stage: 'vascular',
      title: localized('Vitelline Circulation', 'Dotterkreislauf'),
      scientificSummary: localized(
        'Blood islands coalesce into the sinus terminalis. Faint embryonic heart begins pumping.',
        'Blutinseln verbinden sich zum Sinus terminalis. Ein schwaches embryonales Herz beginnt zu schlagen.'
      ),
      candling: {
        bloodVesselsVisible: true,
        eyeSpotVisible: false,
        embryoSilhouettePct: 0.08,
        airCellPct: 0.07,
        movementDetectable: false,
      },
      audioTrigger: 'heartbeat',
    },
    {
      day: 8,
      stage: 'organogenesis',
      title: localized('Eye Pigmentation & Limb Buds', 'Augenpigment und Gliedmaßenknospen'),
      scientificSummary: localized(
        'Chorioallantoic membrane expands. Prominent pigmented eye spot and limb buds form.',
        'Die Chorioallantoismembran dehnt sich aus. Ein deutlich pigmentierter Augenfleck und Gliedmaßenknospen entstehen.'
      ),
      candling: {
        bloodVesselsVisible: true,
        eyeSpotVisible: true,
        embryoSilhouettePct: 0.25,
        airCellPct: 0.1,
        movementDetectable: true,
      },
      audioTrigger: 'heartbeat',
    },
    {
      day: 14,
      stage: 'organogenesis',
      title: localized('Down Feathers & Rapid Growth', 'Daunen und schnelles Wachstum'),
      scientificSummary: localized(
        'Embryo turns along the long axis. Feathers begin developing; silhouette fills the egg.',
        'Der Embryo dreht sich entlang der Längsachse. Federn beginnen zu wachsen; die Silhouette füllt das Ei.'
      ),
      candling: {
        bloodVesselsVisible: true,
        eyeSpotVisible: true,
        embryoSilhouettePct: 0.55,
        airCellPct: 0.15,
        movementDetectable: true,
      },
      audioTrigger: 'embryo_movement',
    },
    {
      day: 19,
      stage: 'internal_pip',
      title: localized('Internal Pip', 'Innerer Pick'),
      scientificSummary: localized(
        'Beak penetrates the air cell. Pulmonary respiration initiates; faint clicking and peeping audible.',
        'Der Schnabel durchstößt die Luftkammer. Die Lungenatmung beginnt; leises Klicken und Piepen ist hörbar.'
      ),
      candling: {
        bloodVesselsVisible: false,
        eyeSpotVisible: false,
        embryoSilhouettePct: 0.82,
        airCellPct: 0.22,
        movementDetectable: true,
      },
      audioTrigger: 'internal_chirp',
    },
    {
      day: 20,
      stage: 'external_pip',
      title: localized('External Pip', 'Äußerer Pick'),
      scientificSummary: localized(
        'Egg tooth fractures the outer calcified shell. Turning must cease completely.',
        'Der Eizahn bricht die verkalkte Außenschale. Das Wenden muss vollständig eingestellt werden.'
      ),
      candling: {
        bloodVesselsVisible: false,
        eyeSpotVisible: false,
        embryoSilhouettePct: 0.9,
        airCellPct: 0.25,
        movementDetectable: true,
      },
      audioTrigger: 'shell_pip',
    },
    {
      day: 21,
      stage: 'hatchling',
      title: localized('Emergence', 'Schlupf'),
      scientificSummary: localized(
        'Chick completes rotation around the blunt pole, pushes the cap open, and emerges wet and exhausted.',
        'Das Küken vollendet die Drehung um den stumpfen Pol, drückt die Kappe auf und schlüpft nass und erschöpft.'
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
