import { Search, MapPin, X, Loader2 } from 'lucide-react';

export default function SearchModal({ open, isDark, query, onQueryChange, searchResults, isSearching, onSelectCity, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-sm flex flex-col p-4 items-center justify-start pt-20 animate-in fade-in" onClick={onClose}>
      <div className={`rounded-[32px] w-full max-w-lg p-6 shadow-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/90 border-white backdrop-blur-xl'}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className={`font-black text-xl ${isDark ? 'text-white' : 'text-slate-800'}`}>ابحث عن مدينة</h3>
          <button onClick={onClose} className={`p-2 rounded-full active:scale-90 transition ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}><X className="w-5 h-5" /></button>
        </div>
        <div className={`relative shadow-inner rounded-2xl border focus-within:ring-2 ring-orange-400 transition-all ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-100 border-slate-200'}`}>
          <Search className="w-5 h-5 text-orange-500 absolute right-4 top-4" />
          <input type="text" maxLength={40} value={query} onChange={(e) => onQueryChange(e.target.value)} placeholder="اكتب اسم مدينة بالعالم..." className={`w-full bg-transparent border-none py-4 pr-12 pl-12 outline-none font-bold placeholder-slate-400 ${isDark ? 'text-white' : 'text-slate-800'}`} autoFocus />
          {isSearching && <Loader2 className="w-5 h-5 text-orange-500 absolute left-4 top-4 animate-spin" />}
        </div>
        {query && (
          <div className={`mt-4 max-h-60 overflow-y-auto rounded-2xl border shadow-inner ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
            {!isSearching && searchResults.length > 0 ? (
              searchResults.map((city, idx) => (
                <div key={idx} onClick={() => onSelectCity(city)} className={`p-4 border-b last:border-b-0 cursor-pointer font-bold flex items-center gap-3 transition-colors active:scale-[0.99] ${isDark ? 'border-slate-600 hover:bg-slate-600 text-slate-200' : 'border-slate-200 hover:bg-orange-50 text-slate-700'}`}>
                  <MapPin className="w-5 h-5 text-orange-500 shrink-0" />
                  <div className="flex flex-col"><span>{city.name}</span><span className="text-[10px] opacity-70">{city.admin1 ? `${city.admin1}، ` : ''}{city.country}</span></div>
                </div>
              ))
            ) : (!isSearching && searchResults.length === 0) ? (
              <div className={`p-5 text-center font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>لم يتم العثور على نتائج...</div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
