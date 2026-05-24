import React, { useState, useEffect } from 'react';
import { Bell, X, AlertTriangle, Wind, Thermometer, CloudRain, ShieldCheck, Snowflake, CloudLightning, CloudFog, Loader2, Sparkles, Coffee } from 'lucide-react';

export function VisitorNotificationPrompt({ open, isDark, onEnable, onClose }) {
  if (!open) return null;
  return (
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
          <button onClick={onEnable} className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black active:scale-95 transition-transform shadow-md">تفعيل التنبيهات</button>
          <button onClick={onClose} className={`flex-1 py-3 rounded-xl font-black active:scale-95 transition-transform border ${isDark ? 'bg-slate-700 text-slate-300 border-slate-600' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>ربما لاحقاً</button>
        </div>
      </div>
    </div>
  );
}

export function NotificationCenterModal({ open, isDark, selectedCityName, weatherData, onClose, windUnit, rainUnit }) {
  const [dynamicNotifications, setDynamicNotifications] = useState([]);
  const [isGeneratingMorning, setIsGeneratingMorning] = useState(false);

  useEffect(() => {
    if (!open || !weatherData) return;

    const newAlerts = [];
    let alertId = 1;

    // 1. Weather Alerts (Dynamic from weatherData)
    const daily = weatherData.daily;
    if (daily) {
      // Wind
      const windToday = daily.wind_gusts_10m_max?.[0] || daily.wind_speed_10m_max?.[0];
      if (windToday >= 40) {
        newAlerts.push({ id: alertId++, type: 'alert', title: 'تحذير من رياح نشطة', desc: `رياح تصل سرعتها إلى ${Math.round(windToday)} ${windUnit?.label?.split(' ')[0] || 'كم/س'} تقترب من منطقتك.`, time: 'اليوم', icon: Wind, color: 'text-orange-500', bg: 'bg-orange-500/10' });
      }

      // Cold
      const minTemp = daily.temperature_2m_min?.[0];
      if (minTemp <= 5) {
        newAlerts.push({ id: alertId++, type: 'alert', title: 'موجة صقيع', desc: `الحرارة ستنخفض إلى ${Math.round(minTemp)}° مئوية. ارتد ملابس ثقيلة.`, time: 'اليوم', icon: Snowflake, color: 'text-blue-500', bg: 'bg-blue-500/10' });
      }

      // Rain
      const rainToday = daily.precipitation_sum?.[0];
      if (rainToday >= 10) {
        newAlerts.push({ id: alertId++, type: 'alert', title: 'أمطار غزيرة', desc: `متوقع هطول ${Math.round(rainToday)} ${rainUnit?.id === 'inch' ? 'بوصة' : 'ملم'}. خذ حذرك في الطرقات.`, time: 'اليوم', icon: CloudRain, color: 'text-blue-500', bg: 'bg-blue-500/10' });
      }

      // Storms & Fog
      const wCode = daily.weather_code?.[0] ?? daily.weathercode?.[0];
      if ([95, 96, 99].includes(wCode)) {
        newAlerts.push({ id: alertId++, type: 'alert', title: 'عواصف رعدية', desc: `احذر! عواصف رعدية متوقعة اليوم في منطقتك.`, time: 'اليوم', icon: CloudLightning, color: 'text-purple-500', bg: 'bg-purple-500/10' });
      }
      if ([45, 48].includes(wCode)) {
        newAlerts.push({ id: alertId++, type: 'alert', title: 'ضباب كثيف', desc: `انخفاض الرؤية الأفقية بسبب الضباب. قد بحذر!`, time: 'اليوم', icon: CloudFog, color: 'text-slate-500', bg: 'bg-slate-500/10' });
      }
    }

    // AQI / Dust
    const aqiData = weatherData.aqi;
    const dustLevel = aqiData?.current?.dust || aqiData?.dust?.[0];
    if (dustLevel > 100) {
      newAlerts.push({ id: alertId++, type: 'alert', title: 'عاصفة ترابية', desc: `مستويات غبار عالية (${Math.round(dustLevel)}). ينصح مرضى الحساسية بالبقاء في الداخل.`, time: 'اليوم', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' });
    }

    // System Update
    newAlerts.push({ id: alertId++, type: 'system', title: 'مرحباً بك!', desc: 'نظام الإشعارات والإنذارات يعمل الآن ويراقب حالة الطقس لحمايتك.', time: 'مؤخراً', icon: ShieldCheck, color: 'text-green-500', bg: 'bg-green-500/10' });

    setDynamicNotifications(newAlerts);

    // 2. Generate Morning Bulletin
    generateMorningBulletin(weatherData, selectedCityName);
    
  }, [open, weatherData, selectedCityName]);

  const generateMorningBulletin = async (data, city) => {
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `morning_bulletin_${city}_${today}`;
    
    // Check if we already have it cached
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      setDynamicNotifications(prev => [{
        id: 'morning_bulletin', type: 'ai', title: 'النشرة الصباحية الذكية ☕', desc: cached, time: 'اليوم', icon: Sparkles, color: 'text-amber-500', bg: 'bg-amber-500/10'
      }, ...prev]);
      return;
    }

    setIsGeneratingMorning(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyA2R48bAmVbxhatxalNyekKv3QTD-xqHaQ';
      if (!apiKey) {
        setIsGeneratingMorning(false);
        return;
      }
      const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      
      const current = data.current || {};
      const daily = data.daily || {};
      const prompt = `أنت مذيع ومحلل طقس. اكتب نشرة صباحية ملهمة ومختصرة جداً (لا تتجاوز سطرين أو 3 سطور) لمدينة ${city}.
      البيانات: الحرارة الآن ${current.temperature_2m}°C. العظمى المتوقعة ${daily.temperature_2m_max?.[0]}°C والصغرى ${daily.temperature_2m_min?.[0]}°C.
      اكتب نصائح سريعة ومبهجة ولا تستخدم نجوم (**) للتنسيق أبدًا.`;

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] })
      });
      
      if(response.ok) {
        const resData = await response.json();
        const text = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          localStorage.setItem(cacheKey, text);
          setDynamicNotifications(prev => [{
            id: 'morning_bulletin', type: 'ai', title: 'النشرة الصباحية الذكية ☕', desc: text, time: 'الآن', icon: Sparkles, color: 'text-amber-500', bg: 'bg-amber-500/10'
          }, ...prev]);
        }
      }
    } catch (e) {
      console.error("فشل في توليد النشرة الصباحية", e);
    }
    setIsGeneratingMorning(false);
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[999998] bg-slate-900/40 backdrop-blur-sm animate-in fade-in" onClick={onClose} />
      <div className={`fixed top-4 right-4 bottom-24 lg:bottom-4 w-[calc(100%-32px)] max-w-sm z-[999999] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] animate-in slide-in-from-right duration-300 flex flex-col rounded-[32px] overflow-hidden border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
        
        <div className={`flex justify-between items-center p-5 sm:p-6 border-b ${isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white/80'} backdrop-blur-xl`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-full">
              <Bell className="w-6 h-6 text-orange-500" />
            </div>
            <h3 className={`font-black text-xl ${isDark ? 'text-white' : 'text-slate-800'}`}>مركز الإشعارات</h3>
          </div>
          <button onClick={onClose} className={`p-2 rounded-full active:scale-90 transition ${isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          
          {isGeneratingMorning && (
            <div className={`p-4 rounded-2xl border flex items-center gap-4 ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <Loader2 className="w-6 h-6 text-orange-500 animate-spin shrink-0" />
              <div>
                <h4 className={`font-black text-sm mb-1 text-orange-500`}>جاري توليد النشرة الصباحية...</h4>
                <p className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>الذكاء الاصطناعي يقوم بتحليل البيانات</p>
              </div>
            </div>
          )}

          {dynamicNotifications.length === 0 && !isGeneratingMorning ? (
            <div className="text-center py-10 opacity-50">لا توجد إشعارات حالياً</div>
          ) : (
            dynamicNotifications.map(n => {
              const Icon = n.icon;
              return (
                <div key={n.id} onClick={onClose} className={`p-4 rounded-2xl border transition-all cursor-pointer hover:scale-[1.02] ${isDark ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                  <div className="flex gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.bg}`}>
                      <Icon className={`w-5 h-5 ${n.color}`} />
                    </div>
                    <div>
                      <h4 className={`font-black text-sm mb-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{n.title}</h4>
                      <p className={`text-xs font-bold leading-relaxed mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} style={{whiteSpace: 'pre-line'}}>{n.desc}</p>
                      <span className="text-[10px] font-bold text-slate-400">{n.time}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </>
  );
}
