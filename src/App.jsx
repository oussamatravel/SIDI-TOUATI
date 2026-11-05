import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import { useAuth } from './context/AuthContext';
import { SURAH_LIST } from './constants/surahs';
import { calculateProgress, getHizbDisplayString } from './utils/progressCalculator';
import VisualQuran from './components/VisualQuran';
import { 
  Sparkles,
  Clock,
  ArrowUpRight,
  GraduationCap,
  CalendarCheck,
  CreditCard,
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
  ChevronLeft,
  RefreshCw,
  UserCircle,
  Download,
  MessageSquare,
  Send,
  MessageCircle,
  Award,
  Printer,
  FileText,
  BellRing,
  AlertTriangle,
  Medal,
  Star,
  Target,
  ShieldCheck,
  Trophy,
  X
} from 'lucide-react';
import { QURAN_DATA, TOTAL_AYAH_COUNT, TOTAL_HIZB_COUNT, getHizbAyahCount, getHizbAyahList, HIZB_STARTS, HIZB_LABELS } from './constants/quranData';
import { ATHMAN_STARTS } from './constants/athmanData';
import { db, auth as primaryAuth, firebaseConfig } from './firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import * as XLSX from 'xlsx-js-style';
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
import ParentPortal from './components/ParentPortal';
import PraiseCard from './components/PraiseCard';
import SubscriptionsTab from './components/SubscriptionsTab';

export const SCHOOL_BRANCHES = ['Ecole Edimco', 'Ecole Ighil Elbordj', 'Ecole Ritaj'];
export const STUDENT_LEVELS = ['ما قبل التمدرس', 'ابتدائي', 'متوسط', 'ثانوي', 'قسم إكمالي ثانوي ذكور', 'قسم إكمالي ثانوي إناث', 'كبار', 'محو الأمية الأول', 'محو الأمية الثاني', 'محو الأمية الثالث', 'العلوم الشرعية', 'قسم التأهيل للإجازة', 'الإجازة'];

