import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { Radar, Play, Pause, SkipForward, SkipBack, Clock, Layers } from 'lucide-react';
import { secureFetch } from '../utils/weatherUtils';

/* ── Helper: manages the radar overlay tile layer ── */
const RadarOverlay = ({ url, opacity }) => {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!url) return;
    if (layerRef.current) map.removeLayer(layerRef.current);
    const layer = window.L.tileLayer(url, { opacity, zIndex: 10, tileSize: 256 });
    layer.addTo(map);
    layerRef.current = layer;
    return () => { if (layerRef.current) map.removeLayer(layerRef.current); };
  }, [url, opacity, map]);

  return null;
};

const RadarPage = ({ isDark, selectedCity }) => {
  const [frames, setFrames] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeLayer, setActiveLayer] = useState('radar'); // radar | clouds | wind
  const intervalRef = useRef(null);

  const textColor = isDark ? 'text-slate-100' : 'text-slate-800';
  const subText = isDark ? 'text-slate-400' : 'text-slate-500';
  const panelBg = isDark ? 'bg-slate-800/95 border-slate-700' : 'bg-white/95 border-slate-200';
  const btnActive = isDark ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-800';
  const btnInactive = isDark ? 'text-slate-400 hover:bg-slate-700/50' : 'text-slate-500 hover:bg-slate-100';

  // ── Fetch radar data from RainViewer ──
  const fetchFrames = useCallback(async () => {
    try {
      const res = await secureFetch('https://api.rainviewer.com/public/weather-maps.json');
      const host = res.host;

      if (activeLayer === 'radar') {
        const past = (res.radar?.past || []).map(f => ({
          url: `${host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`,
          time: f.time * 1000,
          type: 'past'
        }));
        const nowcast = (res.radar?.nowcast || []).map(f => ({
          url: `${host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`,
          time: f.time * 1000,
          type: 'forecast'
        }));
        const all = [...past, ...nowcast];
        setFrames(all);
        // Start at the last "past" frame (i.e. "now")
        setCurrentIdx(Math.max(0, past.length - 1));
      } else if (activeLayer === 'clouds') {
        const infrared = (res.satellite?.infrared || []).map(f => ({
          url: `${host}${f.path}/256/{z}/{x}/{y}/0/1_1.png`,
          time: f.time * 1000,
          type: 'past'
        }));
        setFrames(infrared);
        setCurrentIdx(Math.max(0, infrared.length - 1));
      } else if (activeLayer === 'wind') {
        // Wind: use Open-Meteo wind tiles via a different approach
        // For now show a static wind overlay from RainViewer if available
        const past = (res.radar?.past || []).map(f => ({
          url: `${host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`,
          time: f.time * 1000,
          type: 'past'
        }));
        setFrames(past);
        setCurrentIdx(Math.max(0, past.length - 1));
      }
    } catch (e) {
      console.error('Radar fetch error:', e);
    }
  }, [activeLayer]);

  useEffect(() => { fetchFrames(); }, [fetchFrames]);

  // ── Playback control ──
  useEffect(() => {
    if (isPlaying && frames.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentIdx(prev => (prev + 1) % frames.length);
      }, 800);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, frames.length]);

  const handlePrev = () => {
    if (frames.length === 0) return;
    setIsPlaying(false);
    setCurrentIdx(prev => (prev - 1 + frames.length) % frames.length);
  };
  const handleNext = () => {
    if (frames.length === 0) return;
    setIsPlaying(false);
    setCurrentIdx(prev => (prev + 1) % frames.length);
  };
  const togglePlay = () => setIsPlaying(p => !p);

  const currentFrame = frames[currentIdx];
  const currentTime = currentFrame ? new Date(currentFrame.time) : null;
  const timeStr = currentTime ? currentTime.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '--:--';
  const dateStr = currentTime ? currentTime.toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
  const isPast = currentFrame?.type === 'past';
  const frameCount = frames.length;
  const positionRatio = frameCount > 1 ? currentIdx / (frameCount - 1) : 0;

  // ── Map tiles ──
  const mapTileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  // ── Rain intensity legend ──
  const legendItems = activeLayer === 'radar'
    ? [
        { color: '#88bbff', label: 'خفيف' },
        { color: '#4488dd', label: 'معتدل' },
        { color: '#2266bb', label: 'متوسط' },
        { color: '#ffaa00', label: 'غزير' },
        { color: '#ff4400', label: 'عنيف' },
      ]
    : [
        { color: 'rgba(255,255,255,0.3)', label: 'خفيف' },
        { color: 'rgba(255,255,255,0.55)', label: 'متوسط' },
        { color: 'rgba(255,255,255,0.85)', label: 'كثيف' },
      ];

  return (
    <div className="animate-in fade-in duration-500 flex flex-col h-[calc(100vh-160px)] lg:h-[calc(100vh-100px)] lg:pb-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-2xl ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`}>
            <Radar className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h2 className={`text-2xl font-black tracking-tight ${textColor}`}>الرادار المباشر</h2>
            <p className={`text-xs font-bold ${subText}`}>بيانات RainViewer • تحديث كل 10 دقائق</p>
          </div>
        </div>

        {/* Layer switcher */}
        <div className={`flex flex-wrap gap-2 p-1 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          {[
            { id: 'radar', label: 'أمطار', icon: '🌧️' },
            { id: 'clouds', label: 'سحب', icon: '☁️' },
            { id: 'wind', label: 'رياح', icon: '💨' },
          ].map(layer => (
            <button
              key={layer.id}
              onClick={() => { setActiveLayer(layer.id); setIsPlaying(false); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${activeLayer === layer.id ? btnActive : btnInactive}`}
            >
              <span>{layer.icon}</span>
              {layer.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Map Container ── */}
      <div className={`flex-1 relative rounded-3xl overflow-hidden border shadow-lg ${isDark ? 'border-slate-700' : 'border-slate-200'}`} dir="ltr">
        <MapContainer
          key={`${selectedCity.lat}-${selectedCity.lon}-${isDark}`}
          center={[selectedCity.lat, selectedCity.lon]}
          zoom={6}
          style={{ height: '100%', width: '100%', zIndex: 0 }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url={mapTileUrl} />
          {currentFrame && <RadarOverlay url={currentFrame.url} opacity={0.65} />}
        {!currentFrame && frameCount === 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/20 text-center p-6">
            <div className={`rounded-3xl border px-5 py-4 ${isDark ? 'bg-slate-800/90 border-slate-700 text-slate-100' : 'bg-white/90 border-slate-200 text-slate-800'}`}>
              <p className="font-black text-sm mb-2">جارٍ تحميل بيانات الرادار...</p>
              <p className="text-[11px] font-bold text-slate-400">إذا استمرت المشكلة، حاول إعادة تحميل التطبيق أو تحريك الخريطة لتحديث الطبقة.</p>
            </div>
          </div>
        )}
        </MapContainer>

        {/* ── Legend (top-right) ── */}
        <div className={`absolute top-3 right-3 z-[400] backdrop-blur-xl rounded-2xl p-3 border shadow-md ${panelBg}`} dir="rtl">
          <div className="flex items-center gap-1.5 mb-2">
            <Layers className="w-3.5 h-3.5 text-orange-500" />
            <p className={`text-[10px] font-black ${subText}`}>
              {activeLayer === 'radar' ? 'كثافة الأمطار' : 'كثافة السحب'}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            {legendItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-4 h-2 rounded-sm" style={{ backgroundColor: item.color }} />
                <span className={`text-[9px] font-bold ${subText}`}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Time badge (top-left) ── */}
        <div className={`absolute top-3 left-3 z-[400] backdrop-blur-xl rounded-2xl px-4 py-2.5 border shadow-md flex items-center gap-2 ${panelBg}`} dir="rtl">
          <Clock className="w-4 h-4 text-orange-500" />
          <div>
            <p className={`text-sm font-black ${textColor}`}>{timeStr}</p>
            <p className={`text-[9px] font-bold ${subText}`}>{dateStr}</p>
          </div>
          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${isPast ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'}`}>
            {isPast ? 'ماضي' : 'توقع'}
          </span>
        </div>

        {/* ── Playback Controls (bottom) ── */}
        <div className={`absolute bottom-3 left-3 right-3 z-[400] backdrop-blur-xl rounded-2xl border shadow-lg ${panelBg}`} dir="rtl">
          <div className="p-3">
            {/* Timeline slider */}
            <div className="relative w-full mb-3">
              <input
                type="range"
                min={0}
                max={Math.max(0, frameCount - 1)}
                value={Math.min(currentIdx, Math.max(0, frameCount - 1))}
                onChange={(e) => { setIsPlaying(false); setCurrentIdx(Number(e.target.value)); }}
                disabled={frameCount === 0}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-orange-500"
                style={{
                  background: frameCount > 1
                    ? `linear-gradient(to left, #f97316 0%, #f97316 ${positionRatio * 100}%, ${isDark ? '#334155' : '#e2e8f0'} ${positionRatio * 100}%, ${isDark ? '#334155' : '#e2e8f0'} 100%)`
                    : isDark ? '#334155' : '#e2e8f0'
                }}
              />
              {/* Time labels */}
              <div className={`flex justify-between mt-1 text-[9px] font-bold ${subText}`}>
                <span>سابق</span>
                <span className="text-orange-500 font-black">الآن</span>
                <span>توقع مستقبلي</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-center gap-3">
              <button onClick={handlePrev} className={`p-2 rounded-xl transition-all active:scale-90 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                <SkipForward className={`w-4 h-4 ${subText}`} />
              </button>
              <button
                onClick={togglePlay}
                className="w-11 h-11 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform hover:bg-orange-600"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current mr-[-2px]" />}
              </button>
              <button onClick={handleNext} className={`p-2 rounded-xl transition-all active:scale-90 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                <SkipBack className={`w-4 h-4 ${subText}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <p className={`text-center text-[10px] font-bold mt-3 ${subText}`}>
        بيانات الرادار من RainViewer API • آخر تحديث كل 10 دقائق • الخريطة تدعم التكبير والتصغير بالإصبعين
      </p>
    </div>
  );
};

export default RadarPage;
