
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
    rainParticles.current = Array.from({ length: 250 }, () => ({
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * CANVAS_HEIGHT,
      speed: 15 + Math.random() * 10,
      length: 12 + Math.random() * 12
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
      
      // Main Scene
      draw3DEnvironment(ctx, state, horizon, false);
      drawHeadlightBeams(ctx, state);
      drawWeatherEffects(ctx, state);
      draw3DBus(ctx, state);
      
      // Mirrors (Realistic Reflections)
      drawSideMirrors(ctx, state);
      
      drawWindshieldEffects(ctx, state);
      
      animationFrameId = window.requestAnimationFrame(render);
    };

    render();
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [state]);

  const drawSideMirrors = (ctx: CanvasRenderingContext2D, state: GameState) => {
    const mirrorW = 100;
    const mirrorH = 180;
    const padding = 20;

    // Left Mirror
    drawMirror(ctx, state, padding, CANVAS_HEIGHT / 3, mirrorW, mirrorH, true);
    // Right Mirror
    drawMirror(ctx, state, CANVAS_WIDTH - mirrorW - padding, CANVAS_HEIGHT / 3, mirrorW, mirrorH, false);
  };

  const drawMirror = (ctx: CanvasRenderingContext2D, state: GameState, x: number, y: number, w: number, h: number, isLeft: boolean) => {
    ctx.save();
    
    // Draw Bezel
    ctx.fillStyle = '#1a202c';
    ctx.beginPath();
    ctx.roundRect(x - 4, y - 4, w + 8, h + 8, 15);
    ctx.fill();
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Clipping for reflection
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.clip();

    // Render inverted environment
    const mirrorHorizon = h * 0.4;
    
    // Background (Sky)
    const skyGrad = ctx.createLinearGradient(x, y, x, y + mirrorHorizon);
    if (state.weather === WeatherType.RAIN) {
      skyGrad.addColorStop(0, '#1a202c'); skyGrad.addColorStop(1, '#4a5568');
    } else {
      skyGrad.addColorStop(0, '#2b6cb0'); skyGrad.addColorStop(1, '#bee3f8');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(x, y, w, h);

    // Render rear road segments
    const segments = 15;
    let curveAccumulator = 0;
    const roadBaseColor = state.terrain === TerrainType.CITY ? '#171923' : '#1c4532';

    for (let i = 0; i < segments; i++) {
      const z = 1 - (i / segments);
      const nextZ = 1 - ((i + 1) / segments);
      
      const ry = y + mirrorHorizon + (1 - z) * (h - mirrorHorizon);
      const nextRy = y + mirrorHorizon + (1 - nextZ) * (h - mirrorHorizon);
      
      const rw = 20 + (z * z * 150);
      const nextRw = 20 + (nextZ * nextZ * 150);

      // We use the negative curve to look "back"
      curveAccumulator -= state.roadCurve * (1 - z);
      // Flipped steering impact for mirror
      const steerShift = state.steeringAngle * 0.5 * (isLeft ? 1 : -1);
      const rx = x + (w / 2) + (curveAccumulator * 100 * z) + steerShift;
      const nextRx = x + (w / 2) + ((curveAccumulator - state.roadCurve * (1 - nextZ)) * 100 * nextZ) + steerShift;

      const isAlt = Math.floor((state.currentDistance - i * 40) / 40) % 2 === 0;

      // Ground
      ctx.fillStyle = isAlt ? roadBaseColor : '#2d3748';
      ctx.fillRect(x, ry, w, nextRy - ry + 1);

      // Road
      ctx.fillStyle = state.road === RoadType.PAVED ? (isAlt ? '#2d3748' : '#111') : '#5c2d0b';
      ctx.beginPath();
      ctx.moveTo(rx - rw / 2, ry); ctx.lineTo(rx + rw / 2, ry);
      ctx.lineTo(nextRx + nextRw / 2, nextRy); ctx.lineTo(nextRx - nextRw / 2, nextRy);
      ctx.fill();

      // Mirror-specific vignette / dirt
      ctx.fillStyle = 'rgba(0,0,0,0.02)';
      ctx.fillRect(x, ry, w, nextRy - ry + 1);
    }

    // Glass sheen
    const glassGrad = ctx.createLinearGradient(x, y, x + w, y + h);
    glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    glassGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    glassGrad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
    ctx.fillStyle = glassGrad;
    ctx.fillRect(x, y, w, h);

    // Rear bus corner visible in mirror?
    ctx.fillStyle = state.selectedBus.color;
    const busEdgeX = isLeft ? x : x + w - 15;
    ctx.fillRect(busEdgeX, y + h * 0.4, 15, h * 0.6);

    ctx.restore();
  };

  const drawHeadlightBeams = (ctx: CanvasRenderingContext2D, state: GameState) => {
    if (!state.headlightsOn) return;

    const { selectedBus, steeringAngle, weather } = state;
    const centerX = CANVAS_WIDTH / 2 + steeringAngle * 2.5;
    const busY = CANVAS_HEIGHT - 30;
    
    let busW = 280;
    if (selectedBus.size === 'Small') busW = 280;
    if (selectedBus.size === 'Medium') busW = 340;
    if (selectedBus.size === 'Large') busW = 400;

    const beamLength = weather === WeatherType.FOG ? 150 : 350;
    const beamWidth = weather === WeatherType.FOG ? 250 : 200;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const drawBeam = (startX: number) => {
      const grad = ctx.createLinearGradient(startX, busY - 40, startX, busY - 40 - beamLength);
      const alpha = weather === WeatherType.FOG ? 0.6 : 0.4;
      grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
      grad.addColorStop(0.6, 'rgba(255, 255, 255, 0.1)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(startX - 20, busY - 40);
      ctx.lineTo(startX - beamWidth, busY - 40 - beamLength);
      ctx.lineTo(startX + beamWidth, busY - 40 - beamLength);
      ctx.lineTo(startX + 20, busY - 40);
      ctx.closePath();
      ctx.fill();
    };

    drawBeam(centerX - busW/2 + 50);
    drawBeam(centerX + busW/2 - 50);
    ctx.restore();
  };

  const draw3DEnvironment = (ctx: CanvasRenderingContext2D, state: GameState, horizon: number, isMirror: boolean) => {
    const { currentDistance, roadCurve, weather, terrain, road: roadType } = state;
    
    if (!isMirror) {
      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizon);
      if (weather === WeatherType.RAIN) {
        skyGrad.addColorStop(0, '#1a202c'); skyGrad.addColorStop(1, '#4a5568');
      } else if (weather === WeatherType.FOG) {
        skyGrad.addColorStop(0, '#718096'); skyGrad.addColorStop(1, '#cbd5e0');
      } else {
        skyGrad.addColorStop(0, '#2b6cb0'); skyGrad.addColorStop(1, '#bee3f8');
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, horizon);

      if (weather === WeatherType.CLEAR) {
        const sunGrad = ctx.createRadialGradient(CANVAS_WIDTH * 0.8, horizon * 0.3, 10, CANVAS_WIDTH * 0.8, horizon * 0.3, 150);
        sunGrad.addColorStop(0, 'rgba(255, 255, 200, 0.3)');
        sunGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = sunGrad;
        ctx.fillRect(0, 0, CANVAS_WIDTH, horizon);
      }
    }

    let groundBaseColor = terrain === TerrainType.CITY ? '#171923' : (terrain === TerrainType.VILLAGE ? '#744210' : '#1c4532');
    if (weather === WeatherType.RAIN) groundBaseColor = '#0d0d12';

    const segments = 60;
    let curveAccumulator = 0;
    const fogColor = weather === WeatherType.FOG ? '#cbd5e0' : (weather === WeatherType.RAIN ? '#4a5568' : null);

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
      
      ctx.fillStyle = isAlt ? groundBaseColor : (terrain === TerrainType.CITY ? '#2d3748' : '#276749');
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.lineTo(CANVAS_WIDTH, nextY); ctx.lineTo(0, nextY);
      ctx.fill();

      ctx.fillStyle = roadType === RoadType.PAVED ? (isAlt ? '#2d3748' : '#1a202c') : (isAlt ? '#8b4513' : '#5c2d0b');
      ctx.beginPath();
      ctx.moveTo(x - w / 2, y); ctx.lineTo(x + w / 2, y); ctx.lineTo(nextX + nextW / 2, nextY); ctx.lineTo(nextX - nextW / 2, nextY);
      ctx.fill();

      if (roadType === RoadType.PAVED && isAlt) {
        ctx.fillStyle = '#f6e05e';
        ctx.fillRect(x - (1 * z), y, 2 * z, nextY - y + 1);
      }

      if (fogColor) {
        const fogIntensity = Math.pow(1 - z, 3);
        ctx.fillStyle = fogColor;
        ctx.globalAlpha = fogIntensity;
        ctx.fillRect(0, y, CANVAS_WIDTH, nextY - y + 1);
        ctx.globalAlpha = 1.0;
      }

      const propInterval = terrain === TerrainType.CITY ? 4 : 6;
      if (i % propInterval === 0) {
        const side = (seed(i + Math.floor(currentDistance/1000)) % 2 === 0) ? 1 : -1;
        draw3DProp(ctx, x + (w/2 + 50*z) * side, y, z, terrain, seed(i), weather);
      }

      const stopDist = state.nextStopDistance - currentDistance;
      const zebraZ = 1 - (stopDist / 1000);
      if (Math.abs(z - zebraZ) < 0.02) {
        drawPassengers(ctx, x + (w/2 + 15*z), y, z, state.isFull);
      }
    }
  };

  const seed = (s: number) => Math.abs(Math.sin(s) * 10000);

  const draw3DProp = (ctx: CanvasRenderingContext2D, x: number, y: number, z: number, terrain: TerrainType, s: number, weather: WeatherType) => {
    const scale = z * 2.5;
    ctx.save();
    if (weather === WeatherType.FOG) ctx.globalAlpha = Math.max(0, z * 2 - 0.5);

    if (terrain === TerrainType.CITY) {
      const type = s % 6;
      if (type < 3) { // Enhanced Buildings
        const h = (120 + (s % 300)) * scale;
        const w = (60 + (s % 80)) * scale;
        ctx.fillStyle = '#2d3748';
        ctx.fillRect(x - w/2, y - h, w, h);
        // Windows
        ctx.fillStyle = '#f6e05e';
        const oldAlpha = ctx.globalAlpha;
        ctx.globalAlpha *= 0.3;
        for (let row = 0; row < 5; row++) {
          for (let col = 0; col < 2; col++) {
            ctx.fillRect(x - w/4 + (col * w/2.5) - w/10, y - h + (row * h/6) + 10*scale, w/6, h/10);
          }
        }
        ctx.globalAlpha = oldAlpha;
      } else if (type === 3) { // Enhanced Street Lamp
        const h = 90 * scale;
        ctx.fillStyle = '#4a5568';
        ctx.fillRect(x - 2 * scale, y - h, 4 * scale, h); // post
        ctx.fillRect(x - 2 * scale, y - h, 20 * scale, 3 * scale); // arm
        
        // Glow and bulb
        const bulbX = x + 18 * scale;
        const bulbY = y - h + 2 * scale;
        const lampGlow = ctx.createRadialGradient(bulbX, bulbY, 0, bulbX, bulbY, 25 * scale);
        lampGlow.addColorStop(0, 'rgba(254, 252, 191, 0.5)');
        lampGlow.addColorStop(1, 'rgba(254, 252, 191, 0)');
        ctx.fillStyle = lampGlow;
        ctx.beginPath(); ctx.arc(bulbX, bulbY, 25 * scale, 0, Math.PI * 2); ctx.fill();
        
        ctx.fillStyle = '#fff9c4';
        ctx.beginPath(); ctx.arc(bulbX, bulbY, 4 * scale, 0, Math.PI * 2); ctx.fill();
      } else if (type === 4) { // Enhanced Traffic Signs
        const h = 60 * scale;
        ctx.fillStyle = '#718096';
        ctx.fillRect(x - 1.5 * scale, y - h, 3 * scale, h); // post
        const signRadius = 12 * scale;
        
        if (s % 2 === 0) { // Speed Limit
          ctx.fillStyle = '#fff';
          ctx.strokeStyle = '#e53e3e';
          ctx.lineWidth = 2 * scale;
          ctx.beginPath(); ctx.arc(x, y - h - signRadius, signRadius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#000';
          ctx.font = `bold ${10 * scale}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText("50", x, y - h - signRadius + 4 * scale);
        } else { // STOP Sign
          ctx.fillStyle = '#e53e3e';
          ctx.beginPath();
          for(let a=0; a<8; a++) {
            const angle = (a * Math.PI) / 4 + Math.PI/8;
            const px = x + Math.cos(angle) * signRadius;
            const py = (y - h - signRadius) + Math.sin(angle) * signRadius;
            if(a===0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = `bold ${6 * scale}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText("STOP", x, y - h - signRadius + 2.5 * scale);
        }
      } else { // Enhanced Bus Shelter
        const sw = 50 * scale;
        const sh = 40 * scale;
        ctx.fillStyle = '#2d3748';
        ctx.fillRect(x - sw/2, y - sh, sw, 3 * scale); // roof
        ctx.fillRect(x - sw/2, y - sh, 3 * scale, sh); // side L
        ctx.fillRect(x + sw/2 - 3 * scale, y - sh, 3 * scale, sh); // side R
        // Glass back
        ctx.fillStyle = 'rgba(160, 174, 192, 0.4)';
        ctx.fillRect(x - sw/2 + 3 * scale, y - sh + 3 * scale, sw - 6 * scale, sh - 3 * scale);
        // Bench
        ctx.fillStyle = '#4a5568';
        ctx.fillRect(x - sw/3, y - 12 * scale, (sw*2)/3, 3 * scale);
      }
    } else { // Enhanced Village Buildings (Mixed types)
      const type = s % 5;
      if (type === 0 || type === 1) { // Trees
        ctx.fillStyle = '#4a2c10'; ctx.fillRect(x - 3*scale, y - 25*scale, 6*scale, 25*scale);
        ctx.fillStyle = '#22543d'; ctx.beginPath(); ctx.arc(x, y - 45*scale, 30*scale, 0, Math.PI*2); ctx.fill();
      } else if (type === 2) { // Traditional Thatched House
        ctx.fillStyle = '#8b4513'; // mud/wood walls
        ctx.fillRect(x - 20*scale, y - 30*scale, 40*scale, 30*scale);
        ctx.fillStyle = '#d69e2e'; // thatched roof
        ctx.beginPath();
        ctx.moveTo(x - 25*scale, y - 30*scale);
        ctx.lineTo(x, y - 55*scale);
        ctx.lineTo(x + 25*scale, y - 30*scale);
        ctx.fill();
      } else if (type === 3) { // Semi-permanent building (Corrugated)
        ctx.fillStyle = '#4a5568'; // grey walls
        ctx.fillRect(x - 20*scale, y - 35*scale, 40*scale, 35*scale);
        ctx.fillStyle = '#718096'; // metallic roof
        ctx.beginPath();
        ctx.moveTo(x - 22*scale, y - 35*scale);
        ctx.lineTo(x + 22*scale, y - 42*scale);
        ctx.lineTo(x + 22*scale, y - 35*scale);
        ctx.fill();
      } else { // Permanent brick building
         ctx.fillStyle = '#9b2c2c'; // brick red
         ctx.fillRect(x - 15*scale, y - 45*scale, 30*scale, 45*scale);
         ctx.fillStyle = '#81e6d9'; // small windows
         const oldAlpha = ctx.globalAlpha;
         ctx.globalAlpha *= 0.6;
         ctx.fillRect(x - 8*scale, y - 35*scale, 6*scale, 6*scale);
         ctx.fillRect(x + 2*scale, y - 35*scale, 6*scale, 6*scale);
         ctx.globalAlpha = oldAlpha;
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
    if (selectedBus.size === 'Small') { busW = 280; busH = 160; }
    if (selectedBus.size === 'Medium') { busW = 340; busH = 190; }
    if (selectedBus.size === 'Large') { busW = 400; busH = 220; }

    ctx.save();
    ctx.translate(centerX + steeringAngle * 2.5, busY);
    
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(0, 10, busW/2, 25, 0, 0, Math.PI*2); ctx.fill();

    ctx.fillStyle = selectedBus.color;
    ctx.beginPath(); ctx.roundRect(-busW/2, -busH, busW, busH, 20); ctx.fill();

    ctx.fillStyle = '#1a202c';
    ctx.fillRect(-busW/2 + 10, -busH + 10, busW - 20, busH/1.4);

    const windshieldGrad = ctx.createLinearGradient(0, -busH, 0, -busH/2);
    windshieldGrad.addColorStop(0, 'rgba(160, 174, 192, 0.1)');
    windshieldGrad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
    ctx.fillStyle = windshieldGrad;
    ctx.fillRect(-busW/2 + 15, -busH + 15, busW - 30, busH/1.5);
    
    const blink = Math.floor(Date.now() / 400) % 2 === 0;
    const lightColor = headlightsOn ? '#fff' : '#f6e05e';
    ctx.fillStyle = lightColor;
    ctx.beginPath(); ctx.arc(-busW/2 + 50, -40, 25, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(busW/2 - 50, -40, 25, 0, Math.PI*2); ctx.fill();

    if (indicatorStatus === IndicatorType.LEFT && blink) {
      ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(-busW/2 + 20, -busH + 30, 15, 0, Math.PI*2); ctx.fill();
    }
    if (indicatorStatus === IndicatorType.RIGHT && blink) {
      ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(busW/2 - 20, -busH + 30, 15, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  };

  const drawWeatherEffects = (ctx: CanvasRenderingContext2D, state: GameState) => {
    const { weather } = state;
    if (weather === WeatherType.RAIN) {
      ctx.save();
      ctx.strokeStyle = 'rgba(174, 194, 224, 0.4)';
      rainParticles.current.forEach(p => {
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 1, p.y + p.length); ctx.stroke();
        p.y += p.speed; if (p.y > CANVAS_HEIGHT) p.y = -p.length;
      });
      ctx.restore();
    }
  };

  const drawWindshieldEffects = (ctx: CanvasRenderingContext2D, state: GameState) => {
    const { weather, wipersActive, selectedBus, steeringAngle } = state;
    if (weather !== WeatherType.RAIN && weather !== WeatherType.FOG) return;

    const centerX = CANVAS_WIDTH / 2 + steeringAngle * 2.5;
    const busY = CANVAS_HEIGHT - 30;
    let busW = 280;
    let busH = 160;
    if (selectedBus.size === 'Small') { busW = 280; busH = 160; }
    if (selectedBus.size === 'Medium') { busW = 340; busH = 190; }
    if (selectedBus.size === 'Large') { busW = 400; busH = 220; }

    const glassX = centerX - busW/2 + 15;
    const glassY = busY - busH + 15;
    const glassW = busW - 30;
    const glassH = busH/1.5;

    ctx.save();
    if (weather === WeatherType.FOG) {
      ctx.fillStyle = 'rgba(203, 213, 224, 0.15)';
      ctx.fillRect(glassX, glassY, glassW, glassH);
    }
    if (weather === WeatherType.RAIN && !wipersActive) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      for (let i = 0; i < 40; i++) {
        const rx = glassX + Math.random() * glassW;
        const ry = glassY + Math.random() * glassH;
        ctx.beginPath(); ctx.arc(rx, ry, 2 + Math.random()*5, 0, Math.PI*2); ctx.fill();
      }
    }
    if (wipersActive) {
      const wiperAngle = Math.sin(Date.now() / 300) * 1.2;
      ctx.strokeStyle = '#2d3748'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      const drawWiper = (pivotX: number) => {
        ctx.beginPath(); ctx.moveTo(pivotX, glassY + glassH);
        ctx.lineTo(pivotX + Math.sin(wiperAngle) * glassH * 0.9, glassY + glassH - Math.cos(wiperAngle) * glassH * 0.9);
        ctx.stroke();
      };
      drawWiper(glassX + glassW * 0.25);
      drawWiper(glassX + glassW * 0.75);
    }
    ctx.restore();
  };

  return (
    <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="rounded-2xl shadow-[0_0_100px_rgba(0,0,0,0.8)] border-8 border-slate-900 bg-slate-950" />
  );
};

export default GameCanvas;
