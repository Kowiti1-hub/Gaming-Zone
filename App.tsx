
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Menu from './components/Menu';
import GameCanvas from './components/GameCanvas';
import HUD from './components/HUD';
import { 
  GameState, 
  Driver, 
  Bus, 
  TerrainType, 
  RoadType, 
  WeatherType 
} from './types';
import { 
  CITY_THRESHOLD, 
  SUBURBAN_THRESHOLD, 
  VILLAGE_THRESHOLD, 
  DRIVERS,
  BUSES,
  TRAFFIC_LIGHT_DISTANCE,
  TRAFFIC_LIGHT_CYCLE
} from './constants';
import { getNarration } from './services/geminiService';

const INITIAL_STATE: GameState = {
  currentDistance: 0,
  speed: 0,
  passengers: 0,
  money: 0,
  isStopped: false,
  currentStopId: null,
  selectedBus: BUSES[0],
  selectedDriver: DRIVERS[0],
  gameStatus: 'MENU',
  terrain: TerrainType.CITY,
  road: RoadType.PAVED,
  weather: WeatherType.CLEAR,
  lastStopDistance: 0,
  nextStopDistance: 1000,
  headlightsOn: false,
  wipersActive: false,
  steeringAngle: 0,
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [narration, setNarration] = useState<string>("");
  const [showMenu, setShowMenu] = useState(true);
  
  const stateRef = useRef(gameState);
  stateRef.current = gameState;

  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const lastViolationDist = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current[e.key.toLowerCase()] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const triggerStop = useCallback(async (isRest: boolean) => {
    const s = stateRef.current;
    if (s.isStopped) return;

    setGameState(prev => ({ ...prev, isStopped: true, speed: 0 }));
    
    const msg = await getNarration(s.selectedDriver, s.terrain, isRest);
    setNarration(msg);

    const waitTime = isRest ? 50000 : 5000;
    setTimeout(() => {
      setGameState(prev => {
        const nextDist = prev.currentDistance + (isRest ? 5000 : (Math.random() * 2000 + 1000));
        return {
            ...prev,
            isStopped: false,
            lastStopDistance: prev.currentDistance,
            nextStopDistance: nextDist,
            money: prev.money + (Math.floor(Math.random() * 50) + 20)
        };
      });
      setNarration("");
    }, waitTime);
  }, []);

  const handleRadioCheck = useCallback(async () => {
    const s = stateRef.current;
    const msg = await getNarration(s.selectedDriver, s.terrain, false);
    setNarration(msg);
    setTimeout(() => setNarration(""), 6000);
  }, []);

  useEffect(() => {
    if (gameState.gameStatus !== 'DRIVING') return;

    const weatherInterval = setInterval(() => {
      const weathers = [WeatherType.CLEAR, WeatherType.RAIN, WeatherType.FOG];
      const nextWeather = weathers[Math.floor(Math.random() * weathers.length)];
      setGameState(prev => ({ 
        ...prev, 
        weather: nextWeather,
        wipersActive: nextWeather === WeatherType.RAIN ? true : prev.wipersActive 
      }));
      
      const weatherMsgs: Record<WeatherType, string> = {
        [WeatherType.CLEAR]: "Skies are clearing up. Have a pleasant drive!",
        [WeatherType.RAIN]: "Rain detected. Activating wipers.",
        [WeatherType.FOG]: "Heavy fog ahead. Visibility is reduced."
      };
      setNarration(weatherMsgs[nextWeather]);
      setTimeout(() => setNarration(""), 4000);
    }, 30000);

    return () => clearInterval(weatherInterval);
  }, [gameState.gameStatus]);

  useEffect(() => {
    if (gameState.gameStatus !== 'DRIVING') return;

    const interval = setInterval(() => {
      setGameState(prev => {
        if (prev.isStopped) return prev;

        const accelMult = prev.weather === WeatherType.RAIN ? 0.6 : 1.0;
        const speedLimit = prev.weather === WeatherType.RAIN ? prev.selectedBus.maxSpeed * 0.8 : prev.selectedBus.maxSpeed;

        let newSpeed = prev.speed;
        if (keysPressed.current['w'] || keysPressed.current['arrowup']) {
          newSpeed = Math.min(speedLimit, prev.speed + prev.selectedBus.acceleration * accelMult);
        } else if (keysPressed.current['s'] || keysPressed.current['arrowdown']) {
          newSpeed = Math.max(0, prev.speed - prev.selectedBus.acceleration * 2);
        } else {
          newSpeed = Math.max(0, prev.speed - 0.05);
        }

        // Steering animation logic
        let newAngle = prev.steeringAngle;
        if (keysPressed.current['a'] || keysPressed.current['arrowleft']) {
          newAngle = Math.max(-45, prev.steeringAngle - 3);
        } else if (keysPressed.current['d'] || keysPressed.current['arrowright']) {
          newAngle = Math.min(45, prev.steeringAngle + 3);
        } else {
          newAngle *= 0.9; // Return to center
        }

        const distanceInc = newSpeed * 0.1;
        const newDistance = prev.currentDistance + distanceInc;

        // Traffic Light Logic
        if (prev.terrain === TerrainType.CITY) {
          const lightIdx = Math.round(newDistance / TRAFFIC_LIGHT_DISTANCE);
          const lightDist = lightIdx * TRAFFIC_LIGHT_DISTANCE;
          const cycleTime = (Date.now() + lightIdx * 5000) % TRAFFIC_LIGHT_CYCLE;
          const isRed = cycleTime < 6000;
          
          // Detect if running a red light
          if (isRed && Math.abs(newDistance - lightDist) < 30 && newSpeed > 5) {
             if (Math.abs(newDistance - lastViolationDist.current) > 200) {
               lastViolationDist.current = newDistance;
               setNarration("Dispatch: That's a red light violation! Please observe traffic rules.");
               setTimeout(() => setNarration(""), 4000);
             }
          }
        }

        const isNearStop = Math.abs(newDistance - prev.nextStopDistance) < 50;
        if (isNearStop && (keysPressed.current[' '] || newSpeed < 2)) {
          const isRest = prev.terrain === TerrainType.VILLAGE;
          setTimeout(() => triggerStop(isRest), 0);
          return { ...prev, speed: 0, currentDistance: prev.nextStopDistance, steeringAngle: 0 };
        }

        let terrain = prev.terrain;
        let road = prev.road;
        if (newDistance > VILLAGE_THRESHOLD) {
          terrain = TerrainType.VILLAGE;
          road = RoadType.OFFROAD;
        } else if (newDistance > SUBURBAN_THRESHOLD) {
          terrain = TerrainType.SUBURBAN;
          road = RoadType.PAVED;
        } else {
          terrain = TerrainType.CITY;
          road = RoadType.PAVED;
        }

        return {
          ...prev,
          speed: newSpeed,
          currentDistance: newDistance,
          terrain,
          road,
          steeringAngle: newAngle
        };
      });
    }, 16);

    return () => clearInterval(interval);
  }, [gameState.gameStatus, triggerStop]);

  const handleStartGame = (driver: Driver, bus: Bus) => {
    setGameState({
      ...INITIAL_STATE,
      selectedDriver: driver,
      selectedBus: bus,
      gameStatus: 'DRIVING'
    });
    setShowMenu(false);
    setNarration(`Welcome aboard, ${driver.name}. Let's head out from the city center!`);
    setTimeout(() => setNarration(""), 5000);
  };

  return (
    <div className="relative w-screen h-screen bg-slate-950 flex items-center justify-center overflow-hidden">
      {showMenu && <Menu onStart={handleStartGame} />}
      
      <div className="relative">
        <GameCanvas state={gameState} />
        {gameState.gameStatus === 'DRIVING' && (
          <HUD 
            state={gameState} 
            narration={narration} 
            onToggleLights={() => setGameState(p => ({...p, headlightsOn: !p.headlightsOn}))}
            onToggleWipers={() => setGameState(p => ({...p, wipersActive: !p.wipersActive}))}
            onOpenDoors={() => { if(gameState.speed < 5) triggerStop(gameState.terrain === TerrainType.VILLAGE) }}
            onRadioCheck={handleRadioCheck}
          />
        )}
      </div>

      <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-b from-black/50 to-transparent pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-full h-4 bg-gradient-to-t from-black/50 to-transparent pointer-events-none"></div>
    </div>
  );
};

export default App;
