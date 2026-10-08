import type { BiologicalMilestone, SpeciesConfig } from '@/domain/types';

export type AlertCopy = {
  title: string;
  body: string;
};

const VASCULAR: AlertCopy = {
  title: 'Blood vessels have formed',
  body: 'Vital blood vessels have formed and can now be seen under light.',
};

const EYE: AlertCopy = {
  title: 'Eye spot visible',
  body: 'A pigmented eye spot has formed. The chorioallantoic membrane now lines the shell.',
};

const GROWTH: AlertCopy = {
  title: 'Embryo movement',
  body: 'The embryo fills more than half the egg. Spontaneous limb movement can be seen under bright light.',
};

function alert(title: string, body: string): AlertCopy {
  return { title, body };
}

function internalPip(body: string): AlertCopy {
  return alert('Internal Pip Detected', body);
}

function externalPip(body: string): AlertCopy {
  return alert('External pip', body);
}

function hatchDay(body: string): AlertCopy {
  return alert('Hatch day', body);
}

const INTERNAL_PIP: Record<SpeciesConfig['id'], AlertCopy> = {
  silkie_chicken: internalPip(
    'Faint tapping heard inside the shell. The beak has entered the air cell.'
  ),
  peregrine_falcon: internalPip(
    'The beak has entered the air cell. Faint tapping or peeping can be heard through the russet shell.'
  ),
  barn_owl: internalPip('The beak has entered the air cell. A soft hiss or peep may be audible.'),
  mandarin_duck: internalPip('The bill has entered the air cell. Faint peeping can be heard.'),
  emperor_penguin: internalPip(
    'The beak has entered the air cell at the blunt end of the pyriform egg.'
  ),
  common_ostrich: internalPip('The beak has entered the air cell of the massive shell.'),
  leopard_gecko: internalPip(
    'The snout has entered the air cell. Faint tapping or peeping can be heard.'
  ),
  veiled_chameleon: internalPip(
    'The snout has entered the small air space. The embryo shifts inside the leathery capsule.'
  ),
  ball_python: internalPip(
    'The snout has entered the air cell. The embryo shifts inside the leathery shell.'
  ),
  green_sea_turtle: internalPip(
    'The beak has entered the air cell. Faint tapping or peeping can be heard.'
  ),
  saltwater_crocodile: internalPip(
    'The snout has entered the air cell. A grunt may be audible through the shell.'
  ),
  platypus: internalPip('The embryo fills the tiny shell. A faint pulse is the only sign of movement.'),
  emu: internalPip('The beak has entered the air cell of the thick green shell. Faint tapping can be heard.'),
  american_robin: internalPip(
    'The beak has entered the air cell. Faint tapping can be heard inside the cyan shell.'
  ),
};

const EXTERNAL_PIP: Record<SpeciesConfig['id'], AlertCopy> = {
  silkie_chicken: externalPip('The egg tooth has cracked the outer shell. Turning must cease.'),
  peregrine_falcon: externalPip('The egg tooth has starred the russet shell. Turning must cease.'),
  barn_owl: externalPip('The egg tooth has cracked the white shell.'),
  mandarin_duck: externalPip('The egg tooth has cracked the cream shell. Turning must cease.'),
  emperor_penguin: externalPip('The egg tooth has cracked the chalky shell.'),
  common_ostrich: externalPip('The egg tooth has cracked the pitted shell.'),
  leopard_gecko: externalPip('The egg tooth has slit the outer shell.'),
  veiled_chameleon: externalPip('The egg tooth has slit the leathery shell.'),
  ball_python: externalPip('The egg tooth has slit the leathery shell.'),
  green_sea_turtle: externalPip('The caruncle has ruptured the outer shell.'),
  saltwater_crocodile: externalPip('The egg tooth has cracked the calcareous shell.'),
  platypus: externalPip('The egg tooth has slit the leathery shell.'),
  emu: externalPip('The egg tooth has starred the thick green shell.'),
  american_robin: externalPip('The egg tooth has starred the cyan shell. Turning must cease.'),
};

const HATCH: Record<SpeciesConfig['id'], AlertCopy> = {
  silkie_chicken: hatchDay('The chick is emerging from the shell.'),
  peregrine_falcon: hatchDay('The eyas is emerging from the shell.'),
  barn_owl: hatchDay('The owlet is emerging from the shell.'),
  mandarin_duck: hatchDay('The duckling is emerging from the shell.'),
  emperor_penguin: hatchDay('The chick is emerging onto the parent’s feet.'),
  common_ostrich: hatchDay('The chick is emerging from the shell.'),
  leopard_gecko: hatchDay('The hatchling is emerging from the shell.'),
  veiled_chameleon: hatchDay('The hatchling is emerging from the shell.'),
  ball_python: hatchDay('The hatchling is emerging from the shell.'),
  green_sea_turtle: hatchDay('The hatchling is emerging from the shell.'),
  saltwater_crocodile: hatchDay('The hatchling is emerging from the shell.'),
  platypus: hatchDay('The hatchling is emerging into the burrow.'),
  emu: hatchDay('The striped chick is emerging from the shell.'),
  american_robin: hatchDay('The nestling is emerging into the cup nest.'),
};

export function milestoneChannelCopy(): { name: string; description: string } {
  return {
    name: 'Incubation milestones',
    description: 'Offline alerts for biological incubation milestones.',
  };
}

export function milestoneAlertCopy(
  milestone: BiologicalMilestone,
  species: SpeciesConfig
): AlertCopy | null {
  return copyFor(milestone, species);
}

function copyFor(milestone: BiologicalMilestone, species: SpeciesConfig): AlertCopy | null {
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
