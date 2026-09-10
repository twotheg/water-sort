"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { formatTime, getTopColor, type GameState, type PourMove, type ColorCode } from "@/lib/game";
import { Bottle } from "./Bottle";
import { LevelClearModal } from "./LevelClearModal";

const HIGHEST_LEVEL_KEY = "water-sort-highest-level";
const SOUND_KEY = "water-sort-sound";
const TOTAL_LEVELS = 1000;

// 10가지 색상 풀 (게임에서는 이 중 7개만 무작위로 뽑아서 사용)
const VIVID_PALETTE: ColorCode[] = [
  "#f43f5e", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#a855f7", "#ec4899", "#14b8a6", "#84cc16"
];

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
  const [extraBottleStage, setExtraBottleStage] = useState(0); // 추가 병의 용량 (0~5)
  const [showLevelSelect, setShowLevelSelect] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isInitialMount = useRef(true);

  // HTML5 Fullscreen API 토글
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
    } catch { /* ignore */ }
  }, [soundEnabled]);

  // 1. 완전히 무작위로 색상을 섞어 7개 병 + 2개 빈 병 생성
  const initLevel = useCallback(() => {
    // 10개 색상 중 7개 랜덤 선택
    const pool = [...VIVID_PALETTE].sort(() => Math.random() - 0.5);
    const selectedColors = pool.slice(0, 7);

    // 각 색상당 5조각씩 총 35조각 배열 생성
    const allSegments: ColorCode[] = [];
    selectedColors.forEach((color) => {
      for (let i = 0; i < 5; i++) {
        allSegments.push(color);
      }
    });
    
    // 완벽한 무작위 셔플 (Fisher-Yates)
    for (let i = allSegments.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allSegments[i], allSegments[j]] = [allSegments[j], allSegments[i]];
    }

    // 섞인 35조각을 7개의 병에 5개씩 분배
    const filledBottles = [];
    for (let i = 0; i < 7; i++) {
      filledBottles.push(allSegments.slice(i * 5, (i + 1) * 5));
    }

    // 7개 채워진 병 + 8번, 9번 빈 병 (총 9개 고정)
    const initialBottles: GameState = [...filledBottles, [], []];
    
    setState(initialBottles);
    setHistory([]);
    setSelectedIndex(null);
    setMoves(0);
    setTimeSeconds(0);
    setIsClear(false);
    setExtraBottleStage(0); // 병 추가 상태 초기화
  }, []);

  const loadSettings = useCallback(() => {
    if (typeof window === "undefined") return;
    const savedLevel = Number(localStorage.getItem(HIGHEST_LEVEL_KEY) || "1");
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
    timerRef.current = setInterval(() => setTimeSeconds((t) => t + 1), 1000);
    return () => clearInterval(timerRef.current!);
  }, [isClear, level]);

  const capacity = 5;

  // 10번째 병이 추가되었을 때, 그 병의 최대 칸수는 extraBottleStage 값에 따름
  const getBottleCapacity = (index: number) => {
    if (index === 9) return Math.max(1, extraBottleStage);
    return capacity;
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // 게임 클리어 조건: 모든 병이 비어있거나, 정확히 5칸이 같은 색으로 꽉 차 있어야 함
    const isCompleted = state.every((b) => {
      if (b.length === 0) return true;
      return b.length === 5 && b.every(c => c === b[0]);
    });

    if (isCompleted && !isClear && state.length > 0) {
      setIsClear(true);
      playSound('win');
      if (typeof window !== "undefined") {
        const nextLevel = Math.min(level + 1, TOTAL_LEVELS);
        const currentHighest = Number(localStorage.getItem(HIGHEST_LEVEL_KEY) || "1");
        if (nextLevel > currentHighest) {
          localStorage.setItem(HIGHEST_LEVEL_KEY, String(nextLevel));
        }
      }
    }
  }, [state, isClear, level, playSound]);

  const showAd = (callback: () => void) => {
    alert("Watching Ad... (Ad Queue Triggered)");
    setTimeout(() => callback(), 1000);
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
    const destCap = getBottleCapacity(index);

    if (dest.length >= destCap) {
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

    const willBeCompleteAfter = newDest.length === 5 && newDest.every(c => c === newDest[0]);

    setState(next);
    setMoves((m) => m + 1);
    setSelectedIndex(null);

    if (willBeCompleteAfter) {
      playSound('complete');
    } else {
      playSound('pour');
    }
  }, [selectedIndex, state, isClear, playSound, extraBottleStage]);

  const handleUndo = () => {
    if (undoCount > 0) {
      if (history.length > 0) {
        const previousState = history[history.length - 1];
        setState(previousState);
        setHistory((prev) => prev.slice(0, -1));
        setUndoCount((prev) => prev - 1);
      } else {
        alert("되돌릴 항목이 없습니다.");
      }
    } else {
      showAd(() => setUndoCount(5));
    }
  };

  // 3 & 4. 병 추가: 누를 때마다 광고 시청 후 빈 공간의 칸 수만 1칸씩 늘어남 (1칸 -> 2칸 -> 3칸 -> 4칸 -> 5칸)
  const handleAddBottle = () => {
    if (extraBottleStage >= 5) {
      alert("최대 5칸까지만 확장 가능합니다.");
      return;
    }
    showAd(() => {
      if (extraBottleStage === 0) {
        // 첫 번째 Add 클릭: 10번째 빈 병 배열 생성
        setState((prev) => [...prev, []]);
      }
      // 병의 최대 용량(높이)을 1칸 늘려줌
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

  // 렌더링용 완성 여부
  const completedSet = new Set(
    state
      .map((b) => (b.length === 5 && b.every(c => c === b[0]) ? 1 : 0))
      .map((val, i) => val === 1 ? i : -1)
      .filter((i) => i !== -1)
  );

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-gradient-to-b from-[#121824] via-[#0b0f17] to-[#07090e] select-none touch-none">
      
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-3 pb-1 shrink-0">
        <h1 className="text-xl font-black text-white tracking-wide">Level {level}</h1>
        <div className="flex gap-2">
          {/* 전체화면 버튼 */}
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

      {/* Game Board Grid: items-end를 주어 키가 작은 병도 아랫줄 바닥에 나란히 정렬되게 함 */}
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

      {/* Bottom Control Buttons */}
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

      {/* Ad Space Area */}
      <div className="h-12 bg-black/80 shrink-0 flex justify-center items-center text-slate-500 text-[11px] font-bold tracking-widest border-t border-white/5">
        [ AD BANNER SPACE ]
      </div>

      {/* Level Select Modal */}
      {showLevelSelect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="flex h-[75vh] w-full max-w-md flex-col rounded-3xl bg-slate-900 p-5 shadow-2xl border border-white/10">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Select Stage (1 - 1000)</h3>
              <button onClick={() => setShowLevelSelect(false)} className="text-slate-400 hover:text-white text-lg font-bold p-1">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: TOTAL_LEVELS }, (_, i) => i + 1).map((lv) => (
                  <button
                    key={lv}
                    onClick={() => goToLevel(lv)}
                    className={`aspect-square rounded-xl text-sm font-bold transition ${
                      lv === level
                        ? "bg-sky-500 text-white shadow-lg shadow-sky-500/30"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                    }`}
                  >
                    {lv}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Level Clear Modal */}
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
