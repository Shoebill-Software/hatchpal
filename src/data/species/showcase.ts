import {
  SPECIES_IDS,
  type DifficultyTag,
  type PortraitStage,
  type SpeciesId,
  type SpeciesShowcase,
} from '@/domain/types';

export function portraitKey(id: SpeciesId, stage: PortraitStage): string {
  return `${id}.${stage}`;
}

export function parsePortraitKey(
  key: string
): { speciesId: SpeciesId; stage: PortraitStage } | null {
  const dot = key.lastIndexOf('.');
  if (dot <= 0) {
    return null;
  }
  const id = key.slice(0, dot);
  const stage = key.slice(dot + 1);
  if (stage !== 'baby' && stage !== 'adult') {
    return null;
  }
  if (!(SPECIES_IDS as readonly string[]).includes(id)) {
    return null;
  }
  return { speciesId: id as SpeciesId, stage };
}

function dossier(
  id: SpeciesId,
  profile: {
    funFacts: SpeciesShowcase['funFacts'];
    habitat: string;
    temperament: string;
    difficultyTag: DifficultyTag;
  }
): SpeciesShowcase {
  return {
    ...profile,
    babyIllustration: portraitKey(id, 'baby'),
    adultIllustration: portraitKey(id, 'adult'),
  };
}

