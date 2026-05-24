import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import AIWeatherAgent from "./AIWeatherAgent";
import { 
  CloudSun, MapPin, Sun, Moon, Calendar, Bike, Car, 
  Home, Radar, BookOpen, User, Search, Bell, WifiOff, Wifi, AlertCircle, 
  Navigation, X, Activity, CloudRain, Wind, Settings, Thermometer, ShieldAlert, ChevronLeft, Heart,
  Lock, Coffee, Stethoscope, Route as RouteIcon, Droplets, Check, Battery, Play, Pause,
  Gauge, Eye, Wind as DustIcon, Waves, Leaf, Mail, LogOut, Globe, Loader2,
  Cloud, CloudFog, CloudDrizzle, Snowflake, CloudLightning, Sunrise, Sunset, ArrowRight, ShieldCheck, Share2, Trash2, Plus, Edit3
} from 'lucide-react';

import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import logoImg from './assets/logo.png'; 

// 🔴 استيراد خدمات فايربيز الحقيقية 🔴
import { auth, db, googleProvider, facebookProvider } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, getDocs, getDoc, doc, deleteDoc, serverTimestamp, query, orderBy } from "firebase/firestore";

// ==========================================
// جدار العزل ضد الانهيارات
// ==========================================
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error) { return { hasError: true }; }
  componentDidCatch(error, errorInfo) { console.error("تم عزل خطأ قاتل:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-6 text-center" dir="rtl">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-black mb-2">عذراً، حدث انقطاع في البيانات</h2>
          <p className="text-slate-500 font-bold mb-6">جدار الحماية منع انهيار التطبيق. يرجى التحديث.</p>
          <button onClick={() => window.location.reload()} className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold active:scale-95 transition-transform">تحديث الصفحة</button>
        </div>
      );
    }
    return this.props.children; 
  }
}

if (window.self !== window.top) { window.top.location = window.self.location; }

// حماية الطلبات
const requestLogs =[];
const secureFetch = async (url, options = {}) => {
  const now = Date.now();
  while (requestLogs.length > 0 && requestLogs[0] < now - 10000) requestLogs.shift();
  if (requestLogs.length >= 25) throw new Error("RATE_LIMIT_EXCEEDED");
  requestLogs.push(now);
  const response = await fetch(url, options);
  if (!response.ok) throw new Error("API_ERROR");
  return response.json();
};

