import React from "react";
import type { Bottle as BottleType } from "@/lib/game";

interface BottleProps {
  bottle: BottleType;
  capacity: number; // 1 ~ 5칸
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
  
  // 기준 높이: 5칸일 때 150px
  const BASE_HEIGHT = 150;
  const MAX_CAPACITY = 5;
  // 현재 칸 수(capacity)에 비례해서 유리병 높이 계산 (1칸이면 30px, 2칸이면 60px...)
  const currentHeight = (capacity / MAX_CAPACITY) * BASE_HEIGHT;

  const bottleStyle: React.CSSProperties = {
    width: "42px",
    height: `${currentHeight}px`, // 병 높이가 칸 수에 맞게 다이나믹하게 변함
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
    <div 
      style={bottleStyle} 
      onClick={onClick} 
      // 5칸이 꽉 찼을 때만 클리어 펄스 애니메이션 적용
      className={isCompleted && capacity === 5 ? "completed-pulse" : ""}
    >
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
