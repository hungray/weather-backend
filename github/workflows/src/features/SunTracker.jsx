import React, { useState, useEffect } from 'react';
import { Sunrise, Sunset, Moon, Sun } from 'lucide-react';

const SunTracker = ({ weatherData, isDark }) => {
  const [timeLeftStr, setTimeLeftStr] = useState('');
  const [nextEvent, setNextEvent] = useState(null); // { type: 'sunset' | 'sunrise', time: Date }
  const [sunPosition, setSunPosition] = useState({ x: 0, y: 0 });
  const [percentage, setPercentage] = useState(0); // 0 to 100 for day path

  useEffect(() => {
    if (!weatherData?.daily?.sunrise?.[0]) return;

    const updateSunTracker = () => {
      const now = new Date();
      const sunriseStr = weatherData.daily.sunrise[0];
      const sunsetStr = weatherData.daily.sunset[0];

      const sunrise = new Date(sunriseStr);
      const sunset = new Date(sunsetStr);

      // Determine next event
      let targetEvent = null;
      if (now < sunrise) {
        targetEvent = { type: 'sunrise', time: sunrise, label: 'الشروق' };
      } else if (now >= sunrise && now < sunset) {
        targetEvent = { type: 'sunset', time: sunset, label: 'الغروب' };
      } else {
        // Next day's sunrise (approximate or just add 24 hours if not in array, or check daily[1])
        const tomorrowSunriseStr = weatherData.daily.sunrise[1];
        const tomorrowSunrise = tomorrowSunriseStr ? new Date(tomorrowSunriseStr) : new Date(sunrise.getTime() + 24 * 60 * 60 * 1000);
        targetEvent = { type: 'sunrise', time: tomorrowSunrise, label: 'الشروق' };
      }
      setNextEvent(targetEvent);

      // Countdown
      const diffMs = targetEvent.time - now;
      if (diffMs > 0) {
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
        
        let timeString = '';
        if (hours > 0) timeString += `${hours} ساعة و `;
        timeString += `${minutes} دقيقة`;
        if (hours === 0 && minutes < 5) timeString += ` و ${seconds} ثانية`;
        
        setTimeLeftStr(timeString);
      } else {
        setTimeLeftStr('الآن');
      }

      // Calculate path percentage (0% at sunrise, 100% at sunset)
      if (now >= sunrise && now <= sunset) {
        const totalDuration = sunset - sunrise;
        const currentProgress = now - sunrise;
        const pct = (currentProgress / totalDuration) * 100;
        setPercentage(pct);

        // Map percentage to semicircle SVG coordinates
        // SVG width = 300, height = 120. Semicircle: cx=150, cy=120, r=100. Angle from 180 (left) to 0 (right)
        const angleRad = Math.PI - (pct / 100) * Math.PI;
        const r = 100;
        const cx = 150;
        const cy = 120;
        const x = cx + r * Math.cos(angleRad);
        const y = cy - r * Math.sin(angleRad);
        setSunPosition({ x, y });
      } else {
        setPercentage(-1); // Night time
      }
    };

    updateSunTracker();
    const interval = setInterval(updateSunTracker, 1000);
    return () => clearInterval(interval);
  }, [weatherData]);

  if (!weatherData?.daily?.sunrise?.[0]) return null;

  const sunriseTime = new Date(weatherData.daily.sunrise[0]).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
  const sunsetTime = new Date(weatherData.daily.sunset[0]).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });

  const isDay = percentage >= 0 && percentage <= 100;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4 px-2">
        <Sun className="w-6 h-6 text-yellow-500 animate-spin-slow" />
        <h3 className={`font-black text-xl tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
          متتبع مسار الشمس الحي
        </h3>
      </div>

      <div className={`backdrop-blur-2xl border shadow-lg rounded-4xl p-6 glass-panel relative overflow-hidden`}>
        {/* Decorative backdrop glow */}
        <div className={`absolute -right-20 -top-20 w-48 h-48 rounded-full blur-3xl opacity-20 ${isDay ? 'bg-amber-400' : 'bg-indigo-500'}`} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Semicircle Track */}
          <div className="flex justify-center relative py-4">
            <svg width="300" height="130" viewBox="0 0 300 130" className="overflow-visible">
              <defs>
                <linearGradient id="sunPathGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="50%" stopColor="#eab308" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>
              
              {/* Ground level line */}
              <line x1="20" y1="120" x2="280" y2="120" stroke={isDark ? '#334155' : '#cbd5e1'} strokeWidth="2" strokeDasharray="5 5" />
              
              {/* Semicircle Sun Path */}
              <path
                d="M 50,120 A 100,100 0 0,1 250,120"
                fill="none"
                stroke={isDark ? '#334155' : '#cbd5e1'}
                strokeWidth="4"
                strokeLinecap="round"
              />

              {/* Colored active path */}
              {isDay && (
                <path
                  d={`M 50,120 A 100,100 0 0,1 ${sunPosition.x},${sunPosition.y}`}
                  fill="none"
                  stroke="url(#sunPathGrad)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 0.5s ease-out' }}
                />
              )}

              {/* Sunrise icon & label */}
              <g transform="translate(50, 120)">
                <circle r="4" fill="#f59e0b" />
              </g>

              {/* Sunset icon & label */}
              <g transform="translate(250, 120)">
                <circle r="4" fill="#ef4444" />
              </g>

              {/* Dynamic Sun representation */}
              {isDay ? (
                <g transform={`translate(${sunPosition.x}, ${sunPosition.y})`}>
                  <circle r="12" fill="#f59e0b" className="animate-pulse" style={{ filter: 'drop-shadow(0 0 8px #f59e0b)' }} />
                  <circle r="6" fill="#fff" />
                </g>
              ) : (
                <g transform="translate(150, 120)">
                  {/* Moon resting below ground level */}
                  <circle r="10" fill="#38bdf8" style={{ filter: 'drop-shadow(0 0 6px #38bdf8)', opacity: 0.7 }} />
                </g>
              )}
            </svg>
          </div>

          {/* Time Countdown Info */}
          <div className="flex flex-col justify-center text-center md:text-right">
            <span className={`text-xs font-black uppercase tracking-wider mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              الحدث القادم: {nextEvent?.label}
            </span>
            <span className={`text-2xl font-black mb-3 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
              متبقي {timeLeftStr}
            </span>
            
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className={`p-3 rounded-2xl border flex items-center gap-3 ${isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-white/50 border-slate-200/60'}`}>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <Sunrise className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <p className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>الشروق</p>
                  <p className={`text-sm font-black ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{sunriseTime}</p>
                </div>
              </div>

              <div className={`p-3 rounded-2xl border flex items-center gap-3 ${isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-white/50 border-slate-200/60'}`}>
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                  <Sunset className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <p className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>الغروب</p>
                  <p className={`text-sm font-black ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{sunsetTime}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SunTracker;
