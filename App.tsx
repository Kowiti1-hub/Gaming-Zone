
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
  WeatherType,
  IndicatorType
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
  money: 500,
  isStopped: false,
  currentStopId: null,
  selectedBus: BUSES[0],
  selectedDriver: DRIVERS[0],
  gameStatus: 'MENU',
  terrain: TerrainType.CITY,
  road: RoadType.PAVED,
  weather: WeatherType.CLEAR,
  lastStopDistance: 0,
  nextStopDistance: 1500,
  headlightsOn: false,
  wipersActive: false,
  steeringAngle: 0,
  indicatorStatus: IndicatorType.OFF,
  roadCurve: 0,
  currentCurve: 0,
  totalViolations: 0,
  isFull: false,
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
    const handleKeyDown = (e: KeyboardEvent) => { 
      const key = e.key.toLowerCase();
      keysPressed.current[key] = true; 
      
      // Toggle indicators
      if (key === 'q') {
        setGameState(prev => ({
          ...prev,
          indicatorStatus: prev.indicatorStatus === IndicatorType.LEFT ? IndicatorType.OFF : IndicatorType.LEFT
        }));
      } else if (key === 'e') {
        setGameState(prev => ({
          ...prev,
          indicatorStatus: prev.indicatorStatus === IndicatorType.RIGHT ? IndicatorType.OFF : IndicatorType.RIGHT
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

  const triggerPenalty = useCallback((reason: string, amount: number) => {
    setGameState(prev => ({
      ...prev,
      money: Math.max(0, prev.money - amount),
      totalViolations: prev.totalViolations + 1
    }));
    setNarration(`OFFICIAL CITATION: ${reason}. Penalty: $${amount} deducted.`);
    setTimeout(() => setNarration(""), 5000);
  }, []);

  const triggerStop = useCallback(async (isRest: boolean) => {
    const s = stateRef.current;
    if (s.isStopped) return;

    const busIsFull = s.passengers >= s.selectedBus.capacity;
    
    setGameState(prev => ({ ...prev, isStopped: true, speed: 0 }));
    
    const msg = busIsFull 
      ? "Dispatch: Bus is FULL. Do not pick up any more passengers until current ones reach their destination."
      : await getNarration(s.selectedDriver, s.terrain, isRest);
    setNarration(msg);

    const waitTime = isRest ? 50000 : 5000;
    
    setTimeout(() => {
      setGameState(prev => {
        const nextDist = prev.currentDistance + (isRest ? 5000 : (Math.random() * 3000 + 2000));
        
        let newPassengers = prev.passengers;
        let joined = 0;
        if (!busIsFull) {
          joined = Math.floor(Math.random() * 10) + 1;
          newPassengers = Math.min(prev.selectedBus.capacity, prev.passengers + joined);
        }
        
        const left = Math.floor(Math.random() * (newPassengers / 2 + 1));
        newPassengers = Math.max(0, newPassengers - left);

        return {
            ...prev,
            isStopped: false,
            passengers: newPassengers,
            isFull: newPassengers >= prev.selectedBus.capacity,
            lastStopDistance: prev.currentDistance,
            nextStopDistance: nextDist,
            money: prev.money + (joined * 5) // Earn money per passenger
        };
      });
      if (!busIsFull) setNarration("");
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

        const targetCurve = Math.sin(prev.currentDistance / 1000) * 1.5;
        const curveInterpolation = (targetCurve - prev.roadCurve) * 0.02;

        let newAngle = prev.steeringAngle;
        const steeringSpeed = 2;
        if (keysPressed.current['a'] || keysPressed.current['arrowleft']) {
          newAngle = Math.max(-45, prev.steeringAngle - steeringSpeed);
        } else if (keysPressed.current['d'] || keysPressed.current['arrowright']) {
          newAngle = Math.min(45, prev.steeringAngle + steeringSpeed);
        } else {
          newAngle *= 0.92; // Smoother return to center
        }

        const distanceInc = newSpeed * 0.15;
        const newDistance = prev.currentDistance + distanceInc;

        if (prev.terrain === TerrainType.CITY) {
          const lightIdx = Math.round(newDistance / TRAFFIC_LIGHT_DISTANCE);
          const lightDist = lightIdx * TRAFFIC_LIGHT_DISTANCE;
          const cycleTime = (Date.now() + lightIdx * 5000) % TRAFFIC_LIGHT_CYCLE;
          const isRed = cycleTime < 6000;
          
          if (isRed && Math.abs(newDistance - lightDist) < 30 && newSpeed > 5) {
             if (Math.abs(newDistance - lastViolationDist.current) > 200) {
               lastViolationDist.current = newDistance;
               setTimeout(() => triggerPenalty("Red Light Violation", 100), 0);
             }
          }
        }

        if (Math.abs(newDistance - prev.nextStopDistance) < 50 && newSpeed > 30) {
           if (Math.abs(newDistance - lastViolationDist.current) > 500) {
              lastViolationDist.current = newDistance;
              setTimeout(() => triggerPenalty("Dangerous Speed at Zebra Crossing", 50), 0);
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
          steeringAngle: newAngle,
          roadCurve: prev.roadCurve + curveInterpolation,
          currentCurve: targetCurve,
          isFull: prev.passengers >= prev.selectedBus.capacity
        };
      });
    }, 16);

    return () => clearInterval(interval);
  }, [gameState.gameStatus, triggerStop, triggerPenalty]);

  const handleStartGame = (driver: Driver, bus: Bus) => {
    setGameState({
      ...INITIAL_STATE,
      selectedDriver: driver,
      selectedBus: bus,
      gameStatus: 'DRIVING'
    });
    setShowMenu(false);
    setNarration(`Dispatch: Welcome aboard, ${driver.name}. Good luck on your city-to-village route!`);
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
