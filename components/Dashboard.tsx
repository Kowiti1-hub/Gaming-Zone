
import React from 'react';
import { GameState, WeatherType, IndicatorType, GearType, TransmissionType } from '../types';
import { SPEED_LIMITS } from '../constants';

interface DashboardProps {
  state: GameState;
  onToggleLights: () => void;
  onToggleWipers: () => void;
  onToggleRearView?: () => void;
  onOpenDoors: () => void;
  onRadioCheck: () => void;
  onStationChange: (station: string) => void;
  onRadioToggle: () => void;
  onToggleEngine: () => void;
  onGearShift: (gear: GearType) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  state, 
  onToggleLights, 
  onToggleWipers, 
  onToggleRearView,
  onOpenDoors, 
  onRadioToggle,
  onStationChange,
  onToggleEngine,
  onGearShift
}) => {
  const maxSpeed = state.selectedBus.maxSpeed;
  const currentSpeed = Math.abs(state.speed);
  const speedPercentage = Math.min(1, currentSpeed / maxSpeed);
  const needleRotation = (speedPercentage * 240) - 120;

  const fuelPercentage = state.fuel / 100;
  const fuelRotation = (fuelPercentage * 90) - 45;
  
  const currentLimit = SPEED_LIMITS[state.terrain];
  const isSpeeding = currentSpeed > currentLimit;

  const stations = ['POP HITS', 'LO-FI BEATS', 'RURAL FM', 'CITY NEWS'];

  return (
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-56 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent backdrop-blur-[6px] border-t border-white/10 flex items-end justify-between px-16 pb-6 pointer-events-auto z-20 select-none">
      
      {/* Radio & Ignition Area */}
      <div className="flex flex-col gap-3 w-60 mb-4">
        <div className={`p-4 rounded-xl border transition-all ${state.isRadioOn ? 'bg-blue-600/20 border-blue-500/50' : 'bg-slate-900 border-white/5 opacity-50'}`}>
          <div className="text-[10px] font-black text-blue-400 mb-2 tracking-widest">INFOTAINMENT</div>
          <div className="bg-black/60 p-2 rounded text-center mb-3">
            <span className="text-xs font-mono text-blue-300 uppercase">
              {state.isRadioOn ? state.radioStation : '--- OFF ---'}
            </span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={onRadioToggle}
              className={`flex-1 py-1 rounded text-[9px] font-bold border transition-colors ${state.isRadioOn ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'}`}
            >
              {state.isRadioOn ? 'PWR OFF' : 'PWR ON'}
            </button>
            <button 
              disabled={!state.isRadioOn}
              onClick={() => {
                const idx = (stations.indexOf(state.radioStation) + 1) % stations.length;
                onStationChange(stations[idx]);
              }}
              className="px-3 py-1 rounded bg-white/5 border border-white/10 text-[9px] font-bold text-white hover:bg-white/10 disabled:opacity-30"
            >
              CH+
            </button>
          </div>
        </div>

        <button 
          onClick={onToggleEngine}
          className={`w-full py-3 rounded-xl border font-black text-sm tracking-widest transition-all ${
            state.isEngineOn 
            ? 'bg-red-500/20 border-red-500/50 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' 
            : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/30'
          }`}
        >
          {state.isEngineOn ? 'STOP ENGINE [E]' : 'START ENGINE [E]'}
        </button>
      </div>

      {/* Gear Selector Shifter */}
      <div className="flex flex-col items-center gap-2 mb-4 bg-black/40 p-4 rounded-2xl border border-white/10">
        <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Gear Shifter</div>
        <div className="grid grid-cols-3 gap-2">
          <GearBtn label="1" active={state.gear === GearType.G1} onClick={() => onGearShift(GearType.G1)} />
          <GearBtn label="N" active={state.gear === GearType.NEUTRAL} onClick={() => onGearShift(GearType.NEUTRAL)} />
          <GearBtn label="2" active={state.gear === GearType.G2} onClick={() => onGearShift(GearType.G2)} />
          <GearBtn label="3" active={state.gear === GearType.G3} onClick={() => onGearShift(GearType.G3)} />
          <GearBtn label="4" active={state.gear === GearType.G4} onClick={() => onGearShift(GearType.G4)} />
          <GearBtn label="5" active={state.gear === GearType.G5} onClick={() => onGearShift(GearType.G5)} />
          <GearBtn label="R" active={state.gear === GearType.REVERSE} onClick={() => onGearShift(GearType.REVERSE)} color="text-red-400" />
          <GearBtn label="D" active={state.gear === GearType.DRIVE} onClick={() => onGearShift(GearType.DRIVE)} color="text-emerald-400" />
          <GearBtn label="P" active={state.gear === GearType.PARK} onClick={() => onGearShift(GearType.PARK)} />
        </div>
      </div>

      {/* Center Controls */}
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex gap-3">
          <DashboardButton label="Lights" active={state.headlightsOn} onClick={onToggleLights} icon="💡" />
          <DashboardButton label="Wipers" active={state.wipersActive} onClick={onToggleWipers} icon="🌧️" />
          <DashboardButton label="Doors" active={state.isStopped} onClick={onOpenDoors} icon="🚪" disabled={currentSpeed > 2} />
        </div>
        <div className="bg-slate-900/80 px-4 py-2 rounded-xl border border-white/10 flex justify-center gap-6">
          <div className="flex flex-col items-center">
             <span className="text-[8px] font-black text-white/40 mb-1 uppercase">Trans</span>
             <span className="text-xs font-bold text-white">{state.transmission}</span>
          </div>
          <div className="flex flex-col items-center">
             <span className="text-[8px] font-black text-white/40 mb-1 uppercase">Gear</span>
             <span className="text-xl font-black text-blue-400">{state.gear}</span>
          </div>
        </div>
      </div>

      {/* Main Cluster */}
      <div className="flex items-end gap-10 mb-4">
        
        {/* Fuel Gauge */}
        <div className="relative w-24 h-24 mb-4 bg-slate-950 rounded-full border-2 border-slate-800 flex items-center justify-center">
          <svg className="w-full h-full" viewBox="0 0 100 100">
             <path d="M 20 70 A 40 40 0 0 1 80 70" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" strokeLinecap="round" />
             <path 
                d="M 20 70 A 40 40 0 0 1 80 70" fill="none" 
                stroke={state.fuel < 20 ? '#ef4444' : '#34d399'} 
                strokeWidth="6" 
                strokeLinecap="round"
                strokeDasharray="120"
                strokeDashoffset={120 - (fuelPercentage * 120 * 0.8)}
             />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
             <span className="text-[12px] font-black text-white/80">FUEL</span>
             <span className={`text-[10px] font-mono ${state.fuel < 20 ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`}>{Math.round(state.fuel)}%</span>
          </div>
          <div 
            className="absolute w-1 h-8 bg-white/40 origin-bottom bottom-1/2 rounded-full transition-transform duration-500"
            style={{ transform: `rotate(${fuelRotation}deg)` }}
          ></div>
          <div className="absolute left-4 bottom-6 text-[8px] font-black text-white/30">E</div>
          <div className="absolute right-4 bottom-6 text-[8px] font-black text-white/30">F</div>
        </div>

        {/* Speedometer Gauge */}
        <div className="relative w-40 h-40 flex items-center justify-center bg-slate-950 rounded-full border-4 border-slate-800 shadow-2xl">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
            <circle 
              cx="50" cy="50" r="45" fill="none" stroke="url(#speedGrad)" strokeWidth="6" 
              strokeDasharray="283" strokeDashoffset={283 - (speedPercentage * 283 * (240/360))}
              strokeLinecap="round" className="transition-all duration-300 ease-out"
              style={{ transform: 'rotate(150deg)', transformOrigin: 'center' }}
            />
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-6">
            <span className={`text-3xl font-mono font-black tabular-nums transition-colors duration-300 ${isSpeeding ? 'text-red-500 animate-pulse' : 'text-white'}`}>
              {Math.round(currentSpeed)}
            </span>
            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">KM/H</span>
          </div>

          <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-1">
             <div className={`w-1.5 h-1.5 rounded-full ${state.isEngineOn ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]' : 'bg-orange-500 animate-pulse'}`}></div>
             <div className={`w-1.5 h-1.5 rounded-full ${state.fuel < 15 ? 'bg-red-500 animate-ping' : 'bg-white/5'}`}></div>
          </div>

          {/* Gauge Needle */}
          <div 
            className="absolute left-1/2 top-1/2 w-[42%] h-1 bg-red-500 origin-left -translate-y-1/2 rounded-full shadow-[0_0_12px_rgba(239,68,68,0.7)] transition-transform duration-100 ease-out z-20"
            style={{ transform: `rotate(${needleRotation}deg)` }}
          >
            <div className="absolute -left-2 -top-2 w-5 h-5 rounded-full bg-slate-900 border-2 border-red-500"></div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex flex-col gap-3 min-w-[160px]">
          <div className="flex gap-2">
            <IndicatorLight active={state.indicatorStatus === IndicatorType.LEFT} side="L" />
            <IndicatorLight active={state.indicatorStatus === IndicatorType.RIGHT} side="R" />
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 rounded-2xl flex justify-between items-center">
             <div className="text-[10px] text-emerald-400/60 font-black uppercase tracking-widest">Passengers</div>
             <div className="text-xl font-mono text-emerald-400 font-bold">{state.passengers}</div>
          </div>
          <div className={`px-4 py-2 rounded-xl border transition-all text-center ${state.handbrakeActive ? 'bg-red-900/30 border-red-500/50 text-red-400' : 'bg-slate-900/40 border-white/10 text-white/20'}`}>
            <span className="text-[10px] font-black uppercase tracking-widest">BRAKE LOCK</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const GearBtn = ({ label, active, onClick, color = 'text-white' }: any) => (
  <button 
    onClick={onClick}
    className={`w-10 h-10 rounded-lg border flex items-center justify-center font-black transition-all ${
      active 
      ? 'bg-blue-500 border-blue-400 text-white scale-110 shadow-lg' 
      : `bg-slate-800 border-white/5 ${color} opacity-60 hover:opacity-100 hover:bg-slate-700`
    }`}
  >
    {label}
  </button>
);

const DashboardButton = ({ label, active, onClick, icon, disabled = false }: any) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={`flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-2xl border transition-all shadow-xl ${
      disabled ? 'opacity-20 grayscale cursor-not-allowed' : 'hover:scale-105 active:scale-95'
    } ${
      active 
        ? 'bg-blue-500/20 border-blue-500/60 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.2)]' 
        : 'bg-slate-900/80 border-white/10 text-white/40'
    }`}
  >
    <span className="text-xl">{icon}</span>
    <span className="text-[7px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

const IndicatorLight = ({ active, side }: { active: boolean, side: 'L' | 'R' }) => (
  <div className={`flex-1 h-10 rounded-xl flex items-center justify-center text-lg font-black transition-all border ${
    active 
      ? 'bg-orange-500/20 border-orange-500/50 text-orange-400 animate-pulse' 
      : 'bg-black/40 border-white/5 text-white/5'
  }`}>
    {side === 'L' ? '←' : '→'}
  </div>
);

export default Dashboard;
