"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  applyMove,
  findHint,
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

const DEVICE_ID_KEY = "water-sort-device-id";
const HIGHEST_LEVEL_KEY = "water-sort-highest-level";
const SOUND_KEY = "water-sort-sound";
const VIBRATION_KEY = "water-sort-vibration";
const TOTAL_LEVELS = 300;
const POUR_ANIM_MS = 480;

function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function GameBoard() {
  const [level, setLevel] = useState(1);
  const [state, setState] = useState<GameState>(() => generateLevel(1));
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [timeSeconds, setTimeSeconds] = useState(0);
  const [isClear, setIsClear] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showLevelSelect, setShowLevelSelect] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [hintMove, setHintMove] = useState<PourMove | null>(null);
  const [pourInfo, setPourInfo] = useState<{ from: number; to: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pourTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const confettiContainerRef = useRef<HTMLDivElement | null>(null);
  const isInitialMount = useRef(true);

  const config = getLevelConfig(level);
  const capacity = config.capacity;

  const completedSet = new Set(
    state
      .map((b, i) => (isBottleComplete(b, capacity) ? i : -1))
      .filter((i) => i !== -1)
  );

  const loadSettings = useCallback(() => {
    if (typeof window === "undefined") return;
    const savedLevel = Number(localStorage.getItem(HIGHEST_LEVEL_KEY) || "1");
    const startLevel = Math.max(1, Math.min(savedLevel, TOTAL_LEVELS));
    setLevel(startLevel);
    setState(generateLevel(startLevel));
    setSoundEnabled(localStorage.getItem(SOUND_KEY) !== "false");
    setVibrationEnabled(localStorage.getItem(VIBRATION_KEY) !== "false");
  }, []);

  useEffect(() => {
    loadSettings();
    setPushSupported(typeof window !== "undefined" && "PushManager" in window);
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
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (isLevelComplete(state, capacity) && !isClear) {
      setIsClear(true);
      triggerEffects();
      saveProgress();
    }
  }, [state, capacity, isClear, level, moves, timeSeconds]);

  useEffect(() => {
    return () => {
      if (pourTimeoutRef.current) clearTimeout(pourTimeoutRef.current);
    };
  }, []);

  const playPourSound = useCallback(() => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.14);
    } catch {
      // ignore audio errors
    }
  }, [soundEnabled]);

  const playWinSound = useCallback(() => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
      const ctx = audioCtxRef.current;
      [523, 659, 784, 1047].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + i * 0.08 + 0.3);
      });
    } catch {
      // ignore
    }
  }, [soundEnabled]);

  const triggerEffects = useCallback(() => {
    playWinSound();
    if (vibrationEnabled && typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([60, 40, 80, 40, 120]);
    }
    spawnConfetti();
  }, [playWinSound, vibrationEnabled]);

  const saveProgress = useCallback(async () => {
    if (typeof window === "undefined") return;
    const nextLevel = Math.min(level + 1, TOTAL_LEVELS);
    const currentHighest = Number(localStorage.getItem(HIGHEST_LEVEL_KEY) || "1");
    if (nextLevel > currentHighest) {
      localStorage.setItem(HIGHEST_LEVEL_KEY, String(nextLevel));
    }
    const deviceId = getOrCreateDeviceId();
    if (!deviceId) return;
    try {
      await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          level,
          moves,
          timeSeconds,
          highestLevel: Math.max(currentHighest, nextLevel),
        }),
      });
    } catch {
      // ignore network errors
    }
  }, [level, moves, timeSeconds]);

  const handleBottleClick = useCallback(
    (index: number) => {
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

      // Build move with max possible amount
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

      const move: PourMove = { from: selectedIndex, to: index, amount, color };
      const next = applyMove(state, move, capacity);

      // Play a brief "tilt and pour" animation on the source/dest bottles.
      if (pourTimeoutRef.current) clearTimeout(pourTimeoutRef.current);
      setPourInfo({ from: selectedIndex, to: index });
      pourTimeoutRef.current = setTimeout(() => setPourInfo(null), POUR_ANIM_MS);

      setState(next);
      setMoves((m) => m + 1);
      setSelectedIndex(null);
      setHintMove(null);
      playPourSound();

      if (vibrationEnabled && typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(25);
      }
    },
    [selectedIndex, state, capacity, isClear, playPourSound, vibrationEnabled]
  );

  const undo = useCallback(() => {
    // Not tracking history in MVP; restart level instead.
    restartLevel();
  }, [level]);

  const restartLevel = useCallback(() => {
    setState(generateLevel(level));
    setMoves(0);
    setTimeSeconds(0);
    setIsClear(false);
    setSelectedIndex(null);
    setHintMove(null);
    setPourInfo(null);
  }, [level]);

  const goToLevel = useCallback((nextLevel: number) => {
    const clamped = Math.max(1, Math.min(nextLevel, TOTAL_LEVELS));
    setLevel(clamped);
    setState(generateLevel(clamped));
    setMoves(0);
    setTimeSeconds(0);
    setIsClear(false);
    setSelectedIndex(null);
    setHintMove(null);
    setPourInfo(null);
    setShowLevelSelect(false);
    setShowMenu(false);
  }, []);

  const nextLevel = useCallback(() => {
    goToLevel(level + 1);
  }, [goToLevel, level]);

  const showHint = useCallback(() => {
    if (isClear) return;
    const hint = findHint(state, capacity);
    setHintMove(hint);
    if (hint) {
      setTimeout(() => setHintMove(null), 1500);
    }
  }, [state, capacity, isClear]);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") localStorage.setItem(SOUND_KEY, String(next));
      return next;
    });
  }, []);

  const toggleVibration = useCallback(() => {
    setVibrationEnabled((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") localStorage.setItem(VIBRATION_KEY, String(next));
      return next;
    });
  }, []);

  const subscribePush = useCallback(async () => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "") as unknown as BufferSource,
      });
      const deviceId = getOrCreateDeviceId();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, subscription: sub.toJSON() }),
      });
      setPushEnabled(true);
    } catch (e) {
      console.error("Push subscription failed:", e);
    }
  }, []);

  const spawnConfetti = useCallback(() => {
    if (!confettiContainerRef.current) return;
    const colors = ["#f43f5e", "#f97316", "#facc15", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7", "#ec4899"];
    for (let i = 0; i < 60; i++) {
      const el = document.createElement("div");
      el.className = "confetti";
      el.style.left = `${Math.random() * 100}vw`;
      el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      el.style.animationDuration = `${1.8 + Math.random() * 1.2}s`;
      el.style.animationDelay = `${Math.random() * 0.4}s`;
      confettiContainerRef.current.appendChild(el);
      setTimeout(() => el.remove(), 4000);
    }
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900">
      <div ref={confettiContainerRef} className="pointer-events-none fixed inset-0 z-40" />

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 shadow-lg">
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight text-white">물 정렬 퍼즐</h1>
            <p className="text-xs text-slate-400">Water Sort Puzzle</p>
          </div>
        </div>
        <button
          onClick={() => setShowMenu(true)}
          className="rounded-xl bg-slate-800 p-2 text-white shadow hover:bg-slate-700"
          aria-label="메뉴"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* Stats */}
      <div className="mx-4 grid grid-cols-3 gap-3 sm:mx-6">
        <div className="rounded-2xl bg-slate-800/70 p-3 text-center backdrop-blur">
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Level</p>
          <p className="text-xl font-bold text-white">{level}</p>
        </div>
        <div className="rounded-2xl bg-slate-800/70 p-3 text-center backdrop-blur">
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Moves</p>
          <p className="text-xl font-bold text-white">{moves}</p>
        </div>
        <div className="rounded-2xl bg-slate-800/70 p-3 text-center backdrop-blur">
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Time</p>
          <p className="text-xl font-bold text-white">{formatTime(timeSeconds)}</p>
        </div>
      </div>

      {/* Game board */}
      <main className="flex flex-1 items-center justify-center px-4 py-6 sm:px-6">
        <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
          {state.map((bottle, i) => (
            <div key={i} className="relative">
              <Bottle
                bottle={bottle}
                capacity={capacity}
                isSelected={selectedIndex === i}
                isCompleted={completedSet.has(i)}
                isPouring={pourInfo?.from === i}
                isReceiving={pourInfo?.to === i}
                onClick={() => handleBottleClick(i)}
                index={i}
              />
              {hintMove && (hintMove.from === i || hintMove.to === i) && (
                <div className="absolute -inset-2 animate-pulse rounded-full border-2 border-yellow-300/70" />
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Controls */}
      <div className="sticky bottom-0 z-30 mx-4 mb-4 grid grid-cols-4 gap-2 sm:mx-6 sm:mb-6 sm:gap-3">
        <ControlButton onClick={undo} label="다시 시작" icon={<RestartIcon />} />
        <ControlButton onClick={showHint} label="힌트" icon={<HintIcon />} />
        <ControlButton
          onClick={() => setShowLevelSelect(true)}
          label="스테이지"
          icon={<LevelsIcon />}
        />
        <ControlButton
          onClick={() => goToLevel(Math.max(1, level - 1))}
          label="이전"
          icon={<PrevIcon />}
        />
      </div>

      {/* Menu modal */}
      {showMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-3xl bg-slate-900 p-6 shadow-2xl">
            <h3 className="mb-4 text-center text-xl font-bold text-white">설정</h3>
            <div className="space-y-3">
              <Toggle label="소리" enabled={soundEnabled} onToggle={toggleSound} />
              <Toggle label="진동" enabled={vibrationEnabled} onToggle={toggleVibration} />
              {pushSupported && (
                <button
                  onClick={subscribePush}
                  disabled={pushEnabled}
                  className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-400"
                >
                  {pushEnabled ? "푸시 알림 ON" : "푸시 알림 받기"}
                </button>
              )}
              <button
                onClick={() => setShowMenu(false)}
                className="w-full rounded-xl bg-slate-700 py-3 font-semibold text-white transition hover:bg-slate-600"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Level select modal */}
      {showLevelSelect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="flex h-[80vh] w-full max-w-md flex-col rounded-3xl bg-slate-900 p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">스테이지 선택</h3>
              <button onClick={() => setShowLevelSelect(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: TOTAL_LEVELS }, (_, i) => i + 1).map((lv) => {
                  const unlocked = lv <= Number(localStorage.getItem(HIGHEST_LEVEL_KEY) || "1");
                  return (
                    <button
                      key={lv}
                      onClick={() => unlocked && goToLevel(lv)}
                      disabled={!unlocked}
                      className={`aspect-square rounded-xl text-sm font-bold transition ${
                        lv === level
                          ? "bg-sky-500 text-white"
                          : unlocked
                          ? "bg-slate-800 text-white hover:bg-slate-700"
                          : "bg-slate-800/50 text-slate-600"
                      }`}
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

      {/* Level clear modal */}
      {isClear && (
        <LevelClearModal
          level={level}
          moves={moves}
          timeSeconds={timeSeconds}
          onNext={level < TOTAL_LEVELS ? nextLevel : () => setShowLevelSelect(true)}
          onHome={() => setShowLevelSelect(true)}
        />
      )}
    </div>
  );
}

function ControlButton({
  onClick,
  label,
  icon,
}: {
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-slate-800/90 py-3 text-white shadow-lg backdrop-blur transition hover:bg-slate-700 active:scale-95"
    >
      <span className="text-sky-300">{icon}</span>
      <span className="text-[10px] font-medium text-slate-300">{label}</span>
    </button>
  );
}

function Toggle({
  label,
  enabled,
  onToggle,
}: {
  label: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-xl bg-slate-800 px-4 py-3 text-white"
    >
      <span>{label}</span>
      <span className={`h-6 w-10 rounded-full p-1 transition ${enabled ? "bg-sky-500" : "bg-slate-600"}`}>
        <span
          className={`block h-4 w-4 rounded-full bg-white transition ${enabled ? "translate-x-4" : "translate-x-0"}`}
        />
      </span>
    </button>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData.split("").map((c) => c.charCodeAt(0)));
}

function RestartIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function HintIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function LevelsIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

function PrevIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}
