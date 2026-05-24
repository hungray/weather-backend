import React, { useState, useEffect } from 'react';
import { Search, MapPin, Scale, Thermometer, Wind, CloudRain, Droplets, Loader2, Info } from 'lucide-react';
import { secureFetch } from '../utils/weatherUtils';

const ComparisonBar = ({ title, icon: Icon, val1, val2, min, max, unit, inverseLogic = false, textColor, subTextColor, cardBg }) => {
  if (val1 === null || val2 === null) return null;
  
  // Normalize values to 0-100% for the bars
  const range = max - min;
  const p1 = Math.max(0, Math.min(100, ((val1 - min) / range) * 100));
  const p2 = Math.max(0, Math.min(100, ((val2 - min) / range) * 100));

  const w1Win = inverseLogic ? val1 < val2 : val1 > val2;
  const w2Win = inverseLogic ? val2 < val1 : val2 > val1;

  return (
    <div className={`p-6 rounded-[24px] border mb-4 ${cardBg}`}>
      <div className="flex items-center justify-center gap-2 mb-6">
        <Icon className="w-5 h-5 text-slate-400" />
        <h4 className={`text-sm font-black ${subTextColor}`}>{title}</h4>
      </div>
      
      <div className="flex items-center justify-between relative">
        {/* City 1 Value */}
        <div className={`text-left w-1/4 ${w1Win ? 'text-orange-500' : textColor}`}>
          <span className="text-2xl font-black block">{val1}</span>
          <span className="text-[10px] font-bold opacity-70">{unit}</span>
        </div>

        {/* VS Bars Center */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 gap-2">
          {/* Bar 1 */}
          <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full flex justify-end overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ${w1Win ? 'bg-orange-500' : 'bg-slate-400 dark:bg-slate-500'}`} style={{ width: `${p1}%` }} />
          </div>
          {/* Bar 2 */}
          <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ${w2Win ? 'bg-blue-500' : 'bg-slate-400 dark:bg-slate-500'}`} style={{ width: `${p2}%` }} />
          </div>
        </div>

        {/* City 2 Value */}
        <div className={`text-right w-1/4 ${w2Win ? 'text-blue-500' : textColor}`}>
          <span className="text-2xl font-black block">{val2}</span>
          <span className="text-[10px] font-bold opacity-70">{unit}</span>
        </div>
      </div>
    </div>
  );
};

