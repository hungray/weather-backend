import React, { useState } from 'react';
import { User, Bell, MapPin, Mail, LogOut, Navigation, Settings, Thermometer, Wind, Droplets, Eye, Route as RouteIcon, Coffee, Heart, Globe, ShieldAlert, ShieldCheck, Moon, Sun, Car, Leaf, Stethoscope, Waves, Battery, Gauge, Radar, Check, ChevronLeft, Lock } from 'lucide-react';

const SettingToggle = ({ icon: Icon, label, isOn, onToggle, color = 'bg-orange-500', isDark, cardBg }) => (
  <div onClick={onToggle} className={`flex flex-row justify-between items-center p-4 backdrop-blur-lg border shadow-sm rounded-2xl mb-3 cursor-pointer active:scale-[0.98] transition-all hover:opacity-80 ${cardBg}`}>
    <div className="flex items-center gap-3 min-w-0 pr-1">
      <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-600'}`}><Icon className="w-5 h-5" /></div>
      <span className="font-bold truncate">{label}</span>
    </div>
    <div className={`shrink-0 w-12 h-6 rounded-full relative transition-colors duration-300 ${isOn ? color : (isDark ? 'bg-slate-600' : 'bg-slate-200')}`}>
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${isOn ? '-translate-x-6 right-0.5' : 'translate-x-0 right-0.5'}`} />
    </div>
  </div>
);

const SettingRow = ({ icon: Icon, label, value, isLocked = false, onClick, isDark, cardBg, subTextColor, onLoginRequest }) => (
  <div onClick={isLocked ? onLoginRequest : onClick} className={`flex flex-row justify-between items-center p-4 backdrop-blur-lg border shadow-sm rounded-2xl mb-3 cursor-pointer active:scale-[0.98] transition-all hover:opacity-80 ${cardBg} ${isLocked ? 'opacity-70' : ''}`}>
    <div className="flex items-center gap-3 min-w-0 flex-1 pr-1">
      <div className={`p-2.5 rounded-xl border relative shrink-0 ${isDark ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
        <Icon className="w-5 h-5" />
        {isLocked && <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5 border-2 border-white"><Lock className="w-2.5 h-2.5 text-white" /></div>}
      </div>
      <span className="font-bold truncate text-sm sm:text-base">{label}</span>
    </div>
    <div className="flex items-center gap-2 shrink-0 justify-end">
      {value && <span className={`text-[10px] sm:text-xs font-bold px-2 py-1 rounded-md ${isDark ? 'text-orange-400 bg-orange-400/10' : 'text-orange-500 bg-orange-50'} max-w-[80px] sm:max-w-[150px] truncate`}>{value}</span>}
      <ChevronLeft className={`w-5 h-5 ${subTextColor}`} />
    </div>
  </div>
);

const UserPage = ({
  showToast, isDark, toggleTheme, user, onLoginRequest, onLogout, weatherData,
  isCelsius, setIsCelsius, windUnit, setWindUnit, rainUnit, setRainUnit,
  pressureUnit, setPressureUnit, radarTheme, setRadarTheme, batterySaver, setBatterySaver,
  followMeEnabled, setFollowMeEnabled, alertEnabled, setAlertEnabled
}) => {
  const [expandedFeature, setExpandedFeature] = useState(null);
  const [drawerInfo, setDrawerInfo] = useState({ isOpen: false, title: '', options: [], currentVal: '', onSelect: null });

  const [morningConfig, setMorningConfig] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('morningConfig')) || { time: '07:00', tempWind: true, heavyRain: true, clothes: false };
    } catch {
      return { time: '07:00', tempWind: true, heavyRain: true, clothes: false };
    }
  });

  const handleMorningConfigChange = (key, val) => {
    setMorningConfig(prev => ({ ...prev, [key]: val }));
  };

  const handleMorningSave = async () => {
    localStorage.setItem('morningConfig', JSON.stringify(morningConfig));
    if (user) {
      try {
        const { doc, setDoc } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        await setDoc(doc(db, 'users', user.uid), { morningConfig }, { merge: true });
      } catch (e) {
        console.error("Error saving morning config to firestore", e);
      }
    }
    showToast('تم الحفظ بنجاح', 'success');
    setExpandedFeature(null);
  };

  const cardBg = isDark ? 'bg-slate-800/80 border-slate-700 text-white' : 'bg-white/80 border-white text-slate-800';
  const textColor = isDark ? 'text-slate-100' : 'text-slate-800';
  const subTextColor = isDark ? 'text-slate-400' : 'text-slate-500';

  const openDrawer = (title, options, currentVal, onSelect) => setDrawerInfo({ isOpen: true, title, options, currentVal, onSelect });

  return (
    <div className="animate-in fade-in duration-500 pb-28 lg:pb-10 max-w-2xl mx-auto">
      <h2 className={`text-3xl font-black mb-6 drop-shadow-sm px-2 ${textColor}`}>حسابي والإعدادات</h2>
      {user ? (
        <div className="bg-linear-to-r from-green-500 via-emerald-500 to-teal-500 rounded-4xl p-6 text-white mb-8 shadow-[0_15px_30px_-10px_rgba(16,185,129,0.5)] relative overflow-hidden flex items-center justify-between hover-3d">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/30 rounded-full blur-2xl animate-glow-pulse" />
          <div className="relative z-10 flex items-center gap-4">
            {user.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-14 h-14 rounded-full border-2 border-white/50 shadow-lg" />
            ) : (
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/50 backdrop-blur-md shadow-lg"><User className="w-7 h-7 text-white" /></div>
            )}
            <div><p className="text-[10px] font-bold text-green-100 mb-0.5">مرحبا بك</p><h3 className="font-black text-xl drop-shadow-md">{user.displayName || user.email?.split('@')[0]}</h3></div>
          </div>
          <button onClick={onLogout} className="relative z-10 bg-white/20 hover:bg-red-500 hover:text-white p-3 rounded-full backdrop-blur-md transition-all active:scale-90 shadow-md"><LogOut className="w-5 h-5 text-white" /></button>
        </div>
      ) : (
        <div className="bg-linear-to-l from-slate-900 via-slate-800 to-slate-900 rounded-4xl p-6 text-white mb-8 shadow-2xl relative overflow-hidden hover-3d group">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-orange-500/30 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
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
        <div className="mb-3">
          <SettingRow icon={RouteIcon} label="حالة الطرق والسفر (Pro)" isLocked={!user} onLoginRequest={onLoginRequest} onClick={() => setExpandedFeature(expandedFeature === 'roads' ? null : 'roads')} isDark={isDark} cardBg={cardBg} subTextColor={subTextColor} />
          {expandedFeature === 'roads' && user && (
            <div className={`p-5 mt-1 rounded-3xl border shadow-lg animate-in slide-in-from-top-2 ${isDark ? 'bg-slate-800/80 border-slate-600' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center mb-4 border-b pb-3 dark:border-slate-700">
                <div className="flex items-center gap-2"><Car className="w-5 h-5 text-orange-500" /><h4 className="font-black text-sm">مؤشر أمان القيادة</h4></div>
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${(weatherData?.hourly?.visibility?.[0]/1000) < 5 || weatherData?.daily?.precipitation_probability_max?.[0] > 30 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                  {(weatherData?.hourly?.visibility?.[0]/1000) < 5 ? 'خطر: شبورة/غبار' : weatherData?.daily?.precipitation_probability_max?.[0] > 30 ? 'انزلاق: طرق مبللة' : 'القيادة آمنة وواضحة'}
                </span>
              </div>
              
              <div className={`p-4 mb-4 rounded-xl border flex gap-3 ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                <ShieldCheck className="w-6 h-6 text-emerald-500 shrink-0" />
                <div>
                  <p className={`text-xs font-bold leading-relaxed ${textColor}`}>
                    {weatherData?.daily?.wind_gusts_10m_max?.[0] > 40 ? '⚠️ احذر من الرياح الجانبية على الطرق السريعة (تتخطى 40 كم/س).' : '✅ لا توجد مخاطر رياح جانبية ملحوظة.'}
                    {' '}
                    {(weatherData?.hourly?.visibility?.[0]/1000) < 5 ? 'شغّل مصابيح الضباب وتجنب السرعة العالية.' : 'الرؤية ممتازة.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-white border-slate-200'}`}>
                  <p className={`text-[10px] font-bold mb-1 ${subTextColor}`}>الرؤية الأفقية</p>
                  <p className="text-xl font-black text-purple-500">{Math.round((weatherData?.hourly?.visibility?.[0] || 10000)/1000)} <span className="text-xs">كم</span></p>
                </div>
                <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-white border-slate-200'}`}>
                  <p className={`text-[10px] font-bold mb-1 ${subTextColor}`}>مخاطر الأمطار</p>
                  <p className="text-xl font-black text-blue-500">{weatherData?.daily?.precipitation_probability_max?.[0] || 0}%</p>
                </div>
                <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-white border-slate-200'}`}>
                  <p className={`text-[10px] font-bold mb-1 ${subTextColor}`}>هبات الرياح</p>
                  <p className="text-xl font-black text-orange-500">{Math.round(weatherData?.daily?.wind_gusts_10m_max?.[0] || 0)} <span className="text-xs">{windUnit?.label?.split(' ')[0] || 'كم/س'}</span></p>
                </div>
                <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-white border-slate-200'}`}>
                  <p className={`text-[10px] font-bold mb-1 ${subTextColor}`}>حرارة الأسفلت (تقريبي)</p>
                  <p className="text-xl font-black text-red-400">{Math.round(weatherData?.current?.temperature_2m || 0) + 7}°</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mb-3">
          <SettingRow icon={Leaf} label="الطقس الزراعي (Pro)" isLocked={!user} onLoginRequest={onLoginRequest} onClick={() => setExpandedFeature(expandedFeature === 'agri' ? null : 'agri')} isDark={isDark} cardBg={cardBg} subTextColor={subTextColor} />
          {expandedFeature === 'agri' && user && (
            <div className={`p-5 mt-1 rounded-3xl border shadow-lg animate-in slide-in-from-top-2 ${isDark ? 'bg-slate-800/80 border-slate-600' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center mb-4 border-b pb-3 dark:border-slate-700">
                <div className="flex items-center gap-2"><Leaf className="w-5 h-5 text-green-500" /><h4 className="font-black text-sm">بيانات المحاصيل والتربة</h4></div>
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${Math.round(weatherData?.current?.relative_humidity_2m || 0) > 75 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                  {Math.round(weatherData?.current?.relative_humidity_2m || 0) > 75 ? 'خطر فطريات' : 'رطوبة مثالية'}
                </span>
              </div>
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-[11px] font-bold mb-1.5"><span className={textColor}>تشبع الهواء بالرطوبة</span><span className={textColor}>{Math.round(weatherData?.current?.relative_humidity_2m || 0)}%</span></div>
                  <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${Math.round(weatherData?.current?.relative_humidity_2m || 0) > 70 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${weatherData?.current?.relative_humidity_2m || 0}%` }}></div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                  <div className={`p-3 rounded-2xl border flex flex-col justify-center ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                    <p className={`text-[10px] font-bold mb-1 ${subTextColor}`}>نقطة الندى (Dew)</p>
                    <p className="text-xl font-black text-blue-400">{Math.round(weatherData?.hourly?.dew_point_2m?.[0] || 0)}°</p>
                  </div>
                  <div className={`p-3 rounded-2xl border flex flex-col justify-center ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                    <p className={`text-[10px] font-bold mb-1 ${subTextColor}`}>معدل التبخر</p>
                    <p className="text-sm font-black text-orange-400">{Math.round(weatherData?.current?.temperature_2m || 0) > 30 ? 'عالي جدا' : 'معتدل'}</p>
                  </div>
                  <div className={`p-3 rounded-2xl border flex flex-col justify-center ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                    <p className={`text-[10px] font-bold mb-1 ${subTextColor}`}>رطوبة التربة (تقريبي)</p>
                    <p className="text-xl font-black text-emerald-400">{weatherData?.daily?.precipitation_sum?.[0] > 5 ? 'مشبعة' : 'جافة'}</p>
                  </div>
                  <div className={`p-3 rounded-2xl border flex flex-col justify-center ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                    <p className={`text-[10px] font-bold mb-1 ${subTextColor}`}>فرصة الصقيع</p>
                    <p className={`text-xl font-black ${weatherData?.daily?.temperature_2m_min?.[0] < 4 ? 'text-blue-500' : 'text-slate-400'}`}>{weatherData?.daily?.temperature_2m_min?.[0] < 4 ? 'عالية' : 'معدومة'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mb-3">
          <SettingRow icon={Stethoscope} label="الملف الصحي والربو (Pro)" isLocked={!user} onLoginRequest={onLoginRequest} onClick={() => setExpandedFeature(expandedFeature === 'health' ? null : 'health')} isDark={isDark} cardBg={cardBg} subTextColor={subTextColor} />
          {expandedFeature === 'health' && user && (
            <div className={`p-5 mt-1 rounded-3xl border shadow-lg animate-in slide-in-from-top-2 ${isDark ? 'bg-slate-800/80 border-slate-600' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center mb-4 border-b pb-3 dark:border-slate-700">
                <div className="flex items-center gap-2"><Heart className="w-5 h-5 text-red-500" /><h4 className="font-black text-sm">جودة الحياة وحساسية الصدر</h4></div>
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${(weatherData?.aqi?.current?.dust > 80) || Math.round(weatherData?.current?.wind_speed_10m || 0) > 25 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                  {(weatherData?.aqi?.current?.dust > 80) || Math.round(weatherData?.current?.wind_speed_10m || 0) > 25 ? 'تحذير لمرضى الربو' : 'أجواء نقية'}
                </span>
              </div>
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-[11px] font-bold mb-1.5"><span className={textColor}>إثارة الغبار والأتربة</span><span className={textColor}>{Math.round(weatherData?.current?.wind_speed_10m || 0)} {windUnit?.label?.split(' ')[0] || 'كم/س'}</span></div>
                  <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${Math.round(weatherData?.current?.wind_speed_10m || 0) > 25 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min((Math.round(weatherData?.current?.wind_speed_10m || 0) / 40) * 100, 100)}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] font-bold mb-1.5"><span className={textColor}>مؤشر خطر ضربات الشمس (UV Index)</span><span className={textColor}>{Math.round(weatherData?.daily?.uv_index_max?.[0] || 0)}</span></div>
                  <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${Math.round(weatherData?.daily?.uv_index_max?.[0] || 0) > 7 ? 'bg-red-500' : Math.round(weatherData?.daily?.uv_index_max?.[0] || 0) > 3 ? 'bg-orange-500' : 'bg-green-500'}`} style={{ width: `${Math.min((Math.round(weatherData?.daily?.uv_index_max?.[0] || 0) / 11) * 100, 100)}%` }}></div>
                  </div>
                </div>
                
                <div className={`p-4 rounded-xl border flex gap-3 ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                  <Stethoscope className="w-6 h-6 text-blue-500 shrink-0" />
                  <div>
                    <p className={`text-xs font-bold leading-relaxed ${textColor}`}>
                      {weatherData?.daily?.uv_index_max?.[0] > 7 ? '☀️ ننصح باستخدام واقي الشمس وتجنب التعرض المباشر لأشعة الشمس وقت الظهيرة. ' : ''}
                      {weatherData?.current?.wind_speed_10m > 25 ? '😷 الرياح نشطة ومثيرة للغبار، يجب على مرضى حساسية الصدر إغلاق النوافذ.' : '✅ الهواء نقي ومناسب للأنشطة الخارجية ومرضى الحساسية.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mb-3">
          <SettingRow icon={Waves} label="الطقس البحري والملاحة (Pro)" isLocked={!user} onLoginRequest={onLoginRequest} onClick={() => setExpandedFeature(expandedFeature === 'marine' ? null : 'marine')} isDark={isDark} cardBg={cardBg} subTextColor={subTextColor} />
          {expandedFeature === 'marine' && user && (
            <div className={`p-5 mt-1 rounded-3xl border shadow-lg animate-in slide-in-from-top-2 ${isDark ? 'bg-slate-800/80 border-slate-600' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center mb-4 border-b pb-3 dark:border-slate-700">
                <div className="flex items-center gap-2"><Waves className="w-5 h-5 text-blue-500" /><h4 className="font-black text-sm">حالة البحر والصيد</h4></div>
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${Math.round(weatherData?.daily?.wind_gusts_10m_max?.[0] || 0) > 35 ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                  {Math.round(weatherData?.daily?.wind_gusts_10m_max?.[0] || 0) > 35 ? 'مضطرب وغير آمن' : 'معتدل وآمن'}
                </span>
              </div>
              
              <div className="p-3 mb-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex gap-3">
                <ShieldAlert className="w-5 h-5 text-orange-500 shrink-0" />
                <p className={`text-[11px] font-bold leading-relaxed ${textColor}`}>
                  تنويه: ارتفاع الموج معروض تقريبياً ويعتبر <span className="font-black">دقيقاً للمدن الساحلية المفتوحة فقط</span> بناءً على سرعة الرياح. إذا كنت في مدينة داخلية فهذا يمثل الاضطراب الهوائي فقط.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                  <p className={`text-[10px] font-bold mb-1 ${subTextColor}`}>ارتفاع الموج (للسواحل)</p>
                  <p className="text-xl font-black text-blue-500">{(Math.round(weatherData?.current?.wind_speed_10m || 0) * 0.05).toFixed(1)} <span className="text-xs">متر</span></p>
                </div>
                <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                  <p className={`text-[10px] font-bold mb-1 ${subTextColor}`}>أقصى سرعة هبات</p>
                  <p className="text-xl font-black text-cyan-500">{Math.round(weatherData?.daily?.wind_gusts_10m_max?.[0] || 0)} <span className="text-xs">{windUnit?.label?.split(' ')[0] || 'كم/س'}</span></p>
                </div>
                <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                  <p className={`text-[10px] font-bold mb-1 ${subTextColor}`}>الضغط الجوي</p>
                  <p className="text-xl font-black text-emerald-500">{Math.round(weatherData?.current?.surface_pressure || 0)} <span className="text-xs">{pressureUnit?.id === 'mbar' ? 'mbar' : 'hPa'}</span></p>
                </div>
                <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                  <p className={`text-[10px] font-bold mb-1 ${subTextColor}`}>نشاط الصيد</p>
                  <p className={`text-sm font-black mt-2 ${Math.round(weatherData?.current?.wind_speed_10m || 0) < 20 ? 'text-green-500' : 'text-red-500'}`}>{Math.round(weatherData?.current?.wind_speed_10m || 0) < 20 ? 'مناسب ومستقر' : 'غير مناسب'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mb-3">
          <SettingRow icon={Coffee} label="تخصيص النشرة الصباحية" isLocked={!user} onLoginRequest={onLoginRequest} onClick={() => setExpandedFeature(expandedFeature === 'morning' ? null : 'morning')} isDark={isDark} cardBg={cardBg} subTextColor={subTextColor} />
          {expandedFeature === 'morning' && user && (
            <div className={`p-5 mt-1 rounded-3xl border shadow-lg animate-in slide-in-from-top-2 ${isDark ? 'bg-slate-800/80 border-slate-600' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-3 mb-4"><Coffee className="w-5 h-5 text-orange-500" /><h4 className="font-black text-sm">ميعاد ومحتوى الإشعار</h4></div>
              <div className="space-y-3 mb-4">
                <label className={`flex items-center gap-2 text-[11px] font-bold ${textColor}`}><input type="checkbox" checked={morningConfig.tempWind} onChange={e => handleMorningConfigChange('tempWind', e.target.checked)} className="w-4 h-4 accent-orange-500" /> ملخص الحرارة والرياح</label>
                <label className={`flex items-center gap-2 text-[11px] font-bold ${textColor}`}><input type="checkbox" checked={morningConfig.heavyRain} onChange={e => handleMorningConfigChange('heavyRain', e.target.checked)} className="w-4 h-4 accent-orange-500" /> تنبيهات المطر القوي</label>
                <label className={`flex items-center gap-2 text-[11px] font-bold ${textColor}`}><input type="checkbox" checked={morningConfig.clothes} onChange={e => handleMorningConfigChange('clothes', e.target.checked)} className="w-4 h-4 accent-orange-500" /> نصائح ارتداء الملابس</label>
              </div>
              <div className="flex w-full gap-3">
                <input type="time" value={morningConfig.time} onChange={e => handleMorningConfigChange('time', e.target.value)} className={`flex-1 p-3 rounded-xl border outline-none font-black text-center ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`} />
                <button onClick={handleMorningSave} className="px-6 bg-orange-500 text-white rounded-xl text-xs font-black hover:bg-orange-600 active:scale-95 transition-transform shadow-md">تفعيل وحفظ</button>
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
            if (!followMeEnabled) {
              if (Notification.permission === 'denied') {
                showToast('الإشعارات محظورة! اضغط على رمز القفل 🔒 أعلى الشاشة للسماح', 'error');
                return;
              }
              Notification.requestPermission().then(perm => {
                if (perm === 'granted') {
                  setFollowMeEnabled(true);
                  new Notification('التتبع مفعل 📍', { body: 'سيتم تحديث الطقس تلقائيا بناء على موقعك.', icon: '/logo.png' });
                  showToast('تم التفعيل بنجاح', 'success');
                } else {
                  showToast('تم رفض الصلاحية من المتصفح', 'error');
                }
              });
            } else {
              setFollowMeEnabled(false);
              showToast('تم إيقاف تنبيهات الموقع', 'success');
            }
          }}
          color="bg-blue-500"
          isDark={isDark} cardBg={cardBg}
        />
        <SettingToggle
          icon={ShieldAlert}
          label="إنذارات الطقس القاسي (عواصف)"
          isOn={alertEnabled}
          onToggle={() => {
            if (!alertEnabled) {
              if (Notification.permission === 'denied') {
                showToast('الإشعارات محظورة! اضغط على رمز القفل 🔒 أعلى الشاشة للسماح', 'error');
                return;
              }
              Notification.requestPermission().then(perm => {
                if (perm === 'granted') {
                  setAlertEnabled(true);
                  new Notification('إنذارات العواصف مفعلة ⛈️', { body: 'سنقوم بتنبيهك فورا في حال رصد طقس خطر.', icon: '/logo.png' });
                  showToast('تم التفعيل بنجاح', 'success');
                } else {
                  showToast('تم رفض الصلاحية من المتصفح', 'error');
                }
              });
            } else {
              setAlertEnabled(false);
              showToast('تم إيقاف إنذارات العواصف', 'success');
            }
          }}
          color="bg-red-500"
          isDark={isDark} cardBg={cardBg}
        />
      </div>
      <div className="mb-8">
        <h3 className={`text-sm font-black mb-3 px-2 ${subTextColor}`}>تخصيص وحدات القياس</h3>
        <SettingToggle icon={Thermometer} label="الحرارة (مئوية °C)" isOn={isCelsius} onToggle={() => setIsCelsius(!isCelsius)} isDark={isDark} cardBg={cardBg} />
        <SettingRow icon={Wind} label="سرعة الرياح" value={windUnit?.label} onClick={() => openDrawer('وحدة قياس الرياح', [{ id: 'kmh', label: 'كم / ساعة' }, { id: 'mph', label: 'ميل / ساعة' }, { id: 'knots', label: 'عقدة' }, { id: 'ms', label: 'متر / ثانية' }], windUnit?.id, setWindUnit)} isDark={isDark} cardBg={cardBg} subTextColor={subTextColor} onLoginRequest={onLoginRequest} />
        <SettingRow icon={Droplets} label="كمية الأمطار" value={rainUnit?.label} onClick={() => openDrawer('وحدة قياس الأمطار', [{ id: 'mm', label: 'مليمتر (mm)' }, { id: 'inch', label: 'بوصة (Inch)' }], rainUnit?.id, setRainUnit)} isDark={isDark} cardBg={cardBg} subTextColor={subTextColor} onLoginRequest={onLoginRequest} />
        <SettingRow icon={Gauge} label="الضغط الجوي" value={pressureUnit?.label} onClick={() => openDrawer('الضغط الجوي', [{ id: 'hpa', label: 'هيكتوباسكال (hPa)' }, { id: 'mbar', label: 'مليبار (mbar)' }], pressureUnit?.id, setPressureUnit)} isDark={isDark} cardBg={cardBg} subTextColor={subTextColor} onLoginRequest={onLoginRequest} />
      </div>

      <div className="mb-8">
        <h3 className={`text-sm font-black mb-3 px-2 ${subTextColor}`}>متقدم</h3>
        <SettingRow icon={Radar} label="ألوان خريطة الرادار" value={radarTheme?.label} onClick={() => openDrawer('ألوان خريطة الرادار', [{ id: 'standard', label: 'الوضع القياسي' }, { id: 'contrast', label: 'تباين عالي' }, { id: 'dark', label: 'الوضع الليلي' }], radarTheme?.id, setRadarTheme)} isDark={isDark} cardBg={cardBg} subTextColor={subTextColor} onLoginRequest={onLoginRequest} />
        <SettingToggle icon={Battery} label="وضع توفير الطاقة" isOn={batterySaver} onToggle={() => setBatterySaver(!batterySaver)} color="bg-green-500" isDark={isDark} cardBg={cardBg} />
      </div>

      {drawerInfo.isOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-end lg:items-center lg:justify-center animate-in fade-in" onClick={() => setDrawerInfo({ ...drawerInfo, isOpen: false })}>
          <div className={`w-full lg:w-96 rounded-t-[2rem] lg:rounded-[2rem] p-6 pb-28 lg:pb-6 animate-in slide-in-from-bottom-full lg:zoom-in-95 duration-300 border ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-white text-slate-800'}`} onClick={(e) => e.stopPropagation()}>
            <div className={`w-12 h-1.5 rounded-full mx-auto mb-6 lg:hidden ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`} />
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
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserPage;
