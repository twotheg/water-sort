"use client";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="level-clear-enter w-full max-w-sm rounded-3xl bg-gradient-to-br from-sky-500 to-indigo-600 p-1 shadow-2xl">
        <div className="rounded-[22px] bg-slate-900/90 p-6 text-center sm:p-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-400/20">
            <svg
              className="h-9 w-9 text-yellow-300 star-spin"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Level Clear!
          </h2>
          <p className="mt-2 text-sky-200">스테이지 {level} 클리어</p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-800 p-3">
              <p className="text-xs text-slate-400">이동 횟수</p>
              <p className="text-xl font-bold text-white">{moves}</p>
            </div>
            <div className="rounded-2xl bg-slate-800 p-3">
              <p className="text-xs text-slate-400">소요 시간</p>
              <p className="text-xl font-bold text-white">
                {formatTime(timeSeconds)}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={onHome}
              className="rounded-xl bg-slate-700 px-5 py-3 font-semibold text-white transition hover:bg-slate-600"
            >
              홈으로
            </button>
            <button
              onClick={onNext}
              className="rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-3 font-bold text-white shadow-lg transition hover:brightness-110"
            >
              다음 스테이지 →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
