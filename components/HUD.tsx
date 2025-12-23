
import React from 'react';
import { GameState, WeatherType } from '../types';
import Dashboard from './Dashboard';
import { VILLAGE_THRESHOLD } from '../constants';

interface HUDProps {
  state: GameState;
  narration: string;
  onToggleLights: () => void;
  onToggleWipers: () => void;
  onToggleRearView: () => void;
  onOpenDoors: () => void;
  onRadioCheck: () => void;
}

const HUD: React.FC<HUDProps> = ({ 
  state, 
  narration, 
  onToggleLights, 
  onToggleWipers, 
  onToggleRearView,
  onOpenDoors, 
  onRadioCheck 
}) => {
  const weatherIcons: Record<WeatherType, string> = {
    [WeatherType.CLEAR]: "☀️",
    [WeatherType.RAIN]: "🌧️",
    [WeatherType.FOG]: "🌫️"
  };

  const reflectionOffset = (state.currentDistance % 1000) / 10;

  return (
    <div className="fixed inset-0 pointer-events-none p-6 flex flex-col justify-between z-10">
      {/* Top Bar - Minimalist Glass */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-3">
          <div className="bg-black/40 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/5 text-white shadow-2xl">
            <div className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">Balance</div>
            <div className="text-3xl font-mono text-emerald-400 tabular-nums">
              ${state.money.toLocaleString()}
            </div>
          </div>
          <div className="bg-black/40 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/5 text-white shadow-2xl">
            <div className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">Citations</div>
            <div className={`text-2xl font-mono tabular-nums ${state.totalViolations > 0 ? 'text-red-400' : 'text-white/60'}`}>
              {state.totalViolations}
            </div>
          </div>
        </div>

        {/* Rear Mirror - Polished with reflection effect */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-64 h-14 bg-slate-900/60 backdrop-blur-xl border-2 border-slate-700/50 rounded-b-3xl overflow-hidden flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em]">Rear View Mirror</div>
            <div 
              className="absolute inset-0 opacity-20"
              style={{
                background: `repeating-linear-gradient(0deg, #444, #444 10px, transparent 10px, transparent 20px)`,
                transform: `translateY(${reflectionOffset}px) scaleX(2)`
              }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/5"></div>
        </div>

        <div className="flex flex-col gap-3 items-end">
          <div className="bg-black/40 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/5 text-white text-right shadow-2xl">
            <div className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">Location</div>
            <div className="text-xl font-black text-blue-400 italic tracking-tight">{state.terrain}</div>
            <div className="text-[10px] font-bold text-emerald-500/80 uppercase">{state.road} Zone</div>
          </div>
          
          <div className="bg-black/40 backdrop-blur-md px-5 py-2 rounded-2xl border border-white/5 text-white flex items-center gap-3 shadow-2xl">
            <span className="text-xl">{weatherIcons[state.weather]}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{state.weather}</span>
          </div>
        </div>
      </div>

      {/* Rear View Camera Monitor Overlay */}
      {state.rearViewActive && (
        <div className="absolute top-24 right-24 w-80 h-48 bg-slate-950 border-4 border-slate-800 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden pointer-events-auto">
          <div className="absolute inset-0 bg-blue-900/10">
            <div 
              className="absolute inset-0 opacity-40"
              style={{
                background: `repeating-linear-gradient(0deg, #1a202c, #1a202c 2px, transparent 2px, transparent 10px)`,
                transform: `translateY(${reflectionOffset}px)`
              }}
            ></div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-full bg-gradient-to-t from-slate-800/50 to-transparent origin-bottom" style={{ transform: 'perspective(100px) rotateX(45deg)' }}>
              <div 
                className="w-2 h-full bg-yellow-400/30 mx-auto"
                style={{ background: `repeating-linear-gradient(0deg, #fbbf24 0%, #fbbf24 50%, transparent 50%, transparent 100%)`, backgroundSize: '10px 40px', backgroundPosition: `0 ${reflectionOffset}px` }}
              ></div>
            </div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-64 h-32 flex flex-col justify-between items-center opacity-60">
              <div className="w-full h-1 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
              <div className="w-3/4 h-1 bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]"></div>
              <div className="w-1/2 h-1 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
            </div>
          </div>
          <div className="absolute top-3 left-4 flex gap-2 items-center">
            <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse"></div>
            <span className="text-[10px] font-black text-white uppercase tracking-tighter">CAM 01: REAR</span>
          </div>
          <div className="absolute bottom-3 right-4">
             <span className="text-[10px] font-mono text-emerald-400">FPS: 30 // HD MODE</span>
          </div>
          <div className="absolute inset-0 pointer-events-none opacity-20" style={{ background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 4px, 3px 100%' }}></div>
        </div>
      )}

      {/* Dispatcher Alert */}
      {narration && (
        <div className="self-center w-full max-w-xl mb-44 px-4">
          <div className={`backdrop-blur-2xl p-5 rounded-3xl border-2 text-white shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700 ${narration.includes('CITATION') || narration.includes('FULL') ? 'bg-red-950/80 border-red-500/50' : 'bg-slate-950/80 border-blue-500/50'}`}>
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-lg">
                📻
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Radio Channel 1</div>
                <div className="text-sm font-medium leading-relaxed text-slate-100">{narration}</div>
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
        onToggleRearView={onToggleRearView}
        onOpenDoors={onOpenDoors}
        onRadioCheck={onRadioCheck}
      />

      {/* Bottom Floating Info - Controls Help */}
      <div className="flex justify-between items-end mb-40">
        <div className="flex gap-4">
           <ControlChip keys="W/S" action="Drive" />
           <ControlChip keys="A/D" action="Steer" />
           <ControlChip keys="Q/E" action="Flash" />
           <ControlChip keys="R" action="Camera" />
        </div>

        <div className="bg-black/40 backdrop-blur-md p-5 rounded-2xl border border-white/5 text-white min-w-[220px] shadow-2xl">
          <div className="flex justify-between text-[10px] text-white/40 uppercase font-black tracking-widest mb-2">
            <span>Route Progress</span>
            <span>{Math.round((state.currentDistance / VILLAGE_THRESHOLD) * 100)}%</span>
          </div>
          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full transition-all duration-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
              style={{ width: `${Math.min(100, (state.currentDistance / VILLAGE_THRESHOLD) * 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[9px] font-bold text-white/20 uppercase">City Hub</span>
            <span className="text-[9px] font-bold text-white/20 uppercase">Village Rest</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const ControlChip = ({ keys, action }: { keys: string, action: string }) => (
  <div className="bg-black/30 backdrop-blur-md px-3 py-2 rounded-xl border border-white/5 text-white flex items-center gap-3 shadow-lg">
    <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-black text-blue-400">{keys}</span>
    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{action}</span>
  </div>
);

export default HUD;
