import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { 
  Calendar, 
  Search, 
  BookOpen, 
  Users, 
  Clock, 
  LogOut, 
  Menu, 
  X,
  Home,
  User,
  MessageCircle,
  Bell,
  BarChart3,
  Library,
  Settings,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import NotificationBell from '@/components/notifications/NotificationBell';
import PushNotificationSetup from '@/components/notifications/PushNotificationSetup';

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Skip auth check for public pages
    if (currentPageName === 'SelectRole' || currentPageName === 'Landing' || currentPageName === 'Home' || currentPageName === 'TeacherSignup' || currentPageName === 'Contact' || currentPageName === 'AboutUs' || currentPageName === 'Blog' || currentPageName === 'Careers') {
      setLoading(false);
      return;
    }

    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Check if user is a teacher
        const teachers = await base44.entities.Teacher.filter({ user_email: currentUser.email });
        if (teachers.length > 0) {
          const teacher = teachers[0];
          // Verify subscription is active
          if (teacher.subscription_active && teacher.subscription_expires) {
            const expirationDate = new Date(teacher.subscription_expires);
            if (expirationDate > new Date()) {
              setUserRole('teacher');
            } else {
              // Subscription expired - redirect to renewal
              setUserRole('expired_teacher');
              if (currentPageName !== 'RenewSubscription') {
                window.location.href = createPageUrl('RenewSubscription');
              }
            }
          } else {
            setUserRole('expired_teacher');
            if (currentPageName !== 'RenewSubscription') {
              window.location.href = createPageUrl('RenewSubscription');
            }
          }
        } else {
          // Check if user is a student
          const students = await base44.entities.Student.filter({ user_email: currentUser.email });
          if (students.length > 0) {
            setUserRole('student');
          } else {
            setUserRole('new');
            // Redirect new users to role selection
            if (currentPageName !== 'SelectRole') {
              window.location.href = createPageUrl('SelectRole');
            }
          }
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const studentNavItems = [
    { name: 'Inicio', icon: Home, page: 'StudentDashboard' },
    { name: 'Reservar Clase', icon: Calendar, page: 'BookClass' },
    { name: 'Mis Clases', icon: BookOpen, page: 'MyClasses' },
    { name: 'Buscar Profesores', icon: Search, page: 'SearchTeachers' },
    { name: 'Biblioteca', icon: Library, page: 'ClassRecordings' },
    { name: 'Mensajes', icon: MessageCircle, page: 'Messages' },
    { name: 'Mi Perfil', icon: User, page: 'Profile' },
  ];

  const teacherNavItems = [
    { name: 'Inicio', icon: Home, page: 'TeacherDashboard' },
    { name: 'Calendario', icon: Calendar, page: 'TeacherCalendar' },
    { name: 'Disponibilidad', icon: Clock, page: 'ManageAvailability' },
    { name: 'Asignaturas', icon: Library, page: 'ManageSubjects' },
    { name: 'Alumnos', icon: Users, page: 'MyStudents' },
    { name: 'Estadísticas', icon: BarChart3, page: 'TeacherWorkload' },
    { name: 'Mensajes', icon: MessageCircle, page: 'Messages' },
    { name: 'Ayuda', icon: Bell, page: 'Help' },
    { name: 'Mi Perfil', icon: User, page: 'Profile' },
  ];

  const navItems = userRole === 'teacher' ? teacherNavItems : studentNavItems;

  const handleLogout = () => {
    base44.auth.logout();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f2f2f2] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#41f2c0]" />
          <p className="text-[#404040]">Cargando...</p>
        </div>
      </div>
    );
  }

  if (currentPageName === 'SelectRole' || currentPageName === 'Landing' || currentPageName === 'Home' || currentPageName === 'TeacherSignup' || currentPageName === 'Contact' || currentPageName === 'AboutUs' || currentPageName === 'Blog' || currentPageName === 'Careers') {
    return <div className="min-h-screen bg-[#f2f2f2]">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      <PushNotificationSetup userEmail={user?.email} />
      <style>{`
        :root {
          --primary: #41f2c0;
          --primary-dark: #35d4a7;
          --dark: #404040;
          --light: #f2f2f2;
        }
      `}</style>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
          <h1 className="text-lg font-semibold text-[#404040]">Men<span className="text-[#41f2c0]">π</span>io</h1>
          <div className="flex items-center gap-2">
            <NotificationBell userEmail={user?.email} />
            <div className="w-10 h-10 rounded-full bg-[#41f2c0] flex items-center justify-center">
              <span className="text-white font-medium">
                {user?.full_name?.charAt(0) || 'U'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-100">
            <h1 className="text-2xl font-bold text-[#404040]">
              Men<span className="text-[#41f2c0]">π</span>io
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {userRole === 'teacher' ? 'Portal del Profesor' : 'Portal del Alumno'}
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                  currentPageName === item.page
                    ? "bg-[#41f2c0] text-white shadow-lg shadow-[#41f2c0]/30"
                    : "text-[#404040] hover:bg-gray-100"
                )}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.name}</span>
              </Link>
            ))}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-10 h-10 rounded-full bg-[#41f2c0] flex items-center justify-center">
                <span className="text-white font-medium">
                  {user?.full_name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#404040] truncate">
                  {user?.full_name || 'Usuario'}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <NotificationBell userEmail={user?.email} />
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-gray-500 hover:text-red-500 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut size={18} />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}