const ComparePage = ({ isDark, windUnit }) => {
  const [city1, setCity1] = useState(null);
  const [city2, setCity2] = useState(null);
  const [weather1, setWeather1] = useState(null);
  const [weather2, setWeather2] = useState(null);
  
  const [searchQuery1, setSearchQuery1] = useState('');
  const [searchQuery2, setSearchQuery2] = useState('');
  const [results1, setResults1] = useState([]);
  const [results2, setResults2] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('selectedCity');
    if (saved) {
      setCity1(JSON.parse(saved));
    }
  }, []);

  const handleSearch = async (query, setResults) => {
    if (!query.trim()) { setResults([]); return; }
    try {
      const res = await secureFetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&language=ar&count=5`);
      setResults(res.results || []);
    } catch (e) {
      setResults([]);
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => handleSearch(searchQuery1, setResults1), 500);
    return () => clearTimeout(delay);
  }, [searchQuery1]);

  useEffect(() => {
    const delay = setTimeout(() => handleSearch(searchQuery2, setResults2), 500);
    return () => clearTimeout(delay);
  }, [searchQuery2]);

  const fetchWeather = async (lat, lon, setter) => {
    setter('loading');
    try {
      const data = await secureFetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,surface_pressure&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max&timezone=auto`);
      setter(data);
    } catch (e) {
      console.error(e);
      setter(null);
    }
  };

  useEffect(() => { if (city1) fetchWeather(city1.lat, city1.lon, setWeather1); }, [city1]);
  useEffect(() => { if (city2) fetchWeather(city2.lat, city2.lon, setWeather2); }, [city2]);

  const textColor = isDark ? 'text-slate-100' : 'text-slate-800';
  const subTextColor = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardBg = isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/90 border-slate-200';

  const renderCitySelector = (num, city, setCity, searchQuery, setSearchQuery, results, setResults) => {
    if (city) {
      const w = num === 1 ? weather1 : weather2;
      return (
        <div className={`p-6 rounded-[32px] border ${cardBg} relative overflow-hidden h-full flex flex-col justify-center transition-all hover:shadow-lg`}>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <span className={`inline-block px-3 py-1 text-[10px] font-black rounded-lg mb-2 ${num === 1 ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'}`}>مدينة {num}</span>
              <h2 className={`text-2xl font-black ${textColor}`}>{city.name.split('،')[0]}</h2>
              <p className={`text-xs font-bold mt-1 ${subTextColor}`}>{city.name.split('،')[1]}</p>
            </div>
            <button onClick={() => setCity(null)} className={`text-[10px] font-black px-4 py-2 rounded-xl transition-all ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-red-500 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-red-500 hover:text-white'}`}>تغيير</button>
          </div>
          {w === 'loading' ? (
            <div className="flex items-center gap-2 text-orange-500">
              <Loader2 className="w-5 h-5 animate-spin" /> <span className="font-bold text-sm">جاري التحديث...</span>
            </div>
          ) : w ? (
            <div className="mt-4 flex items-end gap-2 relative z-10">
              <span className={`text-6xl font-black tracking-tighter ${textColor}`}>{Math.round(w.current.temperature_2m)}°</span>
            </div>
          ) : null}
          {/* subtle background glow */}
          <div className={`absolute -bottom-10 ${num === 1 ? '-right-10' : '-left-10'} w-40 h-40 rounded-full blur-3xl opacity-20 ${num === 1 ? 'bg-orange-500' : 'bg-blue-500'}`} />
        </div>
      );
    }

    return (
      <div className={`p-6 rounded-[32px] border flex flex-col justify-center h-full ${cardBg}`}>
        <h3 className={`text-xl font-black mb-4 ${textColor}`}>اختر المدينة {num}</h3>
        <div className="relative z-50">
          <input 
            type="text" placeholder="بحث عن مدينة..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full p-4 pl-12 rounded-2xl outline-none font-bold transition-all border ${isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-orange-500' : 'bg-white border-slate-200 text-slate-800 focus:border-orange-500'}`}
          />
          <Search className="absolute left-4 top-4 text-slate-400" />
          {results.length > 0 && (
            <div className={`absolute top-full mt-2 w-full z-[100] rounded-2xl shadow-xl overflow-hidden border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              {results.map(r => (
                <button key={r.id} onClick={() => { setCity({ name: `${r.name}، ${r.country}`, lat: r.latitude, lon: r.longitude }); setSearchQuery(''); setResults([]); }} className={`w-full text-right px-5 py-4 text-sm font-bold border-b last:border-0 hover:bg-orange-500 hover:text-white transition-colors ${textColor} ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                  {r.name} {r.admin1 ? `، ${r.admin1}` : ''}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const isReady = !!(city1 && city2 && weather1 && weather1 !== 'loading' && weather2 && weather2 !== 'loading');

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 pb-28 lg:pb-10 max-w-4xl mx-auto px-2">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-orange-500 text-white rounded-2xl shadow-lg"><Scale className="w-6 h-6" /></div>
        <div>
          <h1 className={`text-3xl font-black tracking-tight ${textColor}`}>المواجهة الجوية</h1>
          <p className={`text-xs font-bold mt-1 ${subTextColor}`}>مقارنة تفصيلية بين مدينتين لمساعدتك على اتخاذ القرار</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {renderCitySelector(1, city1, setCity1, searchQuery1, setSearchQuery1, results1, setResults1)}
        {renderCitySelector(2, city2, setCity2, searchQuery2, setSearchQuery2, results2, setResults2)}
      </div>

      {!isReady && (
        <div className={`p-8 text-center rounded-[32px] border ${cardBg}`}>
          <Info className="w-10 h-10 mx-auto text-slate-400 mb-4 opacity-50" />
          <p className={`font-bold ${subTextColor}`}>الرجاء اختيار مدينتين لعرض لوحة المقارنة التفصيلية.</p>
        </div>
      )}

      {isReady && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          <ComparisonBar 
            title="درجة الحرارة الحالية" icon={Thermometer} 
            val1={Math.round(weather1.current.temperature_2m)} val2={Math.round(weather2.current.temperature_2m)} 
            min={-10} max={50} unit="°مئوية" 
            textColor={textColor} subTextColor={subTextColor} cardBg={cardBg}
          />
          <ComparisonBar 
            title="الحرارة العظمى المتوقعة اليوم" icon={Thermometer} 
            val1={Math.round(weather1.daily.temperature_2m_max[0])} val2={Math.round(weather2.daily.temperature_2m_max[0])} 
            min={-10} max={50} unit="°مئوية" 
            textColor={textColor} subTextColor={subTextColor} cardBg={cardBg}
          />
          <ComparisonBar 
            title="سرعة الرياح" icon={Wind} 
            val1={Math.round(weather1.current.wind_speed_10m)} val2={Math.round(weather2.current.wind_speed_10m)} 
            min={0} max={100} unit={windUnit?.label?.split(' ')[0] || "كم/س"} 
            textColor={textColor} subTextColor={subTextColor} cardBg={cardBg}
          />
          <ComparisonBar 
            title="الرطوبة" icon={Droplets} 
            val1={Math.round(weather1.current.relative_humidity_2m)} val2={Math.round(weather2.current.relative_humidity_2m)} 
            min={0} max={100} unit="%" 
            textColor={textColor} subTextColor={subTextColor} cardBg={cardBg}
          />
          <ComparisonBar 
            title="فرصة هطول المطر" icon={CloudRain} 
            val1={weather1.daily.precipitation_probability_max[0]} val2={weather2.daily.precipitation_probability_max[0]} 
            min={0} max={100} unit="%" 
            textColor={textColor} subTextColor={subTextColor} cardBg={cardBg}
          />
        </div>
      )}
    </div>
  );
};

export default ComparePage;
