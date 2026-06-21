import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { UserCircle, LogOut, Calendar, Medal, Star, Target, ShieldCheck, Trophy, Award } from 'lucide-react';
import { calculateProgress } from '../utils/progressCalculator';
import VisualQuran from './VisualQuran';

function ParentPortal({ studentCode, onLogout }) {
  const [student, setStudent] = useState(null);
  const [parentData, setParentData] = useState({ attendance: [], memorization: [], reviews: [], exams: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true);
        // Find the student by code
        const qSt = query(collection(db, 'students'), where('code', '==', studentCode.toUpperCase()));
        const stSnap = await getDocs(qSt);
        
        if (stSnap.empty) {
          setError('لم يتم العثور على طالب بهذا الكود');
          setLoading(false);
          return;
        }

        const studentData = { id: stSnap.docs[0].id, ...stSnap.docs[0].data() };
        setStudent(studentData);

        // Fetch data
        const qAtt = query(collection(db, 'attendance'), where('studentId', '==', studentData.id));
        const qMem = query(collection(db, 'memorization'), where('studentId', '==', studentData.id));
        const qRev = query(collection(db, 'reviews'), where('studentId', '==', studentData.id));
        const qExams = query(collection(db, 'exams'), where('studentId', '==', studentData.id));

        const [attSnap, memSnap, revSnap, examsSnap] = await Promise.all([
          getDocs(qAtt),
          getDocs(qMem),
          getDocs(qRev),
          getDocs(qExams)
        ]);

        const att = attSnap.docs.map(d => d.data()).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        const mem = memSnap.docs.map(d => d.data()).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        const rev = revSnap.docs.map(d => d.data()).sort((a, b) => new Date(b.assignedDate || 0) - new Date(a.assignedDate || 0));
        const exams = examsSnap.docs.map(d => d.data()).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        setParentData({
          attendance: att,
          memorization: mem,
          reviews: rev,
          exams: exams
        });

      } catch (err) {
        console.error("Error fetching parent portal data", err);
        setError('حدث خطأ: ' + (err.message || 'غير معروف'));
      } finally {
        setLoading(false);
      }
    };

    if (studentCode) {
      fetchStudentData();
    }
  }, [studentCode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 rtl">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 rtl">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="bg-red-50 text-red-600 p-4 rounded-xl">{error}</div>
          <button onClick={onLogout} className="btn-primary w-full py-3">العودة للبحث</button>
        </div>
      </div>
    );
  }

  const getBadges = () => {
    const badges = [];
    const progress = calculateProgress(parentData.memorization);
    
    // Quran Badges
    if (progress.totalHizbs >= 60) {
      badges.push({ id: 'quran-60', title: 'خاتم القرآن', icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-50', desc: 'أتم حفظ 60 حزباً' });
    } else if (progress.totalHizbs >= 30) {
      badges.push({ id: 'quran-30', title: 'نصف القرآن', icon: Medal, color: 'text-blue-500', bg: 'bg-blue-50', desc: 'أتم حفظ 30 حزباً' });
    } else if (progress.totalHizbs >= 15) {
      badges.push({ id: 'quran-15', title: 'ربع القرآن', icon: Medal, color: 'text-purple-500', bg: 'bg-purple-50', desc: 'أتم حفظ 15 حزباً' });
    } else if (progress.totalHizbs >= 2) {
      badges.push({ id: 'quran-2', title: 'حافظ جزء', icon: Medal, color: 'text-green-500', bg: 'bg-green-50', desc: 'أتم حفظ جزئين أو أكثر' });
    }

    // Punctual Badge
    let consecutiveCount = 0;
    for (let a of parentData.attendance) {
      if (a.status === 'present' || a.status === 'late') {
        consecutiveCount++;
      } else if (a.status === 'absent') {
        break; // Streak broken
      }
    }
    if (consecutiveCount >= 10) {
      badges.push({ id: 'punctual-10', title: 'المواظب', icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-50', desc: 'حضور 10 حصص متتالية' });
    }

    // Excellent Exam Badge
    if (parentData.exams.some(e => Number(e.score) >= 90)) {
      badges.push({ id: 'exam-excellent', title: 'الممتاز', icon: Star, color: 'text-orange-500', bg: 'bg-orange-50', desc: 'علامة 90+ في السبر' });
    }

    // Golden Reviewer Badge
    const evaluatedRev = parentData.reviews.filter(r => r.status === 'evaluated' || r.status === 'good'); // Considering 'good' as evaluated successfully
    if (evaluatedRev.length >= 5) {
      badges.push({ id: 'reviewer-5', title: 'المراجع الذهبي', icon: Target, color: 'text-indigo-500', bg: 'bg-indigo-50', desc: 'أتم 5 مراجعات بنجاح' });
    }

    return badges;
  };

  const badges = getBadges();

  return (
    <div className="min-h-screen bg-gray-50 rtl p-4 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border mb-8">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-green-100 text-primary rounded-full flex items-center justify-center">
                <UserCircle size={28} />
             </div>
             <div>
                <h2 className="font-bold text-lg">{student?.name}</h2>
                <p className="text-sm text-gray-500">حساب ولي الأمر: {student?.parentName}</p>
             </div>
          </div>
          <button 
             onClick={onLogout}
             className="flex items-center gap-2 text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors text-sm"
          >
             <LogOut size={18} />
             خروج
          </button>
        </header>

        {/* Badges Section */}
        {badges.length > 0 && (
          <div className="bg-gradient-to-l from-yellow-50/50 to-white rounded-2xl shadow-sm border border-yellow-100 p-6 mb-6">
            <h4 className="font-bold border-b border-yellow-100 pb-4 mb-4 flex items-center gap-2 text-gray-800">
              <Award size={20} className="text-yellow-500" />
              الشارات والإنجازات
            </h4>
            <div className="flex flex-wrap gap-4">
              {badges.map(b => (
                <div key={b.id} className={`flex items-center gap-3 p-3 rounded-2xl border bg-white shadow-sm hover:shadow-md transition-shadow`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${b.bg} ${b.color}`}>
                    <b.icon size={24} />
                  </div>
                  <div>
                    <p className={`font-bold text-sm ${b.color}`}>{b.title}</p>
                    <p className="text-xs text-gray-500">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
           <div className="bg-white p-6 rounded-2xl shadow-sm border text-center">
              <p className="text-gray-500 text-sm mb-1">نسبة الحضور</p>
              <p className="text-3xl font-bold text-green-600">
                {parentData.attendance.length > 0 
                  ? Math.round((parentData.attendance.filter(a => a.status === 'present' || a.status === 'late').length / parentData.attendance.length) * 100)
                  : 0}%
              </p>
           </div>
           <div className="bg-white p-6 rounded-2xl shadow-sm border text-center">
              <p className="text-gray-500 text-sm mb-1">عدد سجلات الحفظ</p>
              <p className="text-3xl font-bold text-blue-600">{parentData.memorization.length}</p>
           </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-6">
           <h4 className="font-bold border-b pb-4 mb-4 text-lg">المراجعات المطلوبة والمكتملة</h4>
           <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
              {parentData.reviews && parentData.reviews.map((r, i) => (
                <div key={i} className="flex justify-between items-center border-b pb-3 last:border-0 hover:bg-gray-50 p-2 rounded-lg transition-colors">
                   <div>
                      <p className="font-medium text-primary">
                         {r.memoType === 'hizb' || r.hizb ? `الحزب ${r.hizb}` : `سورة ${r.surah} (من ${r.fromAyah} إلى ${r.toAyah})`}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                         تاريخ التعيين: {r.assignedDate ? new Date(r.assignedDate).toLocaleDateString('ar-EG') : '--'}
                      </p>
                   </div>
                   <div className={`text-sm px-3 py-1 rounded-full font-medium ${
                      r.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                      r.status === 'good' ? 'bg-green-100 text-green-700' :
                      r.status === 'review' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                   }`}>
                      {r.status === 'pending' ? 'قيد الانتظار' : 
                       r.status === 'good' ? 'جيد' : 
                       r.status === 'review' ? 'يحتاج الى ترسيخ' : 'حفظ غير متقن'}
                   </div>
                </div>
              ))}
              {(!parentData.reviews || parentData.reviews.length === 0) && (
                <p className="text-center text-gray-400 py-8">لا يوجد مراجعات مسجلة</p>
              )}
           </div>
        </div>

        <VisualQuran progressSurahs={calculateProgress(parentData.memorization).surahs} />

        <div className="bg-white rounded-2xl shadow-sm border p-6">
           <h4 className="font-bold border-b pb-4 mb-4 text-lg">سجل الحفظ</h4>
           <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
              {parentData.memorization.map((m, i) => (
                <div key={i} className="flex justify-between items-center border-b pb-3 last:border-0 hover:bg-gray-50 p-2 rounded-lg transition-colors">
                   <div>
                      <p className="font-medium text-gray-800">
                         {m.memoType === 'hizb' || m.hizb ? `الحزب ${m.hizb}` : `سورة ${m.surah}`}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 flex gap-2">
                         <span>{m.memoType === 'hizb' || m.hizb ? '' : `من الآية ${m.fromAyah} إلى ${m.toAyah}`}</span>
                         <span className="text-gray-400">|</span>
                         <span>{m.date ? new Date(m.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : m.date}</span>
                      </p>
                   </div>
                   <div className={`text-sm px-3 py-1 rounded-full font-medium ${
                      m.status === 'good' ? 'bg-green-100 text-green-700' :
                      m.status === 'review' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                   }`}>
                      {m.status === 'good' ? 'جيد' : m.status === 'review' ? 'يحتاج الى ترسيخ' : 'حفظ غير متقن'}
                   </div>
                </div>
              ))}
              {parentData.memorization.length === 0 && (
                <p className="text-center text-gray-400 py-8">لا يوجد سجلات حفظ</p>
              )}
           </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-6">
           <h4 className="font-bold border-b pb-4 mb-4 text-lg">سجل الحضور</h4>
           <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
              {parentData.attendance.map((a, i) => (
                <div key={i} className="flex justify-between items-center border-b pb-2 last:border-0 hover:bg-gray-50 p-2 rounded-lg transition-colors">
                   <div className="flex items-center gap-3">
                      <Calendar size={18} className="text-gray-400" />
                      <span className="text-gray-700 text-sm">
                         {new Date(a.date).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                   </div>
                   <span className={`font-bold pb-1 ${
                      a.status === 'present' ? 'text-green-600' :
                      a.status === 'late' ? 'text-orange-500' :
                      a.status === 'absent' ? 'text-red-600' : 'text-gray-500'
                   }`}>
                      {a.status === 'present' && 'حاضر'}
                      {a.status === 'late' && 'متأخر'}
                      {a.status === 'absent' && 'غائب'}
                      {a.status === 'stopped' && 'متوقف'}
                   </span>
                </div>
              ))}
              {parentData.attendance.length === 0 && (
                <p className="text-center text-gray-400 py-8">لا يوجد سجلات حضور</p>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}

export default ParentPortal;
