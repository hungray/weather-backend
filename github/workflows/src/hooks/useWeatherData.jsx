import { useState, useEffect, useRef, useCallback } from 'react';
import { secureFetch } from '../utils/weatherUtils';

const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes
const MEMORY_CACHE = new Map();
const CACHE_PREFIX = 'weatherCache_v3_';

const getWindApiUnit = (windUnitId) => {
  if (windUnitId === 'mph') return '&wind_speed_unit=mph';
  if (windUnitId === 'knots') return '&wind_speed_unit=kn';
  if (windUnitId === 'ms') return '&wind_speed_unit=ms';
  return '';
};

const getRainApiUnit = (rainUnitId) => {
  return rainUnitId === 'inch' ? '&precipitation_unit=inch' : '';
};

const createCacheKey = (selectedCity, isCelsius, windUnitId, rainUnitId) => {
  return `${selectedCity.lat}:${selectedCity.lon}:${isCelsius ? 'c' : 'f'}:${windUnitId || 'kmh'}:${rainUnitId || 'mm'}`;
};

const loadCacheEntry = (cacheKey) => {
  const cached = MEMORY_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return cached.data;
  }

  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}${cacheKey}`);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry || typeof entry.timestamp !== 'number' || Date.now() - entry.timestamp >= CACHE_DURATION_MS) {
      window.localStorage.removeItem(`${CACHE_PREFIX}${cacheKey}`);
      return null;
    }
    MEMORY_CACHE.set(cacheKey, entry);
    return entry.data;
  } catch {
    return null;
  }
};

const saveCacheEntry = (cacheKey, data) => {
  const entry = { data, timestamp: Date.now() };
  MEMORY_CACHE.set(cacheKey, entry);

  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${CACHE_PREFIX}${cacheKey}`, JSON.stringify(entry));
  } catch {
    // ignore storage failures
  }
};

export const useWeatherData = (selectedCity, isCelsius, windUnit, rainUnit) => {
  // ── قراءة الكاش فوراً لمنع وميض شاشة التحميل ──
  const [initialData] = useState(() => {
    if (!selectedCity?.lat || !selectedCity?.lon) return null;
    const cacheKey = createCacheKey(selectedCity, isCelsius, windUnit?.id, rainUnit?.id);
    return loadCacheEntry(cacheKey);
  });

  const [weatherData, setWeatherData] = useState(initialData);
  const [loading, setLoading] = useState(initialData ? false : true);
  const [error, setError] = useState(null);
  
  const fetchRef = useRef(null);
  
  // تحديث كل ساعة للبيانات الكاملة
  const fullRefreshIntervalMs = 60 * 60 * 1000; 
  // تحديث كل 3 دقائق للأمطار (دقيقة بدقيقة)
  const minutelyIntervalMs = 3 * 60 * 1000; 

  useEffect(() => {
    if (!selectedCity?.lat || !selectedCity?.lon) return;

    const cacheKey = createCacheKey(selectedCity, isCelsius, windUnit?.id, rainUnit?.id);
    const cachedData = loadCacheEntry(cacheKey);
    let active = true;
    let fullIntervalId = null;
    let minutelyIntervalId = null;

    // ── 1. جلب البيانات الكاملة ──
    const fetchWeather = async ({ background = false, forceFresh = false } = {}) => {
      if (!background && !weatherData) setLoading(true);
      setError(null);

      if (cachedData && !forceFresh) {
        setWeatherData(cachedData);
        if (!background) setLoading(false); 
      }

      try {
        const tempUnit = isCelsius ? '' : '&temperature_unit=fahrenheit';
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${selectedCity.lat}&longitude=${selectedCity.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m,cape,temperature_850hPa,relative_humidity_700hPa,relative_humidity_500hPa&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m,visibility,surface_pressure,dew_point_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_probability_max,sunrise,sunset,uv_index_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,precipitation_sum&minutely_15=precipitation&timezone=auto&forecast_days=16${tempUnit}${getWindApiUnit(windUnit?.id)}${getRainApiUnit(rainUnit?.id)}`;
        const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${selectedCity.lat}&longitude=${selectedCity.lon}&current=european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,aerosol_optical_depth,dust,uv_index&timezone=auto`;

        const [weatherRes, aqiRes] = await Promise.all([
          secureFetch(weatherUrl).catch(e => { throw e; }),
          secureFetch(aqiUrl).catch(e => null)
        ]);

        if (!active) return;
        const combinedData = { ...weatherRes, aqi: aqiRes || null };
        if (combinedData.minutely_15) combinedData.minutely = combinedData.minutely_15;
        
        setWeatherData(combinedData);
        saveCacheEntry(cacheKey, combinedData);
      } catch (fetchError) {
        if (!active) return;
        setError(fetchError);
        if (!cachedData) setWeatherData(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    // ── 2. جلب بيانات الأمطار دقيقة بدقيقة فقط ──
    const fetchMinutelyRain = async () => {
      try {
        const minutelyUrl = `https://api.open-meteo.com/v1/forecast?latitude=${selectedCity.lat}&longitude=${selectedCity.lon}&minutely_15=precipitation&timezone=auto${getRainApiUnit(rainUnit?.id)}`;
        const res = await secureFetch(minutelyUrl);
        if (res && res.minutely_15 && active) {
          setWeatherData(prev => {
            if (!prev) return prev;
            const newData = { ...prev, minutely: res.minutely_15 };
            saveCacheEntry(cacheKey, newData);
            return newData;
          });
        }
      } catch (e) {
        console.warn("Failed to update minutely rain:", e);
      }
    };

    fetchRef.current = fetchWeather;
    fetchWeather(); // التحميل الأولي

    // المؤقتات
    fullIntervalId = setInterval(() => {
      if (active && fetchRef.current) fetchRef.current({ background: true, forceFresh: true });
    }, fullRefreshIntervalMs);

    minutelyIntervalId = setInterval(() => {
      if (active) fetchMinutelyRain();
    }, minutelyIntervalMs);

    return () => { 
      active = false; 
      if (fullIntervalId) clearInterval(fullIntervalId); 
      if (minutelyIntervalId) clearInterval(minutelyIntervalId); 
    };
  }, [selectedCity, isCelsius, windUnit?.id, rainUnit?.id]);

  const refetch = useCallback(() => {
    if (fetchRef.current) fetchRef.current({ background: false, forceFresh: true });
  }, []);

  return { weatherData, loading, error, refetch };
};
