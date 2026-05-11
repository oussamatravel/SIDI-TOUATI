import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserCircle } from 'lucide-react';

function Login({ onParentLogin }) {
  const [loginMode, setLoginMode] = useState('teacher'); // 'teacher' or 'parent'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [parentCode, setParentCode] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleTeacherSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      await login(email, password);
    } catch (err) {
      setError('خطأ في تسجيل الدخول. يرجى التأكد من البيانات.');
      console.error(err);
    }
  };

  const handleParentSubmit = (e) => {
    e.preventDefault();
    if (!parentCode.trim()) {
      setError('يرجى إدخال كود الطالب');
      return;
    }
    setError('');
    onParentLogin(parentCode.trim());
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 rtl">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl">
        
        {/* Toggle Mode */}
        <div className="flex bg-gray-100 p-1 rounded-xl mb-8">
          <button
            onClick={() => { setLoginMode('teacher'); setError(''); }}
            className={`flex-1 py-3 text-sm font-bold rounded-lg transition-colors ${
              loginMode === 'teacher' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            المعلم / الإدارة
          </button>
          <button
            onClick={() => { setLoginMode('parent'); setError(''); }}
            className={`flex-1 py-3 text-sm font-bold rounded-lg transition-colors ${
              loginMode === 'parent' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            بوابة الوالدين
          </button>
        </div>

        <div className="text-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
            loginMode === 'teacher' ? 'bg-green-100 text-primary' : 'bg-green-100 text-green-600'
          }`}>
            {loginMode === 'teacher' ? <LogIn size={40} /> : <UserCircle size={40} />}
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            {loginMode === 'teacher' ? 'تسجيل الدخول' : 'متابعة الطالب'}
          </h2>
          <p className="mt-2 text-gray-500">نظام إدارة حلقات تحفيظ القرآن</p>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        {loginMode === 'teacher' ? (
          <form className="mt-8 space-y-6" onSubmit={handleTeacherSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  required
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  placeholder="teacher@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
                <input
                  type="password"
                  required
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full btn-primary py-4 text-lg"
            >
              دخول كمعلم
            </button>
            
            <div className="text-center text-sm text-gray-400">
              <p>للمسؤول: الحساب الافتراضي هو admin@quran.com</p>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleParentSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-center">أدخل كود الطالب (6 رموز)</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full px-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-center text-2xl tracking-widest font-mono uppercase"
                  placeholder="CODE12"
                  value={parentCode}
                  onChange={(e) => setParentCode(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 text-lg rounded-xl transition-colors"
            >
              دخول ومتابعة
            </button>
            
            <div className="text-center text-sm text-gray-400">
              <p>يمكنك الحصول على كود الطالب من خلال المعلم</p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default Login;
