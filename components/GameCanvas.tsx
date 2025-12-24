
import React, { useRef, useEffect } from 'react';
import { GameState, TerrainType, RoadType, WeatherType, IndicatorType, GearType, CameraView } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, TRAFFIC_LIGHT_DISTANCE, TRAFFIC_LIGHT_CYCLE } from '../constants';

const seed = (s: number) => Math.abs(Math.sin(s) * 10000);

const draw3DEnvironment = (ctx: CanvasRenderingContext2D, state: GameState, camX: number, camY: number, camZ: number) => {
  const { currentDistance, roadCurve, weather, terrain, road: roadType, cameraView } = state;
  
  const horizonBase = CANVAS_HEIGHT * 0.45;
  // Shift horizon based on camera view
  let horizon = horizonBase;
  if (cameraView === CameraView.TOP) horizon = -200;
  if (cameraView === CameraView.FRONT) horizon = CANVAS_HEIGHT * 0.3;

  // Sky - Photographic gradients
  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizon);
  if (weather === WeatherType.RAIN) { skyGrad.addColorStop(0, '#0f172a'); skyGrad.addColorStop(1, '#334155'); }
  else if (weather === WeatherType.FOG) { skyGrad.addColorStop(0, '#475569'); skyGrad.addColorStop(1, '#94a3b8'); }
  else { skyGrad.addColorStop(0, '#0c4a6e'); skyGrad.addColorStop(0.6, '#0ea5e9'); skyGrad.addColorStop(1, '#bae6fd'); }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, horizon);

  // Photorealistic terrain colors
  const landColors = {
    [TerrainType.CITY]: ['#1e293b', '#0f172a'],
    [TerrainType.SUBURBAN]: ['#3f6212', '#1a2e05'],
    [TerrainType.VILLAGE]: ['#451a03', '#78350f']
  };
  const baseColors = landColors[terrain];

  const segments = 50;
  let curveAccumulator = 0;

  for (let i = segments; i > 0; i--) {
    const z = i / segments;
    const nextZ = (i - 1) / segments;
    
    // Perspective calculation influenced by camZ
    const y = horizon + (1 / z) * (CANVAS_HEIGHT - horizon) * 0.05 * camZ;
    const nextY = horizon + (1 / nextZ) * (CANVAS_HEIGHT - horizon) * 0.05 * camZ;
    
    const roadWidth = 60 + (z * z * 800);
    const nextRoadWidth = 60 + (nextZ * nextZ * 800);
    
    curveAccumulator += roadCurve * (1 - z);
    
    // Camera Projection Matrix
    let camOffset = camX * z;
    if (cameraView === CameraView.LEFT) camOffset -= 300 * z;
    if (cameraView === CameraView.RIGHT) camOffset += 300 * z;

    const x = (CANVAS_WIDTH / 2) + (curveAccumulator * 400 * z) - camOffset;
    const nextX = (CANVAS_WIDTH / 2) + ((curveAccumulator + roadCurve) * 400 * nextZ) - (camX * nextZ);

    const worldDist = currentDistance + (segments - i) * 30;
    const isAlt = Math.floor(worldDist / 50) % 2 === 0;

    // Ground Rendering (Simulated Photography)
    ctx.fillStyle = isAlt ? baseColors[0] : baseColors[1];
    ctx.fillRect(0, y, CANVAS_WIDTH, nextY - y + 1);

    // Road Rendering
    ctx.fillStyle = roadType === RoadType.PAVED ? (isAlt ? '#334155' : '#1e293b') : (isAlt ? '#78350f' : '#451a03');
    ctx.beginPath();
    ctx.moveTo(x - roadWidth/2, y); ctx.lineTo(x + roadWidth/2, y);
    ctx.lineTo(nextX + nextRoadWidth/2, nextY); ctx.lineTo(nextX - nextRoadWidth/2, nextY);
    ctx.fill();

    // Road markings
    if (isAlt && roadType === RoadType.PAVED) {
      ctx.fillStyle = '#fde047';
      ctx.fillRect(x - 2*z, y, 4*z, nextY - y + 1);
    }
  }
};

const drawBus3D = (ctx: CanvasRenderingContext2D, state: GameState, camX: number, camY: number) => {
  const { selectedBus, steeringAngle, headlightsOn, cameraView, bodyRoll, suspensionY } = state;
  
  // Calculate Bus Visual position based on Camera View
  let busX = (steeringAngle * 5.0) - camX;
  let busY = CANVAS_HEIGHT - 40 - camY;
  let scale = 1.0;

  if (cameraView === CameraView.TOP) { busY = CANVAS_HEIGHT * 0.8; scale = 0.5; }
  if (cameraView === CameraView.REAR_DIST) { busY = CANVAS_HEIGHT - 120; scale = 0.7; }
  if (cameraView === CameraView.FRONT) return; // Dashboard cam sees no bus

  let busW = 280 * scale, busH = 160 * scale;
  if (selectedBus.size === 'Medium') { busW *= 1.2; busH *= 1.1; }
  if (selectedBus.size === 'Large') { busW *= 1.4; busH *= 1.2; }

  ctx.save();
  ctx.translate(CANVAS_WIDTH/2 + busX, busY + suspensionY);
  ctx.rotate(bodyRoll);

  // Chassis
  ctx.fillStyle = selectedBus.color;
  ctx.beginPath(); ctx.roundRect(-busW/2, -busH, busW, busH, 15); ctx.fill();
  
  // Glass
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-busW/2 + 10*scale, -busH + 10*scale, busW - 20*scale, busH * 0.6);

  // Lights
  const lightColor = headlightsOn ? '#fff' : '#475569';
  ctx.fillStyle = lightColor;
  ctx.beginPath(); ctx.arc(-busW/2 + 40*scale, -30*scale, 20*scale, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(busW/2 - 40*scale, -30*scale, 20*scale, 0, Math.PI*2); ctx.fill();

  ctx.restore();
};

interface GameCanvasProps {
  state: GameState;
  onGearChange: (gear: GearType) => void;
  onHandbrakeToggle: () => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ state, onGearChange, onHandbrakeToggle }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraX = useRef(0);
  const cameraY = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Update Camera Tracking
      const targetX = state.steeringAngle * 6.0;
      cameraX.current += (targetX - cameraX.current) * 0.1;
      
      const targetY = (Math.abs(state.speed) / state.selectedBus.maxSpeed) * 50;
      cameraY.current += (targetY - cameraY.current) * 0.1;

      // Draw World
      let camZ = 1.0;
      if (state.cameraView === CameraView.REAR_DIST) camZ = 1.5;
      if (state.cameraView === CameraView.TOP) camZ = 3.0;
      
      draw3DEnvironment(ctx, state, cameraX.current, cameraY.current, camZ);
      drawBus3D(ctx, state, cameraX.current, cameraY.current);
      
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
      className="rounded-3xl shadow-2xl border-8 border-slate-900 bg-black cursor-none" 
    />
  );
};

export default GameCanvas;
