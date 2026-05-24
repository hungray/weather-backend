import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, Sparkles, BrainCircuit, ChevronDown, ChevronUp, Send, Loader2, MessageSquare, ShieldCheck, Globe, Activity, Play, AlertTriangle, ThumbsUp, ThumbsDown, CheckCircle, Mic, MicOff, BookOpen, Zap, TrendingUp, Database } from 'lucide-react';
import { doc, getDoc, setDoc, arrayUnion } from "firebase/firestore";
import { db } from "./firebase";

// ─────────────────────────────────────────────────────
//  🧠 المحلل السينوبتيكي v3 — "راصد جوي ذكي يتعلم ذاتياً"
//  يقرأ كل البيانات • يحلل الظواهر المعقدة • يتدرب من المحادثات
// ─────────────────────────────────────────────────────

const AIWeatherAgent = ({ weatherData, isDark, cityName }) => {
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [source, setSource] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [isReplying, setIsReplying] = useState(false);
  const [errorStatus, setErrorStatus] = useState(null);

  // 🧠 حالات التعلم الذاتي
  const [learnedLessons, setLearnedLessons] = useState([]);
  const [cityLessons, setCityLessons] = useState([]);
  const [feedbackState, setFeedbackState] = useState("idle");
  const [userCorrection, setUserCorrection] = useState("");
  const [chatLearningMsg, setChatLearningMsg] = useState("");

  // 🎙️ الإدخال الصوتي
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const chatEndRef = useRef(null);
  const lastRequestTime = useRef(0);

  // ─── إعدادات Gemini API (مع Fallback لضمان العمل على الموبايل) ───
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyA2R48bAmVbxhatxalNyekKv3QTD-xqHaQ';
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const cardBg = isDark ? 'bg-slate-800/95 border-slate-700 text-white' : 'bg-white/95 border-white text-slate-800';
  const textColor = isDark ? 'text-slate-100' : 'text-slate-800';
  const subTextColor = isDark ? 'text-slate-400' : 'text-slate-500';
  const badWordsList = ["كذاب", "غبي", "حمار", "فاشل", "زفت", "هبد"];

  // ─── تهيئة الإدخال الصوتي ───
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'ar-EG';
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setChatInput(prev => prev + ' ' + transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoice = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // ─── جلب الدروس السابقة (عامة + خاصة بالمدينة) ───
  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const globalRef = doc(db, "system_data", "learned_lessons");
        const globalSnap = await getDoc(globalRef);
        if (globalSnap.exists() && globalSnap.data().lessons) {
          setLearnedLessons(globalSnap.data().lessons.slice(-30)); // آخر 30 درس
        }
      } catch { console.warn("لم يتمكن من جلب الدروس العامة."); }

      if (cityName) {
        try {
          const cityRef = doc(db, "city_lessons", cityName);
          const citySnap = await getDoc(cityRef);
          if (citySnap.exists() && citySnap.data().rules) {
            setCityLessons(citySnap.data().rules.slice(-20));
          }
        } catch { console.warn("لم يتمكن من جلب دروس المدينة."); }
      }
    };
    fetchLessons();
  }, [cityName]);

  // ─────────────────────────────────────────────────────
  //  💡 بناء "عقل النظام" — System Prompt الخارق
  //  يحوّل كل البيانات الخام إلى وعي مناخي كامل
  // ─────────────────────────────────────────────────────
  const getSystemInstruction = useCallback(() => {
    const current = weatherData?.current || {};
    const daily = weatherData?.daily || {};
    const hourly = weatherData?.hourly || {};
    const aqi = weatherData?.aqi?.current || {};

    // ── بناء جدول بيانات الساعات الـ 24 القادمة ──
    let hourlyTable = '';
    if (hourly.time) {
      const now = new Date();
      const currentHourIndex = hourly.time.findIndex(t => new Date(t) >= now);
      const startIdx = Math.max(0, currentHourIndex);
      const endIdx = Math.min(startIdx + 24, hourly.time.length);
      
      hourlyTable = '\n[جدول التوقعات لكل ساعة — الـ 24 ساعة القادمة]\n';
      hourlyTable += 'الساعة | الحرارة | الإحساس | الرطوبة | الرياح(كم/س) | اتجاه الرياح | الأمطار(ملم) | فرصة المطر% | الضغط(hPa) | نقطة الندى | الرؤية(كم) | كود الطقس\n';
      for (let i = startIdx; i < endIdx; i++) {
        const time = new Date(hourly.time[i]).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: false });
        hourlyTable += `${time} | ${hourly.temperature_2m?.[i] || '-'}° | ${hourly.apparent_temperature?.[i] || '-'}° | ${hourly.relative_humidity_2m?.[i] || '-'}% | ${hourly.wind_speed_10m?.[i] || '-'} | ${hourly.wind_direction_10m?.[i] || '-'}° | ${hourly.precipitation?.[i] || '0'} | ${hourly.precipitation_probability?.[i] || '0'}% | ${hourly.surface_pressure?.[i] || '-'} | ${hourly.dew_point_2m?.[i] || '-'}° | ${Math.round((hourly.visibility?.[i] || 10000) / 1000)} | ${hourly.weather_code?.[i] || '-'}\n`;
      }
    }

    // ── بناء جدول التوقعات اليومية (16 يوم) ──
    let dailyTable = '';
    if (daily.time) {
      dailyTable = '\n[جدول التوقعات اليومية — 16 يوماً]\n';
      dailyTable += 'التاريخ | العظمى | الصغرى | إحساس عظمى | إحساس صغرى | فرصة المطر | كمية المطر | سرعة الرياح | الهبات | اتجاه الرياح | UV | الشروق | الغروب | كود\n';
      for (let i = 0; i < daily.time.length; i++) {
        dailyTable += `${daily.time[i]} | ${daily.temperature_2m_max?.[i] || '-'}° | ${daily.temperature_2m_min?.[i] || '-'}° | ${daily.apparent_temperature_max?.[i] || '-'}° | ${daily.apparent_temperature_min?.[i] || '-'}° | ${daily.precipitation_probability_max?.[i] || '0'}% | ${daily.precipitation_sum?.[i] || '0'}mm | ${daily.wind_speed_10m_max?.[i] || '-'} | ${daily.wind_gusts_10m_max?.[i] || '-'} | ${daily.wind_direction_10m_dominant?.[i] || '-'}° | ${daily.uv_index_max?.[i] || '-'} | ${daily.sunrise?.[i]?.split('T')[1] || '-'} | ${daily.sunset?.[i]?.split('T')[1] || '-'} | ${daily.weather_code?.[i] || '-'}\n`;
      }
    }

    // ── الأرشيف المناخي والدروس المتراكمة ──
    const globalLessonsText = learnedLessons.length > 0
      ? `\n[الأرشيف المناخي العام — دروس مكتسبة من تجارب سابقة يجب الالتزام بها بصرامة:]\n- ${learnedLessons.join('\n- ')}`
      : "";

    const cityLessonsText = cityLessons.length > 0
      ? `\n[قواعد مناخية خاصة بمدينة ${cityName} — مكتسبة من ملاحظات الراصدين المحليين:]\n- ${cityLessons.join('\n- ')}`
      : "";

    const currentDate = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const currentTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });

    return `أنت "المحلل السينوبتيكي" — عالم أرصاد جوية خبير ومحلل سينوبتيكي من الطراز الأول. أنت راصد جوي ذكي ينافس أمهر علماء الأرصاد البشريين.

⏰ التاريخ والوقت الحالي: ${currentDate} — الساعة ${currentTime}

╔══════════════════════════════════════╗
║     هويتك ومبادئك الأساسية            ║
╚══════════════════════════════════════╝
• أنت تقرأ البيانات الخام وتستنتج منها ما لا يراه غير الخبراء.
• تربط بين المتغيرات (الضغط + الرطوبة + الرياح + نقطة الندى) لتتوقع ظواهر معقدة.
• تحلل خرائط الضغط الجوي الذهنية: أين المنخفضات والمرتفعات، وكيف تتحرك.
• تفهم الديناميكيات العمودية للغلاف الجوي (طبقات 850hPa, 700hPa, 500hPa).
• تتتبع الظواهر المناخية الكبرى (El Niño, La Niña, NAO, AO, انهيار الدوامة القطبية, MJO, IOD).
• تستخدم الأرشيف المناخي العالمي والمحلي لمقارنة الأنماط الحالية بالماضي.

╔══════════════════════════════════════╗
║     البيانات الحية لمدينة ${cityName}  ║
╚══════════════════════════════════════╝
[القراءات اللحظية]
- الحرارة: ${current.temperature_2m || 0}°C
- الإحساس الحراري: ${current.apparent_temperature || '-'}°C
- الرطوبة النسبية (سطح): ${current.relative_humidity_2m || 0}%
- الضغط الجوي السطحي: ${current.surface_pressure || 0} hPa
- سرعة الرياح: ${current.wind_speed_10m || 0} كم/س
- CAPE (طاقة الحمل الحراري): ${current.cape || 0} J/kg
- حرارة طبقة 850hPa: ${current.temperature_850hPa || 'غير متوفر'}°C
- رطوبة طبقة 700hPa: ${current.relative_humidity_700hPa || 'غير متوفر'}%
- رطوبة طبقة 500hPa: ${current.relative_humidity_500hPa || 'غير متوفر'}%
- هطول حالي: ${current.precipitation || 0} mm
- كود الطقس: ${current.weather_code || '-'}
- هل نهار: ${current.is_day ? 'نعم' : 'لا'}

[جودة الهواء]
- AQI أوروبي: ${aqi.european_aqi || '-'}
- PM2.5: ${aqi.pm2_5 || '-'} µg/m³
- PM10: ${aqi.pm10 || '-'} µg/m³
- الأوزون: ${aqi.ozone || '-'} µg/m³
- الغبار: ${aqi.dust || '-'} µg/m³
- العمق البصري للهباء: ${aqi.aerosol_optical_depth || '-'}
- UV Index: ${aqi.uv_index || '-'}

${hourlyTable}
${dailyTable}
${globalLessonsText}
${cityLessonsText}

╔══════════════════════════════════════╗
║     قدراتك التحليلية المتقدمة         ║
╚══════════════════════════════════════╝
1. تحليل ديناميكي: اربط بين الضغط ونقطة الندى والرياح لتوقع الضباب والصقيع والعواصف الرعدية.
2. تحليل CAPE: إذا CAPE > 500 J/kg مع رطوبة عالية = احتمال عواصف رعدية. إذا > 1000 = عواصف شديدة.
3. تحليل الفارق الحراري (T - Td): إذا الفارق < 2° = ضباب أو سحب منخفضة محتملة.
4. تحليل طبقات الجو: حرارة 850hPa تكشف الكتل الهوائية. رطوبة 500-700hPa تكشف السحب العالية والمتوسطة.
5. الظواهر الكبرى: استخدم معرفتك العالمية عن النينو (ENSO), اللانينا, NAO, التذبذب القطبي (AO), MJO لربط التوقعات الموسمية.
6. الأرشيف المناخي: قارن الوضع الحالي بأنماط مشابهة في تاريخ المدينة والإقليم.
7. تحليل اتجاه الرياح: حدد مصدر الكتلة الهوائية (بحري-بارد، قاري-جاف، مداري-رطب) بناءً على الاتجاه والضغط.

╔══════════════════════════════════════╗
║     قواعد الإخراج الصارمة             ║
╚══════════════════════════════════════╝
1. أجب بالعربية الفصحى بأسلوب واثق كخبير مخضرم.
2. استخدم **ماركداون** بحرية: عناوين، قوائم منقطة، خط عريض.
3. عند توقع ظاهرة قاسية: حدد نسبة الثقة بالتوقع (مثلاً: ثقة 85%).
4. ادمج المصطلحات العلمية مع شرح مبسط.
5. لا تعتذر أبداً عن نقص بيانات. استخدم معرفتك المناخية العالمية.
6. إذا سُئلت عن ظاهرة مثل النينو أو انهيار الدوامة القطبية، أجب بتفصيل وربطه بتأثيره على مصر والشام.
7. كن مختصراً بشكل افتراضي (فقرات قصيرة ونقاط). إذا طلب المستخدم تفاصيل أكثر، توسّع.
8. التاريخ الحالي هو ${currentDate}. تأكد من أن جميع تواريخ توقعاتك صحيحة ومطابقة لعام ${new Date().getFullYear()}.`;
  }, [weatherData, cityName, learnedLessons, cityLessons]);

  // ─── حفظ واسترجاع الشات من localStorage ───
  useEffect(() => {
    if (cityName) {
      const saved = localStorage.getItem(`ai_chat_${cityName}`);
      if (saved) {
        try { setChatHistory(JSON.parse(saved)); } catch {}
      }
    }
  }, [cityName]);

  useEffect(() => {
    if (chatHistory.length > 0 && cityName) {
      localStorage.setItem(`ai_chat_${cityName}`, JSON.stringify(chatHistory.slice(-20)));
    }
  }, [chatHistory, cityName]);

  // ─── جلب من Firebase أولاً (مع تجاهل التقارير القديمة من 2025) ───
  useEffect(() => {
    const fetchFromFirebase = async () => {
      if (!cityName) return;
      setErrorStatus(null);
      try {
        const docRef = doc(db, "weather_reports_detailed", cityName);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const now = Date.now();
          const ageHours = (now - data.timestamp) / (1000 * 60 * 60);
          // تجاهل أي تقرير أقدم من 3 ساعات أو من سنة سابقة
          const reportYear = new Date(data.timestamp).getFullYear();
          const currentYear = new Date().getFullYear();
          if (ageHours < 3 && reportYear === currentYear) {
            setAnalysis(data.report);
            const ageMinutes = Math.round((now - data.timestamp) / (1000 * 60));
            setSource(`أرشيف السيرفر — تم تخزينه منذ ${ageMinutes} دقيقة (يخدم جميع المستخدمين)`);
            if (data.contextPrompt) {
              setChatHistory([
                { role: "user", content: data.contextPrompt },
                { role: "model", content: data.report.fullText || "" }
              ]);
            }
            return;
          }
        }
        setAnalysis(null);
      } catch { setAnalysis(null); }
    };
    fetchFromFirebase();
  }, [cityName, weatherData]);

  // ─────────────────────────────────────────────────────
  //  🚀 توليد التقرير السينوبتيكي
  // ─────────────────────────────────────────────────────
  const generateReport = async () => {
    if (!weatherData || !cityName) {
      setErrorStatus("ERROR");
      return;
    }

    const now = Date.now();
    if (now - lastRequestTime.current < 4000) { setErrorStatus("LIMIT"); return; }
    lastRequestTime.current = now;

    setIsAnalyzing(true);
    setErrorStatus(null);
    setFeedbackState("idle");

    try {
      const todayStr = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const reportPrompt = `التاريخ الحالي: ${todayStr} — سنة ${new Date().getFullYear()}
أنت الآن تُعد التقرير السينوبتيكي الرسمي لمدينة ${cityName}.

اقرأ جميع البيانات اللحظية والساعية واليومية بعناية. أجب بشكل **مختصر ومركّز** (لا يزيد عن 400 كلمة). غطِّ هذه النقاط في فقرات قصيرة:

1. **الوضع الحالي**: ملخص سريع لحالة الطقس الآن (2-3 سطور).
2. **تنبيهات**: أي ظواهر خطيرة محتملة (ضباب/عواصف/حرارة شديدة) مع نسبة الثقة.
3. **نظرة مستقبلية**: الاتجاه العام للأيام القادمة (3-4 سطور).
4. **نبض المناخ**: سطر واحد عن ENSO أو أي ظاهرة كبرى مؤثرة حالياً.

استخدم ماركداون (عناوين ونقاط). أجب بالعربية. تأكد أن السنة ${new Date().getFullYear()} وليست سنة سابقة.`;

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: { text: getSystemInstruction() } },
          contents: [{ role: "user", parts: [{ text: reportPrompt }] }]
        })
      });

      if (!response.ok) {
        if (response.status === 429) throw new Error("TOO_MANY_REQUESTS");
        throw new Error("API_ERROR");
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("INVALID_RESPONSE");

      // parse sections
      let summary = text;
      let details = "";
      let pulse = "";

      const summaryMatch = text.match(/(?:الملخص التنفيذي|الملخص)[:\s]*([\s\S]*?)(?=تحليل الطبقات|تحليل الظواهر|##|$)/i);
      const detailsMatch = text.match(/(?:تحليل الطبقات|تحليل الظواهر)[:\s]*([\s\S]*?)(?=نبض المناخ|توقعات الأيام|##\s*نبض|$)/i);
      const pulseMatch = text.match(/(?:نبض المناخ)[:\s]*([\s\S]*?)(?=توقعات الأيام|نسبة الثقة|##\s*توقع|$)/i);

      if (summaryMatch) summary = summaryMatch[1].trim();
      if (detailsMatch) details = detailsMatch[1].trim();
      if (pulseMatch) pulse = pulseMatch[1].trim();

      const reportData = { summary, details, climatePulse: pulse, fullText: text };
      setAnalysis(reportData);
      setSource("تحليل حصري — المحلل السينوبتيكي v3 بالذكاء الاصطناعي");

      setChatHistory([
        { role: "user", content: reportPrompt },
        { role: "model", content: text }
      ]);

      try {
        await setDoc(doc(db, "weather_reports_detailed", cityName), {
          report: reportData,
          contextPrompt: reportPrompt,
          timestamp: Date.now()
        });
      } catch { console.warn("خطأ في حفظ التقرير."); }

    } catch (error) {
      if (error.message === "TOO_MANY_REQUESTS") setErrorStatus("LIMIT");
      else setErrorStatus("ERROR");
    }
    setIsAnalyzing(false);
  };

  // ─────────────────────────────────────────────────────
  //  🧬 نظام التعلم الذاتي العميق
  //  يحلل سبب الخطأ ويحفظ قاعدة مناخية
  // ─────────────────────────────────────────────────────
  const deepLearnFromError = async (correctionText) => {
    if (!correctionText.trim() || !apiKey) return false;
    if (badWordsList.some(word => correctionText.includes(word))) return false;

    try {
      // خطوة 1: نطلب من الذكاء الاصطناعي تحليل سبب الخطأ
      const analysisPrompt = `أنت عالم أرصاد جوية ومحلل أخطاء. 
المستخدم من مدينة "${cityName}" أخبرنا أن توقعنا كان خاطئاً وأن الطقس الفعلي كان: "${correctionText}".

البيانات التي كانت متاحة لنا وقت التوقع:
- الحرارة: ${weatherData?.current?.temperature_2m}°C
- الرطوبة: ${weatherData?.current?.relative_humidity_2m}%
- الضغط: ${weatherData?.current?.surface_pressure} hPa
- الرياح: ${weatherData?.current?.wind_speed_10m} كم/س
- CAPE: ${weatherData?.current?.cape}

المطلوب: حلل سبب الخطأ في التوقع واستخلص قاعدة مناخية واحدة مختصرة (جملة واحدة فقط) خاصة بمدينة ${cityName} يجب تذكرها مستقبلاً.
مثال: "في ${cityName}، عندما يكون الضغط منخفض والرياح شرقية، احتمال المطر أعلى مما تشير إليه النماذج."
أجب بالقاعدة فقط بدون مقدمات.`;

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: analysisPrompt }] }]
        })
      });

      const data = await response.json();
      const rule = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (rule && rule.length > 10 && rule.length < 300) {
        // حفظ الدرس في الأرشيف العام
        const globalLesson = `[${new Date().toLocaleDateString('ar-EG')}] ${rule}`;
        setLearnedLessons(prev => [...prev, globalLesson]);
        await setDoc(doc(db, "system_data", "learned_lessons"),
          { lessons: arrayUnion(globalLesson) }, { merge: true });

        // حفظ قاعدة خاصة بالمدينة
        setCityLessons(prev => [...prev, rule]);
        await setDoc(doc(db, "city_lessons", cityName),
          { rules: arrayUnion(rule), lastUpdated: Date.now() }, { merge: true });

        return true;
      }
    } catch { console.warn("خطأ في نظام التعلم العميق."); }
    return false;
  };

  // ─── التعلم من المحادثات ───
  const learnFromConversation = async (userMsg) => {
    if (!apiKey || userMsg.length < 15) return;
    if (badWordsList.some(w => userMsg.includes(w))) return;

    const learningKeywords = ["معلومة", "علمياً", "السبب", "غلط", "تصحيح", "الواقع", "التيار", "الرطوبة", "الضغط", "رياح", "عكس", "في مدينتي", "عندنا", "دائماً", "ملاحظة", "لاحظت"];
    if (!learningKeywords.some(kw => userMsg.includes(kw))) return;

    setChatLearningMsg("🔬 جاري فحص المعلومة وتحليلها...");

    try {
      const verifyPrompt = `أنت عالم أرصاد صارم. راجع هذه العبارة من مستخدم في مدينة "${cityName}": "${userMsg}".

إذا كانت تحتوي على ملاحظة مناخية محلية قيمة (مثل: "عندنا الرياح الشرقية تعني مطر") أو معلومة علمية صحيحة:
أجب بـ: VALID: [صِغ الملاحظة كقاعدة مختصرة]

إذا كانت مجرد مزاح أو معلومة خاطئة:
أجب بكلمة: INVALID`;

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: verifyPrompt }] }]
        })
      });

      const data = await response.json();
      const verdict = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

      if (verdict.startsWith("VALID")) {
        const extractedRule = verdict.replace("VALID:", "").replace("VALID", "").trim();
        const rule = extractedRule || userMsg;

        const lesson = `[محادثة ${new Date().toLocaleDateString('ar-EG')}] ${rule}`;
        setLearnedLessons(prev => [...prev, lesson]);
        await setDoc(doc(db, "system_data", "learned_lessons"),
          { lessons: arrayUnion(lesson) }, { merge: true });

        if (cityName) {
          setCityLessons(prev => [...prev, rule]);
          await setDoc(doc(db, "city_lessons", cityName),
            { rules: arrayUnion(rule), lastUpdated: Date.now() }, { merge: true });
        }

        setChatLearningMsg("✅ تم حفظ الملاحظة في بنك المعرفة المناخية!");
      } else {
        setChatLearningMsg("");
      }
    } catch { setChatLearningMsg(""); }
    setTimeout(() => setChatLearningMsg(""), 6000);
  };

  // ─────────────────────────────────────────────────────
  //  💬 نظام الشات الذكي
  // ─────────────────────────────────────────────────────
  const handleChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isReplying || !apiKey) return;

    const userMsg = chatInput;
    setChatInput("");
    const updatedHistory = [...chatHistory, { role: 'user', content: userMsg }];
    setChatHistory(updatedHistory);
    setIsReplying(true);

    // محاولة التعلم من الرسالة (في الخلفية)
    learnFromConversation(userMsg);

    try {
      const geminiHistory = updatedHistory.map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: { text: getSystemInstruction() } },
          contents: geminiHistory
        })
      });

      if (!response.ok) throw new Error("API_ERROR");
      const data = await response.json();
      const aiReply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (aiReply) {
        setChatHistory(prev => [...prev, { role: 'model', content: aiReply }]);
      } else {
        throw new Error("INVALID_RESPONSE");
      }
    } catch (error) {
      let errorMsg = "حدث خطأ في الاتصال. يرجى المحاولة بعد قليل.";
      if (error.message === "TOO_MANY_REQUESTS") errorMsg = "النظام يواجه ضغطاً. انتظر دقيقة ثم حاول.";
      setChatHistory(prev => [...prev, { role: 'model', content: errorMsg }]);
    }
    setIsReplying(false);
  };

  // ─── معالجة التصحيح ───
  const submitCorrection = async () => {
    if (!userCorrection.trim()) return;
    setFeedbackState("learning");

    const isClean = !badWordsList.some(word => userCorrection.includes(word));
    if (!isClean) {
      alert("عذراً، لا يمكن قبول هذا التقييم.");
      setUserCorrection(""); setFeedbackState("idle"); return;
    }

    const success = await deepLearnFromError(userCorrection);
    if (success) {
      setFeedbackState("submitted");
    } else {
      alert("لم يتم التحقق من الملاحظة. حاول التوضيح بتفصيل أكبر.");
      setFeedbackState("idle");
    }
    setUserCorrection("");
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [chatHistory, isReplying]);

  const visibleChat = chatHistory.filter((msg, index) => {
    if (index < 2 && chatHistory[0]?.content?.includes('أنت الآن تُعد التقرير')) return false;
    return true;
  });

  // ─── مكون عرض Markdown ───
  const MarkdownRenderer = ({ content }) => (
    <ReactMarkdown
      components={{
        h1: ({ children }) => <h1 className={`text-lg font-black mt-4 mb-2 ${textColor}`}>{children}</h1>,
        h2: ({ children }) => <h2 className={`text-base font-black mt-3 mb-2 ${textColor}`}>{children}</h2>,
        h3: ({ children }) => <h3 className={`text-sm font-black mt-2 mb-1 ${textColor}`}>{children}</h3>,
        p: ({ children }) => <p className={`text-sm leading-relaxed font-medium mb-2 ${textColor}`}>{children}</p>,
        strong: ({ children }) => <strong className="font-black text-orange-500">{children}</strong>,
        ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3 mr-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3 mr-2">{children}</ol>,
        li: ({ children }) => <li className={`text-sm font-medium leading-relaxed ${textColor}`}>{children}</li>,
        table: ({ children }) => <div className="overflow-x-auto mb-3"><table className={`text-xs w-full border-collapse ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{children}</table></div>,
        thead: ({ children }) => <thead className={`${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>{children}</thead>,
        th: ({ children }) => <th className="px-2 py-1.5 text-right font-black border border-slate-300 dark:border-slate-600">{children}</th>,
        td: ({ children }) => <td className="px-2 py-1 text-right border border-slate-200 dark:border-slate-700">{children}</td>,
        code: ({ children }) => <code className="bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded text-xs font-bold">{children}</code>,
        blockquote: ({ children }) => <blockquote className={`border-r-4 border-orange-500 pr-3 mr-2 my-2 ${isDark ? 'bg-slate-800/50' : 'bg-orange-50'} p-2 rounded-lg`}>{children}</blockquote>,
      }}
    >
      {content}
    </ReactMarkdown>
  );

  // ─────────────────────────────────────────────────────
  //  🎨 واجهة المستخدم
  // ─────────────────────────────────────────────────────
  return (
    <div className={`relative overflow-hidden shadow-[0_10px_30px_-10px_rgba(249,115,22,0.3)] rounded-[35px] border p-1 transition-all duration-500 will-change-transform glass-panel`}>
      <div className="p-5 sm:p-6">

        {/* ── الهيدر ── */}
        <div className="flex items-center justify-between mb-6 border-b border-slate-500/10 pb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-inner ${isAnalyzing ? 'bg-orange-500/10 animate-pulse' : 'bg-blue-500/10'}`}>
              {isAnalyzing ? <BrainCircuit className="w-6 h-6 sm:w-7 sm:h-7 text-orange-500 animate-spin" /> : <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-blue-500" />}
            </div>
            <div>
              <h3 className={`text-lg sm:text-xl font-black ${textColor}`}>المحلل السينوبتيكي</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                <p className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${subTextColor}`}>راصد جوي ذكي • يتعلم ذاتياً • v3</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* عداد الدروس */}
            {(learnedLessons.length + cityLessons.length) > 0 && (
              <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[9px] font-black ${isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                <Database className="w-3 h-3" />
                {learnedLessons.length + cityLessons.length} درس
              </div>
            )}
            <button onClick={() => setIsCollapsed(prev => !prev)} className={`px-3 sm:px-4 py-2 rounded-2xl font-black text-xs transition-all active:scale-95 ${isDark ? 'bg-slate-700 text-orange-400 hover:bg-slate-600 border border-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'}`}>
              {isCollapsed ? 'عرض المزيد' : 'عرض أقل'}
            </button>
          </div>
        </div>

        {/* ── المحتوى المصغر ── */}
        {isCollapsed ? (
          <div className="space-y-4 py-4">
            <div className={`text-sm leading-relaxed font-bold ${textColor}`}>
              {analysis ? <MarkdownRenderer content={analysis.summary.split('\n').slice(0, 3).join('\n')} /> : 'المحلل مصغَّر حالياً. اضغط "عرض المزيد" لفتح عقل المحلل.'}
            </div>
            <button onClick={() => setIsCollapsed(false)} className={`w-full py-3 rounded-2xl font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2 ${isDark ? 'bg-slate-700 text-orange-400 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              <Sparkles className="w-4 h-4" /> فتح المحلل بالكامل
            </button>
          </div>
        ) : (
          <>
            {/* ── لا يوجد تقرير ── */}
            {!analysis && !isAnalyzing ? (
              <div className="py-8 text-center animate-in fade-in">
                {errorStatus === "ERROR" ? (
                  <div className="mb-6"><AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" /><h4 className="text-sm font-black text-red-500 mb-2">خطأ بالاتصال بالسيرفر</h4></div>
                ) : errorStatus === "LIMIT" ? (
                  <div className="mb-6"><AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-3" /><h4 className="text-sm font-black text-orange-500 mb-2">انتظر ثوانٍ ثم حاول مجدداً</h4></div>
                ) : (
                  <Activity className="w-12 h-12 text-slate-400 mx-auto mb-4 opacity-50" />
                )}
                <h4 className={`text-sm font-black mb-2 ${textColor}`}>التحليل السينوبتيكي لمدينة {cityName}</h4>
                <p className={`text-xs mb-6 ${subTextColor}`}>سيقوم المحلل بقراءة جميع البيانات (ساعية + يومية + طبقات الجو + جودة الهواء) وتوليد تقرير احترافي.</p>
                <button onClick={generateReport} disabled={isAnalyzing} className="bg-gradient-to-l from-orange-500 to-orange-400 text-white font-black px-6 py-3.5 rounded-2xl shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2 mx-auto w-full sm:w-auto">
                  <Zap className="w-5 h-5" /> توليد التحليل الآن
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* ── جاري التحليل ── */}
                {isAnalyzing ? (
                  <div className="flex items-center gap-3 py-4 px-2">
                    <BrainCircuit className="w-6 h-6 text-orange-500 animate-spin shrink-0" />
                    <div className="flex-1">
                      <span className={`text-sm font-black ${textColor}`}>جاري التحليل...</span>
                      <div className="h-1.5 bg-slate-500/10 rounded-full w-full mt-2 animate-pulse"></div>
                    </div>
                  </div>
                ) : (
                  <div className="animate-in fade-in duration-700">
                    {/* ── الملخص ── */}
                    <MarkdownRenderer content={analysis.fullText} />

                    {/* ── المصدر ── */}
                    <div className={`text-[9px] font-bold mt-4 mb-4 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                      <TrendingUp className="w-3 h-3" /> {source}
                    </div>

                    {/* ── التغذية الراجعة والتعلم ── */}
                    <div className={`mb-4 p-4 rounded-2xl border ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      {feedbackState === "idle" && (
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className={`text-[11px] font-bold ${subTextColor}`}>هل التوقع طابق الواقع؟ (ساعدني أتعلم!)</span>
                          <div className="flex gap-2">
                            <button onClick={() => setFeedbackState("submitted")} className="p-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 transition-all"><ThumbsUp className="w-4 h-4" /></button>
                            <button onClick={() => setFeedbackState("typing")} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-all"><ThumbsDown className="w-4 h-4" /></button>
                          </div>
                        </div>
                      )}
                      {feedbackState === "typing" && (
                        <div className="space-y-3 animate-in fade-in">
                          <div className="flex items-center gap-2 text-orange-500">
                            <BookOpen className="w-4 h-4" />
                            <span className="text-[11px] font-black">أخبرني: كيف كان الطقس الفعلي؟ (سأحلل خطئي وأتعلم منه)</span>
                          </div>
                          <div className="flex gap-2">
                            <input type="text" value={userCorrection} onChange={(e) => setUserCorrection(e.target.value)} placeholder="مثال: الرياح كانت أشد بكثير مع رمال..." className={`flex-1 text-xs px-3 py-2.5 rounded-xl outline-none border ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800'}`} />
                            <button onClick={submitCorrection} className="px-4 bg-orange-500 text-white rounded-xl font-bold text-xs active:scale-95 transition-transform">تعلّم</button>
                          </div>
                        </div>
                      )}
                      {feedbackState === "learning" && (
                        <div className="flex items-center gap-2 text-orange-500 animate-pulse">
                          <BrainCircuit className="w-4 h-4 animate-spin" />
                          <span className="text-[11px] font-black">جاري تحليل سبب الخطأ واستخلاص قاعدة مناخية...</span>
                        </div>
                      )}
                      {feedbackState === "submitted" && (
                        <div className="flex items-center gap-2 text-green-500 animate-in fade-in">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-[11px] font-bold">شكراً! تم تحليل الخطأ وحفظ قاعدة مناخية جديدة في ذاكرتي.</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── الشات ── */}
        {analysis && !isAnalyzing && (
          <div className={`mt-6 pt-6 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-orange-500" />
                <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-widest ${subTextColor}`}>ناقش الراصد الجوي</span>
              </div>
              {chatLearningMsg && <span className="text-[9px] font-bold text-green-500 animate-pulse">{chatLearningMsg}</span>}
            </div>

            <div className="max-h-72 overflow-y-auto mb-4 space-y-4 pr-1 custom-scrollbar">
              {visibleChat.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] px-4 py-3 rounded-[20px] shadow-sm ${msg.role === 'user' ? 'bg-orange-500 text-white rounded-br-none' : isDark ? 'bg-slate-700 text-slate-200 rounded-bl-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'}`}>
                    {msg.role === 'user' ? (
                      <span className="text-xs font-bold leading-relaxed">{msg.content}</span>
                    ) : (
                      <MarkdownRenderer content={msg.content} />
                    )}
                  </div>
                </div>
              ))}
              {isReplying && (
                <div className="flex justify-start">
                  <div className={`px-4 py-3 rounded-[20px] rounded-bl-none flex items-center gap-3 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
                    <span className="text-[10px] font-black text-slate-500">يحلل سؤالك ويراجع البيانات...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleChat} className="relative flex gap-2">
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="إسأل وإفهم ,وإستفهم بحرية.." className={`flex-1 py-3.5 sm:py-4 pl-4 pr-4 rounded-2xl text-xs font-bold outline-none border transition-all ${isDark ? 'bg-slate-900 border-slate-700 focus:border-orange-500 text-white' : 'bg-slate-50 border-slate-200 focus:border-orange-500 text-slate-800'}`} disabled={isReplying} />
              {/* زر الميكروفون */}
              {recognitionRef.current && (
                <button type="button" onClick={toggleVoice} className={`p-3 rounded-2xl transition-all active:scale-95 ${isListening ? 'bg-red-500 text-white animate-pulse' : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              )}
              <button type="submit" disabled={isReplying || !chatInput.trim()} className="p-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl transition-all disabled:opacity-50 active:scale-95">
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};

export default AIWeatherAgent;