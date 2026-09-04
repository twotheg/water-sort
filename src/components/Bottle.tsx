"use client";

import { getTopColor } from "@/lib/game";
import type { Bottle as BottleType, ColorCode } from "@/lib/game";

interface BottleProps {
  bottle: BottleType;
  capacity: number;
  isSelected: boolean;
  isCompleted: boolean;
  isPouring?: boolean;
  isReceiving?: boolean;
  onClick: () => void;
  index: number;
}

// Lightens (positive) or darkens (negative) a hex color, used to build a
// glossy top-to-bottom gradient per liquid segment for a 3D look.
function shade(hex: string, percent: number): string {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  let r = (num >> 16) + percent;
  let g = ((num >> 8) & 0x00ff) + percent;
  let b = (num & 0x0000ff) + percent;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function Bottle({
  bottle,
  capacity,
  isSelected,
  isCompleted,
  isPouring,
  isReceiving,
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
      } ${isCompleted ? "completed" : ""} ${isPouring ? "pouring" : ""} ${
        isReceiving ? "receiving" : ""
      }`}
    >
      {isPouring && topColor && (
        <span
          className="pour-stream"
          style={{
            background: `linear-gradient(180deg, ${shade(topColor, 40)}, ${topColor})`,
          }}
        />
      )}
      {bottle.map((color, i) => {
        const isTopSegment = i === bottle.length - 1;
        return (
          <div
            key={`seg-${i}`}
            className={`liquid-segment ${isTopSegment ? "liquid-top" : ""}`}
            style={{
              background: `linear-gradient(180deg, ${shade(color, 55)} 0%, ${color} 40%, ${shade(
                color,
                -40
              )} 100%)`,
            }}
          />
        );
      })}
      {Array.from({ length: emptySlots }).map((_, i) => (
        <div key={`empty-${i}`} className="liquid-segment" style={{ background: "transparent" }} />
      ))}
    </button>
  );
}

function colorName(hex: ColorCode): string {
  const map: Record<string, string> = {
    "#f43f5e": "장미",
    "#f97316": "주황",
    "#facc15": "노랑",
    "#22c55e": "초록",
    "#06b6d4": "하늘",
    "#3b82f6": "파랑",
    "#a855f7": "보라",
    "#ec4899": "분홍",
    "#84cc16": "라임",
    "#14b8a6": "청록",
  };
  return map[hex] || "색상";
}
