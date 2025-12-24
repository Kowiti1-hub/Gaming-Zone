
import React, { useRef, useEffect } from 'react';
import { GameState, TerrainType, RoadType, WeatherType, IndicatorType, GearType, CameraView } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';

const draw3DEnvironment = (ctx: CanvasRenderingContext2D, state: GameState, camX: number, camY: number, camZ: number) => {
  const { currentDistance, roadCurve, weather, terrain, road: roadType, cameraView, headlightsOn } = state;
  
  const horizonBase = CANVAS_HEIGHT * 0.45;
  let horizon = horizonBase;
  
  // Dynamic Horizon for specific views
  if (cameraView === CameraView.TOP) horizon = -1000; // Far out for top-down
  if (cameraView === CameraView.COCKPIT) horizon = CANVAS_HEIGHT * 0.4;
  if (cameraView === CameraView.FRONT) horizon = CANVAS_HEIGHT * 0.5;

  // Render Sky with depth
  const skyGrad = ctx.createLinearGradient(0, 0, 0, Math.max(0, horizon));
  if (weather === WeatherType.RAIN) { skyGrad.addColorStop(0, '#0f172a'); skyGrad.addColorStop(1, '#334155'); }
  else if (weather === WeatherType.FOG) { skyGrad.addColorStop(0, '#475569'); skyGrad.addColorStop(1, '#94a3b8'); }
  else { skyGrad.addColorStop(0, '#0c4a6e'); skyGrad.addColorStop(0.5, '#0ea5e9'); skyGrad.addColorStop(1, '#bae6fd'); }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, Math.max(0, horizon));

  const segments = 60;
  let curveAccumulator = 0;
  const baseColors = terrain === TerrainType.CITY ? ['#1e293b', '#0f172a'] : ['#3f6212', '#1a2e05'];

  for (let i = segments; i > 0; i--) {
    const z = i / segments;
    const nextZ = (i - 1) / segments;
    
    // Perspective projection
    const y = horizon + (1 / z) * (CANVAS_HEIGHT - horizon) * 0.04 * camZ;
    const nextY = horizon + (1 / nextZ) * (CANVAS_HEIGHT - horizon) * 0.04 * camZ;
    
    // Road width projection
    const roadWidth = 80 + (z * z * 1000) / (camZ * 0.8);
    const nextRoadWidth = 80 + (nextZ * nextZ * 1000) / (camZ * 0.8);
    
    curveAccumulator += roadCurve * (1 - z);
    
    // Camera Horizontal Offsets
    let xOffset = camX;
    if (cameraView === CameraView.LEFT) xOffset -= 400;
    if (cameraView === CameraView.RIGHT) xOffset += 400;

    const x = (CANVAS_WIDTH / 2) + (curveAccumulator * 500 * z) - (xOffset * z);
    const nextX = (CANVAS_WIDTH / 2) + ((curveAccumulator + roadCurve) * 500 * nextZ) - (xOffset * nextZ);

    const isAlt = Math.floor((currentDistance + (segments - i) * 40) / 40) % 2 === 0;

    // Terrain rendering
    ctx.fillStyle = isAlt ? baseColors[0] : baseColors[1];
    ctx.fillRect(0, y, CANVAS_WIDTH, Math.max(1, nextY - y + 1));

    // Road Base Geometry
    ctx.beginPath();
    ctx.moveTo(x - roadWidth / 2, y);
    ctx.lineTo(x + roadWidth / 2, y);
    ctx.lineTo(nextX + nextRoadWidth / 2, nextY);
    ctx.lineTo(nextX - nextRoadWidth / 2, nextY);

    ctx.fillStyle = roadType === RoadType.PAVED ? (isAlt ? '#334155' : '#1e293b') : (isAlt ? '#5c2d0b' : '#3d1e08');
    ctx.fill();

    // Reflections
    const wetness = weather === WeatherType.RAIN ? 0.4 : (weather === WeatherType.FOG ? 0.2 : 0.08);
    const skyRefColor = weather === WeatherType.RAIN ? '#94a3b8' : (weather === WeatherType.FOG ? '#cbd5e1' : '#bae6fd');
    ctx.globalAlpha = wetness;
    ctx.fillStyle = skyRefColor;
    ctx.fill();
    ctx.globalAlpha = 1.0;

    if (headlightsOn) {
      const headlightMaxSegments = 25;
      if (i < headlightMaxSegments) {
        const distFactor = 1 - (i / headlightMaxSegments);
        const lightIntensity = Math.pow(distFactor, 1.5) * 0.5;
        const lightGrad = ctx.createRadialGradient(x, y, 0, x, y, roadWidth * 0.8);
        lightGrad.addColorStop(0, `rgba(255, 255, 230, ${lightIntensity})`);
        lightGrad.addColorStop(0.6, `rgba(255, 255, 230, ${lightIntensity * 0.3})`);
        lightGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = lightGrad;
        ctx.fill();
      }
    }

    if (isAlt && roadType === RoadType.PAVED) {
      ctx.fillStyle = '#fde047';
      ctx.globalAlpha = 0.8;
      ctx.fillRect(x - 2 * z, y, 4 * z, nextY - y + 1);
      ctx.globalAlpha = 1.0;
    }
  }
};

