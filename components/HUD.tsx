
import React from 'react';
import { GameState, WeatherType } from '../types';
import Dashboard from './Dashboard';

interface HUDProps {
  state: GameState;
  narration: string;
  onToggleLights: () => void;
  onToggleWipers: () => void;
  onOpenDoors: () => void;
  onRadioCheck: () => void;
}

const HUD: React.FC<HUDProps> = ({ 
  state, 
  narration, 
  onToggleLights, 
  onToggleWipers, 
  onOpenDoors, 
  onRadioCheck 
}) => {
  const weatherIcons: Record<WeatherType, string> = {
    [WeatherType.CLEAR]: "☀️",
    [WeatherType.RAIN]: "🌧️",
    [WeatherType.FOG]: "🌫️"
  };

  return (
    <div className="fixed inset-0 pointer-events-none p-6 flex flex-col justify-between">
      {/* Top Bar */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <div className="bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10 text-white">
            <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Current Speed</div>
            <div className="text-3xl font-mono">
              {Math.round(state.speed)} <span className="text-sm font-sans">KM/H</span>
            </div>
          </div>
          <div className="bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10 text-white">
            <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Distance Covered</div>
            <div className="text-xl font-mono">
              {(state.currentDistance / 1000).toFixed(2)} <span className="text-sm font-sans">KM</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 items-end">
          <div className="bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10 text-white text-right">
            <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Environment</div>
            <div className="text-xl font-bold text-blue-400">{state.terrain}</div>
            <div className="text-xs font-semibold text-emerald-400">{state.road} Road</div>
          </div>
          
          <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-white flex items-center gap-2">
            <span className="text-xl">{weatherIcons[state.weather]}</span>
            <span className="text-xs font-bold uppercase tracking-widest">{state.weather}</span>
          </div>
        </div>
      </div>

      {/* Dispatcher Message Area */}
      {narration && (
        <div className="self-center w-full max-w-2xl mb-48">
          <div className="bg-blue-900/40 backdrop-blur-lg p-4 rounded-2xl border-2 border-blue-500/50 text-white animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-2xl shrink-0">
                🎙️
              </div>
              <div>
                <div className="text-[10px] font-bold text-blue-300 uppercase">Radio Dispatcher</div>
                <div className="text-sm leading-snug">{narration}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Section */}
      <Dashboard 
        state={state}
        onToggleLights={onToggleLights}
        onToggleWipers={onToggleWipers}
        onOpenDoors={onOpenDoors}
        onRadioCheck={onRadioCheck}
      />

      {/* Bottom Floating Info */}
      <div className="flex justify-between items-end mb-48">
        <div className="flex gap-4">
           <div className="bg-black/60 backdrop-blur-md p-3 rounded-lg border border-white/10 text-white flex items-center gap-3">
              <span className="bg-slate-700 px-2 py-0.5 rounded text-xs">W / S</span>
              <span className="text-xs text-slate-300">Accel / Brake</span>
           </div>
           <div className="bg-black/60 backdrop-blur-md p-3 rounded-lg border border-white/10 text-white flex items-center gap-3">
              <span className="bg-slate-700 px-2 py-0.5 rounded text-xs">A / D</span>
              <span className="text-xs text-slate-300">Steer</span>
           </div>
        </div>

        <div className="bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10 text-white min-w-[150px]">
          <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Next Stop</div>
          <div className="text-lg font-bold">
            {state.nextStopDistance > 0 
              ? `${Math.max(0, Math.round((state.nextStopDistance - state.currentDistance) / 10))}m` 
              : 'Final Destination'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HUD;
