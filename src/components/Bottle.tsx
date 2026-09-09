import React from 'react';

interface BottleProps {
  colors: string[];
  capacity?: number;
  onClick: () => void;
  isSelected: boolean;
}

export default function Bottle({ colors, capacity = 4, onClick, isSelected }: BottleProps) {
  const bottleStyle: React.CSSProperties = {
    width: '45px',
    height: '160px',
    borderRadius: '0 0 25px 25px',
    border: '3px solid rgba(255, 255, 255, 0.4)',
    borderTop: 'none',
    boxShadow: isSelected 
      ? '0 -10px 15px rgba(255, 255, 255, 0.5), inset -5px -5px 10px rgba(0,0,0,0.2), inset 5px 0 10px rgba(255,255,255,0.6)'
      : 'inset -5px -5px 10px rgba(0,0,0,0.2), inset 5px 0 10px rgba(255,255,255,0.6)',
    background: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column-reverse',
    cursor: 'pointer',
    transform: isSelected ? 'translateY(-15px)' : 'translateY(0)',
    transition: 'all 0.2s ease-in-out',
  };

  const waterChunkStyle: React.CSSProperties = {
    width: '100%',
    height: `${100 / capacity}%`,
    boxShadow: 'inset 0 2px 5px rgba(255,255,255,0.3)',
  };

  return (
    <div style={bottleStyle} onClick={onClick}>
      {colors.map((color, index) => (
        <div 
          key={index} 
          style={{ ...waterChunkStyle, backgroundColor: color }} 
        />
      ))}
    </div>
  );
}
