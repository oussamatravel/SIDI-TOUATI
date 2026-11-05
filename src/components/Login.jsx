import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LogIn, 
  UserCircle, 
  BookOpen, 
  Sparkles, 
  ShieldCheck, 
  Award, 
  CalendarCheck, 
  CreditCard, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  School,
  CheckCircle2,
  ChevronLeft
} from 'lucide-react';

function Login({ onParentLogin }) {
  const [loginMode, setLoginMode] = useState('teacher'); // 'teacher' or 'parent'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [parentCode, setParentCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleTeacherSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await login(email, password);
    } catch (err) {
      setError('خطأ في تسجيل الدخول. يرجى التأكد من صحة البريد الإلكتروني وكلمة المرور.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleParentSubmit = (e) => {
    e.preventDefault();
    if (!parentCode.trim()) {
      setError('يرجى إدخال كود الطالب الخاص بولي الأمر');
      return;
    }
    setError('');
    onParentLogin(parentCode.trim());
  };

  const fillAdminCredentials = () => {
    setEmail('admin@quran.com');
    setPassword('123456');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-gray-100 flex flex-col justify-between rtl relative overflow-hidden select-none">
      {/* Ambient background glow effects */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Top Navbar Header */}
      <header className="relative z-10 border-b border-white/10 bg-slate-950/60 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <BookOpen size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <h1 className="font-black text-lg md:text-xl text-white tracking-tight flex items-center gap-2">
                مدرسة سيدي تواتي
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  القرآن الكريم
                </span>
              </h1>
              <p className="text-xs text-slate-400">المنصة التعليمية الشاملة لإدارة وتحفيظ القرآن</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
              <School size={14} className="text-emerald-400" />
              <span>فروع المدرسة: Edimco • Ighil Elbordj • Ritaj</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 lg:p-12">
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Right/Hero Side on RTL (Information & Highlights) */}
          <div className="lg:col-span-7 space-y-6 text-right">
            {/* Hadith Banner */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-l from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 text-emerald-300 text-xs md:text-sm font-bold shadow-inner">
              <Sparkles size={16} className="text-emerald-400" />
              <span>قال رسول الله ﷺ: « خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ »</span>
            </div>

            <div className="space-y-3">
              <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">
                رحلة مباركة نحو <span className="text-transparent bg-clip-text bg-gradient-to-l from-emerald-400 via-teal-300 to-amber-200">إتقان كتاب الله</span>
              </h2>
              <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-xl">
                نظام ذكي متكامل يربط المعلم، الإدارة، وأولياء الأمور في بيئة تربوية هادفة تتابع الحفظ والمراجعة والسلوك والتحصيل المالي بكل دقة ويسر.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/40 transition-all flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">متابعة الحفظ والمراجعة</h4>
                  <p className="text-xs text-slate-400 mt-0.5">تتبع السور والأحزاب والآيات مع خطط التثبيت.</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/40 transition-all flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400">
                  <CalendarCheck size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">سجل الحضور والغياب</h4>
                  <p className="text-xs text-slate-400 mt-0.5">تسجيل يومي وتاريخي دقيق مع فلترة حسب الأستاذ.</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/40 transition-all flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                  <Award size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">الامتحانات وبطاقات التميز</h4>
                  <p className="text-xs text-slate-400 mt-0.5">سبر وإجازات وشارات تشجيعية تطبع للأولياء.</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/40 transition-all flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">الاشتراكات والوصولات</h4>
                  <p className="text-xs text-slate-400 mt-0.5">متابعة التحصيل السنوي واليومي وإيصالات الدفع.</p>
                </div>
              </div>
            </div>

            {/* Branches Pills */}
            <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400">الفروع المعتمدة:</span>
              <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-slate-300">مدرسة إديمكو (Edimco)</span>
              <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-slate-300">مدرسة إغيل البرج</span>
              <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-slate-300">مدرسة ريتاج (Ritaj)</span>
            </div>
          </div>

          {/* Left/Form Side on RTL (The Interactive Login Card) */}
          <div className="lg:col-span-5">
            <div className="bg-slate-900/90 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/15 relative">
              
              {/* Tab Mode Switcher */}
              <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-white/10 mb-6">
                <button
                  type="button"
                  onClick={() => { setLoginMode('teacher'); setError(''); }}
                  className={`flex-1 py-3 text-xs md:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                    loginMode === 'teacher'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LogIn size={16} />
                  <span>المعلم والإدارة</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setLoginMode('parent'); setError(''); }}
                  className={`flex-1 py-3 text-xs md:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                    loginMode === 'parent'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UserCircle size={16} />
                  <span>بوابة الوالدين</span>
                </button>
              </div>

              {/* Mode Header Title */}
              <div className="text-center mb-6">
                <h3 className="text-xl md:text-2xl font-black text-white">
                  {loginMode === 'teacher' ? 'تسجيل دخول الأساتذة والإدارة' : 'متابعة مسيرة الطالب القرآنية'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {loginMode === 'teacher' 
                    ? 'أدخل بيانات حسابك المعتمد للوصول إلى لوحة التحكم' 
                    : 'أدخل كود الطالب المكون من 6 رموز الممنوح من إدارة المدرسة'}
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-rose-500/15 border border-rose-500/40 text-rose-300 p-3.5 rounded-2xl text-xs text-center font-medium mb-5 animate-in fade-in duration-200">
                  {error}
                </div>
              )}

              {/* Forms */}
              {loginMode === 'teacher' ? (
                <form onSubmit={handleTeacherSubmit} className="space-y-4">
                  {/* Email Field */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      البريد الإلكتروني
                    </label>
                    <div className="relative">
                      <Mail className="absolute right-3.5 top-3.5 text-slate-400 w-4 h-4" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="teacher@example.com"
                        className="w-full pr-10 pl-4 py-3 bg-slate-950/70 border border-white/10 rounded-2xl text-white text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all font-sans"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      كلمة المرور
                    </label>
                    <div className="relative">
                      <Lock className="absolute right-3.5 top-3.5 text-slate-400 w-4 h-4" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pr-10 pl-11 py-3 bg-slate-950/70 border border-white/10 rounded-2xl text-white text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all font-sans"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3.5 top-3.5 text-slate-400 hover:text-white transition"
                        title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black rounded-2xl shadow-lg shadow-emerald-500/25 transition-all text-sm active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                  >
                    {loading ? (
                      <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <LogIn size={16} />
                        <span>تسجيل الدخول للوحة التحكم</span>
                      </>
                    )}
                  </button>

                  {/* Quick Fill Demo Helper */}
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={fillAdminCredentials}
                      className="text-[11px] text-emerald-400/80 hover:text-emerald-300 transition underline underline-offset-4"
                    >
                      تسجيل دخول تجريبي كمدير (admin@quran.com)
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleParentSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2 text-center">
                      كود الطالب الخاص بولي الأمر (6 رموز)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        maxLength={10}
                        value={parentCode}
                        onChange={(e) => setParentCode(e.target.value.toUpperCase())}
                        placeholder="CODE12"
                        className="w-full py-4 px-4 bg-slate-950/80 border-2 border-emerald-500/40 rounded-2xl text-white text-center text-2xl font-mono font-black tracking-widest uppercase outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/20 transition-all placeholder:text-slate-600"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 text-center mt-2">
                      💡 الكود موجود في بطاقة الطالب أو يمكنك طلبه من الأستاذ المشرف.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black rounded-2xl shadow-lg shadow-emerald-500/25 transition-all text-sm active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <span>الدخول ومتابعة درجات الحفظ والحضور</span>
                    <ChevronLeft size={18} />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-slate-950/80 px-6 py-4 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} مدرسة سيدي تواتي لتعليم القرآن الكريم — منصة التعليم والمتابعة الرقمية</p>
      </footer>
    </div>
  );
}

export default Login;
