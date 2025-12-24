
import React from 'react';
import { GameState, CameraView } from '../types';

interface HUDProps {
  state: GameState;
  narration: string;
  onToggleLights: () => void;
  onToggleWipers: () => void;
  onToggleRearView: () => void;
  onOpenDoors: () => void;
  onRadioCheck: () => void;
  onSetRainIntensity: (val: number) => void;
  onAIEdit: (prompt: string) => void;
  isAiProcessing: boolean;
  aiResult: string | null;
  onCloseAIResult: () => void;
}

const HUD: React.FC<HUDProps> = ({ state }) => {
  return (
    <div className="fixed inset-0 pointer-events-none p-8 flex flex-col justify-between z-10">
      <div className="flex justify-between items-start">
        {/* Gear & Transmission Status */}
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl">
          <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Transmission</div>
          <div className="flex items-baseline gap-4">
            <span className="text-4xl font-mono text-white font-black">{state.gear}</span>
            <span className="text-xs font-bold text-slate-500">{state.transmission}</span>
          </div>
        </div>

        {/* Camera View Indicator */}
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-4">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
          <div className="text-[10px] font-black text-white uppercase tracking-[0.3em]">LIVE FEED: {state.cameraView}</div>
        </div>

        {/* Speedometer Cluster */}
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-6 rounded-3xl text-right">
          <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Velocity</div>
          <div className="text-5xl font-mono text-white tabular-nums font-black">{Math.round(Math.abs(state.speed))}</div>
          <div className="text-[10px] font-bold text-slate-500">KM/H</div>
        </div>
      </div>

      <div className="flex justify-between items-end">
        <div className="flex gap-4">
          <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-[10px] text-white font-bold uppercase tracking-widest">
            <span className="text-blue-400 mr-2">[M]</span> Switch Transmission
          </div>
          <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-[10px] text-white font-bold uppercase tracking-widest">
            <span className="text-blue-400 mr-2">[V]</span> Cycle Cameras
          </div>
        </div>
        
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-6 rounded-3xl min-w-[200px]">
          <div className="flex justify-between mb-2">
            <span className="text-[10px] font-black text-slate-500 uppercase">Engine RPM</span>
            <span className="text-[10px] font-mono text-white">{Math.round(state.rpm)}</span>
          </div>
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-red-500 transition-all duration-200" 
              style={{ width: `${(state.rpm / 6000) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HUD;