export const speciesShowcase: Record<SpeciesId, SpeciesShowcase> = {
  silkie_chicken: dossier('silkie_chicken', {
    habitat: 'Garden coops of East Asia',
    temperament: 'Docile & Affectionate',
    difficultyTag: 'gentle',
    funFacts: [
      'Silkies are fibromelanistic: the skin, bones, and connective tissue are black, while the earlobes are turquoise.',
      'A fifth toe and feathered shanks are breed traits, and the crest grows from a vaulted skull.',
      'The feathers lack barbicels, so the plumage stays hair-soft instead of forming a smooth vane.',
    ],
  }),
  peregrine_falcon: dossier('peregrine_falcon', {
    habitat: 'Sea cliffs and city ledges',
    temperament: 'Swift & Solitary',
    difficultyTag: 'intermediate',
    funFacts: [
      'A hunting stoop can pass 320 km/h, the fastest dive recorded for any animal.',
      'A notch in the beak, the tomial tooth, helps the falcon sever the neck of prey caught in flight.',
      'Nest ledges on skyscrapers stand in for the sea cliffs this falcon still uses in the wild.',
    ],
  }),
  barn_owl: dossier('barn_owl', {
    habitat: 'Open farmland and barn lofts',
    temperament: 'Nocturnal & Precise',
    difficultyTag: 'intermediate',
    funFacts: [
      'The heart-shaped facial disc funnels sound, and the ears sit at uneven heights so prey can be pinpointed in the dark.',
      'A comb along the leading edge of the wing softens turbulence, which is why the flight is nearly silent.',
      'Small mammals are swallowed whole, and the bones return later as a coughed-up pellet.',
    ],
  }),
  mandarin_duck: dossier('mandarin_duck', {
    habitat: 'East Asian forest ponds',
    temperament: 'Ornate & Pair-bonded',
    difficultyTag: 'intermediate',
    funFacts: [
      "The male's orange sails are enlarged tertial feathers, lifted in courtship on quiet forest ponds.",
      'The nest is a tree cavity, and the ducklings leap to the ground on the day they hatch.',
      'Wild pairs often stay together across seasons, which is why the mandarin became a symbol of fidelity.',
    ],
  }),
  american_robin: dossier('american_robin', {
    habitat: 'North American lawns and woodland edges',
    temperament: 'Alert & Tuneful',
    difficultyTag: 'gentle',
    funFacts: [
      'The unmarked blue-green egg is tinted by biliverdin, a pigment laid down in the shell gland.',
      'A robin cocks its head to watch the soil, hunting earthworms by sight rather than by sound.',
      'The brick-red breast is a territorial signal, and the dawn song is a clear, repeated phrase.',
    ],
  }),
  emperor_penguin: dossier('emperor_penguin', {
    habitat: 'Antarctic coastal ice',
    temperament: 'Steadfast & Social',
    difficultyTag: 'patience_master',
    funFacts: [
      'The male balances the single egg on his feet through the Antarctic winter, fasting while the female feeds at sea.',
      'A dense underdown and a huddle that rotates through the colony keep the egg above freezing.',
      "The chick hatches into silver-grey down and waits on the male's feet for the returning parent's first meal.",
    ],
  }),
  common_ostrich: dossier('common_ostrich', {
    habitat: 'African savanna',
    temperament: 'Bold & Watchful',
    difficultyTag: 'intermediate',
    funFacts: [
      'This is the largest egg of any living bird, and one shell can weigh more than a kilogram.',
      'Ostriches cannot fly. They are the fastest runners on two legs, with a sprint that can pass 60 km/h.',
      "Each foot has two toes, and the larger nail is the bird's main defense.",
    ],
  }),
  emu: dossier('emu', {
    habitat: 'Australian grasslands',
    temperament: 'Curious & Grounded',
    difficultyTag: 'intermediate',
    funFacts: [
      'The male incubates the clutch and raises the striped chicks, eating very little through the long sit.',
      'The shell is a deep green-black and unusually thick for a bird egg.',
      'Adults wear shaggy double feathers and bare blue skin on the neck, used in display.',
    ],
  }),
  leopard_gecko: dossier('leopard_gecko', {
    habitat: 'Rocky deserts of South Asia',
    temperament: 'Calm & Crepuscular',
    difficultyTag: 'intermediate',
    funFacts: [
      'Leopard geckos have movable eyelids and no sticky toe pads, so they walk the ground instead of climbing glass.',
      'The tail stores fat. If it is dropped, it twitches to distract a predator and later regrows.',
      'They hunt at dusk among the rocky deserts of Afghanistan, Pakistan, and India.',
    ],
  }),
  veiled_chameleon: dossier('veiled_chameleon', {
    habitat: 'Arabian mountain terraces',
    temperament: 'Watchful & Independent',
    difficultyTag: 'patience_master',
    funFacts: [
      'Each eye swivels on its own, and together they survey nearly a full circle before both lock onto prey.',
      'The tongue can reach farther than the body and strikes an insect in a fraction of a second.',
      'Color shifts signal mood and temperature, and a tall casque marks a mature male.',
    ],
  }),
  ball_python: dossier('ball_python', {
    habitat: 'West African savanna edges',
    temperament: 'Shy & Deliberate',
    difficultyTag: 'intermediate',
    funFacts: [
      'A startled ball python tucks its head into the middle of a tight coil, which is how the species got its name.',
      'Heat-sensing pits along the lips read warm-blooded prey in the dark.',
      'The female incubates the clutch and shivers in rhythmic waves to warm the eggs.',
    ],
  }),
  green_sea_turtle: dossier('green_sea_turtle', {
    habitat: 'Tropical seagrass beds and coral reefs',
    temperament: 'Ancient & Serene',
    difficultyTag: 'patience_master',
    funFacts: [
      'Hatchlings aim for the bright horizon, and adults later cross oceans using a magnetic map.',
      "Grazing on seagrass keeps the meadows short, which is the adult's main work on the reef.",
      'A nesting female often returns to the same beach where she herself hatched.',
    ],
  }),
  saltwater_crocodile: dossier('saltwater_crocodile', {
    habitat: 'Indo-Pacific mangrove estuaries',
    temperament: 'Patient & Powerful',
    difficultyTag: 'patience_master',
    funFacts: [
      'The saltwater crocodile is the largest living reptile. This profile follows a male of about 4.8 m.',
      'A mother guards the mound nest and may carry her hatchlings to the water in her jaws.',
      'Salt glands on the tongue let these crocodiles hunt in estuaries and along the open coast.',
    ],
  }),
  platypus: dossier('platypus', {
    habitat: 'Eastern Australian freshwater streams',
    temperament: 'Secretive & Aquatic',
    difficultyTag: 'gentle',
    funFacts: [
      'The platypus is one of the few mammals that lays eggs. The young hatch after about ten days in a riverbank burrow.',
      'The bill senses the electrical pulses of freshwater prey, so the animal can hunt with its eyes closed.',
      'Males carry a venomous spur on the hind ankle, used against rivals in the breeding season.',
    ],
  }),
};
