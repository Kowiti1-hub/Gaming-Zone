
import React from 'react';
import { DRIVERS, BUSES } from '../constants';
import { Driver, Bus, DriverName } from '../types';

interface MenuProps {
  onStart: (driver: Driver, bus: Bus) => void;
}

const Menu: React.FC<MenuProps> = ({ onStart }) => {
  const [selectedDriver, setSelectedDriver] = React.useState<Driver>(DRIVERS[0]);
  const [selectedBus, setSelectedBus] = React.useState<Bus>(BUSES[0]);

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-90 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-4xl p-8 shadow-2xl">
        <h1 className="text-4xl font-bold text-white mb-8 text-center bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          Global Bus Simulator
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Driver Selection */}
          <section>
            <h2 className="text-xl font-semibold text-slate-300 mb-4 border-b border-slate-700 pb-2">Select Your Driver</h2>
            <div className="grid grid-cols-2 gap-4">
              {DRIVERS.map((d) => (
                <button
                  key={d.name}
                  onClick={() => setSelectedDriver(d)}
                  className={`p-4 rounded-xl transition-all border-2 text-left ${
                    selectedDriver.name === d.name 
                    ? 'border-blue-500 bg-blue-500/10' 
                    : 'border-slate-700 bg-slate-700/30 hover:bg-slate-700/50'
                  }`}
                >
                  <img src={d.avatar} alt={d.name} className="w-12 h-12 rounded-full mb-3" />
                  <div className="font-bold text-white">{d.name}</div>
                  <div className="text-xs text-slate-400">{d.origin}</div>
                </button>
              ))}
            </div>
            <div className="mt-4 p-3 bg-slate-900/50 rounded-lg text-sm text-slate-300 italic">
              "{selectedDriver.bio}"
            </div>
          </section>

          {/* Bus Selection */}
          <section>
            <h2 className="text-xl font-semibold text-slate-300 mb-4 border-b border-slate-700 pb-2">Select Your Vehicle</h2>
            <div className="space-y-4">
              {BUSES.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBus(b)}
                  className={`w-full p-4 rounded-xl transition-all border-2 flex items-center gap-4 ${
                    selectedBus.id === b.id 
                    ? 'border-emerald-500 bg-emerald-500/10' 
                    : 'border-slate-700 bg-slate-700/30 hover:bg-slate-700/50'
                  }`}
                >
                  <div className="text-4xl">{b.image}</div>
                  <div className="flex-1 text-left">
                    <div className="font-bold text-white">{b.name}</div>
                    <div className="text-xs text-slate-400">Size: {b.size} | Cap: {b.capacity}</div>
                  </div>
                  {selectedBus.id === b.id && (
                    <div className="bg-emerald-500 text-white text-[10px] px-2 py-1 rounded font-bold">DEFAULT</div>
                  )}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-12 flex justify-center">
          <button
            onClick={() => onStart(selectedDriver, selectedBus)}
            className="px-12 py-4 bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-bold rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg text-lg"
          >
            START JOURNEY
          </button>
        </div>
      </div>
    </div>
  );
};

export default Menu;
