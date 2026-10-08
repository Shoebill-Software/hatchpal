import type { SpeciesConfig } from '@/domain/types';

import { speciesShowcase } from './showcase';

export const americanRobinConfig: SpeciesConfig = {
  id: 'american_robin',
  commonName: 'American Robin',
  scientificName: 'Turdus migratorius',
  incubationDays: 14,
  adultMaturationDays: 90,
  hatchWeightGrams: 5.5,
  adultWeightGrams: 77,
  baseHeartRateBpm: 270,
  temperatureTargetCelsius: 37.4,
  humidityTargetPct: 50,
  taxon: 'aves',
  tag: 'passerine',
  egg: {
    description: 'Unmarked cyan oval, smooth and matte.',
    lengthMm: 28,
    widthMm: 20,
    massGrams: 6.4,
    shape: 'oval',
    speckle: 'none',
    nest: {
      body: '#5EC8D8',
      stroke: '#2F8FA0',
      highlight: '#D8F6FA',
      speckle: '#3AA8B8',
      crack: '#1A4A52',
      castShadow: '#16383E',
    },
    candle: {
      body: '#8AD8E4',
      stroke: '#4AA8B8',
      highlight: '#F2FCFE',
      speckle: '#6EC4D0',
      interior: '#1C2A28',
      yolk: '#E08A28',
    },
  },
  growth: {
    glow: '#7ED0DC',
    shadow: '#1A3338',
    body: '#8A4A32',
    hatchlingMeasureCm: 5,
    adultMetricKind: 'wingspan',
    adultMeasureCm: 36,
    referenceScale: 'hand',
    referenceCentimeters: 18,
    reference: 'an adult hand',
    behavior:
      'A cup-nesting songbird. The nestling hatches blind and nearly naked, is brooded in the nest, and only later shows the brick-red breast of a foraging adult.',
    fieldNotes:
      'American robin eggs incubate in about 14 days at 37.4 °C. The unmarked cyan shell is turned through day 12. The eye spot is plain by day 5, internal pip is around day 12, and the altricial nestling hatches on day 14. Adult wingspan, about 36 cm, fills in over roughly three months.',
  },
  juvenile: {
    title: 'Spotted juvenile plumage',
    scientificSummary:
      'Natal down gives way to spotted breast feathers. The wings lengthen for the first flights, and the uniform brick-red adult breast is still absent.',
  },
  adult: {
    title: 'Adult breast and wings',
    scientificSummary:
      'The breast is brick red, the head is dark, and the wingspan used in short woodland flights is about 36 cm. Body mass settles near 77 g.',
  },
  showcase: speciesShowcase.american_robin,
  milestones: [
    {
      day: 0,
      stage: 'cleavage',
      title: 'Freshly Laid Clutch Egg',
      scientificSummary:
        'The unmarked cyan shell holds a small yolk. Cleavage begins on the germinal disc; the clutch is typically three to four eggs.',
      candling: {
        bloodVesselsVisible: false,
        eyeSpotVisible: false,
        embryoSilhouettePct: 0.03,
        airCellPct: 0.05,
        movementDetectable: false,
      },
      audioTrigger: 'silent',
    },
    {
      day: 2,
      stage: 'vascular',
      title: 'Vitelline Circulation',
      scientificSummary:
        'Blood islands coalesce quickly in this short incubation. A rapid embryonic pulse is already detectable under candling light.',
      candling: {
        bloodVesselsVisible: true,
        eyeSpotVisible: false,
        embryoSilhouettePct: 0.1,
        airCellPct: 0.07,
        movementDetectable: false,
      },
      audioTrigger: 'heartbeat',
    },
    {
      day: 5,
      stage: 'organogenesis',
      title: 'Eye Pigmentation & Limb Buds',
      scientificSummary:
        'The pigmented eye is a distinct dark locus. Limb buds form and the chorioallantois begins lining the shell.',
      candling: {
        bloodVesselsVisible: true,
        eyeSpotVisible: true,
        embryoSilhouettePct: 0.28,
        airCellPct: 0.1,
        movementDetectable: true,
      },
      audioTrigger: 'heartbeat',
    },
    {
      day: 9,
      stage: 'organogenesis',
      title: 'Down & Rapid Growth',
      scientificSummary:
        'The embryo fills most of the cavity. Natal down appears; spontaneous movement is obvious under bright transillumination.',
      candling: {
        bloodVesselsVisible: true,
        eyeSpotVisible: true,
        embryoSilhouettePct: 0.6,
        airCellPct: 0.14,
        movementDetectable: true,
      },
      audioTrigger: 'embryo_movement',
    },
    {
      day: 12,
      stage: 'internal_pip',
      title: 'Internal Pip',
      scientificSummary:
        'The beak enters the air cell. Pulmonary breathing begins; turning must stop so the nestling can unzip the shell.',
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
      day: 13,
      stage: 'external_pip',
      title: 'External Pip',
      scientificSummary:
        'The egg tooth stars the cyan shell. The nestling rests between pushes while finishing yolk absorption.',
      candling: {
        bloodVesselsVisible: false,
        eyeSpotVisible: false,
        embryoSilhouettePct: 0.92,
        airCellPct: 0.23,
        movementDetectable: true,
      },
      audioTrigger: 'shell_pip',
    },
    {
      day: 14,
      stage: 'hatchling',
      title: 'Emergence',
      scientificSummary:
        'The altricial nestling hatches wet and blind, then is brooded in the cup nest while residual yolk is internalized.',
      candling: {
        bloodVesselsVisible: false,
        eyeSpotVisible: false,
        embryoSilhouettePct: 1,
        airCellPct: 0,
        movementDetectable: true,
      },
      audioTrigger: 'hatch_call',
    },
  ],
};
