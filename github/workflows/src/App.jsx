import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import AIWeatherAgent from "./AIWeatherAgent";
import { 
  CloudSun, MapPin, Sun, Moon, Calendar, Bike, Car, 
  Home, Radar, BookOpen, User, Search, Bell, WifiOff, Wifi, AlertCircle, 
  Navigation, X, Activity, CloudRain, Wind, Settings, Thermometer, ShieldAlert, ChevronLeft, Heart,
  Lock, Coffee, Stethoscope, Route as RouteIcon, Droplets, Check, Battery, Play, Pause,
  Gauge, Eye, Wind as DustIcon, Waves, Leaf, Mail, LogOut, Globe, Loader2,
  Cloud, CloudFog, CloudDrizzle, Snowflake, CloudLightning, Sunrise, Sunset, ArrowRight, ShieldCheck, Share2, Trash2, Plus, Edit3,
  Scale
} from 'lucide-react';

import 'leaflet/dist/leaflet.css';

import logoImg from './assets/logo.png'; 

// 🔴 استيراد خدمات فايربيز الحقيقية 🔴
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, messaging, db } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getToken } from "firebase/messaging";
import { useLocation } from 'react-router-dom';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

import HomePage from './pages/HomePage';
import DayDetailsPage from './pages/DayDetailsPage';
import RadarPage from './pages/RadarPage';
import ArticlesPage from './pages/ArticlesPage';
import SingleArticlePage from './pages/SingleArticlePage';
import AdminArticlesPage from './pages/AdminArticlesPage';
import UserPage from './pages/UserPage';
import ComparePage from './pages/ComparePage';

import { ErrorBoundary, Toast, LoadingOverlay } from './components/CommonComponents';
import AuthModal from './components/AuthModal';
import SearchModal from './components/SearchModal';
import HeaderBar from './components/HeaderBar';
import NavItem from './components/NavItem';
import { VisitorNotificationPrompt, NotificationCenterModal } from './components/NotificationPrompt';
import { getWeatherDesc, advancedSynopticAnalysis, secureFetch } from './utils/weatherUtils';
import { useLocalStorageState } from './hooks/useLocalStorageState';
import { useWeatherData } from './hooks/useWeatherData';

if (window.self !== window.top) { window.top.location = window.self.location; }

