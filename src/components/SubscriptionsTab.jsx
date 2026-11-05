import React, { useState, useMemo } from 'react';
import { 
  CreditCard, 
  Search, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Check, 
  Edit3, 
  Trash2, 
  Printer, 
  Wallet, 
  Coins, 
  TrendingUp, 
  AlertCircle,
  FileText,
  X,
  ChevronDown
} from 'lucide-react';
import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import * as XLSX from 'xlsx-js-style';

const SCHOOL_YEARS = ['2024-2025', '2025-2026', '2026-2027', '2027-2028'];

export default function SubscriptionsTab({
  user,
  role,
  students = [],
  rawStudents = [],
  teachers = [],
  rawTeachers = [],
  subscriptions = [],
  schoolBranches = [],
  studentLevels = []
}) {
  const [selectedYear, setSelectedYear] = useState('2025-2026');
  const [statusFilter, setStatusFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [levelFilter, setLevelFilter] = useState('All');
  const [teacherFilter, setTeacherFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [defaultAmount, setDefaultAmount] = useState(2000);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null);
  const [currentSub, setCurrentSub] = useState(null);
  const [loadingAction, setLoadingAction] = useState(false);

  const [formData, setFormData] = useState({
    status: 'paid',
    amount: 2000,
    paidAmount: 2000,
    paidDate: format(new Date(), 'yyyy-MM-dd'),
    paymentMethod: 'cash',
    receiptNumber: '',
    notes: ''
  });

  const subMap = useMemo(() => {
    const map = {};
    subscriptions.forEach(sub => {
      if (sub.year === selectedYear) {
        map[sub.studentId] = sub;
      }
    });
    return map;
  }, [subscriptions, selectedYear]);

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      if (branchFilter !== 'All' && student.branch !== branchFilter) return false;
      if (levelFilter !== 'All' && student.level !== levelFilter) return false;
      if (teacherFilter !== 'All' && student.teacherId !== teacherFilter) return false;
      
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (student.name || '').toLowerCase().includes(q);
        const codeMatch = (student.code || '').toLowerCase().includes(q);
        if (!nameMatch && !codeMatch) return false;
      }

      const sub = subMap[student.id];
      const status = sub ? sub.status : 'unpaid';
      if (statusFilter !== 'All' && status !== statusFilter) return false;

      return true;
    });
  }, [students, subMap, branchFilter, levelFilter, teacherFilter, searchQuery, statusFilter]);

  const kpis = useMemo(() => {
    let totalStudents = students.length;
    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;
    let totalCollected = 0;
    let totalExpected = 0;

    students.forEach(s => {
      const sub = subMap[s.id];
      const status = sub ? sub.status : 'unpaid';
      const expected = sub ? (Number(sub.amount) || defaultAmount) : defaultAmount;
      totalExpected += expected;

      if (status === 'paid') {
        paidCount++;
        totalCollected += Number(sub?.paidAmount ?? expected);
      } else if (status === 'partial') {
        partialCount++;
        totalCollected += Number(sub?.paidAmount || 0);
      } else {
        unpaidCount++;
      }
    });

    const completionRate = totalStudents > 0 
      ? Math.round(((paidCount + partialCount * 0.5) / totalStudents) * 100) 
      : 0;

    return {
      totalStudents,
      paidCount,
      partialCount,
      unpaidCount,
      totalCollected,
      totalExpected,
      completionRate
    };
  }, [students, subMap, defaultAmount]);

  const handleQuickPay = async (student) => {
    try {
      setLoadingAction(true);
      const subId = `${student.id}_${selectedYear}`;
      const now = format(new Date(), 'yyyy-MM-dd');
      const randomReceipt = `REC-${format(new Date(), 'yyMM')}-${Math.floor(1000 + Math.random() * 9000)}`;

      const subData = {
        studentId: student.id,
        studentName: student.name || '',
        studentCode: student.code || '',
        year: selectedYear,
        status: 'paid',
        amount: Number(defaultAmount),
        paidAmount: Number(defaultAmount),
        paidDate: now,
        paymentMethod: 'cash',
        receiptNumber: randomReceipt,
        notes: 'تسديد سريع',
        branch: student.branch || '',
        level: student.level || '',
        teacherId: student.teacherId || '',
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'subscriptions', subId), subData);
    } catch (err) {
      console.error('Error saving quick subscription:', err);
      alert('حدث خطأ أثناء تسجيل الدفع: ' + (err.message || ''));
    } finally {
      setLoadingAction(false);
    }
  };

  const handleOpenEdit = (student, existingSub) => {
    setCurrentStudent(student);
    setCurrentSub(existingSub || null);
    
    if (existingSub) {
      setFormData({
        status: existingSub.status || 'paid',
        amount: existingSub.amount ?? defaultAmount,
        paidAmount: existingSub.paidAmount ?? defaultAmount,
        paidDate: existingSub.paidDate || format(new Date(), 'yyyy-MM-dd'),
        paymentMethod: existingSub.paymentMethod || 'cash',
        receiptNumber: existingSub.receiptNumber || '',
        notes: existingSub.notes || ''
      });
    } else {
      setFormData({
        status: 'paid',
        amount: defaultAmount,
        paidAmount: defaultAmount,
        paidDate: format(new Date(), 'yyyy-MM-dd'),
        paymentMethod: 'cash',
        receiptNumber: `REC-${format(new Date(), 'yyMM')}-${Math.floor(1000 + Math.random() * 9000)}`,
        notes: ''
      });
    }
    setIsEditModalOpen(true);
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    if (!currentStudent) return;

    try {
      setLoadingAction(true);
      const subId = `${currentStudent.id}_${selectedYear}`;
      
      const subData = {
        studentId: currentStudent.id,
        studentName: currentStudent.name || '',
        studentCode: currentStudent.code || '',
        year: selectedYear,
        status: formData.status,
        amount: Number(formData.amount),
        paidAmount: Number(formData.paidAmount),
        paidDate: formData.paidDate,
        paymentMethod: formData.paymentMethod,
        receiptNumber: formData.receiptNumber || '',
        notes: formData.notes || '',
        branch: currentStudent.branch || '',
        level: currentStudent.level || '',
        teacherId: currentStudent.teacherId || '',
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'subscriptions', subId), subData);
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Error saving subscription:', err);
      alert('خطأ أثناء الحفظ: ' + (err.message || ''));
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeleteSub = async (student, sub) => {
    if (!window.confirm(`هل أنت متأكد من إلغاء تسديد الاشتراك للطالب: ${student.name}؟`)) return;
    try {
      setLoadingAction(true);
      const subId = sub?.id || `${student.id}_${selectedYear}`;
      await deleteDoc(doc(db, 'subscriptions', subId));
    } catch (err) {
      console.error('Error deleting subscription:', err);
      alert('خطأ أثناء إلغاء الاشتراك: ' + (err.message || ''));
    } finally {
      setLoadingAction(false);
    }
  };

  const handleOpenReceipt = (student, sub) => {
    setCurrentStudent(student);
    setCurrentSub(sub);
    setIsReceiptModalOpen(true);
  };

  const handleExportExcel = () => {
    try {
      const rows = filteredStudents.map((s, index) => {
        const sub = subMap[s.id];
        const status = sub ? sub.status : 'unpaid';
        let statusAr = 'لم يتم الدفع';
        if (status === 'paid') statusAr = 'تم الدفع بالكامل';
        if (status === 'partial') statusAr = 'دفع جزئي';

        const teacher = rawTeachers.find(t => t.id === s.teacherId);

        return {
          'الرقم': index + 1,
          'كود الطالب': s.code || '-',
          'اسم الطالب': s.name || '',
          'المستوى': s.level || '',
          'المدرسة / الفرع': s.branch || '',
          'الأستاذ المشرف': teacher ? teacher.name : '-',
          'السنة الدراسية': selectedYear,
          'حالة الاشتراك': statusAr,
          'المبلغ المستحق (د.ج)': sub ? (sub.amount ?? defaultAmount) : defaultAmount,
          'المبلغ المدفوع (د.ج)': sub ? (sub.paidAmount ?? (status === 'paid' ? defaultAmount : 0)) : 0,
          'تاريخ الدفع': sub?.paidDate || '-',
          'طريقة الدفع': sub?.paymentMethod === 'bank' ? 'تحويل' : (sub?.paymentMethod === 'check' ? 'صك' : (sub ? 'نقداً' : '-')),
          'رقم الوصل': sub?.receiptNumber || '-',
          'ملاحظات': sub?.notes || ''
        };
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);

      if (!ws['!views']) ws['!views'] = [];
      ws['!views'].push({ rightToLeft: true });

      const colWidths = [
        { wch: 6 },
        { wch: 12 },
        { wch: 25 },
        { wch: 16 },
        { wch: 20 },
        { wch: 20 },
        { wch: 12 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 14 },
        { wch: 12 },
        { wch: 16 },
        { wch: 20 }
      ];
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, `اشتراكات_${selectedYear}`);
      const fileName = `تقرير_الاشتراكات_${selectedYear}_${format(new Date(), 'yyyyMMdd')}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Export Excel error:', err);
      alert('حدث خطأ أثناء تصدير ملف الإكسل');
    }
  };

  return (
    <div className="space-y-6 pb-12 rtl text-right">
      {/* Top Banner & Title */}
      <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl">
                <CreditCard className="w-7 h-7 text-white" />
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                الاشتراكات السنوية للطلاب
              </h1>
            </div>
            <p className="text-emerald-100 text-sm md:text-base max-w-xl">
              إدارة وتحصيل الاشتراكات والرسوم السنوية، متابعة الطلاب المسددين وغير المسددين، واستخراج تقارير وإيصالات الدفع.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/15 backdrop-blur-md px-3 py-2 rounded-2xl flex items-center gap-2 border border-white/20">
              <Clock className="w-4 h-4 text-emerald-200" />
              <span className="text-xs text-emerald-200 font-medium">السنة:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent text-white font-bold text-sm outline-none cursor-pointer"
              >
                {SCHOOL_YEARS.map(y => (
                  <option key={y} value={y} className="text-gray-800">{y}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-emerald-800 font-bold rounded-2xl shadow hover:bg-emerald-50 transition-all text-sm active:scale-95"
            >
              <Download className="w-4 h-4 text-emerald-700" />
              تصدير Excel
            </button>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-white/20">
          <div className="flex items-center justify-between text-xs md:text-sm text-emerald-100 mb-2 font-medium">
            <span>نسبة تحصيل الاشتراكات للسنة {selectedYear}</span>
            <span className="font-bold text-white text-base">{kpis.completionRate}%</span>
          </div>
          <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden p-0.5">
            <div 
              className="h-full bg-gradient-to-r from-amber-300 via-emerald-200 to-white rounded-full transition-all duration-700"
              style={{ width: `${Math.min(kpis.completionRate, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">إجمالي الطلاب</p>
            <p className="text-2xl font-black text-gray-800 mt-0.5">{kpis.totalStudents}</p>
            <p className="text-[11px] text-gray-400">في النطاق المحدد</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-emerald-700 font-medium">تم الدفع (مسدد)</p>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">{kpis.paidCount}</p>
            <p className="text-[11px] text-emerald-600/80 font-medium">
              {kpis.totalStudents > 0 ? Math.round((kpis.paidCount / kpis.totalStudents) * 100) : 0}% من الطلاب
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-rose-700 font-medium">غير مسدد</p>
            <p className="text-2xl font-black text-rose-600 mt-0.5">{kpis.unpaidCount}</p>
            <p className="text-[11px] text-rose-600/80 font-medium">
              {kpis.totalStudents > 0 ? Math.round((kpis.unpaidCount / kpis.totalStudents) * 100) : 0}% متبقي
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-amber-700 font-medium">إجمالي المداخيل المحصلة</p>
            <p className="text-xl md:text-2xl font-black text-amber-700 mt-0.5">
              {kpis.totalCollected.toLocaleString()} <span className="text-xs font-normal">د.ج</span>
            </p>
            <p className="text-[11px] text-gray-400">
              المتوقع: {kpis.totalExpected.toLocaleString()} د.ج
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-500 ml-2">الحالة:</span>
            <button
              onClick={() => setStatusFilter('All')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'All' 
                  ? 'bg-gray-800 text-white shadow-sm' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              الكل ({students.length})
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                statusFilter === 'paid' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              تم الدفع ({kpis.paidCount})
            </button>
            <button
              onClick={() => setStatusFilter('unpaid')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                statusFilter === 'unpaid' 
                  ? 'bg-rose-600 text-white shadow-sm' 
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              لم يتم الدفع ({kpis.unpaidCount})
            </button>
            <button
              onClick={() => setStatusFilter('partial')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                statusFilter === 'partial' 
                  ? 'bg-amber-600 text-white shadow-sm' 
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              دفع جزئي ({kpis.partialCount})
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
            <span>المبلغ الافتراضي للاشتراك:</span>
            <input
              type="number"
              value={defaultAmount}
              onChange={(e) => setDefaultAmount(Number(e.target.value) || 0)}
              className="w-20 px-2 py-0.5 bg-white border rounded text-center font-bold text-gray-800 outline-none"
            />
            <span className="font-semibold">د.ج</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute right-3 top-3 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو الكود..."
              className="w-full pr-9 pl-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {(role === 'admin' || role === 'supervisor') && (
            <div>
              <select
                value={branchFilter}
                onChange={(e) => {
                  setBranchFilter(e.target.value);
                  setTeacherFilter('All');
                }}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-gray-700"
              >
                <option value="All">جميع المدارس / الفروع</option>
                {schoolBranches.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-gray-700"
            >
              <option value="All">جميع المستويات</option>
              {studentLevels.map(lvl => (
                <option key={lvl} value={lvl}>{lvl}</option>
              ))}
            </select>
          </div>

          {(role === 'admin' || role === 'supervisor') && (
            <div>
              <select
                value={teacherFilter}
                onChange={(e) => setTeacherFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-gray-700"
              >
                <option value="All">جميع الأساتذة</option>
                {rawTeachers
                  .filter(t => branchFilter === 'All' || t.branch === branchFilter)
                  .map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Students Subscriptions List Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50/60 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-bold text-gray-700">
            قائمة الطلاب ({filteredStudents.length})
          </p>
          <span className="text-xs text-gray-500">
            السنة الدراسية: <strong className="text-emerald-700">{selectedYear}</strong>
          </span>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-base font-bold">لا يوجد طلاب يطابقون خيارات البحث أو التصفية</p>
            <p className="text-xs mt-1 text-gray-400">جرب تغيير الفلاتر أو البحث عن اسم آخر</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase border-b">
                <tr>
                  <th className="py-3 px-4">الطالب</th>
                  <th className="py-3 px-4">المستوى & الفرع</th>
                  <th className="py-3 px-4">الأستاذ</th>
                  <th className="py-3 px-4 text-center">حالة الاشتراك</th>
                  <th className="py-3 px-4 text-center">المبلغ</th>
                  <th className="py-3 px-4">تاريخ & وصل الدفع</th>
                  <th className="py-3 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {filteredStudents.map((student) => {
                  const sub = subMap[student.id];
                  const status = sub ? sub.status : 'unpaid';
                  const teacher = rawTeachers.find(t => t.id === student.teacherId);
                  const isPaid = status === 'paid';
                  const isPartial = status === 'partial';

                  return (
                    <tr 
                      key={student.id} 
                      className={`hover:bg-gray-50/80 transition-colors ${
                        isPaid ? 'bg-emerald-50/20' : (isPartial ? 'bg-amber-50/20' : '')
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">{student.name}</div>
                        <div className="text-xs text-gray-400 font-mono mt-0.5">#{student.code || 'بدون كود'}</div>
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        <span className="inline-block px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-md font-semibold mb-1">
                          {student.level || 'غير محدد'}
                        </span>
                        <div className="text-gray-500">{student.branch || '-'}</div>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-gray-600">
                        {teacher ? teacher.name : '-'}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {isPaid && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            تم الدفع
                          </span>
                        )}
                        {isPartial && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            دفع جزئي
                          </span>
                        )}
                        {!isPaid && !isPartial && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-100 text-rose-800 text-xs font-bold rounded-full">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            لم يتم الدفع
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center text-xs">
                        {sub ? (
                          <div>
                            <span className="font-extrabold text-sm text-gray-900">
                              {(sub.paidAmount ?? sub.amount).toLocaleString()}
                            </span>
                            <span className="text-[10px] text-gray-500 mr-1">د.ج</span>
                            {isPartial && (
                              <div className="text-[10px] text-gray-400">
                                من أصل {(sub.amount || defaultAmount).toLocaleString()} د.ج
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">
                            {defaultAmount.toLocaleString()} د.ج (مستحق)
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        {sub?.paidDate ? (
                          <div>
                            <div className="font-bold text-gray-800">{sub.paidDate}</div>
                            {sub.receiptNumber && (
                              <div className="text-[11px] text-emerald-700 font-mono mt-0.5">
                                وصل: {sub.receiptNumber}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {!isPaid && (
                            <button
                              onClick={() => handleQuickPay(student)}
                              title="تسجيل دفع سريع بالمبلغ الافتراضي"
                              disabled={loadingAction}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition active:scale-95"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span className="hidden lg:inline">دفع سريع</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenEdit(student, sub)}
                            title="تعديل التفاصيل أو الدفع الجزئي"
                            className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {sub && (isPaid || isPartial) && (
                            <button
                              onClick={() => handleOpenReceipt(student, sub)}
                              title="طباعة وصل الدفع"
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          )}

                          {sub && (
                            <button
                              onClick={() => handleDeleteSub(student, sub)}
                              title="إلغاء الاشتراك"
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit / Add Modal */}
      {isEditModalOpen && currentStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black">
                  {currentSub ? 'تعديل بيانات الاشتراك السنوي' : 'تسجيل اشتراك سنوي جديد'}
                </h3>
                <p className="text-xs text-emerald-100 mt-1">
                  الطالب: <strong className="text-white">{currentStudent.name}</strong> ({currentStudent.level})
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 hover:bg-white/20 rounded-xl transition text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">السنة الدراسية</label>
                  <input
                    disabled
                    value={selectedYear}
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold text-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">حالة الدفع</label>
                  <select
                    value={formData.status}
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      setFormData({
                        ...formData,
                        status: newStatus,
                        paidAmount: newStatus === 'unpaid' ? 0 : (newStatus === 'paid' ? formData.amount : formData.paidAmount)
                      });
                    }}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="paid">تم الدفع بالكامل ✅</option>
                    <option value="partial">دفع جزئي ⚠️</option>
                    <option value="unpaid">لم يتم الدفع ❌</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">المبلغ المستحق (د.ج)</label>
                  <input
                    type="number"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">المبلغ المدفوع (د.ج)</label>
                  <input
                    type="number"
                    required
                    value={formData.paidAmount}
                    onChange={(e) => setFormData({ ...formData, paidAmount: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-bold text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">تاريخ الدفع</label>
                  <input
                    type="date"
                    required
                    value={formData.paidDate}
                    onChange={(e) => setFormData({ ...formData, paidDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">طريقة الدفع</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="cash">نقداً (Espèces)</option>
                    <option value="bank">تحويل بنكي / بريدي (Virement)</option>
                    <option value="check">صك (Chèque)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">رقم الوصل / الإيصال</label>
                <input
                  type="text"
                  value={formData.receiptNumber}
                  onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
                  placeholder="مثال: REC-2605-1234"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-mono text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ملاحظات إضافية</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="ملاحظات حول الدفعة، إعفاء جزئي، إلخ..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loadingAction}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-md transition active:scale-95 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  حفظ البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {isReceiptModalOpen && currentStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden print:p-0 print:shadow-none animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 bg-gray-100 border-b flex items-center justify-between print:hidden">
              <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-600" />
                معاينة وصل تسديد الاشتراك
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  طباعة الآن
                </button>
                <button
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-8 text-right space-y-6 border-4 border-double border-emerald-700 m-4 rounded-2xl">
              <div className="text-center border-b pb-4">
                <h2 className="text-xl font-black text-emerald-800">مدرسة تعليم القرآن الكريم</h2>
                <p className="text-xs text-gray-500 mt-1">{currentStudent.branch || 'المقر الرئيسي'}</p>
                <div className="inline-block mt-3 px-6 py-1 bg-emerald-100 text-emerald-900 rounded-full text-sm font-extrabold">
                  وصل استلام اشتراك سنوي ({selectedYear})
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-gray-500 border-b pb-2">
                <div>
                  رقم الوصل: <strong className="font-mono text-gray-900">{currentSub?.receiptNumber || 'REC-XXXX'}</strong>
                </div>
                <div>
                  تاريخ التسديد: <strong className="text-gray-900">{currentSub?.paidDate || format(new Date(), 'yyyy-MM-dd')}</strong>
                </div>
              </div>

              <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">اسم الطالب(ة):</span>
                  <span className="font-bold text-gray-900 text-sm">{currentStudent.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">كود الطالب:</span>
                  <span className="font-mono font-bold text-gray-700">#{currentStudent.code || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">المستوى الدراسي:</span>
                  <span className="font-bold text-gray-800">{currentStudent.level || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">طريقة الدفع:</span>
                  <span className="font-semibold text-gray-800">
                    {currentSub?.paymentMethod === 'bank' ? 'تحويل بنكي' : (currentSub?.paymentMethod === 'check' ? 'صك' : 'نقداً')}
                  </span>
                </div>
              </div>

              <div className="bg-emerald-50 border-2 border-emerald-500 p-4 rounded-2xl text-center">
                <p className="text-xs text-emerald-800 font-bold mb-1">المبلغ المقبوض</p>
                <p className="text-3xl font-black text-emerald-900">
                  {((currentSub?.paidAmount ?? currentSub?.amount) || defaultAmount).toLocaleString()} <span className="text-base font-normal">دينار جزائري</span>
                </p>
                {currentSub?.status === 'partial' && (
                  <p className="text-xs text-amber-700 mt-1 font-bold">
                    (دفع جزئي من أصل {(currentSub?.amount || defaultAmount).toLocaleString()} د.ج)
                  </p>
                )}
              </div>

              {currentSub?.notes && (
                <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg">
                  <strong>ملاحظة:</strong> {currentSub.notes}
                </div>
              )}

              <div className="pt-8 flex justify-between items-end text-xs text-gray-600">
                <div className="text-center w-36">
                  <p className="font-bold mb-8">ولي أمر الطالب</p>
                  <p className="text-[10px] text-gray-400">التوقيع</p>
                </div>
                <div className="text-center w-36">
                  <p className="font-bold mb-8">إدارة المدرسة والختم</p>
                  <p className="text-[10px] text-gray-400">التوقيع والختم</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
