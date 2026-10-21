import { useState } from 'react';
import { CHARACTERS } from '../lib/characters';
import { Player } from '../types/game';

const MEDALS = ['🥇', '🥈', '🥉'];
const CONFETTI = ['🎉', '✨', '⭐', '🎊', '👑'];

interface Props {
  players: Player[];
  winners: string[];
  onRestart: () => void;
}

export default function VictoryOverlay({ players, winners, onRestart }: Props) {
  const [confetti] = useState(() =>
    Array.from({ length: 36 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 2.5 + Math.random() * 2.5,
      emoji: CONFETTI[i % CONFETTI.length],
    }))
  );

  const ranking = [...winners, ...players.filter(p => !winners.includes(p.name)).map(p => p.name)]
    .map(name => players.find(p => p.name === name)!);

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden">
      {confetti.map((c, i) => (
        <span
          key={i}
          className="absolute top-0 text-2xl anim-confetti pointer-events-none"
          style={{ left: `${c.left}%`, animationDelay: `${c.delay}s`, animationDuration: `${c.duration}s` }}
        >
          {c.emoji}
        </span>
      ))}
      <div className="relative bg-slate-800 border-2 border-yellow-400/60 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl anim-fade-in text-center">
        <div className="text-6xl mb-2 anim-card-float">{CHARACTERS[ranking[0].characterClass].emoji}</div>
        <h2 className="text-3xl font-black text-yellow-400 uppercase tracking-tighter">Victory!</h2>
        <p className="text-slate-300 text-sm mb-5">{ranking[0].name} conquers the board</p>
        <div className="space-y-2 mb-6">
          {ranking.map((player, i) => (
            <div key={player.id} className="flex items-center gap-3 bg-slate-900/60 rounded-xl px-3 py-2 anim-fade-in" style={{ animationDelay: `${0.2 + i * 0.15}s`, animationFillMode: 'backwards' }}>
              <span className="text-xl w-7">{MEDALS[i] ?? '💀'}</span>
              <span className="text-xl">{CHARACTERS[player.characterClass].emoji}</span>
              <span className="text-xs font-black uppercase tracking-tighter text-left flex-1">{player.name}</span>
            </div>
          ))}
        </div>
        <button onClick={onRestart} className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-slate-900 font-black rounded-2xl transition-all uppercase tracking-tighter">
          Play Again
        </button>
      </div>
    </div>
  );
}
