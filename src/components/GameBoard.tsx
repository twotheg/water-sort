"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  formatTime,
  getLevelConfig,
  getTopColor,
  isBottleComplete,
  type GameState,
  type PourMove,
} from "@/lib/game";
import { Bottle } from "./Bottle";
import { LevelClearModal } from "./LevelClearModal";

const HIGHEST_LEVEL_KEY = "water-sort-highest-level";
const SOUND_KEY = "water-sort-sound";
const TOTAL_LEVELS = 1000;

export function GameBoard() {
  const [level, setLevel] = useState(1);
  const [state, setState] = useState<GameState>([]);
  const [history, setHistory] = useState<GameState[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  
  const [moves, setMoves] = useState(0);
  const [timeSeconds, setTimeSeconds] = useState(0);
  const [isClear, setIsClear] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const [undoCount, setUndoCount] = useState(5);
  const [extraBottlesCount, setExtraBottlesCount] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isInitialMount = useRef(true);

  // 사운드 효과음
  const playSound = useCallback((type: 'pour' | 'complete' | 'win') => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'pour') {
        osc.type = "sine";
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(700, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.15);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'complete') {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        osc.frequency.setValueAtTime(783.99, now + 0.16);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'win') {
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = "sine";
          o.frequency.value = freq;
          g.gain.setValueAtTime(0.1, now + i * 0.1);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);
          o.connect(g);
          g.connect(ctx.destination);
          o.start(now + i * 0.1);
          o.stop(now + i * 0.1 + 0.3);
        });
      }
    } catch {
      // ignore
    }
  }, [soundEnabled]);

  // ★ 핵심 수정: 5칸짜리 색상 5개씩 병에 무조건 꽉 차도록 7개 생성 + 2개 빈 병(총 9개) 강제 보정 세팅
  const initLevel = useCallback((lv: number) => {
    const defaultColors = ['#f43f5e', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#a855f7', '#06b6d4'];
    const filledBottles = [];
    
    // 7개의 병에 각각 서로 다른 색상 5개씩 가득 채움 (병이 비어있거나 부족한 문제 원천 차단)
    for (let i = 0; i < 7; i++) {
      const mainColor = defaultColors[i % defaultColors.length];
      const secondColor = defaultColors[(i + 1) % defaultColors.length];
      const thirdColor = defaultColors[(i + 2) % defaultColors.length];
      const fourthColor = defaultColors[(i + 3) % defaultColors.length];
      const fifthColor = defaultColors[(i + 4) % defaultColors.length];
      
      // 섞이도록 배치하되 5칸이 꽉 차게 구성
      filledBottles.push([mainColor, secondColor, thirdColor, fourthColor, fifthColor]);
    }

    // 7개 채워진 병 + 2개의 완벽한 빈 병 = 총 9개
    const initialBottles: GameState = [...filledBottles, [], []];
    
    setState(initialBottles);
    setHistory([]);
    setSelectedIndex(null);
    setMoves(0);
    setTimeSeconds(0);
    setIsClear(false);
    setExtraBottlesCount(0);
  }, []);

  const loadSettings = useCallback(() => {
    if (typeof window === "undefined") return;
    const savedLevel = Number(localStorage.getItem(HIGHEST_LEVEL_KEY) || "1");
    const startLevel = Math.max(1, Math.min(savedLevel, TOTAL_LEVELS));
    setLevel(startLevel);
    initLevel(startLevel);
    setSoundEnabled(localStorage.getItem(SOUND_KEY) !== "false");
  }, [initLevel]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (isClear) return;
    timerRef.current = setInterval(() => {
      setTimeSeconds((t) => t + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isClear, level]);

  const config = getLevelConfig(level);
  const capacity = 5; // 무조건 5칸 기준으로 고정

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const isCompleted = state.every((b) => {
      if (b.length === 0) return true;
      return isBottleComplete(b, capacity);
    });

    if (isCompleted && !isClear && state.length > 0) {
      setIsClear(true);
      playSound('win');
      const nextLevel = Math.min(level + 1, TOTAL_LEVELS);
      if (typeof window !== "undefined") {
        const currentHighest = Number(localStorage.getItem(HIGHEST_LEVEL_KEY) || "1");
        if (nextLevel > currentHighest) {
          localStorage.setItem(HIGHEST_LEVEL_KEY, String(nextLevel));
        }
      }
    }
  }, [state, capacity, isClear, level, playSound]);

  const showAd = (callback: () => void) => {
    alert("Watching Ad... (Ad Queue Triggered)");
    setTimeout(() => {
      callback();
    }, 1000);
  };

  const handleBottleClick = useCallback((index: number) => {
    if (isClear) return;

    if (selectedIndex === null) {
      if (state[index].length === 0) return;
      setSelectedIndex(index);
      return;
    }

    if (selectedIndex === index) {
      setSelectedIndex(null);
      return;
    }

    const source = state[selectedIndex];
    const dest = state[index];
    const color = getTopColor(source);
    if (!color) {
      setSelectedIndex(null);
      return;
    }

    const destTop = getTopColor(dest);
    if (dest.length >= capacity) {
      setSelectedIndex(index);
      return;
    }
    if (destTop !== null && destTop !== color) {
      setSelectedIndex(index);
      return;
    }

    let run = 0;
    for (let i = source.length - 1; i >= 0; i--) {
      if (source[i] === color) run++;
      else break;
    }
    const space = capacity - dest.length;
    const amount = Math.min(run, space);
    if (amount <= 0) {
      setSelectedIndex(index);
      return;
    }

    setHistory((prev) => [...prev, state.map(b => [...b])]);
    
    const newSource = [...source];
    const newDest = [...dest];
    for (let i = 0; i < amount; i++) {
      newSource.pop();
      newDest.push(color);
    }

    const next = state.map((b, idx) => {
      if (idx === selectedIndex) return newSource;
      if (idx === index) return newDest;
      return [...b];
    });

    const wasCompleteBefore = isBottleComplete(dest, capacity);
    const willBeCompleteAfter = isBottleComplete(newDest, capacity);

    setState(next);
    setMoves((m) => m + 1);
    setSelectedIndex(null);

    if (!wasCompleteBefore && willBeCompleteAfter) {
      playSound('complete');
    } else {
      playSound('pour');
    }
  }, [selectedIndex, state, capacity, isClear, playSound]);

  const handleUndo = () => {
    if (undoCount > 0) {
      if (history.length > 0) {
        const previousState = history[history.length - 1];
        setState(previousState);
        setHistory((prev) => prev.slice(0, -1));
        setUndoCount((prev) => prev - 1);
      } else {
        alert("No previous moves to undo.");
      }
    } else {
      showAd(() => {
        setUndoCount(5);
      });
    }
  };

  const handleAddBottle = () => {
    if (extraBottlesCount >= 2) {
      alert("Maximum extra bottles reached.");
      return;
    }
    showAd(() => {
      setState((prev) => [...prev, []]);
      setExtraBottlesCount((prev) => prev + 1);
    });
  };

  const restartLevel = () => initLevel(level);
  
  const goToNextLevel = () => {
    const nextLv = Math.min(level + 1, TOTAL_LEVELS);
    setLevel(nextLv);
    initLevel(nextLv);
  };

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") localStorage.setItem(SOUND_KEY, String(next));
      return next;
    });
  };

  const completedSet = new Set(
    state
      .map((b, i) => (isBottleComplete(b, capacity) ? i : -1))
      .filter((i) => i !== -1)
  );

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-gradient-to-b from-[#121824] via-[#0b0f17] to-[#07090e] select-none touch-none">
      
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-3 pb-1 shrink-0">
        <h1 className="text-xl font-black text-white tracking-wide">Level {level}</h1>
        <button onClick={toggleSound} className="p-2 rounded-2xl bg-slate-800/80 shadow-inner transition-transform active:scale-95" aria-label="Toggle Sound">
          {soundEnabled ? (
            <span style={{ fontSize: '22px' }}>🔊</span>
          ) : (
            <span style={{ fontSize: '22px', filter: 'grayscale(100%) opacity(50%)' }}>🔇</span>
          )}
        </button>
      </header>

      {/* Stats Cards */}
      <div className="mx-6 grid grid-cols-2 gap-3 mb-1 shrink-0">
        <div className="rounded-2xl bg-slate-800/60 p-2 text-center shadow-lg border border-white/5 backdrop-blur-md">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Moves</p>
          <p className="text-base font-extrabold text-white">{moves}</p>
        </div>
        <div className="rounded-2xl bg-slate-800/60 p-2 text-center shadow-lg border border-white/5 backdrop-blur-md">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Time</p>
          <p className="text-base font-extrabold text-white">{formatTime(timeSeconds)}</p>
        </div>
      </div>

      {/* Game Board Grid (병들을 위로 바짝 붙여 배치) */}
      <main className="flex flex-1 items-center justify-center px-4 py-1 overflow-hidden">
        <div className="grid grid-cols-5 gap-3 justify-items-center items-center" style={{ maxWidth: '540px', width: '100%' }}>
          {state.map((bottle, i) => (
            <Bottle
              key={i}
              bottle={bottle}
              capacity={capacity}
              isSelected={selectedIndex === i}
              isCompleted={completedSet.has(i)}
              onClick={() => handleBottleClick(i)}
              index={i}
            />
          ))}
        </div>
      </main>

      {/* 4 Bottom Control Buttons */}
      <div className="z-30 mx-4 mb-2 shrink-0 grid grid-cols-4 gap-2 bg-slate-900/90 p-2.5 rounded-3xl shadow-2xl border border-white/10 backdrop-blur-lg">
        <button onClick={restartLevel} className="control-btn">
          <span className="text-lg mb-0.5">🔄</span>
          <span>Restart</span>
        </button>
        <button onClick={handleUndo} className="control-btn relative">
          <span className="text-lg mb-0.5">⏪</span>
          <span>Undo</span>
          <div className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow-md border-2 border-slate-900">
            {undoCount}
          </div>
        </button>
        <button onClick={handleAddBottle} className="control-btn relative">
          <span className="text-lg mb-0.5">🧪</span>
          <span>Add</span>
          {extraBottlesCount > 0 && (
             <div className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow-md border-2 border-slate-900">
               {extraBottlesCount}
             </div>
          )}
        </button>
        <button onClick={goToNextLevel} className="control-btn">
          <span className="text-lg mb-0.5">🎯</span>
          <span>Stage</span>
        </button>
      </div>

      {/* Ad Space Area */}
      <div className="h-12 bg-black/80 shrink-0 flex justify-center items-center text-slate-500 text-[11px] font-bold tracking-widest border-t border-white/5">
        [ AD BANNER SPACE ]
      </div>

      {/* Level Clear Modal */}
      {isClear && (
        <LevelClearModal
          level={level}
          moves={moves}
          timeSeconds={timeSeconds}
          onNext={goToNextLevel}
          onHome={restartLevel}
        />
      )}
    </div>
  );
}
