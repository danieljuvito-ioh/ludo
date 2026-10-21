import { CharacterClass, Color, GameEvent, Piece, Player, TileType } from '../types/game';
import { CHARACTERS } from './characters';

export const COLORS: Color[] = ['red', 'blue', 'yellow', 'green'];

export const BOARD_SIZE = 52; // Total common tiles
export const FINISH = 57;

export const START_POSITIONS: Record<Color, number> = {
  red: 0,
  blue: 13,
  yellow: 26,
  green: 39,
};

export const BUFF_LOCATIONS: Record<number, TileType> = {
  3: 'BUFF_HEAL',
  6: 'BUFF_ATTACK',
  10: 'BUFF_RANGE',
  16: 'BUFF_HEAL',
  19: 'BUFF_ATTACK',
  23: 'BUFF_RANGE',
  29: 'BUFF_HEAL',
  32: 'BUFF_ATTACK',
  36: 'BUFF_RANGE',
  42: 'BUFF_HEAL',
  45: 'BUFF_ATTACK',
  49: 'BUFF_RANGE',
};

export const SAFE_ZONES = [0, 8, 13, 21, 26, 34, 39, 47];

export interface PlayerConfig {
  color: Color;
  isBot: boolean;
  isActive: boolean;
  characterClass: CharacterClass;
}

const baseStats = (characterClass: CharacterClass) => {
  const def = CHARACTERS[characterClass];
  return { hp: def.hp, maxHp: def.hp, attack: def.attack, range: def.range };
};

export const createInitialPlayers = (configs: PlayerConfig[]): Player[] => {
  return configs
    .filter(conf => conf.isActive)
    .map((conf) => ({
      id: `player-${conf.color}`,
      name: `${conf.color.toUpperCase()} ${CHARACTERS[conf.characterClass].name}${conf.isBot ? ' (BOT)' : ''}`,
      color: conf.color,
      isBot: conf.isBot,
      characterClass: conf.characterClass,
      pieces: Array.from({ length: 4 }, (_, i) => ({
        id: `${conf.color}-${i}`,
        color: conf.color,
        position: -1,
        ...baseStats(conf.characterClass),
        buffs: [],
      })),
    }));
};

export const getTileType = (index: number): TileType => {
  if (BUFF_LOCATIONS[index]) return BUFF_LOCATIONS[index];
  if (SAFE_ZONES.includes(index)) return 'SAFE';
  return 'NORMAL';
};

// Helper to calculate actual board index for rendering
export const getGlobalIndex = (localPos: number, color: Color): number => {
  if (localPos === -1) return -1; // Home
  if (localPos >= 52) return localPos; // Home stretch or finished
  return (localPos + START_POSITIONS[color]) % 52;
};

export const circularDistance = (a: number, b: number) => {
  const dist = Math.abs(a - b);
  return Math.min(dist, BOARD_SIZE - dist);
};

export const canMove = (piece: Piece, roll: number) => {
  if (piece.position === -1) return roll === 6;
  return piece.position >= 0 && piece.position + roll <= FINISH;
};

export const isPlayerFinished = (player: Player) => player.pieces.every(p => p.position === FINISH);

export const findPiece = (players: Player[], pieceId: string) => {
  for (const player of players) {
    const piece = player.pieces.find(p => p.id === pieceId);
    if (piece) return { player, piece };
  }
  return null;
};

export const getNextPlayerIndex = (players: Player[], current: number) => {
  let next = (current + 1) % players.length;
  while (isPlayerFinished(players[next]) && next !== current) {
    next = (next + 1) % players.length;
  }
  return next;
};

export interface MoveResult {
  from: number;
  to: number;
  path: number[]; // every local position the piece steps on, in order
  players: Player[];
  events: GameEvent[];
  log: string[];
}

