
import React, { useState, useEffect, useRef } from 'react';
import Menu from './components/Menu';
import GameCanvas from './components/GameCanvas';
import HUD from './components/HUD';
import Dashboard from './components/Dashboard';
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
  cameraView: CameraView.COCKPIT,
  handbrakeActive: true,
  roadCurve: 0,
  currentCurve: 0,
  totalViolations: 0,
  isFull: false,
  bodyRoll: 0,
  bodyPitch: 0,
  suspensionY: 0,
  rpm: 0,
  radioStation: 'POP HITS',
  isRadioOn: false,
  isEngineOn: false,
  fuel: 100
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

      // Manual Gear Shifting (1-5)
      if (['1', '2', '3', '4', '5'].includes(key)) {
        const gearMap: Record<string, GearType> = {
          '1': GearType.G1, '2': GearType.G2, '3': GearType.G3, '4': GearType.G4, '5': GearType.G5
        };
        setGameState(prev => ({
          ...prev,
          transmission: TransmissionType.MANUAL,
          gear: gearMap[key]
        }));
      }

      // Drive / Auto
      if (key === 'd') {
        setGameState(prev => ({
          ...prev,
          transmission: TransmissionType.AUTOMATIC,
          gear: GearType.DRIVE
        }));
      }

      // Neutral
      if (key === 'n') {
        setGameState(prev => ({ ...prev, gear: GearType.NEUTRAL }));
      }

      // Reverse (using Z as R is radio)
      if (key === 'z') {
        setGameState(prev => ({ ...prev, gear: GearType.REVERSE }));
      }

      if (key === 'v') {
        setGameState(prev => {
          const views = Object.values(CameraView);
          const next = views[(views.indexOf(prev.cameraView) + 1) % views.length];
          return { ...prev, cameraView: next };
        });
      }

      if (key === 'm') {
        setGameState(prev => ({
          ...prev,
          transmission: prev.transmission === TransmissionType.AUTOMATIC ? TransmissionType.MANUAL : TransmissionType.AUTOMATIC,
          gear: prev.transmission === TransmissionType.AUTOMATIC ? GearType.G1 : GearType.DRIVE
        }));
      }

      if (key === 'l') toggleLights();
      if (key === 'p') toggleHandbrake();
      if (key === 'b') toggleDoors();
      if (key === 'r') toggleRadio();
      if (key === 'e') toggleEngine();
    };

    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.key.toLowerCase()] = false; };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const toggleLights = () => setGameState(p => ({ ...p, headlightsOn: !p.headlightsOn }));
  const toggleWipers = () => setGameState(p => ({ ...p, wipersActive: !p.wipersActive }));
  const toggleHandbrake = () => setGameState(p => ({ ...p, handbrakeActive: !p.handbrakeActive }));
  const toggleRadio = () => setGameState(p => ({ ...p, isRadioOn: !p.isRadioOn }));
  const changeStation = (station: string) => setGameState(p => ({ ...p, radioStation: station }));
  
  const toggleEngine = () => {
    if (stateRef.current.fuel <= 0) return;
    setGameState(prev => {
      const newState = !prev.isEngineOn;
      if (newState) audioService.playIgnition();
      return { ...prev, isEngineOn: newState, rpm: newState ? 800 : 0, speed: newState ? prev.speed : prev.speed * 0.5 };
    });
  };

  const toggleDoors = () => {
    if (Math.abs(stateRef.current.speed) < 1) {
      setGameState(p => ({ ...p, isStopped: !p.isStopped }));
    }
  };

  useEffect(() => {
    if (gameState.gameStatus !== 'DRIVING') return;

    audioService.init();

    const interval = setInterval(() => {
      const isAccelerating = keysPressed.current['w'] || keysPressed.current['arrowup'];
      const isBraking = keysPressed.current['s'] || keysPressed.current['arrowdown'];
      const isLeft = keysPressed.current['a'] || keysPressed.current['arrowleft'];
      const isRight = keysPressed.current['d'] || keysPressed.current['arrowright'];

      setGameState(prev => {
        let newFuel = prev.fuel;
        if (prev.isEngineOn) {
          const consumptionBase = 0.001;
          const consumptionSpeed = (Math.abs(prev.speed) / prev.selectedBus.maxSpeed) * 0.005;
          newFuel = Math.max(0, newFuel - (consumptionBase + consumptionSpeed));
        }

        const engineDied = prev.isEngineOn && newFuel <= 0;
        const isEngineActive = prev.isEngineOn && !engineDied;

        if (prev.isStopped) return { ...prev, speed: 0, rpm: isEngineActive ? 800 : 0, fuel: newFuel, isEngineOn: isEngineActive };

        let newSpeed = prev.speed;
        let newRpm = prev.rpm;
        const maxSpeed = prev.selectedBus.maxSpeed;

        const isForward = prev.gear === GearType.DRIVE || [GearType.G1, GearType.G2, GearType.G3, GearType.G4, GearType.G5].includes(prev.gear);
        const isReverse = prev.gear === GearType.REVERSE;
        const isNeutral = prev.gear === GearType.NEUTRAL || prev.gear === GearType.PARK;
        const canMove = isEngineActive && !prev.handbrakeActive && (isForward || isReverse);

        if (isAccelerating && canMove) {
          const accel = prev.selectedBus.acceleration * (isReverse ? -1 : 1);
          newSpeed += accel;
          
          if (prev.transmission === TransmissionType.MANUAL) {
            const gearLimits: any = { [GearType.G1]: 20, [GearType.G2]: 45, [GearType.G3]: 70, [GearType.G4]: 95, [GearType.G5]: 130 };
            const limit = gearLimits[prev.gear] || 0;
            if (Math.abs(newSpeed) > limit) newSpeed = limit * (isReverse ? -1 : 1);
            newRpm = 800 + (Math.abs(newSpeed) / limit) * 4000;
          } else {
            if (Math.abs(newSpeed) > 0 && prev.gear === GearType.DRIVE) {
               newRpm = 800 + (Math.abs(newSpeed) / maxSpeed) * 3000;
            }
          }
        } else if (isBraking) {
          newSpeed *= 0.92;
          newRpm = isEngineActive ? Math.max(800, newRpm * 0.95) : 0;
        } else {
          newSpeed *= 0.98;
          newRpm = isEngineActive ? Math.max(800, newRpm * 0.95) : 0;
        }

        if (isNeutral) {
          newSpeed *= 0.99; // Rolling friction
          newRpm = isAccelerating && isEngineActive ? 4000 : (isEngineActive ? 800 : 0);
        }

        if (Math.abs(newSpeed) > maxSpeed) newSpeed = maxSpeed * (newSpeed > 0 ? 1 : -1);
        if (Math.abs(newSpeed) < 0.1) newSpeed = 0;

        const distInc = Math.abs(newSpeed) * 0.05;
        const newDistance = prev.currentDistance + distInc;

        let newSteer = prev.steeringAngle;
        if (isLeft) newSteer = Math.max(-45, newSteer - 1.5);
        else if (isRight) newSteer = Math.min(45, newSteer + 1.5);
        else newSteer *= 0.85;

        audioService.update(
          newSpeed, 
          isAccelerating && isEngineActive, 
          prev.selectedBus.size, 
          prev.terrain, 
          prev.indicatorStatus, 
          prev.isStopped,
          prev.weather,
          isEngineActive
        );

        return {
          ...prev,
          speed: newSpeed,
          currentDistance: newDistance,
          rpm: newRpm,
          steeringAngle: newSteer,
          fuel: newFuel,
          isEngineOn: isEngineActive
        };
      });
    }, 16);

    return () => {
      clearInterval(interval);
      audioService.stop();
    };
  }, [gameState.gameStatus]);

  const handleStart = (driver: Driver, bus: Bus) => {
    setShowMenu(false);
    setGameState(p => ({ 
      ...p, 
      selectedDriver: driver, 
      selectedBus: bus, 
      gameStatus: 'DRIVING' 
    }));
  };

  return (
    <div className="w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden relative">
      {showMenu && <Menu onStart={handleStart} />}
      
      <div className="relative w-full h-full flex items-center justify-center">
        <GameCanvas 
          state={gameState} 
          onGearChange={(g) => setGameState(p => ({ ...p, gear: g }))} 
          onHandbrakeToggle={toggleHandbrake}
          onToggleEngine={toggleEngine}
        />
        
        {!showMenu && (
          <>
            <HUD 
              state={gameState} 
              narration=""
              onToggleLights={toggleLights}
              onToggleWipers={toggleWipers}
              onToggleRearView={() => setGameState(p => ({ ...p, rearViewActive: !p.rearViewActive }))}
              onOpenDoors={toggleDoors}
              onRadioCheck={() => {}}
              onSetRainIntensity={() => {}}
              onAIEdit={() => {}}
              isAiProcessing={false}
              aiResult={null}
              onCloseAIResult={() => {}}
            />
            
            <Dashboard 
              state={gameState}
              onToggleLights={toggleLights}
              onToggleWipers={toggleWipers}
              onOpenDoors={toggleDoors}
              onRadioCheck={() => {}}
              onRadioToggle={toggleRadio}
              onStationChange={changeStation}
              onToggleEngine={toggleEngine}
              onGearShift={(g) => setGameState(p => ({ ...p, gear: g, transmission: TransmissionType.MANUAL }))}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default App;
