import { CharacterClass } from '../types/game';

export interface CharacterDef {
  id: CharacterClass;
  name: string;
  emoji: string;
  hp: number;
  attack: number;
  range: number;
  passive: string;
  description: string;
  projectile: string; // shown flying toward the target on ranged attacks
  projectileMotion: 'aim' | 'spin' | 'upright'; // aim rotates the glyph toward the target, upright keeps it as drawn
}

export const CHARACTERS: Record<CharacterClass, CharacterDef> = {
  knight: {
    id: 'knight',
    name: 'Knight',
    emoji: '🤺',
    hp: 2,
    attack: 1,
    range: 0,
    passive: 'Armor: takes 1 less damage (min 1)',
    description: 'Slow to kill. Walks through the battlefield and outlasts everyone.',
    projectile: '🗡️',
    projectileMotion: 'spin',
  },
  archer: {
    id: 'archer',
    name: 'Archer',
    emoji: '🧝',
    hp: 2,
    attack: 1,
    range: 2,
    passive: "Eagle Eye: range 2, but can't hit enemies on its own tile",
    description: 'Picks off enemies from afar, helpless up close.',
    projectile: '➳',
    projectileMotion: 'aim',
  },
  mage: {
    id: 'mage',
    name: 'Mage',
    emoji: '🧙',
    hp: 1,
    attack: 2,
    range: 2,
    passive: 'Arcane: 2 damage up close, 1 damage at range 2+',
    description: 'Fireballs every enemy nearby, but falls to a single blow.',
    projectile: '🔥',
    projectileMotion: 'upright',
  },
  assassin: {
    id: 'assassin',
    name: 'Assassin',
    emoji: '🥷',
    hp: 2,
    attack: 2,
    range: 0,
    passive: 'Lifesteal: +1 HP on every kill',
    description: 'Lands on enemies and feeds on their defeat.',
    projectile: '✴️',
    projectileMotion: 'spin',
  },
};

export const CHARACTER_LIST = Object.values(CHARACTERS);
