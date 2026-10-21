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
  spinProjectile: boolean;
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
    spinProjectile: true,
  },
  archer: {
    id: 'archer',
    name: 'Archer',
    emoji: '🧝',
    hp: 2,
    attack: 1,
    range: 2,
    passive: 'Eagle Eye: starts with range 2',
    description: 'Picks off enemies from afar.',
    projectile: '➳',
    spinProjectile: false,
  },
  mage: {
    id: 'mage',
    name: 'Mage',
    emoji: '🧙',
    hp: 1,
    attack: 2,
    range: 2,
    passive: 'Arcane: starts with 2 attack and range 2',
    description: 'Fireballs anything nearby, but falls to a single blow.',
    projectile: '🔥',
    spinProjectile: false,
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
    spinProjectile: true,
  },
};

export const CHARACTER_LIST = Object.values(CHARACTERS);
