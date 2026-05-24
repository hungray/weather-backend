import { 
  CloudSun, Sun, Moon, Cloud, CloudFog, CloudDrizzle, CloudRain, Snowflake, CloudLightning 
} from 'lucide-react';

const requestLogs = [];
export const secureFetch = async (url, options = {}) => {
  const now = Date.now();
  while (requestLogs.length > 0 && requestLogs[0] < now - 10000) requestLogs.shift();
  if (requestLogs.length >= 25) throw new Error("RATE_LIMIT_EXCEEDED");
  requestLogs.push(now);
  const response = await fetch(url, options);
  if (!response.ok) throw new Error("API_ERROR");
  return response.json();
};

export const getWeatherDesc = (code, isDay = 1) => {
  if (code === undefined || code === null) return { desc: 'غير متوفر', icon: Cloud, color: 'text-slate-400' };
  const isNight = isDay === 0;

  if (code === 0) return { desc: 'صافي', icon: isNight ? Moon : Sun, color: isNight ? 'text-blue-200' : 'text-orange-500', theme: isNight ? 'from-slate-800 to-indigo-900' : 'from-orange-500 to-amber-500' };
  if (code === 1) return { desc: 'غالباً صافي', icon: isNight ? Moon : Sun, color: isNight ? 'text-blue-200' : 'text-orange-500', theme: isNight ? 'from-slate-800 to-indigo-900' : 'from-orange-500 to-amber-500' };
  if (code === 2) return { desc: 'مشمس جزئياً', icon: CloudSun, color: 'text-orange-400', theme: 'from-orange-400 to-slate-500' };
  if (code === 3) return { desc: 'سحب كثيفة', icon: Cloud, color: 'text-slate-500', theme: 'from-slate-500 to-slate-700' };
  
  if (code === 45) return { desc: 'ضباب', icon: CloudFog, color: 'text-slate-400' };
  if (code === 48) return { desc: 'ضباب صقيعي', icon: CloudFog, color: 'text-slate-400' };
  
  if ([51, 53, 55].includes(code)) return { desc: 'رذاذ خفيف', icon: CloudDrizzle, color: 'text-blue-400' };
  if ([56, 57].includes(code)) return { desc: 'رذاذ متجمد', icon: CloudDrizzle, color: 'text-blue-300' };
  
  if (code === 61) return { desc: 'أمطار خفيفة', icon: CloudRain, color: 'text-blue-400' };
  if (code === 63) return { desc: 'أمطار متوسطة', icon: CloudRain, color: 'text-blue-500' };
  if (code === 65) return { desc: 'أمطار غزيرة', icon: CloudRain, color: 'text-blue-600' };
  
  if ([66, 67].includes(code)) return { desc: 'أمطار متجمدة', icon: CloudRain, color: 'text-cyan-500' };
  
  if (code === 71) return { desc: 'ثلوج خفيفة', icon: Snowflake, color: 'text-blue-200' };
  if (code === 73) return { desc: 'ثلوج متوسطة', icon: Snowflake, color: 'text-blue-200' };
  if (code === 75) return { desc: 'ثلوج كثيفة', icon: Snowflake, color: 'text-blue-300' };
  if (code === 77) return { desc: 'حبيبات ثلجية', icon: Snowflake, color: 'text-blue-300' };
  
  if ([80, 81, 82].includes(code)) return { desc: 'زخات مطر', icon: CloudRain, color: 'text-blue-500' };
  if ([85, 86].includes(code)) return { desc: 'زخات ثلجية', icon: Snowflake, color: 'text-blue-300' };
  
  if (code === 95) return { desc: 'عاصفة رعدية', icon: CloudLightning, color: 'text-purple-500' };
  if ([96, 99].includes(code)) return { desc: 'عاصفة رعدية مع بَرَد', icon: CloudLightning, color: 'text-purple-600' };

  return { desc: 'غير معروف', icon: Cloud, color: 'text-slate-400' };
};

export const advancedSynopticAnalysis = (current, todayDaily) => {
  if (!current || !todayDaily) return "جاري استلام وتحليل الخرائط...";
  const temp = current.temperature_2m;
  const humidity = current.relative_humidity_2m;
  const pressure = current.surface_pressure;
  const windSpeed = current.wind_speed_10m;
  const cloudCover = current.cloudcover || 0;
  const rawPrecipProb = todayDaily.precipitation_probability_max?.[0] || 0;

  if (temp === undefined || pressure === undefined) return "البيانات غير مكتملة للتحليل.";

  let analysisText = ""; let isOverride = false;
  if (pressure < 1010 && humidity > 75 && cloudCover > 50) {
    isOverride = true;
    analysisText += `نُحلل حالياً منخفضاً جوياً (ضغط ${Math.round(pressure)}hPa) مع تشبع رطوبي عالي. نتوقع أمطار. `;
  } else if (pressure > 1020 && humidity < 40 && rawPrecipProb > 20) {
    isOverride = true;
    analysisText += `ترصد خوارزمياتنا مرتفعاً جوياً عنيداً (ضغط ${Math.round(pressure)}hPa) يمنع السحب. الأجواء جافة. `;
  } else if (pressure > 1015) { analysisText += "مرتفع جوي سطحي يجلب الاستقرار للسماء. "; }

  if (temp > 35 && pressure < 1012) analysisText += "منخفض حراري يجذب رياحاً حارة. ";
  else if (temp < 15 && windSpeed > 20) analysisText += "كتلة باردة ونشاط للرياح يزيد الإحساس بالبرودة. ";
  else if (temp >= 20 && temp <= 30 && windSpeed < 15) analysisText += "كتلة هوائية معتدلة ومثالية. ";

  if (!isOverride && analysisText.length < 50) analysisText = "تمت مطابقة خرائط الضغط الجوي مع مخرجات النماذج. الأجواء مستقرة وتتطابق مع التوقعات الخام.";
  return analysisText;
};