// المترجم لأكواد الطقس 
const getWeatherDesc = (code) => {
  if (code === undefined || code === null) return { desc: 'غير متوفر', icon: Cloud, color: 'text-slate-400' };
  if (code === 0) return { desc: 'صافي', icon: Sun, color: 'text-orange-500' };
  if (code === 1 || code === 2) return { desc: 'غيوم جزئية', icon: CloudSun, color: 'text-slate-400' };
  if (code === 3) return { desc: 'غائم', icon: Cloud, color: 'text-slate-500' };
  if ([45, 48].includes(code)) return { desc: 'ضباب', icon: CloudFog, color: 'text-slate-400' };
  if ([51, 53, 55, 56, 57].includes(code)) return { desc: 'رذاذ خفيف', icon: CloudDrizzle, color: 'text-blue-400' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { desc: 'أمطار', icon: CloudRain, color: 'text-blue-500' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { desc: 'ثلوج', icon: Snowflake, color: 'text-blue-200' };
  if ([95, 96, 99].includes(code)) return { desc: 'عواصف رعدية', icon: CloudLightning, color: 'text-purple-500' };
  return { desc: 'صافي', icon: Sun, color: 'text-orange-500' };
};

// المستشار الذكي
const advancedSynopticAnalysis = (current, todayDaily) => {
  if (!current || !todayDaily) return "جاري استلام وتحليل الخرائط...";
  const temp = current.temperature_2m;
  const humidity = current.relative_humidity_2m;
  const pressure = current.surface_pressure;
  const windSpeed = current.wind_speed_10m;
  const cloudCover = current.cloudcover || 0;
  const rawPrecipProb = todayDaily.precipitation_probability_max?.[0] || 0;

  if (temp === undefined || pressure === undefined) return "البيانات غير مكتملة للتحليل.";

  let analysisText = ""; let isOverride = false;
  if (pressure < 1010 && humidity > 75 && cloudCover > 50) {
    isOverride = true;
    analysisText += `نُحلل حالياً منخفضاً جوياً (ضغط ${Math.round(pressure)}hPa) مع تشبع رطوبي عالي. نتوقع أمطار. `;
  } else if (pressure > 1020 && humidity < 40 && rawPrecipProb > 20) {
    isOverride = true;
    analysisText += `ترصد خوارزمياتنا مرتفعاً جوياً عنيداً (ضغط ${Math.round(pressure)}hPa) يمنع السحب. الأجواء جافة. `;
  } else if (pressure > 1015) { analysisText += "مرتفع جوي سطحي يجلب الاستقرار للسماء. "; }

  if (temp > 35 && pressure < 1012) analysisText += "منخفض حراري يجذب رياحاً حارة. ";
  else if (temp < 15 && windSpeed > 20) analysisText += "كتلة باردة ونشاط للرياح يزيد الإحساس بالبرودة. ";
  else if (temp >= 20 && temp <= 30 && windSpeed < 15) analysisText += "كتلة هوائية معتدلة ومثالية. ";

  if (!isOverride && analysisText.length < 50) analysisText = "تمت مطابقة خرائط الضغط الجوي مع مخرجات النماذج. الأجواء مستقرة وتتطابق مع التوقعات الخام.";
  return analysisText;
};

const Toast = ({ message, type, isVisible }) => {
  if (!isVisible) return null;
  const bgColor = type === 'error' ? 'bg-red-500/95' : type === 'success' ? 'bg-green-500/95' : 'bg-slate-800/95';
  const Icon = type === 'error' ? AlertCircle : type === 'success' ? Wifi : WifiOff;
  return (
    <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[999999] flex items-center gap-2 text-white px-5 py-3 rounded-full shadow-2xl backdrop-blur-md transition-all duration-500 animate-in slide-in-from-top ${bgColor}`}>
      <Icon className="w-5 h-5" />
      <span className="text-sm font-bold tracking-wide">{message}</span>
    </div>
  );
};

// ==========================================
// 1. الشاشة الرئيسية
// ==========================================
const HomePage = ({ isDark, selectedCity, weatherData }) => {
  const navigate = useNavigate();
  const [expandedDay, setExpandedDay] = useState(null);
  const cardBg = isDark ? 'bg-slate-800/80 border-slate-700 text-white' : 'bg-white/80 border-white text-slate-800';
  const textColor = isDark ? 'text-slate-100' : 'text-slate-800';
  const subTextColor = isDark ? 'text-slate-400' : 'text-slate-500';

  const current = weatherData?.current || {};
  const dailyData = weatherData?.daily || {};

  const currentTemp = current.temperature_2m !== undefined ? Math.round(current.temperature_2m) : "--";
  const feelsLike = current.apparent_temperature !== undefined ? Math.round(current.apparent_temperature) : "--";
  const windSpeed = current.wind_speed_10m !== undefined ? Math.round(current.wind_speed_10m) : "--";
  const pressure = current.surface_pressure !== undefined ? Math.round(current.surface_pressure) : "--";
  const humidity = current.relative_humidity_2m !== undefined ? Math.round(current.relative_humidity_2m) : "--";
  const todayPrecipProb = dailyData.precipitation_probability_max?.[0] || 0;
  
  const currentCondition = getWeatherDesc(current.weathercode);
  const CurrentIcon = currentCondition.icon || Sun;

  // المطر بالساعة للشاشة الرئيسية
  const hourlyTime = weatherData?.hourly?.time || [];
  const hourlyPrecip = weatherData?.hourly?.precipitation || [];
  
  const now = new Date();
  const localHourStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:00`;
  let currentHourIdx = hourlyTime.findIndex(t => t >= localHourStr);
  if (currentHourIdx === -1) currentHourIdx = 0;

  const timeLabels =['الآن', 'بعد 1 س', 'بعد 2 س', 'بعد 3 س', 'بعد 4 س', 'بعد 5 س'];
  const rainForecast = timeLabels.map((time, index) => {
    const precip = hourlyPrecip[currentHourIdx + index] || 0;
    let intensity = 0; let label = 'صافي';
    if (precip > 0.1 && precip <= 1) { intensity = 30; label = 'خفيف'; }
    else if (precip > 1 && precip <= 3) { intensity = 60; label = 'متوسط'; }
    else if (precip > 3) { intensity = 90; label = 'غزير'; }
    return { time, intensity, label };
  });

  const dailyForecast = Array.from({ length: 15 }).map((_, index) => {
    if (!dailyData || !dailyData.time || !dailyData.time[index]) return null;

    let dayName = '--'; let fullDate = '--'; let sunriseTime = '--'; let sunsetTime = '--';
    try {
      const date = new Date(dailyData.time[index]);
      if (!isNaN(date.getTime())) { 
        dayName = index === 0 ? 'اليوم' : index === 1 ? 'غداً' : new Intl.DateTimeFormat('ar-EG', { weekday: 'long' }).format(date);
        fullDate = date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' });
      }
      if (dailyData.sunrise?.[index]) sunriseTime = new Date(dailyData.sunrise[index]).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'});
      if (dailyData.sunset?.[index]) sunsetTime = new Date(dailyData.sunset[index]).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'});
    } catch(e) {}

    const maxTemp = dailyData.temperature_2m_max?.[index] !== undefined ? Math.round(dailyData.temperature_2m_max[index]) : "--";
    const minTemp = dailyData.temperature_2m_min?.[index] !== undefined ? Math.round(dailyData.temperature_2m_min[index]) : "--";
    const uvIndex = dailyData.uv_index_max?.[index] !== undefined ? Math.round(dailyData.uv_index_max[index]) : "--";
    const precipProb = dailyData.precipitation_probability_max?.[index] !== undefined ? Math.round(dailyData.precipitation_probability_max[index]) : 0;
    const windMax = dailyData.wind_speed_10m_max?.[index] !== undefined ? Math.round(dailyData.wind_speed_10m_max[index]) : "--";
    const precipSum = dailyData.precipitation_sum?.[index] !== undefined ? dailyData.precipitation_sum[index] : 0;
    
    const wCode = dailyData.weather_code?.[index] ?? dailyData.weathercode?.[index];
    const condition = getWeatherDesc(wCode);
    
    // خبير الأرصاد (لغة عربية سليمة واحترافية)
    let daySummary = "";
    if(maxTemp !== '--') {
       if (maxTemp >= 38) daySummary = `أجواء شديدة الحرارة (${condition.desc}). يُنصح بتجنب التعرض المباشر لأشعة الشمس. `;
       else if (maxTemp >= 30) daySummary = `أجواء حارة نسبياً وصيفية معتدلة (${condition.desc}). `;
       else if (maxTemp <= 15) daySummary = `طقس بارد بشكل ملحوظ (${condition.desc})، يُفضل ارتداء الملابس الشتوية. `;
       else daySummary = `طقس ربيعي معتدل ومثالي للأنشطة الخارجية (${condition.desc}). `;
    }

    if (precipProb > 40) daySummary += `فرص هطول الأمطار مرتفعة وتصل إلى ${precipProb}%.`;
    else if (windMax > 30) daySummary += `مع نشاط للرياح قد يثير الغبار (بسرعة تصل إلى ${windMax} كم/س).`;
    else daySummary += `الأجواء مستقرة بوجه عام.`;

    // استخراج ساعات اليوم للرسم البياني المصغر
    const miniHourly = [];
    const targetDateStr = dailyData.time[index];
    if (weatherData?.hourly?.time) {
      for(let j=0; j < weatherData.hourly.time.length; j++) {
        if (weatherData.hourly.time[j].startsWith(targetDateStr)) {
          const t = new Date(weatherData.hourly.time[j]);
          miniHourly.push({
             time: t.toLocaleTimeString('ar-EG', {hour: '2-digit'}),
             temp: Math.round(weatherData.hourly.temperature_2m[j]),
             icon: getWeatherDesc(weatherData.hourly.weather_code?.[j] ?? weatherData.hourly.weathercode?.[j]).icon
          });
        }
      }
    }
    // ناخد قراءة كل 3 ساعات عشان المساحة
    const filteredHourly = miniHourly.filter((_, idx) => idx % 3 === 0);

    return { fullDate, day: dayName, maxTemp, minTemp, uvIndex, precipProb, windMax, precipSum, sunrise: sunriseTime, sunset: sunsetTime, desc: condition.desc, conditionCode: wCode, icon: condition.icon, color: condition.color, summary: daySummary, hourly: filteredHourly };
  }).filter(Boolean);

  return (
    <div className="animate-in fade-in duration-700 pb-28 lg:pb-10 lg:grid lg:grid-cols-12 lg:gap-8 items-start">
      <div className="lg:col-span-7">
        
        {/* الكارت الأساسي */}
        <div className={`relative overflow-hidden rounded-[40px] p-8 mb-6 shadow-[0_20px_50px_-15px_rgba(234,88,12,0.5)] ${isDark ? 'bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 shadow-[0_20px_50px_-15px_rgba(49,46,129,0.5)]' : 'bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500'} text-white hover-3d group`}>
          <div className={`absolute -top-32 -right-32 w-64 h-64 ${isDark ? 'bg-indigo-500/20' : 'bg-white/20'} rounded-full blur-3xl opacity-50 group-hover:scale-110 transition-transform duration-700`}></div>
          <div className={`absolute -bottom-32 -left-32 w-64 h-64 ${isDark ? 'bg-purple-500/20' : 'bg-orange-300/30'} rounded-full blur-3xl opacity-50 group-hover:scale-110 transition-transform duration-700`}></div>
          <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex justify-between items-start w-full">
              <button className="flex items-center gap-2 bg-black/15 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-inner active:scale-95 transition-transform text-right">
                <MapPin className="w-4 h-4 text-orange-200 shrink-0" />
                <p className="text-sm font-bold tracking-wide truncate max-w-[200px]">{selectedCity?.name?.split('،')[0] || 'غير معروف'}</p>
              </button>
              <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                <span className={`w-2 h-2 rounded-full ${weatherData ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></span>
                <p className="text-[10px] font-bold opacity-90 tracking-wider">{weatherData ? 'مباشر' : 'جاري'}</p>
              </div>
            </div>

            <div className="mt-8 flex justify-between items-center w-full">
              <div>
                <h3 className="text-[100px] leading-none font-black tracking-tighter drop-shadow-xl">{currentTemp}°</h3>
                <p className="text-lg font-medium opacity-90 ml-2 drop-shadow-md">الاحساس الفعلي {feelsLike}°</p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <CurrentIcon className="w-24 h-24 lg:w-32 lg:h-32 text-white drop-shadow-2xl mb-2" strokeWidth={1.5} />
                <h4 className="text-xl font-bold bg-white/20 px-5 py-1.5 rounded-full backdrop-blur-md border border-white/30 shadow-lg whitespace-nowrap">{currentCondition.desc}</h4>
              </div>
            </div>

            <div className="mt-10 flex justify-between items-center glass-pill p-4 rounded-3xl">
              <div className="flex flex-col items-center flex-1 border-l border-white/10 group"><Wind className="w-5 h-5 text-orange-200 mb-1 group-hover:-translate-y-1 transition-transform" /><span className="text-[10px] opacity-70">الرياح</span><span className="font-bold">{windSpeed} كم/س</span></div>
              <div className="flex flex-col items-center flex-1 border-l border-white/10 group"><Droplets className="w-5 h-5 text-blue-200 mb-1 group-hover:-translate-y-1 transition-transform" /><span className="text-[10px] opacity-70">الرطوبة</span><span className="font-bold">{humidity}%</span></div>
              <div className="flex flex-col items-center flex-1 group"><Gauge className="w-5 h-5 text-emerald-200 mb-1 group-hover:-translate-y-1 transition-transform" /><span className="text-[10px] opacity-70">الضغط</span><span className="font-bold">{pressure}</span></div>
            </div>
          </div>
        </div>

        {/* واجهة المحلل الذكي الخاصة بك (في ملف منفصل) */}
        <div className="mb-6">
          <AIWeatherAgent weatherData={weatherData} isDark={isDark} cityName={selectedCity?.name} />
        </div>

        {/* المطر ساعة بساعة */}
        <div className="mb-8 relative hover-3d">
          <div className="flex items-center gap-2 mb-4 px-2"><CloudRain className="w-6 h-6 text-blue-500 drop-shadow-sm animate-pulse" /><h3 className={`font-black text-xl tracking-tight ${textColor}`}>المطر (ساعة بساعة)</h3></div>
          <div className={`backdrop-blur-2xl border shadow-lg rounded-[32px] p-6 glass-panel`}>
            <div className="flex gap-4 lg:gap-6 justify-between overflow-x-auto pb-4 scrollbar-hide">
              {rainForecast.map((item, index) => (
                <div key={index} className="flex flex-col items-center flex-shrink-0 w-12">
                  <div className={`h-32 w-8 rounded-full flex items-end justify-center pb-1 relative overflow-hidden shadow-inner ${isDark ? 'bg-slate-700' : 'bg-slate-100/80'}`}>
                    {item.intensity > 0 ? (
                      <div className={`w-full rounded-full transition-all duration-1000 ${item.intensity > 70 ? 'bg-gradient-to-t from-blue-600 to-blue-400' : item.intensity > 40 ? 'bg-gradient-to-t from-blue-400 to-blue-300' : 'bg-gradient-to-t from-blue-300 to-blue-200'}`} style={{ height: `${item.intensity}%` }}></div>
                    ) : (<span className="text-[10px] text-slate-400 mb-2 font-bold">-</span>)}
                  </div>
                  <p className={`text-[11px] font-black mt-3 ${item.intensity > 0 ? 'text-blue-500' : subTextColor}`}>{item.label}</p>
                  <p className={`text-[10px] font-bold mt-1 ${subTextColor}`}>{item.time}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* توقعات 15 يوم */}
      <div className="lg:col-span-5">
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-6 h-6 text-slate-500 drop-shadow-sm" />
            <h3 className={`font-black text-xl tracking-tight ${textColor}`}>توقعات 15 يوماً</h3>
          </div>
        </div>
        
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 pb-10 scrollbar-hide">
          {dailyForecast.map((item, i) => {
            const IconComp = item.icon || Sun;
            const isExpanded = expandedDay === i;

            return (
              <div key={i} className="flex flex-col">
                {/* شريط اليوم الأساسي */}
                <div 
                  onClick={() => { if (item.maxTemp !== '--') setExpandedDay(isExpanded ? null : i); }} 
                  className={`backdrop-blur-xl border shadow-sm p-4 lg:p-5 flex items-center justify-between active:scale-[0.98] cursor-pointer hover:border-orange-500/30 hover:shadow-orange-500/10 transition-all duration-300 ${cardBg} ${isExpanded ? 'rounded-t-3xl rounded-b-md border-b-0' : 'rounded-3xl hover-3d'}`}
                >
                  <div className="flex items-center gap-4 w-1/2">
                    <IconComp className={`w-8 h-8 ${item.color} drop-shadow-md shrink-0`} />
                    <div>
                      <p className={`font-black lg:text-lg ${textColor}`}>{item.day}</p>
                      <p className={`text-[11px] lg:text-xs font-bold ${subTextColor}`}>{item.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 w-1/2 justify-end shrink-0">
                    <div className="text-center"><p className={`text-[10px] font-bold mb-0.5 ${subTextColor}`}>نهاراً</p><p className={`text-lg lg:text-xl font-black ${textColor}`}>{item.maxTemp}°</p></div>
                    <div className="text-center opacity-70"><p className={`text-[10px] font-bold mb-0.5 ${subTextColor}`}>ليلاً</p><p className={`text-lg lg:text-xl font-black ${textColor}`}>{item.minTemp}°</p></div>
                  </div>
                </div>

                {/* التفاصيل اللي بتفتح تحت اليوم */}
                {isExpanded && (
                  <div className={`p-5 border border-t-0 shadow-inner flex flex-col gap-4 animate-in slide-in-from-top-2 duration-300 rounded-b-3xl ${isDark ? 'bg-slate-800/95 border-slate-700' : 'bg-slate-50/95 border-white'}`}>
                    
                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-700/30 border-slate-600/50' : 'bg-blue-50/50 border-blue-100'}`}>
                      <h4 className="flex items-center gap-2 font-black text-sm mb-2 text-blue-500"><Activity className="w-4 h-4" /> ملخص الطقس</h4>
                      <p className={`font-bold text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{item.summary}</p>
                    </div>

                    {/* شريط الساعات المصغر المضاف حديثاً */}
                    {item.hourly && item.hourly.length > 0 && (
                      <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-700/30 border-slate-600/50' : 'bg-slate-100/50 border-slate-200/50'}`}>
                        <h4 className={`text-[11px] font-black mb-3 ${subTextColor}`}>تدرج الحرارة خلال اليوم</h4>
                        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                           {item.hourly.map((h, idx) => {
                              const HIcon = h.icon;
                              return (
                                 <div key={idx} className="flex flex-col items-center min-w-[40px]">
                                    <span className={`text-[10px] font-bold mb-1 ${subTextColor}`}>{h.time}</span>
                                    <HIcon className={`w-5 h-5 text-slate-400`} />
                                    <span className={`text-[11px] font-black mt-1 ${textColor}`}>{h.temp}°</span>
                                 </div>
                              )
                           })}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex flex-col lg:flex-row gap-3">
                      <div className={`flex-1 p-4 rounded-2xl border flex flex-col justify-between ${isDark ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50 border-orange-100'}`}>
                        <div className="flex justify-between items-center mb-2"><h4 className="font-black text-sm text-orange-600 dark:text-orange-400 flex items-center gap-1"><Sun className="w-4 h-4"/> نهاراً</h4><span className={`text-2xl font-black ${textColor}`}>{item.maxTemp}°</span></div>
                        <div className="space-y-2 mt-2">
                          <div className="flex justify-between items-center text-xs font-bold"><span className={subTextColor}>مؤشر UV</span><span className={textColor}>{item.uvIndex}</span></div>
                          <div className="flex justify-between items-center text-xs font-bold"><span className={subTextColor}>أقصى رياح</span><span className={textColor}>{item.windMax} كم/س</span></div>
                        </div>
                      </div>

                      <div className={`flex-1 p-4 rounded-2xl border flex flex-col justify-between ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
                        <div className="flex justify-between items-center mb-2"><h4 className="font-black text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1"><Moon className="w-4 h-4"/> ليلاً</h4><span className={`text-2xl font-black text-slate-600 dark:text-slate-300`}>{item.minTemp}°</span></div>
                        <div className="space-y-2 mt-2">
                          <div className="flex justify-between items-center text-xs font-bold"><span className={subTextColor}>فرصة المطر</span><span className={textColor}>{item.precipProb}%</span></div>
                          <div className="flex justify-between items-center text-xs font-bold"><span className={subTextColor}>كمية المطر</span><span className={textColor}>{item.precipSum} ملم</span></div>
                        </div>
                      </div>
                    </div>

                    <div className={`flex justify-around p-3 rounded-2xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center gap-2"><Sunrise className="w-5 h-5 text-yellow-500" /><div><p className={`text-[9px] font-bold ${subTextColor}`}>الشروق</p><p className={`text-xs font-black ${textColor}`}>{item.sunrise}</p></div></div>
                      <div className="w-px bg-slate-300 dark:bg-slate-600"></div>
                      <div className="flex items-center gap-2"><Sunset className="w-5 h-5 text-orange-500" /><div><p className={`text-[9px] font-bold ${subTextColor}`}>الغروب</p><p className={`text-xs font-black ${textColor}`}>{item.sunset}</p></div></div>
                    </div>

                    {/* الزرار المحدث لتفاصيل اليوم بالكامل */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); navigate(`/day-details/${i}`); }}
                      className="mt-2 w-full py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black rounded-2xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <span>عرض التفاصيل ساعة بساعة</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};



// ==========================================
// 2. صفحة تفاصيل اليوم (الاحترافية + رابط للمشاركة)
// ==========================================
const DayDetailsPage = ({ isDark, weatherData, selectedCity }) => {
  const navigate = useNavigate();
  const { dayIndex } = useParams(); 
  const index = parseInt(dayIndex) || 0; 

  const cardBg = isDark ? 'bg-slate-800/90 border-slate-700 text-white' : 'bg-white/90 border-white text-slate-800';
  const textColor = isDark ? 'text-slate-100' : 'text-slate-800';
  const subTextColor = isDark ? 'text-slate-400' : 'text-slate-500';

  if (!weatherData) {
    return <div className="p-10 text-center font-bold h-[60vh] flex flex-col items-center justify-center"><Loader2 className={`w-12 h-12 mb-4 animate-spin text-orange-500`} /><p className={textColor}>جاري جلب تفاصيل اليوم...</p></div>;
  }

  const dailyData = weatherData.daily;
  if (!dailyData || !dailyData.time[index]) return <div className="p-10 text-center font-bold"><p>يوم غير متاح.</p><button onClick={() => navigate('/')} className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-full">عودة</button></div>;

  const targetDateStr = dailyData.time[index];
  const dateObj = new Date(targetDateStr);
  const dayName = index === 0 ? 'اليوم' : index === 1 ? 'غداً' : new Intl.DateTimeFormat('ar-EG', { weekday: 'long' }).format(dateObj);
  const fullDate = dateObj.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });

  // الأساسيات
  const maxTemp = dailyData.temperature_2m_max?.[index] !== undefined ? Math.round(dailyData.temperature_2m_max[index]) : "--";
  const minTemp = dailyData.temperature_2m_min?.[index] !== undefined ? Math.round(dailyData.temperature_2m_min[index]) : "--";
  const condition = getWeatherDesc(dailyData.weather_code?.[index] ?? dailyData.weathercode?.[index]);
  const IconComp = condition.icon;

  // التفاصيل الاحترافية المضافة (مع حماية ضد الأصفار الوهمية)
  const feelsLikeMax = dailyData.apparent_temperature_max?.[index] !== undefined ? Math.round(dailyData.apparent_temperature_max[index]) : maxTemp;
  const uvIndex = dailyData.uv_index_max?.[index] !== undefined ? Math.round(dailyData.uv_index_max[index]) : "--";
  const windMax = dailyData.wind_speed_10m_max?.[index] !== undefined ? Math.round(dailyData.wind_speed_10m_max[index]) : "--";
  const windGusts = dailyData.wind_gusts_10m_max?.[index] !== undefined ? Math.round(dailyData.wind_gusts_10m_max[index]) : "--";
  const precipProb = dailyData.precipitation_probability_max?.[index] !== undefined ? Math.round(dailyData.precipitation_probability_max[index]) : 0;
  const precipSum = dailyData.precipitation_sum?.[index] !== undefined ? dailyData.precipitation_sum[index] : 0;
  
  // دالة لترجمة اتجاه الرياح للعربي
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

  // استخراج الطقس "ساعة بساعة" لهذا اليوم وتفاصيل الظهر 
  const hourlyTime = weatherData.hourly.time;
  const targetHourlyData = [];
  
  let dayDewPoint = "--";
  let dayPressure = "--";
  let dayVisibility = "--";
  let targetHoursIdx = [];
  
  for(let i=0; i < hourlyTime.length; i++) {
    if(hourlyTime[i].startsWith(targetDateStr)) {
      targetHoursIdx.push(i); // تجميع كل ساعات اليوم ده
      const hourDate = new Date(hourlyTime[i]);
      const hourStr = hourDate.toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'});
      const temp = Math.round(weatherData.hourly.temperature_2m[i]);
      const rainProb = weatherData.hourly.precipitation_probability[i];
      const wind = Math.round(weatherData.hourly.wind_speed_10m[i]);
      const hum = Math.round(weatherData.hourly.relative_humidity_2m[i]);
      const hCond = getWeatherDesc(weatherData.hourly.weather_code?.[i] ?? weatherData.hourly.weathercode?.[i]);
      targetHourlyData.push({ time: hourStr, temp, rainProb, wind, hum, icon: hCond.icon, color: hCond.color });
    }
  }

  // سحب البيانات الدقيقة بأمان تام
  if (targetHoursIdx.length > 0) {
    const safeIdx = targetHoursIdx[Math.floor(targetHoursIdx.length / 2)] || targetHoursIdx[0]; 
    
    if (weatherData.hourly.dew_point_2m && weatherData.hourly.dew_point_2m[safeIdx] != null) {
      dayDewPoint = Math.round(weatherData.hourly.dew_point_2m[safeIdx]);
    }
    if (weatherData.hourly.surface_pressure && weatherData.hourly.surface_pressure[safeIdx] != null) {
      dayPressure = Math.round(weatherData.hourly.surface_pressure[safeIdx]);
    }
    if (weatherData.hourly.visibility && weatherData.hourly.visibility[safeIdx] != null) {
      dayVisibility = Math.round(weatherData.hourly.visibility[safeIdx] / 1000);
    }
  }

  // مربعات التفاصيل الدقيقة
  const detailCards = [
    { label: 'الاحساس الفعلي', value: `${feelsLikeMax}°`, icon: Thermometer, color: 'text-red-500', desc: 'أقصى شعور بالحرارة' },
    { label: 'نقطة الندى (Dew)', value: `${dayDewPoint}°`, icon: Droplets, color: 'text-blue-400', desc: 'مؤشر الكتمة والتعرق' },
    { label: 'الضغط الجوي', value: `${dayPressure} hPa`, icon: Gauge, color: 'text-emerald-500', desc: 'الضغط السطحي' },
    { label: 'الرؤية الأفقية', value: `${dayVisibility} كم`, icon: Eye, color: 'text-purple-500', desc: dayVisibility < 5 ? 'رؤية ضعيفة' : 'رؤية واضحة' },
    { label: 'الأشعة (UV)', value: uvIndex, icon: Sun, color: 'text-yellow-500', desc: uvIndex > 7 ? 'شديدة الخطورة' : 'متوسطة' },
    { label: 'الرياح والهبات', value: `${windMax} كم/س`, icon: Wind, color: 'text-cyan-500', desc: `أقصى هبات ${windGusts}` },
  ];

  return (
    <div className="animate-in slide-in-from-bottom-8 duration-700 pb-28 lg:pb-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate('/')} className={`flex items-center gap-2 font-black active:scale-95 transition-transform bg-black/5 backdrop-blur-md px-4 py-2 rounded-full ${textColor}`}><ArrowRight className="w-5 h-5" /> رجوع للرئيسية</button>
        <div className={`text-xs font-bold px-3 py-1.5 rounded-full border ${isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-600 border-slate-200'}`}>رابط قابل للمشاركة 🔗</div>
      </div>

      {/* الكارت الأساسي الفخم */}
      <div className={`glass-panel rounded-[40px] p-8 mb-8 flex flex-col items-center text-center relative overflow-hidden hover-3d`}>
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl animate-glow-pulse"></div>
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl animate-glow-pulse" style={{ animationDelay: '1.5s' }}></div>
        
        <div className="relative z-10 flex flex-col items-center w-full">
          <div className="flex items-center gap-2 mb-4 bg-slate-900/10 px-4 py-1.5 rounded-full"><MapPin className="w-4 h-4 text-orange-500" /><p className={`text-sm font-bold ${textColor}`}>{selectedCity.name}</p></div>
          <h2 className={`text-5xl font-black mb-2 tracking-tight ${textColor}`}>{dayName}</h2>
          <p className={`text-sm font-bold mb-8 ${subTextColor}`}>{fullDate}</p>
          
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16 w-full justify-center">
            <IconComp className={`w-40 h-40 drop-shadow-2xl ${condition.color} animate-pulse`} strokeWidth={1} />
            <div className="flex flex-col items-center md:items-start text-center md:text-right">
               <h3 className={`text-3xl font-black mb-6 ${textColor}`}>{condition.desc}</h3>
               <div className="flex gap-8">
                 <div className="flex flex-col items-center"><span className={`text-sm font-bold ${subTextColor}`}>العظمى (نهاراً)</span><span className="text-5xl font-black text-orange-500">{maxTemp}°</span></div>
                 <div className="w-px bg-slate-200 dark:bg-slate-700"></div>
                 <div className="flex flex-col items-center"><span className={`text-sm font-bold ${subTextColor}`}>الصغرى (ليلاً)</span><span className="text-5xl font-black text-blue-500">{minTemp}°</span></div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* لوحة التفاصيل الدقيقة (Dashboard) */}
      <h3 className={`text-2xl font-black mb-4 px-2 flex items-center gap-2 ${textColor}`}><Activity className="w-6 h-6 text-orange-500" /> تفاصيل الأرصاد الدقيقة</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {detailCards.map((card, idx) => {
          const CardIcon = card.icon;
          return (
            <div key={idx} className={`p-5 rounded-[32px] border shadow-sm flex flex-col justify-between transition-all hover:scale-[1.02] ${cardBg}`}>
              <div className="flex items-center gap-3 mb-4">
                 <div className={`p-2 rounded-2xl ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}><CardIcon className={`w-6 h-6 ${card.color}`} /></div>
                 <h4 className={`text-sm font-black ${subTextColor}`}>{card.label}</h4>
              </div>
              <div>
                <p className={`text-3xl font-black mb-1 ${textColor}`}>{card.value}</p>
                <p className={`text-[11px] font-bold ${subTextColor}`}>{card.desc}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className={`grid grid-cols-2 gap-4 mb-8 p-6 rounded-[32px] border shadow-sm ${cardBg}`}>
         <div className="flex flex-col items-center justify-center border-l border-slate-200 dark:border-slate-700">
           <CloudRain className="w-8 h-8 text-blue-500 mb-2" />
           <p className={`text-xs font-bold ${subTextColor}`}>فرصة وتراكم الأمطار</p>
           <p className={`text-2xl font-black mt-1 ${textColor}`}>{precipProb}% <span className="text-sm font-bold text-slate-400">({precipSum} ملم)</span></p>
         </div>
         <div className="flex flex-col items-center justify-center">
           <Wind className="w-8 h-8 text-cyan-500 mb-2" />
           <p className={`text-xs font-bold ${subTextColor}`}>اتجاه الرياح السائد</p>
           <p className={`text-2xl font-black mt-1 ${textColor}`}>{windDirText}</p>
         </div>
      </div>

      {/* قسم الطقس ساعة بساعة */}
      <h3 className={`text-2xl font-black mb-4 px-2 flex items-center gap-2 ${textColor}`}><Activity className="w-6 h-6 text-orange-500" /> الطقس ساعة بساعة</h3>
      
      <div className={`backdrop-blur-xl border shadow-sm rounded-[32px] p-6 mb-8 overflow-hidden ${cardBg}`}>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {targetHourlyData.map((hour, idx) => {
            const HIcon = hour.icon;
            return (
              <div key={idx} className={`flex flex-col items-center min-w-[90px] p-4 rounded-3xl border transition-all hover:scale-105 ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                <p className={`text-[11px] font-black mb-3 ${subTextColor}`}>{hour.time}</p>
                <HIcon className={`w-8 h-8 mb-3 drop-shadow-md ${hour.color}`} />
                <p className={`text-2xl font-black mb-3 ${textColor}`}>{hour.temp}°</p>
                
                <div className="w-full space-y-1.5 mt-auto">
                  <div className="flex items-center justify-between text-[9px] font-bold"><span className="text-blue-500">أمطار</span><span>{hour.rainProb}%</span></div>
                  <div className="flex items-center justify-between text-[9px] font-bold"><span className="text-slate-400">رياح</span><span>{hour.wind}</span></div>
                  <div className="flex items-center justify-between text-[9px] font-bold"><span className="text-blue-300">رطوبة</span><span>{hour.hum}%</span></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  );
};

// ==========================================
// 3. شاشة الرادار التفاعلية (بدون حقوق)
// ==========================================
const RadarPage = ({ isDark, selectedCity }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeLayer, setActiveLayer] = useState('rain'); 
  const [radarFrames, setRadarFrames] = useState({ rain: [], clouds:[] });
  const[currentFrameIndex, setCurrentFrameIndex] = useState(0);

  const textColor = isDark ? 'text-slate-100' : 'text-slate-800';
  const panelBg = isDark ? 'bg-slate-800/90 border-slate-700 text-white' : 'bg-white/90 border-white text-slate-800';

  useEffect(() => {
    const fetchRadar = async () => {
      try {
        const res = await secureFetch('https://api.rainviewer.com/public/weather-maps.json');
        const host = res.host;
        const pastRain = res.radar.past ||[];
        const nowcastRain = res.radar.nowcast || [];
        const rainUrls = [...pastRain, ...nowcastRain].map(f => `${host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`); 
        const infrared = res.satellite.infrared ||[];
        const cloudUrls = infrared.map(f => `${host}${f.path}/256/{z}/{x}/{y}/0/1_1.png`); 
        setRadarFrames({ rain: rainUrls, clouds: cloudUrls });
        setCurrentFrameIndex(pastRain.length > 0 ? pastRain.length - 1 : 0);
      } catch (e) { console.error("Radar Error:", e); }
    };
    fetchRadar();
  },[]);

  useEffect(() => {
    let interval;
    const currentList = activeLayer === 'rain' ? radarFrames.rain : radarFrames.clouds;
    if (isPlaying && currentList.length > 0 && activeLayer !== 'wind') {
      interval = setInterval(() => setCurrentFrameIndex(prev => (prev + 1) % currentList.length), 1000);
    }
    return () => clearInterval(interval);
  },[isPlaying, radarFrames, activeLayer]);

  const mapTileUrl = isDark ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
  const activeUrlList = activeLayer === 'rain' ? radarFrames.rain : radarFrames.clouds;

  return (
    <div className="animate-in fade-in duration-700 pb-28 lg:pb-10 h-[80vh] flex flex-col">
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className={`text-3xl font-black drop-shadow-sm flex items-center gap-2 ${textColor}`}><Radar className="w-8 h-8 text-orange-500" /> رادار مباشر</h2>
        <div className={`flex p-1 rounded-full backdrop-blur-md ${isDark ? 'bg-slate-700/50' : 'bg-slate-200/50'}`}>
          <button onClick={() => {setActiveLayer('rain'); setIsPlaying(false);}} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeLayer === 'rain' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>أمطار</button>
          <button onClick={() => {setActiveLayer('clouds'); setIsPlaying(false);}} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeLayer === 'clouds' ? 'bg-slate-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>سحب</button>
          <button onClick={() => {setActiveLayer('wind'); setIsPlaying(false);}} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeLayer === 'wind' ? 'bg-green-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>رياح</button>
        </div>
      </div>
      <div className={`flex-1 relative rounded-[32px] overflow-hidden border shadow-xl z-0 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-white bg-slate-200'}`} dir="ltr">
        <MapContainer key={`${selectedCity.lat}-${selectedCity.lon}-${isDark}`} center={[selectedCity.lat, selectedCity.lon]} zoom={6} style={{ height: '100%', width: '100%', zIndex: 0 }} zoomControl={false} attributionControl={false}>
          <TileLayer url={mapTileUrl} />
          {activeLayer !== 'wind' && activeUrlList.length > 0 && <TileLayer url={activeUrlList[currentFrameIndex] || activeUrlList[0]} opacity={0.65} zIndex={10} />}
          {activeLayer === 'wind' && <div className="absolute inset-0 z-10 pointer-events-none opacity-30 mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/wind.png')] animate-[slide_10s_linear_infinite]"></div>}
        </MapContainer>
        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-white p-3 rounded-xl text-[10px] font-bold border border-white/20 z-[99]" dir="rtl">
          <p className="mb-2 opacity-80 text-center">{activeLayer === 'rain' ? 'كثافة الأمطار' : activeLayer === 'clouds' ? 'كثافة السحب' : 'سرعة الرياح'}</p>
          <div className="flex flex-col items-center">
            <div className={`w-24 h-2 rounded-full mb-1 ${activeLayer === 'rain' ? 'bg-gradient-to-l from-red-500 via-blue-500 to-blue-200' : activeLayer === 'clouds' ? 'bg-gradient-to-l from-white to-transparent' : 'bg-gradient-to-l from-red-500 via-yellow-400 to-green-400'}`}></div>
            <div className="flex justify-between w-full opacity-70"><span>خفيف</span><span>عنيف</span></div>
          </div>
        </div>
        <div className={`absolute bottom-4 left-4 right-4 backdrop-blur-2xl p-4 rounded-3xl border shadow-lg flex flex-col gap-3 z-[99] ${panelBg}`} dir="rtl">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsPlaying(!isPlaying)} disabled={activeLayer === 'wind'} className={`w-12 h-12 rounded-full flex justify-center items-center text-white shadow-lg transition-transform shrink-0 ${activeLayer === 'wind' ? 'bg-slate-400 opacity-50 cursor-not-allowed' : 'bg-orange-500 active:scale-90'}`}>
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
            </button>
            <div className="flex-1">
              <div className="flex justify-between text-[10px] font-bold mb-2 opacity-70"><span>سابق</span><span className="text-orange-500">الآن</span><span>توقع مستقبلي</span></div>
              <div className="relative w-full h-2 bg-slate-200 rounded-full overflow-hidden dark:bg-slate-600">
                <div className={`absolute top-0 left-0 h-full bg-orange-500 rounded-full transition-all duration-300`} style={{ width: activeLayer === 'wind' ? '50%' : `${((currentFrameIndex + 1) / (activeUrlList.length || 1)) * 100}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// الإعدادات العامة للمدير (نكتب الإيميل مرة واحدة هنا فقط)
// ==========================================
const MY_ADMIN_EMAIL = "3liigamiing@gmail.com"; 

// دالة ذكية للتحقق من المدير (تتجاهل الحروف الكابيتال والمسافات)
const checkIsAdmin = (user) => {
  if (!user || !user.email) return false;
  return user.email.toLowerCase().trim() === MY_ADMIN_EMAIL.toLowerCase().trim();
};

// ==========================================
// 4.1 شاشة قراءة المقال (رابط مخصص)
// ==========================================
const SingleArticlePage = ({ isDark }) => {
  const { articleId } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const textColor = isDark ? 'text-slate-100' : 'text-slate-800';
  const cardBg = isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-white';

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const docRef = doc(db, "articles", articleId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setArticle({ id: docSnap.id, ...docSnap.data() });
      } catch (error) { console.error("Error fetching article:", error); }
      setLoading(false);
    };
    fetchArticle();
  }, [articleId]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-orange-500" /></div>;
  if (!article) return <div className="text-center p-20 font-bold">المقال غير موجود أو تم حذفه.</div>;

  return (
    <div className="animate-in slide-in-from-bottom-8 duration-700 pb-28 lg:pb-10 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6 px-2">
        <button onClick={() => navigate('/articles')} className={`flex items-center gap-2 font-black px-4 py-2 rounded-full ${isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-800'}`}><ArrowRight className="w-5 h-5" /> رجوع للمقالات</button>
        <button onClick={copyLink} className={`flex items-center gap-2 font-black px-4 py-2 rounded-full transition-all ${copied ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'}`}>
          {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />} {copied ? 'تم النسخ!' : 'نسخ الرابط'}
        </button>
      </div>
      <div className={`backdrop-blur-xl border shadow-lg rounded-[32px] p-6 lg:p-10 ${cardBg} ${textColor}`}>
        <span className="bg-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-md mb-4 inline-block">{article.category}</span>
        <h1 className="text-3xl lg:text-4xl font-black mb-4 leading-tight">{article.title}</h1>
        <p className="text-xs font-bold text-slate-400 mb-8">{article.createdAt ? new Date(article.createdAt.toDate()).toLocaleDateString('ar-EG') : 'الآن'}</p>
        <div className="text-sm lg:text-base leading-loose whitespace-pre-wrap font-medium break-words text-right">{article.content}</div>
      </div>
    </div>
  );
};

// ==========================================
// 4.2 لوحة التحكم السرية للمدير (نشر وحذف)
// ==========================================
const AdminArticlesPage = ({ isDark, user, showToast }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isAdmin = checkIsAdmin(user);
  const textColor = isDark ? 'text-slate-100' : 'text-slate-800';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800';

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center">
        <Lock className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-black text-red-500 mb-2">منطقة محظورة</h2>
        <p className="font-bold text-slate-500">غير مصرح لك بالدخول لهذه الصفحة.</p>
      </div>
    );
  }

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!title || !category || !content) return showToast('أكمل جميع البيانات', 'error');
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "articles"), { title, category, content, createdAt: serverTimestamp() });
      showToast('تم نشر المقال بنجاح!', 'success');
      setTitle(''); setCategory(''); setContent('');
    } catch (error) { showToast('حدث خطأ أثناء النشر', 'error'); }
    setIsSubmitting(false);
  };

  return (
    <div className="animate-in fade-in duration-500 pb-28 lg:pb-10 max-w-2xl mx-auto">
      <h2 className={`text-3xl font-black mb-6 flex items-center gap-2 ${textColor}`}><Edit3 className="w-8 h-8 text-orange-500" /> لوحة الإدارة</h2>
      <form onSubmit={handlePublish} className={`p-6 rounded-[32px] shadow-lg mb-8 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="mb-4">
          <label className={`block text-xs font-bold mb-2 ${textColor}`}>عنوان المقال</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={`w-full p-4 rounded-2xl border outline-none font-bold ${inputBg}`} placeholder="اكتب العنوان هنا..." />
        </div>
        <div className="mb-4">
          <label className={`block text-xs font-bold mb-2 ${textColor}`}>التصنيف</label>
          <input type="text" value={category} onChange={e => setCategory(e.target.value)} className={`w-full p-4 rounded-2xl border outline-none font-bold ${inputBg}`} placeholder="مثال: إنذار مبكر، تحليلات..." />
        </div>
        <div className="mb-6">
          <label className={`block text-xs font-bold mb-2 ${textColor}`}>محتوى المقال</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} rows="6" className={`w-full p-4 rounded-2xl border outline-none font-medium resize-none ${inputBg}`} placeholder="اكتب تفاصيل المقال هنا..."></textarea>
        </div>
        <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-orange-500 text-white font-black rounded-2xl active:scale-95 transition-transform">
          {isSubmitting ? 'جاري النشر...' : 'نشر المقال الآن'}
        </button>
      </form>
    </div>
  );
};

// ==========================================
// 4. شاشة المقالات (الرئيسية)
// ==========================================
const ArticlesPage = ({ isDark, user }) => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  const isAdmin = checkIsAdmin(user);
  const cardBg = isDark ? 'bg-slate-800/80 border-slate-700 text-white' : 'bg-white/80 border-white text-slate-800';
  const textColor = isDark ? 'text-slate-100' : 'text-slate-800';

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const q = query(collection(db, "articles"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const arts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setArticles(arts);
      } catch (error) { console.error("Error:", error); }
      setLoading(false);
    };
    fetchArticles();
  }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation(); 
    if(window.confirm("هل أنت متأكد من حذف هذا المقال؟")) {
      await deleteDoc(doc(db, "articles", id));
      setArticles(articles.filter(a => a.id !== id));
    }
  };

  return (
    <div className="animate-in fade-in duration-500 pb-28 lg:pb-10 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6 px-2">
        <h2 className={`text-3xl font-black drop-shadow-sm ${textColor}`}>مقالات وتحليلات</h2>
        {/* الزرار ده مش هيظهر غير لو الدالة الذكية اتأكدت إن ده إيميلك */}
        {isAdmin && (
          <button onClick={() => navigate('/admin/articles')} className="bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1 shadow-md">
            <Plus className="w-4 h-4" /> إضافة مقال
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
      ) : articles.length === 0 ? (
        <div className={`text-center p-10 font-bold rounded-3xl border ${cardBg}`}>لا توجد مقالات حالياً.</div>
      ) : (
        <div className="space-y-4">
          {articles.map((article) => (
            <div key={article.id} onClick={() => navigate(`/article/${article.id}`)} className={`backdrop-blur-xl border shadow-sm rounded-3xl p-5 flex gap-4 cursor-pointer hover:opacity-80 transition-all active:scale-[0.98] ${cardBg} relative overflow-hidden`}>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border bg-orange-500/10 border-orange-500/20`}>
                <BookOpen className="w-7 h-7 text-orange-500" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-orange-500 text-white">{article.category}</span>
                <h3 className={`font-black text-sm lg:text-base mt-2 leading-snug ${textColor}`}>{article.title}</h3>
                <p className="text-[10px] font-bold mt-1 text-slate-400">{new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              {/* أيقونة المسح للمدير فقط */}
              {isAdmin && (
                <button onClick={(e) => handleDelete(e, article.id)} className="absolute top-4 left-4 p-2 bg-red-500/10 hover:bg-red-500/20 rounded-full transition-colors z-10">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
// ==========================================
// 5. شاشة الإعدادات
// ==========================================
const UserPage = ({ 
  showToast, isDark, toggleTheme, user, onLoginRequest, onLogout, weatherData,
  isCelsius, setIsCelsius, windUnit, setWindUnit, rainUnit, setRainUnit, 
  pressureUnit, setPressureUnit, radarTheme, setRadarTheme, batterySaver, setBatterySaver,
  followMeEnabled, setFollowMeEnabled, alertEnabled, setAlertEnabled
}) => {
  const [expandedFeature, setExpandedFeature] = useState(null);
  const [drawerInfo, setDrawerInfo] = useState({ isOpen: false, title: '', options:[], currentVal: '', onSelect: null });

  const cardBg = isDark ? 'bg-slate-800/80 border-slate-700 text-white' : 'bg-white/80 border-white text-slate-800';
  const textColor = isDark ? 'text-slate-100' : 'text-slate-800';
  const subTextColor = isDark ? 'text-slate-400' : 'text-slate-500';

  const openDrawer = (title, options, currentVal, onSelect) => setDrawerInfo({ isOpen: true, title, options, currentVal, onSelect });

  const SettingToggle = ({ icon: Icon, label, isOn, onToggle, color = "bg-orange-500" }) => (
    <div onClick={onToggle} className={`flex justify-between items-center p-4 backdrop-blur-lg border shadow-sm rounded-2xl mb-3 cursor-pointer active:scale-[0.98] transition-all hover:opacity-80 ${cardBg}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-600'}`}><Icon className="w-5 h-5" /></div>
        <span className="font-bold">{label}</span>
      </div>
      <div className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${isOn ? color : (isDark ? 'bg-slate-600' : 'bg-slate-200')}`}>
        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${isOn ? '-translate-x-6 right-0.5' : 'translate-x-0 right-0.5'}`}></div>
      </div>
    </div>
  );

  const SettingRow = ({ icon: Icon, label, value, isLocked = false, onClick }) => (
    <div onClick={isLocked ? onLoginRequest : onClick} className={`flex justify-between items-center p-4 backdrop-blur-lg border shadow-sm rounded-2xl mb-3 cursor-pointer active:scale-[0.98] transition-all hover:opacity-80 ${cardBg} ${isLocked ? 'opacity-70' : ''}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl border relative ${isDark ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
          <Icon className="w-5 h-5" />
          {isLocked && <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5 border-2 border-white"><Lock className="w-2.5 h-2.5 text-white" /></div>}
        </div>
        <span className="font-bold">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className={`text-xs font-bold px-2 py-1 rounded-md ${isDark ? 'text-orange-400 bg-orange-400/10' : 'text-orange-500 bg-orange-50'}`}>{value}</span>}
        <ChevronLeft className={`w-5 h-5 ${subTextColor}`} />
      </div>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500 pb-28 lg:pb-10 max-w-2xl mx-auto">
      <h2 className={`text-3xl font-black mb-6 drop-shadow-sm px-2 ${textColor}`}>حسابي والإعدادات</h2>
      
      {/* 🔴 تفاصيل حساب المستخدم الحقيقية بفايربيز 🔴 */}
      {user ? (
        <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-[32px] p-6 text-white mb-8 shadow-[0_15px_30px_-10px_rgba(16,185,129,0.5)] relative overflow-hidden flex items-center justify-between hover-3d">
          <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-white/30 rounded-full blur-2xl animate-glow-pulse"></div>
          <div className="relative z-10 flex items-center gap-4">
            {user.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-14 h-14 rounded-full border-2 border-white/50 shadow-lg" />
            ) : (
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/50 backdrop-blur-md shadow-lg"><User className="w-7 h-7 text-white" /></div>
            )}
            <div><p className="text-[10px] font-bold text-green-100 mb-0.5">مرحباً بك،</p><h3 className="font-black text-xl drop-shadow-md">{user.displayName || user.email?.split('@')[0]}</h3></div>
          </div>
          <button onClick={onLogout} className="relative z-10 bg-white/20 hover:bg-red-500 hover:text-white p-3 rounded-full backdrop-blur-md transition-all active:scale-90 shadow-md"><LogOut className="w-5 h-5 text-white" /></button>
        </div>
      ) : (
        <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900 rounded-[32px] p-6 text-white mb-8 shadow-2xl relative overflow-hidden hover-3d group">
          <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-orange-500/30 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative z-10">
            <span className="bg-orange-500 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider mb-2 inline-block">حماية البيانات</span>
            <h3 className="font-black text-xl mb-2 leading-tight">أنشئ حسابك للوصول المتقدم</h3>
            <button onClick={onLoginRequest} className="w-full mt-4 py-3.5 bg-white text-slate-900 font-black rounded-xl active:scale-95 transition-transform hover:bg-slate-100 shadow-md">تسجيل الدخول / إنشاء حساب</button>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h3 className={`text-sm font-black mb-3 px-2 ${subTextColor}`}>مظهر التطبيق</h3>
        <div onClick={toggleTheme} className={`flex justify-between items-center p-4 backdrop-blur-lg border shadow-sm rounded-2xl mb-3 cursor-pointer active:scale-[0.98] transition-all hover:opacity-80 ${cardBg}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-700 border-slate-600 text-yellow-400' : 'bg-slate-50 border-slate-100 text-slate-800'}`}>{isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}</div>
            <span className="font-bold">تبديل الوضع</span>
          </div>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-md ${isDark ? 'text-orange-400 bg-orange-400/10' : 'text-orange-500 bg-orange-50'}`}>{isDark ? 'الوضع الليلي' : 'الوضع النهاري'}</span>
        </div>
      </div>
      
      <div className="mb-8">
        <h3 className={`text-sm font-black mb-3 px-2 ${subTextColor}`}>لوحات التحكم الاحترافية</h3>
        
        {/* 1. حالة الطرق والقيادة */}
        <div className="mb-3">
          <SettingRow icon={RouteIcon} label="حالة الطرق والسفر" isLocked={!user} onClick={() => setExpandedFeature(expandedFeature === 'roads' ? null : 'roads')} />
          {expandedFeature === 'roads' && user && (
            <div className={`p-5 mt-1 rounded-3xl border shadow-lg animate-in slide-in-from-top-2 ${isDark ? 'bg-slate-800/80 border-slate-600' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center mb-4 border-b pb-3 dark:border-slate-700">
                <div className="flex items-center gap-2"><Car className="w-5 h-5 text-orange-500" /><h4 className="font-black text-sm">مؤشر أمان القيادة</h4></div>
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${(weatherData?.hourly?.visibility?.[0]/1000) < 5 || weatherData?.daily?.precipitation_probability_max?.[0] > 30 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                  {(weatherData?.hourly?.visibility?.[0]/1000) < 5 ? 'خطر: شبورة/غبار' : weatherData?.daily?.precipitation_probability_max?.[0] > 30 ? 'انزلاق: طرق مبللة' : 'القيادة آمنة'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                  <p className={`text-[10px] font-bold mb-1 ${subTextColor}`}>الرؤية الأفقية</p>
                  <p className="text-xl font-black text-purple-500">{Math.round((weatherData?.hourly?.visibility?.[0] || 10000)/1000)} <span className="text-xs">كم</span></p>
                </div>
                <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                  <p className={`text-[10px] font-bold mb-1 ${subTextColor}`}>مخاطر الأمطار</p>
                  <p className="text-xl font-black text-blue-500">{weatherData?.daily?.precipitation_probability_max?.[0] || 0}%</p>
                </div>
              </div>
              <p className={`text-[10px] font-bold mt-3 leading-relaxed ${subTextColor}`}>* الرياح الجانبية على الطرق السريعة تسجل أقصى هبات بحوالي {Math.round(weatherData?.daily?.wind_gusts_10m_max?.[0] || 0)} كم/س.</p>
            </div>
          )}
        </div>

        {/* 2. الطقس الزراعي */}
        <div className="mb-3">
          <SettingRow icon={Leaf} label="الطقس الزراعي (ندى ورطوبة)" isLocked={!user} onClick={() => setExpandedFeature(expandedFeature === 'agri' ? null : 'agri')} />
          {expandedFeature === 'agri' && user && (
            <div className={`p-5 mt-1 rounded-3xl border shadow-lg animate-in slide-in-from-top-2 ${isDark ? 'bg-slate-800/80 border-slate-600' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center mb-4 border-b pb-3 dark:border-slate-700">
                <div className="flex items-center gap-2"><Leaf className="w-5 h-5 text-green-500" /><h4 className="font-black text-sm">بيانات المحاصيل</h4></div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-[10px] font-bold mb-1"><span className={subTextColor}>خطر تكون الفطريات (رطوبة عالية)</span><span>{Math.round(weatherData?.current?.relative_humidity_2m || 0)}%</span></div>
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${Math.round(weatherData?.current?.relative_humidity_2m || 0) > 70 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${weatherData?.current?.relative_humidity_2m || 0}%` }}></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                    <p className={`text-[10px] font-bold mb-1 ${subTextColor}`}>نقطة الندى (Dew)</p>
                    <p className="text-xl font-black text-blue-400">{Math.round(weatherData?.hourly?.dew_point_2m?.[0] || 0)}°</p>
                  </div>
                  <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                    <p className={`text-[10px] font-bold mb-1 ${subTextColor}`}>معدل تبخر التربة</p>
                    <p className="text-sm font-black text-orange-400">{Math.round(weatherData?.current?.temperature_2m || 0) > 30 ? 'عالي جداً' : 'معتدل'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. الملف الصحي */}
        <div className="mb-3">
          <SettingRow icon={Stethoscope} label="الملف الصحي (ربو وحساسية)" isLocked={!user} onClick={() => setExpandedFeature(expandedFeature === 'health' ? null : 'health')} />
          {expandedFeature === 'health' && user && (
            <div className={`p-5 mt-1 rounded-3xl border shadow-lg animate-in slide-in-from-top-2 ${isDark ? 'bg-slate-800/80 border-slate-600' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center mb-4 border-b pb-3 dark:border-slate-700">
                <div className="flex items-center gap-2"><Heart className="w-5 h-5 text-red-500" /><h4 className="font-black text-sm">مؤشر جودة الحياة</h4></div>
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${Math.round(weatherData?.current?.wind_speed_10m || 0) > 25 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                  {Math.round(weatherData?.current?.wind_speed_10m || 0) > 25 ? 'تحذير لمرضى الربو' : 'أجواء صحية'}
                </span>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-[10px] font-bold mb-1"><span className={subTextColor}>إثارة الغبار والأتربة</span><span>{Math.round(weatherData?.current?.wind_speed_10m || 0)} كم/س</span></div>
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${Math.round(weatherData?.current?.wind_speed_10m || 0) > 25 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min((Math.round(weatherData?.current?.wind_speed_10m || 0) / 40) * 100, 100)}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-bold mb-1"><span className={subTextColor}>مؤشر خطر ضربات الشمس (UV)</span><span>{Math.round(weatherData?.daily?.uv_index_max?.[0] || 0)}</span></div>
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${Math.round(weatherData?.daily?.uv_index_max?.[0] || 0) > 7 ? 'bg-red-500' : 'bg-yellow-400'}`} style={{ width: `${Math.min((Math.round(weatherData?.daily?.uv_index_max?.[0] || 0) / 11) * 100, 100)}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. الطقس البحري */}
        <div className="mb-3">
          <SettingRow icon={Waves} label="الطقس البحري وحالة الموج" isLocked={!user} onClick={() => setExpandedFeature(expandedFeature === 'marine' ? null : 'marine')} />
          {expandedFeature === 'marine' && user && (
            <div className={`p-5 mt-1 rounded-3xl border shadow-lg animate-in slide-in-from-top-2 ${isDark ? 'bg-slate-800/80 border-slate-600' : 'bg-white border-slate-200'}`}>
               <div className="flex justify-between items-center mb-4 border-b pb-3 dark:border-slate-700">
                <div className="flex items-center gap-2"><Waves className="w-5 h-5 text-blue-500" /><h4 className="font-black text-sm">الملاحة والصيد</h4></div>
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${Math.round(weatherData?.daily?.wind_gusts_10m_max?.[0] || 0) > 35 ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                  {Math.round(weatherData?.daily?.wind_gusts_10m_max?.[0] || 0) > 35 ? 'مضطرب وغير آمن' : 'معتدل وآمن'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                  <p className={`text-[10px] font-bold mb-1 ${subTextColor}`}>ارتفاع الموج التقريبي</p>
                  <p className="text-xl font-black text-blue-500">{(Math.round(weatherData?.current?.wind_speed_10m || 0) * 0.05).toFixed(1)} <span className="text-xs">متر</span></p>
                </div>
                <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                  <p className={`text-[10px] font-bold mb-1 ${subTextColor}`}>أقصى سرعة هبات</p>
                  <p className="text-xl font-black text-cyan-500">{Math.round(weatherData?.daily?.wind_gusts_10m_max?.[0] || 0)} <span className="text-xs">كم/س</span></p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 5. النشرة الصباحية */}
        <div className="mb-3">
          <SettingRow icon={Coffee} label="تخصيص النشرة الصباحية" isLocked={!user} onClick={() => setExpandedFeature(expandedFeature === 'morning' ? null : 'morning')} />
          {expandedFeature === 'morning' && user && (
            <div className={`p-5 mt-1 rounded-3xl border shadow-lg animate-in slide-in-from-top-2 ${isDark ? 'bg-slate-800/80 border-slate-600' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-3 mb-4"><Coffee className="w-5 h-5 text-orange-500" /><h4 className="font-black text-sm">ميعاد ومحتوى الإشعار</h4></div>
              
              <div className="space-y-3 mb-4">
                <label className={`flex items-center gap-2 text-[11px] font-bold ${textColor}`}><input type="checkbox" defaultChecked className="w-4 h-4 accent-orange-500" /> ملخص الحرارة والرياح</label>
                <label className={`flex items-center gap-2 text-[11px] font-bold ${textColor}`}><input type="checkbox" defaultChecked className="w-4 h-4 accent-orange-500" /> تنبيهات المطر القوي</label>
                <label className={`flex items-center gap-2 text-[11px] font-bold ${textColor}`}><input type="checkbox" className="w-4 h-4 accent-orange-500" /> نصائح ارتداء الملابس</label>
              </div>

              <div className="flex w-full gap-3">
                <input type="time" defaultValue="07:00" className={`flex-1 p-3 rounded-xl border outline-none font-black text-center ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`} />
                <button onClick={() => {showToast('تم الحفظ. جاري ربط الإشعارات السحابية...', 'success'); setExpandedFeature(null);}} className="px-6 bg-orange-500 text-white rounded-xl text-xs font-black hover:bg-orange-600 active:scale-95 transition-transform shadow-md">تفعيل الآن</button>
              </div>
            </div>
          )}
        </div>
      </div>
      
            <div className="mb-8">
        <h3 className={`text-sm font-black mb-3 px-2 ${subTextColor}`}>التنبيهات والأمان</h3>
        
        <SettingToggle 
          icon={MapPin} 
          label="تنبيهات الطقس المتنقل (Follow-Me)" 
          isOn={followMeEnabled} 
          onToggle={() => {
            if (!followMeEnabled) { // لو عايز يفتحها
              if (Notification.permission === 'denied') {
                showToast('الإشعارات محظورة! اضغط على رمز القفل 🔒 أعلى الشاشة للسماح', 'error');
                return;
              }
              Notification.requestPermission().then(perm => {
                if (perm === 'granted') {
                  setFollowMeEnabled(true);
                  new Notification('التتبع مفعل 📍', { body: 'سيتم تحديث الطقس تلقائياً بناءً على موقعك.', icon: '/logo.png' });
                  showToast('تم التفعيل بنجاح', 'success');
                } else {
                  showToast('تم رفض الصلاحية من المتصفح', 'error');
                }
              });
            } else { // لو عايز يقفلها
              setFollowMeEnabled(false);
              showToast('تم إيقاف تنبيهات الموقع', 'success');
            }
          }} 
          color="bg-blue-500" 
        />
        
        <SettingToggle 
          icon={ShieldAlert} 
          label="إنذارات الطقس القاسي (عواصف)" 
          isOn={alertEnabled} 
          onToggle={() => {
            if (!alertEnabled) { // لو عايز يفتحها
              if (Notification.permission === 'denied') {
                showToast('الإشعارات محظورة! اضغط على رمز القفل 🔒 أعلى الشاشة للسماح', 'error');
                return;
              }
              Notification.requestPermission().then(perm => {
                if (perm === 'granted') {
                  setAlertEnabled(true);
                  new Notification('إنذارات العواصف مفعلة ⛈️', { body: 'سنقوم بتنبيهك فوراً في حال رصد طقس خطر.', icon: '/logo.png' });
                  showToast('تم التفعيل بنجاح', 'success');
                } else {
                  showToast('تم رفض الصلاحية من المتصفح', 'error');
                }
              });
            } else { // لو عايز يقفلها
              setAlertEnabled(false);
              showToast('تم إيقاف إنذارات العواصف', 'success');
            }
          }} 
          color="bg-red-500" 
        />
      </div>
      <div className="mb-8">
        <h3 className={`text-sm font-black mb-3 px-2 ${subTextColor}`}>تخصيص وحدات القياس</h3>
        <SettingToggle icon={Thermometer} label="الحرارة (مئوية °C)" isOn={isCelsius} onToggle={() => setIsCelsius(!isCelsius)} />
        <SettingRow icon={Wind} label="سرعة الرياح" value={windUnit.label} onClick={() => openDrawer('وحدة قياس الرياح',[{ id: 'kmh', label: 'كم / ساعة' }, { id: 'mph', label: 'ميل / ساعة' }, { id: 'knots', label: 'عقدة' }, { id: 'ms', label: 'متر / ثانية' }], windUnit.id, setWindUnit)} />
        <SettingRow icon={Droplets} label="كمية الأمطار" value={rainUnit.label} onClick={() => openDrawer('وحدة قياس الأمطار',[{ id: 'mm', label: 'مليمتر (mm)' }, { id: 'inch', label: 'بوصة (Inch)' }], rainUnit.id, setRainUnit)} />
        <SettingRow icon={Gauge} label="الضغط الجوي" value={pressureUnit.label} onClick={() => openDrawer('الضغط الجوي',[{ id: 'hpa', label: 'هيكتوباسكال (hPa)' }, { id: 'mbar', label: 'مليبار (mbar)' }], pressureUnit.id, setPressureUnit)} />
      </div>

      <div className="mb-8">
        <h3 className={`text-sm font-black mb-3 px-2 ${subTextColor}`}>متقدم</h3>
        <SettingRow icon={Radar} label="ألوان خريطة الرادار" value={radarTheme.label} onClick={() => openDrawer('ألوان خريطة الرادار',[{ id: 'standard', label: 'الوضع القياسي' }, { id: 'contrast', label: 'تباين عالي' }, { id: 'dark', label: 'الوضع الليلي' }], radarTheme.id, setRadarTheme)} />
        <SettingToggle icon={Battery} label="وضع توفير الطاقة" isOn={batterySaver} onToggle={() => setBatterySaver(!batterySaver)} color="bg-green-500" />
      </div>

      {drawerInfo.isOpen && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-sm flex items-end lg:items-center lg:justify-center animate-in fade-in" onClick={() => setDrawerInfo({ ...drawerInfo, isOpen: false })}>
          <div className={`w-full lg:w-96 rounded-t-[32px] lg:rounded-[32px] p-6 pb-12 lg:pb-6 animate-in slide-in-from-bottom-full lg:zoom-in-95 duration-300 border ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-white text-slate-800'}`} onClick={(e) => e.stopPropagation()}>
            <div className={`w-12 h-1.5 rounded-full mx-auto mb-6 lg:hidden ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`}></div>
            <h3 className="font-black text-xl mb-4 text-center lg:text-right">{drawerInfo.title}</h3>
            <div className="space-y-2">
              {drawerInfo.options.map((opt) => {
                const isSelected = drawerInfo.currentVal === opt.id;
                return (
                  <button key={opt.id} onClick={() => { drawerInfo.onSelect(opt); setDrawerInfo({ ...drawerInfo, isOpen: false }); }} 
                    className={`w-full flex items-center justify-between p-4 rounded-2xl font-bold transition-all border ${isSelected ? (isDark ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-orange-50 text-orange-600 border-orange-200') : (isDark ? 'bg-slate-700 text-slate-300 border-transparent hover:bg-slate-600' : 'bg-slate-50 text-slate-600 border-transparent hover:bg-slate-100')}`}>
                    {opt.label}
                    {isSelected && <Check className="w-5 h-5 text-orange-500" strokeWidth={3} />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 6. التطبيق الرئيسي الشامل 
// 🔴 (مربوط بفايربيز وجوجل وفيسبوك حقيقي) 🔴
// ==========================================
function App() {
  const [toast, setToast] = useState({ isVisible: false, message: '', type: '' });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false); // حالة نافذة الإشعارات للزوار الجدد
  
  // 💾 التخزين المحلي للإعدادات
  const [isDark, setIsDark] = useState(() => localStorage.getItem('isDark') === 'true');
  // 💾 التخزين المحلي الشامل لكل الإعدادات 💾
  const [isCelsius, setIsCelsius] = useState(() => localStorage.getItem('isCelsius') !== 'false');
  const safeParse = (key, defaultVal) => { try { const item = localStorage.getItem(key); return item ? JSON.parse(item) : defaultVal; } catch(e) { return defaultVal; } };
  const [windUnit, setWindUnit] = useState(() => safeParse('windUnit', { id: 'kmh', label: 'كم / ساعة' }));
  const [rainUnit, setRainUnit] = useState(() => safeParse('rainUnit', { id: 'mm', label: 'مليمتر (mm)' }));
  const [pressureUnit, setPressureUnit] = useState(() => safeParse('pressureUnit', { id: 'hpa', label: 'هيكتوباسكال (hPa)' }));
  const [radarTheme, setRadarTheme] = useState(() => safeParse('radarTheme', { id: 'standard', label: 'الوضع القياسي' }));
  const [batterySaver, setBatterySaver] = useState(() => localStorage.getItem('batterySaver') === 'true');
  
  // حالة زراير الإشعارات
  const isNotifGranted = 'Notification' in window && Notification.permission === 'granted';
  const [followMeEnabled, setFollowMeEnabled] = useState(() => (localStorage.getItem('followMeEnabled') === 'true' && isNotifGranted));
  const [alertEnabled, setAlertEnabled] = useState(() => (localStorage.getItem('alertEnabled') === 'true' && isNotifGranted));

  // حالة الموافقة على ملفات تعريف الارتباط
  const [cookieConsent, setCookieConsent] = useState(() => localStorage.getItem('cookieConsent') === 'true');
  const [selectedCity, setSelectedCity] = useState(() => {
    const saved = localStorage.getItem('selectedCity');
    return saved ? JSON.parse(saved) : { name: "القاهرة، مصر", lat: 30.0444, lon: 31.2357 };
  });

  const [searchQuery, setSearchQuery] = useState("");
  const handleSearchInput = (e) => setSearchQuery(e.target.value);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false); 
  const [weatherData, setWeatherData] = useState(null);
  
  // 🔐 حالات فايربيز (Firebase)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  // 🔴 الاستماع الحي لتغيرات المستخدم من فايربيز 🔴
  useEffect(() => {
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
      });
      return () => unsubscribe();
    }
  },[]);

  useEffect(() => { 
    localStorage.setItem('isDark', isDark); 
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [isDark]);
  useEffect(() => { localStorage.setItem('selectedCity', JSON.stringify(selectedCity)); }, [selectedCity]);

  // جلب الطقس 15 يوم وتطبيق وحدات القياس فعلياً
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const tempUnit = isCelsius ? "" : "&temperature_unit=fahrenheit";
        const windApiUnit = windUnit.id === 'mph' ? "&wind_speed_unit=mph" : windUnit.id === 'knots' ? "&wind_speed_unit=kn" : windUnit.id === 'ms' ? "&wind_speed_unit=ms" : "";
        
        // قراءة وحدات المطر والضغط (لو مش موجودة في اللوكال ستورج بنحط الافتراضي)
        const savedRainUnit = JSON.parse(localStorage.getItem('rainUnit'))?.id || 'mm';
        const rainApiUnit = savedRainUnit === 'inch' ? "&precipitation_unit=inch" : "";
        
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${selectedCity.lat}&longitude=${selectedCity.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,pressure_msl,wind_speed_10m,cape,temperature_850hPa,relative_humidity_700hPa,relative_humidity_500hPa&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m,visibility,surface_pressure,dew_point_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_probability_max,sunrise,sunset,uv_index_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,precipitation_sum&timezone=auto&forecast_days=16${tempUnit}${windApiUnit}${rainApiUnit}&_=${Date.now()}`;
        
        const data = await secureFetch(url);
        setWeatherData(data);
      } catch (error) { setWeatherData(null); }
    };
    fetchWeather();
  }, [selectedCity, isCelsius, windUnit]); // هنحتاج نربط rainUnit هنا بعدين لما نرفعها لـ App

  // أوامر حفظ الإعدادات في الذاكرة فور تغييرها
  useEffect(() => { localStorage.setItem('isCelsius', isCelsius); }, [isCelsius]);
  useEffect(() => { localStorage.setItem('windUnit', JSON.stringify(windUnit)); }, [windUnit]);
  useEffect(() => { localStorage.setItem('rainUnit', JSON.stringify(rainUnit)); }, [rainUnit]);
  useEffect(() => { localStorage.setItem('pressureUnit', JSON.stringify(pressureUnit)); }, [pressureUnit]);
  useEffect(() => { localStorage.setItem('radarTheme', JSON.stringify(radarTheme)); }, [radarTheme]);
  useEffect(() => { localStorage.setItem('batterySaver', batterySaver); }, [batterySaver]);
  useEffect(() => { localStorage.setItem('followMeEnabled', followMeEnabled); }, [followMeEnabled]);
  useEffect(() => { localStorage.setItem('alertEnabled', alertEnabled); }, [alertEnabled]);
  // تتبع الزيارات وعرض نافذة التنبيهات للزوار الجدد
  useEffect(() => {
    // غيرنا اسم المفتاح عشان يصفر العداد ويبدأ يحسب من جديد
    let visits = parseInt(localStorage.getItem('appVisits_v2') || '0');
    
    // الشاشة هتطلع لو الزيارات أقل من 3، ولو المستخدم لسه مأداش قرار (سماح أو حظر)
    if (visits < 3 && 'Notification' in window && Notification.permission === 'default') {
      const timer = setTimeout(() => {
        setShowNotifPrompt(true);
      }, 4000); // هتطلع بعد 4 ثواني
      
      localStorage.setItem('appVisits_v2', (visits + 1).toString());
      return () => clearTimeout(timer);
    }
  }, []);
const handleEnableNotifications = async () => {
    if (!('Notification' in window)) {
      showToast('متصفحك لا يدعم الإشعارات', 'error');
      setShowNotifPrompt(false);
      return;
    }
    try {
      let perm = Notification.permission;
      if (perm === 'default') perm = await Notification.requestPermission();

      if (perm === 'granted') {
        showToast('تم تفعيل التنبيهات بنجاح 🔔', 'success');
        // هنا السر: بنأمر الزراير اللي جوه الإعدادات تفتح أوتوماتيك
        setFollowMeEnabled(true);
        setAlertEnabled(true);
        new Notification('مرحباً بك!', { body: 'سنقوم بتنبيهك عند اقتراب أمطار أو عواصف.', icon: '/logo.png' });
      } else if (perm === 'denied') {
        showToast('مرفوضة: اضغط على القفل 🔒 أعلى الشاشة للسماح', 'error');
      }
    } catch (error) { console.error(error); }
    setShowNotifPrompt(false);
  };

  // بحث آمن مع Debounce
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setIsSearching(false); return; }
    setIsSearching(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await secureFetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&language=ar&count=5`);
        setSearchResults(res.results ||[]);
      } catch (error) { setSearchResults([]); }
      setIsSearching(false);
    }, 600); 
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const showToast = useCallback((message, type) => {
    setToast({ isVisible: true, message, type });
    setTimeout(() => setToast({ isVisible: false, message: '', type: '' }), 4000);
  },[]);

  const toggleTheme = () => setIsDark(!isDark);
  
  const handleSelectCity = (cityObj) => {
    const cityName = `${cityObj.name}${cityObj.admin1 ? `، ${cityObj.admin1}` : ''}، ${cityObj.country}`;
    setSelectedCity({ name: cityName, lat: cityObj.latitude, lon: cityObj.longitude });
    setIsSearchOpen(false); setSearchQuery(''); setSearchResults([]);
    showToast(`تم عرض الطقس في: ${cityObj.name}`, 'success');
  };

  // 🔴 دالة التسجيل الحقيقية بفايربيز (إيميل وباسوورد) 🔴
  const handleFirebaseAuth = async (e) => {
    e.preventDefault();
    if (!auth) return showToast('تحذير: لم يتم تفعيل فايربيز بعد', 'error');
    setAuthLoading(true);
    try {
      if (isSignUpMode) {
        await createUserWithEmailAndPassword(auth, email, password);
        showToast('تم إنشاء حسابك بنجاح!', 'success');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('تم تسجيل الدخول بنجاح', 'success');
      }
      setIsAuthModalOpen(false); setEmail(""); setPassword("");
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') showToast('هذا الإيميل مستخدم مسبقاً', 'error');
      else if (error.code === 'auth/weak-password') showToast('كلمة المرور ضعيفة جداً', 'error');
      else showToast('البيانات غير صحيحة', 'error');
    }
    setAuthLoading(false);
  };

  // 🔴 دالة التسجيل الحقيقية (جوجل وفيسبوك Popups) 🔴
  const handleSocialAuth = async (providerName) => {
    if (!auth) return showToast('تحذير: لم يتم تفعيل فايربيز بعد', 'error');
    try {
      const { signInWithPopup, GoogleAuthProvider, FacebookAuthProvider } = await import('firebase/auth');
      const provider = providerName === 'Google' ? new GoogleAuthProvider() : new FacebookAuthProvider();
      
      const result = await signInWithPopup(auth, provider);
      showToast(`مرحباً ${result.user.displayName}`, 'success');
      setIsAuthModalOpen(false);
    } catch (error) {
      if (error.code !== 'auth/popup-closed-by-user') {
        showToast(`فشل الدخول بـ ${providerName}`, 'error');
      }
    }
  };

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      showToast('تم تسجيل الخروج بأمان', 'success');
    }
  };

  const getLocation = () => {
    if ("geolocation" in navigator) {
      showToast('جاري تحديد موقعك...', 'success');
      navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        try {
          const res = await secureFetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=ar`);
          if(res.results && res.results[0]) handleSelectCity(res.results[0]);
          else { setSelectedCity({ name: "موقعك الحالي", lat, lon }); showToast('تم التحديد', 'success'); }
        } catch(e) { setSelectedCity({ name: "موقعك الحالي", lat, lon }); }
      }, () => { showToast('يرجى تفعيل الـ GPS', 'error'); });
    }
  };

  const appBg = isDark ? 'bg-slate-900 bg-cosmic' : 'bg-[#f4f6f9] bg-gradient-to-br from-slate-50 to-orange-50/20';
  const headerBg = isDark ? 'bg-slate-900/60 border-slate-700/50 backdrop-blur-2xl' : 'bg-white/60 border-white/50 backdrop-blur-2xl';
  const textColor = isDark ? 'text-slate-100' : 'text-slate-800';

  return (
    <Router>
      <ErrorBoundary>
        <div className={`${appBg} min-h-screen font-sans ${textColor} selection:bg-orange-500/30 transition-colors duration-500 relative overflow-x-hidden flex flex-col lg:flex-row`} dir="rtl">
          {isDark && <div className="stars-overlay"></div>}
          
          <aside className={`hidden lg:flex flex-col w-24 backdrop-blur-2xl border-l fixed right-0 top-0 h-screen py-8 z-[100] shadow-[10px_0_40px_rgba(0,0,0,0.05)] items-center justify-between transition-colors duration-500 ${isDark ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white/60 border-white/50'}`}>
            <div className="flex flex-col items-center gap-8">
              <div className="w-12 h-12 rounded-full overflow-hidden shadow-lg border-2 border-orange-400 bg-white hover:shadow-orange-500/40 transition-shadow animate-float"><img src={logoImg} alt="لوجو" onError={(e) => e.target.src = 'https://via.placeholder.com/150/FF8C00/FFFFFF?text=W'} className="w-full h-full object-cover" /></div>
              <nav className="flex flex-col gap-4">
                <NavItem to="/" icon={<Home />} label="الرئيسية" isDark={isDark} />
                <NavItem to="/radar" icon={<Radar />} label="الرادار" isDark={isDark} />
                <NavItem to="/articles" icon={<BookOpen />} label="مقالات" isDark={isDark} />
                <NavItem to="/user" icon={<Settings />} label="إعدادات" isDark={isDark} />
              </nav>
            </div>
          </aside>

          <div className="flex-1 lg:pr-24 flex flex-col min-h-screen relative z-10">
            <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type} />

            {/* 🔴 نافذة تسجيل الدخول الحقيقية بفايربيز وجوجل 🔴 */}
            {isAuthModalOpen && (
              <div className="fixed inset-0 z-[999999] bg-slate-900/70 backdrop-blur-sm flex justify-center items-center p-4 animate-in fade-in" onClick={() => setIsAuthModalOpen(false)}>
                <div className={`w-full max-w-sm rounded-[32px] p-6 shadow-2xl animate-in zoom-in-95 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-white'}`} onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className={`font-black text-xl ${isDark ? 'text-white' : 'text-slate-800'}`}>{isSignUpMode ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}</h3>
                    <button onClick={() => setIsAuthModalOpen(false)} className={`p-2 rounded-full active:scale-90 transition ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}><X className="w-5 h-5" /></button>
                  </div>
                  <form onSubmit={handleFirebaseAuth} className="space-y-4">
                    <div>
                      <label className={`text-xs font-bold mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>البريد الإلكتروني</label>
                      <div className={`flex items-center px-4 py-3 rounded-xl border focus-within:ring-2 ring-orange-500 transition-all ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                        <Mail className="w-5 h-5 text-slate-400 ml-2" />
                        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} maxLength={50} placeholder="name@example.com" className={`w-full bg-transparent border-none outline-none font-medium ${isDark ? 'text-white' : 'text-slate-800'}`} dir="ltr" />
                      </div>
                    </div>
                    <div>
                      <label className={`text-xs font-bold mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>كلمة المرور</label>
                      <div className={`flex items-center px-4 py-3 rounded-xl border focus-within:ring-2 ring-orange-500 transition-all ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                        <Lock className="w-5 h-5 text-slate-400 ml-2" />
                        <input type="password" required value={password} onChange={e => setPassword(e.target.value)} minLength={6} maxLength={30} placeholder="••••••••" className={`w-full bg-transparent border-none outline-none font-medium tracking-widest ${isDark ? 'text-white' : 'text-slate-800'}`} dir="ltr" />
                      </div>
                    </div>
                    <button type="submit" disabled={authLoading} className="w-full py-3.5 flex justify-center items-center bg-orange-500 hover:bg-orange-600 text-white font-black rounded-xl active:scale-95 transition-transform shadow-md mt-2 disabled:opacity-70">
                      {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isSignUpMode ? 'إنشاء الحساب' : 'دخول للحساب')}
                    </button>
                  </form>
                  <div className="mt-4 text-center">
                    <button type="button" onClick={() => setIsSignUpMode(!isSignUpMode)} className={`text-xs font-bold ${isDark ? 'text-orange-400' : 'text-orange-600'} hover:underline`}>
                      {isSignUpMode ? 'لديك حساب بالفعل؟ سجل دخولك' : 'ليس لديك حساب؟ أنشئ حساباً'}
                    </button>
                  </div>
                  <div className="mt-6 flex items-center gap-3">
                    <div className={`h-px flex-1 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}></div><span className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>أو باستخدام</span><div className={`h-px flex-1 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    {/* 🔴 زراير تسجيل الدخول بجوجل وفيسبوك 🔴 */}
                    <button type="button" onClick={() => handleSocialAuth('Google')} className="flex-1 flex items-center justify-center gap-2 py-3 bg-white text-slate-800 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 active:scale-95 transition-transform shadow-sm"><Globe className="w-5 h-5 text-red-500" /> Google</button>
                    <button type="button" onClick={() => handleSocialAuth('Facebook')} className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 active:scale-95 transition-transform shadow-sm">Facebook</button>
                  </div>
                </div>
              </div>
            )}

            {isSearchOpen && (
              <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-sm flex flex-col p-4 items-center justify-start pt-20 animate-in fade-in" onClick={() => setIsSearchOpen(false)}>
                <div className={`rounded-[32px] w-full max-w-lg p-6 shadow-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/90 border-white backdrop-blur-xl'}`} onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className={`font-black text-xl ${isDark ? 'text-white' : 'text-slate-800'}`}>ابحث عن مدينة</h3>
                    <button onClick={() => {setIsSearchOpen(false); setSearchQuery(''); setSearchResults([]);}} className={`p-2 rounded-full active:scale-90 transition ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}><X className="w-5 h-5" /></button>
                  </div>
                  <div className={`relative shadow-inner rounded-2xl border focus-within:ring-2 ring-orange-400 transition-all ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-100 border-slate-200'}`}>
                    <Search className="w-5 h-5 text-orange-500 absolute right-4 top-4" />
                    <input type="text" maxLength={40} value={searchQuery} onChange={handleSearchInput} placeholder="اكتب اسم مدينة بالعالم..." className={`w-full bg-transparent border-none py-4 pr-12 pl-12 outline-none font-bold placeholder-slate-400 ${isDark ? 'text-white' : 'text-slate-800'}`} autoFocus />
                    {isSearching && <Loader2 className="w-5 h-5 text-orange-500 absolute left-4 top-4 animate-spin" />}
                  </div>
                  {searchQuery && (
                    <div className={`mt-4 max-h-60 overflow-y-auto rounded-2xl border shadow-inner ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                      {!isSearching && searchResults.length > 0 ? (
                        searchResults.map((city, idx) => (
                          <div key={idx} onClick={() => handleSelectCity(city)} className={`p-4 border-b last:border-b-0 cursor-pointer font-bold flex items-center gap-3 transition-colors active:scale-[0.99] ${isDark ? 'border-slate-600 hover:bg-slate-600 text-slate-200' : 'border-slate-200 hover:bg-orange-50 text-slate-700'}`}>
                            <MapPin className="w-5 h-5 text-orange-500 shrink-0" /> 
                            <div className="flex flex-col"><span>{city.name}</span><span className="text-[10px] opacity-70">{city.admin1 ? `${city.admin1}، ` : ''}{city.country}</span></div>
                          </div>
                        ))
                      ) : (!isSearching && searchResults.length === 0) ? (
                        <div className={`p-5 text-center font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>لم يتم العثور على نتائج...</div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            )}
{/* نافذة عرض الإشعارات للزوار الجدد */}
            {showNotifPrompt && (
              <div className="fixed inset-0 z-[999999] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4 animate-in fade-in">
                <div className={`rounded-[32px] w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-white'} text-center`}>
                  <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-8 h-8 text-orange-500 animate-bounce" />
                  </div>
                  <h3 className={`font-black text-xl mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>لا تدع الطقس يفاجئك!</h3>
                  <p className={`text-sm font-bold mb-6 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    هل تود تفعيل التنبيهات الذكية؟ سنقوم بإرسال إشعارات فورية لك في حال اقتراب أمطار رعدية أو عواصف ترابية لحمايتك.
                  </p>
                  <div className="flex gap-3">
                    <button onClick={handleEnableNotifications} className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black active:scale-95 transition-transform shadow-md">
                      تفعيل التنبيهات
                    </button>
                    <button onClick={() => setShowNotifPrompt(false)} className={`flex-1 py-3 rounded-xl font-black active:scale-95 transition-transform border ${isDark ? 'bg-slate-700 text-slate-300 border-slate-600' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      ربما لاحقاً
                    </button>
                  </div>
                </div>
              </div>
            )}
            {isNotifOpen && (
              <div className="fixed inset-0 z-[999999] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4 animate-in fade-in" onClick={() => setIsNotifOpen(false)}>
                <div className={`rounded-[40px] w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-white'}`} onClick={(e) => e.stopPropagation()}>
                  <div className={`flex justify-between items-center mb-6 border-b pb-4 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                    <h3 className="font-black text-xl flex items-center gap-2"><Bell className="w-6 h-6 text-orange-500" /> الإشعارات</h3>
                    <button onClick={() => setIsNotifOpen(false)} className={`p-2 rounded-full active:scale-90 transition ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}><X className="w-5 h-5" /></button>
                  </div>
                  <div className={`p-4 rounded-3xl border active:scale-[0.98] cursor-pointer transition-transform ${isDark ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50 border-orange-100'}`}>
                    <p className="font-black text-sm text-orange-500">لا توجد إنذارات خطيرة</p>
                    <p className={`text-xs mt-1 font-bold ${isDark ? 'text-slate-300' : 'text-orange-800/70'}`}>الطقس مستقر في {selectedCity.name.split('،')[0]} حالياً.</p>
                  </div>
                </div>
              </div>
            )}

            <header className={`sticky top-0 z-[500] px-5 py-4 flex justify-between items-center backdrop-blur-xl border-b transition-colors duration-500 lg:px-10 ${headerBg}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 lg:hidden rounded-full overflow-hidden border-2 border-orange-400 shadow-sm bg-white flex-shrink-0"><img src={logoImg} alt="لوجو" onError={(e) => e.target.src = 'https://via.placeholder.com/150/FF8C00/FFFFFF?text=W'} className="w-full h-full object-cover" /></div>
                <h1 className="font-black text-lg lg:text-2xl tracking-tight whitespace-nowrap drop-shadow-sm">طقس مصر وبلاد الشام</h1>
              </div>
              <div className="flex items-center gap-2 lg:gap-3">
                <button onClick={() => setIsNotifOpen(true)} className={`relative p-2.5 lg:p-3 rounded-full shadow-sm active:scale-90 transition-all border ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300' : 'bg-white/50 border-white hover:bg-white text-slate-600'}`}>
                  <Bell className="w-5 h-5 lg:w-6 lg:h-6" strokeWidth={2.5} /><span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
                </button>
                <div className={`flex items-center backdrop-blur-md rounded-full shadow-sm border p-1 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white/50 border-white'}`}>
                  <button onClick={getLocation} className={`p-2 lg:p-3 rounded-full active:scale-90 transition-all ${isDark ? 'text-blue-400 hover:bg-slate-700' : 'text-blue-600 hover:bg-blue-50'}`} title="تحديد موقعي"><Navigation className="w-4 h-4 lg:w-5 lg:h-5" strokeWidth={2.5} /></button>
                  <div className={`w-px h-5 lg:h-6 mx-0.5 ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`}></div>
                  <button onClick={() => setIsSearchOpen(true)} className={`p-2 lg:p-3 rounded-full active:scale-90 transition-all ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-50'}`}><Search className="w-4 h-4 lg:w-5 lg:h-5" strokeWidth={2.5} /></button>
                </div>
              </div>
            </header>

            <main className="p-5 lg:p-10 max-w-lg lg:max-w-6xl mx-auto w-full relative z-10 flex-1">
              <Routes>
                <Route path="/" element={<HomePage isDark={isDark} selectedCity={selectedCity} weatherData={weatherData} />} />
                <Route path="/day-details/:dayIndex" element={<DayDetailsPage isDark={isDark} weatherData={weatherData} selectedCity={selectedCity} />} />
                <Route path="/radar" element={<RadarPage isDark={isDark} selectedCity={selectedCity} />} />
                <Route path="/articles" element={<ArticlesPage isDark={isDark} user={user} />} />
<Route path="/article/:articleId" element={<SingleArticlePage isDark={isDark} />} />
<Route path="/admin/articles" element={<AdminArticlesPage isDark={isDark} user={user} showToast={showToast} />} /> 
                <Route path="/articles" element={<ArticlesPage isDark={isDark} user={user} />} />
<Route path="/article/:articleId" element={<SingleArticlePage isDark={isDark} />} />
<Route path="/admin/articles" element={<AdminArticlesPage isDark={isDark} user={user} showToast={showToast} />} />
                <Route path="/user" element={<UserPage showToast={showToast} isDark={isDark} toggleTheme={toggleTheme} user={user} onLoginRequest={() => setIsAuthModalOpen(true)} onLogout={handleLogout} weatherData={weatherData} isCelsius={isCelsius} setIsCelsius={setIsCelsius} windUnit={windUnit} setWindUnit={setWindUnit} rainUnit={rainUnit} setRainUnit={setRainUnit} pressureUnit={pressureUnit} setPressureUnit={setPressureUnit} radarTheme={radarTheme} setRadarTheme={setRadarTheme} batterySaver={batterySaver} setBatterySaver={setBatterySaver} followMeEnabled={followMeEnabled} setFollowMeEnabled={setFollowMeEnabled} alertEnabled={alertEnabled} setAlertEnabled={setAlertEnabled} />} /> 
              </Routes>
            </main>
          </div>

          <div className="lg:hidden fixed bottom-6 left-0 w-full flex justify-center z-[100] px-4 pointer-events-none">
            <nav className={`w-full max-w-sm backdrop-blur-2xl border shadow-[0_10px_40px_rgba(0,0,0,0.1)] rounded-[32px] flex justify-around p-2 pointer-events-auto transition-colors duration-500 ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-white'}`}>
              <NavItem to="/" icon={<Home />} label="الرئيسية" isDark={isDark} />
              <NavItem to="/radar" icon={<Radar />} label="الرادار" isDark={isDark} />
              <NavItem to="/articles" icon={<BookOpen />} label="مقالات" isDark={isDark} />
              <NavItem to="/user" icon={<Settings />} label="إعدادات" isDark={isDark} />
            </nav>
          </div>
        </div> 
        {/* رسالة ملفات تعريف الارتباط (Cookies) */}
          {!cookieConsent && (
            <div className={`fixed bottom-0 lg:bottom-4 left-0 w-full lg:w-auto lg:left-4 lg:max-w-sm z-[999999] p-4 lg:rounded-3xl border shadow-2xl animate-in slide-in-from-bottom-full ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-6 h-6 text-orange-500 shrink-0 mt-1" />
                <div>
                  <h4 className={`text-sm font-black mb-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>سياسة الخصوصية وملفات الارتباط</h4>
                  <p className={`text-[10px] font-bold mb-3 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    نحن نستخدم ملفات تعريف الارتباط (Cookies) لتحسين تجربتك، وحفظ تفضيلاتك (مثل وحدات القياس ومدينتك المفضلة) لضمان تقديم أفضل وأدق خدمة لك.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => { setCookieConsent(true); localStorage.setItem('cookieConsent', 'true'); }} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-black py-2 rounded-xl transition-all shadow-md active:scale-95">أوافق</button>
                    <button onClick={() => { setCookieConsent(true); }} className={`flex-1 text-xs font-black py-2 rounded-xl transition-all border ${isDark ? 'bg-slate-700 text-slate-300 border-slate-600' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>رفض</button>
                  </div>
                </div>
              </div>
            </div>
          )}
      </ErrorBoundary>
    </Router>
  );
}

function NavItem({ to, icon, label, isDark }) {
  const location = useLocation();
  const isActive = location.pathname === to || (to === '/' && location.pathname.includes('/day-details'));
  return (
    <Link to={to} className={`flex flex-col items-center justify-center w-16 h-16 lg:w-16 lg:h-16 rounded-[24px] lg:rounded-[20px] active:scale-90 transition-all duration-500 ${isActive ? 'bg-gradient-to-tr from-orange-500 to-amber-500 shadow-lg shadow-orange-500/40 animate-glow-pulse' : (isDark ? 'hover:bg-slate-700 hover:shadow-lg' : 'hover:bg-slate-50 hover:shadow-lg')}`}>
      {React.cloneElement(icon, { className: `w-6 h-6 lg:w-6 lg:h-6 mb-1 transition-all duration-300 ${isActive ? 'text-white scale-110 drop-shadow-md' : (isDark ? 'text-slate-400' : 'text-slate-400')}`, strokeWidth: isActive ? 2.5 : 2 })}
      <span className={`text-[10px] font-black tracking-wide ${isActive ? 'text-white' : (isDark ? 'text-slate-400' : 'text-slate-400')}`}>{label}</span>
    </Link>
  );
}

export default App;