import React, { useRef } from 'react';
import { Download, Share2 } from 'lucide-react';
import { getWeatherDesc } from '../utils/weatherUtils';

const WeatherShareCard = ({ weatherData, selectedCity, isDark, windUnit }) => {
  const canvasRef = useRef(null);

  const generateCard = () => {
    if (!weatherData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const width = 800;
    const height = 420;
    canvas.width = width;
    canvas.height = height;

    const current = weatherData.current || {};
    const daily = weatherData.daily || {};
    const temp = Math.round(current.temperature_2m || 0);
    const feelsLike = Math.round(current.apparent_temperature || temp);
    const humidity = Math.round(current.relative_humidity_2m || 0);
    const wind = Math.round(current.wind_speed_10m || 0);
    const maxTemp = daily.temperature_2m_max?.[0] !== undefined ? Math.round(daily.temperature_2m_max[0]) : temp;
    const minTemp = daily.temperature_2m_min?.[0] !== undefined ? Math.round(daily.temperature_2m_min[0]) : temp;
    const wCode = current.weathercode !== undefined ? current.weathercode : (current.weather_code || 0);
    const descInfo = getWeatherDesc(wCode);

    // ── Background ──
    const grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#1e293b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // ── Top accent line ──
    const accentGrad = ctx.createLinearGradient(0, 0, width, 0);
    accentGrad.addColorStop(0, '#f97316');
    accentGrad.addColorStop(1, '#f59e0b');
    ctx.fillStyle = accentGrad;
    ctx.fillRect(0, 0, width, 5);

    // ── Brand area (top) ──
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('طقس مصر وبلاد الشام', width - 40, 45);

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = 'normal 12px "Segoe UI", Arial, sans-serif';
    const dateStr = new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    ctx.fillText(dateStr, width - 40, 68);

    // ── City name ──
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 36px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(selectedCity?.name || 'المدينة', width - 40, 120);

    // ── Weather description ──
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    ctx.fillText(descInfo.desc, width - 40, 150);

    // ── Big temperature ──
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 120px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${temp}°`, 50, 200);

    // ── Min/Max ──
    ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#f97316';
    ctx.textAlign = 'left';
    ctx.fillText(`▲ ${maxTemp}°`, 55, 240);
    ctx.fillStyle = '#60a5fa';
    ctx.fillText(`▼ ${minTemp}°`, 145, 240);

    // ── Divider line ──
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 270);
    ctx.lineTo(width - 40, 270);
    ctx.stroke();

    // ── Details row ──
    const details = [
      { label: 'الرطوبة', value: `${humidity}%` },
      { label: 'الرياح', value: `${wind} ${windUnit?.label?.split(' ')[0] || 'كم/س'}` },
      { label: 'الإحساس', value: `${feelsLike}°` },
    ];

    const colW = (width - 80) / details.length;
    details.forEach((d, i) => {
      const x = 40 + colW * i + colW / 2;

      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
      ctx.fillText(d.label, x, 310);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 26px "Segoe UI", Arial, sans-serif';
      ctx.fillText(d.value, x, 345);
    });

    // ── Footer ──
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = 'normal 11px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('egyptwind.com • بيانات مباشرة من الأرصاد الجوية', width / 2, height - 20);

    // ── Download ──
    const image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `weather-${selectedCity?.name || 'city'}-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = image;
    link.click();
  };

  const textColor = isDark ? 'text-slate-100' : 'text-slate-800';
  const subText = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardBg = isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-slate-200';

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4 px-2">
        <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`}>
          <Share2 className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <h3 className={`font-black text-lg tracking-tight ${textColor}`}>مشاركة حالة الطقس</h3>
          <p className={`text-[10px] font-bold ${subText}`}>أنشئ بطاقة طقس احترافية لمشاركتها</p>
        </div>
      </div>

      <div className={`p-5 rounded-2xl border ${cardBg}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-bold ${subText}`}>طقس يوم {selectedCity?.name?.split('،')[0] || 'المدينة'}</p>
            <p className={`text-xs ${subText} mt-0.5`}>سيتم تحميلها كصورة PNG</p>
          </div>
          <button
            onClick={generateCard}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm bg-orange-500 text-white hover:bg-orange-600 transition-colors active:scale-95"
          >
            <Download className="w-4 h-4" />
            تحميل البطاقة
          </button>
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
};

export default WeatherShareCard;
