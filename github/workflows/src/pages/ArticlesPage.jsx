import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { BookOpen, Plus, ArrowRight, Share2, Loader2, Trash2, Calendar, Clock, AlertTriangle, Radio, TrendingUp, Zap } from 'lucide-react';

const ArticlesPage = ({ isDark, user }) => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('الكل');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const navigate = useNavigate();

  const isAdmin = user?.email?.toLowerCase().trim() === '3liigamiing@gmail.com';
  
  const cardBg = isDark ? 'bg-slate-800/80 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800';
  const textColor = isDark ? 'text-slate-100' : 'text-slate-800';
  const subTextColor = isDark ? 'text-slate-400' : 'text-slate-500';
  const categoryButtonClass = (cat) => `px-5 py-2.5 rounded-full text-xs font-black transition-all duration-300 shrink-0 ${activeCategory === cat ? (isDark ? 'bg-white text-slate-900' : 'bg-slate-900 text-white') : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`;

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const q = query(collection(db, 'articles'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const arts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setArticles(arts);
      } catch (error) {
        console.error('Error fetching articles:', error);
      }
      setLoading(false);
    };
    fetchArticles();
  }, []);

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await deleteDoc(doc(db, 'articles', deleteModal.id));
      setArticles(articles.filter(a => a.id !== deleteModal.id));
      setDeleteModal({ isOpen: false, id: null });
    } catch (error) {
      console.error("Error deleting article:", error);
    }
  };

  const categories = ['الكل', ...new Set(articles.map(a => a.category).filter(Boolean))];
  const filteredArticles = activeCategory === 'الكل' ? articles : articles.filter(a => a.category === activeCategory);
  
  // Logic for news portal
  const breakingNews = articles.slice(0, 3); // top 3 for ticker
  const featuredArticle = filteredArticles[0];
  const mainGridArticles = filteredArticles.slice(1, 7);
  const sidebarArticles = filteredArticles.slice(7, 12);

  const getCoverImage = (url) => url || 'https://images.unsplash.com/photo-1592210454359-9043f067919b?w=800&auto=format&fit=crop&q=60';
  const stripHtml = (html) => html ? html.replace(/<[^>]+>/g, '') : '';

  return (
    <div className="animate-in fade-in duration-700 pb-28 lg:pb-10 max-w-7xl mx-auto px-2">
      
      {/* 🔴 Breaking News Ticker 🔴 */}
      {breakingNews.length > 0 && (
        <div className={`flex items-center rounded-2xl border mb-6 overflow-hidden ${cardBg}`}>
          <div className="bg-red-600 text-white font-black text-[10px] px-4 py-3 flex items-center gap-1.5 shrink-0 z-10 relative shadow-lg">
            <Radio className="w-4 h-4 animate-pulse" /> عاجل
          </div>
          <div className="flex-1 overflow-hidden relative h-full">
            <div className="absolute whitespace-nowrap animate-marquee flex items-center h-full top-0 right-0">
              {breakingNews.map((news, idx) => (
                <span key={idx} className="mx-8 font-bold text-xs flex items-center gap-2 cursor-pointer hover:text-orange-500" onClick={() => navigate(`/article/${news.id}`)}>
                  <Zap className="w-3 h-3 text-orange-500" /> {news.title}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className={`text-3xl font-black tracking-tight mb-2 ${textColor}`}>غرفة الأخبار والتحليلات</h2>
          <p className={`text-xs font-bold ${subTextColor}`}>تغطية مستمرة لحالة الطقس والإنذارات المبكرة</p>
        </div>
        {isAdmin && (
          <button onClick={() => navigate('/admin/articles')} className="flex items-center justify-center gap-1.5 px-5 py-3 rounded-2xl font-black text-sm bg-orange-500 hover:bg-orange-600 text-white transition-all shadow-md active:scale-95">
            <Plus className="w-4 h-4" /> كتابة خبر جديد
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-orange-500" /></div>
      ) : articles.length === 0 ? (
        <div className={`text-center py-20 px-6 rounded-4xl border ${cardBg}`}>
          <div className="w-16 h-16 bg-slate-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4"><BookOpen className="w-8 h-8 text-slate-400" /></div>
          <p className="font-black text-lg">لا توجد أخبار منشورة حالياً</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide border-b border-slate-200 dark:border-slate-700">
            {categories.map((cat, idx) => (
              <button key={idx} onClick={() => setActiveCategory(cat)} className={categoryButtonClass(cat)}>
                {cat}
              </button>
            ))}
          </div>

          {filteredArticles.length === 0 ? (
            <div className={`rounded-3xl border p-10 text-center ${cardBg}`}>
              <p className={`text-lg font-black mb-3 ${textColor}`}>لا توجد مقالات في هذا القسم</p>
              <p className={`text-sm font-bold ${subTextColor}`}>جرب اختيار تصنيف آخر أو عُد إلى صفحة الأخبار الرئيسية.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* 📰 Main Content Area (8 cols) */}
            <div className="lg:col-span-8">
              {/* Featured Article */}
              {featuredArticle && (
                <div onClick={() => navigate(`/article/${featuredArticle.id}`)} className="group cursor-pointer mb-8">
                  <div className="h-[400px] rounded-3xl overflow-hidden relative mb-4">
                    <img src={getCoverImage(featuredArticle.coverUrl)} alt={featuredArticle.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80" />
                    <div className="absolute bottom-6 px-6">
                      <span className="bg-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-full mb-3 inline-block">{featuredArticle.category}</span>
                      <h3 className="text-2xl lg:text-3xl font-black text-white leading-tight mb-2 group-hover:text-orange-400 transition-colors">{featuredArticle.title}</h3>
                      <div className="flex items-center gap-3 text-[10px] font-bold text-slate-300">
                        <span>{featuredArticle.createdAt ? new Date(featuredArticle.createdAt.toDate()).toLocaleDateString('ar-EG', {month:'long', day:'numeric'}) : 'الآن'}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                        <span>الكاتب: فريق مصر ويند</span>
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <button onClick={(e) => { e.stopPropagation(); setDeleteModal({ isOpen: true, id: featuredArticle.id }); }} className="text-xs font-bold text-red-500 bg-red-500/10 px-3 py-1.5 rounded-lg hover:bg-red-500/20">حذف الخبر</button>
                  )}
                </div>
              )}

              {/* Grid Layout for rest */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {mainGridArticles.map((art) => (
                  <div key={art.id} onClick={() => navigate(`/article/${art.id}`)} className={`group cursor-pointer rounded-2xl border overflow-hidden flex flex-col transition-all hover:shadow-lg ${cardBg}`}>
                    <div className="h-48 overflow-hidden relative">
                      <img src={getCoverImage(art.coverUrl)} alt={art.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      <span className="absolute top-3 right-3 bg-slate-900/80 text-white text-[9px] font-black px-2.5 py-1 rounded-md backdrop-blur-sm">{art.category}</span>
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <h4 className={`font-black text-lg leading-snug mb-3 group-hover:text-orange-500 transition-colors line-clamp-2 ${textColor}`}>{art.title}</h4>
                      <p className={`text-xs font-medium leading-relaxed line-clamp-3 mb-4 ${subTextColor}`}>{stripHtml(art.content)}</p>
                      
                      <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                        <span className="text-[10px] font-bold text-slate-400">{art.createdAt ? new Date(art.createdAt.toDate()).toLocaleDateString('ar-EG', {month:'short', day:'numeric'}) : 'الآن'}</span>
                        {isAdmin && <button onClick={(e) => { e.stopPropagation(); setDeleteModal({ isOpen: true, id: art.id }); }} className="text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 📈 Sidebar (4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              
              <div className={`p-6 rounded-3xl border ${cardBg}`}>
                <h3 className={`font-black text-lg mb-4 flex items-center gap-2 ${textColor}`}><TrendingUp className="w-5 h-5 text-orange-500" /> الأكثر قراءة</h3>
                <div className="space-y-4">
                  {sidebarArticles.map((art, idx) => (
                    <div key={art.id} onClick={() => navigate(`/article/${art.id}`)} className="flex items-start gap-4 cursor-pointer group">
                      <span className="font-black text-3xl text-slate-200 dark:text-slate-700 mt-1">0{idx + 1}</span>
                      <div>
                        <h4 className={`font-black text-sm leading-snug group-hover:text-orange-500 transition-colors line-clamp-2 ${textColor}`}>{art.title}</h4>
                        <span className={`text-[10px] font-bold mt-1 block ${subTextColor}`}>{art.createdAt ? new Date(art.createdAt.toDate()).toLocaleDateString('ar-EG', {month:'short', day:'numeric'}) : 'الآن'}</span>
                      </div>
                    </div>
                  ))}
                  {sidebarArticles.length === 0 && <p className="text-xs text-slate-400">لا يوجد المزيد من الأخبار حالياً.</p>}
                </div>
              </div>

              {/* Promo or Live Radar Banner */}
              <div className="rounded-3xl border overflow-hidden relative h-64 flex flex-col justify-end p-6 cursor-pointer" onClick={() => navigate('/radar')}>
                <img src="https://images.unsplash.com/photo-1561553543-e4c7b608b98d?w=600&auto=format&fit=crop&q=60" alt="Radar Banner" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
                <div className="relative z-10 text-white">
                  <span className="bg-red-600 text-[9px] font-black px-2 py-1 rounded-md mb-2 inline-flex items-center gap-1 animate-pulse"><Radio className="w-3 h-3"/> بث مباشر</span>
                  <h3 className="font-black text-xl mb-1">رادار السحب الحي</h3>
                  <p className="text-xs font-bold text-slate-300">تابع حركة الأمطار والعواصف مباشرة من الأقمار الصناعية.</p>
                </div>
              </div>

            </div>
          </div>
          )}
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-4xl p-6 border shadow-2xl ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
            <h3 className="text-lg font-black mb-2">تأكيد الحذف</h3>
            <p className={`text-xs font-bold mb-6 ${subTextColor}`}>سيتم حذف هذه المقالة نهائياً.</p>
            <div className="flex gap-3">
              <button onClick={confirmDelete} className="flex-1 py-3 bg-red-500 text-white font-black text-xs rounded-xl hover:bg-red-600">حذف</button>
              <button onClick={() => setDeleteModal({ isOpen: false, id: null })} className="flex-1 py-3 bg-slate-200 dark:bg-slate-700 font-black text-xs rounded-xl">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticlesPage;
