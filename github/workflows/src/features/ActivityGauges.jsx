import React from 'react';
import { Sun, Droplets, Gauge, Eye, Wind, Thermometer } from 'lucide-react';

const WeatherInsights = ({ weatherData, isDark, selectedDayIndex = 0, windUnit, rainUnit, pressureUnit }) => {
  if (!weatherData) return null;

  const current = weatherData.current || {};
  const daily = weatherData.daily || {};
  const textColor = isDark ? 'text-slate-100' : 'text-slate-800';
  const subText = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardBg = isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-slate-200';

  const targetDay = daily?.time?.[selectedDayIndex] ? selectedDayIndex : 0;
  const isToday = selectedDayIndex === 0;

  const temp = isToday ? (current.temperature_2m ?? 0) : (daily.temperature_2m_max?.[targetDay] ?? 0);
  const humidity = isToday ? (current.relative_humidity_2m ?? 0) : 50; // Daily humidity isn't directly in open-meteo daily by default unless requested, fallback 50
  const windSpeed = isToday ? (current.wind_speed_10m ?? 0) : (daily.wind_speed_10m_max?.[targetDay] ?? 0);
  const pressure = isToday ? (current.surface_pressure ?? 0) : 1015; // default fallback if no daily pressure
  const uvIndex = daily.uv_index_max?.[targetDay] ?? 0;
  const feelsLike = isToday ? (current.apparent_temperature ?? temp) : (daily.apparent_temperature_max?.[targetDay] ?? temp);

  // Compute visibility from hourly data for the selected day (noon value)
  const hourlyVis = weatherData.hourly?.visibility;
  const hourIndex = targetDay * 24 + 12; // 12 PM of the selected day
  const visibility = hourlyVis && hourlyVis[hourIndex] !== undefined ? Math.round(hourlyVis[hourIndex] / 1000) : '--';

  // Dew point from hourly
  const hourlyDew = weatherData.hourly?.dew_point_2m;
  const dewPoint = hourlyDew && hourlyDew[hourIndex] !== undefined ? Math.round(hourlyDew[hourIndex]) : '--';

  const getUVLevel = (uv) => {
    if (uv <= 2) return { text: 'منخفض', color: 'text-green-500', bg: isDark ? 'bg-green-500/10' : 'bg-green-50' };
    if (uv <= 5) return { text: 'معتدل', color: 'text-yellow-500', bg: isDark ? 'bg-yellow-500/10' : 'bg-yellow-50' };
    if (uv <= 7) return { text: 'مرتفع', color: 'text-orange-500', bg: isDark ? 'bg-orange-500/10' : 'bg-orange-50' };
    if (uv <= 10) return { text: 'مرتفع جداً', color: 'text-red-500', bg: isDark ? 'bg-red-500/10' : 'bg-red-50' };
    return { text: 'شديد الخطورة', color: 'text-purple-500', bg: isDark ? 'bg-purple-500/10' : 'bg-purple-50' };
  };

  const getVisLevel = (v) => {
    if (v === '--') return 'غير متاح';
    if (v >= 10) return 'ممتازة';
    if (v >= 5) return 'جيدة';
    if (v >= 2) return 'متوسطة';
    return 'ضعيفة';
  };

  const getHumidityLevel = (h) => {
    if (h < 30) return 'جاف';
    if (h < 60) return 'مريح';
    if (h < 80) return 'رطب';
    return 'رطب جداً';
  };

  const getPressureLevel = (p) => {
    if (p === 0) return '--';
    if (p > 1020) return 'مرتفع جوي';
    if (p < 1010) return 'منخفض جوي';
    return 'مستقر';
  };

  const uvInfo = getUVLevel(uvIndex);

  const insights = [
    {
      icon: Sun,
      label: 'الأشعة فوق البنفسجية',
      value: `${Math.round(uvIndex)}`,
      unit: 'UV',
      desc: uvInfo.text,
      iconColor: uvInfo.color,
    },
    {
      icon: Droplets,
      label: 'الرطوبة النسبية',
      value: `${Math.round(humidity)}`,
      unit: '%',
      desc: getHumidityLevel(humidity),
      iconColor: 'text-blue-500',
    },
    {
      icon: Gauge,
      label: 'الضغط الجوي',
      value: `${Math.round(pressure)}`,
      unit: pressureUnit?.id === 'mbar' ? 'mbar' : 'hPa',
      desc: getPressureLevel(pressure),
      iconColor: 'text-emerald-500',
    },
    {
      icon: Eye,
      label: 'مدى الرؤية',
      value: `${visibility}`,
      unit: 'كم',
      desc: getVisLevel(visibility),
      iconColor: 'text-purple-500',
    },
    {
      icon: Thermometer,
      label: 'نقطة الندى',
      value: `${dewPoint}`,
      unit: '°',
      desc: dewPoint !== '--' && dewPoint > 20 ? 'كتمة ملحوظة' : 'مريح',
      iconColor: 'text-cyan-500',
    },
    {
      icon: Wind,
      label: 'سرعة الرياح',
      value: `${Math.round(windSpeed)}`,
      unit: windUnit?.label?.split(' ')[0] || 'كم/س',
      desc: windSpeed > 40 ? 'نشطة جداً' : windSpeed > 20 ? 'نشطة' : 'هادئة',
      iconColor: 'text-sky-500',
    },
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4 px-2">
        <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`}>
          <Gauge className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <h3 className={`font-black text-lg tracking-tight ${textColor}`}>تفاصيل الأرصاد الجوية</h3>
          <p className={`text-[10px] font-bold ${subText}`}>{isToday ? 'بيانات مباشرة' : `توقعات يوم ${new Date(daily.time[targetDay]).toLocaleDateString('ar-EG', { weekday: 'long' })}`} • الإحساس الفعلي {Math.round(feelsLike)}°</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {insights.map((item, i) => {
          const Icon = item.icon;
          return (
            <div
              key={i}
              className={`p-4 rounded-2xl border transition-all hover:shadow-md ${cardBg}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon className={`w-5 h-5 ${item.iconColor}`} />
                <span className={`text-[11px] font-black ${subText}`}>{item.label}</span>
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className={`text-3xl font-black tracking-tight ${textColor}`}>{item.value}</span>
                <span className={`text-sm font-bold ${subText}`}>{item.unit}</span>
              </div>
              <p className={`text-[10px] font-bold ${subText}`}>{item.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeatherInsights;
