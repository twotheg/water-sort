"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  applyMove,
  formatTime,
  generateLevel,
  getLevelConfig,
  getTopColor,
  isBottleComplete,
  isLevelComplete,
  type GameState,
  type PourMove,
} from "@/lib/game";
import { Bottle } from "./Bottle";
import { LevelClearModal } from "./LevelClearModal";

const HIGHEST_LEVEL_KEY = "water-sort-highest-level";
const SOUND_KEY = "water-sort-sound";
const TOTAL_LEVELS = 1000;
const POUR_ANIM_MS = 480;

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
  const [addedCapacity, setAddedCapacity] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isInitialMount = useRef(true);

  // 스테이지 초기화 로직 (7개 채워진 병 + 2개 빈병 보장)
  const initLevel = useCallback((lv: number) => {
    let newState = generateLevel(lv);
    // 기본적으로 9개의 병을 맞춤 (빈 병 추가)
    while (newState.length < 9) {
      newState.push([]);
    }
    setState(newState);
    setHistory([]);
    setSelectedIndex(null);
    setMoves(0);
    setTimeSeconds(0);
    setIsClear(false);
    setAddedCapacity(0); // 새 레벨마다 추가된 물병 크기 초기화
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
  const capacity = config.capacity || 4;

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    // 추가된 병(인덱스 9번)은 addedCapacity를 용량으로 검사
    const isCompleted = state.every((b, i) => {
      if (b.length === 0) return true;
      const targetCap = i === 9 ? Math.max(1, addedCapacity) : capacity;
      return isBottleComplete(b, targetCap);
    });

    if (isCompleted && !isClear && state.length > 0) {
      setIsClear(true);
      const nextLevel = Math.min(level + 1, TOTAL_LEVELS);
      if (typeof window !== "undefined") {
        const currentHighest = Number(localStorage.getItem(HIGHEST_LEVEL_KEY) || "1");
        if (nextLevel > currentHighest) {
          localStorage.setItem(HIGHEST_LEVEL_KEY, String(nextLevel));
        }
      }
    }
  }, [state, capacity, isClear, level, addedCapacity]);

  // 광고 노출 시뮬레이션
  const showAd = (callback: () => void) => {
    alert("[AD] 광고 시청 중입니다...");
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
    const destCapacity = index === 9 ? Math.max(1, addedCapacity) : capacity;

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

    // 히스토리 저장 및 물 붓기
    setHistory((prev) => [...prev, state.map(b => [...b])]);
    const move: PourMove = { from: selectedIndex, to: index, amount, color };
    const next = applyMove(state, move, destCapacity);
    
    setState(next);
    setMoves((m) => m + 1);
    setSelectedIndex(null);
  }, [selectedIndex, state, capacity, isClear, addedCapacity]);

  const handleUndo = () => {
    if (undoCount > 0) {
      if (history.length > 0) {
        const previousState = history[history.length - 1];
        setState(previousState);
        setHistory((prev) => prev.slice(0, -1));
        setUndoCount((prev) => prev - 1);
      } else {
        alert("되돌릴 이전 단계가 없습니다.");
      }
    } else {
      showAd(() => {
        setUndoCount(5);
      });
    }
  };

  const handleAddBottle = () => {
    if (addedCapacity >= 5) {
      alert("Max bottle capacity reached (5).");
      return;
    }
    showAd(() => {
      if (addedCapacity === 0) {
        setState((prev) => [...prev, []]); // 10번째 병 생성
      }
      setAddedCapacity((prev) => prev + 1);
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
        const cap = i === 9 ? Math.max(1, addedCapacity) : capacity;
        return isBottleComplete(b, cap) ? i : -1;
      })
      .filter((i) => i !== -1)
  );

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900">
      
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <h1 className="text-2xl font-bold text-white tracking-wider">Level {level}</h1>
        <button onClick={toggleSound} className="transition-transform hover:scale-110 active:scale-95" aria-label="Toggle Sound">
          {soundEnabled ? (
            <span style={{ fontSize: '28px', filter: 'drop-shadow(0px 0px 5px rgba(76,175,80,0.8))' }}>🔊</span>
          ) : (
            <span style={{ fontSize: '28px', filter: 'grayscale(100%) opacity(60%)' }}>🔇</span>
          )}
        </button>
      </header>

      {/* Stats */}
      <div className="mx-6 grid grid-cols-2 gap-4 mb-4">
        <div className="rounded-xl bg-slate-800/70 p-3 text-center backdrop-blur">
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Moves</p>
          <p className="text-xl font-bold text-white">{moves}</p>
        </div>
        <div className="rounded-xl bg-slate-800/70 p-3 text-center backdrop-blur">
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Time</p>
          <p className="text-xl font-bold text-white">{formatTime(timeSeconds)}</p>
        </div>
      </div>

      {/* Game Board Grid */}
      <main className="flex flex-1 items-center justify-center px-4 py-2">
        <div className={`grid gap-4 justify-items-center ${state.length >= 10 ? 'grid-cols-5' : 'grid-cols-5'}`} style={{ maxWidth: '600px', width: '100%' }}>
          {state.map((bottle, i) => (
            <Bottle
              key={i}
              bottle={bottle}
              capacity={i === 9 ? Math.max(1, addedCapacity) : capacity}
              isSelected={selectedIndex === i}
              isCompleted={completedSet.has(i)}
              onClick={() => handleBottleClick(i)}
              index={i}
            />
          ))}
        </div>
      </main>

      {/* 4 Bottom Control Buttons */}
      <div className="z-30 mx-4 mb-4 grid grid-cols-4 gap-3 bg-slate-800/90 p-4 rounded-2xl shadow-xl">
        <button onClick={restartLevel} className="control-btn">
          <span className="text-2xl mb-1">🔄</span>
          <span>Restart</span>
        </button>
        <button onClick={handleUndo} className="control-btn relative">
          <span className="text-2xl mb-1">⏪</span>
          <span>Undo</span>
          <div className="absolute -top-2 -right-2 bg-rose-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-slate-800">
            {undoCount}
          </div>
        </button>
        <button onClick={handleAddBottle} className="control-btn relative">
          <span className="text-2xl mb-1">🧪</span>
          <span>Add</span>
          {addedCapacity > 0 && (
             <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-slate-800">
               {addedCapacity}
             </div>
          )}
        </button>
        <button onClick={goToNextLevel} className="control-btn">
          <span className="text-2xl mb-1">🎯</span>
          <span>Stage</span>
        </button>
      </div>

      {/* Ad Space Area */}
      <div className="h-14 bg-slate-950 flex justify-center items-center text-slate-500 text-xs font-bold tracking-widest border-t border-slate-800">
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
