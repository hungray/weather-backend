import React from 'react';
import { Star, Bookmark, MapPin, Trash2, Plus } from 'lucide-react';

const FavoriteCities = ({ selectedCity, onSelectCity, isDark }) => {
  // Read favorite cities list from localStorage or use defaults
  const [favorites, setFavorites] = React.useState(() => {
    const saved = localStorage.getItem('fav_cities');
    return saved ? JSON.parse(saved) : [
      { name: 'القاهرة', lat: 30.0444, lon: 31.2357 },
      { name: 'الإسكندرية', lat: 31.2001, lon: 29.9187 },
      { name: 'أسوان', lat: 24.0889, lon: 32.8998 }
    ];
  });

  const saveFavorites = (newFavs) => {
    setFavorites(newFavs);
    localStorage.setItem('fav_cities', JSON.stringify(newFavs));
  };

  const isFavorite = favorites.some(
    fav => fav.lat.toFixed(3) === selectedCity.lat.toFixed(3) && fav.lon.toFixed(3) === selectedCity.lon.toFixed(3)
  );

  const toggleFavorite = () => {
    if (isFavorite) {
      const filtered = favorites.filter(
        fav => !(fav.lat.toFixed(3) === selectedCity.lat.toFixed(3) && fav.lon.toFixed(3) === selectedCity.lon.toFixed(3))
      );
      saveFavorites(filtered);
    } else {
      const newFav = {
        name: selectedCity?.name || 'المدينة',
        lat: selectedCity.lat,
        lon: selectedCity.lon
      };
      saveFavorites([...favorites, newFav]);
    }
  };

  const removeFavorite = (e, index) => {
    e.stopPropagation();
    const updated = favorites.filter((_, i) => i !== index);
    saveFavorites(updated);
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-orange-500 fill-orange-500" />
          <h3 className={`font-black text-lg tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            المدن المفضلة
          </h3>
        </div>
        
        {/* Toggle current city button */}
        <button
          onClick={toggleFavorite}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition-all duration-300 ${
            isFavorite
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
              : isDark
                ? 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-white' : ''}`} />
          {isFavorite ? 'محفوظة في المفضلة' : 'حفظ المدينة الحالية'}
        </button>
      </div>

      {favorites.length === 0 ? (
        <div className={`p-4 text-center rounded-3xl border text-xs font-bold ${isDark ? 'bg-slate-800/40 border-slate-700/50 text-slate-400' : 'bg-white/50 border-slate-200/50 text-slate-500'}`}>
          لا توجد مدن محفوظة في المفضلة بعد. أضف مدينتك الحالية!
        </div>
      ) : (
        <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-hide -mx-2 px-2 mask-linear-fade">
          {favorites.map((city, index) => {
            const isActive = city.lat.toFixed(3) === selectedCity.lat.toFixed(3) && city.lon.toFixed(3) === selectedCity.lon.toFixed(3);
            return (
              <div
                key={index}
                onClick={() => onSelectCity(city)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl cursor-pointer transition-all duration-300 shrink-0 border relative group ${
                  isActive
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-transparent shadow-lg shadow-orange-500/20'
                    : isDark
                      ? 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-700 hover:border-slate-500'
                      : 'bg-white/80 border-slate-200/80 text-slate-700 hover:bg-white hover:border-slate-300'
                }`}
              >
                <MapPin className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="text-xs font-black">{city.name}</span>
                
                {/* Delete button */}
                <button
                  onClick={(e) => removeFavorite(e, index)}
                  className={`p-1 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${
                    isActive
                      ? 'text-white/80 hover:text-white hover:bg-white/10'
                      : 'text-slate-400 hover:text-red-500 hover:bg-red-500/10'
                  }`}
                  title="حذف من المفضلة"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FavoriteCities;
