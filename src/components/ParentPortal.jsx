import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { UserCircle, LogOut } from 'lucide-react';

function ParentPortal({ studentCode, onLogout }) {
  const [student, setStudent] = useState(null);
  const [parentData, setParentData] = useState({ attendance: [], memorization: [], reviews: [] });
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

        const [attSnap, memSnap, revSnap] = await Promise.all([
          getDocs(qAtt),
          getDocs(qMem),
          getDocs(qRev)
        ]);

        const att = attSnap.docs.map(d => d.data()).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        const mem = memSnap.docs.map(d => d.data()).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        const rev = revSnap.docs.map(d => d.data()).sort((a, b) => new Date(b.assignedDate || 0) - new Date(a.assignedDate || 0));

        setParentData({
          attendance: att,
          memorization: mem,
          reviews: rev
        });

      } catch (err) {
        console.error("Error fetching parent portal data", err);
        setError('حدث خطأ أثناء جلب البيانات');
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
                       r.status === 'good' ? 'ممتاز' : 
                       r.status === 'review' ? 'مراجعة' : 'ضعيف'}
                   </div>
                </div>
              ))}
              {(!parentData.reviews || parentData.reviews.length === 0) && (
                <p className="text-center text-gray-400 py-8">لا يوجد مراجعات مسجلة</p>
              )}
           </div>
        </div>

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
                      {m.status === 'good' ? 'ممتاز' : m.status === 'review' ? 'مراجعة' : 'ضعيف'}
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
