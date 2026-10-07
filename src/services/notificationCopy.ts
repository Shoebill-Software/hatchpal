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

function alert(enBody: string, deBody: string, enTitle: string, deTitle: string): CopyPair {
  return {
    en: { title: enTitle, body: enBody },
    de: { title: deTitle, body: deBody },
  };
}

function internalPip(enBody: string, deBody: string): CopyPair {
  return alert(enBody, deBody, 'Internal pip', 'Innerer Pick');
}

function externalPip(enBody: string, deBody: string): CopyPair {
  return alert(enBody, deBody, 'External pip', 'Äußerer Pick');
}

function hatchDay(enBody: string, deBody: string): CopyPair {
  return alert(enBody, deBody, 'Hatch day', 'Schlupftag');
}

const INTERNAL_PIP: Record<SpeciesConfig['id'], CopyPair> = {
  silkie_chicken: internalPip(
    'The beak has entered the air cell. Faint tapping or peeping can be heard.',
    'Der Schnabel hat die Luftkammer erreicht. Leises Klopfen oder Piepen ist hörbar.'
  ),
  peregrine_falcon: internalPip(
    'The beak has entered the air cell. Faint tapping or peeping can be heard through the russet shell.',
    'Der Schnabel hat die Luftkammer erreicht. Leises Klopfen oder Piepen ist durch die rotbraune Schale hörbar.'
  ),
  barn_owl: internalPip(
    'The beak has entered the air cell. A soft hiss or peep may be audible.',
    'Der Schnabel hat die Luftkammer erreicht. Ein leises Zischen oder Piepen kann hörbar sein.'
  ),
  mandarin_duck: internalPip(
    'The bill has entered the air cell. Faint peeping can be heard.',
    'Der Schnabel hat die Luftkammer erreicht. Leises Piepen ist hörbar.'
  ),
  emperor_penguin: internalPip(
    'The beak has entered the air cell at the blunt end of the pyriform egg.',
    'Der Schnabel hat die Luftkammer am stumpfen Ende des birnenförmigen Eis erreicht.'
  ),
  common_ostrich: internalPip(
    'The beak has entered the air cell of the massive shell.',
    'Der Schnabel hat die Luftkammer der massiven Schale erreicht.'
  ),
  leopard_gecko: internalPip(
    'The snout has entered the air cell. Faint tapping or peeping can be heard.',
    'Die Schnauze hat die Luftkammer erreicht. Leises Klopfen oder Piepen ist hörbar.'
  ),
  veiled_chameleon: internalPip(
    'The snout has entered the small air space. The embryo shifts inside the leathery capsule.',
    'Die Schnauze hat den kleinen Luftraum erreicht. Der Embryo bewegt sich in der ledrigen Kapsel.'
  ),
  ball_python: internalPip(
    'The snout has entered the air cell. The embryo shifts inside the leathery shell.',
    'Die Schnauze hat die Luftkammer erreicht. Der Embryo bewegt sich in der ledrigen Schale.'
  ),
  green_sea_turtle: internalPip(
    'The beak has entered the air cell. Faint tapping or peeping can be heard.',
    'Der Schnabel hat die Luftkammer erreicht. Leises Klopfen oder Piepen ist hörbar.'
  ),
  saltwater_crocodile: internalPip(
    'The snout has entered the air cell. A grunt may be audible through the shell.',
    'Die Schnauze hat die Luftkammer erreicht. Ein Grunzen kann durch die Schale hörbar sein.'
  ),
  platypus: internalPip(
    'The embryo fills the tiny shell. A faint pulse is the only sign of movement.',
    'Der Embryo füllt die winzige Schale. Ein schwacher Puls ist das einzige Zeichen von Bewegung.'
  ),
};

