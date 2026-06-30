// ============================================================
// components/TruckSidebar.jsx
// ============================================================
import React from 'react';
import { Truck, User, Gauge, Circle } from 'lucide-react';

export default function TruckSidebar({ trucks, selectedTruck, onSelectTruck }) {
  return (
    <div className="w-72 h-[calc(100vh-140px)] bg-gray-900/95 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-gray-800 bg-gray-950/30">
        <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-[0.2em]">Armada Aktif</h2>
        <p className="text-[10px] text-gray-500 mt-0.5">{trucks.length} Unit Terdeteksi</p>
      </div>

      {/* List Truk */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {trucks.map((truck) => {
          const isSelected = selectedTruck?.id === truck.id;
          const isLoading = truck.status === 'loading';

          return (
            <button
              key={truck.id}
              onClick={() => onSelectTruck(truck)}
              className={`w-full p-4 rounded-xl transition-all border duration-200 group ${
                isSelected 
                  ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                  : 'bg-gray-800/40 border-gray-700/50 hover:border-gray-600'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <Truck size={16} className={isSelected ? 'text-emerald-400' : 'text-gray-400'} />
                  <span className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                    {truck.plate}
                  </span>
                </div>
                {/* Status Indicator dengan efek pulse */}
                <div className="flex items-center gap-1.5">
                  <Circle size={8} className={`${isLoading ? 'fill-emerald-500 text-emerald-500 animate-pulse' : 'fill-gray-600 text-gray-600'}`} />
                  <span className={`text-[9px] font-bold uppercase ${isLoading ? 'text-emerald-400' : 'text-gray-500'}`}>
                    {isLoading ? 'Jalan' : 'Idle'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500 bg-black/20 p-2 rounded-lg">
                <div className="flex items-center gap-1.5">
                  <User size={12} className="text-gray-600" />
                  <span className="truncate">{truck.driver || 'No Driver'}</span>
                </div>
                <div className="flex items-center gap-1.5 justify-end">
                  <Gauge size={12} className="text-gray-600" />
                  <span>{truck.speed || 0} km/h</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}