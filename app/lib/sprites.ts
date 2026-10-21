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
    idle: { src: '/sprites/knight/idle.png', frames: 8, fps: 6, loop: true },
    walk: { src: '/sprites/knight/walk.png', frames: 8, fps: 12, loop: true },
    attack: { src: '/sprites/knight/attack.png', frames: 9, fps: 16, loop: false },
    hurt: { src: '/sprites/knight/hurt.png', frames: 9, fps: 18, loop: false },
    death: { src: '/sprites/knight/death.png', frames: 9, fps: 12, loop: false },
  },
};

export const hasSprites = (cls: CharacterClass) => Boolean(SPRITES[cls]?.idle);

export const getSheet = (cls: CharacterClass, anim: SpriteAnim): SpriteSheet | undefined =>
  SPRITES[cls]?.[anim] ?? SPRITES[cls]?.idle;

// Duration of a dedicated (non-fallback) animation in ms, or null when the class has none
export const spriteDuration = (cls: CharacterClass, anim: SpriteAnim): number | null => {
  const sheet = SPRITES[cls]?.[anim];
  return sheet ? (sheet.frames / sheet.fps) * 1000 : null;
};
