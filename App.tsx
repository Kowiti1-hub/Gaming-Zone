
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Menu from './components/Menu';
import GameCanvas from './components/GameCanvas';
import HUD from './components/HUD';
import { 
  GameState, Driver, Bus, TerrainType, RoadType, WeatherType, IndicatorType, GearType, TransmissionType, CameraView 
} from './types';
import { BUSES, DRIVERS, SPEED_LIMITS } from './constants';
import { audioService } from './services/audioService';

const INITIAL_STATE: GameState = {
  currentDistance: 0,
  speed: 0,
  passengers: 0,
  money: 500,
  isStopped: false,
  currentStopId: null,
  selectedBus: BUSES[0],
  selectedDriver: DRIVERS[0],
  gameStatus: 'MENU',
  terrain: TerrainType.CITY,
  road: RoadType.PAVED,
  weather: WeatherType.CLEAR,
  rainIntensity: 0.5,
  lastStopDistance: 0,
  nextStopDistance: 1500,
  headlightsOn: false,
  wipersActive: false,
  steeringAngle: 0,
  indicatorStatus: IndicatorType.OFF,
  rearViewActive: false,
  gear: GearType.PARK,
  transmission: TransmissionType.AUTOMATIC,
  cameraView: CameraView.CHASE,
  handbrakeActive: true,
  roadCurve: 0,
  currentCurve: 0,
  totalViolations: 0,
  isFull: false,
  bodyRoll: 0,
  bodyPitch: 0,
  suspensionY: 0,
  rpm: 800
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [showMenu, setShowMenu] = useState(true);
  const stateRef = useRef(gameState);
  stateRef.current = gameState;
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current[key] = true;

      // View Cycle
      if (key === 'v') {
        setGameState(prev => {
          const views = Object.values(CameraView);
          const next = views[(views.indexOf(prev.cameraView) + 1) % views.length];
          return { ...prev, cameraView: next };
        });
      }

      // Manual Gear Selection
      if (stateRef.current.transmission === TransmissionType.MANUAL) {
        if (key === '1') setGameState(p => ({ ...p, gear: GearType.G1 }));
        if (key === '2') setGameState(p => ({ ...p, gear: GearType.G2 }));
        if (key === '3') setGameState(p => ({ ...p, gear: GearType.G3 }));
        if (key === '4') setGameState(p => ({ ...p, gear: GearType.G4 }));
        if (key === '5') setGameState(p => ({ ...p, gear: GearType.G5 }));
        if (key === '0') setGameState(p => ({ ...p, gear: GearType.NEUTRAL }));
        if (key === 'r') setGameState(p => ({ ...p, gear: GearType.REVERSE }));
      }

      // Transmission Toggle
      if (key === 'm') {
        setGameState(prev => ({
          ...prev,
          transmission: prev.transmission === TransmissionType.AUTOMATIC ? TransmissionType.MANUAL : TransmissionType.AUTOMATIC,
          gear: GearType.PARK
        }));
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (gameState.gameStatus !== 'DRIVING') return;

    const interval = setInterval(() => {
      const s = stateRef.current;
      const isAccelerating = keysPressed.current['w'] || keysPressed.current['arrowup'];
      const isBraking = keysPressed.current['s'] || keysPressed.current['arrowdown'];

      setGameState(prev => {
        if (prev.isStopped) return prev;

        // Gear Check for Movement
        const isForward = prev.gear === GearType.DRIVE || [GearType.G1, GearType.G2, GearType.G3, GearType.G4, GearType.G5].includes(prev.gear);
        const isReverse = prev.gear === GearType.REVERSE;
        const canMove = !prev.handbrakeActive && (isForward || isReverse);

        let accel = 0;
        let newSpeed = prev.speed;
        let newRpm = prev.rpm;

        if (isAccelerating && canMove) {
          const direction = isReverse ? -1 : 1;
          accel = prev.selectedBus.acceleration * direction;
          
          // Gear Ratios for Manual
          if (prev.transmission === TransmissionType.MANUAL) {
            const gearLimits: any = { [GearType.G1]: 20, [GearType.G2]: 45, [GearType.G3]: 70, [GearType.G4]: 95, [GearType.G5]: 130 };
            const limit = gearLimits[prev.gear] || 0;
            if (Math.abs(newSpeed) > limit) accel = 0;
            newRpm = 800 + (Math.abs(newSpeed) % 25) * 150;
          }

          newSpeed += accel;
        } else {
          newSpeed *= 0.98;
          newRpm = Math.max(800, newRpm * 0.95);
        }

        const distInc = Math.abs(newSpeed) * 0.15;
        const newDistance = prev.currentDistance + distInc;

        // Camera Auto-switching for Reverse
        let autoView = prev.cameraView;
        if (isReverse && prev.cameraView === CameraView.CHASE) autoView = CameraView.FRONT;
        if (!isReverse && prev.cameraView === CameraView.FRONT) autoView = CameraView.CHASE;

        return {
          ...prev,
          speed: newSpeed,
          currentDistance: newDistance,
          rpm: newRpm,
          cameraView: autoView,
          steeringAngle: keysPressed.current['a'] ? Math.max(-45, prev.steeringAngle - 2) : (keysPressed.current['d'] ? Math.min(45, prev.steeringAngle + 2) : prev.steeringAngle * 0.9)
        };
      });
    }, 16);

    return () => clearInterval(interval);
  }, [gameState.gameStatus]);

  return (
    <div className="w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden">
      {showMenu && <Menu onStart={(d, b) => { setShowMenu(false); setGameState(p => ({ ...p, selectedDriver: d, selectedBus: b, gameStatus: 'DRIVING' })); }} />}
      <GameCanvas state={gameState} onGearChange={() => {}} onHandbrakeToggle={() => {}} />
      {!showMenu && <HUD state={gameState} narration="" onToggleLights={() => {}} onToggleWipers={() => {}} onToggleRearView={() => {}} onOpenDoors={() => {}} onRadioCheck={() => {}} onSetRainIntensity={() => {}} onAIEdit={() => {}} isAiProcessing={false} aiResult={null} onCloseAIResult={() => {}} />}
    </div>
  );
};

export default App;
