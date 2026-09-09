'use client';

import React, { useState, useEffect } from 'react';
import Bottle from '../components/Bottle';

const SoundOnIcon = () => <span style={{ color: '#4CAF50' }}>🔊 ON</span>;
const SoundOffIcon = () => <span style={{ color: '#F44336' }}>🔇 OFF</span>;

export default function WaterSortGame() {
  const [stage, setStage] = useState(1);
  const [bottles, setBottles] = useState<string[][]>([]);
  const [selectedBottle, setSelectedBottle] = useState<number | null>(null);
  
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [undoCount, setUndoCount] = useState(5);
  const [extraBottleCapacity, setExtraBottleCapacity] = useState(0);

  const initGame = () => {
    // 7개의 꽉 찬 병 + 2개의 빈 병
    const initialBottles = [
      ['#FF0000', '#0000FF', '#008000', '#FFFF00'],
      ['#0000FF', '#FF0000', '#FFFF00', '#008000'],
      ['#008000', '#FFFF00', '#FF0000', '#0000FF'],
      ['#FFFF00', '#008000', '#0000FF', '#FF0000'],
      ['#800080', '#FFA500', '#800080', '#FFA500'],
      ['#FFA500', '#800080', '#00FFFF', '#00FFFF'],
      ['#00FFFF', '#00FFFF', '#800080', '#FFA500'],
      [], 
      []  
    ];
    setBottles(initialBottles);
    setExtraBottleCapacity(0);
    setSelectedBottle(null);
  };

  useEffect(() => {
    initGame();
  }, [stage]);

  const toggleSound = () => setIsSoundOn(!isSoundOn);

  const showAd = (callback: () => void) => {
    alert("Watching Ad... (Ad Queue Triggered)");
    setTimeout(() => {
      callback();
    }, 1000); 
  };

  const handleRestart = () => initGame();

  const handleUndo = () => {
    if (undoCount > 0) {
      setUndoCount(prev => prev - 1);
      // 실제 Undo(이전 단계 되돌리기) 데이터 처리 로직은 여기에 추가
    } else {
      showAd(() => {
        setUndoCount(5);
      });
    }
  };

  const handleAddBottle = () => {
    if (extraBottleCapacity >= 5) {
      alert("Max bottle size reached.");
      return;
    }
    
    showAd(() => {
      if (extraBottleCapacity === 0) {
        setBottles([...bottles, []]); // 10번째 병 생성
      }
      setExtraBottleCapacity(prev => prev + 1);
    });
  };

  const handleNextStage = () => {
    if (stage < 1000) {
      setStage(prev => prev + 1);
    }
  };

  const handleBottleClick = (index: number) => {
     if (selectedBottle === null) {
         if (bottles[index].length > 0) setSelectedBottle(index);
     } else {
         if (selectedBottle === index) {
             setSelectedBottle(null);
         } else {
             // 물 붓기 로직은 여기에 구현
             setSelectedBottle(null); 
         }
     }
  };

  const getGridStyle = (): React.CSSProperties => {
    const totalBottles = bottles.length;
    return {
      display: 'grid',
      gridTemplateColumns: totalBottles === 10 ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)',
      gap: '15px',
      justifyItems: 'center',
      marginBottom: '40px',
      padding: '20px',
      width: '100%',
      maxWidth: '600px'
    };
  };

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#1a1a2e', color: 'white', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', alignItems: 'center' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Level {stage}</h2>
        <button 
          onClick={toggleSound} 
          style={{ 
            background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '8px', padding: '8px 12px', fontSize: '16px', cursor: 'pointer',
          }}>
          {isSoundOn ? <SoundOnIcon /> : <SoundOffIcon />}
        </button>
      </div>

      {/* Game Board */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
        <div style={getGridStyle()}>
          {bottles.map((bottleColors, index) => (
            <Bottle 
              key={index} 
              colors={bottleColors} 
              capacity={index === 9 ? Math.max(1, extraBottleCapacity) : 4} 
              isSelected={selectedBottle === index}
              onClick={() => handleBottleClick(index)}
            />
          ))}
        </div>
      </div>

      {/* Control Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '20px 10px', backgroundColor: '#16213e', borderTopLeftRadius: '20px', borderTopRightRadius: '20px' }}>
        <button onClick={handleRestart} className="control-btn">
          <span>🔄</span><br/>Restart
        </button>
        <button onClick={handleUndo} className="control-btn" style={{ position: 'relative' }}>
          <span>⏪</span><br/>Undo
          <span className="badge">{undoCount}</span>
        </button>
        <button onClick={handleAddBottle} className="control-btn">
          <span>🧪+</span><br/>Add Bottle
        </button>
        <button onClick={handleNextStage} className="control-btn">
          <span>🎯</span><br/>Stage
        </button>
      </div>

      {/* Ad Space Area */}
      <div style={{ height: '60px', backgroundColor: '#0f3460', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: '#aaa', margin: 0, fontSize: '14px', fontWeight: 'bold' }}>[ Ad Banner Space ]</p>
      </div>
    </main>
  );
}
