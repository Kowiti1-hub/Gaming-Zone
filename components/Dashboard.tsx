
import React from 'react';
import { GameState, WeatherType } from '../types';

interface DashboardProps {
  state: GameState;
  onToggleLights: () => void;
  onToggleWipers: () => void;
  onOpenDoors: () => void;
  onRadioCheck: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  state, 
  onToggleLights, 
  onToggleWipers, 
  onOpenDoors, 
  onRadioCheck 
}) => {
  return (
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl h-48 bg-slate-900/90 backdrop-blur-xl border-t-4 border-slate-700 rounded-t-[4rem] flex items-center justify-between px-12 pointer-events-auto shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
      
      {/* Steering Wheel Area */}
      <div className="relative group">
        <div 
          className="w-32 h-32 rounded-full border-8 border-slate-800 bg-slate-950 flex items-center justify-center transition-transform duration-200"
          style={{ transform: `rotate(${state.steeringAngle}deg)` }}
        >
          <div className="w-1 h-20 bg-slate-700 absolute"></div>
          <div className="w-20 h-1 bg-slate-700 absolute"></div>
          <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center text-xs font-bold text-slate-400">
            BUS
          </div>
        </div>
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Steering Column</div>
      </div>

      {/* Main Control Panel */}
      <div className="flex-1 px-8 grid grid-cols-4 gap-4">
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

      {/* Instrument Cluster */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-2">
           <StatusIndicator active={state.headlightsOn} color="blue" label="BEAM" />
           <StatusIndicator active={state.weather === WeatherType.RAIN} color="yellow" label="RAIN" />
           <StatusIndicator active={state.isStopped} color="red" label="STOP" />
        </div>
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-700 min-w-[120px] text-center">
           <div className="text-[10px] text-slate-500 font-bold uppercase">Digital Speedo</div>
           <div className="text-2xl font-mono text-emerald-400">
             {Math.round(state.speed).toString().padStart(3, '0')}
             <span className="text-xs ml-1 text-emerald-600">KMH</span>
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
    className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 transition-all ${
      disabled ? 'opacity-30 cursor-not-allowed grayscale' : 'hover:scale-105 active:scale-95'
    } ${
      active ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-slate-800 border-slate-700 text-slate-400'
    }`}
  >
    <span className="text-xl">{icon}</span>
    <span className="text-[10px] font-bold uppercase">{label}</span>
  </button>
);

const StatusIndicator = ({ active, color, label }: any) => {
  const colors: any = {
    blue: active ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]' : 'bg-blue-900/30',
    yellow: active ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.8)]' : 'bg-yellow-900/30',
    red: active ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-red-900/30',
  };
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-3 h-3 rounded-full ${colors[color]} transition-all duration-300`}></div>
      <span className="text-[8px] font-bold text-slate-500">{label}</span>
    </div>
  );
};

export default Dashboard;