const EXTERNAL_PIP: Record<SpeciesConfig['id'], CopyPair> = {
  silkie_chicken: externalPip(
    'The egg tooth has cracked the outer shell. Turning must cease.',
    'Der Eizahn hat die Außenschale aufgebrochen. Das Wenden muss eingestellt werden.'
  ),
  peregrine_falcon: externalPip(
    'The egg tooth has starred the russet shell. Turning must cease.',
    'Der Eizahn hat die rotbraune Schale sternförmig aufgebrochen. Das Wenden muss eingestellt werden.'
  ),
  barn_owl: externalPip(
    'The egg tooth has cracked the white shell.',
    'Der Eizahn hat die weiße Schale aufgebrochen.'
  ),
  mandarin_duck: externalPip(
    'The egg tooth has cracked the cream shell. Turning must cease.',
    'Der Eizahn hat die cremefarbene Schale aufgebrochen. Das Wenden muss eingestellt werden.'
  ),
  emperor_penguin: externalPip(
    'The egg tooth has cracked the chalky shell.',
    'Der Eizahn hat die kreidige Schale aufgebrochen.'
  ),
  common_ostrich: externalPip(
    'The egg tooth has cracked the pitted shell.',
    'Der Eizahn hat die porige Schale aufgebrochen.'
  ),
  leopard_gecko: externalPip(
    'The egg tooth has slit the outer shell.',
    'Der Eizahn hat die Außenschale aufgeschlitzt.'
  ),
  veiled_chameleon: externalPip(
    'The egg tooth has slit the leathery shell.',
    'Der Eizahn hat die ledrige Schale aufgeschlitzt.'
  ),
  ball_python: externalPip(
    'The egg tooth has slit the leathery shell.',
    'Der Eizahn hat die ledrige Schale aufgeschlitzt.'
  ),
  green_sea_turtle: externalPip(
    'The caruncle has ruptured the outer shell.',
    'Die Caruncula hat die Außenschale aufgerissen.'
  ),
  saltwater_crocodile: externalPip(
    'The egg tooth has cracked the calcareous shell.',
    'Der Eizahn hat die Kalkschale aufgebrochen.'
  ),
  platypus: externalPip(
    'The egg tooth has slit the leathery shell.',
    'Der Eizahn hat die ledrige Schale aufgeschlitzt.'
  ),
};

const HATCH: Record<SpeciesConfig['id'], CopyPair> = {
  silkie_chicken: hatchDay('The chick is emerging from the shell.', 'Das Küken schlüpft aus der Schale.'),
  peregrine_falcon: hatchDay('The eyas is emerging from the shell.', 'Der Ästling schlüpft aus der Schale.'),
  barn_owl: hatchDay('The owlet is emerging from the shell.', 'Das Küken schlüpft aus der Schale.'),
  mandarin_duck: hatchDay('The duckling is emerging from the shell.', 'Das Entenküken schlüpft aus der Schale.'),
  emperor_penguin: hatchDay(
    'The chick is emerging onto the parent’s feet.',
    'Das Küken schlüpft auf die Füße des Elterntiers.'
  ),
  common_ostrich: hatchDay('The chick is emerging from the shell.', 'Das Küken schlüpft aus der Schale.'),
  leopard_gecko: hatchDay('The hatchling is emerging from the shell.', 'Das Jungtier schlüpft aus der Schale.'),
  veiled_chameleon: hatchDay('The hatchling is emerging from the shell.', 'Der Schlüpfling schlüpft aus der Schale.'),
  ball_python: hatchDay('The hatchling is emerging from the shell.', 'Der Schlüpfling schlüpft aus der Schale.'),
  green_sea_turtle: hatchDay('The hatchling is emerging from the shell.', 'Der Schlüpfling schlüpft aus der Schale.'),
  saltwater_crocodile: hatchDay(
    'The hatchling is emerging from the shell.',
    'Der Schlüpfling schlüpft aus der Schale.'
  ),
  platypus: hatchDay('The hatchling is emerging into the burrow.', 'Der Schlüpfling schlüpft in den Bau.'),
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
