
import React, { useRef, useEffect, useState } from 'react';
import { GameState, TerrainType, RoadType, WeatherType } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, CITY_THRESHOLD, VILLAGE_THRESHOLD } from '../constants';

interface GameCanvasProps {
  state: GameState;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ state }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rainParticles = useRef<{ x: number, y: number, speed: number, length: number }[]>([]);

  useEffect(() => {
    // Initialize rain particles
    rainParticles.current = Array.from({ length: 150 }, () => ({
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * CANVAS_HEIGHT,
      speed: 10 + Math.random() * 10,
      length: 10 + Math.random() * 10
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Draw Background / Terrain
      drawBackground(ctx, state);
      
      // Draw Road and Curbs
      drawRoad(ctx, state);

      // Draw Environment Props (Buildings, Trees, Traffic)
      drawEnvironment(ctx, state);

      // Draw Bus Stop if nearby
      drawBusStops(ctx, state);

      // Draw Player Bus
      drawBus(ctx, state);

      // Draw Weather Overlays
      drawWeatherEffects(ctx, state);

      animationFrameId = window.requestAnimationFrame(render);
    };

    render();
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [state]);

  const drawBackground = (ctx: CanvasRenderingContext2D, state: GameState) => {
    const { terrain, currentDistance, weather } = state;
    
    // Base color adjusted by weather
    if (terrain === TerrainType.CITY) {
      ctx.fillStyle = weather === WeatherType.FOG ? '#4a5568' : '#2d3748'; 
    } else if (terrain === TerrainType.SUBURBAN) {
      ctx.fillStyle = weather === WeatherType.FOG ? '#2f855a' : '#276749'; 
    } else {
      ctx.fillStyle = weather === WeatherType.FOG ? '#744210' : '#975a16'; 
    }
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Texture details
    const seed = Math.floor(currentDistance / 100);
    ctx.globalAlpha = weather === WeatherType.RAIN ? 0.3 : 0.2;
    if (terrain !== TerrainType.CITY) {
      ctx.fillStyle = weather === WeatherType.RAIN ? '#1a365d' : '#1a365d'; 
      for (let i = 0; i < 10; i++) {
        const x = ((i * 123 + seed) % CANVAS_WIDTH);
        const y = ((i * 456 + currentDistance * 0.5) % CANVAS_HEIGHT);
        ctx.beginPath();
        ctx.arc(x, y, 20 + (i % 5) * 10, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = '#1a202c';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    ctx.globalAlpha = 1.0;
  };

  const drawWeatherEffects = (ctx: CanvasRenderingContext2D, state: GameState) => {
    const { weather } = state;

    if (weather === WeatherType.RAIN) {
      ctx.save();
      ctx.strokeStyle = 'rgba(174, 194, 224, 0.5)';
      ctx.lineWidth = 1;
      rainParticles.current.forEach(p => {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + 2, p.y + p.length);
        ctx.stroke();
        p.y += p.speed;
        if (p.y > CANVAS_HEIGHT) p.y = -p.length;
      });
      ctx.restore();

      // Overall wet tint
      ctx.fillStyle = 'rgba(0, 50, 100, 0.1)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    if (weather === WeatherType.FOG) {
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      grad.addColorStop(0, 'rgba(200, 200, 210, 0.8)');
      grad.addColorStop(0.4, 'rgba(200, 200, 210, 0.3)');
      grad.addColorStop(1, 'rgba(200, 200, 210, 0.1)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    if (weather === WeatherType.CLEAR) {
      // Sunshine glow
      const grad = ctx.createRadialGradient(CANVAS_WIDTH * 0.8, 100, 10, CANVAS_WIDTH * 0.8, 100, 300);
      grad.addColorStop(0, 'rgba(255, 255, 200, 0.2)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  };

  const drawRoad = (ctx: CanvasRenderingContext2D, state: GameState) => {
    const roadWidth = 300;
    const centerX = CANVAS_WIDTH / 2;
    const isWet = state.weather === WeatherType.RAIN;
    
    if (state.road === RoadType.PAVED) {
      ctx.fillStyle = '#718096';
      ctx.fillRect(centerX - roadWidth / 2 - 10, 0, roadWidth + 20, CANVAS_HEIGHT);
    } else {
      ctx.fillStyle = '#5a310c';
      ctx.fillRect(centerX - roadWidth / 2 - 5, 0, roadWidth + 10, CANVAS_HEIGHT);
    }

    ctx.fillStyle = state.road === RoadType.PAVED 
      ? (isWet ? '#0a0f1a' : '#1a202c') 
      : (isWet ? '#5a310c' : '#8c5e2a');
    ctx.fillRect(centerX - roadWidth / 2, 0, roadWidth, CANVAS_HEIGHT);

    if (state.road === RoadType.PAVED) {
      ctx.strokeStyle = isWet ? 'rgba(246, 224, 94, 0.7)' : '#f6e05e';
      ctx.lineWidth = 2;
      ctx.setLineDash([40, 40]);
      ctx.lineDashOffset = state.currentDistance % 80;
      ctx.beginPath();
      ctx.moveTo(centerX, 0);
      ctx.lineTo(centerX, CANVAS_HEIGHT);
      ctx.stroke();
      
      ctx.setLineDash([]);
      ctx.strokeStyle = isWet ? 'rgba(255, 255, 255, 0.6)' : '#fff';
      ctx.beginPath();
      ctx.moveTo(centerX - roadWidth / 2 + 5, 0);
      ctx.lineTo(centerX - roadWidth / 2 + 5, CANVAS_HEIGHT);
      ctx.moveTo(centerX + roadWidth / 2 - 5, 0);
      ctx.lineTo(centerX + roadWidth / 2 - 5, CANVAS_HEIGHT);
      ctx.stroke();
    } else {
      ctx.fillStyle = isWet ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.1)';
      ctx.fillRect(centerX - 60, 0, 30, CANVAS_HEIGHT);
      ctx.fillRect(centerX + 30, 0, 30, CANVAS_HEIGHT);
    }
  };

  const drawBuilding = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, type: 'city' | 'village-perm' | 'village-semi' | 'village-trad', weather: WeatherType) => {
    ctx.save();
    
    // Visibility fade in fog
    if (weather === WeatherType.FOG) {
      const distFromBottom = CANVAS_HEIGHT - y;
      ctx.globalAlpha = Math.max(0, Math.min(1, distFromBottom / 400));
    }

    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(x + 5, y + 5, w, h);

    if (type === 'city') {
      ctx.fillStyle = weather === WeatherType.RAIN ? '#2d3748' : '#4a5568';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = weather === WeatherType.RAIN ? '#ecc94b' : '#f6e05e';
      ctx.globalAlpha = weather === WeatherType.RAIN ? 0.2 : 0.3;
      for (let i = 10; i < w - 10; i += 15) {
        for (let j = 10; j < h - 10; j += 20) {
          if ((i + j) % 3 === 0) ctx.fillRect(x + i, y + j, 8, 12);
        }
      }
    } else if (type === 'village-perm') {
      ctx.fillStyle = '#cbd5e0';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#744210';
      ctx.fillRect(x - 5, y - 10, w + 10, 15);
    } else if (type === 'village-semi') {
      ctx.fillStyle = '#b7791f';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#4a5568';
      ctx.lineWidth = 1;
      for (let i = 0; i < w; i += 4) {
        ctx.beginPath(); ctx.moveTo(x + i, y); ctx.lineTo(x + i, y + h); ctx.stroke();
      }
    } else if (type === 'village-trad') {
      ctx.fillStyle = '#744210';
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 20);
      ctx.fill();
      ctx.fillStyle = '#975a16';
      ctx.beginPath();
      ctx.moveTo(x - 10, y + 5);
      ctx.lineTo(x + w / 2, y - 20);
      ctx.lineTo(x + w + 10, y + 5);
      ctx.fill();
    }
    ctx.restore();
  };

  const drawEnvironment = (ctx: CanvasRenderingContext2D, state: GameState) => {
    const { terrain, currentDistance, weather } = state;
    const centerX = CANVAS_WIDTH / 2;
    const roadWidth = 300;
    const interval = 800;
    const phase = currentDistance % interval;

    for (let i = -1; i < 2; i++) {
      const y = (i * interval) - phase + 200;
      const seed = Math.floor((currentDistance + i * interval) / interval);
      
      if (terrain === TerrainType.CITY) {
        drawBuilding(ctx, centerX - roadWidth - 100, y, 80, 200 + (seed % 3) * 50, 'city', weather);
        drawBuilding(ctx, centerX + roadWidth + 20, y + 300, 100, 150 + (seed % 2) * 100, 'city', weather);
        
        ctx.fillStyle = '#2d3748';
        ctx.fillRect(centerX - roadWidth / 2 - 15, y + 100, 5, 60);
        ctx.fillStyle = weather === WeatherType.FOG ? 'rgba(246, 224, 94, 0.8)' : '#f6e05e';
        ctx.beginPath(); ctx.arc(centerX - roadWidth / 2 - 12.5, y + 100, 8, 0, Math.PI * 2); ctx.fill();

        const trafficY = (y + 400) % (CANVAS_HEIGHT + 200) - 100;
        ctx.fillStyle = weather === WeatherType.RAIN ? '#9b2c2c' : '#e53e3e';
        ctx.fillRect(centerX - 100, trafficY, 30, 50);
        ctx.fillStyle = '#fff';
        ctx.fillRect(centerX - 95, trafficY + 5, 20, 10);
      } else if (terrain === TerrainType.VILLAGE) {
        if (seed % 3 === 0) {
          drawBuilding(ctx, centerX - roadWidth - 80, y, 60, 50, 'village-trad', weather);
        } else if (seed % 3 === 1) {
          drawBuilding(ctx, centerX + roadWidth + 40, y + 200, 70, 60, 'village-semi', weather);
        } else {
          drawBuilding(ctx, centerX - roadWidth - 120, y + 400, 80, 80, 'village-perm', weather);
        }

        ctx.strokeStyle = '#5a310c';
        ctx.lineWidth = 3;
        const fenceX = centerX + roadWidth / 2 + 20;
        ctx.beginPath();
        ctx.moveTo(fenceX, y); ctx.lineTo(fenceX, y + 200);
        for(let j=0; j<200; j+=40) { ctx.moveTo(fenceX - 10, y + j); ctx.lineTo(fenceX + 10, y + j); }
        ctx.stroke();

        ctx.fillStyle = '#ecc94b';
        ctx.beginPath();
        ctx.arc(centerX - roadWidth - 150, y + 250, 30, 0, Math.PI, true);
        ctx.fill();

        ctx.fillStyle = weather === WeatherType.RAIN ? '#1a3626' : '#22543d';
        ctx.beginPath();
        ctx.moveTo(centerX + roadWidth + 120, y + 50);
        ctx.lineTo(centerX + roadWidth + 80, y + 150);
        ctx.lineTo(centerX + roadWidth + 160, y + 150);
        ctx.fill();
        ctx.fillRect(centerX + roadWidth + 115, y + 150, 10, 20);
      } else {
        ctx.fillStyle = weather === WeatherType.RAIN ? '#1a4331' : '#2f855a';
        ctx.beginPath(); ctx.arc(centerX - roadWidth - 100, y + 100, 40, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(centerX + roadWidth + 100, y + 300, 50, 0, Math.PI * 2); ctx.fill();
      }
    }
  };

  const drawBusStops = (ctx: CanvasRenderingContext2D, state: GameState) => {
    const centerX = CANVAS_WIDTH / 2;
    const roadWidth = 300;
    const { weather } = state;
    
    const stopY = CANVAS_HEIGHT - (state.nextStopDistance - state.currentDistance) / 1;
    
    if (stopY > -100 && stopY < CANVAS_HEIGHT + 100) {
      if (weather === WeatherType.FOG) {
        const opacity = Math.max(0, Math.min(1, (CANVAS_HEIGHT - stopY) / 300));
        ctx.globalAlpha = opacity;
      }

      ctx.fillStyle = '#a0aec0';
      ctx.fillRect(centerX + roadWidth / 2, stopY, 60, 100);
      
      ctx.fillStyle = '#2d3748';
      ctx.fillRect(centerX + roadWidth / 2 + 10, stopY + 10, 40, 80);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText("STATION", centerX + roadWidth / 2 + 12, stopY + 30);

      ctx.fillStyle = '#000';
      ctx.fillRect(centerX + roadWidth / 2 + 5, stopY, 4, 100);
      ctx.fillStyle = '#f6e05e';
      ctx.fillRect(centerX + roadWidth / 2 - 5, stopY, 20, 20);
      ctx.fillStyle = '#000';
      ctx.fillText("BUS", centerX + roadWidth / 2 - 3, stopY + 14);

      ctx.globalAlpha = 1.0;
    }
  };

  const drawBus = (ctx: CanvasRenderingContext2D, state: GameState) => {
    const { selectedBus, weather } = state;
    if (!selectedBus) return;

    const centerX = CANVAS_WIDTH / 2;
    const busY = CANVAS_HEIGHT - 150;
    
    let busW = 40;
    let busL = 80;
    if (selectedBus.size === 'Medium') { busW = 50; busL = 100; }
    if (selectedBus.size === 'Large') { busW = 55; busL = 140; }

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(centerX - busW / 2 + 8, busY + 8, busW, busL);

    ctx.fillStyle = selectedBus.color;
    ctx.fillRect(centerX - busW / 2, busY, busW, busL);
    
    ctx.fillStyle = '#a0aec0';
    ctx.fillRect(centerX - busW / 2 + 5, busY + 8, busW - 10, 22);
    for (let i = 0; i < (busL / 35); i++) {
        ctx.fillRect(centerX - busW / 2 + 2, busY + 45 + (i * 35), 4, 25);
        ctx.fillRect(centerX + busW / 2 - 6, busY + 45 + (i * 35), 4, 25);
    }

    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.strokeRect(centerX - busW / 2, busY, busW, busL);

    // Headlights - brighter in fog/rain
    ctx.fillStyle = (weather !== WeatherType.CLEAR) ? '#fff' : '#fffae0';
    ctx.shadowBlur = (weather !== WeatherType.CLEAR) ? 20 : 5;
    ctx.shadowColor = (weather !== WeatherType.CLEAR) ? '#fff' : '#f6e05e';
    ctx.fillRect(centerX - busW / 2 + 4, busY - 2, 10, 5);
    ctx.fillRect(centerX + busW / 2 - 14, busY - 2, 10, 5);
    ctx.shadowBlur = 0;

    if (state.isStopped) {
       ctx.strokeStyle = '#f6e05e';
       ctx.lineWidth = 4;
       ctx.setLineDash([10, 5]);
       ctx.strokeRect(centerX - busW / 2 - 10, busY - 10, busW + 20, busL + 20);
       ctx.setLineDash([]);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="rounded-lg shadow-2xl border-4 border-slate-800"
    />
  );
};

export default GameCanvas;
