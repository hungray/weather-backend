import { Link, useLocation } from 'react-router-dom';
import React from 'react';

export default function NavItem({ to, icon, label, isDark }) {
  const location = useLocation();
  const isActive = location.pathname === to || (to === '/' && location.pathname.includes('/day-details'));
  return (
    <Link to={to} className={`flex flex-col items-center justify-center w-16 h-16 lg:w-16 lg:h-16 rounded-[24px] lg:rounded-[20px] active:scale-90 transition-all duration-500 ${isActive ? (isDark ? 'bg-gradient-to-tr from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/30 animate-glow-pulse' : 'bg-gradient-to-tr from-orange-500 to-amber-500 shadow-lg shadow-orange-500/40 animate-glow-pulse') : (isDark ? 'hover:bg-slate-700 hover:shadow-lg' : 'hover:bg-slate-50 hover:shadow-lg')}`}>
      {React.cloneElement(icon, { className: `w-6 h-6 lg:w-6 lg:h-6 mb-1 transition-all duration-300 ${isActive ? 'text-white scale-110 drop-shadow-md' : (isDark ? 'text-slate-400' : 'text-slate-400')}`, strokeWidth: isActive ? 2.5 : 2 })}
      <span className={`text-[10px] font-black tracking-wide ${isActive ? 'text-white' : (isDark ? 'text-slate-400' : 'text-slate-400')}`}>{label}</span>
    </Link>
  );
}
