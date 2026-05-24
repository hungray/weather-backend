import { Globe, Mail, Lock, X, Loader2 } from 'lucide-react';

export default function AuthModal({ open, isDark, isSignUpMode, email, password, onEmailChange, onPasswordChange, onSubmit, onClose, onToggleMode, onSocialAuth, authLoading }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999999] bg-slate-900/70 backdrop-blur-sm flex justify-center items-center p-4 animate-in fade-in" onClick={onClose}>
      <div className={`w-full max-w-sm rounded-[32px] p-6 shadow-2xl animate-in zoom-in-95 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-white'}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className={`font-black text-xl ${isDark ? 'text-white' : 'text-slate-800'}`}>{isSignUpMode ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}</h3>
          <button onClick={onClose} className={`p-2 rounded-full active:scale-90 transition ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className={`text-xs font-bold mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>البريد الإلكتروني</label>
            <div className={`flex items-center px-4 py-3 rounded-xl border focus-within:ring-2 ring-orange-500 transition-all ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
              <Mail className="w-5 h-5 text-slate-400 ml-2" />
              <input type="email" required value={email} onChange={(e) => onEmailChange(e.target.value)} maxLength={50} placeholder="name@example.com" className={`w-full bg-transparent border-none outline-none font-medium ${isDark ? 'text-white' : 'text-slate-800'}`} dir="ltr" />
            </div>
          </div>
          <div>
            <label className={`text-xs font-bold mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>كلمة المرور</label>
            <div className={`flex items-center px-4 py-3 rounded-xl border focus-within:ring-2 ring-orange-500 transition-all ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
              <Lock className="w-5 h-5 text-slate-400 ml-2" />
              <input type="password" required value={password} onChange={(e) => onPasswordChange(e.target.value)} minLength={6} maxLength={30} placeholder="••••••••" className={`w-full bg-transparent border-none outline-none font-medium tracking-widest ${isDark ? 'text-white' : 'text-slate-800'}`} dir="ltr" />
            </div>
          </div>
          <button type="submit" disabled={authLoading} className="w-full py-3.5 flex justify-center items-center bg-orange-500 hover:bg-orange-600 text-white font-black rounded-xl active:scale-95 transition-transform shadow-md mt-2 disabled:opacity-70">
            {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isSignUpMode ? 'إنشاء الحساب' : 'دخول للحساب')}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button type="button" onClick={onToggleMode} className={`text-xs font-bold ${isDark ? 'text-orange-400' : 'text-orange-600'} hover:underline`}>
            {isSignUpMode ? 'لديك حساب بالفعل؟ سجل دخولك' : 'ليس لديك حساب؟ أنشئ حساباً'}
          </button>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <div className={`h-px flex-1 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
          <span className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>أو باستخدام</span>
          <div className={`h-px flex-1 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
        </div>

        <div className="flex gap-3 mt-4">
          <button type="button" onClick={() => onSocialAuth('Google')} className="flex-1 flex items-center justify-center gap-2 py-3 bg-white text-slate-800 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 active:scale-95 transition-transform shadow-sm"><Globe className="w-5 h-5 text-red-500" /> Google</button>
          <button type="button" onClick={() => onSocialAuth('Facebook')} className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 active:scale-95 transition-transform shadow-sm">Facebook</button>
        </div>
      </div>
    </div>
  );
}
