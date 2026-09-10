import React from "react";
import { formatTime } from "@/lib/game";

interface LevelClearModalProps {
  level: number;
  moves: number;
  timeSeconds: number;
  onNext: () => void;
  onHome: () => void;
}

export function LevelClearModal({
  level,
  moves,
  timeSeconds,
  onNext,
  onHome,
}: LevelClearModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07090e]/90 p-4 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 p-8 shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300">
        
        {/* Trophy Icon */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 shadow-[0_0_30px_rgba(251,191,36,0.6)]">
            <span className="text-4xl">🏆</span>
          </div>
        </div>

        <h2 className="mb-1 text-center text-3xl font-black text-white tracking-wide">
          LEVEL {level}
        </h2>
        <h3 className="mb-8 text-center text-xl font-bold text-emerald-400 uppercase tracking-widest">
          Cleared!
        </h3>

        <div className="mb-8 grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-slate-800/80 p-4 text-center border border-white/5 shadow-inner">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Moves</p>
            <p className="text-2xl font-extrabold text-white">{moves}</p>
          </div>
          <div className="rounded-2xl bg-slate-800/80 p-4 text-center border border-white/5 shadow-inner">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Time</p>
            <p className="text-2xl font-extrabold text-white">{formatTime(timeSeconds)}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onNext}
            className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 py-4 font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-95 text-lg tracking-wider"
          >
            NEXT LEVEL
          </button>
          <button
            onClick={onHome}
            className="w-full rounded-2xl bg-slate-800 py-3 font-bold text-slate-400 transition-transform hover:bg-slate-700 hover:text-white active:scale-95 tracking-wider"
          >
            HOME
          </button>
        </div>
      </div>
    </div>
  );
}
