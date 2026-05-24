import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, Thermometer, Droplets, Wind } from 'lucide-react';

// ======================================================
// رسم بياني SVG تفاعلي لتوقعات 15 يوم
// ======================================================
const WeatherChart = ({ weatherData, isDark, windUnit, rainUnit, pressureUnit }) => {
  const [activeTab, setActiveTab] = useState('temp');
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef(null);
  const svgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.2 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  if (!weatherData?.daily?.time) return null;

  const daily = weatherData.daily;
  const days = daily.time.map((t, i) => {
    const d = new Date(t);
    return {
      label: i === 0 ? 'اليوم' : i === 1 ? 'غداً' : new Intl.DateTimeFormat('ar-EG', { weekday: 'short' }).format(d),
      date: d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }),
      maxTemp: Math.round(daily.temperature_2m_max?.[i] || 0),
      minTemp: Math.round(daily.temperature_2m_min?.[i] || 0),
      humidity: Math.round(((daily.precipitation_probability_max?.[i] || 0))),
      wind: Math.round(daily.wind_speed_10m_max?.[i] || 0),
      precip: daily.precipitation_probability_max?.[i] || 0,
    };
  }).slice(0, 15);

  const tabs = [
    { id: 'temp', label: 'الحرارة', icon: Thermometer, color: '#f97316', glowColor: 'rgba(249,115,22,0.3)' },
    { id: 'rain', label: 'الأمطار', icon: Droplets, color: '#3b82f6', glowColor: 'rgba(59,130,246,0.3)' },
    { id: 'wind', label: 'الرياح', icon: Wind, color: '#06b6d4', glowColor: 'rgba(6,182,212,0.3)' },
  ];

  const activeTabData = tabs.find(t => t.id === activeTab);

  // حساب البيانات لكل تبويب
  const getValues = () => {
    switch (activeTab) {
      case 'temp': return days.map(d => d.maxTemp);
      case 'rain': return days.map(d => d.precip);
      case 'wind': return days.map(d => d.wind);
      default: return [];
    }
  };

  const getSecondaryValues = () => {
    if (activeTab === 'temp') return days.map(d => d.minTemp);
    return null;
  };

  const getUnit = () => {
    switch (activeTab) {
      case 'temp': return '°';
      case 'rain': return '%';
      case 'wind': return ` ${windUnit?.label?.split(' ')[0] || 'كم/س'}`;
      default: return '';
    }
  };

  const values = getValues();
  const secondaryValues = getSecondaryValues();
  const unit = getUnit();

  // أبعاد الرسم
  const width = 700;
  const height = 300;
  const padding = { top: 40, bottom: 80, left: 10, right: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Min/Max
  const allVals = secondaryValues ? [...values, ...secondaryValues] : values;
  const minVal = Math.min(...allVals) - 3;
  const maxVal = Math.max(...allVals) + 3;
  const range = maxVal - minVal || 1;

  // إنشاء النقاط
  const getPoint = (val, index) => {
    const x = padding.left + (index / (days.length - 1)) * chartWidth;
    const y = padding.top + chartHeight - ((val - minVal) / range) * chartHeight;
    return { x, y };
  };

  // إنشاء مسار منحنى سلس (Catmull-Rom → SVG Cubic Bezier)
  const createSmoothPath = (vals) => {
    const points = vals.map((v, i) => getPoint(v, i));
    if (points.length < 2) return '';

    let path = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return path;
  };

  // إنشاء مسار المنطقة (Area)
  const createAreaPath = (vals) => {
    const linePath = createSmoothPath(vals);
    const lastPoint = getPoint(vals[vals.length - 1], vals.length - 1);
    const firstPoint = getPoint(vals[0], 0);
    const bottom = padding.top + chartHeight;
    return `${linePath} L ${lastPoint.x},${bottom} L ${firstPoint.x},${bottom} Z`;
  };

  const mainPath = createSmoothPath(values);
  const areaPath = createAreaPath(values);
  const secondaryPath = secondaryValues ? createSmoothPath(secondaryValues) : null;
  const secondaryAreaPath = secondaryValues ? createAreaPath(secondaryValues) : null;

  return (
    <div ref={containerRef} className="mb-8">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-orange-500 drop-shadow-sm" />
          <h3 className={`font-black text-xl tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            رسم بياني تفاعلي (15 يوم)
          </h3>
        </div>
      </div>

      <div className={`backdrop-blur-2xl border shadow-lg rounded-4xl p-5 glass-panel overflow-hidden`}>
        {/* Tabs */}
        <div className={`flex p-1 rounded-2xl mb-5 gap-1 ${isDark ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition-all duration-300 ${activeTab === tab.id
                ? 'text-white shadow-lg'
                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
              }`}
              style={activeTab === tab.id ? { background: tab.color, boxShadow: `0 8px 25px -5px ${tab.glowColor}` } : {}}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* SVG Chart */}
        <div className="overflow-x-auto scrollbar-hide -mx-1 pb-2">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full min-w-[600px] overflow-visible"
            style={{ minHeight: '260px' }}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <defs>
              {/* Primary gradient */}
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={activeTabData.color} stopOpacity="0.35" />
                <stop offset="100%" stopColor={activeTabData.color} stopOpacity="0.02" />
              </linearGradient>
              {/* Secondary gradient (temp min) */}
              <linearGradient id="areaGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
              </linearGradient>
              {/* Glow filter */}
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Grid lines */}
            {[0.25, 0.5, 0.75].map((pct, i) => {
              const y = padding.top + chartHeight * (1 - pct);
              return (
                <line
                  key={i}
                  x1={padding.left} y1={y}
                  x2={width - padding.right} y2={y}
                  stroke={isDark ? '#334155' : '#e2e8f0'}
                  strokeWidth="0.5"
                  strokeDasharray="6,4"
                />
              );
            })}

            {/* Secondary area + line (min temp) */}
            {secondaryAreaPath && (
              <>
                <path d={secondaryAreaPath} fill="url(#areaGrad2)" opacity={isVisible ? 1 : 0} style={{ transition: 'opacity 1s' }} />
                <path d={secondaryPath} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"
                  opacity={isVisible ? 0.6 : 0}
                  strokeDasharray={isVisible ? '0' : '2000'}
                  style={{ transition: 'all 1.5s ease-in-out 0.3s' }}
                />
              </>
            )}

            {/* Main area + line */}
            <path d={areaPath} fill="url(#areaGrad)" opacity={isVisible ? 1 : 0} style={{ transition: 'opacity 1s' }} />
            <path
              d={mainPath}
              fill="none"
              stroke={activeTabData.color}
              strokeWidth="3"
              strokeLinecap="round"
              filter="url(#glow)"
              opacity={isVisible ? 1 : 0}
              strokeDasharray={isVisible ? '0' : '2000'}
              style={{ transition: 'all 1.5s ease-in-out' }}
            />

            {/* Data points + labels */}
            {values.map((val, i) => {
              const pt = getPoint(val, i);
              const isHovered = hoveredIndex === i;
              const colW = chartWidth / (days.length - 1);

              return (
                <g key={i}>
                  {/* Invisible hover area */}
                  <rect
                    x={pt.x - colW / 2} y={padding.top}
                    width={colW} height={chartHeight}
                    fill="transparent"
                    onMouseEnter={() => setHoveredIndex(i)}
                  />

                  {/* Hover line */}
                  {isHovered && (
                    <line x1={pt.x} y1={padding.top} x2={pt.x} y2={padding.top + chartHeight}
                      stroke={activeTabData.color} strokeWidth="1" strokeDasharray="4,3" opacity="0.4" />
                  )}

                  {/* Data point */}
                  <circle
                    cx={pt.x} cy={pt.y}
                    r={isHovered ? 7 : 4}
                    fill={activeTabData.color}
                    stroke={isDark ? '#1e293b' : '#ffffff'}
                    strokeWidth={isHovered ? 3 : 2}
                    style={{
                      transition: 'all 0.2s',
                      filter: isHovered ? `drop-shadow(0 0 8px ${activeTabData.glowColor})` : '',
                      opacity: isVisible ? 1 : 0,
                      transitionDelay: `${i * 0.05}s`
                    }}
                  />

                  {/* Secondary point (min temp) */}
                  {secondaryValues && (() => {
                    const pt2 = getPoint(secondaryValues[i], i);
                    return (
                      <circle cx={pt2.x} cy={pt2.y} r={isHovered ? 5 : 3}
                        fill="#3b82f6" stroke={isDark ? '#1e293b' : '#ffffff'} strokeWidth="2"
                        style={{ transition: 'all 0.2s', opacity: isVisible ? 0.7 : 0, transitionDelay: `${i * 0.05}s` }}
                      />
                    );
                  })()}

                  {/* Tooltip */}
                  {isHovered && (
                    <g>
                      <rect
                        x={pt.x - 38} y={pt.y - 44}
                        width="76" height="32" rx="10"
                        fill={isDark ? '#1e293b' : '#ffffff'}
                        stroke={activeTabData.color}
                        strokeWidth="1.5"
                        style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' }}
                      />
                      <text x={pt.x} y={pt.y - 24} textAnchor="middle" fontSize="13" fontWeight="900"
                        fill={activeTabData.color}>
                        {val}{unit}
                      </text>
                      {secondaryValues && (
                        <text x={pt.x} y={pt.y - 55} textAnchor="middle" fontSize="10" fontWeight="700" fill="#3b82f6">
                          ↓ {secondaryValues[i]}°
                        </text>
                      )}
                    </g>
                  )}

                  {/* X-axis label */}
                  <text x={pt.x} y={height - 10} textAnchor="middle" fontSize="9" fontWeight="700"
                    fill={isDark ? '#64748b' : '#94a3b8'}>
                    {days[i].label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend for temp tab */}
        {activeTab === 'temp' && (
          <div className="flex justify-center gap-6 mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>العظمى</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>الصغرى</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherChart;
