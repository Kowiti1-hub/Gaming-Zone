
import React, { useRef, useEffect, useState } from 'react';
import { GameState, TerrainType, RoadType, WeatherType, IndicatorType, GearType } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, TRAFFIC_LIGHT_DISTANCE, TRAFFIC_LIGHT_CYCLE } from '../constants';

// Helper functions for seeding and procedural generation
const seed = (s: number) => Math.abs(Math.sin(s) * 10000);

const drawTrafficLight = (ctx: CanvasRenderingContext2D, x: number, y: number, z: number, lightIdx: number) => {
  const scale = z * 2.5;
  const cycleTime = (Date.now() + lightIdx * 5000) % TRAFFIC_LIGHT_CYCLE;
  
  let activeBulb = 2; // 0: Red, 1: Yellow, 2: Green
  if (cycleTime < 6000) activeBulb = 0;
  else if (cycleTime < 8000) activeBulb = 1;

  ctx.save();
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(x - 2 * scale, y - 90 * scale, 4 * scale, 90 * scale);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(x - 8 * scale, y - 95 * scale, 16 * scale, 40 * scale);
  
  const drawBulb = (bulbIdx: number, color: string, isActive: boolean) => {
    const bulbY = y - 95 * scale + (bulbIdx * 11 * scale) + 9 * scale;
    ctx.fillStyle = isActive ? color : '#000';
    if (isActive) {
      ctx.shadowBlur = 20 * scale;
      ctx.shadowColor = color;
    }
    ctx.beginPath();
    ctx.arc(x, bulbY, 4 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  };

  drawBulb(0, '#ef4444', activeBulb === 0);
  drawBulb(1, '#f59e0b', activeBulb === 1);
  drawBulb(2, '#10b981', activeBulb === 2);
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

const STREET_NAMES = ["MAIN ST", "GEMINI AVE", "OAK RD", "FLASH WAY", "PALM BLVD", "RURAL LN", "SUMMIT DR"];

const draw3DProp = (ctx: CanvasRenderingContext2D, x: number, y: number, z: number, terrain: TerrainType, s: number, weather: WeatherType) => {
  const scale = z * 2.5;
  ctx.save();
  if (weather === WeatherType.FOG) ctx.globalAlpha = Math.max(0, z * 2 - 0.5);

  if (terrain === TerrainType.CITY) {
    const type = Math.floor(s) % 16;
    if (type < 3) {
      const colors = ['#2d3748', '#1a202c', '#4a5568'];
      const h = (140 + (s % 400)) * scale;
      const w = (70 + (s % 100)) * scale;
      ctx.fillStyle = colors[type];
      ctx.fillRect(x - w/2, y - h, w, h);
      ctx.fillStyle = '#f6e05e';
      const oldAlpha = ctx.globalAlpha;
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 3; col++) {
          if ((s + row * 10 + col) % 5 > 2) {
             ctx.globalAlpha = oldAlpha * 0.4;
             ctx.fillRect(x - w/3 + (col * w/4), y - h + (row * h/8) + 12*scale, w/8, h/12);
          }
        }
      }
      ctx.globalAlpha = oldAlpha;
    } 
    else if (type === 3) {
      const h = 100 * scale;
      ctx.fillStyle = '#2d3748';
      ctx.fillRect(x - 3 * scale, y - h, 6 * scale, h);
      ctx.fillRect(x - 3 * scale, y - h, 25 * scale, 4 * scale);
      const bulbX = x + 22 * scale;
      const bulbY = y - h + 2 * scale;
      const lampGlow = ctx.createRadialGradient(bulbX, bulbY, 0, bulbX, bulbY, 30 * scale);
      lampGlow.addColorStop(0, 'rgba(254, 252, 191, 0.4)');
      lampGlow.addColorStop(1, 'rgba(254, 252, 191, 0)');
      ctx.fillStyle = lampGlow;
      ctx.beginPath(); ctx.arc(bulbX, bulbY, 30 * scale, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff9c4';
      ctx.beginPath(); ctx.arc(bulbX, bulbY, 5 * scale, 0, Math.PI * 2); ctx.fill();
    } 
    else if (type === 4) {
      const h = 75 * scale;
      ctx.fillStyle = '#718096';
      ctx.fillRect(x - 2 * scale, y - h, 4 * scale, h);
      const signRadius = 14 * scale;
      const signY = y - h - signRadius;
      const signType = Math.floor(s) % 8;
      
      if (signType === 0) {
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#e53e3e'; ctx.lineWidth = 3 * scale;
        ctx.beginPath(); ctx.arc(x, signY, signRadius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#000'; ctx.font = `bold ${Math.round(11 * scale)}px sans-serif`; ctx.textAlign = 'center';
        ctx.fillText("60", x, signY + 4 * scale);
      } else if (signType === 1) {
        ctx.fillStyle = '#e53e3e'; ctx.beginPath();
        for(let a=0; a<8; a++) {
          const angle = (a * Math.PI) / 4 + Math.PI/8;
          const px = x + Math.cos(angle) * signRadius;
          const py = signY + Math.sin(angle) * signRadius;
          if(a===0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(6 * scale)}px sans-serif`; ctx.textAlign = 'center';
        ctx.fillText("STOP", x, signY + 3 * scale);
      } else if (signType === 6) {
        const sw = 45 * scale;
        const sh = 12 * scale;
        ctx.fillStyle = '#22543d'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1 * scale;
        ctx.fillRect(x - sw/2, signY - sh/2, sw, sh);
        ctx.strokeRect(x - sw/2, signY - sh/2, sw, sh);
        ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(5 * scale)}px sans-serif`; ctx.textAlign = 'center';
        ctx.fillText(STREET_NAMES[Math.floor(s) % STREET_NAMES.length], x, signY + 2 * scale);
      } else {
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1 * scale;
        ctx.fillRect(x - signRadius, signY - signRadius, signRadius * 2, signRadius * 2);
        ctx.strokeRect(x - signRadius, signY - signRadius, signRadius * 2, signRadius * 2);
        ctx.fillStyle = '#000'; ctx.font = `bold ${Math.round(8 * scale)}px sans-serif`; ctx.textAlign = 'center';
        ctx.fillText("ZONE", x, signY - 1 * scale);
        ctx.fillText("40", x, signY + 8 * scale);
      }
    } 
    else {
      const bw = 45 * scale;
      const bh = 15 * scale;
      ctx.fillStyle = '#2d3748';
      ctx.fillRect(x - bw/2.5, y - bh, 3 * scale, bh);
      ctx.fillRect(x + bw/2.5 - 3 * scale, y - bh, 3 * scale, bh);
      ctx.fillStyle = '#2d3748';
      ctx.fillRect(x - bw/2, y - bh, bw, 4 * scale);
      ctx.fillRect(x - bw/2, y - bh - 12 * scale, bw, 5 * scale);
    }
  } else {
    const type = Math.floor(s) % 10;
    if (type === 0 || type === 1) {
      ctx.fillStyle = '#4a2c10'; 
      ctx.fillRect(x - 3*scale, y - 25*scale, 6*scale, 25*scale);
      ctx.fillStyle = '#22543d'; 
      ctx.beginPath(); ctx.arc(x, y - 45*scale, 30*scale, 0, Math.PI*2); ctx.fill();
    } else if (type === 2) {
      ctx.fillStyle = '#8b4513'; 
      ctx.fillRect(x - 22*scale, y - 32*scale, 44*scale, 32*scale);
      ctx.fillStyle = '#3e2723';
      ctx.fillRect(x - 6*scale, y - 20*scale, 12*scale, 20*scale);
      ctx.fillStyle = '#d69e2e'; 
      ctx.beginPath(); ctx.moveTo(x - 28*scale, y - 32*scale); ctx.lineTo(x, y - 60*scale); ctx.lineTo(x + 28*scale, y - 32*scale); ctx.fill();
    } else {
      const fw = 60 * scale;
      const fh = 20 * scale;
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(x - fw/2, y - fh, 3*scale, fh);
      ctx.fillRect(x, y - fh, 3*scale, fh);
      ctx.fillRect(x + fw/2 - 3*scale, y - fh, 3*scale, fh);
    }
  }
  ctx.restore();
};

const SHIFTER_X = CANVAS_WIDTH - 150;
const SHIFTER_Y = CANVAS_HEIGHT - 60;
const SHIFTER_RADIUS = 50;
const HANDBRAKE_X = 120;
const HANDBRAKE_Y = CANVAS_HEIGHT - 50;

const GEAR_POSITIONS: Record<GearType, {dx: number, dy: number}> = {
  [GearType.PARK]: { dx: -18, dy: -28 },
  [GearType.REVERSE]: { dx: -18, dy: 18 },
  [GearType.NEUTRAL]: { dx: 18, dy: -28 },
  [GearType.DRIVE]: { dx: 18, dy: 18 }
};

interface GameCanvasProps {
  state: GameState;
  onGearChange: (gear: GearType) => void;
  onHandbrakeToggle: () => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ state, onGearChange, onHandbrakeToggle }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rainParticles = useRef<{ x: number, y: number, speed: number, length: number }[]>([]);
  const [isDraggingShifter, setIsDraggingShifter] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Camera State
  const cameraX = useRef(0);
  const cameraY = useRef(0);

  useEffect(() => {
    rainParticles.current = Array.from({ length: 1000 }, () => ({
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * CANVAS_HEIGHT,
      speed: 10 + Math.random() * 10,
      length: 8 + Math.random() * 10
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
      
      // Update Camera Position - Follow Bus with smoothing
      const targetBusWorldX = state.steeringAngle * 5.0; // The bus's lateral position in "world space"
      cameraX.current += (targetBusWorldX - cameraX.current) * 0.08; // Smooth camera follow
      
      // Depth Lag - Bus moves up as it goes faster
      const speedShift = (Math.abs(state.speed) / state.selectedBus.maxSpeed) * 35;
      cameraY.current += (speedShift - cameraY.current) * 0.1;

      const horizon = CANVAS_HEIGHT * 0.45;
      
      ctx.save();
      // Horizon tilt based on road curvature
      const tilt = state.roadCurve * 1.5;
      ctx.translate(CANVAS_WIDTH/2, horizon);
      ctx.rotate(tilt);
      ctx.translate(-CANVAS_WIDTH/2, -horizon);

      // Camera shake at high speeds
      if (Math.abs(state.speed) > 70) {
        const shake = (Math.abs(state.speed) - 70) / 10;
        ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      }

      draw3DEnvironment(ctx, state, horizon, cameraX.current);
      drawHeadlightBeams(ctx, state, cameraX.current);
      drawWeatherEffects(ctx, state);
      draw3DBus(ctx, state, cameraX.current, cameraY.current);
      ctx.restore();

      drawSideMirrors(ctx, state);
      drawWindshieldEffects(ctx, state, cameraX.current, cameraY.current);
      drawBusInterior(ctx, state, isDraggingShifter, dragOffset);
      
      animationFrameId = window.requestAnimationFrame(render);
    };

    render();
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [state, isDraggingShifter, dragOffset]);

  const draw3DEnvironment = (ctx: CanvasRenderingContext2D, state: GameState, horizon: number, camX: number) => {
    const { currentDistance, roadCurve, weather, terrain, road: roadType } = state;
    
    // Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizon);
    if (weather === WeatherType.RAIN) { skyGrad.addColorStop(0, '#1a202c'); skyGrad.addColorStop(1, '#4a5568'); }
    else if (weather === WeatherType.FOG) { skyGrad.addColorStop(0, '#718096'); skyGrad.addColorStop(1, '#cbd5e0'); }
    else { skyGrad.addColorStop(0, '#2b6cb0'); skyGrad.addColorStop(1, '#bee3f8'); }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(-CANVAS_WIDTH, -CANVAS_HEIGHT, CANVAS_WIDTH * 3, horizon + CANVAS_HEIGHT);

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
      
      // Rendering relative to camera position
      const x = (CANVAS_WIDTH / 2) + (curveAccumulator * 300 * z) - (camX * z);
      const nextX = (CANVAS_WIDTH / 2) + ((curveAccumulator + roadCurve * (1-nextZ)) * 300 * nextZ) - (camX * nextZ);
      
      const segWorldDist = currentDistance + (segments - i) * 20;
      const isAlt = Math.floor(segWorldDist / 40) % 2 === 0;
      
      // Ground
      ctx.fillStyle = isAlt ? groundBaseColor : (terrain === TerrainType.CITY ? '#2d3748' : '#276749');
      ctx.beginPath(); ctx.moveTo(-CANVAS_WIDTH, y); ctx.lineTo(CANVAS_WIDTH * 2, y); ctx.lineTo(CANVAS_WIDTH * 2, nextY); ctx.lineTo(-CANVAS_WIDTH, nextY); ctx.fill();
      
      // Road
      ctx.fillStyle = roadType === RoadType.PAVED ? (isAlt ? '#2d3748' : '#1a202c') : (isAlt ? '#8b4513' : '#5c2d0b');
      ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x + w / 2, y); ctx.lineTo(nextX + nextW / 2, nextY); ctx.lineTo(nextX - nextW / 2, nextY); ctx.fill();
      
      if (roadType === RoadType.PAVED && isAlt) { 
        ctx.fillStyle = '#f6e05e'; ctx.fillRect(x - (1 * z), y, 2 * z, nextY - y + 1); 
      }
      
      if (fogColor) { 
        ctx.fillStyle = fogColor; ctx.globalAlpha = Math.pow(1 - z, 3); 
        ctx.fillRect(-CANVAS_WIDTH, y, CANVAS_WIDTH * 3, nextY - y + 1); 
        ctx.globalAlpha = 1.0; 
      }
      
      if (terrain === TerrainType.CITY) {
        const lightIdx = Math.round(segWorldDist / TRAFFIC_LIGHT_DISTANCE);
        if (Math.abs(segWorldDist - (lightIdx * TRAFFIC_LIGHT_DISTANCE)) < 10) drawTrafficLight(ctx, x + w/2 + 30 * z, y, z, lightIdx);
      }
      
      if (i % (terrain === TerrainType.CITY ? 4 : 6) === 0) {
        const side = (seed(i + Math.floor(currentDistance/1000)) % 2 === 0) ? 1 : -1;
        draw3DProp(ctx, x + (w/2 + 50*z) * side, y, z, terrain, seed(i), weather);
      }
      
      if (Math.abs(z - (1 - (state.nextStopDistance - currentDistance) / 1000)) < 0.02) {
        drawPassengers(ctx, x + (w/2 + 15*z), y, z, state.isFull);
      }
    }
  };

  const draw3DBus = (ctx: CanvasRenderingContext2D, state: GameState, camX: number, camY: number) => {
    const { selectedBus, steeringAngle, headlightsOn, indicatorStatus, bodyRoll, bodyPitch, suspensionY } = state;
    
    // The Bus's visual position is its World X minus the Camera's X
    const busVisualX = (steeringAngle * 5.0) - camX;
    // Bus moves up (Y decreases) as depth lag increases
    const busY = CANVAS_HEIGHT - 30 - camY;
    
    let busW = 280, busH = 160;
    if (selectedBus.size === 'Medium') { busW = 340; busH = 190; }
    if (selectedBus.size === 'Large') { busW = 400; busH = 220; }
    
    ctx.save();
    ctx.translate(CANVAS_WIDTH / 2 + busVisualX, busY + suspensionY);
    ctx.rotate(bodyRoll);
    ctx.transform(1, 0, bodyPitch * 0.5, 1, 0, 0);

    // Shadow
    ctx.save();
    ctx.translate(0, -suspensionY); 
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(0, 10, busW/2, 25, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    // Body
    ctx.fillStyle = selectedBus.color;
    ctx.beginPath(); ctx.roundRect(-busW/2, -busH, busW, busH, 20); ctx.fill();
    
    // Windshield
    ctx.fillStyle = '#1a202c'; ctx.fillRect(-busW/2 + 10, -busH + 10, busW - 20, busH/1.4);
    
    const blink = Math.floor(Date.now() / 400) % 2 === 0;
    const lightColor = headlightsOn ? '#fff' : '#f6e05e';
    
    // Headlights
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

  const drawHeadlightBeams = (ctx: CanvasRenderingContext2D, state: GameState, camX: number) => {
    if (!state.headlightsOn) return;
    const { selectedBus, steeringAngle, weather } = state;
    const busVisualX = (steeringAngle * 5.0) - camX;
    const busY = CANVAS_HEIGHT - 30;
    let busW = 280;
    if (selectedBus.size === 'Medium') busW = 340;
    if (selectedBus.size === 'Large') busW = 400;
    const beamLength = weather === WeatherType.FOG ? 150 : 350;
    const beamWidth = weather === WeatherType.FOG ? 250 : 200;
    
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const drawBeam = (startX: number) => {
      const grad = ctx.createLinearGradient(startX, busY - 40, startX, busY - 40 - beamLength);
      const alpha = weather === WeatherType.FOG ? 0.6 : 0.4;
      grad.addColorStop(0, "rgba(255, 255, 255, " + alpha + ")");
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(startX - 20, busY - 40);
      ctx.lineTo(startX - beamWidth, busY - 40 - beamLength);
      ctx.lineTo(startX + beamWidth, busY - 40 - beamLength);
      ctx.lineTo(startX + 20, busY - 40);
      ctx.fill();
    };
    drawBeam(CANVAS_WIDTH / 2 + busVisualX - busW/2 + 50);
    drawBeam(CANVAS_WIDTH / 2 + busVisualX + busW/2 - 50);
    ctx.restore();
  };

  const drawWindshieldEffects = (ctx: CanvasRenderingContext2D, state: GameState, camX: number, camY: number) => {
    const { weather, wipersActive, selectedBus, steeringAngle, rainIntensity, suspensionY } = state;
    if (weather !== WeatherType.RAIN && weather !== WeatherType.FOG) return;
    const busVisualX = (steeringAngle * 5.0) - camX;
    const busY = CANVAS_HEIGHT - 30 + suspensionY - camY;
    let busW = 280, busH = 160;
    if (selectedBus.size === 'Medium') { busW = 340; busH = 190; }
    if (selectedBus.size === 'Large') { busW = 400; busH = 220; }
    const glassX = (CANVAS_WIDTH / 2 + busVisualX) - busW/2 + 15, glassY = busY - busH + 15, glassW = busW - 30, glassH = busH/1.5;
    
    ctx.save();
    if (weather === WeatherType.FOG) { 
      ctx.fillStyle = 'rgba(203, 213, 224, 0.15)'; 
      ctx.fillRect(glassX, glassY, glassW, glassH); 
    } else if (weather === WeatherType.RAIN) {
      ctx.fillStyle = `rgba(174, 194, 224, ${rainIntensity * 0.1})`;
      ctx.fillRect(glassX, glassY, glassW, glassH);
    }
    if (wipersActive) {
      const wiperSpeed = 300 - (rainIntensity * 100);
      const wiperAngle = Math.sin(Date.now() / wiperSpeed) * 1.2;
      ctx.strokeStyle = '#2d3748'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      const drawWiper = (pivotX: number) => {
        ctx.beginPath(); ctx.moveTo(pivotX, glassY + glassH);
        ctx.lineTo(pivotX + Math.sin(wiperAngle) * glassH * 0.9, glassY + glassH - Math.cos(wiperAngle) * glassH * 0.9);
        ctx.stroke();
      };
      drawWiper(glassX + glassW * 0.25); drawWiper(glassX + glassW * 0.75);
    }
    ctx.restore();
  };

  const drawSideMirrors = (ctx: CanvasRenderingContext2D, state: GameState) => {
    const mirrorW = 100;
    const mirrorH = 180;
    const padding = 20;
    drawMirror(ctx, state, padding, CANVAS_HEIGHT / 3, mirrorW, mirrorH, true);
    drawMirror(ctx, state, CANVAS_WIDTH - mirrorW - padding, CANVAS_HEIGHT / 3, mirrorW, mirrorH, false);
  };

  const drawMirror = (ctx: CanvasRenderingContext2D, state: GameState, x: number, y: number, w: number, h: number, isLeft: boolean) => {
    ctx.save();
    ctx.fillStyle = '#1a202c';
    ctx.beginPath(); ctx.roundRect(x - 4, y - 4, w + 8, h + 8, 15); ctx.fill();
    ctx.strokeStyle = '#4a5568'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.clip();

    const mirrorHorizon = h * 0.4;
    ctx.fillStyle = state.weather === WeatherType.RAIN ? '#1a202c' : '#2b6cb0';
    ctx.fillRect(x, y, w, h);

    const segments = 15;
    let curveAccumulator = 0;
    const roadBaseColor = state.terrain === TerrainType.CITY ? '#171923' : '#1c4532';

    for (let i = 0; i < segments; i++) {
      const z = 1 - (i / segments);
      const ry = y + mirrorHorizon + (1 - z) * (h - mirrorHorizon);
      const rw = 20 + (z * z * 150);
      curveAccumulator -= state.roadCurve * (1 - z);
      const steerShift = state.steeringAngle * 0.5 * (isLeft ? 1 : -1);
      const rx = x + (w / 2) + (curveAccumulator * 100 * z) + steerShift;
      const isAlt = Math.floor((state.currentDistance - i * 40) / 40) % 2 === 0;
      ctx.fillStyle = isAlt ? roadBaseColor : '#2d3748';
      ctx.fillRect(x, ry, w, 15);
      ctx.fillStyle = state.road === RoadType.PAVED ? '#1a202c' : '#5c2d0b';
      ctx.fillRect(rx - rw/2, ry, rw, 15);
    }
    ctx.restore();
  };

  const drawBusInterior = (ctx: CanvasRenderingContext2D, state: GameState, isDraggingShifter: boolean, dragOffset: { x: number, y: number }) => {
    ctx.save();
    const dashHeight = 120;
    ctx.fillStyle = '#1a202c';
    ctx.beginPath(); ctx.moveTo(0, CANVAS_HEIGHT); ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - dashHeight);
    ctx.quadraticCurveTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT - dashHeight - 40, 0, CANVAS_HEIGHT - dashHeight);
    ctx.closePath(); ctx.fill();

    // Shifter Base
    ctx.fillStyle = '#2d3748';
    ctx.beginPath(); ctx.ellipse(SHIFTER_X, SHIFTER_Y, SHIFTER_RADIUS, 35, 0, 0, Math.PI * 2); ctx.fill();
    
    const snappedPos = GEAR_POSITIONS[state.gear];
    const leverX = isDraggingShifter ? dragOffset.x : snappedPos.dx;
    const leverY = isDraggingShifter ? dragOffset.y : snappedPos.dy;
    
    ctx.strokeStyle = '#718096'; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(SHIFTER_X, SHIFTER_Y); ctx.lineTo(SHIFTER_X + leverX, SHIFTER_Y + leverY); ctx.stroke();
    ctx.fillStyle = '#1a202c'; ctx.beginPath(); ctx.arc(SHIFTER_X + leverX, SHIFTER_Y + leverY, 15, 0, Math.PI * 2); ctx.fill();
    
    // Handbrake
    const brakeAngle = state.handbrakeActive ? -Math.PI / 4 : 0;
    ctx.save();
    ctx.translate(HANDBRAKE_X, HANDBRAKE_Y); ctx.rotate(brakeAngle);
    ctx.fillStyle = '#2d3748'; ctx.fillRect(-6, -40, 12, 45);
    ctx.restore();
    
    ctx.restore();
  };

  const drawWeatherEffects = (ctx: CanvasRenderingContext2D, state: GameState) => {
    if (state.weather === WeatherType.RAIN) {
      const { rainIntensity } = state;
      ctx.save(); 
      ctx.strokeStyle = `rgba(174, 194, 224, ${0.1 + rainIntensity * 0.4})`;
      ctx.lineWidth = 1 + rainIntensity * 1.5;
      const particleCount = Math.floor(rainParticles.current.length * rainIntensity);
      for (let i = 0; i < particleCount; i++) {
        const p = rainParticles.current[i];
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 1, p.y + p.length); ctx.stroke();
        p.y += p.speed; if (p.y > CANVAS_HEIGHT) p.y = -p.length;
      }
      ctx.restore();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const distShifter = Math.sqrt(Math.pow(x - SHIFTER_X, 2) + Math.pow(y - SHIFTER_Y, 2));
    if (distShifter < SHIFTER_RADIUS) {
      setIsDraggingShifter(true); setDragOffset({ x: x - SHIFTER_X, y: y - SHIFTER_Y });
      return;
    }
    if (x > HANDBRAKE_X - 25 && x < HANDBRAKE_X + 25 && y > HANDBRAKE_Y - 60 && y < HANDBRAKE_Y + 10) onHandbrakeToggle();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingShifter) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const dx = x - SHIFTER_X, dy = y - SHIFTER_Y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const scale = dist > SHIFTER_RADIUS ? SHIFTER_RADIUS / dist : 1;
    const boundedDx = dx * scale, boundedDy = dy * scale;
    setDragOffset({ x: boundedDx, y: boundedDy });
    let newGear: GearType = state.gear;
    if (boundedDx < -10) { if (boundedDy < -10) newGear = GearType.PARK; else if (boundedDy > 10) newGear = GearType.REVERSE; }
    else if (boundedDx > 10) { if (boundedDy < -10) newGear = GearType.NEUTRAL; else if (boundedDy > 10) newGear = GearType.DRIVE; }
    if (newGear !== state.gear) onGearChange(newGear);
  };

  return (
    <canvas 
      ref={canvasRef} 
      width={CANVAS_WIDTH} 
      height={CANVAS_HEIGHT} 
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={() => setIsDraggingShifter(false)}
      onMouseLeave={() => setIsDraggingShifter(false)}
      className="rounded-2xl shadow-[0_0_100px_rgba(0,0,0,0.8)] border-8 border-slate-900 bg-slate-950 cursor-crosshair" 
    />
  );
};

export default GameCanvas;