function App() {
  const { user, role, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [installPrompt, setInstallPrompt] = useState(null);
  const [unauthParentCode, setUnauthParentCode] = useState(null);
  const [rawStudents, setRawStudents] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [rawTeachers, setRawTeachers] = useState([]);
  const [adminBranchFilter, setAdminBranchFilter] = useState('All');
  const [adminTeacherFilter, setAdminTeacherFilter] = useState('All');
  const [rawAttendance, setRawAttendance] = useState([]);
  const [rawMemorization, setRawMemorization] = useState([]);
  const [rawReviews, setRawReviews] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [memorization, setMemorization] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [rawExams, setRawExams] = useState([]);
  const [exams, setExams] = useState([]);
  const [rawSubscriptions, setRawSubscriptions] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [rawTeacherRemarks, setRawTeacherRemarks] = useState([]);
  const [teacherRemarks, setTeacherRemarks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Messages States
  const [rawMessages, setRawMessages] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedChatUser, setSelectedChatUser] = useState(null); // For Admin
  const [messageSearch, setMessageSearch] = useState('');
  
  const [newRemark, setNewRemark] = useState('');

  // Filters for Students Tab
  const [studentSearch, setStudentSearch] = useState('');
  const [studentTabBranchFilter, setStudentTabBranchFilter] = useState('All');
  const [studentTabTeacherFilter, setStudentTabTeacherFilter] = useState('All');
  const [studentTabLevelFilter, setStudentTabLevelFilter] = useState('All');

  // Filters & Views for Attendance Tab
  const [attendanceViewMode, setAttendanceViewMode] = useState('daily'); // 'daily' | 'history'
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [attendanceTeacherFilter, setAttendanceTeacherFilter] = useState('All');
  const [attendanceBranchFilter, setAttendanceBranchFilter] = useState('All');
  const [attendanceLevelFilter, setAttendanceLevelFilter] = useState('All');
  const [attendanceHistoryStatusFilter, setAttendanceHistoryStatusFilter] = useState('All');
  const [attendanceHistoryFromDate, setAttendanceHistoryFromDate] = useState('');
  const [attendanceHistoryToDate, setAttendanceHistoryToDate] = useState('');

  // Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPraiseCard, setShowPraiseCard] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [supervisorViewMode, setSupervisorViewMode] = useState('my_students');
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [newStudent, setNewStudent] = useState({
    name: '',
    birthDate: '',
    level: 'ابتدائي',
    branch: SCHOOL_BRANCHES[0],
    parentName: '',
    parentEmail: '',
    fatherPhone: '',
    motherPhone: '',
    spousePhone: '',
    notes: '',
    code: Math.random().toString(36).substring(2, 8).toUpperCase()
  });

  const [newTeacher, setNewTeacher] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    branch: SCHOOL_BRANCHES[0],
    level: STUDENT_LEVELS[0],
    role: 'teacher',
    supervisedLevel: [STUDENT_LEVELS[0]]
  });

  const [showTeacherRemarkModal, setShowTeacherRemarkModal] = useState(false);
  const [selectedTeacherForRemark, setSelectedTeacherForRemark] = useState(null);
  const [newTeacherRemark, setNewTeacherRemark] = useState({
    type: 'غياب',
    note: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const [newMemo, setNewMemo] = useState({
    studentId: '',
    surah: '',
    fromAyah: '',
    toAyah: '',
    status: 'good',
    isFullSurah: false,
    memoType: 'surah',
    hizb: '',
    fromHizbRange: '',
    toHizbRange: '',
    fromThuman: '1',
    toThuman: '8',
    notes: ''
  });

  const [newReview, setNewReview] = useState({
    studentId: '',
    memoType: 'surah',
    surah: '',
    fromAyah: '',
    toAyah: '',
    hizb: '',
    fromThuman: '1',
    toThuman: '8',
    isFullSurah: false,
    status: 'good'
  });

  const [newExam, setNewExam] = useState({
    studentId: '',
    examType: 'surah', // 'surah' or 'hizb'
    surah: '',
    hizb: '',
    score: '',
    notes: ''
  });

  const [selectedParentStudent, setSelectedParentStudent] = useState(null);
  const [parentCodeInput, setParentCodeInput] = useState('');
  const [parentData, setParentData] = useState({ attendance: [], memorization: [] });
  const [attendanceDate, setAttendanceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState(null);
  const [reportFromDate, setReportFromDate] = useState('');
  const [reportToDate, setReportToDate] = useState('');
  const [reviewNotes, setReviewNotes] = useState({});

  // Fetch Data
  useEffect(() => {
    if (!user) return;

    let q = query(collection(db, "students"));
    // Filter students
    if (role === 'supervisor') {
      const levels = Array.isArray(user.supervisedLevel) ? user.supervisedLevel : (user.supervisedLevel ? [user.supervisedLevel] : []);
      if (levels.length > 0) {
        q = query(collection(db, "students"), where("level", "in", levels));
      } else {
        q = query(collection(db, "students"), where("level", "in", ["__NONE__"]));
      }
    } else if (role !== 'admin') {
      q = query(collection(db, "students"), where("teacherId", "==", user.uid));
    }

    const unsubscribeSt = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sortedData = data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setRawStudents(sortedData);
    }, (error) => {
      console.error("Students Sync Error:", error);
    });

    const today = format(new Date(), 'yyyy-MM-dd');
    let qAtt = query(collection(db, "attendance"));
    
    const unsubscribeAtt = onSnapshot(qAtt, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRawAttendance(data);
    }, (error) => {
      console.error("Attendance Sync Error:", error);
    });

    // Fetch memorization records
    let qMem = query(collection(db, "memorization"));
    const unsubscribeMem = onSnapshot(qMem, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRawMemorization(data);
    }, (error) => {
      console.error("Memorization Sync Error:", error);
    });

    // Fetch review records
    let qRev = query(collection(db, "reviews"));
    const unsubscribeRev = onSnapshot(qRev, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRawReviews(data);
    }, (error) => {
      console.error("Reviews Sync Error:", error);
    });

    // Fetch exams records
    let qExam = query(collection(db, "exams"));
    const unsubscribeExam = onSnapshot(qExam, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRawExams(data);
    }, (error) => {
      console.error("Exams Sync Error:", error);
    });

    // Fetch Subscriptions
    let qSub = query(collection(db, "subscriptions"));
    const unsubscribeSub = onSnapshot(qSub, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRawSubscriptions(data);
    }, (error) => {
      console.error("Subscriptions Sync Error:", error);
    });

    // Fetch Messages
    let qMsg = query(collection(db, "messages"), orderBy("timestamp", "asc"));
    const unsubscribeMsg = onSnapshot(qMsg, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRawMessages(data);
    }, (error) => {
      console.error("Messages Sync Error:", error);
    });

    // Fetch all teachers if admin or supervisor
    let unsubscribeTeach = () => {};
    if (role === 'admin' || role === 'supervisor') {
      const qT = query(collection(db, "teachers"), orderBy("name"));
      unsubscribeTeach = onSnapshot(qT, (snapshot) => {
        let docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (role === 'supervisor') {
          const levels = Array.isArray(user.supervisedLevel) ? user.supervisedLevel : (user.supervisedLevel ? [user.supervisedLevel] : []);
          docs = docs.filter(d => levels.includes(d.level) || d.id === user.uid);
        }
        setRawTeachers(docs);
      });
    }

    // Fetch teacher remarks if admin or supervisor
    let unsubscribeTeacherRemarks = () => {};
    if (role === 'admin' || role === 'supervisor') {
      const qTR = query(collection(db, "teacher_remarks"));
      unsubscribeTeacherRemarks = onSnapshot(qTR, (snapshot) => {
        setRawTeacherRemarks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }

    setLoading(false);
    return () => {
      unsubscribeSt();
      unsubscribeAtt();
      unsubscribeMem();
      unsubscribeRev();
      unsubscribeExam();
      unsubscribeSub();
      unsubscribeTeach();
      unsubscribeMsg();
      unsubscribeTeacherRemarks();
    };
  }, [user, role]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallPrompt(null);
      }
    } else {
      alert("لتثبيت التطبيق على هاتفك:\n\n📱 إذا كنت تستخدم أندرويد (Chrome):\nاضغط على قائمة المتصفح (الثلاث نقاط ⋮ بالأعلى) واختر 'إضافة للشاشة الرئيسية' (Add to Home screen).\n\n🍎 إذا كنت تستخدم آيفون (Safari):\nاضغط على زر المشاركة (Share) في أسفل الشاشة، ثم اختر 'إضافة للصفحة الرئيسية' (Add to Home Screen).");
    }
  };

  // Reactive Data Filtering (Fixes stale closures and allows history)
  useEffect(() => {
    if (!user) return;
    
    let currentStudents = rawStudents;
    
    if (role === 'admin') {
      let filteredTeachers = rawTeachers;
      if (adminBranchFilter !== 'All') {
        currentStudents = rawStudents.filter(s => s.branch === adminBranchFilter);
        filteredTeachers = rawTeachers.filter(t => t.branch === adminBranchFilter);
      } else {
        currentStudents = rawStudents;
      }
      setTeachers(filteredTeachers);

      if (adminTeacherFilter !== 'All') {
        currentStudents = currentStudents.filter(s => s.teacherId === adminTeacherFilter);
      }

      setStudents(currentStudents);

      if (adminBranchFilter !== 'All' || adminTeacherFilter !== 'All') {
        const branchStudentIds = currentStudents.map(s => s.id);
        setAttendance(rawAttendance.filter(a => branchStudentIds.includes(a.studentId)));
        setMemorization([...rawMemorization.filter(m => branchStudentIds.includes(m.studentId))].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)));
        setReviews([...rawReviews.filter(r => branchStudentIds.includes(r.studentId))].sort((a, b) => new Date(b.assignedDate || 0) - new Date(a.assignedDate || 0)));
        setExams([...rawExams.filter(e => branchStudentIds.includes(e.studentId))].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)));
        setSubscriptions(rawSubscriptions.filter(s => branchStudentIds.includes(s.studentId)));
      } else {
        setAttendance(rawAttendance);
        setMemorization([...rawMemorization].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)));
        setReviews([...rawReviews].sort((a, b) => new Date(b.assignedDate || 0) - new Date(a.assignedDate || 0)));
        setExams([...rawExams].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)));
        setSubscriptions(rawSubscriptions);
      }
    } else {
      if (role === 'supervisor') {
        setTeachers(rawTeachers);
        if (supervisorViewMode === 'my_students') {
          currentStudents = currentStudents.filter(s => s.teacherId === user.uid);
        }
      }
      setStudents(currentStudents); // Update the state with the filtered list
      const myStudentIds = currentStudents.map(s => s.id);
      
      const filteredAtt = rawAttendance.filter(a => a.teacherId === user.uid || myStudentIds.includes(a.studentId));
      setAttendance(filteredAtt);

      const filteredMem = rawMemorization
        .filter(m => m.teacherId === user.uid || myStudentIds.includes(m.studentId))
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setMemorization(filteredMem);

      const filteredRev = rawReviews
        .filter(r => r.teacherId === user.uid || myStudentIds.includes(r.studentId))
        .sort((a, b) => new Date(b.assignedDate || 0) - new Date(a.assignedDate || 0));
      setReviews(filteredRev);

      const filteredExams = rawExams
        .filter(e => e.teacherId === user.uid || myStudentIds.includes(e.studentId))
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setExams(filteredExams);

      const filteredSubs = rawSubscriptions.filter(s => s.teacherId === user.uid || myStudentIds.includes(s.studentId));
      setSubscriptions(filteredSubs);
    }

    // Filter messages
    if (role === 'admin') {
      setMessages(rawMessages);
    } else {
      setMessages(rawMessages.filter(m => m.senderId === user.uid || m.receiverId === user.uid || m.receiverId === 'all'));
    }

    // Filter teacher remarks
    if (role === 'admin' || role === 'supervisor') {
      const currentTeacherIds = rawTeachers.map(t => t.id);
      setTeacherRemarks(rawTeacherRemarks.filter(r => currentTeacherIds.includes(r.teacherId)));
    }

  }, [rawStudents, rawAttendance, rawMemorization, rawReviews, rawTeachers, rawMessages, rawTeacherRemarks, rawExams, rawSubscriptions, role, user, adminBranchFilter, adminTeacherFilter, supervisorViewMode]);

  // Messages Unread Logic
  const unreadMessagesCount = messages.filter(m => m.readStatus === false && (role === 'admin' ? m.receiverId === 'admin' : (m.receiverId === user?.uid || m.receiverId === 'all'))).length;

  useEffect(() => {
    if (activeTab === 'messages' && user) {
      const unread = messages.filter(m => 
        m.readStatus === false && 
        (role === 'admin' 
          ? (m.receiverId === 'admin' && m.senderId === selectedChatUser) 
          : (m.receiverId === user.uid || m.receiverId === 'all')
        )
      );
      
      unread.forEach(async (msg) => {
        try {
          await updateDoc(doc(db, "messages", msg.id), { readStatus: true });
        } catch (error) {
          console.error("Error marking read:", error);
        }
      });
    }
  }, [activeTab, messages, selectedChatUser, role, user]);

  if (!user && !unauthParentCode) {
    return <Login onParentLogin={setUnauthParentCode} />;
  }

  if (!user && unauthParentCode) {
    return <ParentPortal studentCode={unauthParentCode} onLogout={() => setUnauthParentCode(null)} />;
  }

  // Handlers
  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه الرسالة نهائياً؟")) return;
    try {
      await deleteDoc(doc(db, "messages", msgId));
    } catch (error) {
      console.error("Error deleting message:", error);
      alert("خطأ في حذف الرسالة");
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    let receiver = 'admin';
    if (role === 'admin') {
      if (!selectedChatUser) {
        alert("الرجاء تحديد مستلم");
        return;
      }
      receiver = selectedChatUser;
    }

    try {
      await addDoc(collection(db, "messages"), {
        senderId: user.uid,
        senderName: role === 'admin' ? 'الإدارة' : (user.email || 'معلم'),
        receiverId: receiver,
        content: newMessage,
        timestamp: new Date().toISOString(),
        readStatus: false
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
      alert("خطأ في إرسال الرسالة");
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      const studentData = {
        ...newStudent,
        teacherId: (role === 'admin' && newStudent.teacherId) ? newStudent.teacherId : user.uid,
        branch: newStudent.branch || SCHOOL_BRANCHES[0],
        updatedAt: new Date().toISOString()
      };

      if (editingStudent) {
        updateDoc(doc(db, "students", editingStudent.id), studentData);
        alert("تم تحديث بيانات الطالب بنجاح");
      } else {
        addDoc(collection(db, "students"), {
          ...studentData,
          createdAt: new Date().toISOString()
        });
        alert("تم إضافة الطالب بنجاح");
      }
      setIsModalOpen(false);
      setEditingStudent(null);
      setNewStudent({ 
        name: '', 
        birthDate: '', 
        level: 'ابتدائي',
        branch: user?.branch || SCHOOL_BRANCHES[0],
        parentName: '', 
        parentEmail: '',
        fatherPhone: '', 
        motherPhone: '',
        spousePhone: '',
        notes: '', 
        teacherId: '',
        code: Math.random().toString(36).substring(2, 8).toUpperCase() 
      });
    } catch (error) {
      console.error("Error adding student:", error);
      alert("خطأ في إضافة الطالب: " + error.message);
    }
  };

  // Batch Mark All Filtered Students Present
  const handleMarkAllPresent = async (studentList) => {
    if (!studentList || studentList.length === 0) return;
    if (!window.confirm(`هل أنت متأكد من تسجيل الحضور لجميع الطلاب الظاهرين في القائمة (${studentList.length} طالب) لتاريخ ${attendanceDate}؟`)) return;
    try {
      setLoading(true);
      for (const student of studentList) {
        const existing = attendance.find(a => a.studentId === student.id && a.date === attendanceDate);
        if (existing) {
          await updateDoc(doc(db, "attendance", existing.id), { 
            status: 'present', 
            timestamp: new Date().toISOString() 
          });
        } else {
          await addDoc(collection(db, "attendance"), {
            studentId: student.id,
            status: 'present',
            date: attendanceDate,
            teacherId: student.teacherId || user.uid,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (err) {
      console.error("Batch Attendance Error:", err);
      alert("خطأ أثناء تسجيل الحضور الجماعي: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update specific attendance record
  const handleUpdateAttendanceRecord = async (recordId, newStatus) => {
    try {
      await updateDoc(doc(db, "attendance", recordId), {
        status: newStatus,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error("Update Attendance Record Error:", err);
      alert("حدث خطأ أثناء تعديل السجل: " + err.message);
    }
  };

  // Delete attendance record
  const handleDeleteAttendanceRecord = async (recordId) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا السجل من تاريخ الحضور؟")) return;
    try {
      await deleteDoc(doc(db, "attendance", recordId));
    } catch (err) {
      console.error("Delete Attendance Record Error:", err);
      alert("حدث خطأ أثناء حذف السجل: " + err.message);
    }
  };

  // Export Attendance History to Excel
  const handleExportAttendanceExcel = (recordsToExport) => {
    try {
      const rows = recordsToExport.map((rec, idx) => {
        const st = rawStudents.find(s => s.id === rec.studentId);
        const tc = rawTeachers.find(t => t.id === (rec.teacherId || st?.teacherId));
        let statusAr = 'غير محدد';
        if (rec.status === 'present') statusAr = 'حاضر';
        else if (rec.status === 'late') statusAr = 'متأخر';
        else if (rec.status === 'absent') statusAr = 'غائب';
        else if (rec.status === 'excused') statusAr = 'غياب مبرر';
        else if (rec.status === 'stopped') statusAr = 'متوقف';

        return {
          'الرقم': idx + 1,
          'التاريخ': rec.date || '--',
          'كود الطالب': st?.code || '--',
          'اسم الطالب': st?.name || 'غير معروف',
          'المستوى': st?.level || '--',
          'المدرسة / الفرع': st?.branch || '--',
          'الأستاذ المشرف': tc?.name || '--',
          'حالة الحضور': statusAr,
          'وقت التسجيل': rec.timestamp ? format(new Date(rec.timestamp), 'yyyy-MM-dd HH:mm') : '--'
        };
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      if (!ws['!views']) ws['!views'] = [];
      ws['!views'].push({ rightToLeft: true });

      const colWidths = [
        { wch: 6 },
        { wch: 14 },
        { wch: 14 },
        { wch: 25 },
        { wch: 22 },
        { wch: 20 },
        { wch: 20 },
        { wch: 15 },
        { wch: 20 }
      ];
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'سجل_الحضور');
      const teacherName = attendanceTeacherFilter !== 'All' 
        ? `_${rawTeachers.find(t => t.id === attendanceTeacherFilter)?.name || 'أستاذ'}` 
        : '';
      XLSX.writeFile(wb, `سجل_الحضور${teacherName}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    } catch (err) {
      console.error("Export Attendance Excel Error:", err);
      alert("حدث خطأ أثناء تصدير ملف الإكسل");
    }
  };

  const handleAttendance = async (studentId, status) => {
    const targetDate = attendanceDate;
    // Only fetch existing record if it is from the selected date
    const existing = attendance.find(a => a.studentId === studentId && a.date === targetDate);
    
    try {
      if (existing) {
        // Teacher is updating attendance for the selected date
        updateDoc(doc(db, "attendance", existing.id), { 
          status, 
          timestamp: new Date().toISOString() 
        });
      } else {
        // Creating a new attendance record for the selected date
        addDoc(collection(db, "attendance"), {
          studentId,
          status,
          date: targetDate,
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
    if (!newMemo.studentId) return;
    if (newMemo.memoType === 'surah' && !newMemo.surah) return;
    if (newMemo.memoType === 'hizb' && !newMemo.hizb) return;
    if (newMemo.memoType === 'hizb_range' && (!newMemo.fromHizbRange || !newMemo.toHizbRange)) return;
    
    try {
      if (newMemo.memoType === 'hizb_range') {
        const from = parseInt(newMemo.fromHizbRange, 10);
        const to = parseInt(newMemo.toHizbRange, 10);
        if (from > to) {
          alert("تأكد أن الحزب الأول أصغر أو يساوي الحزب الثاني");
          return;
        }
        
        for (let h = from; h <= to; h++) {
          addDoc(collection(db, "memorization"), {
              studentId: newMemo.studentId,
              surah: null,
              fromAyah: null,
              toAyah: null,
              hizb: h,
              fromThuman: 1, // Range saves full hizb
              toThuman: 8,
              memoType: 'hizb', // Save individually as hizb for progress tracking
              status: newMemo.status,
              teacherId: user.uid,
              date: new Date().toISOString(),
              notes: newMemo.notes || ''
            });
        }
        alert("تم حفظ سجل التسميع بنجاح");
      } else {
        addDoc(collection(db, "memorization"), {
          studentId: newMemo.studentId,
          surah: newMemo.memoType === 'surah' ? newMemo.surah : null,
          fromAyah: newMemo.memoType === 'surah' ? Number(newMemo.fromAyah) : null,
          toAyah: newMemo.memoType === 'surah' ? Number(newMemo.toAyah) : null,
          hizb: newMemo.memoType === 'hizb' ? Number(newMemo.hizb) : null,
          fromThuman: newMemo.memoType === 'hizb' ? Number(newMemo.fromThuman) : null,
          toThuman: newMemo.memoType === 'hizb' ? Number(newMemo.toThuman) : null,
          memoType: newMemo.memoType,
          status: newMemo.status,
          teacherId: user.uid,
          date: new Date().toISOString(),
          notes: newMemo.notes || ''
        });
        alert("تم حفظ سجل التسميع بنجاح");
      }
      setNewMemo({ studentId: '', surah: '', fromAyah: '', toAyah: '', status: 'good', isFullSurah: false, memoType: 'surah', hizb: '', fromHizbRange: '', toHizbRange: '', fromThuman: '1', toThuman: '8', notes: '' });
    } catch (error) {
      console.error("Memo Error:", error);
    }
  };

  const handleAssignReview = async (e) => {
    e.preventDefault();
    if (!newReview.studentId) return;
    if (newReview.memoType === 'surah' && !newReview.surah) return;
    if (newReview.memoType === 'hizb' && !newReview.hizb) return;
    
    try {
      await addDoc(collection(db, "reviews"), {
        studentId: newReview.studentId,
        surah: newReview.memoType === 'surah' ? newReview.surah : null,
        fromAyah: newReview.memoType === 'surah' ? Number(newReview.fromAyah) : null,
        toAyah: newReview.memoType === 'surah' ? Number(newReview.toAyah) : null,
        hizb: newReview.memoType === 'hizb' ? Number(newReview.hizb) : null,
        fromThuman: newReview.memoType === 'hizb' ? Number(newReview.fromThuman) : null,
        toThuman: newReview.memoType === 'hizb' ? Number(newReview.toThuman) : null,
        memoType: newReview.memoType,
        status: 'pending', // Initial status
        teacherId: user.uid,
        assignedDate: new Date().toISOString(),
        completedDate: null
      });
      setNewReview({ studentId: '', surah: '', fromAyah: '', toAyah: '', isFullSurah: false, memoType: 'surah', hizb: '', fromThuman: '1', toThuman: '8', status: 'pending' });
      alert("تم جدولة المراجعة بنجاح");
    } catch (error) {
      console.error("Assign Review Error:", error);
    }
  };

  const handleEvaluateReview = async (reviewId, evaluationStatus) => {
    try {
      await updateDoc(doc(db, "reviews", reviewId), {
        status: evaluationStatus,
        completedDate: new Date().toISOString(),
        notes: reviewNotes[reviewId] || ''
      });
      setReviewNotes(prev => {
        const updated = {...prev};
        delete updated[reviewId];
        return updated;
      });
    } catch (error) {
      console.error("Evaluate Review Error:", error);
    }
  };

  const handleAddParentRemark = async (studentId) => {
    if (!newRemark.trim()) return;
    try {
      const student = rawStudents.find(s => s.id === studentId);
      const updatedRemarks = student.parentRemarks || [];
      updatedRemarks.push({
        id: Date.now().toString(),
        text: newRemark,
        date: new Date().toISOString(),
        teacherName: user.name || user.email || 'المعلم'
      });
      updateDoc(doc(db, "students", studentId), { parentRemarks: updatedRemarks });
      setNewRemark('');
    } catch (error) {
      console.error("Error adding remark:", error);
      alert("خطأ في إضافة الملاحظة");
    }
  };

  const handleSaveExam = async (e) => {
    e.preventDefault();
    if (!newExam.studentId) return;
    if (newExam.examType === 'surah' && !newExam.surah) return;
    if (newExam.examType === 'hizb' && !newExam.hizb) return;
    if (!newExam.score) return;

    try {
      addDoc(collection(db, "exams"), {
        studentId: newExam.studentId,
        examType: newExam.examType,
        surah: newExam.examType === 'surah' ? newExam.surah : null,
        hizb: newExam.examType === 'hizb' ? Number(newExam.hizb) : null,
        score: Number(newExam.score),
        notes: newExam.notes,
        teacherId: user.uid,
        date: new Date().toISOString()
      });
      setNewExam({
        studentId: '',
        examType: 'surah',
        surah: '',
        hizb: '',
        score: '',
        notes: ''
      });
      alert("تم حفظ الامتحان بنجاح");
    } catch (error) {
      console.error("Save Exam Error:", error);
      alert("حدث خطأ أثناء الحفظ");
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if(window.confirm("حذف هذه المراجعة؟")) {
      try {
        await deleteDoc(doc(db, "reviews", reviewId));
      } catch (error) {
        console.error("Delete Review Error:", error);
      }
    }
  };

  const handleSaveTeacher = async (e) => {
    e.preventDefault();
    try {
      if (editingTeacher) {
        // Update existing teacher
        await updateDoc(doc(db, "teachers", editingTeacher), {
          name: newTeacher.name,
          email: newTeacher.email,
          branch: newTeacher.branch,
          level: newTeacher.level,
          role: newTeacher.role,
          supervisedLevel: newTeacher.role === 'supervisor' ? newTeacher.supervisedLevel : null,
          updatedAt: new Date().toISOString()
        });
        alert("تم تحديث بيانات المعلم بنجاح");
      } else {
        // Add new teacher
        if (!newTeacher.email || !newTeacher.password) return;

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
          role: newTeacher.role || 'teacher',
          branch: newTeacher.branch,
          level: newTeacher.level,
          supervisedLevel: newTeacher.role === 'supervisor' ? newTeacher.supervisedLevel : null,
          createdAt: new Date().toISOString()
        });

        // Cleanup secondary app
        await deleteApp(secondaryApp);
        alert("تم إضافة المعلم بنجاح");
      }
      
      setEditingTeacher(null);
      setNewTeacher({ name: '', email: '', password: '', branch: SCHOOL_BRANCHES[0], level: STUDENT_LEVELS[0], role: 'teacher', supervisedLevel: [STUDENT_LEVELS[0]] });
    } catch (error) {
      console.error("Teacher Saving Error:", error);
      alert("خطأ: " + error.message);
    }
  };

  const handleDeleteTeacher = async (id) => {
    if (window.confirm("هل أنت متأكد من حذف هذا المعلم؟")) {
      await deleteDoc(doc(db, "teachers", id));
    }
  };

  const handleSaveTeacherRemark = async (e) => {
    e.preventDefault();
    if (!selectedTeacherForRemark || !newTeacherRemark.note.trim()) return;

    try {
      await addDoc(collection(db, "teacher_remarks"), {
        teacherId: selectedTeacherForRemark.id,
        supervisorId: user.uid,
        type: newTeacherRemark.type,
        note: newTeacherRemark.note,
        date: newTeacherRemark.date,
        createdAt: new Date().toISOString()
      });
      setShowTeacherRemarkModal(false);
      setNewTeacherRemark({ type: 'غياب', note: '', date: format(new Date(), 'yyyy-MM-dd') });
    } catch (error) {
      console.error("Error saving remark:", error);
      alert("خطأ أثناء الحفظ");
    }
  };

  const handleDeleteTeacherRemark = async (id) => {
    if (window.confirm("هل أنت متأكد من حذف هذه الملاحظة؟")) {
      await deleteDoc(doc(db, "teacher_remarks", id));
    }
  };

  const handleParentLookup = async () => {
    if (!parentCodeInput.trim()) return;
    const student = students.find(s => s.code === parentCodeInput.trim().toUpperCase());
    
    if (student) {
      setSelectedParentStudent(student);
      
      // Filter from local state to avoid composite index requirements
      const stAtt = attendance
        .filter(a => a.studentId === student.id)
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        
      const stMem = memorization
        .filter(m => m.studentId === student.id)
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

      const stRev = reviews
        .filter(r => r.studentId === student.id)
        .sort((a, b) => new Date(b.assignedDate || 0) - new Date(a.assignedDate || 0));

      const stExams = exams
        .filter(e => e.studentId === student.id)
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      
      setParentData({
        attendance: stAtt,
        memorization: stMem,
        reviews: stRev,
        exams: stExams
      });
    } else {
      alert("الكود غير صحيح");
    }
  };

  const handlePromoteStudent = async (student) => {
    if (!student.level || !student.level.startsWith('محو الأمية')) return;
    const levels = ['محو الأمية الأول', 'محو الأمية الثاني', 'محو الأمية الثالث'];
    const currentIndex = levels.indexOf(student.level);
    if (currentIndex >= 0 && currentIndex < levels.length - 1) {
      const nextLevel = levels[currentIndex + 1];
      if (window.confirm(`هل أنت متأكد من ترقية الطالب إلى ${nextLevel}؟`)) {
         try {
           await updateDoc(doc(db, "students", student.id), { level: nextLevel, isRepeating: false });
         } catch(e) {
           console.error("Error promoting:", e);
         }
      }
    } else {
      alert("الطالب في المستوى الأخير من محو الأمية.");
    }
  };

  const handleRepeatStudent = async (student) => {
    if (!student.level || !student.level.startsWith('محو الأمية')) return;
    if (window.confirm(`هل أنت متأكد من تحديد الطالب كمعيد في ${student.level}؟`)) {
       try {
         await updateDoc(doc(db, "students", student.id), { isRepeating: true });
       } catch(e) {
         console.error("Error repeating:", e);
       }
    }
  };

  const handleDeleteStudent = async (id) => {
    if (window.confirm("هل أنت متأكد من حذف هذا الطالب؟")) {
      await deleteDoc(doc(db, "students", id));
    }
  };

  const handleExportData = () => {
    // Collect all data into a single object
    const exportData = {
      timestamp: new Date().toISOString(),
      students,
      teachers,
      attendance: rawAttendance,
      memorization: rawMemorization,
      reviews: rawReviews
    };

    // Convert to JSON string
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    
    // Create a virtual link and trigger download
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `quran_backup_${format(new Date(), 'yyyy-MM-dd')}.json`);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleExportToExcel = () => {
    const wb = XLSX.utils.book_new();
    wb.Workbook = { Views: [{ RTL: true }] }; // Set right-to-left for Arabic

    // Helper to style sheets
    const applySheetStyles = (ws, colWidths) => {
      if (colWidths) ws['!cols'] = colWidths.map(w => ({ wch: w }));
      for (const key in ws) {
        if (key[0] === '!') continue;
        const cell = ws[key];
        const rowIndex = key.replace(/[^\d]/g, '');
        
        cell.s = {
          font: { name: "Arial", sz: 12 },
          alignment: { vertical: "center", horizontal: "center", wrapText: true },
          border: {
            top: { style: "thin", color: { auto: 1 } },
            bottom: { style: "thin", color: { auto: 1 } },
            left: { style: "thin", color: { auto: 1 } },
            right: { style: "thin", color: { auto: 1 } }
          }
        };

        if (rowIndex === '1') { // Header Row
          cell.s.font.bold = true;
          cell.s.font.color = { rgb: "FFFFFF" };
          cell.s.fill = { fgColor: { rgb: "10B981" } }; // Green theme
        }
      }
    };

    // 1. Students Sheet
    const studentsData = students.map(s => {
      const p = calculateStudentProgress(s.id);
      return {
        "الاسم": s.name,
        "تاريخ الميلاد": s.birthDate ? new Date(s.birthDate).toLocaleDateString('ar-EG') : (s.age ? `${s.age} سنة` : ''),
        "الفرع": s.branch,
        "المستوى": s.level || '',
        "ولي الأمر": s.parentName || '',
        "هاتف الأب": s.fatherPhone || s.phone || '',
        "هاتف الأم": s.motherPhone || '',
        "هاتف الزوج/ة": s.spousePhone || '',
        "تاريخ التسجيل": s.createdAt ? new Date(s.createdAt).toLocaleDateString('ar-EG') : '',
        "التقدم العام (%)": `${p.totalPercentage}%`,
        "الأحزاب المحفوظة": p.totalHizbs
      };
    });
    const wsStudents = XLSX.utils.json_to_sheet(studentsData);
    applySheetStyles(wsStudents, [25, 10, 20, 15, 15, 15, 20]);
    XLSX.utils.book_append_sheet(wb, wsStudents, "الطلاب");

    // 2. Attendance Sheets (Grouped by Month)
    const attendanceDatesByMonth = {};
    attendance.forEach(a => {
      if (!a.date) return;
      const monthKey = a.date.substring(0, 7); // e.g., "2024-06"
      if (!attendanceDatesByMonth[monthKey]) attendanceDatesByMonth[monthKey] = new Set();
      attendanceDatesByMonth[monthKey].add(a.date);
    });

    Object.keys(attendanceDatesByMonth).sort().forEach(monthKey => {
      const datesInMonth = [...attendanceDatesByMonth[monthKey]].sort((a, b) => new Date(a) - new Date(b));
      const monthData = students.map(student => {
        const row = { "الطالب": student.name };
        datesInMonth.forEach(date => {
          const record = attendance.find(a => a.studentId === student.id && a.date === date);
          let statusAr = '-';
          if(record) {
            if(record.status === 'present') statusAr = 'حاضر';
            if(record.status === 'absent') statusAr = 'غائب';
            if(record.status === 'late') statusAr = 'متأخر';
            if(record.status === 'excused') statusAr = 'غياب مبرر';
          }
          row[date] = statusAr;
        });
        return row;
      });
      
      if (monthData.length > 0) {
        const wsMonth = XLSX.utils.json_to_sheet(monthData);
        // Column widths: first column 25 (Student), others 12 (Dates)
        const widths = [25, ...datesInMonth.map(() => 12)];
        applySheetStyles(wsMonth, widths);
        XLSX.utils.book_append_sheet(wb, wsMonth, `حضور ${monthKey}`);
      }
    });

    // 3. Exams Sheets (Grouped by Month)
    const examDatesByMonth = {};
    exams.forEach(e => {
      if (!e.date) return;
      const monthKey = e.date.substring(0, 7); // e.g., "2024-06"
      if (!examDatesByMonth[monthKey]) examDatesByMonth[monthKey] = new Set();
      examDatesByMonth[monthKey].add(e.date);
    });

    Object.keys(examDatesByMonth).sort().forEach(monthKey => {
      const datesInMonth = [...examDatesByMonth[monthKey]].sort((a, b) => new Date(a) - new Date(b));
      const monthData = students.map(student => {
        const row = { "الطالب": student.name };
        datesInMonth.forEach(date => {
          const records = exams.filter(e => e.studentId === student.id && e.date === date);
          if (records.length > 0) {
            row[date] = records.map(r => `${r.score} (${r.examType === 'hizb' ? 'حزب ' + r.hizb : 'سورة ' + r.surah})`).join(' | ');
          } else {
            row[date] = '-';
          }
        });
        return row;
      });
      
      if (monthData.length > 0) {
        const wsMonth = XLSX.utils.json_to_sheet(monthData);
        // Column widths: first column 25 (Student), others 20 (Exam Details)
        const widths = [25, ...datesInMonth.map(() => 20)];
        applySheetStyles(wsMonth, widths);
        XLSX.utils.book_append_sheet(wb, wsMonth, `امتحانات ${monthKey}`);
      }
    });

    // Generate Excel File
    let fileNameSuffix = adminBranchFilter === 'All' ? 'شامل' : adminBranchFilter;
    if (adminTeacherFilter !== 'All') {
      const teacherName = teachers.find(t => t.id === adminTeacherFilter)?.name || 'معلم';
      fileNameSuffix += `_${teacherName}`;
    }
    const fileName = `تقرير_${fileNameSuffix}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const calculateStudentProgress = (studentId) => {
    const studentMemos = memorization.filter(m => m.studentId === studentId);
    return calculateProgress(studentMemos);
  };

  const getStudentBadges = (studentId) => {
    const badges = [];
    const progress = calculateStudentProgress(studentId);
    
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
    const stAtt = attendance.filter(a => a.studentId === studentId).sort((a, b) => new Date(b.date) - new Date(a.date));
    let consecutiveCount = 0;
    for (let a of stAtt) {
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
    const stExams = exams.filter(e => e.studentId === studentId);
    if (stExams.some(e => Number(e.score) >= 90)) {
      badges.push({ id: 'exam-excellent', title: 'الممتاز', icon: Star, color: 'text-orange-500', bg: 'bg-orange-50', desc: 'علامة 90+ في السبر' });
    }

    // Golden Reviewer Badge
    const stRev = reviews.filter(r => r.studentId === studentId && r.status === 'evaluated');
    if (stRev.length >= 5) {
      badges.push({ id: 'reviewer-5', title: 'المراجع الذهبي', icon: Target, color: 'text-indigo-500', bg: 'bg-indigo-50', desc: 'أتم 5 مراجعات بنجاح' });
    }

    return badges;
  };

  const renderMessages = () => {
    const chatTeachers = [{ id: 'all', name: 'الجميع (إعلان)' }, ...teachers];
    
    let displayMessages = messages;
    if (role === 'admin' && selectedChatUser) {
      if (selectedChatUser === 'all') {
        displayMessages = messages.filter(m => m.receiverId === 'all');
      } else {
        displayMessages = messages.filter(m => 
          (m.senderId === selectedChatUser && m.receiverId === 'admin') || 
          (m.senderId === user.uid && m.receiverId === selectedChatUser)
        );
      }
    } else if (role !== 'admin') {
      displayMessages = messages;
    } else {
      displayMessages = [];
    }

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row overflow-hidden h-[calc(100vh-12rem)] animate-in fade-in duration-300">
        {role === 'admin' && (
          <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-l flex flex-col bg-gray-50/50">
            <div className="p-4 border-b bg-white">
              <h3 className="font-bold flex items-center gap-2 text-primary">
                <MessageSquare size={20} />
                المحادثات
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {chatTeachers.map(t => {
                const hasUnread = messages.some(m => m.senderId === t.id && m.receiverId === 'admin' && m.readStatus === false);
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedChatUser(t.id)}
                    className={`w-full text-right px-4 py-3 rounded-xl transition-colors ${selectedChatUser === t.id ? 'bg-primary text-white shadow-md' : 'hover:bg-white text-gray-700'}`}
                  >
                    <div className="font-semibold flex justify-end items-center gap-2">
                      {hasUnread && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
                      {t.name}
                    </div>
                    {t.id !== 'all' && <div className="text-xs opacity-70">{t.branch}</div>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col bg-gray-50/30">
          {(role !== 'admin' || selectedChatUser) ? (
            <>
              <div className="p-4 border-b bg-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {role === 'admin' ? (selectedChatUser === 'all' ? 'A' : chatTeachers.find(t=>t.id===selectedChatUser)?.name?.charAt(0)) : 'الإدارة'.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold">
                    {role === 'admin' ? (selectedChatUser === 'all' ? 'إعلان للجميع' : chatTeachers.find(t=>t.id===selectedChatUser)?.name) : 'الإدارة'}
                  </h3>
                  {role !== 'admin' && <span className="text-xs text-green-600">متصل</span>}
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {displayMessages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    لا توجد رسائل سابقة
                  </div>
                ) : (
                  displayMessages.map(msg => {
                    const isMine = msg.senderId === user.uid;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} items-center gap-2 group`}>
                        {role === 'admin' && !isMine && (
                          <button onClick={() => handleDeleteMessage(msg.id)} title="حذف الرسالة" className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all">
                            <Trash2 size={14} />
                          </button>
                        )}
                        <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${isMine ? 'bg-primary text-white rounded-tr-sm' : 'bg-white border text-gray-800 rounded-tl-sm shadow-sm'}`}>
                          {!isMine && msg.receiverId === 'all' && role !== 'admin' && (
                            <div className="text-xs text-primary font-bold mb-1">الإدارة (إعلان)</div>
                          )}
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <div className={`text-[10px] mt-1 flex items-center justify-between ${isMine ? 'text-white/70' : 'text-gray-400'}`}>
                            <span>{new Date(msg.timestamp).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                        </div>
                        {role === 'admin' && isMine && (
                          <button onClick={() => handleDeleteMessage(msg.id)} title="حذف الرسالة" className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-4 bg-white border-t">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input 
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="اكتب رسالتك هنا..."
                    className="flex-1 px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                  />
                  <button 
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="p-3 bg-primary text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <Send size={20} className="rtl:-scale-x-100" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 flex-col gap-3">
              <MessageCircle size={48} className="opacity-20" />
              <p>اختر محادثة للبدء</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render Screens
  const renderStudentDetails = (student) => {
    const progress = calculateStudentProgress(student.id);

    // Calculate Periodic Stats
    const periodAttendance = attendance.filter(a => {
      if (a.studentId !== student.id) return false;
      const aDate = new Date(a.date);
      if (reportFromDate && aDate < new Date(new Date(reportFromDate).setHours(0,0,0,0))) return false;
      if (reportToDate && aDate > new Date(new Date(reportToDate).setHours(23,59,59,999))) return false;
      return true;
    });

    const periodMemorization = memorization.filter(m => {
      if (m.studentId !== student.id) return false;
      const mDate = new Date(m.date || 0);
      if (reportFromDate && mDate < new Date(new Date(reportFromDate).setHours(0,0,0,0))) return false;
      if (reportToDate && mDate > new Date(new Date(reportToDate).setHours(23,59,59,999))) return false;
      return true;
    }).sort((a,b) => new Date(b.date||0) - new Date(a.date||0));

    const periodReviews = reviews.filter(r => {
      if (r.studentId !== student.id) return false;
      const rDate = r.assignedDate ? new Date(r.assignedDate) : new Date(0);
      if (reportFromDate && rDate < new Date(new Date(reportFromDate).setHours(0,0,0,0))) return false;
      if (reportToDate && rDate > new Date(new Date(reportToDate).setHours(23,59,59,999))) return false;
      return true;
    }).sort((a,b) => new Date(b.assignedDate||0) - new Date(a.assignedDate||0));

    const periodExams = exams.filter(e => {
      if (e.studentId !== student.id) return false;
      const eDate = e.date ? new Date(e.date) : new Date(0);
      if (reportFromDate && eDate < new Date(new Date(reportFromDate).setHours(0,0,0,0))) return false;
      if (reportToDate && eDate > new Date(new Date(reportToDate).setHours(23,59,59,999))) return false;
      return true;
    }).sort((a,b) => new Date(b.date||0) - new Date(a.date||0));

    const periodPresentCount = periodAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
    const periodTotalAtt = periodAttendance.length;
    
    const badges = getStudentBadges(student.id);
    const studentSub = (subscriptions || []).find(s => s.studentId === student.id && (s.academicYear === '2025-2026' || !s.academicYear)) || (subscriptions || []).find(s => s.studentId === student.id);

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
                {student.birthDate && (
                  <p className="opacity-70 text-sm">
                    تاريخ الميلاد: {new Date(student.birthDate).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                    {' — '}العمر: {Math.floor((new Date() - new Date(student.birthDate)) / (365.25 * 24 * 60 * 60 * 1000))} سنة
                  </p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm opacity-80">
                  {student.fatherPhone && <span>📞 الأب: {student.fatherPhone}</span>}
                  {student.motherPhone && <span>📞 الأم: {student.motherPhone}</span>}
                  {student.spousePhone && <span>📞 الزوج/ة: {student.spousePhone}</span>}
                  {/* Fallback for old data */}
                  {!student.fatherPhone && !student.motherPhone && student.phone && <span>📞 {student.phone}</span>}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="bg-white/20 px-2 py-1 rounded text-sm">
                    المستوى: {student.level || 'غير محدد'}
                  </span>
                  {student.isRepeating && (
                    <span className="bg-red-500 text-white px-2 py-1 rounded text-sm font-bold animate-pulse">
                      معيد
                    </span>
                  )}
                  {studentSub && studentSub.status === 'paid' ? (
                    <span className="bg-emerald-600 text-white px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-sm">
                      <CheckCircle size={14} />
                      الاشتراك: تم التسديد ({studentSub.amount || 0} د.ج)
                    </span>
                  ) : studentSub && studentSub.status === 'exempt' ? (
                    <span className="bg-blue-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-sm">
                      الاشتراك: معفى
                    </span>
                  ) : (
                    <span className="bg-amber-400 text-amber-950 px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-sm">
                      الاشتراك: غير مسدد
                    </span>
                  )}
                </div>
                {student.level && student.level.startsWith('محو الأمية') && (
                  <div className="mt-4 flex gap-2">
                    <button 
                      onClick={() => handlePromoteStudent(student)}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-colors shadow-lg"
                    >
                      ترقية للمستوى التالي ⬆️
                    </button>
                    <button 
                      onClick={() => handleRepeatStudent(student)}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-colors shadow-lg"
                    >
                      إعادة المستوى 🔄
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white/10 px-6 py-4 rounded-2xl text-center">
              <p className="text-sm opacity-60">التقدم الإجمالي</p>
              <p className="text-4xl font-bold">{progress.totalPercentage}%</p>
            </div>
          </div>
        </div>

        {/* Badges Section */}
        {badges.length > 0 && (
          <div className="card border-t-4 border-t-yellow-400 bg-gradient-to-l from-yellow-50/50 to-white">
            <h4 className="font-bold border-b pb-4 mb-4 flex items-center gap-2 text-gray-800">
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
            التقييم الدوري
          </h4>
          
          <div className="flex flex-col md:flex-row gap-4 mb-6 bg-gray-50 p-4 rounded-xl border">
            <div className="flex-1">
               <label className="block text-sm text-gray-600 mb-1">من تاريخ</label>
               <input 
                 type="date" 
                 value={reportFromDate}
                 onChange={e => setReportFromDate(e.target.value)}
                 className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary"
               />
            </div>
            <div className="flex-1">
               <label className="block text-sm text-gray-600 mb-1">إلى تاريخ</label>
               <input 
                 type="date" 
                 value={reportToDate}
                 onChange={e => setReportToDate(e.target.value)}
                 className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary"
               />
            </div>
            {(reportFromDate || reportToDate) && (
               <div className="flex items-end">
                  <button 
                     onClick={() => { setReportFromDate(''); setReportToDate(''); }}
                     className="px-4 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                  >
                     مسح التصفية
                  </button>
               </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="border rounded-xl p-4">
                <h5 className="font-bold text-sm text-gray-500 mb-4 border-b pb-2">تفاصيل الحضور</h5>
                <div className="flex justify-between items-center mb-6">
                   <p className="text-sm">نسبة الحضور في الفترة:</p>
                   <p className="text-2xl font-bold text-green-600">
                     {periodTotalAtt > 0 ? Math.round((periodPresentCount / periodTotalAtt) * 100) : 0}%
                   </p>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                   {periodAttendance.map((a, i) => (
                      <div key={i} className="flex justify-between text-sm border-b pb-1 last:border-0 hover:bg-gray-50 p-1 rounded">
                         <span className="text-gray-600">{new Date(a.date).toLocaleDateString('ar-EG', { weekday:'short', month:'short', day:'numeric' })}</span>
                         <span className={`font-bold ${a.status === 'present'?'text-green-600':a.status==='late'?'text-orange-500':a.status==='excused'?'text-purple-600':'text-red-500'}`}>
                            {a.status === 'present' ? 'حاضر' : a.status === 'late' ? 'متأخر' : a.status === 'excused' ? 'غياب مبرر' : a.status === 'absent' ? 'غائب' : 'متوقف'}
                         </span>
                      </div>
                   ))}
                   {periodAttendance.length === 0 && <p className="text-xs text-gray-400 text-center py-4">لا توجد سجلات उपस्थिति</p>}
                </div>
             </div>

             <div className="border rounded-xl p-4">
                <h5 className="font-bold text-sm text-gray-500 mb-4 border-b pb-2">الدروس والمراجعة</h5>
                <div className="space-y-4 max-h-48 overflow-y-auto pr-2">
                   {periodMemorization.map((m, i) => (
                      <div key={`m-${i}`} className="text-sm border-b pb-2 last:border-0 hover:bg-gray-50 p-1 rounded">
                         <div className="flex justify-between mb-1">
                            <span className="font-bold text-blue-700">حفظ: {m.memoType==='hizb'||m.hizb ? getHizbDisplayString(m) : m.surah}</span>
                            <span className="text-[10px] text-gray-400">{m.date ? new Date(m.date).toLocaleDateString('ar-EG') : ''}</span>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-xs text-gray-500">{m.memoType==='hizb'||m.hizb ? '' : `الآيات: ${m.fromAyah} - ${m.toAyah}`}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${m.status==='good'?'bg-green-100 text-green-700':m.status==='review'?'bg-yellow-100 text-yellow-700':m.status==='performance'?'bg-blue-100 text-blue-700':'bg-red-100 text-red-700'}`}>
                               {m.status==='good'?'جيد':m.status==='review'?'يحتاج الى ترسيخ':m.status==='performance'?'الأداء':'حفظ غير متقن'}
                            </span>
                         </div>
                      </div>
                   ))}
                   {periodReviews.map((r, i) => (
                      <div key={`r-${i}`} className="text-sm border-b pb-2 last:border-0 hover:bg-orange-50 p-1 rounded bg-orange-50/30">
                         <div className="flex justify-between mb-1">
                            <span className="font-bold text-orange-700">مراجعة: {r.memoType==='hizb'||r.hizb ? getHizbDisplayString(r) : r.surah}</span>
                            <span className="text-[10px] text-gray-400">{r.assignedDate ? new Date(r.assignedDate).toLocaleDateString('ar-EG') : ''}</span>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-xs text-gray-500">{r.memoType==='hizb'||r.hizb ? '' : `الآيات: ${r.fromAyah} - ${r.toAyah}`}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${r.status==='pending'?'bg-gray-200 text-gray-700':r.status==='good'?'bg-green-100 text-green-700':r.status==='review'?'bg-yellow-100 text-yellow-700':r.status==='performance'?'bg-blue-100 text-blue-700':'bg-red-100 text-red-700'}`}>
                               {r.status==='pending'?'قيد الانتظار':r.status==='good'?'جيد':r.status==='review'?'يحتاج الى ترسيخ':r.status==='performance'?'الأداء':'حفظ غير متقن'}
                            </span>
                         </div>
                      </div>
                   ))}
                   {(periodMemorization.length === 0 && periodReviews.length === 0) && (
                      <p className="text-xs text-gray-400 text-center py-4">لا توجد سجلات في هذه الفترة</p>
                   )}
                </div>
             </div>
          </div>
        </div>

        <VisualQuran progressSurahs={progress.surahs} />

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

        <div className="card">
          <h4 className="font-bold border-b pb-4 mb-4 flex items-center gap-2">
            <FileText size={20} className="text-primary" />
            سجل الامتحانات (السبر)
          </h4>
          <div className="space-y-4">
            {periodExams.length > 0 ? (
              <div className="overflow-x-auto">
                 <table className="w-full text-right">
                    <thead>
                       <tr className="text-gray-400 text-sm border-b">
                          <th className="pb-2 pr-2">التاريخ</th>
                          <th className="pb-2 pr-2">الامتحان</th>
                          <th className="pb-2 pr-2 text-center">العلامة</th>
                          <th className="pb-2 pr-2">الملاحظات</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y">
                       {periodExams.map(ex => (
                          <tr key={ex.id} className="hover:bg-gray-50">
                             <td className="py-2 pr-2 text-xs text-gray-500">
                                {ex.date ? format(new Date(ex.date), 'dd/MM/yyyy') : '--'}
                             </td>
                             <td className="py-2 pr-2 text-sm text-primary">
                                {ex.examType === 'hizb' ? `حزب ${ex.hizb}` : `سورة ${ex.surah}`}
                             </td>
                             <td className="py-2 pr-2 text-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${Number(ex.score) >= 90 ? 'bg-green-100 text-green-700' : Number(ex.score) >= 70 ? 'bg-blue-100 text-blue-700' : Number(ex.score) >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                   {ex.score} / 100
                                </span>
                             </td>
                             <td className="py-2 pr-2 text-xs text-gray-500 max-w-[150px] truncate">
                                {ex.notes || '--'}
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
            ) : (
              <p className="text-center py-4 text-gray-400">لا يوجد امتحانات مسجلة</p>
            )}
          </div>
        </div>

        <div className="card">
          <h4 className="font-bold border-b pb-4 mb-4 flex items-center gap-2">
            <MessageSquare size={20} className="text-primary" />
            ملاحظات لولي الأمر
          </h4>
          <div className="space-y-4">
            <div className="flex gap-2">
              <input 
                type="text"
                value={newRemark}
                onChange={e => setNewRemark(e.target.value)}
                placeholder="اكتب ملاحظة لولي الأمر هنا..."
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm"
              />
              <button 
                onClick={() => handleAddParentRemark(student.id)}
                disabled={!newRemark.trim()}
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center gap-2 text-sm font-bold"
              >
                <Send size={16} className="rtl:-scale-x-100" />
                إرسال
              </button>
            </div>
            
            <div className="space-y-2 mt-4 max-h-40 overflow-y-auto pr-2">
              {student.parentRemarks && student.parentRemarks.length > 0 ? (
                [...student.parentRemarks].reverse().map((rem, idx) => (
                  <div key={rem.id || idx} className="bg-gray-50 p-3 rounded-lg border text-sm">
                    <p className="text-gray-800">{rem.text}</p>
                    <div className="flex justify-between items-center mt-2 text-[10px] text-gray-500">
                      <span>{rem.teacherName}</span>
                      <span>{format(new Date(rem.date), 'dd/MM/yyyy HH:mm')}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center py-4 text-gray-400 text-sm">لا توجد ملاحظات مسجلة</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };
  const renderDashboard = () => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const greetingTime = today.getHours() < 12 ? 'صباح الخير والبركة 🌅' : 'مساء الخير والأنوار 🌙';

    // 1. Attendance Trend (Last 7 Days)
    const trendDays = 7;
    const attendanceData = [];
    const memoData = [];
    
    for (let i = trendDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayLabel = format(d, 'EEEE', { locale: ar }).split(' ')[0];
      
      const dayAtt = attendance.filter(a => a.date === dateStr);
      const present = dayAtt.filter(a => a.status === 'present').length;
      const late = dayAtt.filter(a => a.status === 'late').length;
      const absent = dayAtt.filter(a => a.status === 'absent').length;
      const excused = dayAtt.filter(a => a.status === 'excused').length;
      attendanceData.push({ dayLabel, dateStr, present, late, absent, excused, total: present + late + absent + excused });

      const dayMemo = memorization.filter(m => m.date && m.date.startsWith(dateStr));
      memoData.push({ dayLabel, count: dayMemo.length });
    }

    const maxAtt = Math.max(...attendanceData.map(d => d.total), 1);
    const maxMemo = Math.max(...memoData.map(d => d.count), 1);

    // 2. Today's Key Metrics
    const presentTodayCount = attendance.filter(a => a.date === todayStr && a.status === 'present').length;
    const lateTodayCount = attendance.filter(a => a.date === todayStr && a.status === 'late').length;
    const absentTodayCount = attendance.filter(a => a.date === todayStr && a.status === 'absent').length;
    const totalTodayAttended = presentTodayCount + lateTodayCount;
    const todayAttPercentage = students.length > 0 ? Math.round((totalTodayAttended / students.length) * 100) : 0;

    const memoToday = memorization.filter(m => m.date && m.date.startsWith(todayStr));
    const memoGoodToday = memoToday.filter(m => m.status === 'good').length;

    // 3. Subscriptions Metrics
    const currentYear = '2025-2026';
    const yearSubs = subscriptions.filter(s => s.year === currentYear || !s.year);
    const paidSubsCount = yearSubs.filter(s => s.status === 'paid').length;
    const totalCollectedDzd = yearSubs.reduce((acc, s) => acc + (Number(s.paidAmount) || 0), 0);
    const subRate = students.length > 0 ? Math.round((paidSubsCount / students.length) * 100) : 0;

    // 4. Quranic Milestone Metrics
    const memoHizbsCount = memorization.filter(m => m.memoType === 'hizb' || m.hizb).length;
    const estimatedHizbsTotal = memoHizbsCount + Math.floor(memorization.filter(m => m.memoType === 'surah' || m.surah).length * 0.4);
    const khatmahsEquiv = (estimatedHizbsTotal / 60).toFixed(1);
    const examsPassedCount = exams.filter(e => Number(e.score) >= 70).length;

    // 5. Smart Notifications Logic
    const smartNotifications = [];
    
    students.forEach(student => {
      // 3 consecutive attended sessions without any memorization
      const stAtt = attendance
        .filter(a => a.studentId === student.id && (a.status === 'present' || a.status === 'late'))
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        
      if (stAtt.length >= 3) {
        const recent3 = stAtt.slice(0, 3);
        let hasMemoInRecent3 = false;
        for (const att of recent3) {
          const attDateStr = new Date(att.date).toDateString();
          const hasMemo = memorization.some(m => m.studentId === student.id && new Date(m.date).toDateString() === attDateStr);
          if (hasMemo) {
            hasMemoInRecent3 = true;
            break;
          }
        }
        
        if (!hasMemoInRecent3) {
          smartNotifications.push({
            id: `memo-${student.id}`,
            type: 'memorization',
            priority: 'high',
            badge: 'غياب تسميع',
            student,
            message: `الطالب ${student.name} حضر 3 حصص متتالية دون تسجيل أي تسميع.`
          });
        }
      }

      // No exam in the last 90 days
      const stExams = exams
        .filter(e => e.studentId === student.id)
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      
      const lastExamDate = stExams.length > 0 ? new Date(stExams[0].date) : null;
      const createdAt = student.createdAt ? new Date(student.createdAt) : null;
      
      let noExamDays = 0;
      if (lastExamDate) {
        noExamDays = Math.floor((today - lastExamDate) / (1000 * 60 * 60 * 24));
      } else if (createdAt) {
        noExamDays = Math.floor((today - createdAt) / (1000 * 60 * 60 * 24));
      }

      if (noExamDays > 90) {
        smartNotifications.push({
          id: `exam-${student.id}`,
          type: 'exam',
          priority: 'medium',
          badge: 'تأخر سبر',
          student,
          message: `الطالب ${student.name} لم يجرِ أي امتحان (سبر) منذ أكثر من 3 أشهر.`
        });
      }
    });

    // Overdue reviews
    reviews.filter(r => r.status === 'pending').forEach(r => {
      const assigned = new Date(r.assignedDate || 0);
      const daysPending = Math.floor((today - assigned) / (1000 * 60 * 60 * 24));
      
      if (daysPending > 7) {
        const s = students.find(st => st.id === r.studentId);
        smartNotifications.push({
          id: `rev-${r.id}`,
          type: 'review',
          priority: 'medium',
          badge: 'مراجعة معلقة',
          student: s,
          message: `مراجعة متأخرة للطالب ${s?.name || 'طالب محذوف'} منذ ${daysPending} أيام.`
        });
      }
    });

    // Unread Messages
    if (unreadMessagesCount > 0) {
      smartNotifications.push({
        id: `msg-unread`,
        type: 'message',
        priority: 'high',
        badge: 'رسائل جديدة',
        tabTarget: 'messages',
        message: `لديك ${unreadMessagesCount} رسالة غير مقروءة في صندوق الوارد.`
      });
    }

    smartNotifications.sort((a, b) => (a.priority === 'high' ? -1 : 1));

    return (
      <div className="space-y-8 animate-in fade-in duration-300 rtl text-right">
        {/* Executive Hero Banner */}
        <div className="relative bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-900 rounded-[2.5rem] p-7 md:p-10 text-white shadow-2xl border border-white/10 overflow-hidden">
          {/* Subtle Ambient Radial Lighting */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              {/* Header Badges */}
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-emerald-300 text-xs font-bold border border-white/15">
                  <Sparkles size={14} className="text-amber-300" />
                  <span>{greetingTime}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-800/80 text-slate-300 text-xs font-semibold border border-white/10">
                  <Clock size={13} className="text-emerald-400" />
                  <span>{format(today, 'EEEE d MMMM yyyy', { locale: ar })}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span>الحلقات نشطة اليوم ({totalTodayAttended} حاضر)</span>
                </span>
              </div>

              <div>
                <h1 className="text-2xl md:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                  <span>لوحة القيادة والمتابعة</span>
                  <span className="text-xs md:text-sm font-bold px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm">
                    {role === 'admin' ? 'الإدارة العامة' : role === 'supervisor' ? 'الإشراف التربوي' : 'الأستاذ المعلم'}
                  </span>
                </h1>
                <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl font-medium leading-relaxed">
                  مدرسة سيدي تواتي لتعليم القرآن الكريم — المنصة المركزية لمتابعة إنجاز الحفظ، الانضباط، والتقارير المالية.
                </p>
              </div>
            </div>

            {/* Quick Action Command Dock */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setActiveTab('memorization')}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-amber-950 font-black rounded-2xl text-xs shadow-lg shadow-amber-500/25 transition-all active:scale-95 flex items-center gap-2"
              >
                <BookOpen size={16} />
                <span>تسجيل تسميع</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('attendance')}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-xs backdrop-blur-md border border-white/20 transition-all active:scale-95 flex items-center gap-2"
              >
                <CalendarCheck size={16} className="text-emerald-400" />
                <span>حضور اليوم</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('subscriptions')}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-xs backdrop-blur-md border border-white/20 transition-all active:scale-95 flex items-center gap-2"
              >
                <CreditCard size={16} className="text-teal-400" />
                <span>الاشتراكات</span>
              </button>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs shadow-md shadow-emerald-600/30 transition-all active:scale-95 flex items-center gap-2"
              >
                <Plus size={16} />
                <span>طالب جديد</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Precision Executive KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Students */}
          <div 
            onClick={() => setActiveTab('students')}
            className="group relative bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between"
          >
            <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-400 absolute top-0 right-0 left-0" />
            <div className="flex justify-between items-start pt-1">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                  شؤون الطلاب
                </span>
                <h3 className="text-3xl md:text-4xl font-black text-slate-900 mt-2 tracking-tight">
                  {students.length}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">طالباً مسجلاً بالحلقات</p>
              </div>
              <div className="p-3.5 bg-gradient-to-tr from-emerald-600 to-teal-500 text-white rounded-2xl shadow-lg shadow-emerald-600/25 group-hover:scale-110 transition-transform">
                <Users size={22} />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-400 text-[11px]">
                {SCHOOL_BRANCHES.length} فروع نشطة
              </span>
              <span className="text-emerald-700 font-bold group-hover:translate-x-[-4px] transition-transform flex items-center gap-1">
                إدارة الطلاب <ArrowUpRight size={14} />
              </span>
            </div>
          </div>

          {/* Card 2: Attendance Today */}
          <div 
            onClick={() => setActiveTab('attendance')}
            className="group relative bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between"
          >
            <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-cyan-400 absolute top-0 right-0 left-0" />
            <div className="flex justify-between items-start pt-1">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                  انضباط اليوم
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-3xl md:text-4xl font-black text-blue-700 tracking-tight">
                    {presentTodayCount}
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">حاضر الآن</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2 max-w-[120px]">
                  <div 
                    className="h-full bg-blue-600 rounded-full transition-all duration-700" 
                    style={{ width: `${Math.min(todayAttPercentage, 100)}%` }} 
                  />
                </div>
              </div>
              <div className="p-3.5 bg-gradient-to-tr from-blue-600 to-cyan-500 text-white rounded-2xl shadow-lg shadow-blue-600/25 group-hover:scale-110 transition-transform">
                <CalendarCheck size={22} />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-500 text-[11px]">
                {lateTodayCount > 0 ? `+${lateTodayCount} متأخر` : 'نسبة ' + todayAttPercentage + '%'}
              </span>
              <span className="text-blue-600 font-bold group-hover:translate-x-[-4px] transition-transform flex items-center gap-1">
                سجل الحضور <ArrowUpRight size={14} />
              </span>
            </div>
          </div>

          {/* Card 3: Memorization Today */}
          <div 
            onClick={() => setActiveTab('memorization')}
            className="group relative bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between"
          >
            <div className="h-1 w-full bg-gradient-to-r from-amber-500 to-yellow-400 absolute top-0 right-0 left-0" />
            <div className="flex justify-between items-start pt-1">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                  تسميعات اليوم
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-3xl md:text-4xl font-black text-amber-600 tracking-tight">
                    {memoToday.length}
                  </h3>
                  <span className="text-xs text-amber-700 font-medium">جلسة</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">منها {memoGoodToday} متقن وممتاز ⭐</p>
              </div>
              <div className="p-3.5 bg-gradient-to-tr from-amber-500 to-yellow-400 text-white rounded-2xl shadow-lg shadow-amber-500/25 group-hover:scale-110 transition-transform">
                <BookOpen size={22} />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
              <span className="text-amber-800 font-bold text-[11px]">
                {memoToday.length > 0 ? 'نشاط مستمر اليوم' : 'في انتظار التسجيل'}
              </span>
              <span className="text-amber-600 font-bold group-hover:translate-x-[-4px] transition-transform flex items-center gap-1">
                تسجيل التسميع <ArrowUpRight size={14} />
              </span>
            </div>
          </div>

          {/* Card 4: Subscriptions */}
          <div 
            onClick={() => setActiveTab('subscriptions')}
            className="group relative bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between"
          >
            <div className="h-1 w-full bg-gradient-to-r from-purple-500 to-indigo-400 absolute top-0 right-0 left-0" />
            <div className="flex justify-between items-start pt-1">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
                  الاشتراكات ({currentYear})
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-3xl md:text-4xl font-black text-purple-700 tracking-tight">
                    {subRate}%
                  </h3>
                  <span className="text-xs text-purple-600 font-medium">نسبة التحصيل</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">
                  المحصل: {totalCollectedDzd.toLocaleString()} د.ج
                </p>
              </div>
              <div className="p-3.5 bg-gradient-to-tr from-purple-600 to-indigo-500 text-white rounded-2xl shadow-lg shadow-purple-600/25 group-hover:scale-110 transition-transform">
                <CreditCard size={22} />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-500 text-[11px]">
                {paidSubsCount} مسدد من أصل {students.length}
              </span>
              <span className="text-purple-600 font-bold group-hover:translate-x-[-4px] transition-transform flex items-center gap-1">
                صندوق الاشتراكات <ArrowUpRight size={14} />
              </span>
            </div>
          </div>
        </div>

        {/* School Quranic Milestone Showcase Banner */}
        <div className="relative bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50/70 rounded-[2rem] p-6 md:p-7 border border-emerald-200/70 shadow-sm overflow-hidden">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-700 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-700/20 flex-shrink-0">
                <Medal size={26} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-base md:text-lg text-slate-900">حصاد الإنجاز القرآني التراكمي بالمدرسة</h4>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    موسم 2025-2026
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 font-medium leading-relaxed">
                  « إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ » — حصيلة التسميعات والسبر المحققة في حلقاتنا المباركة.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto text-center">
              <div className="bg-white/90 p-3.5 rounded-2xl border border-emerald-100 shadow-sm">
                <p className="text-[11px] text-slate-500 font-bold">جلسات التسميع</p>
                <p className="text-xl font-black text-emerald-800 mt-0.5">{memorization.length}</p>
              </div>
              <div className="bg-white/90 p-3.5 rounded-2xl border border-emerald-100 shadow-sm">
                <p className="text-[11px] text-slate-500 font-bold">الأحزاب المتقنة</p>
                <p className="text-xl font-black text-emerald-800 mt-0.5">{estimatedHizbsTotal} حزب</p>
              </div>
              <div className="bg-white/90 p-3.5 rounded-2xl border border-emerald-100 shadow-sm">
                <p className="text-[11px] text-slate-500 font-bold">ما يعادل تقريباً</p>
                <p className="text-xl font-black text-amber-600 mt-0.5">{Math.max(Number(khatmahsEquiv), 1)} ختمة 🌿</p>
              </div>
              <div className="bg-white/90 p-3.5 rounded-2xl border border-emerald-100 shadow-sm">
                <p className="text-[11px] text-slate-500 font-bold">امتحانات وسبر ناجح</p>
                <p className="text-xl font-black text-blue-700 mt-0.5">{examsPassedCount} سبر 📜</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content 2/3 and 1/3 Executive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main 2/3 Column: Visual Analytics & Live Recitations Stream */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Visual Analytics Dual-Chart Card */}
            <div className="bg-white p-6 md:p-7 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                    <BarChart2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">مؤشرات الأداء الأسبوعي (آخر 7 أيام)</h3>
                    <p className="text-xs text-slate-400">مقارنة بصرية يومية بين الحضور ونشاط التسميع</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl">
                    <span className="w-2 h-2 bg-emerald-600 rounded-full inline-block" /> حاضر
                  </span>
                  <span className="flex items-center gap-1 text-orange-700 bg-orange-50 px-2.5 py-1 rounded-xl">
                    <span className="w-2 h-2 bg-orange-400 rounded-full inline-block" /> متأخر
                  </span>
                  <span className="flex items-center gap-1 text-rose-700 bg-rose-50 px-2.5 py-1 rounded-xl">
                    <span className="w-2 h-2 bg-rose-400 rounded-full inline-block" /> غائب
                  </span>
                </div>
              </div>

              {/* Attendance Chart Grid */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                  <span>سجل الحضور والغياب اليومي:</span>
                  <span className="text-emerald-700 font-mono">اليوم: {presentTodayCount} حاضر</span>
                </div>
                <div className="h-44 flex items-end justify-between gap-3 pt-6 border-b border-slate-100 pb-3">
                  {attendanceData.map((d, i) => {
                    const presentHeight = (d.present / maxAtt) * 100;
                    const lateHeight = (d.late / maxAtt) * 100;
                    const absentHeight = (d.absent / maxAtt) * 100;
                    const excusedHeight = (d.excused / maxAtt) * 100;

                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                        {/* Tooltip on hover */}
                        <div className="absolute -top-12 bg-slate-900 text-white text-[10px] py-1.5 px-3 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none whitespace-nowrap shadow-xl font-sans">
                          {d.dateStr}: حاضر {d.present} | متأخر {d.late} | غائب {d.absent}
                        </div>

                        <div className="w-full max-w-[2.5rem] h-28 bg-slate-50 rounded-2xl flex flex-col justify-end overflow-hidden border border-slate-100 group-hover:border-emerald-400 transition-all shadow-inner">
                          <div style={{ height: `${absentHeight}%` }} className="bg-rose-400 w-full transition-all duration-500" />
                          <div style={{ height: `${excusedHeight}%` }} className="bg-purple-400 w-full transition-all duration-500" />
                          <div style={{ height: `${lateHeight}%` }} className="bg-orange-400 w-full transition-all duration-500" />
                          <div style={{ height: `${presentHeight}%` }} className="bg-emerald-600 w-full transition-all duration-500" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-600 truncate w-full text-center">{d.dayLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Memorization Activity mini bar */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                  <span className="flex items-center gap-1.5 text-amber-700">
                    <TrendingUp size={15} />
                    <span>كثافة جلسات التسميع لآخر 7 أيام:</span>
                  </span>
                  <span className="text-amber-700 font-bold bg-amber-50 px-2.5 py-0.5 rounded-full text-[11px] border border-amber-200">
                    مجموع الأسبوع: {memoData.reduce((acc, m) => acc + m.count, 0)} تسميع
                  </span>
                </div>
                <div className="h-32 flex items-end justify-between gap-3 pt-4">
                  {memoData.map((d, i) => {
                    const height = (d.count / maxMemo) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                        <div className="absolute -top-10 bg-slate-900 text-white text-[10px] py-1 px-2.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none whitespace-nowrap shadow-xl">
                          {d.count} جلسة تسميع
                        </div>
                        <div className="w-full max-w-[2.2rem] h-20 bg-amber-50/40 rounded-xl flex flex-col justify-end overflow-hidden border border-amber-100 group-hover:border-amber-400 transition-all shadow-inner">
                          <div 
                            style={{ height: `${Math.max(height, 6)}%` }} 
                            className="bg-gradient-to-t from-amber-500 via-amber-400 to-yellow-300 rounded-t-lg w-full transition-all duration-500" 
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 truncate w-full text-center">{d.dayLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Live Recitations Stream Card (Full Width in Main Column) */}
            <div className="bg-white p-6 md:p-7 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                    <History size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">سجل التسميعات الأخيرة المسجلة</h3>
                    <p className="text-xs text-slate-400">بث مباشر لنشاط الطلاب في الحلقات اليومية</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('memorization')}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-bold bg-emerald-50 hover:bg-emerald-100 px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1"
                >
                  <span>فتح وحدة التسميع</span>
                  <ChevronLeft size={14} />
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {memorization.slice(0, 6).map((memo) => {
                  const st = students.find(s => s.id === memo.studentId);
                  return (
                    <div 
                      key={memo.id} 
                      onClick={() => st && setSelectedStudentForDetails(st)}
                      className="py-3 px-2 hover:bg-emerald-50/40 rounded-2xl transition-all cursor-pointer group flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-100 to-teal-50 text-emerald-900 font-black flex items-center justify-center text-sm shadow-sm group-hover:scale-105 transition-transform flex-shrink-0">
                          {st?.name ? st.name.charAt(0) : 'ط'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition">
                              {st?.name || 'طالب محذوف'}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              #{st?.code || '--'}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 mt-0.5">
                            <BookOpen size={13} className="text-emerald-600" />
                            {memo.memoType === 'hizb' || memo.hizb ? getHizbDisplayString(memo) : `سورة ${memo.surah}`}
                            {memo.fromAyah && <span className="font-normal text-[11px] text-slate-500">(${memo.fromAyah} - ${memo.toAyah})</span>}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold shadow-sm whitespace-nowrap ${
                          memo.status === 'good' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          memo.status === 'review' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          memo.status === 'performance' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {memo.status === 'good' ? 'متقن ⭐' : memo.status === 'review' ? 'يحتاج ترسيخ ⚠️' : memo.status === 'performance' ? 'الأداء 📖' : 'غير متقن'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                          {memo.date ? format(new Date(memo.date), 'HH:mm', { locale: ar }) : '--'}
                        </span>
                        <ChevronLeft size={16} className="text-slate-300 group-hover:text-emerald-700 group-hover:translate-x-[-3px] transition-all" />
                      </div>
                    </div>
                  );
                })}

                {memorization.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <BookOpen size={36} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-bold">لا يوجد نشاط تسميع مسجل اليوم بعد</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Side 1/3 Column: Smart Follow-Up Alerts & Branch Snapshot & Launchpad */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Smart Follow-Up Alerts Radar */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black flex items-center gap-2 text-slate-900">
                  <BellRing size={17} className="text-orange-600 animate-pulse" />
                  <span>تنبيهات المتابعة الذكية ({smartNotifications.length})</span>
                </h3>
                <span className="text-[11px] text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded-full">
                  تلقائي
                </span>
              </div>

              {smartNotifications.length > 0 ? (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {smartNotifications.map(note => (
                    <div
                      key={note.id}
                      onClick={() => {
                        if (note.student) setSelectedStudentForDetails(note.student);
                        else if (note.tabTarget) setActiveTab(note.tabTarget);
                      }}
                      className="p-3 bg-gradient-to-l from-orange-50/40 to-white rounded-2xl border border-orange-100 hover:border-orange-300 hover:shadow-md transition-all cursor-pointer group space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          note.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {note.badge || 'تنبيه'}
                        </span>
                        <span className="text-[10px] text-slate-400 group-hover:text-emerald-700 font-bold flex items-center gap-1 transition-colors">
                          معالجة <ChevronLeft size={11} />
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 leading-relaxed">
                        {note.message}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-center space-y-1">
                  <CheckCircle size={22} className="mx-auto text-emerald-600 mb-1" />
                  <p className="font-bold text-xs text-emerald-950">كل الحلقات منتظمة</p>
                  <p className="text-[11px] text-emerald-700">لا توجد تنبيهات متأخرة اليوم.</p>
                </div>
              )}
            </div>

            {/* School Branches Snapshot */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black flex items-center gap-2 text-slate-900">
                  <School size={17} className="text-emerald-600" />
                  <span>فروع المدرسة المعتمدة</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">3 فروع</span>
              </div>

              <div className="space-y-2.5">
                {SCHOOL_BRANCHES.map(branch => {
                  const branchStudents = students.filter(s => s.branch === branch);
                  const branchTeachers = rawTeachers.filter(t => t.branch === branch);
                  return (
                    <div 
                      key={branch}
                      className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{branch}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{branchTeachers.length} أستاذ معتمد</p>
                      </div>
                      <span className="font-bold px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-emerald-800 font-mono">
                        {branchStudents.length} طالب
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Access Tiles to Modules */}
            <div className="grid grid-cols-2 gap-3">
              <div 
                onClick={() => setActiveTab('students')}
                className="p-4 bg-white rounded-2xl border border-slate-100 hover:border-emerald-400 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer text-center group"
              >
                <div className="w-11 h-11 mx-auto rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2 shadow-inner group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                  <Users size={20} />
                </div>
                <h4 className="font-black text-xs text-slate-900">شؤون الطلاب</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">البطاقات والمستويات</p>
              </div>

              <div 
                onClick={() => setActiveTab('exams')}
                className="p-4 bg-white rounded-2xl border border-slate-100 hover:border-purple-400 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer text-center group"
              >
                <div className="w-11 h-11 mx-auto rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-2 shadow-inner group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all">
                  <GraduationCap size={20} />
                </div>
                <h4 className="font-black text-xs text-slate-900">بنك الامتحانات</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">السبر والتأهيل</p>
              </div>

              <div 
                onClick={() => setActiveTab('review')}
                className="p-4 bg-white rounded-2xl border border-slate-100 hover:border-amber-400 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer text-center group"
              >
                <div className="w-11 h-11 mx-auto rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-2 shadow-inner group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all">
                  <RefreshCw size={20} />
                </div>
                <h4 className="font-black text-xs text-slate-900">خطة المراجعة</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">التثبيت والمتابعة</p>
              </div>

              <div 
                onClick={() => setActiveTab('subscriptions')}
                className="p-4 bg-white rounded-2xl border border-slate-100 hover:border-teal-400 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer text-center group"
              >
                <div className="w-11 h-11 mx-auto rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-2 shadow-inner group-hover:scale-110 group-hover:bg-teal-600 group-hover:text-white transition-all">
                  <CreditCard size={20} />
                </div>
                <h4 className="font-black text-xs text-slate-900">الاشتراكات</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">الوصولات والتحصيل</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  };

  const renderStudents = () => (
    selectedStudentForDetails ? renderStudentDetails(selectedStudentForDetails) : (
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex flex-wrap w-full lg:w-auto gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
              <input 
                type="text" 
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="بحث عن طالب (الاسم أو الكود)..." 
                className="w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
            
            {(role === 'admin' || (role === 'supervisor' && supervisorViewMode === 'all_supervised')) && (
              <>
                <select 
                  value={studentTabBranchFilter}
                  onChange={(e) => {
                    setStudentTabBranchFilter(e.target.value);
                    setStudentTabTeacherFilter('All'); // Reset teacher filter when branch changes
                  }}
                  className="px-4 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-primary outline-none text-sm"
                >
                  <option value="All">جميع المدارس</option>
                  {SCHOOL_BRANCHES.map(branch => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>

                <select 
                  value={studentTabTeacherFilter}
                  onChange={(e) => setStudentTabTeacherFilter(e.target.value)}
                  className="px-4 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-primary outline-none text-sm"
                >
                  <option value="All">جميع المعلمين</option>
                  {rawTeachers
                    .filter(t => studentTabBranchFilter === 'All' || t.branch === studentTabBranchFilter)
                    .map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </>
            )}
            
            <select 
              value={studentTabLevelFilter}
              onChange={(e) => setStudentTabLevelFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-primary outline-none text-sm"
            >
              <option value="All">جميع المستويات</option>
              {STUDENT_LEVELS.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {role === 'supervisor' && (
              <select 
                value={supervisorViewMode}
                onChange={(e) => setSupervisorViewMode(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm font-bold text-primary bg-primary/5"
              >
                <option value="my_students">طلبتي فقط</option>
                <option value="all_supervised">جميع طلبة الأقسام المشرف عليها</option>
              </select>
            )}
            <button 
              onClick={() => {
                setEditingStudent(null);
                setNewStudent({
                  name: '',
                  birthDate: '',
                  level: 'ابتدائي',
                  branch: user?.branch || SCHOOL_BRANCHES[0],
                  parentName: '',
                  parentEmail: '',
                  fatherPhone: '',
                  motherPhone: '',
                  spousePhone: '',
                  notes: '',
                  teacherId: '',
                  code: Math.random().toString(36).substring(2, 8).toUpperCase() 
                });
                setIsModalOpen(true);
              }}
              className="btn-primary w-full sm:w-auto"
            >
              <Plus size={18} />
              إضافة طالب جديد
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {students
            .filter(s => !(role === 'admin' || (role === 'supervisor' && supervisorViewMode === 'all_supervised')) || studentTabBranchFilter === 'All' || s.branch === studentTabBranchFilter)
            .filter(s => !(role === 'admin' || (role === 'supervisor' && supervisorViewMode === 'all_supervised')) || studentTabTeacherFilter === 'All' || s.teacherId === studentTabTeacherFilter)
            .filter(s => studentTabLevelFilter === 'All' || s.level === studentTabLevelFilter)
            .filter(s => 
              (s.name || '').includes(studentSearch) || 
              (s.code || '').includes(studentSearch)
            )
            .map(student => {
            const prog = calculateStudentProgress(student.id);
            return (
              <div key={student.id} className="card hover:border-primary transition-colors group">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-lg">{student.name}</h4>
                    <p className="text-sm text-gray-500">
                      {student.birthDate
                        ? `العمر: ${Math.floor((new Date() - new Date(student.birthDate)) / (365.25 * 24 * 60 * 60 * 1000))} سنة`
                        : student.age ? `العمر: ${student.age} سنة` : ''}
                      {student.level && ` - ${student.level}`}
                    </p>
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
                  {student.fatherPhone && <p className="text-xs">الأب: {student.fatherPhone}</p>}
                  {student.motherPhone && <p className="text-xs">الأم: {student.motherPhone}</p>}
                  {student.spousePhone && <p className="text-xs">زوج / زوجة: {student.spousePhone}</p>}
                  {/* Fallback for old data */}
                  {!student.fatherPhone && !student.motherPhone && student.phone && <p>الهاتف: {student.phone}</p>}
                  <p className="text-xs text-primary font-medium">الأحزاب المحفوظة: {prog.totalHizbs}</p>
                </div>
                
                <div className="flex flex-col gap-2 pt-4 border-t">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSelectedStudentForDetails(student)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary/5 text-primary hover:bg-primary/10 rounded-lg transition-colors font-bold text-sm"
                    >
                      <BarChart2 size={16} />
                      التقدم
                    </button>
                    <button 
                      onClick={() => setShowPraiseCard(student)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-yellow-50 text-yellow-600 hover:bg-yellow-100 rounded-lg transition-colors font-bold text-sm"
                    >
                      <Star size={16} />
                      استحسان
                    </button>
                  </div>
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
                    <label className="text-sm font-medium">تاريخ الميلاد</label>
                    <input 
                      type="date"
                      value={newStudent.birthDate || ''}
                      onChange={e => setNewStudent({...newStudent, birthDate: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">المستوى</label>
                    <select
                      value={newStudent.level}
                      onChange={e => setNewStudent({...newStudent, level: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-primary outline-none"
                    >
                      {STUDENT_LEVELS.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">كود الوالدين</label>
                  <input 
                    disabled
                    value={newStudent.code}
                    className="w-full px-4 py-2 border rounded-lg bg-gray-50 font-mono text-center" 
                  />
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
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-600 border-b pb-1">أرقام الاتصال</p>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">رقم الأب</label>
                    <input 
                      type="tel"
                      value={newStudent.fatherPhone || ''}
                      onChange={e => setNewStudent({...newStudent, fatherPhone: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                      placeholder="0XX XX XX XX XX"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">رقم الأم</label>
                    <input 
                      type="tel"
                      value={newStudent.motherPhone || ''}
                      onChange={e => setNewStudent({...newStudent, motherPhone: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                      placeholder="0XX XX XX XX XX"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">رقم الزوج / الزوجة <span className="text-gray-400 text-xs">(اختياري)</span></label>
                    <input 
                      type="tel"
                      value={newStudent.spousePhone || ''}
                      onChange={e => setNewStudent({...newStudent, spousePhone: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                      placeholder="0XX XX XX XX XX"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-blue-600">المدرسة (المركز)</label>
                  <select 
                    required
                    value={newStudent.branch || SCHOOL_BRANCHES[0]}
                    onChange={e => setNewStudent({...newStudent, branch: e.target.value, teacherId: role === 'admin' ? '' : newStudent.teacherId})}
                    className="w-full px-4 py-2 border-2 border-blue-100 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-blue-50"
                  >
                    {SCHOOL_BRANCHES.map(branch => (
                      <option key={branch} value={branch}>{branch}</option>
                    ))}
                  </select>
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
                      {rawTeachers.filter(t => t.branch === (newStudent.branch || SCHOOL_BRANCHES[0])).map(t => (
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

  const renderAttendance = () => {
    // 1. Daily Students Filtering
    const dailyFilteredStudents = students.filter(student => {
      if (attendanceBranchFilter !== 'All' && student.branch !== attendanceBranchFilter) return false;
      if (attendanceLevelFilter !== 'All' && student.level !== attendanceLevelFilter) return false;
      if (attendanceTeacherFilter !== 'All' && student.teacherId !== attendanceTeacherFilter) return false;
      if (attendanceSearch.trim()) {
        const q = attendanceSearch.toLowerCase().trim();
        const nameMatch = (student.name || '').toLowerCase().includes(q);
        const codeMatch = (student.code || '').toLowerCase().includes(q);
        if (!nameMatch && !codeMatch) return false;
      }
      return true;
    });

    // Daily stats for selected date
    const dailyStats = dailyFilteredStudents.reduce((acc, student) => {
      const rec = attendance.find(a => a.studentId === student.id && a.date === attendanceDate);
      if (rec) {
        if (rec.status === 'present') acc.present++;
        else if (rec.status === 'late') acc.late++;
        else if (rec.status === 'absent') acc.absent++;
        else if (rec.status === 'excused') acc.excused++;
        else if (rec.status === 'stopped') acc.stopped++;
      } else {
        acc.unrecorded++;
      }
      return acc;
    }, { present: 0, late: 0, absent: 0, excused: 0, stopped: 0, unrecorded: 0 });

    // 2. Attendance History Filtering
    const historyRecords = attendance.filter(rec => {
      const student = rawStudents.find(s => s.id === rec.studentId);
      if (!student) return false;

      // Filter by Teacher (direct on student or attendance record)
      if (attendanceTeacherFilter !== 'All') {
        const matchTeacher = student.teacherId === attendanceTeacherFilter || rec.teacherId === attendanceTeacherFilter;
        if (!matchTeacher) return false;
      }

      // Filter by School Branch
      if (attendanceBranchFilter !== 'All' && student.branch !== attendanceBranchFilter) {
        return false;
      }

      // Filter by Level
      if (attendanceLevelFilter !== 'All' && student.level !== attendanceLevelFilter) {
        return false;
      }

      // Filter by Status
      if (attendanceHistoryStatusFilter !== 'All' && rec.status !== attendanceHistoryStatusFilter) {
        return false;
      }

      // Filter by Date Range
      if (attendanceHistoryFromDate && rec.date < attendanceHistoryFromDate) return false;
      if (attendanceHistoryToDate && rec.date > attendanceHistoryToDate) return false;

      // Filter by Search
      if (attendanceSearch.trim()) {
        const q = attendanceSearch.toLowerCase().trim();
        const nameMatch = (student.name || '').toLowerCase().includes(q);
        const codeMatch = (student.code || '').toLowerCase().includes(q);
        if (!nameMatch && !codeMatch) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    // History Stats
    const historyPresentCount = historyRecords.filter(r => r.status === 'present' || r.status === 'late').length;
    const historyTotalCount = historyRecords.length;
    const historyRate = historyTotalCount > 0 ? Math.round((historyPresentCount / historyTotalCount) * 100) : 0;

    return (
      <div className="space-y-6">
        {/* Top Header & Sub-Tab Switcher */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl">
              <Calendar size={26} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">إدارة وسجل الحضور</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                تسجيل الحضور اليومي، تصفية تاريخ حضور الطلاب حسب الأستاذ والمستوى، وتصدير التقارير.
              </p>
            </div>
          </div>

          <div className="flex items-center bg-gray-100 p-1.5 rounded-2xl border">
            <button
              type="button"
              onClick={() => setAttendanceViewMode('daily')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                attendanceViewMode === 'daily'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar size={15} />
              <span>تسجيل الحضور اليومي</span>
            </button>
            <button
              type="button"
              onClick={() => setAttendanceViewMode('history')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                attendanceViewMode === 'history'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <History size={15} />
              <span>سجل الحضور التاريخي</span>
              {historyRecords.length > 0 && (
                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {historyRecords.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Global Filter Bar: Teacher, Branch, Level, Search */}
        <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
            <span className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
              <Users size={16} className="text-emerald-600" />
              تصفية الطلاب والحضور:
            </span>

            {/* Clear filters button */}
            {(attendanceTeacherFilter !== 'All' || attendanceBranchFilter !== 'All' || attendanceLevelFilter !== 'All' || attendanceSearch || attendanceHistoryStatusFilter !== 'All' || attendanceHistoryFromDate || attendanceHistoryToDate) && (
              <button
                type="button"
                onClick={() => {
                  setAttendanceTeacherFilter('All');
                  setAttendanceBranchFilter('All');
                  setAttendanceLevelFilter('All');
                  setAttendanceSearch('');
                  setAttendanceHistoryStatusFilter('All');
                  setAttendanceHistoryFromDate('');
                  setAttendanceHistoryToDate('');
                }}
                className="text-xs text-rose-600 hover:bg-rose-50 px-3 py-1 rounded-lg transition font-bold"
              >
                إلغاء جميع الفلاتر 🔄
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Teacher Filter (Professeur) */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1">الأستاذ المشرف:</label>
              <select
                value={attendanceTeacherFilter}
                onChange={(e) => setAttendanceTeacherFilter(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm font-bold text-emerald-800 outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="All">جميع الأساتذة ({rawTeachers.length})</option>
                {rawTeachers
                  .filter(t => attendanceBranchFilter === 'All' || t.branch === attendanceBranchFilter)
                  .map(t => {
                    const studentCount = rawStudents.filter(s => s.teacherId === t.id).length;
                    return (
                      <option key={t.id} value={t.id}>
                        {t.name} ({studentCount} طالب)
                      </option>
                    );
                  })}
              </select>
            </div>

            {/* 2. School Branch Filter */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1">المدرسة / الفرع:</label>
              <select
                value={attendanceBranchFilter}
                onChange={(e) => {
                  setAttendanceBranchFilter(e.target.value);
                  setAttendanceTeacherFilter('All');
                }}
                className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="All">جميع الفروع</option>
                {SCHOOL_BRANCHES.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* 3. Level Filter (Includes new levels!) */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1">المستوى الدراسي / القسم:</label>
              <select
                value={attendanceLevelFilter}
                onChange={(e) => setAttendanceLevelFilter(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="All">جميع المستويات والأقسام</option>
                {STUDENT_LEVELS.map(lvl => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>

            {/* 4. Search Filter */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1">بحث سريع:</label>
              <div className="relative">
                <Search className="absolute right-3 top-2.5 text-gray-400" size={16} />
                <input
                  type="text"
                  value={attendanceSearch}
                  onChange={(e) => setAttendanceSearch(e.target.value)}
                  placeholder="اسم أو كود الطالب..."
                  className="w-full pr-9 pl-3 py-2 bg-gray-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* VIEW 1: DAILY ATTENDANCE (تسجيل الحضور اليومي) */}
        {attendanceViewMode === 'daily' && (
          <div className="space-y-4">
            {/* Daily controls bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50 p-4 rounded-2xl border">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border shadow-sm">
                  <label className="text-sm font-bold text-gray-500">تاريخ الحضور:</label>
                  <input 
                    type="date" 
                    value={attendanceDate}
                    onChange={e => setAttendanceDate(e.target.value)}
                    className="outline-none border-none text-emerald-700 font-bold cursor-pointer bg-transparent"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setAttendanceDate(format(new Date(), 'yyyy-MM-dd'))}
                  className="px-3 py-2 bg-white text-xs font-bold text-gray-700 border rounded-xl hover:bg-gray-100 transition shadow-sm"
                >
                  اليوم
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleMarkAllPresent(dailyFilteredStudents)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 active:scale-95"
                >
                  <CheckCircle size={15} />
                  <span>تسجيل الكل حاضر ({dailyFilteredStudents.length})</span>
                </button>
              </div>
            </div>

            {/* Daily Stats KPI bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <div className="bg-white p-3 rounded-xl border text-center">
                <p className="text-[11px] text-gray-500">الطلاب بالقائمة</p>
                <p className="text-lg font-black text-gray-800">{dailyFilteredStudents.length}</p>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-center">
                <p className="text-[11px] text-emerald-700 font-bold">حاضر</p>
                <p className="text-lg font-black text-emerald-700">{dailyStats.present}</p>
              </div>
              <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 text-center">
                <p className="text-[11px] text-orange-700 font-bold">متأخر</p>
                <p className="text-lg font-black text-orange-700">{dailyStats.late}</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 text-center">
                <p className="text-[11px] text-purple-700 font-bold">غياب مبرر</p>
                <p className="text-lg font-black text-purple-700">{dailyStats.excused}</p>
              </div>
              <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 text-center">
                <p className="text-[11px] text-rose-700 font-bold">غائب</p>
                <p className="text-lg font-black text-rose-700">{dailyStats.absent}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border text-center">
                <p className="text-[11px] text-gray-500">لم يسجل بعد</p>
                <p className="text-lg font-black text-gray-600">{dailyStats.unrecorded}</p>
              </div>
            </div>

            {/* Students daily attendance list */}
            <div className="card divide-y overflow-hidden">
              {dailyFilteredStudents.map(student => {
                const studentAttendance = attendance.find(a => a.studentId === student.id && a.date === attendanceDate);
                const teacher = rawTeachers.find(t => t.id === student.teacherId);

                return (
                  <div key={student.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-gray-50/80 gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900">{student.name}</p>
                        <span className="text-xs text-gray-400 font-mono">#{student.code || '-'}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                        <span className="bg-gray-100 px-2 py-0.5 rounded font-medium text-gray-700">
                          {student.level || 'غير محدد'}
                        </span>
                        <span>• {student.branch}</span>
                        {teacher && <span className="text-emerald-700 font-semibold">• الأستاذ: {teacher.name}</span>}
                      </div>
                    </div>

                    <div className="flex gap-1.5 flex-wrap justify-end">
                      <button 
                        onClick={() => handleAttendance(student.id, 'present')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full border transition-all text-xs font-bold ${
                          studentAttendance?.status === 'present'
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                            : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        <CheckCircle size={14} />
                        <span>حاضر</span>
                      </button>

                      <button 
                        onClick={() => handleAttendance(student.id, 'late')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full border transition-all text-xs font-bold ${
                          studentAttendance?.status === 'late'
                            ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                            : 'border-orange-200 text-orange-600 hover:bg-orange-50'
                        }`}
                      >
                        <Calendar size={14} />
                        <span>متأخر</span>
                      </button>

                      <button 
                        onClick={() => handleAttendance(student.id, 'absent')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full border transition-all text-xs font-bold ${
                          studentAttendance?.status === 'absent'
                            ? 'bg-rose-600 border-rose-600 text-white shadow-sm'
                            : 'border-rose-200 text-rose-600 hover:bg-rose-50'
                        }`}
                      >
                        <XCircle size={14} />
                        <span>غائب</span>
                      </button>

                      <button 
                        onClick={() => handleAttendance(student.id, 'excused')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full border transition-all text-xs font-bold ${
                          studentAttendance?.status === 'excused'
                            ? 'bg-purple-600 border-purple-600 text-white shadow-sm'
                            : 'border-purple-200 text-purple-600 hover:bg-purple-50'
                        }`}
                      >
                        <AlertTriangle size={14} />
                        <span>غياب مبرر</span>
                      </button>

                      <button 
                        onClick={() => handleAttendance(student.id, 'stopped')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full border transition-all text-xs font-bold ${
                          studentAttendance?.status === 'stopped'
                            ? 'bg-gray-700 border-gray-700 text-white shadow-sm'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <XCircle size={14} className="rotate-45" />
                        <span>متوقف</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {dailyFilteredStudents.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Calendar size={40} className="mx-auto mb-2 opacity-30" />
                  <p className="font-bold">لا يوجد طلاب يطابقون خيارات التصفية الحالية</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: ATTENDANCE HISTORY (سجل الحضور التاريخي) */}
        {attendanceViewMode === 'history' && (
          <div className="space-y-4">
            {/* History specific controls */}
            <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                {/* Date From */}
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-gray-600">من تاريخ:</span>
                  <input
                    type="date"
                    value={attendanceHistoryFromDate}
                    onChange={e => setAttendanceHistoryFromDate(e.target.value)}
                    className="px-2.5 py-1.5 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                {/* Date To */}
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-gray-600">إلى تاريخ:</span>
                  <input
                    type="date"
                    value={attendanceHistoryToDate}
                    onChange={e => setAttendanceHistoryToDate(e.target.value)}
                    className="px-2.5 py-1.5 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-gray-600">الحالة:</span>
                  <select
                    value={attendanceHistoryStatusFilter}
                    onChange={e => setAttendanceHistoryStatusFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    <option value="All">جميع الحالات</option>
                    <option value="present">حاضر</option>
                    <option value="late">متأخر</option>
                    <option value="absent">غائب</option>
                    <option value="excused">غياب مبرر</option>
                    <option value="stopped">متوقف</option>
                  </select>
                </div>
              </div>

              {/* Export Excel Button */}
              <button
                type="button"
                onClick={() => handleExportAttendanceExcel(historyRecords)}
                disabled={historyRecords.length === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <Download size={15} />
                <span>تصدير Excel ({historyRecords.length} سجل)</span>
              </button>
            </div>

            {/* History KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-xl border text-center shadow-sm">
                <p className="text-xs text-gray-500">إجمالي سجلات الحضور</p>
                <p className="text-2xl font-black text-gray-800 mt-1">{historyTotalCount}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">حسب التصفية النشطة</p>
              </div>

              <div className="bg-white p-4 rounded-xl border text-center shadow-sm">
                <p className="text-xs text-gray-500">نسبة الحضور الإجمالية</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">{historyRate}%</p>
                <p className="text-[10px] text-emerald-600 mt-0.5">{historyPresentCount} حضور وتأخر</p>
              </div>

              <div className="bg-white p-4 rounded-xl border text-center shadow-sm">
                <p className="text-xs text-gray-500">الغياب غير المبرر</p>
                <p className="text-2xl font-black text-rose-600 mt-1">
                  {historyRecords.filter(r => r.status === 'absent').length}
                </p>
                <p className="text-[10px] text-rose-500 mt-0.5">سجل غياب</p>
              </div>

              <div className="bg-white p-4 rounded-xl border text-center shadow-sm">
                <p className="text-xs text-gray-500">الغياب المبرر</p>
                <p className="text-2xl font-black text-purple-600 mt-1">
                  {historyRecords.filter(r => r.status === 'excused').length}
                </p>
                <p className="text-[10px] text-purple-500 mt-0.5">غياب بإذن مسبق</p>
              </div>
            </div>

            {/* History Table */}
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <div className="p-4 bg-gray-50/70 border-b flex justify-between items-center">
                <p className="text-xs font-bold text-gray-700">
                  سجل العمليات التاريخية ({historyRecords.length} سجل)
                  {attendanceTeacherFilter !== 'All' && (
                    <span className="mr-2 text-emerald-700 font-bold">
                      - الأستاذ: {rawTeachers.find(t => t.id === attendanceTeacherFilter)?.name}
                    </span>
                  )}
                </p>
                <span className="text-[11px] text-gray-400">مرتب من الأحدث إلى الأقدم</span>
              </div>

              {historyRecords.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <History size={40} className="mx-auto mb-2 opacity-30" />
                  <p className="font-bold">لا يوجد سجلات حضور تطابق الفلاتر المحددة</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-gray-50 text-gray-500 uppercase font-bold border-b">
                      <tr>
                        <th className="py-3 px-4">التاريخ</th>
                        <th className="py-3 px-4">اسم الطالب</th>
                        <th className="py-3 px-4">المستوى & الفرع</th>
                        <th className="py-3 px-4">الأستاذ المشرف</th>
                        <th className="py-3 px-4 text-center">حالة الحضور</th>
                        <th className="py-3 px-4 text-center">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {historyRecords.map((rec) => {
                        const student = rawStudents.find(s => s.id === rec.studentId);
                        const teacher = rawTeachers.find(t => t.id === (rec.teacherId || student?.teacherId));

                        return (
                          <tr key={rec.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-gray-800">
                              {rec.date ? format(new Date(rec.date), 'yyyy-MM-dd') : '--'}
                            </td>

                            <td className="py-3 px-4">
                              <div className="font-bold text-gray-900">{student?.name || 'طالب محذوف'}</div>
                              <div className="text-[10px] text-gray-400 font-mono">#{student?.code || '-'}</div>
                            </td>

                            <td className="py-3 px-4">
                              <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded font-bold">
                                {student?.level || '--'}
                              </span>
                              <div className="text-[10px] text-gray-400 mt-0.5">{student?.branch}</div>
                            </td>

                            <td className="py-3 px-4 font-medium text-emerald-800">
                              {teacher ? teacher.name : '--'}
                            </td>

                            <td className="py-3 px-4 text-center">
                              <select
                                value={rec.status}
                                onChange={(e) => handleUpdateAttendanceRecord(rec.id, e.target.value)}
                                className={`px-2.5 py-1 rounded-full text-xs font-bold border outline-none cursor-pointer ${
                                  rec.status === 'present'
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : rec.status === 'late'
                                    ? 'bg-orange-100 text-orange-800 border-orange-300'
                                    : rec.status === 'excused'
                                    ? 'bg-purple-100 text-purple-800 border-purple-300'
                                    : rec.status === 'absent'
                                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                                    : 'bg-gray-100 text-gray-800 border-gray-300'
                                }`}
                              >
                                <option value="present">حاضر ✅</option>
                                <option value="late">متأخر ⏳</option>
                                <option value="excused">غياب مبرر 📝</option>
                                <option value="absent">غائب ❌</option>
                                <option value="stopped">متوقف ⏸️</option>
                              </select>
                            </td>

                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteAttendanceRecord(rec.id)}
                                title="حذف السجل"
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMemorization = () => (
    <div className="space-y-6">
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
             <div className="card sticky top-6">
                <h3 className="text-lg font-bold mb-4">تسجيل تسميع جديد</h3>
                <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                   <button 
                     type="button"
                     onClick={() => setNewMemo({...newMemo, memoType: 'surah'})}
                     className={`flex-1 py-1 text-sm rounded-md transition-all ${newMemo.memoType === 'surah' ? 'bg-white shadow text-primary font-bold' : 'text-gray-500 hover:bg-gray-200'}`}
                   >سورة</button>
                   <button 
                     type="button"
                     onClick={() => setNewMemo({...newMemo, memoType: 'hizb'})}
                     className={`flex-1 py-1 text-sm rounded-md transition-all ${newMemo.memoType === 'hizb' ? 'bg-white shadow text-primary font-bold' : 'text-gray-500 hover:bg-gray-200'}`}
                   >حزب</button>
                   <button 
                     type="button"
                     onClick={() => setNewMemo({...newMemo, memoType: 'hizb_range'})}
                     className={`flex-1 py-1 text-sm rounded-md transition-all ${newMemo.memoType === 'hizb_range' ? 'bg-white shadow text-primary font-bold' : 'text-gray-500 hover:bg-gray-200'}`}
                   >مجموعة أحزاب</button>
                </div>
                <form onSubmit={handleMemoSubmit} className="space-y-4">
                   <div className="space-y-1">
                      <label className="text-sm font-medium">اختر الطالب</label>
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

                   {newMemo.memoType === 'surah' ? (
                     <>
                       <div className="space-y-1">
                          <label className="text-sm font-medium">اسم السورة</label>
                          <select 
                            required
                            value={newMemo.surah}
                            onChange={e => {
                              const surahName = e.target.value;
                              const surahData = QURAN_DATA.find(s => s.name === surahName);
                              setNewMemo({
                                ...newMemo, 
                                surah: surahName,
                                fromAyah: newMemo.isFullSurah ? '1' : newMemo.fromAyah,
                                toAyah: newMemo.isFullSurah && surahData ? surahData.ayahs.toString() : newMemo.toAyah
                              });
                            }}
                            className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary"
                          >
                             <option value="">-- اختر السورة --</option>
                             {SURAH_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                       </div>
                       <div className="flex items-center gap-2 py-1">
                          <input 
                            type="checkbox" 
                            id="fullSurah" 
                            checked={newMemo.isFullSurah}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const surahData = QURAN_DATA.find(s => s.name === newMemo.surah);
                              setNewMemo(prev => ({
                                ...prev,
                                isFullSurah: checked,
                                fromAyah: checked ? '1' : prev.fromAyah,
                                toAyah: (checked && surahData) ? surahData.ayahs.toString() : prev.toAyah
                              }));
                            }}
                            className="w-4 h-4 text-primary rounded focus:ring-primary cursor-pointer"
                          />
                          <label htmlFor="fullSurah" className="text-sm font-bold text-primary cursor-pointer select-none border-b border-primary/20">تسميع السورة كاملة</label>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                             <label className="text-sm font-medium">من آية</label>
                             <input 
                               type="number" 
                               value={newMemo.fromAyah}
                               onChange={e => setNewMemo({...newMemo, fromAyah: e.target.value})}
                               className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-1 focus:ring-primary" 
                             />
                          </div>
                          <div className="space-y-1">
                             <label className="text-sm font-medium">إلى آية</label>
                             <input 
                               type="number" 
                               value={newMemo.toAyah}
                               onChange={e => setNewMemo({...newMemo, toAyah: e.target.value})}
                               className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-1 focus:ring-primary" 
                             />
                          </div>
                       </div>
                     </>
                   ) : newMemo.memoType === 'hizb' ? (
                     <div className="space-y-4">
                       <div className="space-y-1">
                          <label className="text-sm font-medium">رقم الحزب</label>
                          <select 
                            required
                            value={newMemo.hizb}
                            onChange={e => setNewMemo({...newMemo, hizb: e.target.value})}
                            className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary"
                          >
                             <option value="">-- اختر الحزب --</option>
                             {Array.from({length: 60}, (_, i) => i + 1).map(h => {
                                const start = HIZB_STARTS[h-1];
                                const sData = QURAN_DATA[start[0]-1];
                                 const phrase = HIZB_LABELS[h-1];
                                return (
                                  <option key={h} value={h}>
                                     {`الحزب ${h} - ${sData.name} : ${phrase}`}
                                  </option>
                                );
                             })}
                          </select>
                       </div>
                       {newMemo.hizb && (
                         <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1">
                             <label className="text-sm font-medium">من الثمن</label>
                             <select 
                               required
                               value={newMemo.fromThuman}
                               onChange={e => setNewMemo({...newMemo, fromThuman: e.target.value})}
                               className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"
                             >
                               {Array.from({length: 8}, (_, i) => i + 1).map(t => {
                                 const globalThumanIndex = ((newMemo.hizb - 1) * 8) + (t - 1);
                                 return (
                                   <option key={t} value={t}>
                                     {`الثمن ${t} - ${ATHMAN_STARTS[globalThumanIndex]}`}
                                   </option>
                                 );
                               })}
                             </select>
                           </div>
                           <div className="space-y-1">
                             <label className="text-sm font-medium">إلى الثمن</label>
                             <select 
                               required
                               value={newMemo.toThuman}
                               onChange={e => setNewMemo({...newMemo, toThuman: e.target.value})}
                               className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"
                             >
                               {Array.from({length: 8}, (_, i) => i + 1).map(t => {
                                 const globalThumanIndex = ((newMemo.hizb - 1) * 8) + (t - 1);
                                 return (
                                   <option key={t} value={t}>
                                     {`الثمن ${t} - ${ATHMAN_STARTS[globalThumanIndex]}`}
                                   </option>
                                 );
                               })}
                             </select>
                           </div>
                         </div>
                       )}
                     </div>
                   ) : (
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <label className="text-sm font-medium">من الحزب</label>
                           <select 
                             required
                             value={newMemo.fromHizbRange}
                             onChange={e => setNewMemo({...newMemo, fromHizbRange: e.target.value})}
                             className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary"
                           >
                              <option value="">-- البداية --</option>
                              {Array.from({length: 60}, (_, i) => i + 1).map(h => <option key={h} value={h}>{h}</option>)}
                           </select>
                        </div>
                        <div className="space-y-1">
                           <label className="text-sm font-medium">إلى الحزب</label>
                           <select 
                             required
                             value={newMemo.toHizbRange}
                             onChange={e => setNewMemo({...newMemo, toHizbRange: e.target.value})}
                             className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary"
                           >
                              <option value="">-- النهاية --</option>
                              {Array.from({length: 60}, (_, i) => i + 1).map(h => <option key={h} value={h}>{h}</option>)}
                           </select>
                        </div>
                     </div>
                   )}

                   <div className="space-y-1">
                      <label className="text-sm font-medium">التقييم</label>
                      <div className="flex gap-2">
                         {['good', 'review', 'weak', 'performance'].map((stat) => (
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
                                ${stat === 'performance' ? 'bg-blue-50 text-blue-700 peer-checked:bg-blue-200' : ''}
                              `}>
                                {stat === 'good' ? 'جيد' : stat === 'review' ? 'يحتاج الى ترسيخ' : stat === 'weak' ? 'حفظ غير متقن' : 'الأداء'}
                              </div>
                           </label>
                         ))}
                      </div>
                   </div>
                   <div className="space-y-1">
                      <label className="text-sm font-medium">ملاحظة (اختياري)</label>
                      <input 
                        type="text"
                        value={newMemo.notes || ''}
                        onChange={e => setNewMemo({...newMemo, notes: e.target.value})}
                        className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary"
                        placeholder="اكتب ملاحظة حول مستوى الطالب..."
                      />
                   </div>
                   <button type="submit" className="btn-primary w-full py-3 shadow-lg shadow-primary/20">حفظ السجل</button>
                </form>
             </div>
          </div>
          <div className="lg:col-span-2 space-y-4">
             <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold">آخر سجلات التسميع</h3>
                <History size={20} className="text-gray-400" />
             </div>
             <div className="space-y-3">
                {memorization.map((memo) => (
                   <div key={memo.id} className="card p-4 hover:border-primary transition-colors hover:shadow-md">
                      <div className="flex justify-between items-start">
                         <div>
                            <p className="font-bold text-primary">
                               {students.find(s => s.id === memo.studentId)?.name || 'طالب محذوف'}
                            </p>
                            <p className="text-sm font-medium mt-1">
                               {memo.memoType === 'hizb' || memo.hizb ? (
                                  <span className="text-primary-dark font-bold">{getHizbDisplayString(memo)}</span>
                               ) : (
                                  <>
                                     سورة {memo.surah} 
                                     <span className="text-gray-400 mr-2 text-xs">
                                        (من {memo.fromAyah} إلى {memo.toAyah})
                                     </span>
                                  </>
                               )}
                            </p>
                            {memo.notes && (
                               <p className="text-xs text-gray-500 mt-1">
                                  <span className="font-bold">ملاحظة:</span> {memo.notes}
                               </p>
                            )}
                         </div>
                         <div className="text-left text-[10px] text-gray-400">
                            {memo.date ? format(new Date(memo.date), 'dd/MM/yyyy HH:mm', { locale: ar }) : '--'}
                         </div>
                      </div>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t">
                         <div className={`text-xs px-2 py-1 rounded-full ${
                            memo.status === 'good' ? 'bg-green-100 text-green-700' :
                            memo.status === 'review' ? 'bg-yellow-100 text-yellow-700' :
                            memo.status === 'performance' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                         }`}>
                            {memo.status === 'good' ? 'جيد' : memo.status === 'review' ? 'يحتاج الى ترسيخ' : memo.status === 'performance' ? 'الأداء' : 'حفظ غير متقن'}
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
  );

  const renderReview = () => {
    const pendingReviews = reviews.filter(r => r.status === 'pending');
    const completedReviews = reviews.filter(r => r.status !== 'pending');

    return (
    <div className="space-y-6">
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
             <div className="card sticky top-6">
                <h3 className="text-lg font-bold mb-4">جدولة مراجعة</h3>
                <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                   <button 
                     type="button"
                     onClick={() => setNewReview({...newReview, memoType: 'surah'})}
                     className={`flex-1 py-1 text-sm rounded-md transition-all ${newReview.memoType === 'surah' ? 'bg-white shadow text-primary font-bold' : 'text-gray-500 hover:bg-gray-200'}`}
                   >سورة</button>
                   <button 
                     type="button"
                     onClick={() => setNewReview({...newReview, memoType: 'hizb'})}
                     className={`flex-1 py-1 text-sm rounded-md transition-all ${newReview.memoType === 'hizb' ? 'bg-white shadow text-primary font-bold' : 'text-gray-500 hover:bg-gray-200'}`}
                   >حزب</button>
                </div>
                <form onSubmit={handleAssignReview} className="space-y-4">
                   <div className="space-y-1">
                      <label className="text-sm font-medium">اختر الطالب</label>
                      <select 
                        required
                        value={newReview.studentId}
                        onChange={e => setNewReview({...newReview, studentId: e.target.value})}
                        className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary"
                      >
                         <option value="">-- اختر طالب --</option>
                         {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                   </div>

                   {newReview.memoType === 'surah' ? (
                     <>
                       <div className="space-y-1">
                          <label className="text-sm font-medium">اسم السورة</label>
                          <select 
                            required
                            value={newReview.surah}
                            onChange={e => {
                              const surahName = e.target.value;
                              const surahData = QURAN_DATA.find(s => s.name === surahName);
                              setNewReview({
                                ...newReview, 
                                surah: surahName,
                                fromAyah: newReview.isFullSurah ? '1' : newReview.fromAyah,
                                toAyah: (newReview.isFullSurah && surahData) ? surahData.ayahs.toString() : newReview.toAyah
                              });
                            }}
                            className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary"
                          >
                             <option value="">-- اختر السورة --</option>
                             {SURAH_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                       </div>
                       <div className="flex items-center gap-2 py-1">
                          <input 
                            type="checkbox" 
                            id="fullSurahRev" 
                            checked={newReview.isFullSurah}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const surahData = QURAN_DATA.find(s => s.name === newReview.surah);
                              setNewReview(prev => ({
                                ...prev,
                                isFullSurah: checked,
                                fromAyah: checked ? '1' : prev.fromAyah,
                                toAyah: (checked && surahData) ? surahData.ayahs.toString() : prev.toAyah
                              }));
                            }}
                            className="w-4 h-4 text-primary rounded focus:ring-primary cursor-pointer"
                          />
                          <label htmlFor="fullSurahRev" className="text-sm font-bold text-primary cursor-pointer select-none border-b border-primary/20">مراجعة السورة كاملة</label>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                             <label className="text-sm font-medium">من آية</label>
                             <input 
                               type="number" 
                               value={newReview.fromAyah}
                               onChange={e => setNewReview({...newReview, fromAyah: e.target.value})}
                               className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-1 focus:ring-primary" 
                             />
                          </div>
                          <div className="space-y-1">
                             <label className="text-sm font-medium">إلى آية</label>
                             <input 
                               type="number" 
                               value={newReview.toAyah}
                               onChange={e => setNewReview({...newReview, toAyah: e.target.value})}
                               className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-1 focus:ring-primary" 
                             />
                          </div>
                       </div>
                     </>
                   ) : (
                     <div className="space-y-4">
                       <div className="space-y-1">
                          <label className="text-sm font-medium">رقم الحزب</label>
                          <select 
                            required
                            value={newReview.hizb}
                            onChange={e => setNewReview({...newReview, hizb: e.target.value})}
                            className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary"
                          >
                             <option value="">-- اختر الحزب --</option>
                             {Array.from({length: 60}, (_, i) => i + 1).map(h => {
                                const start = HIZB_STARTS[h-1];
                                const sData = QURAN_DATA[start[0]-1];
                                const phrase = HIZB_LABELS[h-1];
                                return (
                                  <option key={h} value={h}>
                                     {`الحزب ${h} - ${sData.name} : ${phrase}`}
                                  </option>
                                );
                             })}
                          </select>
                       </div>
                       {newReview.hizb && (
                         <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1">
                             <label className="text-sm font-medium">من الثمن</label>
                             <select 
                               required
                               value={newReview.fromThuman}
                               onChange={e => setNewReview({...newReview, fromThuman: e.target.value})}
                               className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"
                             >
                               {Array.from({length: 8}, (_, i) => i + 1).map(t => {
                                 const globalThumanIndex = ((newReview.hizb - 1) * 8) + (t - 1);
                                 return (
                                   <option key={t} value={t}>
                                     {`الثمن ${t} - ${ATHMAN_STARTS[globalThumanIndex]}`}
                                   </option>
                                 );
                               })}
                             </select>
                           </div>
                           <div className="space-y-1">
                             <label className="text-sm font-medium">إلى الثمن</label>
                             <select 
                               required
                               value={newReview.toThuman}
                               onChange={e => setNewReview({...newReview, toThuman: e.target.value})}
                               className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"
                             >
                               {Array.from({length: 8}, (_, i) => i + 1).map(t => {
                                 const globalThumanIndex = ((newReview.hizb - 1) * 8) + (t - 1);
                                 return (
                                   <option key={t} value={t}>
                                     {`الثمن ${t} - ${ATHMAN_STARTS[globalThumanIndex]}`}
                                   </option>
                                 );
                               })}
                             </select>
                           </div>
                         </div>
                       )}
                     </div>
                   )}
                   <button type="submit" className="btn-primary w-full py-3 shadow-lg shadow-primary/20 bg-blue-600 hover:bg-blue-700">تعيين مراجعة</button>
                </form>
             </div>
          </div>
          
          <div className="lg:col-span-2 space-y-6">
             {/* Pending Reviews */}
             <div>
               <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-bold text-orange-600">المراجعات المجدولة</h3>
                  <RefreshCw size={20} className="text-orange-400" />
               </div>
               <div className="space-y-3">
                  {pendingReviews.map((rev) => (
                     <div key={rev.id} className="card p-4 border-l-4 border-orange-500 hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-3">
                           <div>
                              <p className="font-bold text-gray-800">
                                 {students.find(s => s.id === rev.studentId)?.name || 'طالب محذوف'}
                              </p>
                              <p className="text-sm font-medium mt-1">
                                 {rev.memoType === 'hizb' || rev.hizb ? (
                                    <span className="text-primary-dark font-bold">{getHizbDisplayString(rev)}</span>
                                 ) : (
                                    <>
                                       سورة {rev.surah} 
                                       <span className="text-gray-400 mr-2 text-xs">
                                          (من {rev.fromAyah} إلى {rev.toAyah})
                                       </span>
                                    </>
                                 )}
                              </p>
                           </div>
                           <button onClick={() => handleDeleteReview(rev.id)} className="text-gray-300 hover:text-red-500">
                              <Trash2 size={14} />
                           </button>
                        </div>
                        <div className="pt-3 border-t flex flex-col gap-2 bg-orange-50/50 p-2 rounded-lg">
                           <input 
                              type="text"
                              placeholder="ملاحظة (اختياري)..."
                              value={reviewNotes[rev.id] || ''}
                              onChange={(e) => setReviewNotes({...reviewNotes, [rev.id]: e.target.value})}
                              className="w-full px-2 py-1.5 text-xs border rounded outline-none focus:ring-1 focus:ring-primary bg-white"
                           />
                           <div className="flex flex-col sm:flex-row gap-2 justify-between items-center w-full">
                              <span className="text-xs text-orange-600 font-medium">قيّم المراجعة:</span>
                              <div className="flex gap-2 w-full sm:w-auto">
                                 <button onClick={() => handleEvaluateReview(rev.id, 'good')} className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold rounded-md bg-green-100 text-green-700 hover:bg-green-200 transition-colors">جيد</button>
                                 <button onClick={() => handleEvaluateReview(rev.id, 'review')} className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold rounded-md bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition-colors">يحتاج الى ترسيخ</button>
                                 <button onClick={() => handleEvaluateReview(rev.id, 'performance')} className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors">الأداء</button>
                                 <button onClick={() => handleEvaluateReview(rev.id, 'weak')} className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors">حفظ غير متقن</button>
                              </div>
                           </div>
                        </div>
                     </div>
                  ))}
                  {pendingReviews.length === 0 && (
                     <div className="text-center text-gray-400 py-8 bg-white rounded-2xl border border-dashed">
                        لا يوجد مراجعات مجدولة حالياً
                     </div>
                  )}
               </div>
             </div>

             {/* Completed Reviews */}
             <div>
               <h3 className="text-lg font-bold mb-3 text-gray-600">سجل المراجعات المكتملة</h3>
               <div className="space-y-3">
                  {completedReviews.map((rev) => (
                     <div key={rev.id} className="card p-4 opacity-80 hover:opacity-100 transition-opacity">
                        <div className="flex justify-between items-start">
                           <div>
                              <p className="font-bold text-gray-700">
                                 {students.find(s => s.id === rev.studentId)?.name || 'طالب محذوف'}
                              </p>
                              <p className="text-sm font-medium mt-1">
                                 {rev.memoType === 'hizb' || rev.hizb ? (
                                    <span className="text-primary-dark font-bold">{getHizbDisplayString(rev)}</span>
                                 ) : (
                                    <>
                                       سورة {rev.surah} 
                                       <span className="text-gray-400 mr-2 text-xs">
                                          (من {rev.fromAyah} إلى {rev.toAyah})
                                       </span>
                                    </>
                                 )}
                              </p>
                              {rev.notes && (
                                 <p className="text-xs text-gray-500 mt-1">
                                    <span className="font-bold">ملاحظة:</span> {rev.notes}
                                 </p>
                              )}
                           </div>
                           <div className="text-left text-[10px] text-gray-400">
                              {rev.completedDate ? format(new Date(rev.completedDate), 'dd/MM/yyyy HH:mm', { locale: ar }) : '--'}
                           </div>
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-3 border-t">
                           <div className={`text-xs px-2 py-1 rounded-full ${
                              rev.status === 'good' ? 'bg-green-100 text-green-700' :
                              rev.status === 'review' ? 'bg-yellow-100 text-yellow-700' : 
                              rev.status === 'performance' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                           }`}>
                              {rev.status === 'good' ? 'جيد' : rev.status === 'review' ? 'يحتاج الى ترسيخ' : rev.status === 'performance' ? 'الأداء' : 'حفظ غير متقن'}
                           </div>
                           <button onClick={() => handleDeleteReview(rev.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                              <Trash2 size={14} />
                           </button>
                        </div>
                     </div>
                  ))}
                  {completedReviews.length === 0 && (
                     <div className="text-center text-gray-400 py-8 bg-white rounded-2xl">
                        لا يوجد سجل مراجعات
                     </div>
                  )}
               </div>
             </div>

          </div>
       </div>
    </div>
    );
  };

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
            <div className="flex justify-between items-center no-print">
               <button 
                  onClick={() => setSelectedParentStudent(null)}
                  className="text-primary flex items-center gap-2 hover:underline"
               >
                  ← العودة للبحث
               </button>
               <button 
                  onClick={() => window.print()}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 text-sm font-bold"
               >
                  <Printer size={16} />
                  طباعة التقرير
               </button>
            </div>
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

            <VisualQuran progressSurahs={calculateProgress(parentData.memorization).surahs} />

            {(() => {
               const badges = getStudentBadges(selectedParentStudent.id);
               if (badges.length === 0) return null;
               return (
                 <div className="card border-t-4 border-t-yellow-400 bg-gradient-to-l from-yellow-50/50 to-white">
                   <h4 className="font-bold border-b pb-4 mb-4 flex items-center gap-2 text-gray-800">
                     <Award size={20} className="text-yellow-500" />
                     الشارات والإنجازات
                   </h4>
                   <div className="flex flex-wrap gap-4">
                     {badges.map(b => (
                       <div key={b.id} className="flex items-center gap-3 p-3 rounded-2xl border bg-white shadow-sm">
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
               );
            })()}

            <div className="card">
               <h4 className="font-bold border-b pb-2 mb-4">سجل الحفظ</h4>
               <div className="space-y-4 max-h-64 overflow-y-auto">
                  {parentData.memorization.map((m, i) => (
                    <div key={i} className="flex justify-between items-center border-b pb-2 last:border-0">
                       <div>
                          <p className="font-medium text-gray-800">
                             {m.memoType === 'hizb' || m.hizb ? getHizbDisplayString(m) : `سورة ${m.surah}`}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 flex gap-2">
                             <span>{m.memoType === 'hizb' || m.hizb ? '' : `من الآية ${m.fromAyah} إلى ${m.toAyah}`}</span>
                             <span className="text-gray-400">|</span>
                             <span>{m.date ? new Date(m.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : m.date}</span>
                          </p>
                       </div>
                       <div className={`text-xs px-2 py-1 rounded-full ${
                          m.status === 'good' ? 'bg-green-100 text-green-700' :
                          m.status === 'review' ? 'bg-yellow-100 text-yellow-700' : 
                          m.status === 'performance' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                       }`}>
                          {m.status === 'good' ? 'جيد' : m.status === 'review' ? 'يحتاج الى ترسيخ' : m.status === 'performance' ? 'الأداء' : 'حفظ غير متقن'}
                       </div>
                    </div>
                  ))}
                  {parentData.memorization.length === 0 && (
                    <p className="text-center text-gray-400 py-4">لا يوجد سجلات حفظ</p>
                  )}
               </div>
            </div>

            <div className="card">
               <h4 className="font-bold border-b pb-2 mb-4">سجل الامتحانات (السبر)</h4>
               <div className="space-y-4 max-h-64 overflow-y-auto">
                  {parentData.exams && parentData.exams.map((ex, i) => (
                    <div key={i} className="flex justify-between items-center border-b pb-2 last:border-0">
                       <div>
                          <p className="font-medium text-primary">
                             {ex.examType === 'hizb' ? `امتحان الحزب ${ex.hizb}` : `امتحان سورة ${ex.surah}`}
                          </p>
                          <p className="text-[10px] text-gray-400">
                             تاريخ: {ex.date ? new Date(ex.date).toLocaleDateString('ar-EG') : '--'}
                          </p>
                       </div>
                       <div className={`text-xs px-2 py-1 rounded-full font-bold ${
                          Number(ex.score) >= 90 ? 'bg-green-100 text-green-700' : 
                          Number(ex.score) >= 70 ? 'bg-blue-100 text-blue-700' : 
                          Number(ex.score) >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                       }`}>
                          {ex.score} / 100
                       </div>
                    </div>
                  ))}
                  {(!parentData.exams || parentData.exams.length === 0) && (
                    <p className="text-center text-gray-400 py-4">لا يوجد امتحانات مسجلة</p>
                  )}
               </div>
            </div>

            <div className="card">
               <h4 className="font-bold border-b pb-2 mb-4">المراجعات المطلوبة والمكتملة</h4>
               <div className="space-y-4 max-h-64 overflow-y-auto">
                  {parentData.reviews && parentData.reviews.map((r, i) => (
                    <div key={i} className="flex justify-between items-center border-b pb-2 last:border-0">
                       <div>
                          <p className="font-medium text-primary">
                             {r.memoType === 'hizb' || r.hizb ? getHizbDisplayString(r) : `سورة ${r.surah} (من ${r.fromAyah} إلى ${r.toAyah})`}
                          </p>
                          <p className="text-[10px] text-gray-400">
                             تاريخ: {r.assignedDate ? new Date(r.assignedDate).toLocaleDateString('ar-EG') : '--'}
                          </p>
                       </div>
                       <div className={`text-xs px-2 py-1 rounded-full ${
                          r.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                          r.status === 'good' ? 'bg-green-100 text-green-700' :
                          r.status === 'review' ? 'bg-yellow-100 text-yellow-700' : 
                          r.status === 'performance' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                       }`}>
                          {r.status === 'pending' ? 'قيد الانتظار' : 
                           r.status === 'good' ? 'جيد' : 
                           r.status === 'review' ? 'يحتاج الى ترسيخ' : 
                           r.status === 'performance' ? 'الأداء' : 'حفظ غير متقن'}
                       </div>
                    </div>
                  ))}
                  {(!parentData.reviews || parentData.reviews.length === 0) && (
                    <p className="text-center text-gray-400 py-4">لا يوجد مراجعات مسجلة</p>
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
                          a.status === 'excused' ? 'text-purple-600' :
                          a.status === 'absent' ? 'text-red-600' : 'text-gray-500'
                       }`}>
                          {a.status === 'present' && 'حاضر'}
                          {a.status === 'late' && 'متأخر'}
                          {a.status === 'excused' && 'غياب مبرر'}
                          {a.status === 'absent' && 'غائب'}
                          {a.status === 'stopped' && 'متوقف'}
                       </span>
                    </div>
                  ))}
               </div>
            </div>

            <div className="card">
               <h4 className="font-bold border-b pb-2 mb-4 text-primary">ملاحظات المعلم</h4>
               <div className="space-y-3">
                  {selectedParentStudent.parentRemarks && selectedParentStudent.parentRemarks.length > 0 ? (
                    [...selectedParentStudent.parentRemarks].reverse().map((rem, i) => (
                      <div key={i} className="bg-gray-50 p-3 rounded-lg border text-sm">
                        <p className="text-gray-800 leading-relaxed">{rem.text}</p>
                        <div className="flex justify-between items-center mt-2 text-[10px] text-gray-500">
                          <span>{rem.teacherName}</span>
                          <span>{new Date(rem.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-400 py-4 text-sm">لا توجد ملاحظات مسجلة</p>
                  )}
               </div>
            </div>
         </div>
       )}
    </div>
  );

  const renderAdmin = () => (
    <div className="space-y-8">
       {/* Filters */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border">
            <h3 className="font-bold text-gray-700">تصفية حسب المدرسة:</h3>
            <select 
               value={adminBranchFilter}
               onChange={(e) => {
                 setAdminBranchFilter(e.target.value);
                 setAdminTeacherFilter('All'); // Reset teacher filter when school changes
               }}
               className="px-4 py-2 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-primary outline-none"
            >
               <option value="All">جميع المدارس</option>
               {SCHOOL_BRANCHES.map(branch => (
                 <option key={branch} value={branch}>{branch}</option>
               ))}
            </select>
         </div>

         <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border">
            <h3 className="font-bold text-gray-700">تصفية حسب المعلم:</h3>
            <select 
               value={adminTeacherFilter}
               onChange={(e) => setAdminTeacherFilter(e.target.value)}
               className="px-4 py-2 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-primary outline-none max-w-[200px]"
            >
               <option value="All">جميع المعلمين</option>
               {teachers.map(t => (
                 <option key={t.id} value={t.id}>{t.name}</option>
               ))}
            </select>
         </div>
       </div>

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
          <div className="mt-6 flex flex-wrap gap-4 justify-end">
             <button 
                onClick={handleExportToExcel}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-3 rounded-lg transition-colors text-sm shadow-lg"
             >
                <Download size={18} />
                تصدير التقارير (Excel)
             </button>
             <button 
                onClick={handleExportData}
                className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold px-6 py-3 rounded-lg transition-colors text-sm shadow-lg"
             >
                <Download size={18} />
                تحميل نسخة احتياطية (JSON)
             </button>
          </div>
       </div>

       <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {role === 'admin' && (
             <div className="xl:col-span-1">
             <div className="card sticky top-6">
                <h4 className="font-bold border-b pb-4 mb-4 flex items-center gap-2">
                   {editingTeacher ? (
                      <><Edit2 size={20} className="text-primary" /> تعديل بيانات المعلم</>
                   ) : (
                      <><Plus size={20} className="text-primary" /> إضافة معلم جديد</>
                   )}
                </h4>
                <form onSubmit={handleSaveTeacher} className="space-y-4">
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
                      <label className="text-sm font-medium">الرتبة (الدور)</label>
                      <select
                        value={newTeacher.role}
                        onChange={e => setNewTeacher({...newTeacher, role: e.target.value})}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white"
                      >
                        <option value="teacher">أستاذ</option>
                        <option value="supervisor">مشرف</option>
                        <option value="admin">مدير</option>
                      </select>
                   </div>
                   <div className="space-y-1">
                      <label className="text-sm font-medium">المدرسة (الفرع)</label>
                      <select
                        value={newTeacher.branch}
                        onChange={e => setNewTeacher({...newTeacher, branch: e.target.value})}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white"
                      >
                        {SCHOOL_BRANCHES.map(branch => (
                          <option key={branch} value={branch}>{branch}</option>
                        ))}
                      </select>
                   </div>
                   {newTeacher.role === 'supervisor' ? (
                     <div className="space-y-2">
                        <label className="text-sm font-medium">الأقسام المشرف عليها</label>
                        <div className="grid grid-cols-2 gap-2">
                           {STUDENT_LEVELS.map(level => (
                             <label key={level} className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded-lg border cursor-pointer hover:bg-green-50 transition-colors">
                               <input 
                                 type="checkbox" 
                                 checked={Array.isArray(newTeacher.supervisedLevel) ? newTeacher.supervisedLevel.includes(level) : newTeacher.supervisedLevel === level}
                                 onChange={(e) => {
                                   const checked = e.target.checked;
                                   const current = Array.isArray(newTeacher.supervisedLevel) ? newTeacher.supervisedLevel : (newTeacher.supervisedLevel ? [newTeacher.supervisedLevel] : []);
                                   setNewTeacher({
                                     ...newTeacher,
                                     supervisedLevel: checked ? [...current, level] : current.filter(l => l !== level)
                                   });
                                 }}
                                 className="w-4 h-4 text-primary rounded border-gray-300"
                               />
                               {level}
                             </label>
                           ))}
                        </div>
                     </div>
                   ) : (
                     <div className="space-y-1">
                        <label className="text-sm font-medium">القسم الذي يدرّسه</label>
                        <select
                          value={newTeacher.level}
                          onChange={e => setNewTeacher({...newTeacher, level: e.target.value})}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white"
                        >
                          {STUDENT_LEVELS.map(level => (
                            <option key={level} value={level}>{level}</option>
                          ))}
                        </select>
                     </div>
                   )}
                   {!editingTeacher && (
                     <>
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
                     </>
                   )}
                   <button type="submit" className="btn-primary w-full py-3 mt-4 text-sm font-bold">
                      {editingTeacher ? 'حفظ التعديلات' : 'إنشاء حساب المعلم'}
                   </button>
                   {editingTeacher && (
                      <button 
                        type="button" 
                        onClick={() => {
                          setEditingTeacher(null);
                          setNewTeacher({ name: '', email: '', password: '', branch: SCHOOL_BRANCHES[0] });
                        }} 
                        className="w-full py-2 mt-2 text-sm font-bold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                         إلغاء التعديل
                      </button>
                   )}
                   {!editingTeacher && (
                     <p className="text-[10px] text-gray-400 text-center leading-relaxed mt-2">
                        * سيتم إنشاء الحساب في Firebase Auth وإضافته لقاعدة البيانات كمعلم.
                     </p>
                   )}
                </form>
             </div>
          </div>
          )}

          <div className={role === 'admin' ? "xl:col-span-2" : "xl:col-span-3"}>
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
                            <th className="pb-4 pr-2">الرتبة</th>
                            <th className="pb-4 pr-2">الفرع / القسم</th>
                            <th className="pb-4 pr-2">تاريخ الانضمام</th>
                            <th className="pb-4 pr-2">الإجراءات</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y">
                         {teachers.map(t => (
                           <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                              <td className="py-4 pr-2">
                                 <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs text-white font-bold ${t.role === 'admin' ? 'bg-purple-500' : t.role === 'supervisor' ? 'bg-orange-500' : 'bg-primary'}`}>
                                       {t.name?.charAt(0) || 'M'}
                                    </div>
                                    <span className="font-medium text-sm">{t.name}</span>
                                 </div>
                              </td>
                              <td className="py-4 pr-2 text-xs text-gray-500 font-mono">{t.email}</td>
                              <td className="py-4 pr-2 text-xs font-bold text-gray-600">
                                {t.role === 'admin' ? 'مدير' : t.role === 'supervisor' ? 'مشرف' : 'أستاذ'}
                              </td>
                              <td className="py-4 pr-2">
                                 <div className="text-xs font-bold text-primary">{t.branch || 'Ecole Edimco'}</div>
                                 <div className="text-xs text-gray-500 mt-1">
                                   {t.role === 'supervisor' ? (Array.isArray(t.supervisedLevel) ? t.supervisedLevel.join(" - ") : t.supervisedLevel) : t.level || 'غير محدد'}
                                 </div>
                              </td>
                              <td className="py-4 pr-2 text-xs text-gray-400">
                                 {t.createdAt ? format(new Date(t.createdAt), 'yyyy/MM/dd') : '--'}
                              </td>
                              <td className="py-4 pr-2 flex gap-2">
                                 <button 
                                    onClick={() => {
                                      setSelectedTeacherForRemark(t);
                                      setShowTeacherRemarkModal(true);
                                    }}
                                    className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                                    title="تسجيل غياب أو ملاحظة"
                                 >
                                    <FileText size={18} />
                                 </button>
                                 {role === 'admin' && (
                                   <>
                                     <button 
                                        onClick={() => {
                                          setEditingTeacher(t.id);
                                          setNewTeacher({ 
                                           name: t.name, 
                                           email: t.email, 
                                           branch: t.branch || SCHOOL_BRANCHES[0], 
                                           level: t.level || STUDENT_LEVELS[0],
                                           role: t.role || 'teacher',
                                           supervisedLevel: Array.isArray(t.supervisedLevel) ? t.supervisedLevel : (t.supervisedLevel ? [t.supervisedLevel] : [STUDENT_LEVELS[0]]),
                                           password: '' 
                                         });
                                          // Scroll to top where the form is
                                          window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="تعديل المعلم"
                                     >
                                        <Edit2 size={18} />
                                     </button>
                                     <button 
                                        onClick={() => handleDeleteTeacher(t.id)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="حذف المعلم"
                                     >
                                        <Trash2 size={18} />
                                     </button>
                                   </>
                                 )}
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
       <div className="mt-8">
          <div className="card">
             <h4 className="font-bold border-b pb-4 mb-4 flex items-center gap-2">
                <FileText size={20} className="text-primary" />
                سجل الغياب وملاحظات الأساتذة
             </h4>
             <div className="overflow-x-auto">
                <table className="w-full text-right">
                   <thead>
                      <tr className="text-gray-400 text-sm border-b">
                         <th className="pb-4 pr-2">المعلم</th>
                         <th className="pb-4 pr-2">النوع</th>
                         <th className="pb-4 pr-2">التاريخ</th>
                         <th className="pb-4 pr-2">الملاحظة</th>
                         <th className="pb-4 pr-2 w-16"></th>
                      </tr>
                   </thead>
                   <tbody className="divide-y">
                      {teacherRemarks.map(r => {
                        const t = teachers.find(t => t.id === r.teacherId);
                        return (
                          <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                             <td className="py-3 pr-2 font-medium">{t ? t.name : 'معلم محذوف'}</td>
                             <td className="py-3 pr-2">
                               <span className={`px-2 py-1 rounded-full text-xs font-bold ${r.type === 'غياب' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                 {r.type}
                               </span>
                             </td>
                             <td className="py-3 pr-2 text-sm text-gray-500">{r.date}</td>
                             <td className="py-3 pr-2 text-sm text-gray-600">{r.note}</td>
                             <td className="py-3 pr-2 text-left">
                                <button onClick={() => handleDeleteTeacherRemark(r.id)} className="text-red-400 hover:text-red-600">
                                  <Trash2 size={16} />
                                </button>
                             </td>
                          </tr>
                        );
                      })}
                      {teacherRemarks.length === 0 && (
                        <tr>
                           <td colSpan="5" className="text-center py-6 text-gray-400">لا توجد ملاحظات مسجلة</td>
                        </tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
       </div>

       {/* Teacher Remark Modal */}
       {showTeacherRemarkModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-2xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                   <h3 className="text-lg font-bold">تسجيل ملاحظة: {selectedTeacherForRemark?.name}</h3>
                   <button onClick={() => setShowTeacherRemarkModal(false)} className="text-gray-400 hover:text-gray-600">
                      <X size={24} />
                   </button>
                </div>
                <form onSubmit={handleSaveTeacherRemark} className="space-y-4">
                   <div>
                      <label className="text-sm font-medium block mb-1">النوع</label>
                      <select 
                         value={newTeacherRemark.type}
                         onChange={e => setNewTeacherRemark({...newTeacherRemark, type: e.target.value})}
                         className="w-full px-4 py-2 border rounded-lg"
                      >
                         <option value="غياب">غياب</option>
                         <option value="تأخر">تأخر</option>
                         <option value="ملاحظة إدارية">ملاحظة إدارية</option>
                      </select>
                   </div>
                   <div>
                      <label className="text-sm font-medium block mb-1">التاريخ</label>
                      <input 
                         type="date"
                         value={newTeacherRemark.date}
                         onChange={e => setNewTeacherRemark({...newTeacherRemark, date: e.target.value})}
                         className="w-full px-4 py-2 border rounded-lg"
                      />
                   </div>
                   <div>
                      <label className="text-sm font-medium block mb-1">التفاصيل / الملاحظة</label>
                      <textarea 
                         required
                         value={newTeacherRemark.note}
                         onChange={e => setNewTeacherRemark({...newTeacherRemark, note: e.target.value})}
                         className="w-full px-4 py-2 border rounded-lg h-24"
                         placeholder="اكتب تفاصيل الغياب أو الملاحظة..."
                      />
                   </div>
                   <button type="submit" className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-lg">
                      حفظ السجل
                   </button>
                </form>
             </div>
          </div>
       )}
    </div>
  );

  const renderExams = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
       <div className="card">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
             <FileText size={24} className="text-primary" />
             تسجيل امتحان سبر
          </h3>
          <form onSubmit={handleSaveExam} className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                   <label className="text-sm font-medium">الطالب</label>
                   <select 
                      required
                      value={newExam.studentId}
                      onChange={e => setNewExam({...newExam, studentId: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-primary outline-none"
                   >
                      <option value="">اختر الطالب...</option>
                      {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
                </div>
                <div className="space-y-1">
                   <label className="text-sm font-medium">نوع الامتحان</label>
                   <select 
                      value={newExam.examType}
                      onChange={e => setNewExam({...newExam, examType: e.target.value, surah: '', hizb: ''})}
                      className="w-full px-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-primary outline-none"
                   >
                      <option value="surah">امتحان سورة</option>
                      <option value="hizb">امتحان حزب</option>
                   </select>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {newExam.examType === 'surah' ? (
                   <div className="space-y-1">
                      <label className="text-sm font-medium">السورة</label>
                      <select 
                         required
                         value={newExam.surah}
                         onChange={e => setNewExam({...newExam, surah: e.target.value})}
                         className="w-full px-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-primary outline-none"
                      >
                         <option value="">اختر السورة...</option>
                         {SURAH_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                   </div>
                ) : (
                   <div className="space-y-1">
                      <label className="text-sm font-medium">الحزب</label>
                      <select 
                         required
                         value={newExam.hizb}
                         onChange={e => setNewExam({...newExam, hizb: e.target.value})}
                         className="w-full px-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-primary outline-none"
                      >
                         <option value="">اختر الحزب...</option>
                         {[...Array(60)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                      </select>
                   </div>
                )}
                
                <div className="space-y-1">
                   <label className="text-sm font-medium text-blue-600">العلامة (من 100)</label>
                   <input 
                      type="number"
                      required
                      min="0"
                      max="100"
                      value={newExam.score}
                      onChange={e => setNewExam({...newExam, score: e.target.value})}
                      placeholder="مثال: 95"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none font-bold text-lg"
                   />
                </div>
             </div>

             <div className="space-y-1">
                <label className="text-sm font-medium">ملاحظات (اختياري)</label>
                <input 
                   type="text"
                   value={newExam.notes}
                   onChange={e => setNewExam({...newExam, notes: e.target.value})}
                   placeholder="اكتب ملاحظاتك عن أداء الطالب..."
                   className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm"
                />
             </div>

             <button type="submit" className="btn-primary w-full py-3">
                <FileText size={20} />
                حفظ نتيجة الامتحان
             </button>
          </form>
       </div>

       <div className="card">
          <h3 className="text-xl font-bold mb-4">سجل الامتحانات</h3>
          <div className="overflow-x-auto">
             <table className="w-full text-right">
                <thead>
                   <tr className="text-gray-400 text-sm border-b">
                      <th className="pb-4 pr-2">التاريخ</th>
                      <th className="pb-4 pr-2">الطالب</th>
                      <th className="pb-4 pr-2">الامتحان</th>
                      <th className="pb-4 pr-2 text-center">العلامة</th>
                      <th className="pb-4 pr-2">الملاحظات</th>
                   </tr>
                </thead>
                <tbody className="divide-y">
                   {exams.map(ex => (
                      <tr key={ex.id} className="hover:bg-gray-50">
                         <td className="py-3 pr-2 text-xs text-gray-500">
                            {ex.date ? format(new Date(ex.date), 'dd/MM/yyyy') : '--'}
                         </td>
                         <td className="py-3 pr-2 font-bold text-sm">
                            {students.find(s => s.id === ex.studentId)?.name || 'طالب محذوف'}
                         </td>
                         <td className="py-3 pr-2 text-sm text-primary">
                            {ex.examType === 'hizb' ? `امتحان الحزب ${ex.hizb}` : `امتحان سورة ${ex.surah}`}
                         </td>
                         <td className="py-3 pr-2 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${Number(ex.score) >= 90 ? 'bg-green-100 text-green-700' : Number(ex.score) >= 70 ? 'bg-blue-100 text-blue-700' : Number(ex.score) >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                               {ex.score} / 100
                            </span>
                         </td>
                         <td className="py-3 pr-2 text-xs text-gray-500 max-w-[200px] truncate">
                            {ex.notes || '--'}
                         </td>
                      </tr>
                   ))}
                   {exams.length === 0 && (
                      <tr>
                         <td colSpan="5" className="text-center py-8 text-gray-400">لا يوجد امتحانات مسجلة</td>
                      </tr>
                   )}
                </tbody>
             </table>
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
      case 'review': return renderReview();
      case 'exams': return renderExams();
      case 'subscriptions':
        return (
          <SubscriptionsTab
            user={user}
            role={role}
            students={students}
            rawStudents={rawStudents}
            teachers={teachers}
            rawTeachers={rawTeachers}
            subscriptions={subscriptions}
            schoolBranches={SCHOOL_BRANCHES}
            studentLevels={STUDENT_LEVELS}
          />
        );
      case 'messages': return renderMessages();
      case 'parents': return renderParents();
      case 'admin': return (role === 'admin' || role === 'supervisor') ? renderAdmin() : renderDashboard();
      default: return renderDashboard();
    }
  };
  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        unreadMessagesCount={unreadMessagesCount} 
        installPrompt={installPrompt}
        onInstallClick={handleInstallClick}
      />
      
      <main className="flex-1 p-4 lg:p-8 overflow-hidden">
        <header className="mb-8 flex justify-between items-center lg:items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {activeTab === 'dashboard' && 'لوحة التحكم'}
              {activeTab === 'students' && 'إدارة الطلاب'}
              {activeTab === 'attendance' && 'سجل الحضور'}
              {activeTab === 'memorization' && 'متابعة الحفظ'}
              {activeTab === 'review' && 'المراجعة'}
              {activeTab === 'exams' && 'الامتحانات'}
              {activeTab === 'subscriptions' && 'الاشتراكات السنوية'}
              {activeTab === 'messages' && 'الرسائل والملاحظات'}
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
      {showPraiseCard && (
        <PraiseCard 
          student={showPraiseCard} 
          onClose={() => setShowPraiseCard(null)} 
        />
      )}
    </div>
  );
}

export default App;
