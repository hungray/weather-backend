import React, { useState, useRef, useCallback } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Lock, Edit3, Image as ImageIcon, AlignLeft, Send, Loader2, Bold, Italic, Underline, List, ListOrdered, Heading2, Link as LinkIcon, Undo, Type, Strikethrough } from 'lucide-react';

const MY_ADMIN_EMAIL = '3liigamiing@gmail.com';
const checkIsAdmin = (user) => {
  if (!user || !user.email) return false;
  return user.email.toLowerCase().trim() === MY_ADMIN_EMAIL.toLowerCase().trim();
};

// Custom Rich Text Toolbar Button
const ToolbarBtn = ({ icon: Icon, label, onClick, active, isDark }) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    className={`p-2 rounded-xl transition-all duration-200 active:scale-90 ${
      active
        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
        : isDark
          ? 'text-slate-300 hover:bg-slate-600 hover:text-white'
          : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
    }`}
  >
    <Icon className="w-4 h-4" />
  </button>
);

const AdminArticlesPage = ({ isDark, user, showToast }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const editorRef = useRef(null);

  const isAdmin = checkIsAdmin(user);
  const textColor = isDark ? 'text-slate-100' : 'text-slate-800';
  const subTextColor = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBg = isDark ? 'bg-slate-700/50 border-slate-600 text-white focus:border-orange-500/50' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-orange-500/50';

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
          <Lock className="w-12 h-12 text-red-500" />
        </div>
        <h2 className="text-3xl font-black text-red-500 mb-3 tracking-tight">منطقة محظورة</h2>
        <p className="font-bold text-slate-500 max-w-sm leading-relaxed">
          غير مصرح لك بالدخول لهذه الصفحة. هذه الصفحة مخصصة لمديري النظام فقط لإدارة المحتوى.
        </p>
      </div>
    );
  }

  const execCmd = useCallback((command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  }, []);

  const insertLink = useCallback(() => {
    const url = prompt('أدخل رابط الـ URL:');
    if (url) {
      document.execCommand('createLink', false, url);
      editorRef.current?.focus();
    }
  }, []);

  const handlePublish = async (e) => {
    e.preventDefault();
    const content = editorRef.current?.innerHTML || '';
    if (!title || !category || !content || content === '<br>' || content.trim() === '') {
      return showToast('يرجى كتابة العنوان والتصنيف والمحتوى', 'error');
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'articles'), {
        title,
        category,
        coverUrl,
        content,
        createdAt: serverTimestamp()
      });
      showToast('تم نشر المقال بنجاح! 🎉', 'success');
      setTitle('');
      setCategory('');
      setCoverUrl('');
      if (editorRef.current) editorRef.current.innerHTML = '';
    } catch (error) {
      console.error(error);
      showToast('حدث خطأ أثناء النشر', 'error');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 pb-28 lg:pb-10 max-w-4xl mx-auto px-2">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
          <Edit3 className="w-7 h-7 text-white" />
        </div>
        <div>
          <h2 className={`text-3xl font-black tracking-tight ${textColor}`}>محرر المقالات</h2>
          <p className={`text-xs font-bold mt-1 ${subTextColor}`}>اكتب، نسق، وانشر الأخبار والتحليلات لجمهورك</p>
        </div>
      </div>

      <form onSubmit={handlePublish} className="space-y-6">
        <div className={`p-8 rounded-[2.5rem] border shadow-xl ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-100'}`}>
          {/* Title & Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className={`block text-xs font-black mb-2 px-1 ${textColor}`}>عنوان المقال الرئيسي</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className={`w-full p-4 rounded-2xl border-2 outline-none font-bold transition-colors ${inputBg}`}
                placeholder="مثال: منخفض جوي عميق يضرب السواحل..."
              />
            </div>
            <div>
              <label className={`block text-xs font-black mb-2 px-1 ${textColor}`}>التصنيف</label>
              <input
                type="text"
                value={category}
                onChange={e => setCategory(e.target.value)}
                className={`w-full p-4 rounded-2xl border-2 outline-none font-bold transition-colors ${inputBg}`}
                placeholder="مثال: إنذار مبكر، تحليلات، أخبار عامة..."
              />
            </div>
          </div>

          {/* Cover Image URL */}
          <div className="mb-6">
            <label className={`flex items-center gap-1.5 text-xs font-black mb-2 px-1 ${textColor}`}>
              <ImageIcon className="w-4 h-4 text-orange-500" /> رابط صورة الغلاف (اختياري)
            </label>
            <input
              type="url"
              value={coverUrl}
              onChange={e => setCoverUrl(e.target.value)}
              className={`w-full p-4 rounded-2xl border-2 outline-none font-medium transition-colors text-left ${inputBg}`}
              placeholder="https://example.com/image.jpg"
              dir="ltr"
            />
            {coverUrl && (
              <div className="mt-4 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 h-48 relative">
                <img src={coverUrl} alt="Cover Preview" className="w-full h-full object-cover" onError={(e) => e.target.src = 'https://images.unsplash.com/photo-1592210454359-9043f067919b?w=800&auto=format&fit=crop&q=60'} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent flex items-end p-4">
                  <span className="text-white text-xs font-black bg-black/40 backdrop-blur-md px-3 py-1 rounded-full">معاينة صورة الغلاف</span>
                </div>
              </div>
            )}
          </div>

          {/* Rich Text Editor */}
          <div className="mb-8">
            <label className={`flex items-center gap-1.5 text-xs font-black mb-2 px-1 ${textColor}`}>
              <AlignLeft className="w-4 h-4 text-orange-500" /> محتوى المقال التفصيلي
            </label>
            <div className={`rounded-2xl overflow-hidden border-2 transition-colors ${isDark ? 'border-slate-600 focus-within:border-orange-500/50' : 'border-slate-200 focus-within:border-orange-500/50'}`}>
              {/* Toolbar */}
              <div className={`flex flex-wrap items-center gap-1 px-4 py-3 border-b-2 ${isDark ? 'bg-slate-900/60 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                <ToolbarBtn icon={Bold} label="غامق" onClick={() => execCmd('bold')} isDark={isDark} />
                <ToolbarBtn icon={Italic} label="مائل" onClick={() => execCmd('italic')} isDark={isDark} />
                <ToolbarBtn icon={Underline} label="خط سفلي" onClick={() => execCmd('underline')} isDark={isDark} />
                <ToolbarBtn icon={Strikethrough} label="خط وسطي" onClick={() => execCmd('strikeThrough')} isDark={isDark} />
                <div className={`w-px h-6 mx-1 ${isDark ? 'bg-slate-600' : 'bg-slate-300'}`} />
                <ToolbarBtn icon={Heading2} label="عنوان فرعي" onClick={() => execCmd('formatBlock', 'h2')} isDark={isDark} />
                <ToolbarBtn icon={Type} label="فقرة عادية" onClick={() => execCmd('formatBlock', 'p')} isDark={isDark} />
                <div className={`w-px h-6 mx-1 ${isDark ? 'bg-slate-600' : 'bg-slate-300'}`} />
                <ToolbarBtn icon={List} label="قائمة نقطية" onClick={() => execCmd('insertUnorderedList')} isDark={isDark} />
                <ToolbarBtn icon={ListOrdered} label="قائمة مرقمة" onClick={() => execCmd('insertOrderedList')} isDark={isDark} />
                <div className={`w-px h-6 mx-1 ${isDark ? 'bg-slate-600' : 'bg-slate-300'}`} />
                <ToolbarBtn icon={LinkIcon} label="إدراج رابط" onClick={insertLink} isDark={isDark} />
                <ToolbarBtn icon={Undo} label="تراجع" onClick={() => execCmd('undo')} isDark={isDark} />
              </div>

              {/* Editable Area */}
              <div
                ref={editorRef}
                contentEditable
                dir="rtl"
                data-placeholder="ابدأ بكتابة تقريرك أو تحليلك هنا..."
                className={`min-h-[280px] p-6 outline-none text-base leading-loose focus:ring-0 ${isDark ? 'bg-slate-700/30 text-slate-100' : 'bg-white text-slate-800'}`}
                style={{ fontFamily: "'Tajawal', sans-serif" }}
              />
              <style dangerouslySetInnerHTML={{__html: `
                [contenteditable][data-placeholder]:empty:before {
                  content: attr(data-placeholder);
                  color: ${isDark ? '#64748b' : '#94a3b8'};
                  pointer-events: none;
                }
                [contenteditable] h2 { font-size: 1.5rem; font-weight: 900; margin: 1rem 0 0.5rem; }
                [contenteditable] ul, [contenteditable] ol { padding-right: 1.5rem; margin: 0.5rem 0; }
                [contenteditable] li { margin-bottom: 0.25rem; }
                [contenteditable] a { color: #f97316; text-decoration: underline; }
              `}} />
            </div>
          </div>

          {/* Publish Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-lg rounded-2xl shadow-xl shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> جاري النشر والرفع...</>
            ) : (
              <><Send className="w-5 h-5" /> نشر المقال رسمياً</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminArticlesPage;
