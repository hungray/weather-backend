import { Bell, Search, Navigation } from 'lucide-react';

export default function HeaderBar({ isDark, onOpenSearch, onOpenNotifications, onLocate, logoImg }) {
  return (
    <header className={`sticky top-0 z-[500] px-4 py-3 lg:px-8 lg:py-4 flex justify-between items-center backdrop-blur-xl border-b transition-colors duration-500 ${isDark ? 'bg-slate-900/90 border-slate-700' : 'bg-white/90 border-slate-200'}`}>
      
      {/* Logo & Title */}
      <div className="flex items-center gap-3 lg:gap-4">
        <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full overflow-hidden border-2 lg:border-[3px] border-orange-400 shadow-md bg-white shrink-0 flex items-center justify-center">
          <img src={logoImg} alt="لوجو" className="w-full h-full object-cover" />
        </div>
        <h1 className={`font-black text-lg lg:text-2xl tracking-tight whitespace-nowrap drop-shadow-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>
          طقس مصر وبلاد الشام
        </h1>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 lg:gap-4">
        <button onClick={onOpenNotifications} className={`relative p-2 lg:p-3 rounded-full shadow-sm active:scale-95 transition-all border ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
          <Bell className="w-5 h-5" strokeWidth={2.5} />
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-slate-800 rounded-full animate-pulse"></span>
        </button>
        
        <div className={`flex items-center backdrop-blur-md rounded-full shadow-sm border p-1 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <button onClick={onLocate} className={`p-2 lg:p-2.5 rounded-full active:scale-95 transition-all ${isDark ? 'text-blue-400 hover:bg-slate-700' : 'text-blue-500 hover:bg-blue-50'}`} title="تحديد موقعي">
            <Navigation className="w-4 h-4 lg:w-5 lg:h-5" strokeWidth={2.5} />
          </button>
          <div className={`w-px h-5 lg:h-6 mx-1 ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`}></div>
          <button onClick={onOpenSearch} className={`p-2 lg:p-2.5 rounded-full active:scale-95 transition-all ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-50'}`} title="البحث عن مدينة">
            <Search className="w-4 h-4 lg:w-5 lg:h-5" strokeWidth={2.5} />
          </button>
        </div>
      </div>
      
    </header>
  );
}
