import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle } from 'lucide-react';

const NewsTicker = ({ isDark, weatherData }) => {
  const [news, setNews] = useState([]);
  const [isAlert, setIsAlert] = useState(false);

  useEffect(() => {
    // بناء أخبار بناءً على بيانات الطقس
    if (!weatherData) return;
    
    const headlines = [];
    let alertLevel = false;

    const currentTemp = weatherData.current?.temperature_2m;
    const windSpeed = weatherData.current?.wind_speed_10m;
    const rainProb = weatherData.daily?.precipitation_probability_max?.[0] || 0;

    if (currentTemp >= 38) {
      headlines.push("تحذير: موجة حارة شديدة تضرب المنطقة، يرجى تجنب أشعة الشمس المباشرة.");
      alertLevel = true;
    } else if (currentTemp <= 5) {
      headlines.push("تنبيه: طقس شديد البرودة واحتمالية تشكل الصقيع ليلاً.");
      alertLevel = true;
    }

    if (windSpeed >= 40) {
      headlines.push("تحذير: رياح قوية مثيرة للغبار والأتربة، يرجى الحذر أثناء القيادة.");
      alertLevel = true;
    }

    if (rainProb > 70) {
      headlines.push("تنبيه: فرص عالية جداً لهطول الأمطار اليوم، لا تنسَ مظلتك.");
    }

    if (headlines.length === 0) {
      headlines.push("الطقس مستقر في الوقت الحالي.");
      headlines.push("تابع تحديثات الرادار لمزيد من التفاصيل حول حركة السحب.");
    }

    setNews(headlines);
    setIsAlert(alertLevel);
  }, [weatherData]);

  if (news.length === 0) return null;

  const bgClass = isAlert 
    ? (isDark ? 'bg-red-900/50 border-red-500/50 text-red-200' : 'bg-red-100 border-red-300 text-red-800')
    : (isDark ? 'bg-indigo-900/40 border-indigo-500/30 text-indigo-100' : 'bg-indigo-50 border-indigo-200 text-indigo-800');

  const Icon = isAlert ? AlertTriangle : Bell;

  return (
    <div className={`flex items-center w-full max-w-6xl mx-auto overflow-hidden rounded-full border shadow-sm px-4 py-2 mt-4 backdrop-blur-md ${bgClass}`}>
      <div className="flex items-center gap-2 shrink-0 border-l border-current pl-3">
        <Icon className={`w-5 h-5 ${isAlert ? 'animate-pulse text-red-500' : 'text-indigo-500'}`} />
        <span className="text-xs font-black uppercase whitespace-nowrap">{isAlert ? 'عاجل' : 'أخبار الطقس'}</span>
      </div>
      <div className="overflow-hidden relative w-full flex items-center h-5 ml-4">
        <div className="absolute whitespace-nowrap animate-[shimmer_20s_linear_infinite] flex gap-10">
          {news.map((n, i) => (
            <span key={i} className="text-sm font-bold tracking-wide">{n}</span>
          ))}
          {/* Duplicate for infinite scroll effect */}
          {news.map((n, i) => (
            <span key={'dup'+i} className="text-sm font-bold tracking-wide">{n}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NewsTicker;
