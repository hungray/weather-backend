import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ArrowRight, Check, Share2, Loader2, Calendar, Clock, Image as ImageIcon } from 'lucide-react';
import DOMPurify from 'dompurify';

const SingleArticlePage = ({ isDark }) => {
  const { articleId } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const textColor = isDark ? 'text-slate-100' : 'text-slate-800';
  const subTextColor = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardBg = isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-100';

  useEffect(() => {
    window.scrollTo(0, 0); // Always start reading from top
    const fetchArticle = async () => {
      try {
        const docRef = doc(db, 'articles', articleId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setArticle({ id: docSnap.id, ...docSnap.data() });
      } catch (error) {
        console.error('Error fetching article:', error);
      }
      setLoading(false);
    };
    fetchArticle();
  }, [articleId]);

  // Update document title for SEO
  useEffect(() => {
    if (article?.title) {
      document.title = `${article.title} | أخبار الطقس - مصر ويند`;
    }
  }, [article]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="flex justify-center p-20 min-h-[60vh] items-center"><Loader2 className="w-12 h-12 animate-spin text-orange-500" /></div>;
  if (!article) return <div className="text-center p-20 font-bold text-2xl h-[60vh] flex items-center justify-center">المقال غير موجود أو تم حذفه.</div>;

  const fallbackImage = 'https://images.unsplash.com/photo-1592210454359-9043f067919b?w=1200&auto=format&fit=crop&q=80';
  
  // Calculate reading time roughly (assume 200 words per min)
  const plainText = article.content.replace(/<[^>]+>/g, '');
  const words = plainText.trim().split(/\s+/).length;
  const readTime = Math.max(1, Math.ceil(words / 200));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 pb-28 lg:pb-10 max-w-4xl mx-auto px-2">
      {/* Top Bar Navigation */}
      <div className="flex justify-between items-center mb-8">
        <button onClick={() => navigate('/articles')} className={`flex items-center gap-2 font-black px-4 py-2.5 rounded-full active:scale-95 transition-all shadow-sm ${isDark ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-slate-800 hover:bg-slate-50'}`}>
          <ArrowRight className="w-5 h-5" /> العودة للأخبار
        </button>
        <button onClick={copyLink} className={`flex items-center gap-2 font-black px-5 py-2.5 rounded-full shadow-md active:scale-95 transition-all ${copied ? 'bg-green-500 text-white shadow-green-500/20' : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-orange-500/20'}`}>
          {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />} {copied ? 'تم النسخ!' : 'مشاركة الخبر'}
        </button>
      </div>

      <article className={`rounded-[2.5rem] border shadow-2xl overflow-hidden ${cardBg}`}>
        {/* Article Cover Hero */}
        <div className="relative h-[300px] md:h-[450px] w-full overflow-hidden bg-slate-900 group">
          <img 
            src={article.coverUrl || fallbackImage} 
            alt={article.title} 
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 opacity-90"
            onError={(e) => e.target.src = fallbackImage}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-6 md:p-12">
            <span className="bg-orange-500 text-white text-xs font-black px-3 py-1.5 rounded-lg mb-4 w-fit shadow-lg backdrop-blur-sm tracking-wider uppercase">
              {article.category}
            </span>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black leading-tight text-white mb-6 drop-shadow-lg">
              {article.title}
            </h1>
            <div className="flex items-center gap-4 text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-full backdrop-blur-md">
                <Calendar className="w-4 h-4 text-orange-400" /> 
                {article.createdAt ? new Date(article.createdAt.toDate()).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }) : 'الآن'}
              </span>
              <span className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-full backdrop-blur-md">
                <Clock className="w-4 h-4 text-blue-400" /> 
                {readTime} دقائق قراءة
              </span>
            </div>
          </div>
        </div>

        {/* Article Content */}
        <div className="p-6 md:p-12">
          <div 
            className={`prose prose-lg max-w-none prose-headings:font-black prose-p:font-medium prose-p:leading-loose prose-a:text-orange-500 prose-img:rounded-3xl prose-img:shadow-lg ${isDark ? 'prose-invert prose-p:text-slate-300 prose-headings:text-white prose-strong:text-white' : 'prose-p:text-slate-700 prose-headings:text-slate-900 prose-strong:text-slate-900'}`}
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content) }}
          />
        </div>
      </article>

      {/* Footer Share Action */}
      <div className="mt-12 text-center">
        <p className={`font-black mb-4 ${textColor}`}>هل أعجبك هذا التحليل؟ شاركه مع من يهمك أمرهم</p>
        <button onClick={copyLink} className="inline-flex items-center gap-2 bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 px-8 py-4 rounded-2xl font-black text-lg active:scale-95 transition-transform shadow-xl">
          <Share2 className="w-5 h-5" /> مشاركة الرابط
        </button>
      </div>
    </div>
  );
};

export default SingleArticlePage;
