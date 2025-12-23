
import React, { useRef, useEffect } from 'react';
import { GameState, TerrainType, RoadType, WeatherType } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, TRAFFIC_LIGHT_DISTANCE, TRAFFIC_LIGHT_CYCLE } from '../constants';

interface GameCanvasProps {
  state: GameState;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ state }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rainParticles = useRef<{ x: number, y: number, speed: number, length: number }[]>([]);

  useEffect(() => {
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
      drawBackground(ctx, state);
      drawRoad(ctx, state);
      drawEnvironment(ctx, state);
      drawTrafficLights(ctx, state);
      drawBusStops(ctx, state);
      drawBus(ctx, state);
      drawWeatherEffects(ctx, state);
      animationFrameId = window.requestAnimationFrame(render);
    };

    render();
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [state]);

  const drawBackground = (ctx: CanvasRenderingContext2D, state: GameState) => {
    const { terrain, currentDistance, weather } = state;
    if (terrain === TerrainType.CITY) {
      ctx.fillStyle = weather === WeatherType.FOG ? '#4a5568' : '#2d3748'; 
    } else if (terrain === TerrainType.SUBURBAN) {
      ctx.fillStyle = weather === WeatherType.FOG ? '#2f855a' : '#276749'; 
    } else {
      ctx.fillStyle = weather === WeatherType.FOG ? '#744210' : '#975a16'; 
    }
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const seed = Math.floor(currentDistance / 100);
    ctx.globalAlpha = weather === WeatherType.RAIN ? 0.3 : 0.2;
    if (terrain !== TerrainType.CITY) {
      ctx.fillStyle = '#1a365d'; 
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
  };

  const drawRoad = (ctx: CanvasRenderingContext2D, state: GameState) => {
    const roadWidth = 300;
    const centerX = CANVAS_WIDTH / 2;
    const isWet = state.weather === WeatherType.RAIN;
    ctx.fillStyle = state.road === RoadType.PAVED ? '#718096' : '#5a310c';
    ctx.fillRect(centerX - roadWidth / 2 - 10, 0, roadWidth + 20, CANVAS_HEIGHT);
    ctx.fillStyle = state.road === RoadType.PAVED 
      ? (isWet ? '#0a0f1a' : '#1a202c') 
      : (isWet ? '#5a310c' : '#8c5e2a');
    ctx.fillRect(centerX - roadWidth / 2, 0, roadWidth, CANVAS_HEIGHT);
    if (state.road === RoadType.PAVED) {
      ctx.strokeStyle = isWet ? 'rgba(246, 224, 94, 0.7)' : '#f6e05e';
      ctx.lineWidth = 2;
      ctx.setLineDash([40, 40]);
      ctx.lineDashOffset = state.currentDistance % 80;
      ctx.beginPath(); ctx.moveTo(centerX, 0); ctx.lineTo(centerX, CANVAS_HEIGHT); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = isWet ? 'rgba(255, 255, 255, 0.6)' : '#fff';
      ctx.beginPath();
      ctx.moveTo(centerX - roadWidth / 2 + 5, 0); ctx.lineTo(centerX - roadWidth / 2 + 5, CANVAS_HEIGHT);
      ctx.moveTo(centerX + roadWidth / 2 - 5, 0); ctx.lineTo(centerX + roadWidth / 2 - 5, CANVAS_HEIGHT);
      ctx.stroke();
    }
  };

  const drawTrafficLights = (ctx: CanvasRenderingContext2D, state: GameState) => {
    if (state.terrain !== TerrainType.CITY) return;

    const centerX = CANVAS_WIDTH / 2;
    const roadWidth = 300;
    const time = Date.now();
    
    // Calculate light positions relative to scroll
    const startIdx = Math.floor(state.currentDistance / TRAFFIC_LIGHT_DISTANCE) - 1;
    const endIdx = startIdx + 3;

    for (let i = startIdx; i <= endIdx; i++) {
      const lightZ = i * TRAFFIC_LIGHT_DISTANCE;
      const screenY = CANVAS_HEIGHT - (lightZ - state.currentDistance) / 1;

      if (screenY > -200 && screenY < CANVAS_HEIGHT + 200) {
        // Calculate Phase
        const cycleTime = (time + i * 5000) % TRAFFIC_LIGHT_CYCLE;
        let color = '#10B981'; // Green
        if (cycleTime < 6000) color = '#EF4444'; // Red (6s)
        else if (cycleTime < 8000) color = '#FBBF24'; // Yellow (2s)

        // Draw Light Pole (Left side)
        ctx.fillStyle = '#4A5568';
        ctx.fillRect(centerX - roadWidth / 2 - 40, screenY - 150, 10, 150); // Pole
        ctx.fillStyle = '#1A202C';
        ctx.fillRect(centerX - roadWidth / 2 - 50, screenY - 180, 30, 60); // Box

        // Draw Lights
        const lightX = centerX - roadWidth / 2 - 35;
        // Red
        ctx.fillStyle = color === '#EF4444' ? '#EF4444' : '#441111';
        if (color === '#EF4444') { ctx.shadowBlur = 15; ctx.shadowColor = '#EF4444'; }
        ctx.beginPath(); ctx.arc(lightX, screenY - 165, 6, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        // Yellow
        ctx.fillStyle = color === '#FBBF24' ? '#FBBF24' : '#443311';
        if (color === '#FBBF24') { ctx.shadowBlur = 15; ctx.shadowColor = '#FBBF24'; }
        ctx.beginPath(); ctx.arc(lightX, screenY - 150, 6, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        // Green
        ctx.fillStyle = color === '#10B981' ? '#10B981' : '#114422';
        if (color === '#10B981') { ctx.shadowBlur = 15; ctx.shadowColor = '#10B981'; }
        ctx.beginPath(); ctx.arc(lightX, screenY - 135, 6, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        // Stop Line on road
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(centerX - roadWidth / 2, screenY - 10, roadWidth, 10);
      }
    }
  };

  const drawBuilding = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, type: 'city' | 'village-perm' | 'village-semi' | 'village-trad', weather: WeatherType) => {
    ctx.save();
    if (weather === WeatherType.FOG) {
      const distFromBottom = CANVAS_HEIGHT - y;
      ctx.globalAlpha = Math.max(0, Math.min(1, distFromBottom / 400));
    }
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(x + 5, y + 5, w, h);
    if (type === 'city') {
      ctx.fillStyle = '#4a5568';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#f6e05e';
      ctx.globalAlpha = weather === WeatherType.RAIN ? 0.2 : 0.3;
      for (let i = 10; i < w - 10; i += 15) {
        for (let j = 10; j < h - 10; j += 20) {
          if ((i + j) % 3 === 0) ctx.fillRect(x + i, y + j, 8, 12);
        }
      }
    } else if (type === 'village-perm') {
      ctx.fillStyle = '#cbd5e0'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#744210'; ctx.fillRect(x - 5, y - 10, w + 10, 15);
    } else if (type === 'village-semi') {
      ctx.fillStyle = '#b7791f'; ctx.fillRect(x, y, w, h);
    } else if (type === 'village-trad') {
      ctx.fillStyle = '#744210'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 20); ctx.fill();
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
      } else if (terrain === TerrainType.VILLAGE) {
        if (seed % 3 === 0) drawBuilding(ctx, centerX - roadWidth - 80, y, 60, 50, 'village-trad', weather);
        else if (seed % 3 === 1) drawBuilding(ctx, centerX + roadWidth + 40, y + 200, 70, 60, 'village-semi', weather);
        else drawBuilding(ctx, centerX - roadWidth - 120, y + 400, 80, 80, 'village-perm', weather);
      }
    }
  };

  const drawBusStops = (ctx: CanvasRenderingContext2D, state: GameState) => {
    const centerX = CANVAS_WIDTH / 2;
    const roadWidth = 300;
    const stopY = CANVAS_HEIGHT - (state.nextStopDistance - state.currentDistance) / 1;
    if (stopY > -100 && stopY < CANVAS_HEIGHT + 100) {
      ctx.fillStyle = '#a0aec0'; ctx.fillRect(centerX + roadWidth / 2, stopY, 60, 100);
      ctx.fillStyle = '#2d3748'; ctx.fillRect(centerX + roadWidth / 2 + 10, stopY + 10, 40, 80);
    }
  };

  const drawBus = (ctx: CanvasRenderingContext2D, state: GameState) => {
    const { selectedBus, weather, headlightsOn, steeringAngle, wipersActive } = state;
    if (!selectedBus) return;
    const centerX = CANVAS_WIDTH / 2;
    const busY = CANVAS_HEIGHT - 150;
    let busW = 40, busL = 80;
    if (selectedBus.size === 'Medium') { busW = 50; busL = 100; }
    if (selectedBus.size === 'Large') { busW = 55; busL = 140; }

    ctx.save();
    // Apply slight steering lean visually
    ctx.translate(centerX, busY + busL / 2);
    ctx.rotate((steeringAngle * Math.PI / 180) * 0.05);
    ctx.translate(-centerX, -(busY + busL / 2));

    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(centerX - busW / 2 + 8, busY + 8, busW, busL);
    ctx.fillStyle = selectedBus.color; ctx.fillRect(centerX - busW / 2, busY, busW, busL);
    ctx.fillStyle = '#a0aec0'; ctx.fillRect(centerX - busW / 2 + 5, busY + 8, busW - 10, 22);

    // Headlight Beams
    if (headlightsOn) {
      const grad = ctx.createLinearGradient(0, busY, 0, busY - 150);
      grad.addColorStop(0, 'rgba(255, 255, 200, 0.4)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.moveTo(centerX - busW / 2, busY); ctx.lineTo(centerX - busW, busY - 150); ctx.lineTo(centerX + busW, busY - 150); ctx.lineTo(centerX + busW / 2, busY); ctx.fill();
    }

    // Wipers effect
    if (wipersActive) {
      const wiperPhase = (Date.now() / 300) % (Math.PI * 2);
      ctx.strokeStyle = '#2d3748'; ctx.lineWidth = 2;
      const angle = Math.sin(wiperPhase) * 0.8;
      ctx.beginPath(); ctx.moveTo(centerX - busW / 4, busY + 30); ctx.lineTo(centerX - busW / 4 + Math.sin(angle) * 20, busY + 30 - Math.cos(angle) * 20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(centerX + busW / 4, busY + 30); ctx.lineTo(centerX + busW / 4 + Math.sin(angle) * 20, busY + 30 - Math.cos(angle) * 20); ctx.stroke();
    }

    ctx.fillStyle = headlightsOn ? '#fff' : '#fffae0';
    ctx.shadowBlur = headlightsOn ? 20 : 5;
    ctx.fillRect(centerX - busW / 2 + 4, busY - 2, 10, 5);
    ctx.fillRect(centerX + busW / 2 - 14, busY - 2, 10, 5);
    ctx.restore();
  };

  return (
    <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="rounded-lg shadow-2xl border-4 border-slate-800" />
  );
};

export default GameCanvas;
