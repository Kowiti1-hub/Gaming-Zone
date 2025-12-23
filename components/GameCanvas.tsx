
import React, { useRef, useEffect } from 'react';
import { GameState, TerrainType, RoadType, WeatherType, IndicatorType } from '../types';
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
      
      const horizon = CANVAS_HEIGHT * 0.45;
      
      draw3DEnvironment(ctx, state, horizon);
      drawWeatherEffects(ctx, state);
      
      animationFrameId = window.requestAnimationFrame(render);
    };

    render();
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [state]);

  const drawMirrorReflection = (
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    w: number, 
    h: number, 
    state: GameState,
    isLeft: boolean
  ) => {
    ctx.save();
    // Create a clipping region for the mirror
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 4);
    ctx.clip();

    // Mirror Background (Road Behind)
    const { terrain, road: roadType, currentDistance, roadCurve, steeringAngle } = state;
    const mirrorGround = terrain === TerrainType.CITY ? '#1a202c' : '#1c4532';
    ctx.fillStyle = mirrorGround;
    ctx.fillRect(x, y, w, h);

    const mirrorHorizon = y + h * 0.4;
    const segments = 15;
    
    // Parallax shift based on steering
    const steerShift = steeringAngle * 0.2 * (isLeft ? 1 : -1);

    for (let i = segments; i > 0; i--) {
      const z = i / segments;
      const segY = mirrorHorizon + (1 - z) * (h - (mirrorHorizon - y));
      const segH = (h / segments) * z;
      const segW = (w * 0.4) + (z * z * w * 0.6);
      
      const isAlt = Math.floor((currentDistance - i * 20) / 40) % 2 === 0;
      
      const centerX = x + w / 2 + steerShift;
      
      // Draw road segment in mirror
      ctx.fillStyle = roadType === RoadType.PAVED ? (isAlt ? '#2d3748' : '#1a202c') : (isAlt ? '#5c2d0b' : '#3d1e07');
      ctx.beginPath();
      ctx.moveTo(centerX - segW / 2, segY);
      ctx.lineTo(centerX + segW / 2, segY);
      ctx.lineTo(centerX + (segW + 5) / 2, segY + segH);
      ctx.lineTo(centerX - (segW + 5) / 2, segY + segH);
      ctx.fill();

      // Mirror center line
      if (roadType === RoadType.PAVED && isAlt) {
        ctx.fillStyle = '#f6e05e';
        ctx.fillRect(centerX - 1, segY, 2, segH);
      }
    }

    // Glass effect overlay
    const glassGrad = ctx.createLinearGradient(x, y, x + w, y + h);
    glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
    glassGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    glassGrad.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
    ctx.fillStyle = glassGrad;
    ctx.fillRect(x, y, w, h);

    // Vignette/Border inner shadow
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    ctx.restore();
  };

  const draw3DEnvironment = (ctx: CanvasRenderingContext2D, state: GameState, horizon: number) => {
    const { currentDistance, roadCurve, weather, terrain, road: roadType } = state;
    
    // 1. Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizon);
    if (weather === WeatherType.RAIN) {
      skyGrad.addColorStop(0, '#1a202c');
      skyGrad.addColorStop(1, '#2d3748');
    } else if (weather === WeatherType.FOG) {
      skyGrad.addColorStop(0, '#718096');
      skyGrad.addColorStop(1, '#a0aec0');
    } else {
      skyGrad.addColorStop(0, '#2b6cb0');
      skyGrad.addColorStop(1, '#bee3f8');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, horizon);

    // 2. Ground
    let groundColor = terrain === TerrainType.CITY ? '#171923' : (terrain === TerrainType.VILLAGE ? '#744210' : '#1c4532');
    ctx.fillStyle = groundColor;
    ctx.fillRect(0, horizon, CANVAS_WIDTH, CANVAS_HEIGHT - horizon);

    // 3. Road
    const segments = 60;
    let curveAccumulator = 0;

    for (let i = segments; i > 0; i--) {
      const z = i / segments;
      const nextZ = (i - 1) / segments;
      
      const y = horizon + (1 - z) * (CANVAS_HEIGHT - horizon);
      const nextY = horizon + (1 - nextZ) * (CANVAS_HEIGHT - horizon);
      
      const w = 40 + (z * z * 600);
      const nextW = 40 + (nextZ * nextZ * 600);

      curveAccumulator += roadCurve * (1 - z);
      const x = (CANVAS_WIDTH / 2) + curveAccumulator * 300 * z;
      const nextX = (CANVAS_WIDTH / 2) + (curveAccumulator + roadCurve * (1-nextZ)) * 300 * nextZ;

      const isAlt = Math.floor((currentDistance + (segments - i) * 20) / 40) % 2 === 0;
      
      ctx.fillStyle = isAlt ? groundColor : (terrain === TerrainType.CITY ? '#2d3748' : '#276749');
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.lineTo(CANVAS_WIDTH, nextY);
      ctx.lineTo(0, nextY);
      ctx.fill();

      ctx.fillStyle = roadType === RoadType.PAVED ? (isAlt ? '#2d3748' : '#1a202c') : (isAlt ? '#8b4513' : '#5c2d0b');
      ctx.beginPath();
      ctx.moveTo(x - w / 2, y);
      ctx.lineTo(x + w / 2, y);
      ctx.lineTo(nextX + nextW / 2, nextY);
      ctx.lineTo(nextX - nextW / 2, nextY);
      ctx.fill();

      if (roadType === RoadType.PAVED && isAlt) {
        ctx.fillStyle = '#f6e05e';
        ctx.fillRect(x - (1 * z), y, 2 * z, nextY - y + 1);
      }

      const stopDist = state.nextStopDistance - currentDistance;
      const zebraZ = 1 - (stopDist / 1000);
      if (Math.abs(z - zebraZ) < 0.02 && terrain === TerrainType.CITY) {
        ctx.fillStyle = '#fff';
        for (let s = -3; s <= 3; s++) {
          ctx.fillRect(x + (s * w / 8) - w / 20, y, w / 10, nextY - y + 2);
        }
      }

      if (terrain === TerrainType.CITY) {
        const lightDist = Math.round(currentDistance / TRAFFIC_LIGHT_DISTANCE) * TRAFFIC_LIGHT_DISTANCE;
        const relativeLightDist = lightDist - currentDistance;
        const lightZ = 1 - (relativeLightDist / 1000);
        if (Math.abs(z - lightZ) < 0.01) {
          const cycleTime = (Date.now() + lightDist / 500) % TRAFFIC_LIGHT_CYCLE;
          const isRed = cycleTime < 6000;
          ctx.fillStyle = '#1a202c';
          ctx.fillRect(x - w / 2 - 20 * z, y - 120 * z, 6 * z, 120 * z);
          ctx.fillStyle = isRed ? '#f56565' : '#48bb78';
          ctx.beginPath(); ctx.arc(x - w / 2 - 17 * z, y - 110 * z, 6 * z, 0, Math.PI * 2); ctx.fill();
        }
      }

      if (i % 6 === 0) {
        const side = (seed(i + Math.floor(currentDistance/1000)) % 2 === 0) ? 1 : -1;
        draw3DProp(ctx, x + (w/2 + 40*z) * side, y, z, terrain, seed(i));
      }

      if (Math.abs(z - zebraZ) < 0.02) {
        drawPassengers(ctx, x + (w/2 + 15*z), y, z, state.isFull);
      }
    }

    draw3DBus(ctx, state);
  };

  const seed = (s: number) => Math.abs(Math.sin(s) * 10000);

  const draw3DProp = (ctx: CanvasRenderingContext2D, x: number, y: number, z: number, terrain: TerrainType, s: number) => {
    const scale = z * 2.5;
    ctx.save();
    if (terrain === TerrainType.CITY) {
      const h = (120 + (s % 300)) * scale;
      const w = (50 + (s % 60)) * scale;
      ctx.fillStyle = '#2d3748';
      ctx.fillRect(x - w/2, y - h, w, h);
      ctx.fillStyle = '#f6e05e'; ctx.globalAlpha = 0.3;
      ctx.fillRect(x - w/4, y - h + 10*scale, w/2, h - 20*scale);
    } else {
      if (s % 3 === 0) {
        ctx.fillStyle = '#4a2c10'; ctx.fillRect(x - 3*scale, y - 25*scale, 6*scale, 25*scale);
        ctx.fillStyle = '#22543d'; ctx.beginPath(); ctx.arc(x, y - 40*scale, 25*scale, 0, Math.PI*2); ctx.fill();
      } else if (s % 3 === 1) {
        ctx.fillStyle = '#744210'; ctx.beginPath(); ctx.roundRect(x - 20*scale, y - 35*scale, 40*scale, 35*scale, 8*scale); ctx.fill();
        ctx.fillStyle = '#975a16'; ctx.beginPath(); ctx.moveTo(x - 28*scale, y - 30*scale); ctx.lineTo(x, y - 55*scale); ctx.lineTo(x + 28*scale, y - 30*scale); ctx.fill();
      } else {
         ctx.fillStyle = '#2d3748'; ctx.fillRect(x - 10*scale, y - 40*scale, 20*scale, 40*scale);
         ctx.fillStyle = '#81e6d9'; ctx.globalAlpha = 0.4; ctx.fillRect(x - 5*scale, y - 35*scale, 10*scale, 10*scale);
      }
    }
    ctx.restore();
  };

  const drawPassengers = (ctx: CanvasRenderingContext2D, x: number, y: number, z: number, isFull: boolean) => {
    const scale = z * 2.5;
    for (let i = 0; i < 3; i++) {
      const px = x + (i * 12 * scale);
      const py = y - (2 * scale);
      ctx.fillStyle = isFull ? '#4a5568' : '#ed8936';
      ctx.beginPath(); ctx.arc(px, py - 18 * scale, 5 * scale, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(px - 4 * scale, py - 15 * scale, 8 * scale, 15 * scale);
    }
  };

  const draw3DBus = (ctx: CanvasRenderingContext2D, state: GameState) => {
    const { selectedBus, steeringAngle, headlightsOn, indicatorStatus } = state;
    const centerX = CANVAS_WIDTH / 2;
    const busY = CANVAS_HEIGHT - 30;
    
    let busW = 280;
    let busH = 160;
    if (selectedBus.size === 'Medium') { busW = 340; busH = 190; }
    if (selectedBus.size === 'Large') { busW = 400; busH = 220; }

    ctx.save();
    ctx.translate(centerX + steeringAngle * 2.5, busY);
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(0, 10, busW/2, 25, 0, 0, Math.PI*2); ctx.fill();

    // Body
    ctx.fillStyle = selectedBus.color;
    ctx.beginPath();
    ctx.roundRect(-busW/2, -busH, busW, busH, 20);
    ctx.fill();

    // Side Mirrors Stems
    ctx.fillStyle = '#1a202c';
    ctx.fillRect(-busW/2 - 15, -busH + 40, 15, 5); 
    ctx.fillRect(busW/2, -busH + 40, 15, 5);

    // Render Reflections in Mirrors
    drawMirrorReflection(ctx, -busW/2 - 35, -busH + 20, 20, 40, state, true);
    drawMirrorReflection(ctx, busW/2 + 15, -busH + 20, 20, 40, state, false);

    // Windshield
    const windshieldGrad = ctx.createLinearGradient(0, -busH, 0, -busH/2);
    windshieldGrad.addColorStop(0, 'rgba(160, 174, 192, 0.4)');
    windshieldGrad.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
    ctx.fillStyle = windshieldGrad;
    ctx.fillRect(-busW/2 + 15, -busH + 15, busW - 30, busH/1.5);
    
    // Headlights
    const blink = Math.floor(Date.now() / 400) % 2 === 0;
    const lightColor = headlightsOn ? '#fff' : '#f6e05e';
    ctx.fillStyle = lightColor;
    if (headlightsOn) { ctx.shadowBlur = 40; ctx.shadowColor = '#fff'; }
    ctx.beginPath(); ctx.arc(-busW/2 + 50, -40, 25, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(busW/2 - 50, -40, 25, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    // Indicators
    if (indicatorStatus === IndicatorType.LEFT && blink) {
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath(); ctx.arc(-busW/2 + 20, -busH + 30, 15, 0, Math.PI*2); ctx.fill();
    }
    if (indicatorStatus === IndicatorType.RIGHT && blink) {
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath(); ctx.arc(busW/2 - 20, -busH + 30, 15, 0, Math.PI*2); ctx.fill();
    }

    if (state.isFull) {
      ctx.fillStyle = '#e53e3e';
      ctx.fillRect(-60, -busH + 20, 120, 25);
      ctx.fillStyle = '#fff';
      ctx.font = 'black 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText("BUS FULL", 0, -busH + 38);
    }

    ctx.restore();
  };

  const drawWeatherEffects = (ctx: CanvasRenderingContext2D, state: GameState) => {
    const { weather } = state;
    if (weather === WeatherType.RAIN) {
      ctx.save();
      ctx.strokeStyle = 'rgba(174, 194, 224, 0.3)';
      ctx.lineWidth = 1.5;
      rainParticles.current.forEach(p => {
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 2, p.y + p.length); ctx.stroke();
        p.y += p.speed; if (p.y > CANVAS_HEIGHT) p.y = -p.length;
      });
      ctx.restore();
    }
  };

  return (
    <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="rounded-2xl shadow-[0_0_100px_rgba(0,0,0,0.8)] border-8 border-slate-900 bg-slate-950" />
  );
};

export default GameCanvas;
