
import React, { useState, useRef } from 'react';
import { DRIVERS, BUSES } from '../constants';
import { Driver, Bus } from '../types';
import { getDriverIntroAudio, decodeBase64, decodeAudioData } from '../services/geminiService';

interface MenuProps {
  onStart: (driver: Driver, bus: Bus) => void;
}

const Menu: React.FC<MenuProps> = ({ onStart }) => {
  const [selectedDriver, setSelectedDriver] = useState<Driver>(DRIVERS[0]);
  const [selectedBus, setSelectedBus] = useState<Bus>(BUSES[0]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playDriverIntro = async (driver: Driver) => {
    setSelectedDriver(driver);
    setIsSpeaking(true);

    const base64Audio = await getDriverIntroAudio(driver);
    if (!base64Audio) {
      setIsSpeaking(false);
      return;
    }

    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioCtxRef.current;
      const audioData = decodeBase64(base64Audio);
      const audioBuffer = await decodeAudioData(audioData, ctx);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => setIsSpeaking(false);
      source.start();
    } catch (err) {
      console.error("Audio playback error:", err);
      setIsSpeaking(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-95 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-slate-800 rounded-3xl border border-slate-700 w-full max-w-5xl p-10 shadow-[0_0_100px_rgba(0,0,0,0.5)]">
        <h1 className="text-5xl font-black text-white mb-10 text-center tracking-tighter uppercase italic">
          <span className="bg-gradient-to-r from-blue-400 via-white to-emerald-400 bg-clip-text text-transparent">
            Global Bus Simulator
          </span>
          <div className="text-xs font-bold text-slate-500 mt-2 tracking-[0.5em] not-italic">City to Village Express</div>
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Driver Selection */}
          <section className="space-y-6">
            <h2 className="text-xl font-bold text-white uppercase tracking-widest border-l-4 border-blue-500 pl-4">Select Driver</h2>
            <div className="grid grid-cols-2 gap-4">
              {DRIVERS.map((d) => (
                <button
                  key={d.name}
                  onClick={() => playDriverIntro(d)}
                  className={`relative p-5 rounded-2xl transition-all duration-300 border-2 group overflow-hidden ${
                    selectedDriver.name === d.name 
                    ? 'border-blue-500 bg-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.3)] scale-[1.02]' 
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="relative">
                      <img 
                        src={d.avatar} 
                        alt={d.name} 
                        className={`w-16 h-16 rounded-full mb-3 border-2 transition-all ${
                          selectedDriver.name === d.name ? 'border-blue-400' : 'border-slate-600'
                        }`} 
                      />
                      {selectedDriver.name === d.name && isSpeaking && (
                        <div className="absolute inset-0 rounded-full border-4 border-blue-400 animate-ping opacity-75"></div>
                      )}
                    </div>
                    <div className="font-bold text-white text-lg">{d.name}</div>
                    <div className="text-xs text-blue-400 font-bold uppercase tracking-wider">{d.origin}</div>
                  </div>
                  {/* Subtle Background Accent */}
                  <div className={`absolute top-0 right-0 w-16 h-16 -mr-8 -mt-8 rounded-full transition-opacity duration-500 ${
                    selectedDriver.name === d.name ? 'bg-blue-500/10 opacity-100' : 'opacity-0'
                  }`}></div>
                </button>
              ))}
            </div>
            <div className="p-5 bg-slate-900/80 rounded-2xl border border-slate-700/50 min-h-[80px] flex items-center justify-center">
              <p className="text-slate-300 italic text-center leading-relaxed">
                "{selectedDriver.bio}"
              </p>
            </div>
          </section>

          {/* Bus Selection */}
          <section className="space-y-6">
            <h2 className="text-xl font-bold text-white uppercase tracking-widest border-l-4 border-emerald-500 pl-4">Select Vehicle</h2>
            <div className="space-y-4">
              {BUSES.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBus(b)}
                  className={`w-full p-6 rounded-2xl transition-all duration-300 border-2 flex items-center gap-6 group ${
                    selectedBus.id === b.id 
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.2)]' 
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <div className={`text-5xl transition-transform duration-500 ${selectedBus.id === b.id ? 'scale-110 rotate-3' : 'group-hover:scale-105'}`}>
                    {b.image}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-bold text-white text-xl">{b.name}</div>
                    <div className="flex gap-4 mt-1">
                      <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-bold uppercase">Size: {b.size}</span>
                      <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-bold uppercase">Cap: {b.capacity}</span>
                    </div>
                  </div>
                  {selectedBus.id === b.id ? (
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-slate-700 group-hover:border-slate-500"></div>
                  )}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-12 flex flex-col items-center gap-4">
          <button
            onClick={() => onStart(selectedDriver, selectedBus)}
            className="group relative px-20 py-5 bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-black rounded-full hover:scale-105 active:scale-95 transition-all shadow-2xl text-xl tracking-widest uppercase overflow-hidden"
          >
            <span className="relative z-10">Start Journey</span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          </button>
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">Ready to Depart: {selectedDriver.name} in {selectedBus.name}</div>
        </div>
      </div>
    </div>
  );
};

export default Menu;
