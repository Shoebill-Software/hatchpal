import type { SpeciesId } from '@/domain/types';
import { ballPythonConfig } from './ballPython';
import { barnOwlConfig } from './barnOwl';
import { silkieChickenConfig } from './chicken';
import { commonOstrichConfig } from './commonOstrich';
import { emuConfig } from './emu';
import { emperorPenguinConfig } from './emperorPenguin';
import { leopardGeckoConfig } from './gecko';
import { mandarinDuckConfig } from './mandarinDuck';
import { peregrineFalconConfig } from './peregrineFalcon';
import { platypusConfig } from './platypus';
import { americanRobinConfig } from './robin';
import { saltwaterCrocodileConfig } from './saltwaterCrocodile';
import { greenSeaTurtleConfig } from './turtle';
import { veiledChameleonConfig } from './veiledChameleon';

export interface ClimateSetpoint {
  temperatureTargetCelsius: number;
  humidityTargetPct: number;
}

const SETPOINTS: Record<SpeciesId, ClimateSetpoint> = {
  silkie_chicken: pick(silkieChickenConfig),
  peregrine_falcon: pick(peregrineFalconConfig),
  barn_owl: pick(barnOwlConfig),
  mandarin_duck: pick(mandarinDuckConfig),
  american_robin: pick(americanRobinConfig),
  emperor_penguin: pick(emperorPenguinConfig),
  common_ostrich: pick(commonOstrichConfig),
  emu: pick(emuConfig),
  leopard_gecko: pick(leopardGeckoConfig),
  veiled_chameleon: pick(veiledChameleonConfig),
  ball_python: pick(ballPythonConfig),
  green_sea_turtle: pick(greenSeaTurtleConfig),
  saltwater_crocodile: pick(saltwaterCrocodileConfig),
  platypus: pick(platypusConfig),
};

export function climateSetpoint(speciesId: SpeciesId): ClimateSetpoint {
  return SETPOINTS[speciesId] ?? SETPOINTS.silkie_chicken;
}

function pick(config: { temperatureTargetCelsius: number; humidityTargetPct: number }): ClimateSetpoint {
  return {
    temperatureTargetCelsius: config.temperatureTargetCelsius,
    humidityTargetPct: config.humidityTargetPct,
  };
}
