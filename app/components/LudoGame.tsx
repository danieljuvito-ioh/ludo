"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Piece, Color, GameState } from '../types/game';
import {
  createInitialPlayers, getGlobalIndex, BUFF_LOCATIONS, SAFE_ZONES, START_POSITIONS, PlayerConfig, COLORS, FINISH, CELLS,
  canMove, resolveMove, chooseBotMove, findPiece, getNextPlayerIndex, isPlayerFinished, getPieceCoords, cellCenter,
} from '../lib/game-logic';
import { CHARACTERS, CHARACTER_LIST } from '../lib/characters';
import Die from './Die';
import SetupScreen from './SetupScreen';
import VictoryOverlay from './VictoryOverlay';

type Phase = 'idle' | 'rolling' | 'choosing' | 'animating';
type FocusData = { globalIdx: number; color?: Color; localPos?: number };
type Effect =
  | { id: number; kind: 'float'; x: number; y: number; text: string; className: string }
  | { id: number; kind: 'burst'; x: number; y: number; text: string }
  | { id: number; kind: 'ring'; x: number; y: number; className: string }
  | { id: number; kind: 'projectile'; x: number; y: number; x2: number; y2: number; text: string; spin: boolean; angle: number };
type WithoutId<T> = T extends unknown ? Omit<T, 'id'> : never;
type NewEffect = WithoutId<Effect>;

const COLOR_BG: Record<Color, string> = { red: 'bg-red-500', blue: 'bg-blue-500', yellow: 'bg-yellow-500', green: 'bg-green-500' };
const COLOR_TILE: Record<Color, string> = { red: 'bg-red-400/25', blue: 'bg-blue-400/25', yellow: 'bg-yellow-400/25', green: 'bg-green-400/25' };
const COLOR_STRETCH: Record<Color, string> = { red: 'bg-red-200', blue: 'bg-blue-200', yellow: 'bg-yellow-200', green: 'bg-green-200' };
const COLOR_BASE: Record<Color, string> = { red: 'bg-red-500/20', blue: 'bg-blue-500/20', yellow: 'bg-yellow-500/20', green: 'bg-green-500/20' };
const BASE_POSITION: Record<Color, string> = { red: 'top-0 left-0', blue: 'top-0 right-0', green: 'bottom-0 left-0', yellow: 'bottom-0 right-0' };

const SPEEDS = [1, 2, 4];
const STEP_MS = 220;
const PROJECTILE_MS = 380;
const LOG_SIZE = 12;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const initialGameState: GameState = {
  players: [],
  currentPlayerIndex: 0,
  diceValue: 0,
  isGameOver: false,
  gameLog: ['Game started!'],
  winners: [],
};

