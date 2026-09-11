"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { formatTime, getTopColor, type GameState, type ColorCode } from "@/lib/game";
import { Bottle } from "./Bottle";
import { LevelClearModal } from "./LevelClearModal";

declare global {
  interface Window {
    adsbygoogle: any;
  }
}

const HIGHEST_LEVEL_KEY = "water-sort-highest-level";
const SOUND_KEY = "water-sort-sound";
const TOTAL_LEVELS = 1000;

// 다홍색, 빨강, 주황색을 배제한 10가지 고대비 색상
const DISTINCT_PALETTE: ColorCode[] = [
  "#F48FB1", "#1E88E5", "#FDD835", "#43A047", "#8E24AA",
  "#283593", "#C0CA33", "#6D4C41", "#00ACC1", "#757575"
];

export function GameBoard() {
  const [level, setLevel] = useState(1);
  const [highestUnlocked, setHighestUnlocked] = useState(1);
  const [state, setState] = useState<GameState>([]);
  const [history, setHistory] = useState<GameState[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  
  const [moves, setMoves] = useState(0);
  const [timeSeconds, setTimeSeconds] = useState(0);
  const [isClear, setIsClear] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const [undoCount, setUndoCount] = useState(5);
  const [extraBottleStage, setExtraBottleStage] = useState(0); 
  const [showLevelSelect, setShowLevelSelect] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn("Fullscreen Error:", err.message);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const playSound = useCallback((type: 'pour' | 'complete' | 'win') => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;

      if (type === 'pour') {
        for (let i = 0; i < 4; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          const baseFreq = 400 + (i * 150) + (Math.random() * 50);
          const timeOffset = now + (i * 0.08);
          osc.frequency.setValueAtTime(baseFreq, timeOffset);
          osc.frequency.exponentialRampToValueAtTime(baseFreq + 200, timeOffset + 0.08);
          gain.gain.setValueAtTime(0, timeOffset);
          gain.gain.linearRampToValueAtTime(0.3, timeOffset + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, timeOffset + 0.1);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(timeOffset);
          osc.stop(timeOffset + 0.1);
        }
      } else if (type === 'complete') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        osc.frequency.setValueAtTime(783.99, now + 0.16);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
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

  const initLevel = useCallback(() => {
    const pool = [...DISTINCT_PALETTE].sort(() => Math.random() - 0.5);
    const selectedColors = pool.slice(0, 7);

    const allSegments: ColorCode[] = [];
    selectedColors.forEach((color) => {
      for (let i = 0; i < 5; i++) {
        allSegments.push(color);
      }
    });
    
    for (let i = allSegments.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = allSegments[i];
      allSegments[i] = allSegments[j];
      allSegments[j] = temp;
    }

    const filledBottles = [];
    for (let i = 0; i < 7; i++) {
      filledBottles.push(allSegments.slice(i * 5, (i + 1) * 5));
    }

    const initialBottles: GameState = [...filledBottles, [], []];
    
    setState(initialBottles);
    setHistory([]);
    setSelectedIndex(null);
    setMoves(0);
    setTimeSeconds(0);
    setIsClear(false);
    setExtraBottleStage(0);
  }, []);

  const loadSettings = useCallback(() => {
    if (typeof window === "undefined") return;
    const savedLevel = Number(localStorage.getItem(HIGHEST_LEVEL_KEY) || "1");
    setHighestUnlocked(savedLevel); 
    const startLevel = Math.max(1, Math.min(savedLevel, TOTAL_LEVELS));
    setLevel(startLevel);
    initLevel();
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

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (err) {
      console.error("AdSense Error", err);
    }
  }, []);

  const capacity = 5;

  const getBottleCapacity = (index: number) => {
    if (index === 9) {
      return Math.max(0, extraBottleStage);
    }
    return capacity;
  };

  const showAd = (callback: () => void) => {
    alert("Watching Ad... (Ad Queue Triggered)");
    setTimeout(() => {
      callback();
    }, 1000);
  };

  const handleBottleClick = useCallback((index: number) => {
    if (isClear) return;

    if (index === 9 && extraBottleStage === 0) return;

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
    const destCap = getBottleCapacity(index);

    if (destCap === 0 || dest.length >= destCap) {
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
    const space = destCap - dest.length;
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

    const wasCompleteBefore = dest.length === destCap && dest.every(c => c === dest[0]);
    const willBeCompleteAfter = newDest.length === destCap && newDest.every(c => c === newDest[0]);

    setState(next);
    setMoves((m) => m + 1);
    setSelectedIndex(null);

    // ★ 수정됨: 물을 부은 직후에만 전체가 완성되었는지 검사합니다!
    const isGameFinished = next.every((b, i) => {
      const cap = getBottleCapacity(i);
      if (b.length === 0 || cap === 0) return true;
      return b.length === cap && b.every(c => c === b[0]);
    });

    if (isGameFinished) {
      playSound('win');
      setIsClear(true);
      if (typeof window !== "undefined") {
        const nextLevel = Math.min(level + 1, TOTAL_LEVELS);
        const currentHighest = Number(localStorage.getItem(HIGHEST_LEVEL_KEY) || "1");
        if (nextLevel > currentHighest) {
          localStorage.setItem(HIGHEST_LEVEL_KEY, String(nextLevel));
          setHighestUnlocked(nextLevel); 
        }
      }
    } else if (!wasCompleteBefore && willBeCompleteAfter) {
      playSound('complete');
    } else {
      playSound('pour');
    }
  }, [selectedIndex, state, isClear, playSound, extraBottleStage, level]);

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
    if (extraBottleStage >= 5) {
      alert("Maximum bottle expansion reached (5 slots).");
      return;
    }
    showAd(() => {
      if (extraBottleStage === 0) {
        setState((prev) => [...prev, []]);
      }
      setExtraBottleStage((prev) => prev + 1);
    });
  };

  const restartLevel = () => initLevel();
  
  const goToLevel = (targetLevel: number) => {
    const lv = Math.max(1, Math.min(targetLevel, TOTAL_LEVELS));
    setLevel(lv);
    initLevel();
    setShowLevelSelect(false);
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
        const isFullAndSame = b.length > 0 && b.length === cap && b.every(c => c === b[0]);
        return cap > 0 && isFullAndSame ? i : -1;
      })
      .filter((i) => i !== -1)
  );

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-gradient-to-b from-[#121824] via-[#0b0f17] to-[#07090e] select-none touch-none">
      
      <header className="flex items-center justify-between px-6 pt-3 pb-1 shrink-0">
        <h1 className="text-xl font-black text-white tracking-wide">Level {level}</h1>
        <div className="flex gap-2">
          <button onClick={toggleFullscreen} className="p-2 rounded-2xl bg-slate-800/80 shadow-inner transition-transform active:scale-95" aria-label="Toggle Fullscreen">
            <span style={{ fontSize: '20px' }}>⛶</span>
          </button>
          <button onClick={toggleSound} className="p-2 rounded-2xl bg-slate-800/80 shadow-inner transition-transform active:scale-95" aria-label="Toggle Sound">
            {soundEnabled ? (
              <span style={{ fontSize: '20px' }}>🔊</span>
            ) : (
              <span style={{ fontSize: '20px', filter: 'grayscale(100%) opacity(50%)' }}>🔇</span>
            )}
          </button>
        </div>
      </header>

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

      <main className="flex flex-1 items-center justify-center px-4 py-1 overflow-hidden">
        <div className={`grid gap-3 justify-items-center items-end ${state.length >= 10 ? 'grid-cols-5' : 'grid-cols-5'}`} style={{ maxWidth: '540px', width: '100%' }}>
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
          {extraBottleStage > 0 && (
             <div className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[9px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow-md border-2 border-slate-900">
               {extraBottleStage}/5
             </div>
          )}
        </button>
        <button onClick={() => setShowLevelSelect(true)} className="control-btn">
          <span className="text-lg mb-0.5">🎯</span>
          <span>Stage</span>
        </button>
      </div>

      <div className="h-12 bg-black/80 shrink-0 flex justify-center items-center border-t border-white/5 overflow-hidden">
        <ins
          className="adsbygoogle"
          style={{ display: "inline-block", width: "320px", height: "50px" }}
          data-ad-client="ca-pub-4424569297437395" 
          data-ad-slot="1234567890"               
        ></ins>
      </div>

      {showLevelSelect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="flex h-[75vh] w-full max-w-md flex-col rounded-3xl bg-slate-900 p-5 shadow-2xl border border-white/10">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Select Stage</h3>
              <button onClick={() => setShowLevelSelect(false)} className="text-slate-400 hover:text-white text-lg font-bold p-1">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: TOTAL_LEVELS }, (_, i) => i + 1).map((lv) => {
                  const isCurrent = lv === level;
                  const isCleared = lv < highestUnlocked;
                  const isLocked = lv > highestUnlocked;

                  let btnClass = "bg-slate-700 text-white hover:bg-slate-600"; 
                  if (isCurrent) {
                    btnClass = "bg-sky-500 text-white border-2 border-white shadow-lg shadow-sky-500/50 scale-105";
                  } else if (isCleared) {
                    btnClass = "bg-emerald-500/90 text-white hover:bg-emerald-400"; 
                  } else if (isLocked) {
                    btnClass = "bg-slate-800/40 text-slate-600 cursor-not-allowed"; 
                  }

                  return (
                    <button
                      key={lv}
                      onClick={() => !isLocked && goToLevel(lv)}
                      disabled={isLocked}
                      className={`aspect-square flex items-center justify-center rounded-xl text-sm font-bold transition-all ${btnClass}`}
                    >
                      {lv}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {isClear && (
        <LevelClearModal
          level={level}
          moves={moves}
          timeSeconds={timeSeconds}
          onNext={() => goToLevel(level + 1)}
          onHome={restartLevel}
        />
      )}
    </div>
  );
}
