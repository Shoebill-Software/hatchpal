import type {
  AudioMilestoneTrigger,
  BiologicalMilestone,
  CandlingFeatures,
  DevelopmentStage,
} from '@/domain/types';

export type ShellKind = 'calcareous' | 'leathery' | 'monotreme';

export interface ArcStage {
  day: number;
  title: string;
  summary: string;
}

export interface IncubationArcInput {
  shell: ShellKind;
  cleavage: ArcStage;
  vascular: ArcStage;
  eye: ArcStage;
  growth: ArcStage;
  internalPip: ArcStage;
  externalPip: ArcStage;
  emergence: ArcStage;
}

const ORDER = [
  'cleavage',
  'vascular',
  'eye',
  'growth',
  'internalPip',
  'externalPip',
  'emergence',
] as const;

type ArcKey = (typeof ORDER)[number];

const STAGE: Record<ArcKey, DevelopmentStage> = {
  cleavage: 'cleavage',
  vascular: 'vascular',
  eye: 'organogenesis',
  growth: 'organogenesis',
  internalPip: 'internal_pip',
  externalPip: 'external_pip',
  emergence: 'hatchling',
};

const AUDIO: Record<ArcKey, AudioMilestoneTrigger> = {
  cleavage: 'silent',
  vascular: 'heartbeat',
  eye: 'heartbeat',
  growth: 'embryo_movement',
  internalPip: 'internal_chirp',
  externalPip: 'shell_pip',
  emergence: 'hatch_call',
};

const CANDLING: Record<ShellKind, Record<ArcKey, CandlingFeatures>> = {
  calcareous: {
    cleavage: {
      bloodVesselsVisible: false,
      eyeSpotVisible: false,
      embryoSilhouettePct: 0.02,
      airCellPct: 0.05,
      movementDetectable: false,
    },
    vascular: {
      bloodVesselsVisible: true,
      eyeSpotVisible: false,
      embryoSilhouettePct: 0.08,
      airCellPct: 0.07,
      movementDetectable: false,
    },
    eye: {
      bloodVesselsVisible: true,
      eyeSpotVisible: true,
      embryoSilhouettePct: 0.26,
      airCellPct: 0.11,
      movementDetectable: true,
    },
    growth: {
      bloodVesselsVisible: true,
      eyeSpotVisible: true,
      embryoSilhouettePct: 0.58,
      airCellPct: 0.16,
      movementDetectable: true,
    },
    internalPip: {
      bloodVesselsVisible: false,
      eyeSpotVisible: false,
      embryoSilhouettePct: 0.82,
      airCellPct: 0.22,
      movementDetectable: true,
    },
    externalPip: {
      bloodVesselsVisible: false,
      eyeSpotVisible: false,
      embryoSilhouettePct: 0.9,
      airCellPct: 0.25,
      movementDetectable: true,
    },
    emergence: {
      bloodVesselsVisible: false,
      eyeSpotVisible: false,
      embryoSilhouettePct: 1,
      airCellPct: 0,
      movementDetectable: true,
    },
  },
  leathery: {
    cleavage: {
      bloodVesselsVisible: false,
      eyeSpotVisible: false,
      embryoSilhouettePct: 0.03,
      airCellPct: 0.03,
      movementDetectable: false,
    },
    vascular: {
      bloodVesselsVisible: true,
      eyeSpotVisible: false,
      embryoSilhouettePct: 0.1,
      airCellPct: 0.05,
      movementDetectable: false,
    },
    eye: {
      bloodVesselsVisible: true,
      eyeSpotVisible: true,
      embryoSilhouettePct: 0.28,
      airCellPct: 0.07,
      movementDetectable: true,
    },
    growth: {
      bloodVesselsVisible: true,
      eyeSpotVisible: true,
      embryoSilhouettePct: 0.55,
      airCellPct: 0.09,
      movementDetectable: true,
    },
    internalPip: {
      bloodVesselsVisible: false,
      eyeSpotVisible: false,
      embryoSilhouettePct: 0.78,
      airCellPct: 0.12,
      movementDetectable: true,
    },
    externalPip: {
      bloodVesselsVisible: false,
      eyeSpotVisible: false,
      embryoSilhouettePct: 0.88,
      airCellPct: 0.14,
      movementDetectable: true,
    },
    emergence: {
      bloodVesselsVisible: false,
      eyeSpotVisible: false,
      embryoSilhouettePct: 1,
      airCellPct: 0,
      movementDetectable: true,
    },
  },
  monotreme: {
    cleavage: {
      bloodVesselsVisible: false,
      eyeSpotVisible: false,
      embryoSilhouettePct: 0.04,
      airCellPct: 0.02,
      movementDetectable: false,
    },
    vascular: {
      bloodVesselsVisible: true,
      eyeSpotVisible: false,
      embryoSilhouettePct: 0.16,
      airCellPct: 0.04,
      movementDetectable: false,
    },
    eye: {
      bloodVesselsVisible: true,
      eyeSpotVisible: true,
      embryoSilhouettePct: 0.34,
      airCellPct: 0.06,
      movementDetectable: true,
    },
    growth: {
      bloodVesselsVisible: true,
      eyeSpotVisible: true,
      embryoSilhouettePct: 0.62,
      airCellPct: 0.08,
      movementDetectable: true,
    },
    internalPip: {
      bloodVesselsVisible: false,
      eyeSpotVisible: false,
      embryoSilhouettePct: 0.8,
      airCellPct: 0.1,
      movementDetectable: true,
    },
    externalPip: {
      bloodVesselsVisible: false,
      eyeSpotVisible: false,
      embryoSilhouettePct: 0.9,
      airCellPct: 0.12,
      movementDetectable: true,
    },
    emergence: {
      bloodVesselsVisible: false,
      eyeSpotVisible: false,
      embryoSilhouettePct: 1,
      airCellPct: 0,
      movementDetectable: true,
    },
  },
};

export function incubationArc(input: IncubationArcInput): BiologicalMilestone[] {
  return ORDER.map((key) => {
    const stage = input[key];
    return {
      day: stage.day,
      stage: STAGE[key],
      title: stage.title,
      scientificSummary: stage.summary,
      candling: CANDLING[input.shell][key],
      audioTrigger: AUDIO[key],
    };
  });
}