export default function LudoGame() {
  const [gameStarted, setGameStarted] = useState(false);
  const [playerConfigs, setPlayerConfigs] = useState<PlayerConfig[]>(
    COLORS.map((color, index) => ({
      color,
      isBot: index !== 0,
      isActive: true,
      characterClass: CHARACTER_LIST[index].id,
    }))
  );

  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [phase, setPhase] = useState<Phase>('idle');
  const [rollingFace, setRollingFace] = useState(1);
  const [focusedTile, setFocusedTile] = useState<FocusData | null>(null);

  // Animation state: temporary visual overrides layered on top of the real game state
  const [overrides, setOverrides] = useState<Record<string, Partial<Piece>>>({});
  const [pieceAnims, setPieceAnims] = useState<Record<string, string>>({});
  const [effects, setEffects] = useState<Effect[]>([]);
  const [boardShaking, setBoardShaking] = useState(false);
  const [banner, setBanner] = useState<{ key: number; text: string; emoji: string; color: Color } | null>(null);
  const [speedIdx, setSpeedIdx] = useState(0);

  const speedRef = useRef(1);
  const busyRef = useRef(false);
  const effectId = useRef(0);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wait = useCallback((ms: number) => sleep(ms / speedRef.current), []);

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  const viewPlayers = useMemo(() => gameState.players.map(player => ({
    ...player,
    pieces: player.pieces.map(p => (overrides[p.id] ? { ...p, ...overrides[p.id] } : p)),
  })), [gameState.players, overrides]);

  // Pre-calculate range highlights to avoid heavy computation during render
  const rangeHighlights = useMemo(() => {
    const highlights: Record<number, Color> = {};
    viewPlayers.forEach(player => {
      player.pieces.forEach(p => {
        if (p.position >= 0 && p.position < 52) {
          const pGlobal = getGlobalIndex(p.position, p.color);
          for (let r = 1; r <= p.range; r++) {
            // Last one wins if overlapping
            highlights[(pGlobal + r) % 52] = p.color;
            highlights[(pGlobal - r + 52) % 52] = p.color;
          }
        }
      });
    });
    return highlights;
  }, [viewPlayers]);

  // Where each movable piece would land, so humans can see their options
  const destinations = useMemo(() => {
    const cells = new Set<string>();
    if (phase !== 'choosing' || !currentPlayer || currentPlayer.isBot) return cells;
    currentPlayer.pieces.forEach(p => {
      if (!canMove(p, gameState.diceValue)) return;
      const to = p.position === -1 ? 0 : p.position + gameState.diceValue;
      cells.add(getPieceCoords(to, p.color).join(','));
    });
    return cells;
  }, [phase, currentPlayer, gameState.diceValue]);

  // ---- Animation helpers ----

  const spawn = useCallback((effect: NewEffect, duration: number) => {
    const id = ++effectId.current;
    setEffects(prev => [...prev, { ...effect, id } as Effect]);
    setTimeout(() => setEffects(prev => prev.filter(e => e.id !== id)), duration / speedRef.current);
  }, []);

  const flashPiece = useCallback((pieceId: string, className: string, duration: number) => {
    setPieceAnims(prev => ({ ...prev, [pieceId]: className }));
    setTimeout(() => setPieceAnims(prev => {
      if (prev[pieceId] !== className) return prev;
      const next = { ...prev };
      delete next[pieceId];
      return next;
    }), duration / speedRef.current);
  }, []);

  const patchPiece = useCallback((pieceId: string, patch: Partial<Piece>) => {
    setOverrides(prev => ({ ...prev, [pieceId]: { ...prev[pieceId], ...patch } }));
  }, []);

  const shakeBoard = useCallback(() => {
    setBoardShaking(true);
    setTimeout(() => setBoardShaking(false), 400 / speedRef.current);
  }, []);

  // ---- Focus (tile details) ----

  const clearFocusTimer = () => {
    if (focusTimer.current) clearTimeout(focusTimer.current);
    focusTimer.current = null;
  };

  const closeFocus = useCallback(() => {
    clearFocusTimer();
    focusTimer.current = setTimeout(() => setFocusedTile(null), 800); // travel time to reach the panel
  }, []);

  const openFocus = useCallback((data: FocusData) => {
    clearFocusTimer();
    setFocusedTile(prev =>
      prev && prev.globalIdx === data.globalIdx && prev.color === data.color && prev.localPos === data.localPos ? prev : data
    );
  }, []);

  const focusHandlers = (data: FocusData, hasPiece: () => boolean) => {
    const open = () => { if (hasPiece()) openFocus(data); };
    return { onMouseEnter: open, onMouseDown: open, onTouchStart: open, onMouseLeave: closeFocus, onMouseUp: closeFocus, onTouchEnd: closeFocus };
  };

  const focusDataFor = (piece: Piece): FocusData =>
    piece.position >= 52 ? { globalIdx: 0, color: piece.color, localPos: piece.position } : { globalIdx: getGlobalIndex(piece.position, piece.color) };

  // ---- Game flow ----

  const startGame = () => {
    const players = createInitialPlayers(playerConfigs);
    setGameState({ ...initialGameState, players, gameLog: [`Game started! ${players[0].name} turn.`] });
    setOverrides({});
    setPhase('idle');
    busyRef.current = false;
    setGameStarted(true);
  };

  const rollDice = useCallback(() => {
    if (phase !== 'idle' || gameState.isGameOver || busyRef.current) return;
    busyRef.current = true;
    setPhase('rolling');

    const player = gameState.players[gameState.currentPlayerIndex];
    const interval = setInterval(() => setRollingFace(Math.floor(Math.random() * 6) + 1), 70);

    setTimeout(() => {
      clearInterval(interval);
      const value = Math.floor(Math.random() * 6) + 1;
      setGameState(prev => ({
        ...prev,
        diceValue: value,
        gameLog: [`${player.name} rolled a ${value}`, ...prev.gameLog].slice(0, LOG_SIZE),
      }));

      if (player.pieces.some(p => canMove(p, value))) {
        setPhase('choosing');
        busyRef.current = false;
        return;
      }

      setPhase('animating');
      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          diceValue: 0,
          currentPlayerIndex: getNextPlayerIndex(prev.players, prev.currentPlayerIndex),
          gameLog: [`No possible moves for ${player.name}`, ...prev.gameLog].slice(0, LOG_SIZE),
        }));
        setPhase('idle');
        busyRef.current = false;
      }, 800 / speedRef.current);
    }, 650 / speedRef.current);
  }, [phase, gameState.isGameOver, gameState.players, gameState.currentPlayerIndex]);

  const movePiece = useCallback(async (pieceId: string) => {
    if (phase !== 'choosing' || busyRef.current) return;
    const playerIndex = gameState.currentPlayerIndex;
    const roll = gameState.diceValue;
    const before = gameState.players;
    const result = resolveMove(before, playerIndex, pieceId, roll);
    if (!result) return;

    busyRef.current = true;
    setPhase('animating');
    setFocusedTile(null);

    const player = before[playerIndex];
    const def = CHARACTERS[player.characterClass];
    const moverXY = cellCenter(getPieceCoords(result.to, player.color));

    // 1. Walk tile by tile
    for (const pos of result.path) {
      patchPiece(pieceId, { position: pos });
      await wait(STEP_MS);
    }
    if (result.from === -1) {
      spawn({ kind: 'ring', ...moverXY, className: 'border-white' }, 600);
      await wait(200);
    }

    // 2. Play buffs and attacks in order
    for (const ev of result.events) {
      if (ev.type === 'buff') {
        patchPiece(ev.pieceId, ev.stats);
        spawn({ kind: 'ring', ...moverXY, className: 'border-yellow-300' }, 600);
        spawn({ kind: 'burst', ...moverXY, text: '✨' }, 500);
        spawn({ kind: 'float', ...moverXY, text: ev.label, className: 'text-emerald-300' }, 900);
        await wait(600);
      } else if (ev.type === 'attack') {
        const target = findPiece(before, ev.targetId)!;
        const targetXY = cellCenter(getPieceCoords(target.piece.position, target.piece.color));
        const melee = targetXY.x === moverXY.x && targetXY.y === moverXY.y;

        flashPiece(ev.attackerId, 'anim-attack', 350);
        if (melee) {
          await wait(180);
        } else {
          const angle = (Math.atan2(targetXY.y - moverXY.y, targetXY.x - moverXY.x) * 180) / Math.PI;
          spawn({ kind: 'projectile', ...moverXY, x2: targetXY.x, y2: targetXY.y, text: def.projectile, spin: def.spinProjectile, angle }, PROJECTILE_MS);
          await wait(PROJECTILE_MS);
        }

        spawn({ kind: 'burst', ...targetXY, text: melee ? '⚔️' : '💥' }, 500);
        spawn({ kind: 'float', ...targetXY, text: `-${ev.damage}`, className: 'text-red-500 text-2xl' }, 900);
        flashPiece(ev.targetId, 'anim-hit', 450);
        patchPiece(ev.targetId, { hp: ev.hpAfter });
        if (ev.killed || ev.damage >= 2) shakeBoard();
        await wait(500);

        if (ev.killed) {
          flashPiece(ev.targetId, 'anim-die', 650);
          spawn({ kind: 'float', ...targetXY, text: '💀', className: 'text-3xl' }, 900);
          await wait(600);
          const reset = findPiece(result.players, ev.targetId)!.piece;
          patchPiece(ev.targetId, { position: -1, hp: reset.hp, maxHp: reset.maxHp, attack: reset.attack, range: reset.range });
          await wait(150);
        }
      } else if (ev.type === 'finish') {
        spawn({ kind: 'ring', ...moverXY, className: 'border-yellow-400' }, 600);
        spawn({ kind: 'burst', ...moverXY, text: '👑' }, 500);
        spawn({ kind: 'float', ...moverXY, text: 'FINISH!', className: 'text-yellow-300 text-lg' }, 900);
        await wait(800);
      }
    }

    // 3. Commit the resolved state
    const finished = isPlayerFinished(result.players[playerIndex]);
    const winners = finished && !gameState.winners.includes(player.name) ? [...gameState.winners, player.name] : gameState.winners;
    const isGameOver = result.players.filter(p => !isPlayerFinished(p)).length <= 1;
    const extraTurn = roll === 6 && !finished;
    const log = [...result.log];
    if (finished) log.push(`🏆 ${player.name} has finished!`);
    if (extraTurn && !isGameOver) log.push('🎲 Rolled a 6, roll again!');

    setGameState(prev => ({
      ...prev,
      players: result.players,
      currentPlayerIndex: extraTurn || isGameOver ? prev.currentPlayerIndex : getNextPlayerIndex(result.players, prev.currentPlayerIndex),
      diceValue: 0,
      gameLog: [...log, ...prev.gameLog].slice(0, LOG_SIZE),
      winners,
      isGameOver,
    }));
    setOverrides({});
    setPhase('idle');
    busyRef.current = false;
  }, [phase, gameState, wait, spawn, flashPiece, patchPiece, shakeBoard]);

  // Turn banner whenever the active player changes
  useEffect(() => {
    if (!gameStarted || !currentPlayer || gameState.isGameOver) return;
    setBanner({ key: Date.now(), text: `${currentPlayer.name}'s turn`, emoji: CHARACTERS[currentPlayer.characterClass].emoji, color: currentPlayer.color });
    const timer = setTimeout(() => setBanner(null), 1300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStarted, gameState.currentPlayerIndex, gameState.isGameOver]);

  // Bot turns
  useEffect(() => {
    if (!gameStarted || gameState.isGameOver || !currentPlayer?.isBot) return;
    if (phase === 'idle') {
      const timer = setTimeout(rollDice, 700 / speedRef.current);
      return () => clearTimeout(timer);
    }
    if (phase === 'choosing') {
      const timer = setTimeout(() => {
        const pieceId = chooseBotMove(gameState.players, gameState.currentPlayerIndex, gameState.diceValue);
        if (pieceId) void movePiece(pieceId);
      }, 500 / speedRef.current);
      return () => clearTimeout(timer);
    }
  }, [gameStarted, gameState, currentPlayer, phase, rollDice, movePiece]);

  if (!gameStarted) {
    return <SetupScreen configs={playerConfigs} onChange={setPlayerConfigs} onStart={startGame} />;
  }

  const speed = SPEEDS[speedIdx];
  const isHumanTurn = currentPlayer && !currentPlayer.isBot;
  const viewCurrent = viewPlayers[gameState.currentPlayerIndex];
  const canMoveNow = (piece: Piece) =>
    phase === 'choosing' && isHumanTurn && piece.color === currentPlayer.color && canMove(piece, gameState.diceValue);

  // Stack pieces sharing a tile side by side
  const boardPieces = viewPlayers.flatMap(player => player.pieces.filter(p => p.position >= 0 && p.position <= FINISH).map(piece => ({ piece, player })));
  const stackCount: Record<string, number> = {};
  boardPieces.forEach(({ piece }) => { const k = getPieceCoords(piece.position, piece.color).join(','); stackCount[k] = (stackCount[k] ?? 0) + 1; });
  const stackSeen: Record<string, number> = {};

  return (
    <div className="flex flex-col items-center p-2 sm:p-4 bg-slate-900 min-h-screen text-white font-sans overflow-x-hidden" style={{ '--speed': speed } as React.CSSProperties}>
      <h1 className="text-2xl sm:text-4xl font-bold mb-4 text-yellow-400 uppercase tracking-tighter">Ludo RPG</h1>
      <div className="flex flex-col lg:flex-row gap-4 items-center lg:items-start w-full max-w-6xl justify-center">
        {/* BOARD */}
        <div className={`relative w-full max-w-[480px] aspect-square bg-white border-4 sm:border-8 border-slate-700 shadow-2xl rounded-lg overflow-hidden touch-none ${boardShaking ? 'anim-board-shake' : ''}`}>
          <div className="grid grid-cols-15 grid-rows-15 w-full h-full text-slate-800" style={{ fontSize: 'min(2vw, 12px)' }}>
            {CELLS.map((cell, i) => {
              const key = `${Math.floor(i / 15)},${i % 15}`;
              const isDestination = destinations.has(key);
              const destRing = isDestination ? 'ring-2 ring-inset ring-yellow-400 animate-pulse' : '';

              if (cell.kind === 'path') {
                const idx = cell.idx;
                const highlight = rangeHighlights[idx];
                const startColor = COLORS.find(c => START_POSITIONS[c] === idx);
                let bgColor = startColor ? COLOR_TILE[startColor] : 'bg-slate-50';
                let content: React.ReactNode = null;
                if (highlight) {
                  bgColor = `${COLOR_TILE[highlight]} animate-pulse`;
                  content = <div className={`w-1.5 h-1.5 rounded-full opacity-40 ${COLOR_BG[highlight]}`} />;
                }
                const buff = BUFF_LOCATIONS[idx];
                if (buff === 'BUFF_HEAL') content = <span className="text-pink-500">♥</span>;
                else if (buff === 'BUFF_ATTACK') content = <span className="text-orange-500">⚔</span>;
                else if (buff === 'BUFF_RANGE') content = <span className="text-blue-500">🎯</span>;
                if (SAFE_ZONES.includes(idx)) {
                  if (!startColor) bgColor = 'bg-slate-200';
                  content = <span className="text-slate-400 opacity-40">★</span>;
                }
                const hasPiece = () => viewPlayers.some(pl => pl.pieces.some(p => p.position >= 0 && p.position < 52 && getGlobalIndex(p.position, p.color) === idx));
                return (
                  <div key={i} {...focusHandlers({ globalIdx: idx }, hasPiece)} className={`${bgColor} ${destRing} border border-slate-200 flex items-center justify-center cursor-pointer select-none`}>
                    {content}
                  </div>
                );
              }

              if (cell.kind === 'stretch') {
                const { color, localPos } = cell;
                const hasPiece = () => viewPlayers.some(pl => pl.pieces.some(p => p.color === color && p.position === localPos));
                return (
                  <div key={i} {...focusHandlers({ globalIdx: 0, color, localPos }, hasPiece)} className={`${COLOR_STRETCH[color]} ${destRing} flex items-center justify-center cursor-pointer border border-white/40 select-none`}>
                    {localPos === FINISH && <span className="opacity-60">👑</span>}
                  </div>
                );
              }

              if (cell.kind === 'base') return <div key={i} className={COLOR_BASE[cell.color]} />;
              if (cell.kind === 'center') return <div key={i} className="bg-slate-300" />;
              return <div key={i} />;
            })}
          </div>

          {/* Home bases */}
          {viewPlayers.map(p => (
            <div key={p.color} className={`absolute w-[40%] h-[40%] flex items-center justify-center pointer-events-none ${BASE_POSITION[p.color]}`}>
              <span className="absolute text-[64px] sm:text-[88px] opacity-15 select-none">{CHARACTERS[p.characterClass].emoji}</span>
              <div className="grid grid-cols-2 gap-2 pointer-events-auto">
                {p.pieces.filter(pc => pc.position === -1).map(pc => {
                  const selectable = canMoveNow(pc);
                  return (
                    <div
                      key={pc.id}
                      onClick={() => { if (selectable) void movePiece(pc.id); }}
                      className={`anim-pop-in w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 sm:border-4 border-white shadow-xl flex items-center justify-center text-base sm:text-xl ${COLOR_BG[p.color]} ${selectable ? 'anim-selectable cursor-pointer scale-110' : ''} transition-transform`}
                    >
                      <span className={selectable ? 'anim-idle' : ''}>{CHARACTERS[p.characterClass].emoji}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Pieces on the board */}
          {boardPieces.map(({ piece, player }) => {
            const coords = getPieceCoords(piece.position, piece.color);
            const k = coords.join(',');
            const stackIdx = stackSeen[k] = (stackSeen[k] ?? -1) + 1;
            const { x, y } = cellCenter(coords);
            const offset = (stackIdx - (stackCount[k] - 1) / 2) * 2;
            const selectable = canMoveNow(piece);
            const hpRatio = piece.hp / Math.max(piece.maxHp, piece.hp);
            const hpColor = hpRatio > 0.66 ? 'bg-green-400' : hpRatio > 0.34 ? 'bg-yellow-400' : 'bg-red-500';
            const transition = `${STEP_MS / speed * 0.8}ms`;

            return (
              <div
                key={piece.id}
                {...focusHandlers(focusDataFor(piece), () => true)}
                onClick={() => { if (selectable) void movePiece(piece.id); }}
                className={`absolute cursor-pointer ${selectable ? 'z-50' : pieceAnims[piece.id] ? 'z-40' : 'z-20'}`}
                style={{
                  left: `${x + offset}%`, top: `${y + offset}%`, width: '6.2%', height: '6.2%',
                  transform: 'translate(-50%, -50%)',
                  transition: `left ${transition} ease-out, top ${transition} ease-out`,
                }}
              >
                <div className={`w-full h-full ${pieceAnims[piece.id] ?? ''}`}>
                  <div key={piece.position} className="w-full h-full anim-hop">
                    <div className={`relative w-full h-full rounded-full border-2 border-white shadow-md flex items-center justify-center transition-transform ${COLOR_BG[piece.color]} ${selectable ? 'anim-selectable scale-125' : ''}`}>
                      <span className="anim-idle leading-none select-none" style={{ fontSize: 'min(3.2vw, 16px)' }}>{CHARACTERS[player.characterClass].emoji}</span>
                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-[120%] h-1 bg-black/60 rounded-full overflow-hidden">
                        <div className={`h-full ${hpColor} transition-all duration-300`} style={{ width: `${hpRatio * 100}%` }} />
                      </div>
                      <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-black/70 px-1 rounded-full text-[6px] sm:text-[8px] font-bold text-yellow-300 whitespace-nowrap">
                        ⚔{piece.attack}{piece.range > 0 ? ` 🎯${piece.range}` : ''}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Effects layer */}
          <div className="absolute inset-0 pointer-events-none z-[70]">
            {effects.map(fx => {
              if (fx.kind === 'projectile') {
                return (
                  <div
                    key={fx.id}
                    className="absolute fx-projectile text-xl text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.9)]"
                    style={{ '--x1': `${fx.x}%`, '--y1': `${fx.y}%`, '--x2': `${fx.x2}%`, '--y2': `${fx.y2}%`, '--dur': `${PROJECTILE_MS / speed}ms`, transform: 'translate(-50%, -50%)' } as React.CSSProperties}
                  >
                    <div className={fx.spin ? 'fx-spin' : ''} style={fx.spin ? undefined : { transform: `rotate(${fx.angle}deg)` }}>{fx.text}</div>
                  </div>
                );
              }
              if (fx.kind === 'ring') {
                return <div key={fx.id} className={`absolute fx-ring w-[7%] h-[7%] rounded-full border-4 ${fx.className}`} style={{ left: `${fx.x}%`, top: `${fx.y}%` }} />;
              }
              if (fx.kind === 'burst') {
                return <div key={fx.id} className="absolute fx-burst text-2xl" style={{ left: `${fx.x}%`, top: `${fx.y}%` }}>{fx.text}</div>;
              }
              return (
                <div key={fx.id} className={`absolute fx-float font-black whitespace-nowrap [text-shadow:0_2px_0_#000,0_0_6px_#000] ${fx.className}`} style={{ left: `${fx.x}%`, top: `${fx.y}%` }}>
                  {fx.text}
                </div>
              );
            })}
          </div>

          {/* Turn banner */}
          {banner && (
            <div key={banner.key} className="absolute top-1/2 left-1/2 z-[80] pointer-events-none anim-banner">
              <div className={`${COLOR_BG[banner.color]} px-6 py-2 rounded-lg shadow-2xl border-2 border-white whitespace-nowrap flex items-center gap-2`}>
                <span className="text-2xl">{banner.emoji}</span>
                <span className="font-black uppercase tracking-tighter text-sm sm:text-lg [text-shadow:0_2px_0_rgba(0,0,0,0.4)]">{banner.text}</span>
              </div>
            </div>
          )}
        </div>

        {/* CONTROLS */}
        <div className="flex flex-col gap-4 w-full max-w-[480px] lg:w-80">
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-xl">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <span key={gameState.currentPlayerIndex} className={`anim-pop-in w-9 h-9 rounded-full flex items-center justify-center text-xl border-2 border-white/30 ${COLOR_BG[currentPlayer.color]}`}>
                {CHARACTERS[currentPlayer.characterClass].emoji}
              </span>
              <span className="truncate">{currentPlayer.name}</span>
            </h2>
            <div className="flex items-center gap-4">
              <Die value={phase === 'rolling' ? rollingFace : gameState.diceValue} rolling={phase === 'rolling'} />
              <button onClick={rollDice} disabled={phase !== 'idle' || !isHumanTurn} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 disabled:active:scale-100 text-white font-black rounded-xl transition-all shadow-lg text-sm">
                {phase === 'rolling' ? 'ROLLING...' : phase === 'choosing' ? 'PICK A PIECE' : phase === 'animating' ? '...' : isHumanTurn ? 'ROLL DICE' : 'BOT THINKING...'}
              </button>
            </div>
            <div className="flex items-center gap-2 mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Speed
              {SPEEDS.map((s, i) => (
                <button key={s} onClick={() => { setSpeedIdx(i); speedRef.current = s; }} className={`px-2 py-0.5 rounded-md ${i === speedIdx ? 'bg-yellow-400 text-slate-900' : 'bg-slate-700 text-slate-300'}`}>{s}x</button>
              ))}
            </div>
          </div>

          <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 shadow-xl space-y-1.5">
            {viewPlayers.map(p => {
              const home = p.pieces.filter(pc => pc.position === -1).length;
              const done = p.pieces.filter(pc => pc.position === FINISH).length;
              const isCurrent = p.id === viewCurrent?.id;
              return (
                <div key={p.id} className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-all ${isCurrent ? 'bg-slate-700 ring-1 ring-yellow-400/60' : ''}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${COLOR_BG[p.color]}`}>{CHARACTERS[p.characterClass].emoji}</span>
                  <span className="text-[10px] font-black uppercase tracking-tighter flex-1 truncate">{p.name}</span>
                  <span className="text-[10px] text-slate-400 font-bold">🏠{home} ⚔{4 - home - done} 👑{done}</span>
                </div>
              );
            })}
          </div>

          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 h-40 sm:h-56 overflow-hidden flex flex-col shadow-xl">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Battle Log</h3>
            <div className="flex-1 overflow-y-auto text-xs space-y-1 custom-scrollbar">
              {gameState.gameLog.map((log, i) => <div key={i} className={i === 0 ? 'text-yellow-400 font-bold' : 'text-slate-400'}>{log}</div>)}
            </div>
          </div>
        </div>
      </div>

      {focusedTile && (
        <div
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-[90%] max-w-[280px] pointer-events-none"
          onMouseEnter={clearFocusTimer}
          onMouseLeave={closeFocus}
        >
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-3 shadow-2xl relative overflow-hidden pointer-events-auto anim-fade-in">
            <div className="absolute top-0 left-0 w-full h-1 bg-yellow-400/30"></div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tile Details</h3>
              <button onClick={() => setFocusedTile(null)} className="text-slate-500 hover:text-white transition-colors">&times;</button>
            </div>
            <div className="space-y-2">
              {(() => {
                const pieces = viewPlayers.flatMap(player => player.pieces.filter(p => {
                  if (focusedTile.localPos !== undefined) return p.color === focusedTile.color && p.position === focusedTile.localPos;
                  return getGlobalIndex(p.position, p.color) === focusedTile.globalIdx && p.position < 52 && p.position >= 0;
                }).map(p => ({ piece: p, player })));

                if (pieces.length === 0) return <div className="text-[10px] text-slate-500 italic">No pieces here</div>;

                return pieces.map(({ piece: p, player }) => {
                  const def = CHARACTERS[player.characterClass];
                  const selectable = canMoveNow(p);
                  return (
                    <div key={p.id} onClick={() => { if (selectable) { void movePiece(p.id); setFocusedTile(null); } }} className={`p-2 rounded-lg bg-slate-900/50 border flex items-center gap-3 transition-all ${selectable ? 'border-yellow-400/60 cursor-pointer hover:bg-slate-900' : 'border-slate-700/50'}`}>
                      <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-xl shadow-inner ${COLOR_BG[player.color]}`}>{def.emoji}</div>
                      <div className="flex-1 overflow-hidden">
                        <div className="text-[10px] font-black text-white truncate uppercase tracking-tighter">{player.name}</div>
                        <div className="h-1.5 bg-black/50 rounded-full overflow-hidden my-1">
                          <div className="h-full bg-green-400" style={{ width: `${(p.hp / Math.max(p.maxHp, p.hp)) * 100}%` }} />
                        </div>
                        <div className="flex gap-2 text-[9px] font-bold text-slate-400">
                          <span>❤ {p.hp}/{p.maxHp}</span>
                          <span><span className="text-orange-400">⚔</span> {p.attack}</span>
                          <span><span className="text-blue-400">🎯</span> {p.range}</span>
                        </div>
                        <div className="text-[8px] text-yellow-300/80 truncate">{def.passive}</div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {gameState.isGameOver && (
        <VictoryOverlay players={gameState.players} winners={gameState.winners} onRestart={() => setGameStarted(false)} />
      )}
    </div>
  );
}