const drawCockpit = (ctx: CanvasRenderingContext2D, state: GameState) => {
  const { steeringAngle, indicatorStatus, isEngineOn, fuel, gear } = state;
  const blink = Math.floor(Date.now() / 400) % 2 === 0;

  ctx.save();
  
  const dashY = CANVAS_HEIGHT - 220;
  const dashColor = '#0f172a';
  
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(120, 0); ctx.lineTo(60, dashY); ctx.lineTo(0, dashY); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(CANVAS_WIDTH, 0); ctx.lineTo(CANVAS_WIDTH - 120, 0); ctx.lineTo(CANVAS_WIDTH - 60, dashY); ctx.lineTo(CANVAS_WIDTH, dashY); ctx.fill();

  ctx.fillStyle = dashColor;
  ctx.beginPath();
  ctx.moveTo(0, dashY);
  ctx.quadraticCurveTo(CANVAS_WIDTH / 2, dashY - 40, CANVAS_WIDTH, dashY);
  ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.lineTo(0, CANVAS_HEIGHT);
  ctx.fill();

  const btnX = CANVAS_WIDTH * 0.75;
  const btnY = CANVAS_HEIGHT - 100;
  const btnRadius = 35;
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(btnX, btnY, btnRadius, 0, Math.PI * 2); ctx.stroke();
  const btnGrad = ctx.createRadialGradient(btnX, btnY, 0, btnX, btnY, btnRadius);
  if (isEngineOn) { btnGrad.addColorStop(0, '#ef4444'); btnGrad.addColorStop(1, '#991b1b'); }
  else { btnGrad.addColorStop(0, fuel > 0 ? '#10b981' : '#475569'); btnGrad.addColorStop(1, fuel > 0 ? '#065f46' : '#1e293b'); }
  ctx.fillStyle = btnGrad;
  ctx.beginPath(); ctx.arc(btnX, btnY, btnRadius - 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'white';
  ctx.font = 'bold 10px Inter';
  ctx.textAlign = 'center';
  ctx.fillText('ENGINE', btnX, btnY - 5);
  ctx.font = 'bold 12px Inter';
  ctx.fillText(isEngineOn ? 'STOP' : 'START', btnX, btnY + 10);

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(CANVAS_WIDTH * 0.55, CANVAS_HEIGHT - 130, 80, 100);
  ctx.strokeStyle = '#334155';
  ctx.strokeRect(CANVAS_WIDTH * 0.55, CANVAS_HEIGHT - 130, 80, 100);
  ctx.fillStyle = '#3b82f6';
  ctx.font = 'bold 30px Monospace';
  ctx.fillText(gear, CANVAS_WIDTH * 0.59, CANVAS_HEIGHT - 70);
  ctx.font = 'bold 10px Inter';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('GEAR', CANVAS_WIDTH * 0.59, CANVAS_HEIGHT - 40);

  ctx.fillStyle = isEngineOn ? '#10b981' : (fuel > 0 ? '#f59e0b' : '#ef4444');
  ctx.beginPath(); ctx.arc(btnX - 60, btnY, 6, 0, Math.PI * 2); ctx.fill();

  ctx.save();
  ctx.translate(CANVAS_WIDTH * 0.3, CANVAS_HEIGHT - 100);
  ctx.rotate(steeringAngle * 0.05);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 25;
  ctx.beginPath(); ctx.arc(0, 0, 110, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#1e293b';
  ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#334155';
  ctx.fillRect(-100, -10, 200, 20);
  ctx.fillRect(-10, -100, 20, 200);
  ctx.restore();

  if (indicatorStatus === IndicatorType.LEFT && blink) {
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.moveTo(CANVAS_WIDTH * 0.25, dashY + 40); ctx.lineTo(CANVAS_WIDTH * 0.25 - 20, dashY + 55); ctx.lineTo(CANVAS_WIDTH * 0.25, dashY + 70); ctx.fill();
  }
  if (indicatorStatus === IndicatorType.RIGHT && blink) {
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.moveTo(CANVAS_WIDTH * 0.35, dashY + 40); ctx.lineTo(CANVAS_WIDTH * 0.35 + 20, dashY + 55); ctx.lineTo(CANVAS_WIDTH * 0.35, dashY + 70); ctx.fill();
  }

  const mirW = 180, mirH = 60;
  const mirX = CANVAS_WIDTH / 2 - mirW / 2, mirY = 20;
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(mirX - 4, mirY - 4, mirW + 8, mirH + 8);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(mirX, mirY, mirW, mirH);
  ctx.fillStyle = '#334155';
  for(let i=0; i<5; i++) {
    ctx.beginPath(); ctx.arc(mirX + 30 + i * 30, mirY + 40, 10, 0, Math.PI * 2); ctx.fill();
  }

  ctx.restore();
};

const drawBus3D = (ctx: CanvasRenderingContext2D, state: GameState, camX: number, camY: number) => {
  const { selectedBus, steeringAngle, headlightsOn, cameraView, bodyRoll, suspensionY } = state;
  
  // These views don't draw the bus from the outside
  if (cameraView === CameraView.COCKPIT) return;

  ctx.save();

  let busX = 0;
  let busY = CANVAS_HEIGHT - 60;
  let scale = 1.0;
  let busRotation = bodyRoll;

  // Camera Mode Specific Logic
  switch (cameraView) {
    case CameraView.CHASE:
      busX = (steeringAngle * 5.0) - camX;
      busY = CANVAS_HEIGHT - 120 - camY;
      scale = 1.0;
      break;
    case CameraView.TOP:
      busX = (steeringAngle * 2.0) - (camX * 0.1);
      busY = CANVAS_HEIGHT - 200;
      scale = 0.5;
      break;
    case CameraView.LEFT:
      busX = (steeringAngle * 3.0) - camX + 250;
      busY = CANVAS_HEIGHT - 120;
      scale = 0.8;
      break;
    case CameraView.RIGHT:
      busX = (steeringAngle * 3.0) - camX - 250;
      busY = CANVAS_HEIGHT - 120;
      scale = 0.8;
      break;
    case CameraView.FRONT:
      // In front view, the bus itself is usually out of frame or very close at the bottom
      busX = (steeringAngle * 2.0) - camX;
      busY = CANVAS_HEIGHT + 50; 
      scale = 1.5;
      break;
    case CameraView.REAR_CLOSE:
      busX = (steeringAngle * 6.0) - camX;
      busY = CANVAS_HEIGHT - 60 - camY;
      scale = 1.2;
      break;
    case CameraView.REAR_DIST:
      busX = (steeringAngle * 4.0) - camX;
      busY = CANVAS_HEIGHT - 160 - camY;
      scale = 0.7;
      break;
  }

  let busW = 280 * scale, busH = 160 * scale;
  if (selectedBus.size === 'Medium') { busW *= 1.2; busH *= 1.1; }
  if (selectedBus.size === 'Large') { busW *= 1.4; busH *= 1.2; }

  ctx.translate(CANVAS_WIDTH / 2 + busX, busY + suspensionY);
  ctx.rotate(busRotation);

  // Body
  ctx.fillStyle = selectedBus.color;
  ctx.beginPath(); ctx.roundRect(-busW/2, -busH, busW, busH, 10); ctx.fill();
  
  // Windows
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.fillRect(-busW/2 + 5, -busH + 10, busW - 10, busH * 0.5);

  // Trim
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 2 * scale;
  ctx.strokeRect(-busW/2 + 5, -busH + 10, busW - 10, busH * 0.5);

  // Lights
  const lightColor = headlightsOn ? '#ffffff' : '#475569';
  ctx.fillStyle = lightColor;
  ctx.beginPath(); ctx.arc(-busW/2 + 40 * scale, -30 * scale, 18 * scale, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(busW/2 - 40 * scale, -30 * scale, 18 * scale, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
};

interface GameCanvasProps {
  state: GameState;
  onGearChange: (gear: GearType) => void;
  onHandbrakeToggle: () => void;
  onToggleEngine: () => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ state, onToggleEngine }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraX = useRef(0);
  const cameraY = useRef(0);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (state.cameraView !== CameraView.COCKPIT) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const btnX = CANVAS_WIDTH * 0.75;
    const btnY = CANVAS_HEIGHT - 100;
    const btnRadius = 35;
    const dist = Math.sqrt((x - btnX) ** 2 + (y - btnY) ** 2);
    if (dist < btnRadius) onToggleEngine();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const render = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      const targetX = state.steeringAngle * 6.0;
      cameraX.current += (targetX - cameraX.current) * 0.1;
      const targetY = (Math.abs(state.speed) / state.selectedBus.maxSpeed) * 40;
      cameraY.current += (targetY - cameraY.current) * 0.1;

      // camZ controls depth scaling
      let camZ = 1.0;
      switch(state.cameraView) {
        case CameraView.TOP: camZ = 5.0; break;
        case CameraView.REAR_DIST: camZ = 1.8; break;
        case CameraView.REAR_CLOSE: camZ = 0.8; break;
        case CameraView.COCKPIT: camZ = 0.7; break;
        case CameraView.FRONT: camZ = 0.5; break;
        case CameraView.LEFT:
        case CameraView.RIGHT: camZ = 1.2; break;
      }
      
      draw3DEnvironment(ctx, state, cameraX.current, cameraY.current, camZ);
      drawBus3D(ctx, state, cameraX.current, cameraY.current);
      if (state.cameraView === CameraView.COCKPIT) drawCockpit(ctx, state);
      
      requestAnimationFrame(render);
    };
    const animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [state]);

  return (
    <canvas 
      ref={canvasRef} 
      width={CANVAS_WIDTH} 
      height={CANVAS_HEIGHT} 
      onClick={handleCanvasClick}
      className={`rounded-3xl shadow-2xl border-8 border-slate-900 bg-black ${state.cameraView === CameraView.COCKPIT ? 'cursor-pointer' : 'cursor-none'}`} 
    />
  );
};

export default GameCanvas;
