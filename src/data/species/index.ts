import { SpeciesConfig, SpeciesId } from '@/domain/types';
import { resolveSpeciesId } from '@/domain/petIntegrity';
import { silkieChickenConfig } from './chicken';
import { leopardGeckoConfig } from './gecko';
import { greenSeaTurtleConfig } from './turtle';

export const FALLBACK_SPECIES_ID: SpeciesId = 'silkie_chicken';

export const SPECIES_REGISTRY: Record<SpeciesId, SpeciesConfig> = {
  silkie_chicken: silkieChickenConfig,
  leopard_gecko: leopardGeckoConfig,
  green_sea_turtle: greenSeaTurtleConfig,
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
  return [silkieChickenConfig, leopardGeckoConfig, greenSeaTurtleConfig];
}
