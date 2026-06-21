import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import { useAuth } from './context/AuthContext';
import { SURAH_LIST } from './constants/surahs';
import { calculateProgress } from './utils/progressCalculator';
import VisualQuran from './components/VisualQuran';
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
  Trophy
} from 'lucide-react';
import { QURAN_DATA, TOTAL_AYAH_COUNT, TOTAL_HIZB_COUNT, getHizbAyahCount, getHizbAyahList, HIZB_STARTS, HIZB_LABELS } from './constants/quranData';
import { db, auth as primaryAuth, firebaseConfig } from './firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import * as XLSX from 'xlsx';
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

export const SCHOOL_BRANCHES = ['Ecole Edimco', 'Ecole Ighil Elbordj', 'Ecole Ritaj'];
export const STUDENT_LEVELS = ['تحضيري', 'ابتدائي', 'متوسط', 'ثانوي', 'كبار'];

function App() {
  const { user, role, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
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

  // Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [newStudent, setNewStudent] = useState({
    name: '',
    age: '',
    level: 'ابتدائي',
    branch: SCHOOL_BRANCHES[0],
    parentName: '',
    parentEmail: '',
    phone: '',
    notes: '',
    code: Math.random().toString(36).substring(2, 8).toUpperCase()
  });

  const [newTeacher, setNewTeacher] = useState({
    name: '',
    email: '',
    password: '',
    branch: SCHOOL_BRANCHES[0]
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
    notes: ''
  });

  const [newReview, setNewReview] = useState({
    studentId: '',
    memoType: 'surah',
    surah: '',
    fromAyah: '',
    toAyah: '',
    hizb: '',
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
    // If not admin, only show teacher's students
    if (role !== 'admin') {
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

    // Fetch Messages
    let qMsg = query(collection(db, "messages"), orderBy("timestamp", "asc"));
    const unsubscribeMsg = onSnapshot(qMsg, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRawMessages(data);
    }, (error) => {
      console.error("Messages Sync Error:", error);
    });

    // Fetch all teachers if admin
    let unsubscribeTeach = () => {};
    if (role === 'admin') {
      const qT = query(collection(db, "teachers"), orderBy("name"));
      unsubscribeTeach = onSnapshot(qT, (snapshot) => {
        setRawTeachers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }

    setLoading(false);
    return () => {
      unsubscribeSt();
      unsubscribeAtt();
      unsubscribeMem();
      unsubscribeRev();
      unsubscribeExam();
      unsubscribeTeach();
      unsubscribeMsg();
    };
  }, [user, role]);

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
      } else {
        setAttendance(rawAttendance);
        setMemorization([...rawMemorization].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)));
        setReviews([...rawReviews].sort((a, b) => new Date(b.assignedDate || 0) - new Date(a.assignedDate || 0)));
        setExams([...rawExams].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)));
      }
    } else {
      setStudents(currentStudents); // For teachers, it's already filtered by teacherId in Firestore query
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
    }

    // Filter messages
    if (role === 'admin') {
      setMessages(rawMessages);
    } else {
      setMessages(rawMessages.filter(m => m.senderId === user.uid || m.receiverId === user.uid || m.receiverId === 'all'));
    }

  }, [rawStudents, rawAttendance, rawMemorization, rawReviews, rawTeachers, rawMessages, role, user, adminBranchFilter, adminTeacherFilter]);

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
        // If admin, use the selected teacherId from form, else use own uid
        teacherId: (role === 'admin' && newStudent.teacherId) ? newStudent.teacherId : user.uid,
        branch: newStudent.branch || SCHOOL_BRANCHES[0],
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
        level: 'ابتدائي',
        branch: user?.branch || SCHOOL_BRANCHES[0],
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
    const targetDate = attendanceDate;
    // Only fetch existing record if it is from the selected date
    const existing = attendance.find(a => a.studentId === studentId && a.date === targetDate);
    
    try {
      if (existing) {
        // Teacher is updating attendance for the selected date
        await updateDoc(doc(db, "attendance", existing.id), { 
          status, 
          timestamp: new Date().toISOString() 
        });
      } else {
        // Creating a new attendance record for the selected date
        await addDoc(collection(db, "attendance"), {
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
    
    try {
      await addDoc(collection(db, "memorization"), {
        studentId: newMemo.studentId,
        surah: newMemo.memoType === 'surah' ? newMemo.surah : null,
        fromAyah: newMemo.memoType === 'surah' ? Number(newMemo.fromAyah) : null,
        toAyah: newMemo.memoType === 'surah' ? Number(newMemo.toAyah) : null,
        hizb: newMemo.memoType === 'hizb' ? Number(newMemo.hizb) : null,
        memoType: newMemo.memoType,
        status: newMemo.status,
        teacherId: user.uid,
        date: new Date().toISOString(),
        notes: newMemo.notes || ''
      });
      setNewMemo({ studentId: '', surah: '', fromAyah: '', toAyah: '', status: 'good', isFullSurah: false, memoType: 'surah', hizb: '', notes: '' });
      alert("تم حفظ سجل التسميع بنجاح");
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
        memoType: newReview.memoType,
        status: 'pending', // Initial status
        teacherId: user.uid,
        assignedDate: new Date().toISOString(),
        completedDate: null
      });
      setNewReview({ studentId: '', surah: '', fromAyah: '', toAyah: '', isFullSurah: false, memoType: 'surah', hizb: '', status: 'pending' });
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
      await updateDoc(doc(db, "students", studentId), { parentRemarks: updatedRemarks });
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
      await addDoc(collection(db, "exams"), {
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
          branch: newTeacher.branch
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
          role: 'teacher',
          branch: newTeacher.branch,
          createdAt: new Date().toISOString()
        });

        // Cleanup secondary app
        await deleteApp(secondaryApp);
        alert("تم إضافة المعلم بنجاح");
      }
      
      setEditingTeacher(null);
      setNewTeacher({ name: '', email: '', password: '', branch: SCHOOL_BRANCHES[0] });
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

    // 1. Students Sheet
    const studentsData = students.map(s => {
      const p = calculateStudentProgress(s.id);
      return {
        "الاسم": s.name,
        "العمر": s.age || '',
        "الفرع": s.branch,
        "المستوى": s.level || '',
        "تاريخ التسجيل": s.createdAt ? new Date(s.createdAt).toLocaleDateString('ar-EG') : '',
        "التقدم العام (%)": `${p.totalPercentage}%`,
        "الأحزاب المحفوظة": p.totalHizbs
      };
    });
    const wsStudents = XLSX.utils.json_to_sheet(studentsData);
    XLSX.utils.book_append_sheet(wb, wsStudents, "الطلاب");

    // 2. Attendance Sheet (Pivot Table Format)
    const allDates = [...new Set(attendance.map(a => a.date))].sort((a, b) => new Date(a) - new Date(b));
    const attendanceData = students.map(student => {
      const row = { "الطالب": student.name };
      allDates.forEach(date => {
        const record = attendance.find(a => a.studentId === student.id && a.date === date);
        let statusAr = '-';
        if(record) {
          if(record.status === 'present') statusAr = 'حاضر';
          if(record.status === 'absent') statusAr = 'غائب';
          if(record.status === 'late') statusAr = 'متأخر';
          if(record.status === 'excused') statusAr = 'مأذون';
        }
        row[date] = statusAr;
      });
      return row;
    });
    const wsAttendance = XLSX.utils.json_to_sheet(attendanceData);
    XLSX.utils.book_append_sheet(wb, wsAttendance, "سجل الحضور");

    // 3. Exams Sheet (Pivot Table Format)
    const examDates = [...new Set(exams.map(e => e.date))].sort((a, b) => new Date(a) - new Date(b));
    const examsData = students.map(student => {
      const row = { "الطالب": student.name };
      examDates.forEach(date => {
        const records = exams.filter(e => e.studentId === student.id && e.date === date);
        if (records.length > 0) {
          row[date] = records.map(r => `${r.score} (${r.examType === 'hizb' ? 'حزب ' + r.hizb : 'سورة ' + r.surah})`).join(' | ');
        } else {
          row[date] = '-';
        }
      });
      return row;
    });
    const wsExams = XLSX.utils.json_to_sheet(examsData);
    XLSX.utils.book_append_sheet(wb, wsExams, "الامتحانات");

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
                         <span className={`font-bold ${a.status === 'present'?'text-green-600':a.status==='late'?'text-orange-500':'text-red-500'}`}>
                            {a.status === 'present' ? 'حاضر' : a.status === 'late' ? 'متأخر' : a.status === 'absent' ? 'غائب' : 'متوقف'}
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
                            <span className="font-bold text-blue-700">حفظ: {m.memoType==='hizb'||m.hizb ? `الحزب ${m.hizb}` : m.surah}</span>
                            <span className="text-[10px] text-gray-400">{m.date ? new Date(m.date).toLocaleDateString('ar-EG') : ''}</span>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-xs text-gray-500">{m.memoType==='hizb'||m.hizb ? '' : `الآيات: ${m.fromAyah} - ${m.toAyah}`}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${m.status==='good'?'bg-green-100 text-green-700':m.status==='review'?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700'}`}>
                               {m.status==='good'?'جيد':m.status==='review'?'يحتاج الى ترسيخ':'حفظ غير متقن'}
                            </span>
                         </div>
                      </div>
                   ))}
                   {periodReviews.map((r, i) => (
                      <div key={`r-${i}`} className="text-sm border-b pb-2 last:border-0 hover:bg-orange-50 p-1 rounded bg-orange-50/30">
                         <div className="flex justify-between mb-1">
                            <span className="font-bold text-orange-700">مراجعة: {r.memoType==='hizb'||r.hizb ? `الحزب ${r.hizb}` : r.surah}</span>
                            <span className="text-[10px] text-gray-400">{r.assignedDate ? new Date(r.assignedDate).toLocaleDateString('ar-EG') : ''}</span>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-xs text-gray-500">{r.memoType==='hizb'||r.hizb ? '' : `الآيات: ${r.fromAyah} - ${r.toAyah}`}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${r.status==='pending'?'bg-gray-200 text-gray-700':r.status==='good'?'bg-green-100 text-green-700':r.status==='review'?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700'}`}>
                               {r.status==='pending'?'قيد الانتظار':r.status==='good'?'جيد':r.status==='review'?'يحتاج الى ترسيخ':'حفظ غير متقن'}
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
    // 1. Leaderboard Logic
    const studentStats = {};
    students.forEach(s => {
      studentStats[s.id] = { ...s, score: 0 };
    });
    memorization.forEach(m => {
      if (m.status === 'good' && studentStats[m.studentId]) {
        studentStats[m.studentId].score += 1;
      }
    });
    const leaderboard = Object.values(studentStats)
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // 2. Attendance Trend (Last 7 Days)
    const trendDays = 7;
    const today = new Date();
    const attendanceData = [];
    const memoData = [];
    
    for (let i = trendDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayLabel = format(d, 'EEEE', { locale: ar }).split(' ')[0];
      
      const dayAtt = attendance.filter(a => a.date === dateStr);
      const present = dayAtt.filter(a => a.status === 'present').length;
      const absent = dayAtt.filter(a => a.status === 'absent').length;
      attendanceData.push({ dayLabel, dateStr, present, absent, total: present + absent });

      const dayMemo = memorization.filter(m => m.date && m.date.startsWith(dateStr));
      memoData.push({ dayLabel, count: dayMemo.length });
    }

    const maxAtt = Math.max(...attendanceData.map(d => d.total), 1);
    const maxMemo = Math.max(...memoData.map(d => d.count), 1);

    // 3. Smart Notifications Logic
    const smartNotifications = [];
    
    students.forEach(student => {
      // Rule 1: 3 consecutive attended sessions without any memorization
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
            type: 'absence',
            priority: 'high',
            studentId: student.id,
            message: `الطالب ${student.name} حضر 3 حصص متتالية دون القيام بأي تسميع.`
          });
        }
      }

      // Rule 2: No exam in the last 30 days
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
          studentId: student.id,
          message: `الطالب ${student.name} لم يتم امتحانه (سبر) منذ 3 أشهر.`
        });
      }
    });

    // Rule 3: Pending reviews check
    reviews.filter(r => r.status === 'pending').forEach(r => {
      const assigned = new Date(r.assignedDate || 0);
      const daysPending = Math.floor((today - assigned) / (1000 * 60 * 60 * 24));
      
      if (daysPending > 7) {
        const sName = students.find(s => s.id === r.studentId)?.name || 'طالب محذوف';
        smartNotifications.push({
          id: `rev-${r.id}`,
          type: 'review',
          priority: 'medium',
          studentId: r.studentId,
          message: `مراجعة متأخرة للطالب ${sName} منذ ${daysPending} أيام.`
        });
      }
    });

    // Rule 4: Unread Messages
    if (unreadMessagesCount > 0) {
      smartNotifications.push({
        id: `msg-unread`,
        type: 'message',
        priority: 'high',
        message: `لديك ${unreadMessagesCount} رسالة جديدة غير مقروءة. يرجى مراجعة صندوق الرسائل.`
      });
    }

    // Sort by priority (high first)
    smartNotifications.sort((a, b) => (a.priority === 'high' ? -1 : 1));

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="card border-r-4 border-r-primary flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-gray-500 text-sm">إجمالي الطلاب</p>
              <h3 className="text-3xl font-bold text-gray-800">{students.length}</h3>
            </div>
            <div className="p-3 bg-green-100 text-primary rounded-full">
              <Users size={24} />
            </div>
          </div>
          <div className="card border-r-4 border-r-blue-500 flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-gray-500 text-sm">حضور اليوم</p>
              <h3 className="text-3xl font-bold text-gray-800">
                {attendance.filter(a => a.status === 'present' && a.date === format(new Date(), 'yyyy-MM-dd')).length}
              </h3>
            </div>
            <div className="p-3 bg-blue-100 text-blue-500 rounded-full">
              <Calendar size={24} />
            </div>
          </div>
          <div className="card border-r-4 border-r-yellow-500 flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-gray-500 text-sm">تسميعات اليوم</p>
              <h3 className="text-3xl font-bold text-gray-800">
                {memorization.filter(m => m.date && m.date.startsWith(format(new Date(), 'yyyy-MM-dd'))).length}
              </h3>
            </div>
            <div className="p-3 bg-yellow-100 text-yellow-500 rounded-full">
              <TrendingUp size={24} />
            </div>
          </div>
        </div>

        {/* Smart Notifications */}
        {smartNotifications.length > 0 && (
          <div className="card border-t-4 border-t-orange-500 bg-orange-50/30">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-orange-600">
              <BellRing size={20} />
              التنبيهات الذكية
            </h3>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {smartNotifications.map(note => (
                <div key={note.id} className="flex items-start gap-3 p-3 bg-white rounded-lg border hover:shadow-sm transition-shadow">
                  {note.priority === 'high' ? (
                    <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                  ) : (
                    <BellRing className="text-orange-400 flex-shrink-0 mt-0.5" size={18} />
                  )}
                  <p className={`text-sm font-medium ${note.priority === 'high' ? 'text-red-700' : 'text-gray-800'}`}>
                    {note.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Custom Bar Chart for Attendance */}
          <div className="card">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-primary">
              <BarChart2 size={20} />
              إحصائيات الحضور (آخر 7 أيام)
            </h3>
            <div className="h-48 flex items-end justify-between gap-2 pt-4">
              {attendanceData.map((d, i) => {
                const presentHeight = (d.present / maxAtt) * 100;
                const absentHeight = (d.absent / maxAtt) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                    <div className="absolute -top-10 bg-gray-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none whitespace-nowrap">
                      حاضر: {d.present} | غائب: {d.absent}
                    </div>
                    <div className="w-full h-32 bg-gray-100 rounded-t-sm flex flex-col justify-end overflow-hidden">
                      <div style={{ height: `${absentHeight}%` }} className="bg-red-400 w-full transition-all duration-500"></div>
                      <div style={{ height: `${presentHeight}%` }} className="bg-primary w-full transition-all duration-500"></div>
                    </div>
                    <span className="text-[10px] text-gray-500 truncate w-full text-center">{d.dayLabel}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-center gap-4 mt-4 text-xs">
              <div className="flex items-center gap-1"><span className="w-3 h-3 bg-primary rounded-sm"></span>حاضر</div>
              <div className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 rounded-sm"></span>غائب</div>
            </div>
          </div>

          {/* Custom Bar Chart for Memorization */}
          <div className="card">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-yellow-600">
              <TrendingUp size={20} />
              نشاط التسميع (آخر 7 أيام)
            </h3>
            <div className="h-48 flex items-end justify-between gap-2 pt-4">
              {memoData.map((d, i) => {
                const height = (d.count / maxMemo) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                    <div className="absolute -top-8 bg-gray-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none whitespace-nowrap">
                      {d.count} تسميع
                    </div>
                    <div className="w-full max-w-[2rem] h-32 flex flex-col justify-end">
                      <div style={{ height: `${height}%` }} className="bg-yellow-400 rounded-t-md w-full transition-all duration-500"></div>
                    </div>
                    <span className="text-[10px] text-gray-500 truncate w-full text-center">{d.dayLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-primary">
              <History size={20} />
              نشاط أخير (التسميع)
            </h3>
            <div className="space-y-4">
              {memorization.slice(0, 5).map((memo) => (
                <div key={memo.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div>
                    <span className="font-bold text-sm block text-gray-800">
                      {students.find(s => s.id === memo.studentId)?.name || 'طالب محذوف'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {memo.memoType === 'hizb' || memo.hizb ? `الحزب ${memo.hizb}` : `سورة ${memo.surah}`}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      memo.status === 'good' ? 'bg-green-100 text-green-700' :
                      memo.status === 'review' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {memo.status === 'good' ? 'جيد' : memo.status === 'review' ? 'يحتاج الى ترسيخ' : 'حفظ غير متقن'}
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

          <div className="card">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-yellow-600">
              <Award size={20} />
              لوحة الشرف (الأكثر إنجازاً)
            </h3>
            <div className="space-y-3">
              {leaderboard.length > 0 ? leaderboard.map((student, idx) => (
                <div key={student.id} className="flex items-center justify-between p-3 bg-gradient-to-l from-yellow-50/50 to-white border border-yellow-100 rounded-xl hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${idx === 0 ? 'bg-yellow-400 text-white' : idx === 1 ? 'bg-gray-300 text-gray-700' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-green-50 text-primary'}`}>
                      {idx + 1}
                    </div>
                    <div>
                      <span className="font-bold text-sm block text-gray-800">{student.name}</span>
                      <span className="text-xs text-gray-500">{student.branch}</span>
                    </div>
                  </div>
                  <div className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                    {student.score} ممتاز
                  </div>
                </div>
              )) : (
                <p className="text-gray-400 text-center py-8">لا يوجد إنجازات في لوحة الشرف بعد</p>
              )}
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
            
            {role === 'admin' && (
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
          <button 
            onClick={() => {
              setEditingStudent(null);
              setNewStudent({
                name: '',
                age: '',
                level: 'ابتدائي',
                branch: user?.branch || SCHOOL_BRANCHES[0],
                parentName: '',
                parentEmail: '',
                phone: '',
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

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rawStudents
            .filter(s => role !== 'admin' || studentTabBranchFilter === 'All' || s.branch === studentTabBranchFilter)
            .filter(s => role !== 'admin' || studentTabTeacherFilter === 'All' || s.teacherId === studentTabTeacherFilter)
            .filter(s => studentTabLevelFilter === 'All' || s.level === studentTabLevelFilter)
            .filter(s => 
              s.name.includes(studentSearch) || 
              (s.code && s.code.includes(studentSearch))
            )
            .map(student => {
            const prog = calculateStudentProgress(student.id);
            return (
              <div key={student.id} className="card hover:border-primary transition-colors group">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-lg">{student.name}</h4>
                    <p className="text-sm text-gray-500">
                      العمر: {student.age} سنة 
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
                <div className="space-y-1">
                  <label className="text-sm font-medium">رقم الهاتف</label>
                  <input 
                    value={newStudent.phone}
                    onChange={e => setNewStudent({...newStudent, phone: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" 
                  />
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
    return (
      <div className="space-y-6">
         <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-dashed">
            <h3 className="text-xl font-bold flex items-center gap-2">
               <Calendar className="text-primary" size={24} />
               حضور الطلاب
            </h3>
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border shadow-sm">
               <label className="text-sm font-bold text-gray-500">تاريخ الحضور:</label>
               <input 
                 type="date" 
                 value={attendanceDate}
                 onChange={e => setAttendanceDate(e.target.value)}
                 className="outline-none border-none text-primary font-bold cursor-pointer bg-transparent"
               />
            </div>
         </div>

         <div className="card divide-y overflow-hidden">
            {students.map(student => {
              const studentAttendance = attendance.find(a => a.studentId === student.id && a.date === attendanceDate);
              return (
                <div key={student.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                   <div>
                      <p className="font-bold">{student.name}</p>
                      <p className="text-xs text-gray-500">{student.parentName}</p>
                   </div>
                   <div className="flex gap-1 flex-wrap justify-end">
                      <button 
                        onClick={() => handleAttendance(student.id, 'present')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full border transition-colors ${
                          studentAttendance?.status === 'present'
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
                          studentAttendance?.status === 'late'
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
                          studentAttendance?.status === 'absent'
                          ? 'bg-red-600 border-red-600 text-white'
                          : 'border-red-200 text-red-600 hover:bg-red-50'
                        }`}
                      >
                         <CheckCircle size={14} className="opacity-0 w-0 h-0" />
                         <XCircle size={14} />
                         <span className="text-xs font-medium">غائب</span>
                      </button>
                      <button 
                        onClick={() => handleAttendance(student.id, 'stopped')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full border transition-colors ${
                          studentAttendance?.status === 'stopped'
                          ? 'bg-gray-600 border-gray-600 text-white'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                         <XCircle size={14} className="rotate-45" />
                         <span className="text-xs font-medium">متوقف</span>
                      </button>
                   </div>
                </div>
              );
            })}
            {students.length === 0 && (
              <div className="text-center py-10 text-gray-400">لا يوجد طلاب للحضور</div>
            )}
         </div>
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
                   ) : (
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
                   )}

                   <div className="space-y-1">
                      <label className="text-sm font-medium">التقييم</label>
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
                                {stat === 'good' ? 'جيد' : stat === 'review' ? 'يحتاج الى ترسيخ' : 'حفظ غير متقن'}
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
                                  <span className="text-primary-dark font-bold">الحزب {memo.hizb}</span>
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
                            memo.status === 'review' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                         }`}>
                            {memo.status === 'good' ? 'جيد' : memo.status === 'review' ? 'يحتاج الى ترسيخ' : 'حفظ غير متقن'}
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
                                    <span className="text-primary-dark font-bold">الحزب {rev.hizb}</span>
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
                                    <span className="text-primary-dark font-bold">الحزب {rev.hizb}</span>
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
                              rev.status === 'review' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                           }`}>
                              {rev.status === 'good' ? 'جيد' : rev.status === 'review' ? 'يحتاج الى ترسيخ' : 'حفظ غير متقن'}
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

            <div className="card">
               <h4 className="font-bold border-b pb-2 mb-4">سجل الحفظ</h4>
               <div className="space-y-4 max-h-64 overflow-y-auto">
                  {parentData.memorization.map((m, i) => (
                    <div key={i} className="flex justify-between items-center border-b pb-2 last:border-0">
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
                       <div className={`text-xs px-2 py-1 rounded-full ${
                          m.status === 'good' ? 'bg-green-100 text-green-700' :
                          m.status === 'review' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                       }`}>
                          {m.status === 'good' ? 'جيد' : m.status === 'review' ? 'يحتاج الى ترسيخ' : 'حفظ غير متقن'}
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
                             {r.memoType === 'hizb' || r.hizb ? `الحزب ${r.hizb}` : `سورة ${r.surah} (من ${r.fromAyah} إلى ${r.toAyah})`}
                          </p>
                          <p className="text-[10px] text-gray-400">
                             تاريخ: {r.assignedDate ? new Date(r.assignedDate).toLocaleDateString('ar-EG') : '--'}
                          </p>
                       </div>
                       <div className={`text-xs px-2 py-1 rounded-full ${
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
                            <th className="pb-4 pr-2">المدرسة</th>
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
                              <td className="py-4 pr-2 text-xs font-bold text-primary">{t.branch || 'Ecole Edimco'}</td>
                              <td className="py-4 pr-2 text-xs text-gray-400">
                                 {t.createdAt ? format(new Date(t.createdAt), 'yyyy/MM/dd') : '--'}
                              </td>
                              <td className="py-4 pr-2 flex gap-2">
                                 <button 
                                    onClick={() => {
                                      setEditingTeacher(t.id);
                                      setNewTeacher({ name: t.name, email: t.email, branch: t.branch || SCHOOL_BRANCHES[0], password: '' });
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
      case 'messages': return renderMessages();
      case 'parents': return renderParents();
      case 'admin': return role === 'admin' ? renderAdmin() : renderDashboard();
      default: return renderDashboard();
    }
  };
  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} unreadMessagesCount={unreadMessagesCount} />
      
      <main className="flex-1 p-4 lg:p-8 overflow-hidden">
        <header className="mb-8 flex justify-between items-center lg:items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {activeTab === 'dashboard' && 'لوحة التحكم'}
              {activeTab === 'students' && 'إدارة الطلاب'}
              {activeTab === 'attendance' && 'سجل الحضور'}
              {activeTab === 'memorization' && 'متابعة الحفظ'}
              {activeTab === 'review' && 'المراجعة'}
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
    </div>
  );
}

export default App;
