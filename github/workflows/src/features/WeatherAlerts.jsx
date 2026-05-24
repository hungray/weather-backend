import React, { useMemo } from 'react';
import { ShieldAlert, AlertTriangle, Thermometer, Wind, Snowflake, CloudLightning, CloudFog, CloudRain } from 'lucide-react';

const WeatherAlerts = ({ weatherData, isDark, selectedDayIndex = 0, windUnit, rainUnit, pressureUnit }) => {
  const alerts = useMemo(() => {
    if (!weatherData || !weatherData.daily) return [];
    
    const newAlerts = [];
    const daily = weatherData.daily;
    const current = weatherData.current || {};
    const targetDay = selectedDayIndex;
    const isToday = targetDay === 0;

    const dayName = isToday ? 'اليوم' : `يوم ${new Date(daily.time[targetDay]).toLocaleDateString('ar-EG', { weekday: 'long' })}`;

    // Real data checks based on selected day
    const maxTemp = isToday && current.temperature_2m > (daily.temperature_2m_max?.[targetDay] || 0) ? current.temperature_2m : (daily.temperature_2m_max?.[targetDay] || 0);
    const minTemp = daily.temperature_2m_min?.[targetDay] || 0;
    const windGusts = daily.wind_gusts_10m_max?.[targetDay] || daily.wind_speed_10m_max?.[targetDay] || 0;
    const precipSum = daily.precipitation_sum?.[targetDay] || 0;
    const wCode = isToday ? (current.weathercode ?? current.weather_code) : (daily.weather_code?.[targetDay] ?? daily.weathercode?.[targetDay]);

    // Extreme Heat Warning
    if (maxTemp >= 40) {
      newAlerts.push({
        id: `heat_${targetDay}`,
        type: 'danger',
        icon: Thermometer,
        title: `تحذير من حرارة شديدة ${dayName}`,
        desc: `تصل درجة الحرارة العظمى ${dayName} إلى ${Math.round(maxTemp)}° مئوية. تجنب التعرض المباشر لأشعة الشمس.`
      });
    }

    // High Wind Warning
    if (windGusts >= 40) {
      newAlerts.push({
        id: `wind_${targetDay}`,
        type: 'warning',
        icon: Wind,
        title: `تحذير من رياح نشطة ${dayName}`,
        desc: `رياح نشطة تصل سرعتها إلى ${Math.round(windGusts)} ${windUnit?.label?.split(' ')[0] || 'كم/س'}، قد تثير الأتربة وتؤثر على الرؤية الأفقية.`
      });
    }

    // Extreme Cold Warning
    if (minTemp <= 5) {
      newAlerts.push({
        id: `cold_${targetDay}`,
        type: 'danger',
        icon: Snowflake,
        title: `تحذير من صقيع وموجة باردة ${dayName}`,
        desc: `تنخفض درجة الحرارة الصغرى إلى ${Math.round(minTemp)}° مئوية. يرجى أخذ الحيطة من تشكل الصقيع.`
      });
    }

    // High Precipitation Warning
    if (precipSum >= 10) {
      newAlerts.push({
        id: `rain_${targetDay}`,
        type: 'warning',
        icon: CloudRain,
        title: `تنبيه من أمطار غزيرة ${dayName}`,
        desc: `كميات أمطار متوقعة تصل إلى ${precipSum} ${rainUnit?.id === 'inch' ? 'بوصة' : 'ملم'}، يرجى الحذر في الطرقات.`
      });
    }

    // Thunderstorm Warning
    if ([95, 96, 99].includes(wCode)) {
      newAlerts.push({
        id: `storm_${targetDay}`,
        type: 'danger',
        icon: CloudLightning,
        title: `تحذير من عواصف رعدية ${dayName}`,
        desc: `يتوقع حدوث عواصف رعدية ${dayName}. يرجى أخذ الحيطة والحذر والابتعاد عن مجاري السيول.`
      });
    }

    // Fog Warning
    if ([45, 48].includes(wCode)) {
      newAlerts.push({
        id: `fog_${targetDay}`,
        type: 'warning',
        icon: CloudFog,
        title: `تحذير من تشكل ضباب كثيف ${dayName}`,
        desc: `تدني مدى الرؤية الأفقية بسبب تشكل الضباب. يرجى القيادة بحذر على الطرق السريعة.`
      });
    }

    // Dust Storm Warning from AQI (only valid for today usually, but show if available)
    if (isToday) {
      const aqiData = weatherData.aqi;
      const dustLevel = aqiData?.current?.dust || aqiData?.dust?.[0];
      if (dustLevel > 100) {
        newAlerts.push({
          id: 'dust_today',
          type: 'danger',
          icon: Wind,
          title: 'تحذير من عاصفة ترابية اليوم',
          desc: `مستويات الغبار عالية جداً (${Math.round(dustLevel)} µg/m³). ينصح مرضى الحساسية بالبقاء في الداخل.`
        });
      }
    }

    return newAlerts;
  }, [weatherData, selectedDayIndex]);

  if (alerts.length === 0) return null;

  return (
    <div className="mb-6 space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
      {alerts.map((alert) => {
        const AlertIcon = alert.icon;
        
        let bgColor, borderColor, iconColor, textColor, descColor;
        
        if (alert.type === 'danger') {
          bgColor = isDark ? 'bg-red-500/10' : 'bg-red-50';
          borderColor = isDark ? 'border-red-500/30' : 'border-red-200';
          iconColor = 'text-red-500';
          textColor = isDark ? 'text-red-400' : 'text-red-700';
          descColor = isDark ? 'text-red-300' : 'text-red-600';
        } else {
          bgColor = isDark ? 'bg-yellow-500/10' : 'bg-yellow-50';
          borderColor = isDark ? 'border-yellow-500/30' : 'border-yellow-200';
          iconColor = 'text-yellow-500';
          textColor = isDark ? 'text-yellow-400' : 'text-yellow-700';
          descColor = isDark ? 'text-yellow-300/80' : 'text-yellow-600/80';
        }

        return (
          <div key={alert.id} className={`flex items-start gap-3 p-4 rounded-2xl border ${bgColor} ${borderColor} shadow-sm transition-all`}>
            <div className={`mt-0.5 shrink-0 ${alert.type === 'danger' ? 'animate-pulse' : ''}`}>
              {alert.type === 'danger' ? (
                <ShieldAlert className={`w-6 h-6 ${iconColor}`} />
              ) : (
                <AlertTriangle className={`w-6 h-6 ${iconColor}`} />
              )}
            </div>
            <div>
              <h4 className={`font-black text-sm mb-1 ${textColor}`}>{alert.title}</h4>
              <p className={`font-bold text-xs leading-relaxed ${descColor}`}>{alert.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default WeatherAlerts;
