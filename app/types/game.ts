export type Color = 'red' | 'blue' | 'yellow' | 'green';

export type CharacterClass = 'knight' | 'archer' | 'mage' | 'assassin';

export type BuffType = 'HEAL' | 'ATTACK_RANGE' | 'SHIELD' | 'DOUBLE_DICE';

export interface Buff {
  type: BuffType;
  value: number;
  duration?: number; // turns, if any
}

export interface Piece {
  id: string;
  color: Color;
  position: number; // -1 for home, 0-51 for common path, 52-57 for home stretch, 57 is finished
  hp: number;
  maxHp: number;
  attack: number;
  range: number;
  buffs: Buff[];
}

export interface Player {
  id: string;
  name: string;
  color: Color;
  isBot: boolean;
  characterClass: CharacterClass;
  pieces: Piece[];
}

export type TileType = 'NORMAL' | 'SAFE' | 'BUFF_HEAL' | 'BUFF_ATTACK' | 'BUFF_RANGE';

export interface Tile {
  index: number;
  type: TileType;
}

export interface PieceStats {
  hp: number;
  maxHp: number;
  attack: number;
  range: number;
}

// Things that happen during a move, in order, so the UI can animate them one by one
export type GameEvent =
  | { type: 'buff'; pieceId: string; label: string; stats: PieceStats }
  | { type: 'attack'; attackerId: string; targetId: string; damage: number; hpAfter: number; killed: boolean }
  | { type: 'finish'; pieceId: string };

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  diceValue: number;
  isGameOver: boolean;
  gameLog: string[];
  winners: string[]; // List of player names in order of winning
}
