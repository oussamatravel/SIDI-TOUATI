import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import { useAuth } from './context/AuthContext';
import { SURAH_LIST } from './constants/surahs';
import { 
  Users, 
  Calendar, 
  BookOpen, 
  Plus, 
  Search,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  TrendingUp,
  History,
  Shield,
  LogOut,
  BarChart2,
  ChevronLeft
} from 'lucide-react';
import { QURAN_DATA, TOTAL_AYAH_COUNT, TOTAL_HIZB_COUNT } from './constants/quranData';
import { db, auth as primaryAuth, firebaseConfig } from './firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  query, 
  where,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

function App() {
  const { user, role, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [memorization, setMemorization] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [newStudent, setNewStudent] = useState({
    name: '',
    age: '',
    parentName: '',
    parentEmail: '',
    phone: '',
    notes: '',
    code: Math.random().toString(36).substring(2, 8).toUpperCase()
  });

  const [newTeacher, setNewTeacher] = useState({
    name: '',
    email: '',
    password: ''
  });

  const [newMemo, setNewMemo] = useState({
    studentId: '',
    surah: '',
    fromAyah: '',
    toAyah: '',
    status: 'good' // good, review, weak
  });

  const [selectedParentStudent, setSelectedParentStudent] = useState(null);
  const [parentCodeInput, setParentCodeInput] = useState('');
  const [parentData, setParentData] = useState({ attendance: [], memorization: [] });
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState(null);

  // Fetch Data
  useEffect(() => {
    if (!user) return;

    let q = query(collection(db, "students"), orderBy("name"));
    // If not admin, only show teacher's students
    if (role !== 'admin') {
      q = query(collection(db, "students"), where("teacherId", "==", user.uid), orderBy("name"));
    }

    const unsubscribeSt = onSnapshot(q, (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const today = format(new Date(), 'yyyy-MM-dd');
    let qAtt = query(collection(db, "attendance"), where("date", "==", today));
    if (role !== 'admin') {
      qAtt = query(collection(db, "attendance"), where("date", "==", today), where("teacherId", "==", user.uid));
    }

    const unsubscribeAtt = onSnapshot(qAtt, (snapshot) => {
      setAttendance(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch memorization records
    let qMem = query(collection(db, "memorization"), orderBy("date", "desc"));
    if (role !== 'admin') {
      qMem = query(collection(db, "memorization"), where("teacherId", "==", user.uid), orderBy("date", "desc"));
    }
    const unsubscribeMem = onSnapshot(qMem, (snapshot) => {
      setMemorization(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch all teachers if admin
    let unsubscribeTeach = () => {};
    if (role === 'admin') {
      const qT = query(collection(db, "teachers"), orderBy("name"));
      unsubscribeTeach = onSnapshot(qT, (snapshot) => {
        setTeachers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }

    setLoading(false);
    return () => {
      unsubscribeSt();
      unsubscribeAtt();
      unsubscribeMem();
      unsubscribeTeach();
    };
  }, [user, role]);

  if (!user) {
    return <Login />;
  }

  // Handlers
  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      const studentData = {
        ...newStudent,
        // If admin, use the selected teacherId from form, else use own uid
        teacherId: (role === 'admin' && newStudent.teacherId) ? newStudent.teacherId : user.uid,
        updatedAt: new Date().toISOString()
      };

      if (editingStudent) {
        await updateDoc(doc(db, "students", editingStudent.id), studentData);
        alert("تم تحديث بيانات الطالب بنجاح");
      } else {
        await addDoc(collection(db, "students"), {
          ...studentData,
          createdAt: new Date().toISOString()
        });
        alert("تم إضافة الطالب بنجاح");
      }
      setIsModalOpen(false);
      setEditingStudent(null);
      setNewStudent({ 
        name: '', 
        age: '', 
        parentName: '', 
        parentEmail: '',
        phone: '', 
        notes: '', 
        teacherId: '',
        code: Math.random().toString(36).substring(2, 8).toUpperCase() 
      });
    } catch (error) {
      console.error("Error adding student:", error);
      alert("خطأ في إضافة الطالب: " + error.message);
    }
  };

  const handleAttendance = async (studentId, status) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const existing = attendance.find(a => a.studentId === studentId);
    
    try {
      if (existing) {
        await updateDoc(doc(db, "attendance", existing.id), { status });
      } else {
        await addDoc(collection(db, "attendance"), {
          studentId,
          status,
          date: today,
          teacherId: user.uid,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Attendance Error:", error);
    }
  };

  const handleMemoSubmit = async (e) => {
    e.preventDefault();
    if (!newMemo.studentId || !newMemo.surah) return;
    
    try {
      await addDoc(collection(db, "memorization"), {
        ...newMemo,
        teacherId: user.uid,
        date: new Date().toISOString()
      });
      setNewMemo({ studentId: '', surah: '', fromAyah: '', toAyah: '', status: 'good' });
      alert("تم حفظ سجل التسميع بنجاح");
    } catch (error) {
      console.error("Memo Error:", error);
    }
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    if (!newTeacher.email || !newTeacher.password) return;

    try {
      // Secondary App Trick: Create user without logging out the admin
      const secondaryApp = initializeApp(firebaseConfig, "Secondary");
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth, 
        newTeacher.email, 
        newTeacher.password
      );
      
      const teacherUid = userCredential.user.uid;

      // Add to Firestore
      await setDoc(doc(db, "teachers", teacherUid), {
        name: newTeacher.name,
        email: newTeacher.email,
        role: 'teacher',
        createdAt: new Date().toISOString()
      });

      // Cleanup secondary app
      await deleteApp(secondaryApp);
      
      setNewTeacher({ name: '', email: '', password: '' });
      alert("تم إضافة المعلم بنجاح");
    } catch (error) {
      console.error("Teacher Creation Error:", error);
      alert("خطأ في إضافة المعلم: " + error.message);
    }
  };

  const handleDeleteTeacher = async (id) => {
    if (window.confirm("هل أنت متأكد من حذف هذا المعلم؟")) {
      await deleteDoc(doc(db, "teachers", id));
    }
  };

  const handleParentLookup = async () => {
    if (!parentCodeInput) return;
    const q = query(collection(db, "students"), where("code", "==", parentCodeInput.toUpperCase()));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const student = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      setSelectedParentStudent(student);
      
      // Fetch history
      const qAtt = query(collection(db, "attendance"), where("studentId", "==", student.id), orderBy("date", "desc"));
      const qMem = query(collection(db, "memorization"), where("studentId", "==", student.id), orderBy("date", "desc"));
      
      const [attSnap, memSnap] = await Promise.all([getDocs(qAtt), getDocs(qMem)]);
      setParentData({
        attendance: attSnap.docs.map(d => d.data()),
        memorization: memSnap.docs.map(d => d.data())
      });
    } else {
      alert("الكود غير صحيح");
    }
  };

  const handleDeleteStudent = async (id) => {
    if (window.confirm("هل أنت متأكد من حذف هذا الطالب؟")) {
      await deleteDoc(doc(db, "students", id));
    }
  };

  const calculateStudentProgress = (studentId) => {
    const studentMemos = memorization.filter(m => m.studentId === studentId);
    const progressBySurah = {};
    const uniqueAyahsMapped = new Set();

    studentMemos.forEach(memo => {
      const surahData = QURAN_DATA.find(s => s.name === memo.surah);
      if (!surahData) return;

      if (!progressBySurah[surahData.id]) {
        progressBySurah[surahData.id] = { 
          name: surahData.name, 
          total: surahData.ayahs, 
          memorized: new Set() 
        };
      }

      const from = parseInt(memo.fromAyah);
      const to = parseInt(memo.toAyah);
      
      for (let i = from; i <= to; i++) {
        if (i <= surahData.ayahs) {
          progressBySurah[surahData.id].memorized.add(i);
          uniqueAyahsMapped.add(`${surahData.id}-${i}`);
        }
      }
    });

    const surahs = Object.values(progressBySurah).map(s => ({
      name: s.name,
      percentage: Math.round((s.memorized.size / s.total) * 100),
      count: s.memorized.size,
      total: s.total
    })).sort((a, b) => b.percentage - a.percentage);

    const totalPercentage = Math.round((uniqueAyahsMapped.size / TOTAL_AYAH_COUNT) * 100);
    const totalHizbs = (uniqueAyahsMapped.size / (6236 / 60)).toFixed(1);

    return { 
      surahs, 
      totalPercentage, 
      totalHizbs, 
      totalAyahs: uniqueAyahsMapped.size,
      recordCount: studentMemos.length
    };
  };

  // Render Screens
  const renderStudentDetails = (student) => {
    const progress = calculateStudentProgress(student.id);

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <button 
          onClick={() => setSelectedStudentForDetails(null)}
          className="flex items-center gap-2 text-primary hover:underline mb-4"
        >
          <ChevronLeft size={20} />
          العودة لقائمة الطلاب
        </button>

        <div className="card bg-primary text-white p-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
                {student.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-3xl font-bold">{student.name}</h3>
                <p className="opacity-80">كود المتابعة: {student.code}</p>
              </div>
            </div>
            <div className="bg-white/10 px-6 py-4 rounded-2xl text-center">
              <p className="text-sm opacity-60">التقدم الإجمالي</p>
              <p className="text-4xl font-bold">{progress.totalPercentage}%</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card text-center py-8">
            <p className="text-gray-500 text-sm">عدد الأحزاب</p>
            <p className="text-3xl font-bold text-primary mt-2">{progress.totalHizbs} <span className="text-lg opacity-50">حزب</span></p>
          </div>
          <div className="card text-center py-8">
            <p className="text-gray-500 text-sm">الآيات المحفوظة</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{progress.totalAyahs} <span className="text-lg opacity-50">آية</span></p>
          </div>
          <div className="card text-center py-8">
            <p className="text-gray-500 text-sm">عدد سجلات الحفظ</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">{progress.recordCount}</p>
          </div>
        </div>

        <div className="card">
          <h4 className="font-bold border-b pb-4 mb-4 flex items-center gap-2">
            <BarChart2 size={20} className="text-primary" />
            تفاصيل الحفظ حسب السور
          </h4>
          <div className="space-y-4">
            {progress.surahs.length > 0 ? progress.surahs.map((s, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">سورة {s.name}</span>
                  <span className="text-gray-500">{s.percentage}% ({s.count}/{s.total} آية)</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-1000" 
                    style={{ width: `${s.percentage}%` }}
                  />
                </div>
              </div>
            )) : (
              <p className="text-center py-10 text-gray-400">لا يوجد بيانات حفظ مسجلة لهذا الطالب</p>
            )}
          </div>
        </div>
      </div>
    );
  };
  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card border-r-4 border-r-primary flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm">إجمالي الطلاب</p>
            <h3 className="text-3xl font-bold">{students.length}</h3>
          </div>
          <div className="p-3 bg-green-100 text-primary rounded-full">
            <Users size={24} />
          </div>
        </div>
        <div className="card border-r-4 border-r-blue-500 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm">حضور اليوم</p>
            <h3 className="text-3xl font-bold">{attendance.filter(a => a.status === 'present').length}</h3>
          </div>
          <div className="p-3 bg-blue-100 text-blue-500 rounded-full">
            <Calendar size={24} />
          </div>
        </div>
        <div className="card border-r-4 border-r-yellow-500 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm">الإحصائيات</p>
            <h3 className="text-3xl font-bold">--</h3>
          </div>
          <div className="p-3 bg-yellow-100 text-yellow-500 rounded-full">
            <TrendingUp size={24} />
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-bold mb-4">نشاط أخير (التسميع)</h3>
        <div className="space-y-4">
          {memorization.slice(0, 5).map((memo) => (
            <div key={memo.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <span className="font-bold text-sm block">
                  {students.find(s => s.id === memo.studentId)?.name || 'طالب محذوف'}
                </span>
                <span className="text-xs text-gray-500">سورة {memo.surah}</span>
              </div>
              <div className="text-right">
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                   memo.status === 'good' ? 'bg-green-100 text-green-700' :
                   memo.status === 'review' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                }`}>
                   {memo.status === 'good' ? 'ممتاز' : memo.status === 'review' ? 'مراجعة' : 'ضعيف'}
                </span>
                <span className="text-[10px] text-gray-400 block mt-1">
                  {memo.date ? format(new Date(memo.date), 'HH:mm', { locale: ar }) : '--'}
                </span>
              </div>
            </div>
          ))}
          {memorization.length === 0 && (
            <p className="text-gray-400 text-center py-8">لا يوجد نشاط مسجل اليوم</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderStudents = () => (
    selectedStudentForDetails ? renderStudentDetails(selectedStudentForDetails) : (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="بحث عن طالب..." 
              className="w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
          <button 
            onClick={() => {
              setEditingStudent(null);
              setIsModalOpen(true);
            }}
            className="btn-primary w-full sm:w-auto"
          >
            <Plus size={18} />
            إضافة طالب جديد
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {students.map(student => {
            const prog = calculateStudentProgress(student.id);
            return (
              <div key={student.id} className="card hover:border-primary transition-colors group">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-lg">{student.name}</h4>
                    <p className="text-sm text-gray-500">العمر: {student.age} سنة</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                      {student.code}
                    </div>
                    <div className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold">
                      {prog.totalPercentage}%
                    </div>
                  </div>
                </div>
                
                <div className="w-full bg-gray-100 h-1.5 rounded-full mb-4 overflow-hidden">
                  <div className="bg-primary h-full" style={{ width: `${prog.totalPercentage}%` }} />
                </div>

                <div className="space-y-1 text-sm text-gray-600 mb-4">
                  <p>ولي الأمر: {student.parentName}</p>
                  <p>الهاتف: {student.phone}</p>
                  <p className="text-xs text-primary font-medium">الأحزاب المحفوظة: {prog.totalHizbs}</p>
                </div>
                
                <div className="flex flex-col gap-2 pt-4 border-t">
                  <button 
                    onClick={() => setSelectedStudentForDetails(student)}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-primary/5 text-primary hover:bg-primary/10 rounded-lg transition-colors font-bold text-sm"
                  >
                    <BarChart2 size={16} />
                    عرض مستوى التقدم
                  </button>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setEditingStudent(student);
                        setNewStudent(student);
                        setIsModalOpen(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs"
                    >
                      <Edit2 size={14} />
                      تعديل
                    </button>
                    <button 
                      onClick={() => handleDeleteStudent(student.id)}
                      className="flex-1 flex items-center justify-center gap-1 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-xs"
                    >
                      <Trash2 size={14} />
                      حذف
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {students.length === 0 && (
            <div className="col-span-full py-20 text-center text-gray-400 border-2 border-dashed rounded-xl">
               <Users size={48} className="mx-auto mb-4 opacity-20" />
               <p>لا يوجد طلاب حالياً</p>
            </div>
          )}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-xl font-bold">{editingStudent ? 'تعديل بيانات طالب' : 'إضافة طالب جديد'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <XCircle size={24} />
                </button>
              </div>
              <form onSubmit={handleAddStudent} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">اسم الطالب</label>
                  <input 
                    required
                    value={newStudent.name}
                    onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">العمر</label>
                    <input 
                      type="number"
                      value={newStudent.age}
                      onChange={e => setNewStudent({...newStudent, age: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">كود الوالدين</label>
                    <input 
                      disabled
                      value={newStudent.code}
                      className="w-full px-4 py-2 border rounded-lg bg-gray-50 font-mono text-center" 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">اسم ولي الأمر</label>
                  <input 
                    value={newStudent.parentName}
                    onChange={e => setNewStudent({...newStudent, parentName: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">بريد ولي الأمر (إيميل)</label>
                  <input 
                    type="email"
                    value={newStudent.parentEmail || ''}
                    onChange={e => setNewStudent({...newStudent, parentEmail: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none text-left" 
                    placeholder="example@mail.com"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">رقم الهاتف</label>
                  <input 
                    value={newStudent.phone}
                    onChange={e => setNewStudent({...newStudent, phone: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" 
                  />
                </div>
                {role === 'admin' && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-blue-600">تعيين لمعلم (خاص بالمسؤول)</label>
                    <select 
                      required
                      value={newStudent.teacherId || ''}
                      onChange={e => setNewStudent({...newStudent, teacherId: e.target.value})}
                      className="w-full px-4 py-2 border-2 border-blue-100 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-blue-50"
                    >
                      <option value="">-- اختر المعلم المسجل --</option>
                      <option value={user.uid}>أنا (المسؤول)</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <button type="submit" className="btn-primary w-full py-3 mt-4">
                  {editingStudent ? 'حفظ التعديلات' : 'إضافة الطالب'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  );

  const renderAttendance = () => (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold">تحضير الطلاب - {format(new Date(), 'dd MMMM yyyy', { locale: ar })}</h3>
          <div className="flex gap-2">
             <button className="text-sm text-primary hover:underline">عرض السجل</button>
          </div>
       </div>

       <div className="card divide-y overflow-hidden">
          {students.map(student => (
            <div key={student.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
               <div>
                  <p className="font-bold">{student.name}</p>
                  <p className="text-xs text-gray-500">{student.parentName}</p>
               </div>
               <div className="flex gap-1 flex-wrap justify-end">
                  <button 
                    onClick={() => handleAttendance(student.id, 'present')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full border transition-colors ${
                      attendance.find(a => a.studentId === student.id)?.status === 'present'
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'border-green-200 text-green-600 hover:bg-green-50'
                    }`}
                  >
                     <CheckCircle size={14} />
                     <span className="text-xs font-medium">حاضر</span>
                  </button>
                  <button 
                    onClick={() => handleAttendance(student.id, 'late')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full border transition-colors ${
                      attendance.find(a => a.studentId === student.id)?.status === 'late'
                      ? 'bg-orange-500 border-orange-500 text-white'
                      : 'border-orange-200 text-orange-500 hover:bg-orange-50'
                    }`}
                  >
                     <Calendar size={14} />
                     <span className="text-xs font-medium">متأخر</span>
                  </button>
                  <button 
                    onClick={() => handleAttendance(student.id, 'absent')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full border transition-colors ${
                      attendance.find(a => a.studentId === student.id)?.status === 'absent'
                      ? 'bg-red-600 border-red-600 text-white'
                      : 'border-red-200 text-red-600 hover:bg-red-50'
                    }`}
                  >
                     <XCircle size={14} />
                     <span className="text-xs font-medium">غائب</span>
                  </button>
                  <button 
                    onClick={() => handleAttendance(student.id, 'stopped')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full border transition-colors ${
                      attendance.find(a => a.studentId === student.id)?.status === 'stopped'
                      ? 'bg-gray-600 border-gray-600 text-white'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                     <XCircle size={14} className="rotate-45" />
                     <span className="text-xs font-medium">متوقف</span>
                  </button>
               </div>
            </div>
          ))}
          {students.length === 0 && (
            <div className="text-center py-10 text-gray-400">لا يوجد طلاب للتحضير</div>
          )}
       </div>
    </div>
  );

  const renderMemorization = () => (
    <div className="space-y-6">
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
             <div className="card sticky top-6">
                <h3 className="text-lg font-bold mb-4">تسجيل تسميع جديد</h3>
                <form onSubmit={handleMemoSubmit} className="space-y-4">
                   <div className="space-y-1">
                      <label className="text-sm">اختر الطالب</label>
                      <select 
                        required
                        value={newMemo.studentId}
                        onChange={e => setNewMemo({...newMemo, studentId: e.target.value})}
                        className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary"
                      >
                         <option value="">-- اختر طالب --</option>
                         {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                   </div>
                   <div className="space-y-1">
                      <label className="text-sm">اسم السورة</label>
                      <select 
                        required
                        value={newMemo.surah}
                        onChange={e => setNewMemo({...newMemo, surah: e.target.value})}
                        className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary"
                      >
                         <option value="">-- اختر السورة --</option>
                         {SURAH_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                         <label className="text-sm">من آية</label>
                         <input 
                           type="number" 
                           value={newMemo.fromAyah}
                           onChange={e => setNewMemo({...newMemo, fromAyah: e.target.value})}
                           className="w-full px-4 py-2 border rounded-lg outline-none" 
                         />
                      </div>
                      <div className="space-y-1">
                         <label className="text-sm">إلى آية</label>
                         <input 
                           type="number" 
                           value={newMemo.toAyah}
                           onChange={e => setNewMemo({...newMemo, toAyah: e.target.value})}
                           className="w-full px-4 py-2 border rounded-lg outline-none" 
                         />
                      </div>
                   </div>
                   <div className="space-y-1">
                      <label className="text-sm">التقييم</label>
                      <div className="flex gap-2">
                         {['good', 'review', 'weak'].map((stat) => (
                           <label key={stat} className="flex-1 cursor-pointer">
                              <input 
                                type="radio" 
                                name="status" 
                                value={stat}
                                checked={newMemo.status === stat}
                                onChange={e => setNewMemo({...newMemo, status: e.target.value})}
                                className="hidden peer" 
                              />
                              <div className={`text-center py-2 rounded-lg border peer-checked:border-primary-dark transition-all text-sm
                                ${stat === 'good' ? 'bg-green-50 text-green-700 peer-checked:bg-green-200' : ''}
                                ${stat === 'review' ? 'bg-yellow-50 text-yellow-700 peer-checked:bg-yellow-200' : ''}
                                ${stat === 'weak' ? 'bg-red-50 text-red-700 peer-checked:bg-red-200' : ''}
                              `}>
                                {stat === 'good' ? 'ممتاز' : stat === 'review' ? 'مراجعة' : 'ضعيف'}
                              </div>
                           </label>
                         ))}
                      </div>
                   </div>
                   <button type="submit" className="btn-primary w-full py-3">حفظ السجل</button>
                </form>
             </div>
          </div>
          <div className="lg:col-span-2 space-y-4">
             <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">آخر المشاهدات</h3>
                <History size={20} className="text-gray-400" />
             </div>
          <div className="lg:col-span-2 space-y-4">
             <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">آخر المشاهدات</h3>
                <History size={20} className="text-gray-400" />
             </div>
             <div className="space-y-3">
                {memorization.map((memo) => (
                   <div key={memo.id} className="card p-4 hover:border-primary transition-colors">
                      <div className="flex justify-between items-start">
                         <div>
                            <p className="font-bold text-primary">
                               {students.find(s => s.id === memo.studentId)?.name || 'طالب محذوف'}
                            </p>
                            <p className="text-sm font-medium mt-1">
                               سورة {memo.surah} 
                               <span className="text-gray-400 mr-2 text-xs">
                                  (من {memo.fromAyah} إلى {memo.toAyah})
                               </span>
                            </p>
                         </div>
                         <div className="text-left text-[10px] text-gray-400">
                            {memo.date ? format(new Date(memo.date), 'dd/MM/yyyy HH:mm', { locale: ar }) : '--'}
                         </div>
                      </div>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t">
                         <div className={`text-xs px-2 py-1 rounded-full ${
                            memo.status === 'good' ? 'bg-green-100 text-green-700' :
                            memo.status === 'review' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                         }`}>
                            {memo.status === 'good' ? 'ممتاز' : memo.status === 'review' ? 'مراجعة' : 'ضعيف'}
                         </div>
                         <button 
                           onClick={async () => {
                             if(window.confirm("حذف هذا السجل؟")) {
                               await deleteDoc(doc(db, "memorization", memo.id));
                             }
                           }}
                           className="text-gray-300 hover:text-red-500 transition-colors"
                         >
                            <Trash2 size={14} />
                         </button>
                      </div>
                   </div>
                ))}
                {memorization.length === 0 && (
                   <div className="card p-0 overflow-hidden">
                      <div className="p-4 flex flex-col items-center justify-center text-gray-400 py-20">
                         <BookOpen size={48} className="opacity-10 mb-2" />
                         <p>لم يتم تسجيل أي تسميع بعد</p>
                      </div>
                   </div>
                )}
             </div>
          </div>
          </div>
       </div>
    </div>
  );

  const renderParents = () => (
    <div className="max-w-xl mx-auto space-y-8 py-10">
       {!selectedParentStudent ? (
         <div className="text-center space-y-8">
            <div>
               <div className="w-20 h-20 bg-green-100 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserCircle size={40} />
               </div>
               <h2 className="text-2xl font-bold">بوابة أولياء الأمور</h2>
               <p className="text-gray-500">أدخل كود الطالب لمتابعة التقدم</p>
            </div>

            <div className="card">
               <div className="space-y-4">
                  <input 
                    value={parentCodeInput}
                    onChange={e => setParentCodeInput(e.target.value)}
                    placeholder="كود الطالب (6 رموز)" 
                    className="w-full text-center text-2xl tracking-widest font-mono uppercase px-4 py-4 border-2 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                  />
                  <button 
                    onClick={handleParentLookup}
                    className="btn-primary w-full py-4 text-lg"
                  >
                     دخول ومتابعة
                  </button>
               </div>
            </div>

            <div className="text-sm text-gray-400">
               <p>يمكنك الحصول على كود الطالب من خلال المعلم</p>
            </div>
         </div>
       ) : (
         <div className="space-y-6">
            <button 
               onClick={() => setSelectedParentStudent(null)}
               className="text-primary flex items-center gap-2 hover:underline"
            >
               ← العودة للبحث
            </button>
            <div className="card bg-primary text-white">
               <h3 className="text-xl font-bold">{selectedParentStudent.name}</h3>
               <p className="opacity-80">ولي الأمر: {selectedParentStudent.parentName}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="card text-center">
                  <p className="text-gray-500 text-xs">نسبة الحضور</p>
                  <p className="text-2xl font-bold text-green-600">
                    {parentData.attendance.length > 0 
                      ? Math.round((parentData.attendance.filter(a => a.status === 'present' || a.status === 'late').length / parentData.attendance.length) * 100)
                      : 0}%
                  </p>
               </div>
               <div className="card text-center">
                  <p className="text-gray-500 text-xs">عدد السجلات</p>
                  <p className="text-2xl font-bold text-blue-600">{parentData.memorization.length}</p>
               </div>
            </div>

            <div className="card">
               <h4 className="font-bold border-b pb-2 mb-4">سجل الحفظ</h4>
               <div className="space-y-4 max-h-64 overflow-y-auto">
                  {parentData.memorization.map((m, i) => (
                    <div key={i} className="flex justify-between items-center border-b pb-2 last:border-0">
                       <div>
                          <p className="font-medium">{m.surah}</p>
                          <p className="text-xs text-gray-500">من {m.fromAyah} إلى {m.toAyah}</p>
                       </div>
                       <div className={`text-xs px-2 py-1 rounded-full ${
                          m.status === 'good' ? 'bg-green-100 text-green-700' :
                          m.status === 'review' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                       }`}>
                          {m.status === 'good' ? 'ممتاز' : m.status === 'review' ? 'مراجعة' : 'ضعيف'}
                       </div>
                    </div>
                  ))}
                  {parentData.memorization.length === 0 && (
                    <p className="text-center text-gray-400 py-4">لا يوجد سجلات حفظ</p>
                  )}
               </div>
            </div>

            <div className="card">
               <h4 className="font-bold border-b pb-2 mb-4">سجل الحضور</h4>
               <div className="space-y-2 max-h-64 overflow-y-auto">
                  {parentData.attendance.map((a, i) => (
                    <div key={i} className="flex justify-between items-center text-sm border-b pb-1 last:border-0">
                       <span className="text-gray-500 font-mono">{a.date}</span>
                       <span className={`font-bold ${
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
               </div>
            </div>
         </div>
       )}
    </div>
  );

  const renderAdmin = () => (
    <div className="space-y-8">
       <div className="card bg-gray-900 text-white p-8 rounded-2xl">
          <div className="flex items-center gap-4 mb-4">
             <Shield size={40} className="text-yellow-500" />
             <div>
                <h3 className="text-2xl font-bold">لوحة الإدارة العامة</h3>
                <p className="opacity-60 text-sm">إدارة المعلمين وجميع الطلاب في النظام</p>
             </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
             <div className="bg-white/10 p-4 rounded-xl">
                <p className="text-xs opacity-60">إجمالي الطلاب</p>
                <p className="text-xl font-bold">{students.length}</p>
             </div>
             <div className="bg-white/10 p-4 rounded-xl">
                <p className="text-xs opacity-60">إجمالي المعلمين</p>
                <p className="text-xl font-bold">{teachers.length}</p>
             </div>
          </div>
       </div>

       <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-1">
             <div className="card sticky top-6">
                <h4 className="font-bold border-b pb-4 mb-4 flex items-center gap-2">
                   <Plus size={20} className="text-primary" />
                   إضافة معلم جديد
                </h4>
                <form onSubmit={handleAddTeacher} className="space-y-4">
                   <div className="space-y-1">
                      <label className="text-sm font-medium">اسم المعلم</label>
                      <input 
                        required 
                        value={newTeacher.name}
                        onChange={e => setNewTeacher({...newTeacher, name: e.target.value})}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                        placeholder="الاسم الكامل"
                      />
                   </div>
                   <div className="space-y-1">
                      <label className="text-sm font-medium">البريد الإلكتروني</label>
                      <input 
                        required 
                        type="email"
                        value={newTeacher.email}
                        onChange={e => setNewTeacher({...newTeacher, email: e.target.value})}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none text-left"
                        placeholder="teacher@example.com"
                      />
                   </div>
                   <div className="space-y-1">
                      <label className="text-sm font-medium">كلمة المرور (مؤقتة)</label>
                      <input 
                        required 
                        type="password"
                        value={newTeacher.password}
                        onChange={e => setNewTeacher({...newTeacher, password: e.target.value})}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none text-left"
                        placeholder="••••••••"
                      />
                   </div>
                   <button type="submit" className="btn-primary w-full py-3 mt-4 text-sm font-bold">
                      إنشاء حساب المعلم
                   </button>
                   <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                      * سيتم إنشاء الحساب في Firebase Auth وإضافته لقاعدة البيانات كمعلم.
                   </p>
                </form>
             </div>
          </div>

          <div className="xl:col-span-2">
             <div className="card">
                <h4 className="font-bold border-b pb-4 mb-4 flex items-center gap-2">
                   <Users size={20} className="text-primary" />
                   قائمة المعلمين
                </h4>
                <div className="overflow-x-auto">
                   <table className="w-full text-right">
                      <thead>
                         <tr className="text-gray-400 text-sm border-b">
                            <th className="pb-4 pr-2">المعلم</th>
                            <th className="pb-4 pr-2">الإيميل</th>
                            <th className="pb-4 pr-2">تاريخ الانضمام</th>
                            <th className="pb-4 pr-2">الإجراءات</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y">
                         {teachers.map(t => (
                           <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                              <td className="py-4 pr-2">
                                 <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-green-100 text-primary rounded-full flex items-center justify-center text-xs">
                                       {t.name?.charAt(0) || 'M'}
                                    </div>
                                    <span className="font-medium text-sm">{t.name}</span>
                                 </div>
                              </td>
                              <td className="py-4 pr-2 text-xs text-gray-500 font-mono">{t.email}</td>
                              <td className="py-4 pr-2 text-xs text-gray-400">
                                 {t.createdAt ? format(new Date(t.createdAt), 'yyyy/MM/dd') : '--'}
                              </td>
                              <td className="py-4 pr-2">
                                 <button 
                                    onClick={() => handleDeleteTeacher(t.id)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="حذف المعلم"
                                 >
                                    <Trash2 size={18} />
                                 </button>
                              </td>
                           </tr>
                         ))}
                         {teachers.length === 0 && (
                           <tr>
                              <td colSpan="4" className="text-center py-10 text-gray-400">
                                 لا يوجد معلمون مسجلون حالياً
                              </td>
                           </tr>
                         )}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>
       </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'students': return renderStudents();
      case 'attendance': return renderAttendance();
      case 'memorization': return renderMemorization();
      case 'parents': return renderParents();
      case 'admin': return role === 'admin' ? renderAdmin() : renderDashboard();
      default: return renderDashboard();
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 p-4 lg:p-8 overflow-hidden">
        <header className="mb-8 flex justify-between items-center lg:items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {activeTab === 'dashboard' && 'لوحة التحكم'}
              {activeTab === 'students' && 'إدارة الطلاب'}
              {activeTab === 'attendance' && 'سجل الحضور'}
              {activeTab === 'memorization' && 'متابعة الحفظ'}
              {activeTab === 'parents' && 'بوابة الوالدين'}
              {activeTab === 'admin' && 'لوحة الإدارة'}
            </h2>
            <p className="text-gray-500 text-sm">
              أهلاً بك {user?.name || (role === 'admin' ? 'أيها المسؤول' : 'يا معلم')}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={logout}
              className="flex items-center gap-2 text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors text-sm"
            >
              <LogOut size={18} />
              خروج
            </button>
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border text-sm font-medium">
              {format(new Date(), 'EEEE, dd MMMM yyyy', { locale: ar })}
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center h-64">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          renderContent()
        )}
      </main>
    </div>
  );
}

export default App;
