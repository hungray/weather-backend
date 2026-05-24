import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { Radar, ExternalLink } from 'lucide-react';
import { secureFetch } from '../utils/weatherUtils';

const MiniRadarOverlay = ({ url }) => {
  const map = useMap();
  useEffect(() => {
    if (!url) return;
    const layer = window.L.tileLayer(url, { opacity: 0.65, zIndex: 10, tileSize: 256 });
    layer.addTo(map);
    return () => map.removeLayer(layer);
  }, [url, map]);
  return null;
};

const MiniRadar = ({ selectedCity, isDark }) => {
  const navigate = useNavigate();
  const [frameUrl, setFrameUrl] = useState(null);

  useEffect(() => {
    const fetchRadar = async () => {
      try {
        const res = await secureFetch('https://api.rainviewer.com/public/weather-maps.json');
        const past = res.radar?.past || [];
        if (past.length > 0) {
          const latest = past[past.length - 1];
          setFrameUrl(`${res.host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchRadar();
  }, []);

  const textColor = isDark ? 'text-slate-100' : 'text-slate-800';
  const subTextColor = isDark ? 'text-slate-400' : 'text-slate-500';
  const panelBg = isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-slate-200';
  const mapTileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  return (
    <div className={`p-4 rounded-3xl border mb-8 ${panelBg}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-orange-500/10 rounded-lg">
            <Radar className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h3 className={`font-black text-sm ${textColor}`}>الرادار التفاعلي الحي</h3>
            <p className={`text-[10px] font-bold ${subTextColor}`}>حركة السحب والأمطار مباشرة</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/radar')}
          className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full bg-blue-500 text-white shadow-md hover:bg-blue-600 transition-colors"
        >
          <span>تكبير</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      <div className="w-full h-48 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 relative pointer-events-none">
        <MapContainer
          key={`${selectedCity.lat}-${selectedCity.lon}-${isDark}`}
          center={[selectedCity.lat, selectedCity.lon]}
          zoom={5}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          dragging={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          attributionControl={false}
        >
          <TileLayer url={mapTileUrl} />
          {frameUrl && <MiniRadarOverlay url={frameUrl} />}
        </MapContainer>
        
        {/* Overlay to catch clicks and navigate */}
        <div 
          onClick={() => navigate('/radar')}
          className="absolute inset-0 z-50 cursor-pointer flex items-center justify-center bg-black/0 hover:bg-black/10 transition-colors"
        />
      </div>
    </div>
  );
};

export default MiniRadar;
