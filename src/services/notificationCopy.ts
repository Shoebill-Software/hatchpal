import type { BiologicalMilestone, SpeciesConfig } from '@/domain/types';
import type { LocaleCode } from '@/i18n/locale';

export type AlertCopy = {
  title: string;
  body: string;
};

type CopyPair = { en: AlertCopy; de: AlertCopy };

const VASCULAR: CopyPair = {
  en: {
    title: 'Blood vessels have formed',
    body: 'Vital blood vessels have formed and can now be seen under light.',
  },
  de: {
    title: 'Blutgefäße haben sich gebildet',
    body: 'Lebenswichtige Blutgefäße haben sich gebildet und sind jetzt im Licht sichtbar.',
  },
};

const EYE: CopyPair = {
  en: {
    title: 'Eye spot visible',
    body: 'A pigmented eye spot has formed. The chorioallantoic membrane now lines the shell.',
  },
  de: {
    title: 'Augenfleck sichtbar',
    body: 'Ein pigmentierter Augenfleck hat sich gebildet. Die Chorioallantoismembran kleidet jetzt die Schale aus.',
  },
};

const GROWTH: CopyPair = {
  en: {
    title: 'Embryo movement',
    body: 'The embryo fills more than half the egg. Spontaneous limb movement can be seen under bright light.',
  },
  de: {
    title: 'Embryobewegung',
    body: 'Der Embryo füllt mehr als die Hälfte des Eis. Unter hellem Licht sind spontane Gliedmaßenbewegungen erkennbar.',
  },
};

const INTERNAL_PIP: Record<SpeciesConfig['id'], CopyPair> = {
  silkie_chicken: {
    en: {
      title: 'Internal pip',
      body: 'The beak has entered the air cell. Faint tapping or peeping can be heard.',
    },
    de: {
      title: 'Innerer Pick',
      body: 'Der Schnabel hat die Luftkammer erreicht. Leises Klopfen oder Piepen ist hörbar.',
    },
  },
  leopard_gecko: {
    en: {
      title: 'Internal pip',
      body: 'The snout has entered the air cell. Faint tapping or peeping can be heard.',
    },
    de: {
      title: 'Innerer Pick',
      body: 'Die Schnauze hat die Luftkammer erreicht. Leises Klopfen oder Piepen ist hörbar.',
    },
  },
  green_sea_turtle: {
    en: {
      title: 'Internal pip',
      body: 'The beak has entered the air cell. Faint tapping or peeping can be heard.',
    },
    de: {
      title: 'Innerer Pick',
      body: 'Der Schnabel hat die Luftkammer erreicht. Leises Klopfen oder Piepen ist hörbar.',
    },
  },
};

const EXTERNAL_PIP: Record<SpeciesConfig['id'], CopyPair> = {
  silkie_chicken: {
    en: {
      title: 'External pip',
      body: 'The egg tooth has cracked the outer shell. Turning must cease.',
    },
    de: {
      title: 'Äußerer Pick',
      body: 'Der Eizahn hat die Außenschale aufgebrochen. Das Wenden muss eingestellt werden.',
    },
  },
  leopard_gecko: {
    en: {
      title: 'External pip',
      body: 'The egg tooth has slit the outer shell.',
    },
    de: {
      title: 'Äußerer Pick',
      body: 'Der Eizahn hat die Außenschale aufgeschlitzt.',
    },
  },
  green_sea_turtle: {
    en: {
      title: 'External pip',
      body: 'The caruncle has ruptured the outer shell.',
    },
    de: {
      title: 'Äußerer Pick',
      body: 'Die Caruncula hat die Außenschale aufgerissen.',
    },
  },
};

const HATCH: Record<SpeciesConfig['id'], CopyPair> = {
  silkie_chicken: {
    en: {
      title: 'Hatch day',
      body: 'The chick is emerging from the shell.',
    },
    de: {
      title: 'Schlupftag',
      body: 'Das Küken schlüpft aus der Schale.',
    },
  },
  leopard_gecko: {
    en: {
      title: 'Hatch day',
      body: 'The hatchling is emerging from the shell.',
    },
    de: {
      title: 'Schlupftag',
      body: 'Das Jungtier schlüpft aus der Schale.',
    },
  },
  green_sea_turtle: {
    en: {
      title: 'Hatch day',
      body: 'The hatchling is emerging from the shell.',
    },
    de: {
      title: 'Schlupftag',
      body: 'Der Schlüpfling schlüpft aus der Schale.',
    },
  },
};

export function milestoneChannelCopy(locale: LocaleCode): { name: string; description: string } {
  if (locale === 'de') {
    return {
      name: 'Brutmeilensteine',
      description: 'Offline-Hinweise zu biologischen Brutmeilensteinen.',
    };
  }
  return {
    name: 'Incubation milestones',
    description: 'Offline alerts for biological incubation milestones.',
  };
}

export function milestoneAlertCopy(
  milestone: BiologicalMilestone,
  species: SpeciesConfig,
  locale: LocaleCode
): AlertCopy | null {
  const pair = copyPairFor(milestone, species);
  if (!pair) {
    return null;
  }
  return locale === 'de' ? pair.de : pair.en;
}

function copyPairFor(milestone: BiologicalMilestone, species: SpeciesConfig): CopyPair | null {
  switch (milestone.stage) {
    case 'vascular':
      return VASCULAR;
    case 'organogenesis':
      return milestone.audioTrigger === 'embryo_movement' ? GROWTH : EYE;
    case 'internal_pip':
      return INTERNAL_PIP[species.id];
    case 'external_pip':
      return EXTERNAL_PIP[species.id];
    case 'hatchling':
      return HATCH[species.id];
    default:
      return null;
  }
}