// Pure move resolution: computes the new state plus the ordered list of events to animate
export const resolveMove = (players: Player[], playerIndex: number, pieceId: string, roll: number): MoveResult | null => {
  const player = players[playerIndex];
  const original = player.pieces.find(p => p.id === pieceId);
  if (!original || !canMove(original, roll)) return null;

  const from = original.position;
  const to = from === -1 ? 0 : from + roll;
  const path = from === -1 ? [0] : Array.from({ length: roll }, (_, i) => from + i + 1);

  const next: Player[] = structuredClone(players);
  const mover = next[playerIndex].pieces.find(p => p.id === pieceId)!;
  const moverDef = CHARACTERS[player.characterClass];
  mover.position = to;

  const events: GameEvent[] = [];
  const log = [from === -1 ? `${player.name} deploys a ${moverDef.name}!` : `${player.name} moves to ${to}`];
  const statsOf = (p: Piece) => ({ hp: p.hp, maxHp: p.maxHp, attack: p.attack, range: p.range });

  if (to < BOARD_SIZE) {
    const currentGlobal = getGlobalIndex(to, mover.color);
    const buffType = BUFF_LOCATIONS[currentGlobal];
    if (buffType === 'BUFF_HEAL') {
      mover.hp += 1;
      mover.maxHp = Math.max(mover.maxHp, mover.hp);
      events.push({ type: 'buff', pieceId, label: '+1 ❤️', stats: statsOf(mover) });
      log.push(`✨ Healed! HP: ${mover.hp}`);
    } else if (buffType === 'BUFF_ATTACK') {
      mover.attack += 1;
      events.push({ type: 'buff', pieceId, label: '+1 ⚔️', stats: statsOf(mover) });
      log.push(`⚔️ Attack increased! Damage: ${mover.attack}`);
    } else if (buffType === 'BUFF_RANGE') {
      mover.range += 1;
      events.push({ type: 'buff', pieceId, label: '+1 🎯', stats: statsOf(mover) });
      log.push(`🎯 Range increased! Range: ${mover.range}`);
    }

    next.forEach((other, otherIdx) => {
      if (otherIdx === playerIndex) return;
      other.pieces.forEach(target => {
        if (target.position < 0 || target.position >= BOARD_SIZE) return;
        const targetGlobal = getGlobalIndex(target.position, target.color);
        if (SAFE_ZONES.includes(targetGlobal)) return;
        if (circularDistance(currentGlobal, targetGlobal) > mover.range) return;

        const armor = other.characterClass === 'knight' ? 1 : 0;
        const damage = Math.max(1, mover.attack - armor);
        target.hp -= damage;
        const killed = target.hp <= 0;
        events.push({ type: 'attack', attackerId: mover.id, targetId: target.id, damage, hpAfter: Math.max(0, target.hp), killed });

        if (killed) {
          Object.assign(target, baseStats(other.characterClass), { position: -1 });
          log.push(`💥 ${other.name}'s piece was defeated!`);
          if (player.characterClass === 'assassin') {
            mover.hp += 1;
            mover.maxHp = Math.max(mover.maxHp, mover.hp);
            events.push({ type: 'buff', pieceId, label: '🩸 +1', stats: statsOf(mover) });
            log.push(`🩸 Lifesteal! HP: ${mover.hp}`);
          }
        } else {
          log.push(`⚔️ ${other.name}'s piece took ${damage} damage. HP: ${target.hp}`);
        }
      });
    });
  }

  if (to === FINISH) {
    events.push({ type: 'finish', pieceId });
    log.push(`👑 ${player.name}'s piece reached the throne!`);
  }

  return { from, to, path, players: next, events, log };
};

// Simple greedy bot: prefer kills, then damage, then deploying, then progress
export const chooseBotMove = (players: Player[], playerIndex: number, roll: number): string | null => {
  let best: { id: string; score: number } | null = null;
  for (const piece of players[playerIndex].pieces) {
    const result = resolveMove(players, playerIndex, piece.id, roll);
    if (!result) continue;
    let score = result.to;
    for (const ev of result.events) {
      if (ev.type === 'attack') score += ev.killed ? 100 : 25 * ev.damage;
      if (ev.type === 'buff') score += 15;
      if (ev.type === 'finish') score += 60;
    }
    if (result.from === -1) score += 40;
    if (!best || score > best.score) best = { id: piece.id, score };
  }
  return best?.id ?? null;
};

// ---- Board geometry (15x15 grid) ----

export const PATH_COORDS: [number, number][] = [
  [6,1], [6,2], [6,3], [6,4], [6,5], [5,6], [4,6], [3,6], [2,6], [1,6], [0,6], [0,7], [0,8], [1,8], [2,8], [3,8], [4,8], [5,8], [6,9], [6,10], [6,11], [6,12], [6,13], [6,14], [7,14], [8,14], [8,13], [8,12], [8,11], [8,10], [8,9], [9,8], [10,8], [11,8], [12,8], [13,8], [14,8], [14,7], [14,6], [13,6], [12,6], [11,6], [10,6], [9,6], [8,5], [8,4], [8,3], [8,2], [8,1], [8,0], [7,0], [6,0]
];

export const getStretchCoords = (color: Color, localPos: number): [number, number] => {
  const step = localPos - 52;
  if (color === 'red') return [7, 1 + step];
  if (color === 'blue') return [1 + step, 7];
  if (color === 'yellow') return [7, 13 - step];
  return [13 - step, 7];
};

export const getPieceCoords = (position: number, color: Color): [number, number] => {
  if (position >= 52) return getStretchCoords(color, position);
  if (position < 0) return [7, 7];
  return PATH_COORDS[getGlobalIndex(position, color)];
};

// Board-relative center of a cell, in percent
export const cellCenter = ([row, col]: [number, number]) => ({ x: ((col + 0.5) / 15) * 100, y: ((row + 0.5) / 15) * 100 });

export type Cell =
  | { kind: 'path'; idx: number }
  | { kind: 'stretch'; color: Color; localPos: number }
  | { kind: 'base'; color: Color }
  | { kind: 'center' }
  | { kind: 'empty' };

// Precomputed once: what lives in each of the 225 grid cells
export const CELLS: Cell[] = Array.from({ length: 225 }, (_, i): Cell => {
  const row = Math.floor(i / 15), col = i % 15;
  const idx = PATH_COORDS.findIndex(([r, c]) => r === row && c === col);
  if (idx !== -1) return { kind: 'path', idx };
  for (const color of COLORS) {
    for (let lp = 52; lp <= FINISH; lp++) {
      const [r, c] = getStretchCoords(color, lp);
      if (r === row && c === col) return { kind: 'stretch', color, localPos: lp };
    }
  }
  if (row < 6 && col < 6) return { kind: 'base', color: 'red' };
  if (row < 6 && col > 8) return { kind: 'base', color: 'blue' };
  if (row > 8 && col < 6) return { kind: 'base', color: 'green' };
  if (row > 8 && col > 8) return { kind: 'base', color: 'yellow' };
  if (row >= 6 && row <= 8 && col >= 6 && col <= 8) return { kind: 'center' };
  return { kind: 'empty' };
});
