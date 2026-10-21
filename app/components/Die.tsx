const PIPS: Record<number, number[]> = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export default function Die({ value, rolling }: { value: number; rolling: boolean }) {
  return (
    <div
      key={rolling ? 'rolling' : value}
      className={`w-14 h-14 shrink-0 bg-white rounded-xl border-4 border-slate-300 shadow-lg grid grid-cols-3 grid-rows-3 p-1.5 ${rolling ? 'anim-dice-roll' : value ? 'anim-dice-land' : ''}`}
    >
      {value === 0 ? (
        <span className="col-span-3 row-span-3 flex items-center justify-center text-2xl font-black text-slate-400">?</span>
      ) : (
        Array.from({ length: 9 }).map((_, i) => (
          <span key={i} className="flex items-center justify-center">
            {PIPS[value].includes(i) && (
              <span className={`rounded-full ${value === 1 ? 'w-3.5 h-3.5 bg-red-500' : 'w-2.5 h-2.5 bg-slate-800'}`} />
            )}
          </span>
        ))
      )}
    </div>
  );
}
