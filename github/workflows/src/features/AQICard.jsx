import React from 'react';
import { Wind, Activity, Factory, Car, AlertTriangle, Info, Gauge } from 'lucide-react';

const AQICard = ({ weatherData, isDark }) => {
  const aqiData = weatherData?.aqi;
  
  if (!aqiData) return null;

  const aqi = aqiData.current?.european_aqi || aqiData.european_aqi?.[0] || 0;
  let status = "ممتاز";
  let colorClass = "text-emerald-500";
  let bgClass = "bg-emerald-500/10 border-emerald-500/30";
  let progressColor = "bg-emerald-500";
  let advice = "جودة الهواء مثالية. استمتع بالأنشطة الخارجية.";
  
  if (aqi > 20 && aqi <= 40) { 
    status = "جيد"; 
    colorClass = "text-green-500"; 
    bgClass = "bg-green-500/10 border-green-500/30"; 
    progressColor = "bg-green-500";
    advice = "جودة الهواء مقبولة. لا يوجد خطر على الصحة.";
  }
  else if (aqi > 40 && aqi <= 60) { 
    status = "متوسط"; 
    colorClass = "text-yellow-500"; 
    bgClass = "bg-yellow-500/10 border-yellow-500/30"; 
    progressColor = "bg-yellow-500";
    advice = "قد يشعر الأشخاص الحساسون ببعض الأعراض الطفيفة.";
  }
  else if (aqi > 60 && aqi <= 80) { 
    status = "رديء"; 
    colorClass = "text-orange-500"; 
    bgClass = "bg-orange-500/10 border-orange-500/30"; 
    progressColor = "bg-orange-500";
    advice = "ينصح بتقليل المجهود البدني الشاق في الخارج.";
  }
  else if (aqi > 80) { 
    status = "خطير"; 
    colorClass = "text-red-500"; 
    bgClass = "bg-red-500/10 border-red-500/30"; 
    progressColor = "bg-red-500";
    advice = "هواء غير صحي. يفضل البقاء في الداخل وتجنب الأنشطة الخارجية.";
  }

  const textColor = isDark ? 'text-slate-100' : 'text-slate-800';
  const subTextColor = isDark ? 'text-slate-400' : 'text-slate-500';
  const panelBg = isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/90 border-slate-200 shadow-sm';

  const pollutants = [
    { label: 'PM2.5 (غبار ناعم)', val: aqiData.current?.pm2_5 || aqiData.pm2_5?.[0], unit: 'µg/m³', max: 25 },
    { label: 'PM10 (غبار خشن)', val: aqiData.current?.pm10 || aqiData.pm10?.[0], unit: 'µg/m³', max: 50 },
    { label: 'O₃ (أوزون)', val: aqiData.current?.ozone || aqiData.ozone?.[0], unit: 'µg/m³', max: 100 },
    { label: 'CO (أول أكسيد الكربون)', val: aqiData.current?.carbon_monoxide || aqiData.carbon_monoxide?.[0], unit: 'µg/m³', max: 1000 },
    { label: 'NO₂ (نيتروجين)', val: aqiData.current?.nitrogen_dioxide || aqiData.nitrogen_dioxide?.[0], unit: 'µg/m³', max: 40 },
    { label: 'Dust (أتربة)', val: aqiData.current?.dust || aqiData.dust?.[0], unit: 'µg/m³', max: 100 }
  ];

  return (
    <div className={`p-5 sm:p-8 mb-8 rounded-[32px] border transition-all hover:shadow-lg ${panelBg}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-3 rounded-2xl ${bgClass}`}>
          <Wind className={`w-6 h-6 ${colorClass}`} />
        </div>
        <div>
          <h3 className={`font-black text-xl tracking-tight ${textColor}`}>جودة الهواء (AQI)</h3>
          <p className={`text-xs font-bold ${subTextColor}`}>مؤشر جودة الهواء الأوروبي</p>
        </div>
      </div>
      
      <div className="flex flex-col gap-6 mb-8">
        <div className={`p-5 rounded-3xl border flex flex-col sm:flex-row items-center sm:items-start gap-6 ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
          <div className="flex-1 w-full text-center sm:text-right">
            <div className="flex items-end justify-center sm:justify-start gap-2 mb-2">
              <span className={`text-5xl font-black ${colorClass}`}>{Math.round(aqi)}</span>
              <span className={`text-lg font-black pb-1 ${subTextColor}`}>/ 100</span>
            </div>
            <h4 className={`text-2xl font-black mb-2 ${colorClass}`}>{status}</h4>
            <p className={`text-sm font-bold leading-relaxed ${textColor}`}>{advice}</p>
          </div>
          <div className="w-full sm:w-1/2 flex flex-col justify-center pt-2 sm:pt-0">
            <div className="w-full h-3.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mb-2 shadow-inner">
              <div className={`h-full rounded-full transition-all duration-1000 ${progressColor}`} style={{ width: `${Math.min(aqi, 100)}%` }} />
            </div>
            <div className="flex justify-between text-[10px] font-black text-slate-400 px-1 mt-1">
              <span>ممتاز</span>
              <span>جيد</span>
              <span>متوسط</span>
              <span>رديء</span>
              <span>خطير</span>
            </div>
          </div>
        </div>
        
        {/* Alerts for extreme dust */}
        {(aqiData.current?.dust > 100 || aqiData.dust?.[0] > 100) && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 animate-in fade-in">
            <AlertTriangle className="w-6 h-6 text-orange-500 shrink-0 mt-0.5" />
            <div>
              <h5 className="font-black text-sm text-orange-600 dark:text-orange-400 mb-1">عاصفة ترابية وغبار</h5>
              <p className="text-xs font-bold text-orange-700/80 dark:text-orange-300/80 leading-relaxed">نسبة الغبار مرتفعة جداً في الجو. ينصح بإغلاق النوافذ وارتداء الكمامة بالخارج للوقاية من الحساسية.</p>
            </div>
          </div>
        )}
      </div>

      <h4 className={`text-sm font-black mb-4 flex items-center gap-2 ${textColor}`}>
        <Gauge className="w-5 h-5 text-sky-500" />
        تحليل الملوثات التفصيلي
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {pollutants.map((p, idx) => {
          if (p.val === undefined || p.val === null) return null;
          const val = Math.round(p.val);
          const isHigh = val > p.max;
          return (
            <div key={idx} className={`p-4 rounded-2xl border flex flex-col justify-between transition-transform hover:scale-105 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
              <span className={`text-[11px] font-bold mb-2 line-clamp-1 ${subTextColor}`}>{p.label}</span>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-xl font-black ${isHigh ? 'text-red-500' : textColor}`}>{val}</span>
                <span className={`text-[10px] font-bold ${subTextColor}`}>{p.unit}</span>
              </div>
              <div className="w-full h-1.5 mt-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div className={`h-full rounded-full ${isHigh ? 'bg-red-500' : 'bg-sky-500'}`} style={{ width: `${Math.min((val / p.max) * 100, 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AQICard;
