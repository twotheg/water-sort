import React from "react";
import type { Bottle as BottleType } from "@/lib/game";

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

export function Bottle({
  bottle,
  capacity,
  isSelected,
  isCompleted,
  onClick,
}: BottleProps) {
  // 빈 칸 개수 계산
  const emptySlots = Math.max(0, capacity - bottle.length);

  // 입체적인 3D 유리병 스타일
  const bottleStyle: React.CSSProperties = {
    width: "45px",
    height: "160px",
    borderRadius: "0 0 25px 25px",
    border: "3px solid rgba(255, 255, 255, 0.4)",
    borderTop: "none",
    boxShadow: isSelected
      ? "0 -10px 15px rgba(255, 255, 255, 0.5), inset -5px -5px 10px rgba(0,0,0,0.2), inset 5px 0 10px rgba(255,255,255,0.6)"
      : "inset -5px -5px 10px rgba(0,0,0,0.2), inset 5px 0 10px rgba(255,255,255,0.6)",
    background: "rgba(255, 255, 255, 0.1)",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column-reverse",
    cursor: "pointer",
    transform: isSelected ? "translateY(-15px)" : "translateY(0)",
    transition: "all 0.2s ease-in-out",
  };

  // 내부 물의 입체감을 살리는 스타일
  const waterChunkStyle = (color: string, isTop: boolean): React.CSSProperties => ({
    width: "100%",
    height: `${100 / Math.max(1, capacity)}%`,
    backgroundColor: color,
    boxShadow: isTop
      ? "inset 0 4px 4px rgba(255,255,255,0.4)"
      : "inset 0 2px 5px rgba(0,0,0,0.2)",
    borderTop: isTop ? "2px solid rgba(255,255,255,0.5)" : "none",
    transition: "background-color 0.3s ease",
  });

  return (
    <div style={bottleStyle} onClick={onClick} className={isCompleted ? "completed-pulse" : ""}>
      {/* 채워진 물 */}
      {bottle.map((color, i) => {
        const isTopSegment = i === bottle.length - 1;
        return <div key={`color-${i}`} style={waterChunkStyle(color, isTopSegment)} />;
      })}
      {/* 빈 공간 */}
      {Array.from({ length: emptySlots }).map((_, i) => (
        <div key={`empty-${i}`} style={{ width: "100%", height: `${100 / Math.max(1, capacity)}%` }} />
      ))}
    </div>
  );
}
