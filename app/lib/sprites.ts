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
export const SPRITES: Partial<Record<CharacterClass, Partial<Record<SpriteAnim, SpriteSheet>>>> = {
  knight: {
    // Temporary idle built from the first walk frame until the real idle is generated
    idle: { src: '/sprites/knight/idle.png', frames: 2, fps: 2, loop: true },
    walk: { src: '/sprites/knight/walk.png', frames: 8, fps: 12, loop: true },
  },
};

export const hasSprites = (cls: CharacterClass) => Boolean(SPRITES[cls]?.idle);

export const getSheet = (cls: CharacterClass, anim: SpriteAnim): SpriteSheet | undefined =>
  SPRITES[cls]?.[anim] ?? SPRITES[cls]?.idle;
