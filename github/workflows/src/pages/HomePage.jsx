import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CloudRain, Wind, MapPin, Activity, Droplets, Gauge, Sun, Moon, Calendar, Sunrise, Sunset, ArrowRight, Loader2 } from 'lucide-react';
import AIWeatherAgent from '../AIWeatherAgent';
import AQICard from '../features/AQICard';
import { getWeatherDesc } from '../utils/weatherUtils';

import FavoriteCities from '../features/FavoriteCities';
import SunTracker from '../features/SunTracker';
import WeatherInsights from '../features/ActivityGauges'; // Replaced with WeatherInsights previously, though still named ActivityGauges in path
import WeatherChart from '../features/WeatherChart';
import WeatherShareCard from '../features/WeatherShareCard';
import WeatherAlerts from '../features/WeatherAlerts';
import MiniRadar from '../features/MiniRadar';

const HomePage = ({ isDark, selectedCity, weatherData, onSelectCity, windUnit, rainUnit, pressureUnit }) => {
  const navigate = useNavigate();
  const [expandedDay, setExpandedDay] = useState(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedMinuteIndex, setSelectedMinuteIndex] = useState(0);
  // Keep selectedMinuteIndex within bounds when minutely length changes.
  useEffect(() => {
    const minutelyLen = weatherData?.minutely?.time?.length || 0;
    if (minutelyLen === 0 && selectedMinuteIndex !== 0) {
      setSelectedMinuteIndex(0);
    } else if (selectedMinuteIndex >= Math.min(120, minutelyLen)) {
      setSelectedMinuteIndex(0);
    }
  }, [weatherData?.minutely?.time?.length]);
  
  const cardBg = isDark ? 'bg-slate-800/80 border-slate-700 text-white' : 'bg-white/80 border-slate-200 text-slate-800';
  const textColor = isDark ? 'text-slate-100' : 'text-slate-800';
  const subTextColor = isDark ? 'text-slate-400' : 'text-slate-500';

  const current = weatherData?.current || {};
  const dailyData = weatherData?.daily || {};

  if (!weatherData || !weatherData.current) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] animate-in fade-in duration-500">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
        <p className={`font-bold text-lg ${textColor}`}>جاري إحضار بيانات عالية الدقة للموقع...</p>
      </div>
    );
  }

  const targetDay = dailyData?.time?.[selectedDayIndex] ? selectedDayIndex : 0;
  
  const currentTemp = selectedDayIndex === 0 && current.temperature_2m !== undefined ? Math.round(current.temperature_2m) : (dailyData.temperature_2m_max?.[targetDay] !== undefined ? Math.round(dailyData.temperature_2m_max[targetDay]) : "--");
  const feelsLike = selectedDayIndex === 0 && current.apparent_temperature !== undefined ? Math.round(current.apparent_temperature) : (dailyData.apparent_temperature_max?.[targetDay] !== undefined ? Math.round(dailyData.apparent_temperature_max[targetDay]) : "--");
  const windSpeed = selectedDayIndex === 0 && current.wind_speed_10m !== undefined ? Math.round(current.wind_speed_10m) : (dailyData.wind_speed_10m_max?.[targetDay] !== undefined ? Math.round(dailyData.wind_speed_10m_max[targetDay]) : "--");
  const pressure = selectedDayIndex === 0 && current.surface_pressure !== undefined ? Math.round(current.surface_pressure) : "--";
  const humidity = selectedDayIndex === 0 && current.relative_humidity_2m !== undefined ? Math.round(current.relative_humidity_2m) : "--";
  
  const wCode = selectedDayIndex === 0 ? (current.weathercode ?? current.weather_code) : (dailyData.weather_code?.[targetDay] ?? dailyData.weathercode?.[targetDay]);
  const currentCondition = getWeatherDesc(wCode, selectedDayIndex === 0 ? current.is_day : 1);
  const CurrentIcon = currentCondition.icon || Sun;
  const currentTheme = currentCondition.theme || 'from-orange-500 to-amber-500';

  const displayTimeZone = weatherData?.timezone || undefined;
  const formatLocalTime = (timeString) => {
    if (!timeString) return '--';
    const date = new Date(timeString);
    if (!isNaN(date.getTime()) && displayTimeZone) {
      return new Intl.DateTimeFormat('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: displayTimeZone }).format(date);
    }
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    const parts = timeString.split('T');
    return parts[1]?.slice(0, 5) || timeString;
  };

  const precipUnitLabel = rainUnit?.id === 'inch' ? 'بوصة' : 'ملم';
  const precipUnitShort = rainUnit?.id === 'inch' ? 'in' : 'mm';
  const formatPrecipValue = (value) => {
    const number = Number(value ?? 0);
    return number === 0 ? '0' : number.toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  };

  // MinuteCast - Next 2 Hours (minute-level precipitation)
  const minutelyTime = weatherData?.minutely?.time || [];
  const minutelyPrecip = weatherData?.minutely?.precipitation || [];
  const now = new Date();
  
  // Create MinuteCast Data
  let minuteCastData = [];
  const maxMinutes = 120;

  if (minutelyTime.length > 0) {
    // Determine the interval in minutes (usually 15 for minutely_15)
    let intervalMins = 15;
    if (minutelyTime.length > 1) {
       intervalMins = Math.max(1, Math.round((new Date(minutelyTime[1]) - new Date(minutelyTime[0])) / 60000));
    }

    const currentMinIdx = minutelyTime.findIndex(t => new Date(t) >= now);
    const startIdx = currentMinIdx !== -1 ? currentMinIdx : 0;

    for (let m = 0; m < maxMinutes; m++) {
      const dataIndex = startIdx + Math.floor(m / intervalMins);
      if (dataIndex < minutelyTime.length) {
        // Divide precipitation by the interval so it's a per-minute rate
        const perMinute = Number((Number(minutelyPrecip[dataIndex] ?? 0) / intervalMins).toFixed(2));
        const t = new Date(now.getTime() + m * 60000);
        minuteCastData.push({
          time: formatLocalTime(t.toISOString()),
          precip: perMinute,
          idx: m
        });
      }
    }
  }

  // Fallback: if no minutely data, derive minute-level from hourly by dividing each hour's precipitation by 60
  if (minuteCastData.length === 0) {
    const hourlyTime = weatherData?.hourly?.time || [];
    const hourlyPrecip = weatherData?.hourly?.precipitation || weatherData?.hourly?.precipitation_sum || [];
    if (hourlyTime.length > 0 && hourlyPrecip.length > 0) {
      const currentHourIdx = hourlyTime.findIndex(t => new Date(t) >= now);
      const startHour = currentHourIdx !== -1 ? currentHourIdx : 0;
      const maxMinutes = 120;
      for (let m = 0; m < maxMinutes; m++) {
        const hourIndex = startHour + Math.floor(m / 60);
        if (hourIndex < hourlyPrecip.length) {
          const perMinute = Number((Number(hourlyPrecip[hourIndex] ?? 0) / 60).toFixed(2));
          const t = new Date(now.getTime() + m * 60000);
          minuteCastData.push({ time: formatLocalTime(t.toISOString()), precip: perMinute, idx: m });
        }
      }
    }
  }

  const selectedMinute = minuteCastData[selectedMinuteIndex] || {};
  const selectedMinuteTime = selectedMinute.time || '--';
  const selectedMinuteLabel = selectedMinute.precip > 0 ? `${formatPrecipValue(selectedMinute.precip)} ${precipUnitLabel}` : 'لا أمطار';

  // 15-day forecast mapping
  const dailyForecast = Array.from({ length: 15 }).map((_, index) => {
    if (!dailyData || !dailyData.time || !dailyData.time[index]) return null;

    let dayName = '--'; let fullDate = '--'; let sunriseTime = '--'; let sunsetTime = '--';
    try {
      const date = new Date(dailyData.time[index]);
      if (!isNaN(date.getTime())) {
        dayName = index === 0 ? 'اليوم' : index === 1 ? 'غدا' : new Intl.DateTimeFormat('ar-EG', { weekday: 'long' }).format(date);
        fullDate = date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
      }
      if (dailyData.sunrise?.[index]) sunriseTime = new Date(dailyData.sunrise[index]).toLocaleTimeString('ar-EG', { hour: '2-digit', minute:'2-digit' });
      if (dailyData.sunset?.[index]) sunsetTime = new Date(dailyData.sunset[index]).toLocaleTimeString('ar-EG', { hour: '2-digit', minute:'2-digit' });
    } catch(e) {}

    const maxTemp = dailyData.temperature_2m_max?.[index] !== undefined ? Math.round(dailyData.temperature_2m_max[index]) : "--";
    const minTemp = dailyData.temperature_2m_min?.[index] !== undefined ? Math.round(dailyData.temperature_2m_min[index]) : "--";
    const uvIndex = dailyData.uv_index_max?.[index] !== undefined ? Math.round(dailyData.uv_index_max[index]) : "--";
    const precipProb = dailyData.precipitation_probability_max?.[index] !== undefined ? Math.round(dailyData.precipitation_probability_max[index]) : 0;
    const windMax = dailyData.wind_speed_10m_max?.[index] !== undefined ? Math.round(dailyData.wind_speed_10m_max[index]) : "--";
    const precipSum = dailyData.precipitation_sum?.[index] !== undefined ? dailyData.precipitation_sum[index] : 0;

    const wCode = dailyData.weather_code?.[index] ?? dailyData.weathercode?.[index];
    const condition = getWeatherDesc(wCode, 1); // Always use day icon for daily summary

    return {
      fullDate, day: dayName, maxTemp, minTemp, uvIndex, precipProb, windMax, precipSum,
      sunrise: sunriseTime, sunset: sunsetTime, desc: condition.desc, icon: condition.icon, color: condition.color
    };
  }).filter(Boolean);

  const Forecast15DayComponent = (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-500" />
            <h3 className={`font-black text-lg tracking-tight ${textColor}`}>توقعات 15 يوماً</h3>
          </div>
        </div>

        <div className="space-y-2 max-h-[85vh] overflow-y-auto pr-1 pb-10 scrollbar-hide">
          {dailyForecast.map((item, i) => {
            const IconComp = item.icon || Sun;
            const isExpanded = expandedDay === i;

            return (
              <div key={i} className="flex flex-col">
                <div
                  onClick={() => { 
                    if (item.maxTemp !== '--') {
                      setExpandedDay(isExpanded ? null : i); 
                      setSelectedDayIndex(isExpanded ? 0 : i);
                    }
                  }}
                  className={`border p-3 sm:p-4 flex flex-row items-center justify-between gap-2 cursor-pointer transition-all ${cardBg} ${isExpanded ? 'rounded-t-2xl border-b-0 bg-slate-50 dark:bg-slate-800' : 'rounded-2xl hover:border-orange-500/30 hover:shadow-sm'}`}
                >
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 overflow-hidden">
                    <IconComp className={`w-6 h-6 sm:w-7 sm:h-7 ${item.color} shrink-0`} />
                    <div className="min-w-0 flex-1">
                      <p className={`font-black text-xs sm:text-sm truncate ${textColor}`}>{item.day}</p>
                      <p className={`text-[9px] sm:text-[10px] font-bold truncate ${subTextColor}`}>{item.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 sm:gap-4 shrink-0">
                    <div className="hidden sm:flex items-center gap-3 min-w-0">
                       <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 min-w-0" title="سرعة الرياح"><Wind className="w-3 h-3"/> {item.windMax}</span>
                       <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 min-w-0" title="مؤشر الأشعة"><Sun className="w-3 h-3"/> {item.uvIndex}</span>
                    </div>
                    {item.precipProb > 0 ? (
                      <span className="text-[10px] sm:text-xs font-black text-blue-500 flex items-center gap-0.5"><Droplets className="w-3 h-3"/> {item.precipProb}%</span>
                    ) : (
                      <span className="text-[10px] sm:text-xs font-bold text-slate-300 flex items-center gap-0.5"><Droplets className="w-3 h-3"/> 0%</span>
                    )}
                    <div className="flex gap-1.5 sm:gap-3 text-xs sm:text-sm font-black justify-end w-[55px] sm:w-[65px]">
                      <span className={textColor}>{item.maxTemp}°</span>
                      <span className={subTextColor}>{item.minTemp}°</span>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className={`p-4 border border-t-0 rounded-b-2xl animate-in slide-in-from-top-2 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className={`p-3 rounded-xl border flex flex-col items-center ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-100'}`}>
                        <Sunrise className="w-5 h-5 text-yellow-500 mb-1" />
                        <span className={`text-[10px] font-bold ${subTextColor}`}>الشروق</span>
                        <span className={`text-sm font-black ${textColor}`}>{item.sunrise}</span>
                      </div>
                      <div className={`p-3 rounded-xl border flex flex-col items-center ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-100'}`}>
                        <Sunset className="w-5 h-5 text-orange-500 mb-1" />
                        <span className={`text-[10px] font-bold ${subTextColor}`}>الغروب</span>
                        <span className={`text-sm font-black ${textColor}`}>{item.sunset}</span>
                      </div>
                      <div className={`p-3 rounded-xl border flex flex-col items-center ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-100'}`}>
                        <Wind className="w-5 h-5 text-sky-500 mb-1" />
                        <span className={`text-[10px] font-bold ${subTextColor}`}>أقصى سرعة للرياح</span>
                        <span className={`text-sm font-black ${textColor}`}>{item.windMax} {windUnit?.label?.split(' ')[0] || 'كم/س'}</span>
                      </div>
                      <div className={`p-3 rounded-xl border flex flex-col items-center ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-100'}`}>
                        <Droplets className="w-5 h-5 text-blue-500 mb-1" />
                        <span className={`text-[10px] font-bold ${subTextColor}`}>كمية المطر</span>
                        <span className={`text-sm font-black ${textColor}`}>{item.precipSum} {rainUnit?.id === 'inch' ? 'بوصة' : 'ملم'}</span>
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/day-details/${i}`); }} className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl flex justify-center items-center gap-2 transition-colors">
                      عرض تفاصيل اليوم بالكامل <ArrowRight className="w-4 h-4"/>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-700 pb-28 lg:pb-10 lg:grid lg:grid-cols-12 lg:gap-8 items-start">
      <div className="lg:col-span-8">
        
        <WeatherAlerts weatherData={weatherData} isDark={isDark} selectedDayIndex={selectedDayIndex} windUnit={windUnit} rainUnit={rainUnit} pressureUnit={pressureUnit} />
        
        <FavoriteCities selectedCity={selectedCity} onSelectCity={onSelectCity} isDark={isDark} />

        {/* Hero Dashboard */}
        <div className={`relative overflow-hidden rounded-[32px] p-6 lg:p-10 mb-8 border transition-all duration-500 ${isDark ? 'bg-slate-900 border-slate-800 shadow-2xl text-white' : `bg-gradient-to-br ${currentTheme} border-orange-400 shadow-xl shadow-slate-500/10 text-white`}`}>
          <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.05] pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 transition-colors min-w-0">
                <MapPin className="w-4 h-4 text-orange-400 shrink-0" />
                <p className="text-sm font-bold tracking-wide truncate max-w-[200px]">{selectedCity?.name?.split('،')[0] || 'غير معروف'}</p>
              </button>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${selectedDayIndex === 0 ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-white/10 border-white/20 text-white'}`}>
                {selectedDayIndex === 0 && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
                <p className="text-[10px] font-bold tracking-wider">{selectedDayIndex === 0 ? 'مباشر • دقة عالية' : `توقعات يوم ${dailyForecast[selectedDayIndex]?.day}`}</p>
              </div>
            </div>

            <div className="flex justify-between items-center w-full mb-8">
              <div>
                <h3 className="text-8xl lg:text-[110px] leading-none font-black tracking-tighter">{currentTemp}°</h3>
                <p className="text-base font-bold text-slate-400 mt-2">الإحساس الفعلي {feelsLike}°</p>
              </div>
              <div className="flex flex-col items-center">
                <CurrentIcon className="w-24 h-24 lg:w-32 lg:h-32 text-white drop-shadow-xl mb-4" strokeWidth={1} />
                <h4 className="text-lg lg:text-xl font-bold bg-white/10 px-5 py-2 rounded-2xl border border-white/10 backdrop-blur-sm">{currentCondition.desc}</h4>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col items-center">
                <Wind className="w-5 h-5 text-sky-400 mb-2" />
                <span className="text-[10px] text-slate-200 font-bold mb-1">الرياح</span>
                <span className="font-black text-sm">{windSpeed} {windUnit?.label?.split(' ')[0] || 'كم/س'}</span>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col items-center">
                <Sun className="w-5 h-5 text-yellow-300 mb-2" />
                <span className="text-[10px] text-slate-200 font-bold mb-1">الأشعة (UV)</span>
                <span className="font-black text-sm">{dailyForecast[selectedDayIndex]?.uvIndex ?? '--'}</span>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col items-center">
                <Droplets className="w-5 h-5 text-blue-300 mb-2" />
                <span className="text-[10px] text-slate-200 font-bold mb-1">فرصة المطر</span>
                <span className="font-black text-sm">{dailyForecast[selectedDayIndex]?.precipProb ?? 0}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* MinuteCast (Next 2 hours) */}
          <div className={`mb-8 p-5 sm:p-8 rounded-[32px] border transition-all hover:shadow-lg ${isDark ? 'bg-slate-800/80 border-slate-700 text-white' : 'bg-white/90 border-slate-200 text-slate-800 shadow-sm'}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-3 rounded-2xl ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                <CloudRain className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h3 className="font-black text-xl tracking-tight">توقع الأمطار دقيقة بدقيقة</h3>
                <p className={`text-xs font-bold ${subTextColor}`}>خلال الـ 120 دقيقة القادمة (MinuteCast)</p>
              </div>
            </div>
            
            <div className="w-full">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                <div className={`text-sm font-bold px-3 py-1.5 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                  {displayTimeZone ? `التوقيت: ${displayTimeZone}` : 'التوقيت المحلي'}
                </div>
                <div className="text-right flex flex-col items-end">
                  <div className="text-lg font-black text-blue-500">{selectedMinuteTime}</div>
                  <div className="text-sm font-bold">{selectedMinuteLabel}</div>
                </div>
              </div>

              <div className="overflow-x-auto pb-4 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className="flex items-end gap-1.5 h-40 min-w-max px-2">
                  {(() => {
                    const maxPrecip = Math.max(...minuteCastData.map(m => m.precip), 0.1);
                    return minuteCastData.map((m, i) => {
                      const isRain = m.precip > 0;
                      const hPercent = Math.max((m.precip / maxPrecip) * 100, 4);
                      const selected = i === selectedMinuteIndex;
                      return (
                      <button key={i} onClick={() => setSelectedMinuteIndex(i)} className={`flex-none w-5 h-full flex flex-col items-center justify-end relative group transition-all ${selected ? 'scale-110 z-10' : 'hover:bg-slate-500/5 rounded-lg'}`}>
                        <div title={`${m.time} • ${m.precip > 0 ? `${formatPrecipValue(m.precip)} ${precipUnitLabel}` : 'لا أمطار'}`} className={`w-2.5 rounded-full transition-all shadow-sm ${isRain ? (selected ? 'bg-blue-500 shadow-blue-500/50' : 'bg-sky-400') : isDark ? 'bg-slate-700' : 'bg-slate-200'}`} style={{ height: `${hPercent}%` }} />
                        <span className={`text-[9px] font-black mt-2 transition-colors ${selected ? 'text-blue-500 scale-110' : subTextColor}`}>{m.precip > 0 ? formatPrecipValue(m.precip) : ''}</span>
                        {selected && <div className="absolute -bottom-4 w-1.5 h-1.5 rounded-full bg-blue-500" />}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              {minuteCastData.length > 0 ? (
                <div className="mt-8">
                  <input
                    type="range"
                    min={0}
                    max={Math.max(minuteCastData.length - 1, 0)}
                    value={selectedMinuteIndex}
                    onChange={(e) => setSelectedMinuteIndex(Number(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-slate-200 dark:bg-slate-700"
                  />
                  <p className={`text-xs text-center font-bold mt-4 ${subTextColor}`}>قم بتمرير المؤشر لرؤية التوقع اللحظي</p>
                </div>
              ) : (
                <div className={`text-center p-6 rounded-2xl border border-dashed mt-4 ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-300 bg-slate-50'}`}>
                  <p className="text-sm font-bold mb-1">لا تتوفر بيانات دقيقة بدقيقة حالياً.</p>
                  <p className="text-xs">يتم عرض تقدير مُجمّع من بيانات الساعة.</p>
                </div>
              )}
            </div>
          </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <MiniRadar selectedCity={selectedCity} isDark={isDark} />
          <AQICard weatherData={weatherData} isDark={isDark} />
        </div>

        <WeatherInsights weatherData={weatherData} isDark={isDark} selectedDayIndex={selectedDayIndex} windUnit={windUnit} rainUnit={rainUnit} pressureUnit={pressureUnit} />
        
        <div className="mb-8">
          <AIWeatherAgent weatherData={weatherData} isDark={isDark} cityName={selectedCity?.name} />
        </div>

        <div className="mb-8 lg:hidden">
          {Forecast15DayComponent}
        </div>

        <WeatherChart weatherData={weatherData} isDark={isDark} windUnit={windUnit} rainUnit={rainUnit} pressureUnit={pressureUnit} />
        <SunTracker weatherData={weatherData} isDark={isDark} />

      </div>

      <div className="lg:col-span-4 hidden lg:block">
        {Forecast15DayComponent}
        <WeatherShareCard weatherData={weatherData} selectedCity={selectedCity} isDark={isDark} windUnit={windUnit} />
      </div>
    </div>
  );
};
export default HomePage;
