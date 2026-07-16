// ============================================================
// components/Sidebar.jsx
// Komponen Navigasi Utama (Expandable on Hover di desktop,
// bottom tab bar di mobile)
// ============================================================
import React from 'react';
import { NavLink } from "react-router-dom"; // Menggunakan NavLink untuk deteksi URL otomatis
import { Settings, HelpCircle, LayoutDashboard, Users, Truck, ClipboardCheck, Zap, Cpu} from "lucide-react";

const menuItems = [
  { path: '/dashboard/live-tracking', label: 'Live Tracking', icon: <LayoutDashboard size={20} /> },
  { path: '/dashboard/drivers', label: 'Manajemen Supir', icon: <Users size={20} /> },
  { path: '/dashboard/fleets', label: 'Daftar Armada', icon: <Truck size={20} /> },
  { path: '/dashboard/approvals', label: 'Menu Approve', icon: <ClipboardCheck size={20} /> },
  { path: '/dashboard/locations', label: 'Manajemen Lokasi', icon: <Zap size={20} /> },
  { path: '/dashboard/devices', label: 'Monitoring IoT', icon: <Cpu size={20} /> },
];

export default function Sidebar() {
  return (
    <>
      {/* ─── RAIL KIRI (DESKTOP, >= md) ─── */}
      <aside className="hidden md:flex w-20 hover:w-64 h-full bg-white dark:bg-gray-900 border-r border-slate-200 dark:border-emerald-900/60 transition-all duration-300 ease-in-out flex-col group z-[2000] shrink-0 overflow-hidden">

        {/* ─── BRANDING HEADER ─── */}
        <div className="flex items-center gap-4 p-5 h-16 border-b border-slate-200 dark:border-gray-800 shrink-0">
          <img src="/assets/icone_gpstracking.png" alt="Brand Logo" className="w-12 h-12 rounded-full" />
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100 whitespace-nowrap overflow-hidden">
            <h1 className="font-bold text-sm text-emerald-600 dark:text-emerald-400 tracking-widest">PALMTRACK</h1>
            <p className="text-[10px] text-slate-500 dark:text-gray-500">Enterprise Dashboard</p>
          </div>
        </div>

        {/* ─── DAFTAR MENU (URL BASED) ─── */}
        <nav className="flex-1 w-full py-6 space-y-2 px-3 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {menuItems.map((item) => {
            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={item.label}
                // Fungsi class bawaan NavLink untuk menentukan style aktif berdasarkan URL browser
                className={({ isActive }) => `
                  w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-200 relative overflow-hidden block
                  ${isActive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-inner'
                    : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-800 dark:hover:text-gray-200'
                  }
                `}
              >
                {/* Logika Garis Penanda Aktif di Sebelah Kiri */}
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-r-md"></div>
                    )}

                    <span className="text-xl min-w-[24px] text-center ml-1">{item.icon}</span>

                    <span className="text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* ─── SETTINGS & SUPPORT (Bawah) ─── */}
        <div className="mt-auto border-t border-slate-200 dark:border-gray-800 p-3 flex flex-col gap-1 shrink-0 overflow-hidden bg-slate-50/50 dark:bg-gray-900/50">
          <button className="flex items-center gap-4 p-2 rounded-xl text-slate-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-gray-800 transition-all w-full group/item">
            <div className="w-10 h-10 min-w-[40px] flex items-center justify-center rounded-lg">
              <Settings size={20} />
            </div>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100 whitespace-nowrap text-sm font-bold tracking-wide">
              Settings
            </span>
          </button>

          <button className="flex items-center gap-4 p-2 rounded-xl text-slate-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-gray-800 transition-all w-full group/item">
            <div className="w-10 h-10 min-w-[40px] flex items-center justify-center rounded-lg">
              <HelpCircle size={20} />
            </div>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100 whitespace-nowrap text-sm font-bold tracking-wide">
              Support
            </span>
          </button>
        </div>

      </aside>

      {/* ─── BOTTOM TAB BAR (MOBILE, < md) ─── */}
      <nav className="flex md:hidden fixed bottom-0 inset-x-0 z-[2000] h-16 bg-white dark:bg-gray-900 border-t border-slate-200 dark:border-emerald-900/60 items-center justify-around px-1 shrink-0">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            title={item.label}
            className={({ isActive }) => `
              flex flex-col items-center justify-center gap-0.5 flex-1 h-full rounded-lg transition-colors
              ${isActive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-500 dark:text-gray-400'
              }
            `}
          >
            {item.icon}
            <span className="text-[9px] font-semibold leading-none">{item.label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
