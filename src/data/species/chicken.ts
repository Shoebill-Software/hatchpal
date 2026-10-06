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
