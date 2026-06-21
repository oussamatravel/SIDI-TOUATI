import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  BookOpen, 
  UserCircle,
  Menu,
  X,
  Shield,
  RefreshCw,
  MessageSquare,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ activeTab, setActiveTab, unreadMessagesCount = 0 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { role } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { id: 'students', label: 'الطلاب', icon: Users },
    { id: 'attendance', label: 'الحضور', icon: CalendarCheck },
    { id: 'memorization', label: 'التسميع', icon: BookOpen },
    { id: 'review', label: 'المراجعة', icon: RefreshCw },
    { id: 'exams', label: 'الامتحانات', icon: FileText },
    { id: 'messages', label: 'الرسائل', icon: MessageSquare },
    { id: 'parents', label: 'بوابة الوالدين', icon: UserCircle },
  ];

  // Add Admin item only for admin role
  if (role === 'admin') {
    menuItems.push({ id: 'admin', label: 'الإدارة', icon: Shield });
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-primary text-white rounded-md relative"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
        {!isOpen && unreadMessagesCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-white"></span>
          </span>
        )}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside className={`
        fixed inset-y-0 right-0 z-40 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0
      `}>
        <div className="h-full flex flex-col">
          <div className="p-6 bg-primary text-white">
            <h1 className="text-2xl font-bold text-center">معلم القرآن</h1>
            <p className="text-sm text-center opacity-80 mt-1">نظام إدارة الطلاب</p>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                  ${activeTab === item.id 
                    ? 'bg-primary text-white shadow-md' 
                    : 'text-gray-600 hover:bg-green-50 hover:text-primary'}
                `}
              >
                <item.icon size={20} />
                <span className="font-medium flex-1 text-right">{item.label}</span>
                {item.id === 'messages' && unreadMessagesCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {unreadMessagesCount}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t text-center text-xs text-gray-400">
            نسخة المعلم v1.0
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
