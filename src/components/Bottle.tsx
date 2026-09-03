"use client";

import { getTopColor } from "@/lib/game";
import type { Bottle as BottleType, ColorCode } from "@/lib/game";

interface BottleProps {
  bottle: BottleType;
  capacity: number;
  isSelected: boolean;
  isCompleted: boolean;
  onClick: () => void;
  index: number;
}

export function Bottle({
  bottle,
  capacity,
  isSelected,
  isCompleted,
  onClick,
  index,
}: BottleProps) {
  const emptySlots = capacity - bottle.length;
  const topColor = getTopColor(bottle);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`병 ${index + 1}${topColor ? `, 위 색상 ${colorName(topColor)}` : ", 빈 병"}`}
      className={`glass-bottle flex flex-col-reverse ${
        isSelected ? "selected" : ""
      } ${isCompleted ? "completed" : ""}`}
    >
      {bottle.map((color, i) => (
        <div
          key={`seg-${i}`}
          className="liquid-segment"
          style={{ backgroundColor: color }}
        />
      ))}
      {Array.from({ length: emptySlots }).map((_, i) => (
        <div
          key={`empty-${i}`}
          className="liquid-segment"
          style={{ backgroundColor: "transparent" }}
        />
      ))}
    </button>
  );
}

function colorName(hex: ColorCode): string {
  const map: Record<string, string> = {
    "#ef4444": "빨강",
    "#f97316": "주황",
    "#eab308": "노랑",
    "#22c55e": "초록",
    "#06b6d4": "하늘",
    "#3b82f6": "파랑",
    "#8b5cf6": "볼록",
    "#d946ef": "분홍",
    "#f43f5e": "장미",
    "#14b8a6": "청록",
  };
  return map[hex] || "색상";
}
