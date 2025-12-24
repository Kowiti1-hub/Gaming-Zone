
import React from 'react';
import { GameState, WeatherType, IndicatorType } from '../types';
import { SPEED_LIMITS } from '../constants';

interface DashboardProps {
  state: GameState;
  onToggleLights: () => void;
  onToggleWipers: () => void;
  onToggleRearView?: () => void;
  onOpenDoors: () => void;
  onRadioCheck: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  state, 
  onToggleLights, 
  onToggleWipers, 
  onToggleRearView,
  onOpenDoors, 
  onRadioCheck 
}) => {
  // Speedometer logic
  const maxSpeed = state.selectedBus.maxSpeed;
  const currentSpeed = state.speed;
  const speedPercentage = Math.min(1, currentSpeed / maxSpeed);
  const needleRotation = (speedPercentage * 240) - 120;
  
  const currentLimit = SPEED_LIMITS[state.terrain];
  const isSpeeding = currentSpeed > currentLimit;

  return (
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-40 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent backdrop-blur-[2px] border-t border-white/5 flex items-end justify-between px-16 pb-6 pointer-events-auto z-20">
      
      {/* Steering Wheel Area */}
      <div className="relative group pb-2">
        <div 
          className="w-32 h-32 rounded-full border-[6px] border-slate-400/20 bg-slate-950/30 flex items-center justify-center transition-transform duration-200 shadow-2xl"
          style={{ transform: `rotate(${state.steeringAngle}deg)` }}
        >
          <div className="w-1.5 h-20 bg-slate-400/40 absolute rounded-full"></div>
          <div className="w-20 h-1.5 bg-slate-400/40 absolute rounded-full"></div>
          <div className="w-12 h-12 rounded-full bg-slate-800/40 border-2 border-slate-500/30 flex items-center justify-center text-[10px] font-black text-slate-300">
            {state.selectedBus.name.split(' ')[0]}
          </div>
        </div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-black text-white/40 uppercase tracking-widest">Navigation</div>
      </div>

      {/* Control Buttons - Modern, Glassy look */}
      <div className="flex-1 px-12 flex items-end justify-center gap-6 pb-2">
        <DashboardButton 
          label="Lights" 
          active={state.headlightsOn} 
          onClick={onToggleLights}
          icon="💡"
        />
        <DashboardButton 
          label="Wipers" 
          active={state.wipersActive} 
          onClick={onToggleWipers}
          icon="🌧️"
          disabled={state.weather !== WeatherType.RAIN && !state.wipersActive}
        />
        <DashboardButton 
          label="Camera" 
          active={state.rearViewActive} 
          onClick={onToggleRearView}
          icon="📷"
        />
        <DashboardButton 
          label="Radio" 
          active={false} 
          onClick={onRadioCheck}
          icon="📻"
        />
        <DashboardButton 
          label="Doors" 
          active={state.isStopped} 
          onClick={onOpenDoors}
          icon="🚪"
          disabled={state.speed > 5}
        />
      </div>

      {/* Cluster / Gauges */}
      <div className="flex items-end gap-6 pb-2">
        
        {/* Speedometer Gauge */}
        <div className="relative w-32 h-32 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
            <circle 
              cx="50" cy="50" r="45" 
              fill="none" 
              stroke="rgba(255,255,255,0.05)" 
              strokeWidth="6" 
            />
            <circle 
              cx="50" cy="50" r="45" 
              fill="none" 
              stroke="url(#speedGradient)" 
              strokeWidth="4" 
              strokeDasharray="283" 
              strokeDashoffset={283 - (speedPercentage * 283 * (240/360))}
              strokeLinecap="round"
              className="transition-all duration-300 ease-out"
              style={{ transform: 'rotate(150deg)', transformOrigin: 'center' }}
            />
            <defs>
              <linearGradient id="speedGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
          </svg>
          
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-full relative">
               {[0, 20, 40, 60, 80, 100, 120].map((val) => {
                 const angle = (val / 120) * 240 - 120;
                 return (
                   <div 
                     key={val} 
                     className="absolute left-1/2 top-1/2 w-full h-[2px] origin-left -translate-y-1/2"
                     style={{ transform: `rotate(${angle}deg)` }}
                   >
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 w-2 h-full bg-white/20"></div>
                   </div>
                 );
               })}
            </div>
          </div>

          <div 
            className="absolute left-1/2 top-1/2 w-[45%] h-1 bg-red-500 origin-left -translate-y-1/2 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)] transition-transform duration-150 ease-out"
            style={{ transform: `rotate(${needleRotation}deg)` }}
          >
            <div className="absolute -left-1 -top-1 w-3 h-3 rounded-full bg-slate-900 border-2 border-red-500"></div>
          </div>

          {/* Center Info - SPEEDING INDICATOR */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
            <span className={`text-xl font-mono font-black tabular-nums transition-colors duration-300 ${isSpeeding ? 'text-red-500 animate-pulse' : 'text-white'}`}>
              {Math.round(currentSpeed)}
            </span>
            <span className="text-[7px] font-black text-white/40 uppercase tracking-tighter">KM/H</span>
          </div>
        </div>

        {/* Status Indicators & Digital Readout */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-4">
            <IndicatorLight active={state.indicatorStatus === IndicatorType.LEFT} side="L" />
            <IndicatorLight active={state.indicatorStatus === IndicatorType.RIGHT} side="R" />
          </div>
          
          <div className="flex gap-3">
            <StatusIndicator active={state.headlightsOn} color="blue" label="BEAM" />
            <StatusIndicator active={state.isFull} color="red" label="FULL" />
            <StatusIndicator active={state.isStopped} color="yellow" label="DOORS" />
          </div>

          <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 min-w-[120px] text-center shadow-inner">
            <div className="text-[8px] text-white/40 font-black uppercase tracking-widest mb-0.5">
              Passengers
            </div>
            <div className="text-xl font-mono text-blue-400 tabular-nums">
              {state.passengers} / {state.selectedBus.capacity}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardButton = ({ label, active, onClick, icon, disabled = false }: any) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={`flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-2xl border transition-all ${
      disabled ? 'opacity-20 cursor-not-allowed' : 'hover:scale-110 active:scale-90 hover:bg-white/5'
    } ${
      active 
        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]' 
        : 'bg-black/30 border-white/10 text-white/60'
    }`}
  >
    <span className="text-xl">{icon}</span>
    <span className="text-[7px] font-black uppercase tracking-tighter">{label}</span>
  </button>
);

const StatusIndicator = ({ active, color, label }: any) => {
  const colors: any = {
    blue: active ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]' : 'bg-blue-900/20',
    yellow: active ? 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]' : 'bg-yellow-900/20',
    red: active ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-red-900/20',
  };
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-2 h-2 rounded-full ${colors[color]} transition-all duration-300`}></div>
      <span className="text-[6px] font-black text-white/30 tracking-tighter uppercase">{label}</span>
    </div>
  );
};

const IndicatorLight = ({ active, side }: { active: boolean, side: 'L' | 'R' }) => (
  <div className={`w-8 h-6 rounded-lg flex items-center justify-center text-xs font-black transition-all duration-150 border ${
    active 
      ? 'bg-orange-500/30 border-orange-500 text-orange-400 animate-pulse shadow-[0_0_15px_rgba(249,115,22,0.6)]' 
      : 'bg-black/30 border-white/5 text-white/10'
  }`}>
    {side === 'L' ? '←' : '→'}
  </div>
);

export default Dashboard;
