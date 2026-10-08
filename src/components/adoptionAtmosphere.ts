import type { SpeciesId } from '@/domain/types';

/** Full-bleed adoption lighting. Each stop is an environmental wash, not a spotlight. */
export interface AdoptionAtmosphere {
  high: string;
  mid: string;
  low: string;
  rim: string;
}

export const ADOPTION_ATMOSPHERE: Record<SpeciesId, AdoptionAtmosphere> = {
  silkie_chicken: { high: '#F8E7C4', mid: '#E7C56A', low: '#8A6230', rim: '#FFF1C8' },
  peregrine_falcon: { high: '#E7D7C0', mid: '#C4A574', low: '#5C4630', rim: '#F6E6C8' },
  barn_owl: { high: '#D5E6D4', mid: '#3E6A48', low: '#163024', rim: '#E7F3DE' },
  mandarin_duck: { high: '#F8D7B0', mid: '#E08A3A', low: '#8A4A1C', rim: '#FFE0B4' },
  american_robin: { high: '#E4F3F6', mid: '#7EB8C4', low: '#355860', rim: '#F3FBFD' },
  emperor_penguin: { high: '#D5DEE6', mid: '#7E93A4', low: '#243440', rim: '#E8F1F6' },
  common_ostrich: { high: '#F6E6C4', mid: '#E2C07A', low: '#8A6A3A', rim: '#FFF0C8' },
  emu: { high: '#D5E4D4', mid: '#3E6B4A', low: '#173024', rim: '#E4F2DC' },
  leopard_gecko: { high: '#F6E4B8', mid: '#E3B84A', low: '#8A6820', rim: '#FFF3C4' },
  veiled_chameleon: { high: '#CDE4D4', mid: '#1F7A4D', low: '#123828', rim: '#DCF3E4' },
  ball_python: { high: '#F3E2C0', mid: '#C6A15A', low: '#6A5030', rim: '#FFF0D0' },
  green_sea_turtle: { high: '#C9E4E0', mid: '#3D8F86', low: '#163E3A', rim: '#DFF6F2' },
  saltwater_crocodile: { high: '#D5E0D4', mid: '#3E5C48', low: '#17241C', rim: '#E4F0E6' },
  platypus: { high: '#D5E4E0', mid: '#6A8F88', low: '#203430', rim: '#E7F4F0' },
};
