import { CHARACTER_LIST, CHARACTERS } from '../lib/characters';
import { PlayerConfig } from '../lib/game-logic';
import { Color } from '../types/game';

const COLOR_BG: Record<Color, string> = { red: 'bg-red-500', blue: 'bg-blue-500', yellow: 'bg-yellow-500', green: 'bg-green-500' };
const COLOR_RING: Record<Color, string> = { red: 'ring-red-400', blue: 'ring-blue-400', yellow: 'ring-yellow-400', green: 'ring-green-400' };

interface Props {
  configs: PlayerConfig[];
  onChange: (configs: PlayerConfig[]) => void;
  onStart: () => void;
}

export default function SetupScreen({ configs, onChange, onStart }: Props) {
  const update = (index: number, patch: Partial<PlayerConfig>) =>
    onChange(configs.map((c, i) => (i === index ? { ...c, ...patch } : c)));

  return (
    <div className="flex flex-col items-center p-4 sm:p-8 bg-slate-900 min-h-screen text-white font-sans">
      <h1 className="text-3xl sm:text-5xl font-black mb-1 text-yellow-400 uppercase tracking-tighter text-center">Ludo RPG</h1>
      <p className="text-slate-400 text-xs sm:text-sm mb-6 uppercase tracking-widest">Choose your heroes</p>
      <div className="bg-slate-800 border-2 border-slate-700 p-4 sm:p-6 rounded-3xl shadow-2xl max-w-2xl w-full">
        <div className="space-y-4 mb-6">
          {configs.map((config, index) => {
            const selected = CHARACTERS[config.characterClass];
            return (
              <div key={config.color} className={`p-3 sm:p-4 bg-slate-900/50 rounded-2xl border border-slate-700 transition-opacity ${config.isActive ? '' : 'opacity-40'}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-full border-4 border-white/20 flex items-center justify-center text-xl ${COLOR_BG[config.color]}`}>
                    {config.isActive ? selected.emoji : ''}
                  </div>
                  <div className="font-black uppercase text-sm tracking-tighter flex-1">{config.color}</div>
                  <div className="flex gap-1 sm:gap-2">
                    <button onClick={() => update(index, { isBot: false, isActive: true })} className={`px-2 py-1 rounded-lg text-[10px] font-bold ${!config.isBot && config.isActive ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'}`}>HUMAN</button>
                    <button onClick={() => update(index, { isBot: true, isActive: true })} className={`px-2 py-1 rounded-lg text-[10px] font-bold ${config.isBot && config.isActive ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'}`}>BOT</button>
                    <button onClick={() => update(index, { isActive: !config.isActive })} className={`px-2 py-1 rounded-lg text-[10px] font-bold ${!config.isActive ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-400'}`}>{config.isActive ? 'ON' : 'OFF'}</button>
                  </div>
                </div>

                {config.isActive && (
                  <>
                    <div className="grid grid-cols-4 gap-2">
                      {CHARACTER_LIST.map(char => {
                        const isSelected = char.id === config.characterClass;
                        return (
                          <button
                            key={char.id}
                            onClick={() => update(index, { characterClass: char.id })}
                            className={`flex flex-col items-center p-2 rounded-xl border transition-all duration-200 ${isSelected ? `bg-slate-700 border-transparent ring-2 ${COLOR_RING[config.color]} scale-105` : 'bg-slate-800 border-slate-700 hover:bg-slate-700/60 hover:-translate-y-0.5'}`}
                          >
                            <span className={`text-2xl sm:text-3xl ${isSelected ? 'anim-card-float' : 'grayscale-[60%]'}`}>{char.emoji}</span>
                            <span className="text-[10px] sm:text-xs font-black uppercase tracking-tighter mt-1">{char.name}</span>
                            <span className="text-[8px] sm:text-[10px] text-slate-400 font-bold whitespace-nowrap">❤{char.hp} ⚔{char.attack} 🎯{char.range}</span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-2">
                      <span className="text-yellow-300 font-bold">{selected.passive}.</span> {selected.description}
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <button
          disabled={configs.filter(c => c.isActive).length < 2}
          onClick={onStart}
          className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 hover:scale-[1.02] active:scale-95 disabled:bg-slate-700 disabled:hover:scale-100 text-slate-900 font-black rounded-2xl transition-all shadow-xl uppercase tracking-tighter text-xl"
        >
          ⚔️ Start Battle
        </button>
      </div>
    </div>
  );
}
