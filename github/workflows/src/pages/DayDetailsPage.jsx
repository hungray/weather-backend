import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, CloudRain, Droplets, Eye, Gauge, Loader2, Moon, Sun, Sunrise, Sunset, Wind, MapPin, Thermometer, Calendar, Bike, Activity, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';
import { getWeatherDesc } from '../utils/weatherUtils';

const DayDetailsPage = ({ isDark, weatherData, selectedCity, windUnit, rainUnit, pressureUnit }) => {
  const navigate = useNavigate();
  const { dayIndex } = useParams();
  const index = parseInt(dayIndex, 10) || 0;
  
  const [showAllHours, setShowAllHours] = useState(false);
  const [expandedHourIdx, setExpandedHourIdx] = useState(null);

  const targetDateStr = weatherData?.daily?.time?.[index];
  const dateObj = targetDateStr ? new Date(targetDateStr) : null;
  const dayName = dateObj ? (index === 0 ? 'اليوم' : index === 1 ? 'غداً' : new Intl.DateTimeFormat('ar-EG', { weekday: 'long' }).format(dateObj)) : '';
  const fullDate = dateObj ? dateObj.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  useEffect(() => {
    if (!weatherData || !dateObj) return;
    const cityName = selectedCity?.name?.split('،')[0] || 'المدينة';
    document.title = `الطقس في ${cityName} يوم ${dayName} | تفاصيل اليوم - مصر ويند`;
  }, [weatherData, selectedCity, dayName]);

  const textColor = isDark ? 'text-slate-100' : 'text-slate-800';
  const subText = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardBg = isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-slate-200';

  const wUnit = windUnit?.label?.split(' ')[0] || 'كم/س';

  if (!weatherData) {
    return (
      <div className="p-10 text-center font-bold h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 mb-4 animate-spin text-orange-500" />
        <p className={textColor}>جاري جلب تفاصيل اليوم...</p>
      </div>
    );
  }

  const dailyData = weatherData.daily;
  if (!dailyData || !dailyData.time[index]) {
    return (
      <div className="p-10 text-center font-bold">
        <p>يوم غير متاح.</p>
        <button onClick={() => navigate('/')} className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-full">عودة</button>
      </div>
    );
  }

  const maxTemp = dailyData.temperature_2m_max?.[index] !== undefined ? Math.round(dailyData.temperature_2m_max[index]) : '--';
  const minTemp = dailyData.temperature_2m_min?.[index] !== undefined ? Math.round(dailyData.temperature_2m_min[index]) : '--';
  const condition = getWeatherDesc(dailyData.weather_code?.[index] ?? dailyData.weathercode?.[index], 1);
  const IconComp = condition.icon;

  const feelsLikeMax = dailyData.apparent_temperature_max?.[index] !== undefined ? Math.round(dailyData.apparent_temperature_max[index]) : maxTemp;
  const feelsLikeMin = dailyData.apparent_temperature_min?.[index] !== undefined ? Math.round(dailyData.apparent_temperature_min[index]) : minTemp;
  
  const uvIndex = dailyData.uv_index_max?.[index] !== undefined ? Math.round(dailyData.uv_index_max[index]) : '--';
  const windMax = dailyData.wind_speed_10m_max?.[index] !== undefined ? Math.round(dailyData.wind_speed_10m_max[index]) : '--';
  const windGusts = dailyData.wind_gusts_10m_max?.[index] !== undefined ? Math.round(dailyData.wind_gusts_10m_max[index]) : '--';
  const precipProb = dailyData.precipitation_probability_max?.[index] !== undefined ? Math.round(dailyData.precipitation_probability_max[index]) : 0;
  const precipSum = dailyData.precipitation_sum?.[index] !== undefined ? dailyData.precipitation_sum[index] : 0;
  
  // Calculate day vs night specific probabilities if hourly is available
  const hourlyTime = weatherData.hourly.time;
  const targetHourlyData = [];
  let dayRainProb = 0; let nightRainProb = 0;
  let dayPrecip = 0; let nightPrecip = 0;
  let dayWind = 0; let nightWind = 0;
  
  let targetHoursIdx = [];
  let dayHours = 0, nightHours = 0;

  for (let i = 0; i < hourlyTime.length; i += 1) {
    if (hourlyTime[i].startsWith(targetDateStr)) {
      targetHoursIdx.push(i);
      const hourDate = new Date(hourlyTime[i]);
      const hourNum = hourDate.getHours();
      const hourStr = hourDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
      const temp = Math.round(weatherData.hourly.temperature_2m[i]);
      const rainProb = weatherData.hourly.precipitation_probability[i];
      const rainAmt = weatherData.hourly.precipitation[i] || 0;
      const wind = Math.round(weatherData.hourly.wind_speed_10m[i]);
      const hum = Math.round(weatherData.hourly.relative_humidity_2m[i]);
      const isDay = weatherData.hourly.is_day?.[i] ?? (hourNum >= 6 && hourNum < 18 ? 1 : 0);
      const hCond = getWeatherDesc(weatherData.hourly.weather_code?.[i] ?? weatherData.hourly.weathercode?.[i], isDay);
      
      const visibility = weatherData.hourly.visibility?.[i] ? Math.round(weatherData.hourly.visibility[i] / 1000) : '--';
      const dewPoint = weatherData.hourly.dew_point_2m?.[i] ? Math.round(weatherData.hourly.dew_point_2m[i]) : '--';
      const cloudCover = weatherData.hourly.cloud_cover?.[i] ?? '--';
      
      targetHourlyData.push({ time: hourStr, temp, rainProb, wind, hum, icon: hCond.icon, color: hCond.color, desc: hCond.desc, visibility, dewPoint, cloudCover });

      if (isDay) {
        dayRainProb = Math.max(dayRainProb, rainProb);
        dayPrecip += rainAmt;
        dayWind = Math.max(dayWind, wind);
        dayHours++;
      } else {
        nightRainProb = Math.max(nightRainProb, rainProb);
        nightPrecip += rainAmt;
        nightWind = Math.max(nightWind, wind);
        nightHours++;
      }
    }
  }

  // Fallback to daily max if hourly wasn't split perfectly
  if (dayWind === 0) dayWind = windMax;
  if (nightWind === 0) nightWind = windMax;
  
  // Format times
  const sunriseTime = dailyData.sunrise?.[index] ? new Date(dailyData.sunrise[index]).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '--';
  const sunsetTime = dailyData.sunset?.[index] ? new Date(dailyData.sunset[index]).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '--';

  const getWindDir = (deg) => {
    if (deg >= 337.5 || deg < 22.5) return 'شمالية';
    if (deg >= 22.5 && deg < 67.5) return 'شمالية شرقية';
    if (deg >= 67.5 && deg < 112.5) return 'شرقية';
    if (deg >= 112.5 && deg < 157.5) return 'جنوبية شرقية';
    if (deg >= 157.5 && deg < 202.5) return 'جنوبية';
    if (deg >= 202.5 && deg < 247.5) return 'جنوبية غربية';
    if (deg >= 247.5 && deg < 292.5) return 'غربية';
    if (deg >= 292.5 && deg < 337.5) return 'شمالية غربية';
    return '--';
  };
  const windDirText = getWindDir(dailyData.wind_direction_10m_dominant?.[index] || 0);

  // Narrative generation logic
  const getNarrative = (isDay) => {
    const temp = isDay ? maxTemp : minTemp;
    const wind = isDay ? dayWind : nightWind;
    const rainProb = isDay ? dayRainProb : nightRainProb;
    
    if (temp === '--') return "توقعات غير متاحة حالياً.";
    
    let tempDesc = "";
    if (temp >= 40) tempDesc = "شديد الحرارة وقاسٍ";
    else if (temp >= 35) tempDesc = "شديد الحرارة";
    else if (temp >= 28) tempDesc = "حار نسبياً";
    else if (temp >= 20) tempDesc = "معتدل ولطيف";
    else if (temp >= 10) tempDesc = "بارد نسبياً";
    else tempDesc = "شديد البرودة وقارص";

    let windDesc = "";
    if (wind >= 50) windDesc = `رياح ${windDirText} عاتية وعاصفة بسرعة ${wind} ${wUnit}، وهبات تصل لـ ${windGusts} ${wUnit}`;
    else if (wind >= 30) windDesc = `رياح ${windDirText} نشطة ومثيرة للأتربة أحياناً بسرعة ${wind} ${wUnit}`;
    else windDesc = `رياح ${windDirText} خفيفة إلى معتدلة بسرعة ${wind} ${wUnit}`;

    let rainDesc = "";
    if (rainProb >= 60) rainDesc = `فرصة عالية جداً لهطول أمطار`;
    else if (rainProb >= 30) rainDesc = `احتمالية لتساقط بعض الأمطار المتفرقة`;
    else rainDesc = "لا يتوقع هطول أمطار ملموسة";

    return `توقعات ${isDay ? 'النهار' : 'الليل'} تشير إلى طقس ${tempDesc} ${isDay ? 'تحت أشعة الشمس' : 'تحت سماء الليل'}. ${windDesc}. بالنسبة للهطول، ${rainDesc}.`;
  };

  const dayNarrative = getNarrative(true);
  const nightNarrative = getNarrative(false);

  // Health and extra calculations
  const aqiValue = weatherData.aqi?.current?.us_aqi || weatherData.aqi?.us_aqi?.[index] || '--';
  let aqiText = 'معتدل';
  let aqiColor = 'text-green-500';
  if (aqiValue > 100) { aqiText = 'غير صحي'; aqiColor = 'text-orange-500'; }
  if (aqiValue > 150) { aqiText = 'ضار'; aqiColor = 'text-red-500'; }
  
  let cycleText = 'آمن للركوب';
  let cycleColor = 'text-green-500';
  if (windMax > 30 || precipProb > 40) { cycleText = 'غير منصوح به'; cycleColor = 'text-orange-500'; }
  if (windGusts > 50 || precipProb > 80) { cycleText = 'خطر جداً'; cycleColor = 'text-red-500'; }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-28 lg:pb-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate('/')} className={`flex items-center gap-2 font-black active:scale-95 transition-transform px-4 py-2 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}>
          <ArrowRight className="w-5 h-5" /> رجوع
        </button>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <MapPin className="w-6 h-6 text-orange-500" />
        <h2 className={`text-3xl font-black ${textColor}`}>طقس {selectedCity?.name?.split('،')[0] || 'المدينة'} - {dayName}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Day Narrative Card */}
        <div className={`p-6 lg:p-8 rounded-[32px] border shadow-sm flex flex-col justify-between ${cardBg}`}>
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-500/10 rounded-2xl">
                  <Sun className="w-8 h-8 text-orange-500" />
                </div>
                <div>
                  <h3 className={`text-xl font-black ${textColor}`}>نهاراً</h3>
                  <p className={`text-xs font-bold ${subText}`}>{fullDate}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-5xl font-black text-orange-500 tracking-tighter">{maxTemp}°</span>
              </div>
            </div>
            
            <p className={`text-sm lg:text-base font-bold leading-loose mb-6 ${textColor}`}>
              {dayNarrative}
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-auto border-t border-slate-200 dark:border-slate-700 pt-6">
            <div className="flex flex-col gap-1">
              <span className={`text-[10px] font-bold ${subText}`}>فرصة هطول</span>
              <span className={`text-lg font-black ${dayRainProb > 40 ? 'text-blue-500' : textColor}`}>{dayRainProb}%</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className={`text-[10px] font-bold ${subText}`}>كمية المطر</span>
              <span className={`text-lg font-black ${dayPrecip > 0 ? 'text-blue-500' : textColor}`}>{dayPrecip.toFixed(1)} {rainUnit?.id === 'inch' ? 'بوصة' : 'ملم'}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className={`text-[10px] font-bold ${subText}`}>سرعة الرياح</span>
              <span className={`text-lg font-black ${textColor}`}>{dayWind} {windUnit?.label?.split(' ')[0] || 'كم/س'}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className={`text-[10px] font-bold ${subText}`}>الإحساس الفعلي</span>
              <span className={`text-lg font-black ${textColor}`}>{feelsLikeMax}°</span>
            </div>
          </div>
        </div>

        {/* Night Narrative Card */}
        <div className={`p-6 lg:p-8 rounded-[32px] border shadow-sm flex flex-col justify-between ${cardBg}`}>
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-2xl">
                  <Moon className="w-8 h-8 text-blue-500" />
                </div>
                <div>
                  <h3 className={`text-xl font-black ${textColor}`}>ليلاً</h3>
                  <p className={`text-xs font-bold ${subText}`}>{fullDate}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-5xl font-black text-blue-500 tracking-tighter">{minTemp}°</span>
              </div>
            </div>
            
            <p className={`text-sm lg:text-base font-bold leading-loose mb-6 ${textColor}`}>
              {nightNarrative}
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-auto border-t border-slate-200 dark:border-slate-700 pt-6">
            <div className="flex flex-col gap-1">
              <span className={`text-[10px] font-bold ${subText}`}>فرصة هطول</span>
              <span className={`text-lg font-black ${nightRainProb > 40 ? 'text-blue-500' : textColor}`}>{nightRainProb}%</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className={`text-[10px] font-bold ${subText}`}>كمية المطر</span>
              <span className={`text-lg font-black ${nightPrecip > 0 ? 'text-blue-500' : textColor}`}>{nightPrecip.toFixed(1)} {rainUnit?.id === 'inch' ? 'بوصة' : 'ملم'}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className={`text-[10px] font-bold ${subText}`}>سرعة الرياح</span>
              <span className={`text-lg font-black ${textColor}`}>{nightWind} {wUnit}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className={`text-[10px] font-bold ${subText}`}>الإحساس الفعلي</span>
              <span className={`text-lg font-black ${textColor}`}>{feelsLikeMin}°</span>
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 New Features Grid (UV, Air Quality, Wind Gusts, Activities) */}
      <h3 className={`text-xl font-black mb-4 px-1 flex items-center gap-2 ${textColor}`}>
        <Activity className="w-5 h-5 text-orange-500" /> مؤشرات متقدمة
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className={`p-5 rounded-3xl border flex flex-col items-center text-center ${cardBg}`}>
          <Sun className="w-6 h-6 text-yellow-500 mb-2" />
          <span className={`text-[10px] font-bold ${subText}`}>الأشعة فوق البنفسجية</span>
          <span className={`text-2xl font-black ${uvIndex > 7 ? 'text-red-500' : uvIndex > 3 ? 'text-orange-500' : 'text-green-500'}`}>{uvIndex}</span>
        </div>
        <div className={`p-5 rounded-3xl border flex flex-col items-center text-center ${cardBg}`}>
          <Wind className="w-6 h-6 text-sky-500 mb-2" />
          <span className={`text-[10px] font-bold ${subText}`}>أقصى هبات رياح</span>
          <span className={`text-2xl font-black ${textColor}`}>{windGusts} <span className="text-xs">{wUnit}</span></span>
        </div>
        <div className={`p-5 rounded-3xl border flex flex-col items-center text-center ${cardBg}`}>
          <ShieldAlert className="w-6 h-6 text-emerald-500 mb-2" />
          <span className={`text-[10px] font-bold ${subText}`}>جودة الهواء (AQI)</span>
          <span className={`text-lg font-black ${aqiColor}`}>{aqiValue}</span>
          <span className={`text-[10px] font-bold mt-1 ${aqiColor}`}>{aqiText}</span>
        </div>
        <div className={`p-5 rounded-3xl border flex flex-col items-center text-center ${cardBg}`}>
          <Bike className="w-6 h-6 text-purple-500 mb-2" />
          <span className={`text-[10px] font-bold ${subText}`}>ركوب الدراجات</span>
          <span className={`text-lg font-black ${cycleColor}`}>{cycleText}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-8">
          <div className={`p-4 rounded-3xl border flex items-center justify-between ${cardBg}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-xl"><Sunrise className="w-5 h-5 text-yellow-500" /></div>
                <span className={`text-sm font-black ${textColor}`}>الشروق</span>
              </div>
              <span className={`text-base font-black ${textColor}`}>{sunriseTime}</span>
          </div>
          <div className={`p-4 rounded-3xl border flex items-center justify-between ${cardBg}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-xl"><Sunset className="w-5 h-5 text-orange-500" /></div>
                <span className={`text-sm font-black ${textColor}`}>الغروب</span>
              </div>
              <span className={`text-base font-black ${textColor}`}>{sunsetTime}</span>
          </div>
      </div>


      <h3 className={`text-xl font-black mb-4 px-1 flex items-center gap-2 ${textColor}`}>
        <Calendar className="w-5 h-5 text-orange-500" /> الطقس ساعة بساعة
      </h3>
      <div className={`rounded-3xl border overflow-hidden mb-8 shadow-sm ${cardBg}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className={`text-xs font-black border-b ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'} ${subText}`}>
                <th className="py-4 px-6 text-right">الساعة</th>
                <th className="py-4 px-6 text-center">الحالة</th>
                <th className="py-4 px-6 text-center">الحرارة</th>
                <th className="py-4 px-6 text-center">فرصة المطر</th>
                <th className="py-4 px-6 text-center">الرياح</th>
                <th className="py-4 px-6 text-center">الرطوبة</th>
              </tr>
            </thead>
            <tbody>
              {(showAllHours ? targetHourlyData : targetHourlyData.slice(0, 3)).map((hour, idx) => {
                const HIcon = hour.icon;
                const isExpanded = expandedHourIdx === idx;
                return (
                  <React.Fragment key={idx}>
                    <tr 
                      onClick={() => setExpandedHourIdx(isExpanded ? null : idx)}
                      className={`border-b last:border-0 transition-colors cursor-pointer ${isDark ? 'border-slate-700 hover:bg-slate-700/50' : 'border-slate-100 hover:bg-slate-50'}`}
                    >
                      <td className={`py-4 px-6 text-sm font-black ${textColor}`}>
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-orange-500" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          {hour.time}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <HIcon className={`w-6 h-6 ${hour.color}`} />
                          <span className={`text-[11px] font-bold ${textColor}`}>{hour.desc}</span>
                        </div>
                      </td>
                      <td className={`py-4 px-6 text-center text-xl font-black ${textColor}`}>{hour.temp}°</td>
                      <td className="py-4 px-6 text-center">
                        <span className={`text-sm font-black px-3 py-1 rounded-full ${hour.rainProb > 40 ? 'bg-blue-500/10 text-blue-500' : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{hour.rainProb}%</span>
                      </td>
                      <td className={`py-4 px-6 text-center text-sm font-bold ${textColor}`}>{hour.wind} {wUnit}</td>
                      <td className={`py-4 px-6 text-center text-sm font-bold ${textColor}`}>{hour.hum}%</td>
                    </tr>
                    {isExpanded && (
                      <tr className={`${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-100'} border-b animate-in slide-in-from-top-2`}>
                        <td colSpan="6" className="py-4 px-6">
                          <div className="flex flex-wrap items-center justify-center gap-6">
                            <div className="flex items-center gap-2">
                              <Eye className="w-4 h-4 text-purple-500" />
                              <span className={`text-xs font-bold ${subText}`}>الرؤية:</span>
                              <span className={`text-sm font-black ${textColor}`}>{hour.visibility} كم</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Thermometer className="w-4 h-4 text-cyan-500" />
                              <span className={`text-xs font-bold ${subText}`}>نقطة الندى:</span>
                              <span className={`text-sm font-black ${textColor}`}>{hour.dewPoint}°</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Sun className="w-4 h-4 text-slate-400" />
                              <span className={`text-xs font-bold ${subText}`}>الغطاء السحابي:</span>
                              <span className={`text-sm font-black ${textColor}`}>{hour.cloudCover}%</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {targetHourlyData.length > 3 && (
          <div className={`p-4 border-t text-center ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
            <button 
              onClick={() => setShowAllHours(!showAllHours)}
              className={`font-bold text-sm flex items-center justify-center gap-2 w-full py-2 rounded-xl transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-white hover:bg-slate-100 text-slate-800 border'}`}
            >
              {showAllHours ? 'إخفاء الساعات' : 'عرض باقي الساعات'}
              {showAllHours ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DayDetailsPage;
