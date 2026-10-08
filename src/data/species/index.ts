import { SPECIES_IDS, SpeciesConfig, SpeciesId } from '@/domain/types';
import { resolveSpeciesId } from '@/domain/petIntegrity';
import { ballPythonConfig } from './ballPython';
import { barnOwlConfig } from './barnOwl';
import { silkieChickenConfig } from './chicken';
import { commonOstrichConfig } from './commonOstrich';
import { emuConfig } from './emu';
import { emperorPenguinConfig } from './emperorPenguin';
import { leopardGeckoConfig } from './gecko';
import { mandarinDuckConfig } from './mandarinDuck';
import { americanRobinConfig } from './robin';
import { peregrineFalconConfig } from './peregrineFalcon';
import { platypusConfig } from './platypus';
import { saltwaterCrocodileConfig } from './saltwaterCrocodile';
import { greenSeaTurtleConfig } from './turtle';
import { veiledChameleonConfig } from './veiledChameleon';

export const FALLBACK_SPECIES_ID: SpeciesId = 'silkie_chicken';

export const SPECIES_REGISTRY: Record<SpeciesId, SpeciesConfig> = {
  silkie_chicken: silkieChickenConfig,
  peregrine_falcon: peregrineFalconConfig,
  barn_owl: barnOwlConfig,
  mandarin_duck: mandarinDuckConfig,
  american_robin: americanRobinConfig,
  emperor_penguin: emperorPenguinConfig,
  common_ostrich: commonOstrichConfig,
  emu: emuConfig,
  leopard_gecko: leopardGeckoConfig,
  veiled_chameleon: veiledChameleonConfig,
  ball_python: ballPythonConfig,
  green_sea_turtle: greenSeaTurtleConfig,
  saltwater_crocodile: saltwaterCrocodileConfig,
  platypus: platypusConfig,
};

export function getSpeciesConfig(id: unknown): SpeciesConfig {
  const resolvedId = resolveSpeciesId(id);
  const config = SPECIES_REGISTRY[resolvedId];
  if (config && config.milestones.length > 0) {
    return config;
  }
  return silkieChickenConfig;
}

export function listSpeciesConfigs(): SpeciesConfig[] {
  return SPECIES_IDS.map((id) => SPECIES_REGISTRY[id]);
}