function App() {
  const [toast, setToast] = useState({ isVisible: false, message: '', type: '', action: null });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false); // حالة نافذة الإشعارات للزوار الجدد
  
  // 💾 التخزين المحلي للإعدادات
  const [isDark, setIsDark] = useLocalStorageState('isDark', false);
  const [isCelsius, setIsCelsius] = useLocalStorageState('isCelsius', true);
  const [windUnit, setWindUnit] = useLocalStorageState('windUnit', { id: 'kmh', label: 'كم / ساعة' });
  const [rainUnit, setRainUnit] = useLocalStorageState('rainUnit', { id: 'mm', label: 'مليمتر (mm)' });
  const [pressureUnit, setPressureUnit] = useLocalStorageState('pressureUnit', { id: 'hpa', label: 'هيكتوباسكال (hPa)' });
  const [radarTheme, setRadarTheme] = useLocalStorageState('radarTheme', { id: 'standard', label: 'الوضع القياسي' });
  const [batterySaver, setBatterySaver] = useLocalStorageState('batterySaver', false);
  
  // حالة زراير الإشعارات
  const isNotifGranted = 'Notification' in window && Notification.permission === 'granted';
  const [followMeEnabled, setFollowMeEnabled] = useLocalStorageState('followMeEnabled', false);
  const [alertEnabled, setAlertEnabled] = useLocalStorageState('alertEnabled', false);

  // حالة الموافقة على ملفات تعريف الارتباط
  const [cookieConsent, setCookieConsent] = useLocalStorageState('cookieConsent', false);
  const [selectedCity, setSelectedCity] = useLocalStorageState('selectedCity', { name: "القاهرة، مصر", lat: 30.0444, lon: 31.2357 });

  const [searchQuery, setSearchQuery] = useState("");
  const handleSearchInput = (e) => setSearchQuery(e.target.value);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false); 
  const { weatherData, loading: weatherLoading, error: weatherError, refetch: refetchWeather } = useWeatherData(selectedCity, isCelsius, windUnit, rainUnit);
  
  // 🔑 حالات فايربيز (Firebase)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  // 🔴 الاستماع الحي لتغيرات المستخدم من فايربيز 🔴
  useEffect(() => {
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
      });
      return () => unsubscribe();
    }
  }, []);

  // 🔴 تحميل الإعدادات من فايربيز عند تسجيل الدخول 🔴
  useEffect(() => {
    if (user) {
      const loadSettings = async () => {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.isDark !== undefined) setIsDark(data.isDark);
            if (data.isCelsius !== undefined) setIsCelsius(data.isCelsius);
            if (data.windUnit) setWindUnit(data.windUnit);
            if (data.rainUnit) setRainUnit(data.rainUnit);
            if (data.pressureUnit) setPressureUnit(data.pressureUnit);
            if (data.radarTheme) setRadarTheme(data.radarTheme);
            if (data.batterySaver !== undefined) setBatterySaver(data.batterySaver);
            if (data.followMeEnabled !== undefined) setFollowMeEnabled(data.followMeEnabled);
            if (data.alertEnabled !== undefined) setAlertEnabled(data.alertEnabled);
            if (data.selectedCity) setSelectedCity(data.selectedCity);
          }
        } catch (e) {
          console.error("Error loading settings", e);
        }
      };
      loadSettings();
    }
  }, [user]);

  // 🔴 حفظ الإعدادات في فايربيز عند تغييرها 🔴
  useEffect(() => {
    if (user) {
      const saveSettings = async () => {
        try {
          const docRef = doc(db, 'users', user.uid);
          await setDoc(docRef, {
            isDark, isCelsius, windUnit, rainUnit, pressureUnit, radarTheme, batterySaver, followMeEnabled, alertEnabled, selectedCity
          }, { merge: true });
        } catch (e) {
          console.error("Error saving settings", e);
        }
      };
      saveSettings();
    }
  }, [user, isDark, isCelsius, windUnit, rainUnit, pressureUnit, radarTheme, batterySaver, followMeEnabled, alertEnabled, selectedCity]);

  useEffect(() => { 
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [isDark]);

  useEffect(() => {
    if (batterySaver) {
      document.body.classList.add('battery-saver');
    } else {
      document.body.classList.remove('battery-saver');
    }
  }, [batterySaver]);

  // تحديث بيانات الميتا وعناوين الصفحات حياً لـ SEO
  useEffect(() => {
    if (!selectedCity) return;
    const cityName = selectedCity.name.split('،')[0];
    const descText = `توقعات الطقس في ${cityName} اليوم وغداً ولمدة 15 يوماً بالتفصيل. اعرف درجات الحرارة العظمى والصغرى، سرعة الرياح، الرطوبة، وفرص الأمطار ساعة بساعة في ${cityName} على موقع طقس مصر وبلاد الشام.`;
    
    document.title = `الطقس في ${cityName} | طقس مصر وبلاد الشام`;
    
    // تحديث وصف الميتا
    let metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', descText);
    }
    
    // تحديث الكلمات المفتاحية
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute('content', `الطقس في ${cityName}, طقس ${cityName}, درجات الحرارة في ${cityName}, الطقس اليوم, الطقس غدا, الطقس لمدة 15 يوم, أخبار الطقس, رياح ${cityName}, أمطار ${cityName}, طقس مصر وبلاد الشام`);
    }

    // تحديث Open Graph
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', `الطقس في ${cityName} | طقس مصر وبلاد الشام`);
    
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', descText);
  }, [selectedCity]);


  // تسجيل Service Worker لـ FCM
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then((reg) => {
          console.log('[ServiceWorker] تم التسجيل بنجاح:', reg.scope);
        })
        .catch((err) => {
          console.error('[ServiceWorker] فشل التسجيل:', err);
        });
    }
  }, []);

  // تتبع الزيارات وعرض نافذة التنبيهات للزوار الجدد
  useEffect(() => {
    // غيرنا اسم المفتاح عشان يصفر العداد ويبدأ يحسب من جديد
    let visits = parseInt(localStorage.getItem('appVisits_v2') || '0');
    
    // الشاشة هتطلع لو الزيارات أقل من 3، ولو المستخدم لسه مأداش قرار (سماح أو حظر)
    if (visits < 3 && 'Notification' in window && Notification.permission === 'default') {
      const timer = setTimeout(() => {
        setShowNotifPrompt(true);
      }, 4000); // هتطلع بعد 4 ثواني
      
      localStorage.setItem('appVisits_v2', (visits + 1).toString());
      return () => clearTimeout(timer);
    }
  }, []);

  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) {
      showToast('متصفحك لا يدعم الإشعارات', 'error');
      setShowNotifPrompt(false);
      return;
    }
    try {
      let perm = Notification.permission;
      if (perm === 'default') perm = await Notification.requestPermission();

      if (perm === 'granted') {
        showToast('تم تفعيل التنبيهات بنجاح 🔔', 'success');
        // هنا السر: بنأمر الزراير اللي جوه الإعدادات تفتح أوتوماتيك
        setFollowMeEnabled(true);
        setAlertEnabled(true);
        new Notification('مرحباً بك!', { body: 'سنقوم بتنبيهك عند اقتراب أمطار أو عواصف.', icon: '/logo.png' });
        
        // جلب رمز التسجيل لـ FCM
        try {
          if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready;
            const token = await getToken(messaging, { 
              serviceWorkerRegistration: reg 
            });
            console.log('[FCM] رمز التسجيل (Token):', token);
            localStorage.setItem('fcm_token', token);
            if (user) {
              await setDoc(doc(db, 'users', user.uid), { fcmToken: token }, { merge: true });
            }
          }
        } catch (fcmErr) {
          console.warn('[FCM] لم نتمكن من الحصول على رمز FCM:', fcmErr);
        }
      } else if (perm === 'denied') {
        showToast('مرفوضة: اضغط على القفل 🔒 أعلى الشاشة للسماح', 'error');
      }
    } catch (error) { console.error(error); }
    finally { setShowNotifPrompt(false); }
  };

  // بحث آمن مع Debounce
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setIsSearching(false); return; }
    setIsSearching(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await secureFetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&language=ar&count=5`);
        setSearchResults(res.results || []);
      } catch (error) { setSearchResults([]); }
      setIsSearching(false);
    }, 600); 
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const showToast = useCallback((message, type, action = null) => {
    setToast({ isVisible: true, message, type, action });
    setTimeout(() => setToast({ isVisible: false, message: '', type: '', action: null }), 4000);
  }, []);

  useEffect(() => {
    if (weatherError) {
      showToast('حدث خطأ أثناء تحميل بيانات الطقس. حاول مرة أخرى.', 'error', { label: 'إعادة المحاولة', onClick: () => refetchWeather() });
    }
  }, [weatherError, showToast, refetchWeather]);

  const toggleTheme = () => setIsDark(!isDark);
  
  const handleSelectCity = (cityObj) => {
    const cityName = `${cityObj.name}${cityObj.admin1 ? `، ${cityObj.admin1}` : ''}، ${cityObj.country}`;
    setSelectedCity({ name: cityName, lat: cityObj.latitude, lon: cityObj.longitude });
    setIsSearchOpen(false); setSearchQuery(''); setSearchResults([]);
    showToast(`تم عرض الطقس في: ${cityObj.name}`, 'success');
  };

  // 🔴 دالة التسجيل الحقيقية بفايربيز (إيميل وباسورد) 🔴
  const handleFirebaseAuth = async (e) => {
    e.preventDefault();
    if (!auth) return showToast('تحذير: لم يتم تفعيل فايربيز بعد', 'error');
    setAuthLoading(true);
    try {
      if (isSignUpMode) {
        await createUserWithEmailAndPassword(auth, email, password);
        showToast('تم إنشاء حسابك بنجاح!', 'success');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('تم تسجيل الدخول بنجاح', 'success');
      }
      setIsAuthModalOpen(false); setEmail(""); setPassword("");
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') showToast('هذا الإيميل مستخدم مسبقاً', 'error');
      else if (error.code === 'auth/weak-password') showToast('كلمة المرور ضعيفة جداً', 'error');
      else showToast('البيانات غير صحيحة', 'error');
    }
    setAuthLoading(false);
  };

  // 🔴 دالة التسجيل الحقيقية (جوجل وفيسبوك Popups) 🔴
  const handleSocialAuth = async (providerName) => {
    if (!auth) return showToast('تحذير: لم يتم تفعيل فايربيز بعد', 'error');
    try {
      const { signInWithPopup, GoogleAuthProvider, FacebookAuthProvider } = await import('firebase/auth');
      const provider = providerName === 'Google' ? new GoogleAuthProvider() : new FacebookAuthProvider();
      
      const result = await signInWithPopup(auth, provider);
      showToast(`مرحباً ${result.user.displayName}`, 'success');
      setIsAuthModalOpen(false);
    } catch (error) {
      if (error.code !== 'auth/popup-closed-by-user') {
        showToast(`فشلت عملية الدخول بـ ${providerName}`, 'error');
      }
    }
  };

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      const currentConsent = localStorage.getItem('cookieConsent');
      localStorage.clear();
      if (currentConsent) localStorage.setItem('cookieConsent', currentConsent);
      showToast('تم تسجيل الخروج بأمان', 'success');
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const getLocation = () => {
    if (!("geolocation" in navigator)) {
      showToast('المتصفح لا يدعم تحديد الموقع', 'error');
      return;
    }

    showToast('جاري تحديد موقعك...', 'success');
    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        showToast('لم يتم تحديد الموقع خلال 10 ثوانٍ. حاول مرة أخرى.', 'error');
      }
    }, 10000);

    navigator.geolocation.getCurrentPosition(async (position) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);

      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      try {
        const res = await secureFetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=ar`);
        if (res.results && res.results[0]) {
          handleSelectCity(res.results[0]);
          showToast('تم تحديد الموقع بنجاح', 'success');
        } else {
          setSelectedCity({ name: 'موقعك الحالي', lat, lon });
          showToast('تم تحديد الموقع بنجاح', 'success');
        }
      } catch (e) {
        setSelectedCity({ name: 'موقعك الحالي', lat, lon });
        showToast('تم تحديد الموقع، ولكن لم تتم ترجمة الإحداثيات إلى اسم.', 'warning');
      }
    }, (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      const message = error.code === error.PERMISSION_DENIED
        ? 'يرجى تفعيل الـ GPS والسماح بالتحديد' : error.code === error.TIMEOUT
        ? 'انتهى وقت تحديد الموقع. حاول مرة أخرى.' : 'فشل تحديد الموقع. حاول مرة أخرى.';
      showToast(message, 'error');
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  };

  const appBg = isDark ? 'bg-slate-900 bg-cosmic' : 'bg-[#f4f6f9] bg-gradient-to-br from-slate-50 to-orange-50/20';
  const textColor = isDark ? 'text-slate-100' : 'text-slate-800';

  return (
    <Router>
      <ScrollToTop />
      <ErrorBoundary>
        <div className={`${appBg} min-h-screen font-sans ${textColor} selection:bg-orange-500/30 transition-colors duration-500 relative overflow-x-hidden flex flex-col lg:flex-row`} dir="rtl">
          {isDark && <div className="stars-overlay"></div>}
          
          <aside className={`hidden lg:flex flex-col w-24 backdrop-blur-2xl border-l fixed right-0 top-0 h-screen py-8 z-100 shadow-[10px_0_40px_rgba(0,0,0,0.05)] items-center justify-between transition-colors duration-500 ${isDark ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white/60 border-white/50'}`}>
            <div className="flex flex-col items-center gap-8">
              <div className="w-12 h-12 rounded-full overflow-hidden shadow-lg border-2 border-orange-400 bg-white hover:shadow-orange-500/40 transition-shadow animate-float"><img src={logoImg} alt="لوجو" onError={(e) => e.target.src = 'https://via.placeholder.com/150/FF8C00/FFFFFF?text=W'} className="w-full h-full object-cover" /></div>
              <nav className="flex flex-col gap-4">
                <NavItem to="/" icon={<Home />} label="الرئيسية" isDark={isDark} />
                <NavItem to="/radar" icon={<Radar />} label="الرادار" isDark={isDark} />
                <NavItem to="/compare" icon={<Scale />} label="مقارنة" isDark={isDark} />
                <NavItem to="/articles" icon={<BookOpen />} label="مقالات" isDark={isDark} />
                <NavItem to="/user" icon={<Settings />} label="إعدادات" isDark={isDark} />
              </nav>
            </div>
          </aside>

          <div className="flex-1 lg:pr-24 flex flex-col min-h-screen relative z-10">
            <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type} action={toast.action} />
            <LoadingOverlay isVisible={weatherLoading} />



            <AuthModal
              open={isAuthModalOpen}
              isDark={isDark}
              isSignUpMode={isSignUpMode}
              email={email}
              password={password}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onSubmit={handleFirebaseAuth}
              onClose={() => setIsAuthModalOpen(false)}
              onToggleMode={() => setIsSignUpMode(!isSignUpMode)}
              onSocialAuth={handleSocialAuth}
              authLoading={authLoading}
            />

            <SearchModal
              open={isSearchOpen}
              isDark={isDark}
              query={searchQuery}
              onQueryChange={setSearchQuery}
              searchResults={searchResults}
              isSearching={isSearching}
              onSelectCity={handleSelectCity}
              onClose={() => { setIsSearchOpen(false); setSearchQuery(''); setSearchResults([]); }}
            />

            {/* نافذة عرض الإشعارات للزوار الجدد */}
            <VisitorNotificationPrompt open={showNotifPrompt} isDark={isDark} onEnable={handleEnableNotifications} onClose={() => setShowNotifPrompt(false)} />

            <HeaderBar isDark={isDark} logoImg={logoImg} onOpenSearch={() => setIsSearchOpen(true)} onOpenNotifications={() => setIsNotifOpen(true)} onLocate={getLocation} />
            



            <main className="p-4 lg:p-10 max-w-lg lg:max-w-6xl mx-auto w-full relative z-10 flex-1 pb-32 sm:pb-40">
              <Routes>
                <Route path="/" element={<HomePage isDark={isDark} selectedCity={selectedCity} weatherData={weatherData} onSelectCity={setSelectedCity} windUnit={windUnit} rainUnit={rainUnit} pressureUnit={pressureUnit} />} />
                <Route path="/day-details/:dayIndex" element={<DayDetailsPage isDark={isDark} weatherData={weatherData} selectedCity={selectedCity} windUnit={windUnit} rainUnit={rainUnit} pressureUnit={pressureUnit} />} />
                <Route path="/radar" element={<RadarPage isDark={isDark} selectedCity={selectedCity} />} />
                <Route path="/compare" element={<ComparePage isDark={isDark} windUnit={windUnit} />} />
                <Route path="/articles" element={<ArticlesPage isDark={isDark} user={user} />} />
                <Route path="/article/:articleId" element={<SingleArticlePage isDark={isDark} />} />
                <Route path="/admin/articles" element={<AdminArticlesPage isDark={isDark} user={user} showToast={showToast} />} />
                <Route path="/user" element={<UserPage showToast={showToast} isDark={isDark} toggleTheme={toggleTheme} user={user} onLoginRequest={() => setIsAuthModalOpen(true)} onLogout={handleLogout} weatherData={weatherData} isCelsius={isCelsius} setIsCelsius={setIsCelsius} windUnit={windUnit} setWindUnit={setWindUnit} rainUnit={rainUnit} setRainUnit={setRainUnit} pressureUnit={pressureUnit} setPressureUnit={setPressureUnit} radarTheme={radarTheme} setRadarTheme={setRadarTheme} batterySaver={batterySaver} setBatterySaver={setBatterySaver} followMeEnabled={followMeEnabled} setFollowMeEnabled={setFollowMeEnabled} alertEnabled={alertEnabled} setAlertEnabled={setAlertEnabled} />} />
              </Routes>
            </main>
          </div>

          <div className="lg:hidden fixed bottom-4 sm:bottom-6 left-0 w-full flex justify-center z-[100] px-4 pointer-events-none">
            <nav className={`w-full max-w-sm backdrop-blur-2xl border shadow-[0_10px_40px_rgba(0,0,0,0.1)] rounded-[2rem] flex justify-around p-2 pointer-events-auto transition-colors duration-500 ${isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-slate-200'}`}>
              <NavItem to="/" icon={<Home />} label="الرئيسية" isDark={isDark} />
              <NavItem to="/radar" icon={<Radar />} label="الرادار" isDark={isDark} />
              <NavItem to="/compare" icon={<Scale />} label="مقارنة" isDark={isDark} />
              <NavItem to="/articles" icon={<BookOpen />} label="مقالات" isDark={isDark} />
              <NavItem to="/user" icon={<Settings />} label="إعدادات" isDark={isDark} />
            </nav>
          </div>
        </div> 

        {isNotifOpen && (
          <NotificationCenterModal open={isNotifOpen} isDark={isDark} selectedCityName={selectedCity?.name?.split('،')[0] || 'مدينتك'} weatherData={weatherData} onClose={() => setIsNotifOpen(false)} windUnit={windUnit} rainUnit={rainUnit} />
        )}

        {/* رسالة ملفات تعريف الارتباط (Cookies) */}
        {!cookieConsent && (
          <div className={`fixed bottom-0 lg:bottom-4 left-0 w-full lg:w-auto lg:left-4 lg:max-w-sm z-[999999] p-4 lg:rounded-3xl border shadow-2xl animate-in slide-in-from-bottom-full ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 text-orange-500 shrink-0 mt-1" />
              <div>
                <h4 className={`text-sm font-black mb-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>سياسة الخصوصية وملفات الارتباط</h4>
                <p className={`text-[10px] font-bold mb-3 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  نحن نستخدم ملفات تعريف الارتباط (Cookies) لتحسين تجربتك، وحفظ تفضيلاتك (مثل وحدات القياس ومدينتك المفضلة) لضمان تقديم أفضل وأدق خدمة لك.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => { setCookieConsent(true); }} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-black py-2 rounded-xl transition-all shadow-md active:scale-95">أوافق</button>
                  <button onClick={() => { localStorage.clear(); setCookieConsent(true); }} className={`flex-1 text-xs font-black py-2 rounded-xl transition-all border ${isDark ? 'bg-slate-700 text-slate-300 border-slate-600' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>رفض</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </ErrorBoundary>
    </Router>
  );
}

export default App;
