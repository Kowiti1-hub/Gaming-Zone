
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
    
    const startIdx = Math.floor(state.currentDistance / TRAFFIC_LIGHT_DISTANCE) - 1;
    const endIdx = startIdx + 3;

    for (let i = startIdx; i <= endIdx; i++) {
      const lightZ = i * TRAFFIC_LIGHT_DISTANCE;
      const screenY = CANVAS_HEIGHT - (lightZ - state.currentDistance) / 1;

      if (screenY > -200 && screenY < CANVAS_HEIGHT + 200) {
        const cycleTime = (time + i * 5000) % TRAFFIC_LIGHT_CYCLE;
        let color = '#10B981'; 
        if (cycleTime < 6000) color = '#EF4444'; 
        else if (cycleTime < 8000) color = '#FBBF24'; 

        ctx.fillStyle = '#4A5568';
        ctx.fillRect(centerX - roadWidth / 2 - 40, screenY - 150, 10, 150); 
        ctx.fillStyle = '#1A202C';
        ctx.fillRect(centerX - roadWidth / 2 - 50, screenY - 180, 30, 60); 

        const lightX = centerX - roadWidth / 2 - 35;
        ctx.fillStyle = color === '#EF4444' ? '#EF4444' : '#441111';
        if (color === '#EF4444') { ctx.shadowBlur = 15; ctx.shadowColor = '#EF4444'; }
        ctx.beginPath(); ctx.arc(lightX, screenY - 165, 6, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = color === '#FBBF24' ? '#FBBF24' : '#443311';
        if (color === '#FBBF24') { ctx.shadowBlur = 15; ctx.shadowColor = '#FBBF24'; }
        ctx.beginPath(); ctx.arc(lightX, screenY - 150, 6, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = color === '#10B981' ? '#10B981' : '#114422';
        if (color === '#10B981') { ctx.shadowBlur = 15; ctx.shadowColor = '#10B981'; }
        ctx.beginPath(); ctx.arc(lightX, screenY - 135, 6, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(centerX - roadWidth / 2, screenY - 10, roadWidth, 10);
      }
    }
  };

  const drawBuilding = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, type: 'city' | 'village-perm' | 'village-semi' | 'village-trad', weather: WeatherType, seed: number) => {
    ctx.save();
    if (weather === WeatherType.FOG) {
      const distFromBottom = CANVAS_HEIGHT - y;
      ctx.globalAlpha = Math.max(0, Math.min(1, distFromBottom / 400));
    }
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(x + 5, y + 5, w, h);

    if (type === 'city') {
      const cityColors = ['#4a5568', '#2d3748', '#1a202c', '#718096'];
      ctx.fillStyle = cityColors[seed % cityColors.length];
      ctx.fillRect(x, y, w, h);
      
      // Dynamic Windows
      ctx.fillStyle = (weather === WeatherType.RAIN || weather === WeatherType.FOG) ? '#fefcbf' : '#f6e05e';
      ctx.globalAlpha = 0.3;
      const winCols = Math.floor(w / 15);
      const winRows = Math.floor(h / 20);
      for (let i = 0; i < winCols; i++) {
        for (let j = 0; j < winRows; j++) {
          if ((i * j + seed) % 5 > 1) {
            ctx.fillRect(x + 8 + i * 14, y + 10 + j * 18, 8, 12);
          }
        }
      }
    } else if (type === 'village-perm') {
      ctx.fillStyle = '#cbd5e0'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#744210'; ctx.fillRect(x - 5, y - 10, w + 10, 15); // Simple roof
    } else if (type === 'village-semi') {
      ctx.fillStyle = '#b7791f'; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#4a5568'; // Corrugated iron lines
      ctx.lineWidth = 1;
      for (let i = 2; i < w; i += 4) {
        ctx.beginPath(); ctx.moveTo(x + i, y); ctx.lineTo(x + i, y + h); ctx.stroke();
      }
    } else if (type === 'village-trad') {
      ctx.fillStyle = '#744210'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 20); ctx.fill();
      ctx.fillStyle = '#975a16'; // Thatch
      ctx.beginPath();
      ctx.moveTo(x - 10, y + 5);
      ctx.lineTo(x + w / 2, y - 15);
      ctx.lineTo(x + w + 10, y + 5);
      ctx.fill();
    }
    ctx.restore();
  };

  const drawTree = (ctx: CanvasRenderingContext2D, x: number, y: number, isCity: boolean, seed: number) => {
    ctx.save();
    // Trunk
    ctx.fillStyle = '#4a2c10';
    ctx.fillRect(x - 2, y, 4, 15);
    
    // Foliage
    ctx.fillStyle = isCity ? '#2f855a' : '#22543d';
    const variant = (seed % 3) * 5;
    ctx.beginPath();
    ctx.arc(x, y - 5, 12 + variant, 0, Math.PI * 2);
    ctx.arc(x - 8, y - 12, 10 + variant, 0, Math.PI * 2);
    ctx.arc(x + 8, y - 12, 10 + variant, 0, Math.PI * 2);
    ctx.fill();

    if (isCity) {
      // Planter box
      ctx.fillStyle = '#4a5568';
      ctx.fillRect(x - 15, y + 10, 30, 8);
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
        // Diverse Buildings
        const bHeightL = 150 + (seed % 5) * 40;
        const bHeightR = 120 + ((seed + 1) % 4) * 50;
        drawBuilding(ctx, centerX - roadWidth - 110, y, 90, bHeightL, 'city', weather, seed);
        drawBuilding(ctx, centerX + roadWidth + 20, y + 300, 100, bHeightR, 'city', weather, seed + 1);

        // Street Props
        // Fire Hydrant
        if (seed % 2 === 0) {
          const fhX = centerX - roadWidth / 2 - 20;
          const fhY = y + 400;
          ctx.fillStyle = '#e53e3e';
          ctx.fillRect(fhX, fhY, 6, 12);
          ctx.beginPath(); ctx.arc(fhX + 3, fhY, 4, 0, Math.PI * 2); ctx.fill();
        }

        // Benches & Trash Cans
        const benchX = centerX + roadWidth / 2 + 10;
        const benchY = y + 250;
        ctx.fillStyle = '#744210';
        ctx.fillRect(benchX, benchY, 35, 12); 
        ctx.fillRect(benchX + 4, benchY + 12, 4, 8); 
        ctx.fillRect(benchX + 27, benchY + 12, 4, 8); 

        const trashX = centerX + roadWidth / 2 + 50;
        const trashY = y + 245;
        ctx.fillStyle = '#4a5568';
        ctx.beginPath(); ctx.roundRect(trashX, trashY, 14, 20, 3); ctx.fill();

        // City Trees
        if (seed % 3 === 0) {
          drawTree(ctx, centerX - roadWidth - 140, y + 600, true, seed);
        }

        // Billboards
        if (seed % 5 === 0) {
           const bbX = centerX - roadWidth - 180;
           const bbY = y + 200;
           ctx.fillStyle = '#2d3748'; ctx.fillRect(bbX + 38, bbY, 4, 100); 
           ctx.fillStyle = '#1a202c'; ctx.fillRect(bbX, bbY - 60, 80, 60);
           ctx.fillStyle = '#63b3ed'; ctx.font = 'bold 8px sans-serif';
           ctx.fillText("FAST BUS", bbX + 10, bbY - 35);
        }

      } else if (terrain === TerrainType.VILLAGE) {
        // Diverse Village Buildings
        if (seed % 3 === 0) drawBuilding(ctx, centerX - roadWidth - 90, y, 70, 60, 'village-trad', weather, seed);
        else if (seed % 3 === 1) drawBuilding(ctx, centerX + roadWidth + 30, y + 200, 80, 70, 'village-semi', weather, seed);
        else drawBuilding(ctx, centerX - roadWidth - 130, y + 400, 90, 90, 'village-perm', weather, seed);

        // Fences
        const fenceX = centerX + roadWidth / 2 + 15;
        const fenceLen = 300;
        ctx.strokeStyle = '#5a310c';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let f = 0; f < fenceLen; f += 40) {
          ctx.moveTo(fenceX, y + f); ctx.lineTo(fenceX, y + f + 30); // vertical post
          if (f < fenceLen - 40) {
            ctx.moveTo(fenceX, y + f + 10); ctx.lineTo(fenceX + 20, y + f + 10); // horizontal bar
          }
        }
        ctx.stroke();

        // Mailbox
        if (seed % 2 === 1) {
          const mbX = centerX + roadWidth / 2 + 15;
          const mbY = y + 100;
          ctx.fillStyle = '#4a5568';
          ctx.fillRect(mbX - 1, mbY, 2, 20); // post
          ctx.fillStyle = '#e53e3e';
          ctx.fillRect(mbX - 5, mbY - 8, 10, 8); // box
        }

        // Village Nature
        drawTree(ctx, centerX - roadWidth - 160, y + 50, false, seed);
        drawTree(ctx, centerX + roadWidth + 140, y + 450, false, seed + 2);

        // Garden Patches
        ctx.fillStyle = '#22543d';
        for (let g = 0; g < 5; g++) {
          ctx.beginPath();
          ctx.arc(centerX - roadWidth - 200 + (g * 10), y + 300 + (seed % 5) * 10, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Suburban transition
        drawTree(ctx, centerX - roadWidth - 120, y + 100, false, seed);
        drawTree(ctx, centerX + roadWidth + 120, y + 300, false, seed + 1);
        // Small flower patches
        ctx.fillStyle = '#f687b3';
        ctx.beginPath(); ctx.arc(centerX - roadWidth - 80, y + 400, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#faf089';
        ctx.beginPath(); ctx.arc(centerX + roadWidth + 80, y + 150, 5, 0, Math.PI * 2); ctx.fill();
      }
    }
  };

  const drawBusStops = (ctx: CanvasRenderingContext2D, state: GameState) => {
    const centerX = CANVAS_WIDTH / 2;
    const roadWidth = 300;
    const stopY = CANVAS_HEIGHT - (state.nextStopDistance - state.currentDistance) / 1;
    if (stopY > -100 && stopY < CANVAS_HEIGHT + 100) {
      // Platform
      ctx.fillStyle = '#a0aec0'; ctx.fillRect(centerX + roadWidth / 2, stopY, 70, 110);
      // Shelter
      ctx.fillStyle = '#2d3748'; ctx.fillRect(centerX + roadWidth / 2 + 10, stopY + 10, 50, 90);
      ctx.fillStyle = '#4a5568'; ctx.fillRect(centerX + roadWidth / 2 + 5, stopY + 5, 60, 5);
      // Sign
      ctx.fillStyle = '#1a202c'; ctx.fillRect(centerX + roadWidth / 2 + 15, stopY + 20, 30, 10);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 8px sans-serif';
      ctx.fillText("STATION", centerX + roadWidth / 2 + 17, stopY + 28);
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
    ctx.translate(centerX, busY + busL / 2);
    ctx.rotate((steeringAngle * Math.PI / 180) * 0.05);
    ctx.translate(-centerX, -(busY + busL / 2));

    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(centerX - busW / 2 + 8, busY + 8, busW, busL);
    ctx.fillStyle = selectedBus.color; ctx.fillRect(centerX - busW / 2, busY, busW, busL);
    ctx.fillStyle = '#a0aec0'; ctx.fillRect(centerX - busW / 2 + 5, busY + 8, busW - 10, 22);

    if (headlightsOn) {
      const grad = ctx.createLinearGradient(0, busY, 0, busY - 150);
      grad.addColorStop(0, 'rgba(255, 255, 200, 0.4)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.moveTo(centerX - busW / 2, busY); ctx.lineTo(centerX - busW, busY - 150); ctx.lineTo(centerX + busW, busY - 150); ctx.lineTo(centerX + busW / 2, busY); ctx.fill();
    }

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
