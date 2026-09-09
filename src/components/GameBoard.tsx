"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  applyMove,
  formatTime,
  generateLevel,
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
  const [addedBottlesCount, setAddedBottlesCount] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isInitialMount = useRef(true);

  // 사운드 재생 헬퍼 (Web Audio API - 메서드 오타 수정 완료)
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
      // Audio error ignore
    }
  }, [soundEnabled]);

  const initLevel = useCallback((lv: number) => {
    const rawState = generateLevel(lv);
    const trimmed = rawState.slice(0, 7);
    const initialBottles: GameState = [...trimmed, [], []];
    
    setState(initialBottles);
    setHistory([]);
    setSelectedIndex(null);
    setMoves(0);
    setTimeSeconds(0);
    setIsClear(false);
    setAddedBottlesCount(0);
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
  const baseCapacity = config.capacity || 4;

  const getBottleCapacity = (index: number) => {
    return baseCapacity;
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const isCompleted = state.every((b, i) => {
      if (b.length === 0) return true;
      const cap = getBottleCapacity(i);
      return isBottleComplete(b, cap);
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
  }, [state, baseCapacity, isClear, level, playSound]);

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
    const destCapacity = getBottleCapacity(index);

    if (dest.length >= destCapacity) {
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
    const space = destCapacity - dest.length;
    const amount = Math.min(run, space);
    if (amount <= 0) {
      setSelectedIndex(index);
      return;
    }

    setHistory((prev) => [...prev, state.map(b => [...b])]);
    const move: PourMove = { from: selectedIndex, to: index, amount, color };
    const next = applyMove(state, move, destCapacity);
    
    const wasCompleteBefore = isBottleComplete(dest, destCapacity);
    const willBeCompleteAfter = isBottleComplete(next[index], destCapacity);

    setState(next);
    setMoves((m) => m + 1);
    setSelectedIndex(null);

    if (!wasCompleteBefore && willBeCompleteAfter) {
      playSound('complete');
    } else {
      playSound('pour');
    }
  }, [selectedIndex, state, baseCapacity, isClear, playSound]);

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
    if (addedBottlesCount >= 2) {
      alert("Maximum extra bottles reached.");
      return;
    }
    showAd(() => {
      setState((prev) => [...prev, []]);
      setAddedBottlesCount((prev) => prev + 1);
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
      .map((b, i) => {
        const cap = getBottleCapacity(i);
        return isBottleComplete(b, cap) ? i : -1;
      })
      .filter((i) => i !== -1)
  );

  return (
    <div className="relative flex h-[100vh] w-[100vw] flex-col overflow-hidden bg-gradient-to-b from-[#121824] via-[#0b0f17] to-[#07090e] select-none">
      
      <header className="flex items-center justify-between px-6 pt-3 pb-2">
        <h1 className="text-2xl font-black text-white tracking-wide">Level {level}</h1>
        <button onClick={toggleSound} className="p-2 rounded-2xl bg-slate-800/80 shadow-inner transition-transform active:scale-95" aria-label="Toggle Sound">
          {soundEnabled ? (
            <span style={{ fontSize: '24px' }}>🔊</span>
          ) : (
            <span style={{ fontSize: '24px', filter: 'grayscale(100%) opacity(50%)' }}>🔇</span>
          )}
        </button>
      </header>

      <div className="mx-6 grid grid-cols-2 gap-3 mb-2">
        <div className="rounded-2xl bg-slate-800/60 p-2.5 text-center shadow-lg border border-white/5 backdrop-blur-md">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Moves</p>
          <p className="text-lg font-extrabold text-white">{moves}</p>
        </div>
        <div className="rounded-2xl bg-slate-800/60 p-2.5 text-center shadow-lg border border-white/5 backdrop-blur-md">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Time</p>
          <p className="text-lg font-extrabold text-white">{formatTime(timeSeconds)}</p>
        </div>
      </div>

      <main className="flex flex-1 items-center justify-center px-4 py-1">
        <div className="grid grid-cols-5 gap-3.5 justify-items-center items-center" style={{ maxWidth: '600px', width: '100%' }}>
          {state.map((bottle, i) => (
            <Bottle
              key={i}
              bottle={bottle}
              capacity={getBottleCapacity(i)}
              isSelected={selectedIndex === i}
              isCompleted={completedSet.has(i)}
              onClick={() => handleBottleClick(i)}
              index={i}
            />
          ))}
        </div>
      </main>

      <div className="z-30 mx-4 mb-2 grid grid-cols-4 gap-2.5 bg-slate-900/90 p-3 rounded-3xl shadow-2xl border border-white/10 backdrop-blur-lg">
        <button onClick={restartLevel} className="control-btn">
          <span className="text-xl mb-1">🔄</span>
          <span>Restart</span>
        </button>
        <button onClick={handleUndo} className="control-btn relative">
          <span className="text-xl mb-1">⏪</span>
          <span>Undo</span>
          <div className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[11px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow-md border-2 border-slate-900">
            {undoCount}
          </div>
        </button>
        <button onClick={handleAddBottle} className="control-btn relative">
          <span className="text-xl mb-1">🧪</span>
          <span>Add</span>
          {addedBottlesCount > 0 && (
             <div className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow-md border-2 border-slate-900">
               {addedBottlesCount}
             </div>
          )}
        </button>
        <button onClick={goToNextLevel} className="control-btn">
          <span className="text-xl mb-1">🎯</span>
          <span>Stage</span>
        </button>
      </div>

      <div className="h-12 bg-black/60 flex justify-center items-center text-slate-500 text-[11px] font-bold tracking-widest border-t border-white/5">
        [ AD BANNER SPACE ]
      </div>

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
