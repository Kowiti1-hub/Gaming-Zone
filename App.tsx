
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
  IndicatorType,
  GearType
} from './types';
import { 
  CITY_THRESHOLD, 
  SUBURBAN_THRESHOLD, 
  VILLAGE_THRESHOLD, 
  DRIVERS,
  BUSES,
  TRAFFIC_LIGHT_DISTANCE,
  TRAFFIC_LIGHT_CYCLE,
  SPEED_LIMITS
} from './constants';
import { getNarration } from './services/geminiService';
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
  handbrakeActive: true,
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
  const lastWeatherChangeDist = useRef<number>(0);
  const speedingFrames = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { 
      const key = e.key.toLowerCase();
      keysPressed.current[key] = true; 
      
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
      } else if (key === 'r') {
        setGameState(prev => ({
          ...prev,
          rearViewActive: !prev.rearViewActive
        }));
      } else if (key === 'p') {
        setGameState(prev => ({
          ...prev,
          handbrakeActive: !prev.handbrakeActive
        }));
      } else if (key === 'x') {
        setGameState(prev => {
          const gears = [GearType.PARK, GearType.REVERSE, GearType.NEUTRAL, GearType.DRIVE];
          const currentIndex = gears.indexOf(prev.gear);
          const nextIndex = (currentIndex + 1) % gears.length;
          return { ...prev, gear: gears[nextIndex] };
        });
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
            money: prev.money + (joined * 5)
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
      const isAccelerating = keysPressed.current['w'] || keysPressed.current['arrowup'];
      const s = stateRef.current;
      
      audioService.update(
        s.speed, 
        isAccelerating, 
        s.selectedBus.size,
        s.terrain,
        s.indicatorStatus,
        s.isStopped,
        s.weather
      );

      setGameState(prev => {
        if (prev.isStopped) return prev;

        let newWeather = prev.weather;
        let newRainIntensity = prev.rainIntensity;

        if (prev.currentDistance - lastWeatherChangeDist.current > 4000) {
          lastWeatherChangeDist.current = prev.currentDistance;
          const rand = Math.random();
          if (rand < 0.1) {
            newWeather = WeatherType.RAIN;
            newRainIntensity = 0.3 + Math.random() * 0.7; 
          }
          else if (rand < 0.2) newWeather = WeatherType.FOG;
          else {
            newWeather = WeatherType.CLEAR;
            newRainIntensity = 0.5;
          }
          
          if (newWeather !== prev.weather) {
            setNarration(`Dispatch: Weather advisory - ${newWeather} conditions ahead. Exercise caution.`);
            setTimeout(() => setNarration(""), 4000);
          }
        }

        if (prev.weather === WeatherType.RAIN) {
          newRainIntensity = Math.max(0.1, Math.min(1.0, prev.rainIntensity + (Math.random() - 0.5) * 0.01));
        }

        const isRaining = prev.weather === WeatherType.RAIN;
        const isFoggy = prev.weather === WeatherType.FOG;
        const traction = isRaining ? 0.6 : (isFoggy ? 0.85 : 1.0);
        const engineMax = prev.selectedBus.maxSpeed;
        const terrainLimit = SPEED_LIMITS[prev.terrain];
        
        const logicalMax = isRaining ? engineMax * 0.8 : (isFoggy ? engineMax * 0.9 : engineMax);

        let newSpeed = prev.speed;
        
        // Physical constraints: Handbrake and Gear
        const canMove = !prev.handbrakeActive && (prev.gear === GearType.DRIVE || prev.gear === GearType.REVERSE);
        
        if (isAccelerating && canMove) {
          const accelDirection = prev.gear === GearType.REVERSE ? -1 : 1;
          newSpeed = newSpeed + (prev.selectedBus.acceleration * traction * accelDirection);
          // Clamp speed based on logical max
          if (accelDirection > 0) newSpeed = Math.min(logicalMax, newSpeed);
          else newSpeed = Math.max(-logicalMax * 0.3, newSpeed); // Slower reverse
        } else if (keysPressed.current['s'] || keysPressed.current['arrowdown']) {
          const brakeForce = isRaining ? prev.selectedBus.acceleration : prev.selectedBus.acceleration * 2;
          if (newSpeed > 0) newSpeed = Math.max(0, newSpeed - brakeForce);
          else if (newSpeed < 0) newSpeed = Math.min(0, newSpeed + brakeForce);
        } else {
          // Natural friction
          if (Math.abs(newSpeed) < 0.1) newSpeed = 0;
          else newSpeed *= 0.98;
        }

        // Speed Limit Enforcement (only for forward motion)
        if (newSpeed > terrainLimit + 5) { 
          speedingFrames.current += 1;
          if (speedingFrames.current > 120) {
            speedingFrames.current = 0;
            setTimeout(() => triggerPenalty(`Speeding in ${prev.terrain} Zone`, 50), 0);
          }
        } else {
          speedingFrames.current = 0;
        }

        const targetCurve = Math.sin(prev.currentDistance / 1000) * 1.5;
        const curveInterpolation = (targetCurve - prev.roadCurve) * 0.02;

        let newAngle = prev.steeringAngle;
        const steeringSpeed = isRaining ? 1.2 : 2;
        if (keysPressed.current['a'] || keysPressed.current['arrowleft']) {
          newAngle = Math.max(-45, prev.steeringAngle - steeringSpeed);
        } else if (keysPressed.current['d'] || keysPressed.current['arrowright']) {
          newAngle = Math.min(45, prev.steeringAngle + steeringSpeed);
        } else {
          newAngle *= 0.92;
        }

        const distanceInc = Math.abs(newSpeed) * 0.15;
        const newDistance = prev.currentDistance + distanceInc;

        if (isRaining && !prev.wipersActive && Math.abs(newSpeed) > 40 && Math.abs(newDistance - lastViolationDist.current) > 3000) {
          lastViolationDist.current = newDistance;
          setTimeout(() => triggerPenalty("Driving in Rain without Wipers", 75), 0);
        }

        const isNearStop = Math.abs(newDistance - prev.nextStopDistance) < 50;
        if (isNearStop && (keysPressed.current[' '] || Math.abs(newSpeed) < 2)) {
          const isRest = prev.terrain === TerrainType.VILLAGE;
          setTimeout(() => triggerStop(isRest), 0);
          return { ...prev, speed: 0, currentDistance: prev.nextStopDistance, steeringAngle: 0, gear: GearType.PARK, handbrakeActive: true };
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
          weather: newWeather,
          rainIntensity: newRainIntensity,
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
    audioService.init(); 
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

  const handleSetRainIntensity = (val: number) => {
    setGameState(prev => ({ ...prev, rainIntensity: val }));
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
            onToggleRearView={() => setGameState(p => ({...p, rearViewActive: !p.rearViewActive}))}
            onOpenDoors={() => { if(Math.abs(gameState.speed) < 5) triggerStop(gameState.terrain === TerrainType.VILLAGE) }}
            onRadioCheck={handleRadioCheck}
            onSetRainIntensity={handleSetRainIntensity}
          />
        )}
      </div>

      <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-b from-black/50 to-transparent pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-full h-4 bg-gradient-to-t from-black/50 to-transparent pointer-events-none"></div>
    </div>
  );
};

export default App;
