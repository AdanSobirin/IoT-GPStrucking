// ============================================================
// components/TruckSidebar.jsx
// ============================================================
import React, { useState } from 'react';
import { Truck, User, Gauge, Circle, X } from 'lucide-react';

export default function TruckSidebar({ trucks, selectedTruck, onSelectTruck }) {
  // Di mobile, panel ini default tertutup (cuma pil kecil) supaya peta tetap
  // terlihat penuh. Di desktop (md+) selalu terbuka, state ini diabaikan.
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* ─── PIL RINGKAS (MOBILE, saat panel tertutup) ─── */}
      {!mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-slate-200 dark:border-gray-800 shadow-2xl text-slate-700 dark:text-gray-200 text-xs font-bold"
        >
          <Truck size={16} className="text-emerald-600 dark:text-emerald-400" />
          Armada ({trucks.length})
        </button>
      )}

      {/* ─── PANEL DAFTAR ARMADA (selalu terbuka di desktop, toggle di mobile) ─── */}
      <div
        className={`${mobileOpen ? 'flex' : 'hidden'} md:flex w-[85vw] max-w-xs md:w-72 max-h-[60vh] md:h-[calc(100vh-140px)] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-slate-200 dark:border-gray-800 rounded-2xl shadow-2xl flex-col overflow-hidden`}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-950/30 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em]">Armada Aktif</h2>
            <p className="text-[10px] text-slate-500 dark:text-gray-500 mt-0.5">{trucks.length} Unit Terdeteksi</p>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-slate-400 hover:text-slate-700 dark:hover:text-gray-200 transition-colors"
          >
            <X size={18} />
          </button>
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
                    : 'bg-slate-100/70 dark:bg-gray-800/40 border-slate-200 dark:border-gray-700/50 hover:border-slate-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <Truck size={16} className={isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-gray-400'} />
                    <span className={`font-bold text-sm ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-gray-200'}`}>
                      {truck.plate}
                    </span>
                  </div>
                  {/* Status Indicator dengan efek pulse */}
                  <div className="flex items-center gap-1.5">
                    <Circle size={8} className={`${isLoading ? 'fill-emerald-500 text-emerald-500 animate-pulse' : 'fill-slate-400 dark:fill-gray-600 text-slate-400 dark:text-gray-600'}`} />
                    <span className={`text-[9px] font-bold uppercase ${isLoading ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-gray-500'}`}>
                      {isLoading ? 'Jalan' : 'Idle'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 dark:text-gray-500 bg-slate-200/40 dark:bg-black/20 p-2 rounded-lg">
                  <div className="flex items-center gap-1.5">
                    <User size={12} className="text-slate-400 dark:text-gray-600" />
                    <span className="truncate">{truck.driver || 'No Driver'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <Gauge size={12} className="text-slate-400 dark:text-gray-600" />
                    <span>{truck.speed || 0} km/h</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
