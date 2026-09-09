import React from "react";
import type { Bottle as BottleType } from "@/lib/game";

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
}: BottleProps) {
  const emptySlots = Math.max(0, capacity - bottle.length);

  // 둥글둥글하고 매끄러운 3D 유리병 스타일
  const bottleStyle: React.CSSProperties = {
    width: "42px",
    height: "150px",
    borderRadius: "0 0 24px 24px",
    border: "3px solid rgba(255, 255, 255, 0.45)",
    borderTop: "none",
    boxShadow: isSelected
      ? "0 -8px 18px rgba(56, 189, 248, 0.6), inset -4px -4px 10px rgba(0,0,0,0.3), inset 4px 0 10px rgba(255,255,255,0.7)"
      : "inset -4px -4px 10px rgba(0,0,0,0.3), inset 4px 0 10px rgba(255,255,255,0.6)",
    background: "rgba(255, 255, 255, 0.08)",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column-reverse",
    cursor: "pointer",
    transform: isSelected ? "translateY(-10px) scale(1.03)" : "translateY(0) scale(1)",
    transition: "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
  };

  const waterChunkStyle = (color: string, isTop: boolean): React.CSSProperties => ({
    width: "100%",
    height: `${100 / Math.max(1, capacity)}%`,
    backgroundColor: color,
    boxShadow: isTop
      ? "inset 0 3px 4px rgba(255,255,255,0.45)"
      : "inset 0 2px 4px rgba(0,0,0,0.25)",
    borderTop: isTop ? "2px solid rgba(255,255,255,0.6)" : "none",
    transition: "background-color 0.3s ease",
  });

  return (
    <div style={bottleStyle} onClick={onClick} className={isCompleted ? "completed-pulse" : ""}>
      {bottle.map((color, i) => {
        const isTopSegment = i === bottle.length - 1;
        return <div key={`color-${i}`} style={waterChunkStyle(color, isTopSegment)} />;
      })}
      {Array.from({ length: emptySlots }).map((_, i) => (
        <div key={`empty-${i}`} style={{ width: "100%", height: `${100 / Math.max(1, capacity)}%` }} />
      ))}
    </div>
  );
}
