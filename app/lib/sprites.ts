import { CharacterClass } from '../types/game';

export type SpriteAnim = 'idle' | 'walk' | 'attack' | 'hurt' | 'death';
export type Facing = 'left' | 'right';

export interface SpriteSheet {
  src: string; // horizontal strip, frames left to right, facing right
  frames: number;
  fps: number;
  loop: boolean;
}

// Registered sprite strips per class. Missing classes/animations fall back to emoji.
// See public/sprites/README.md for the expected art.
export const SPRITES: Partial<Record<CharacterClass, Partial<Record<SpriteAnim, SpriteSheet>>>> = {};

export const hasSprites = (cls: CharacterClass) => Boolean(SPRITES[cls]?.idle);

export const getSheet = (cls: CharacterClass, anim: SpriteAnim): SpriteSheet | undefined =>
  SPRITES[cls]?.[anim] ?? SPRITES[cls]?.idle;
