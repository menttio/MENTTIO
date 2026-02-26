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
  ArrowLeft,
  AlertCircle,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import NotificationBell from '@/components/notifications/NotificationBell';
import PushNotificationSetup from '@/components/notifications/PushNotificationSetup';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unpaidBookings, setUnpaidBookings] = useState([]);
  const [showPaymentReminder, setShowPaymentReminder] = useState(false);

  useEffect(() => {
    console.log('🔵 Layout useEffect - currentPageName:', currentPageName);
    
    // Public pages that don't require authentication
    const publicPages = ['SelectRole', 'Landing', 'Home', 'TeacherSignup', 'TeacherSignupPayment', 'StudentSignup', 'StudentSignupComplete', 'Contact', 'AboutUs', 'Blog', 'TermsOfService', 'PrivacyPolicy', 'CookiesPolicy', 'LegalNotice', 'AuthRedirect', 'UserNotRegistered'];
    
    if (publicPages.includes(currentPageName)) {
      console.log('✅ Página pública detectada:', currentPageName);
      // Clear the payment reminder flag when user leaves dashboard
      sessionStorage.removeItem('payment_reminder_shown_this_session');
      setLoading(false);
      return;
    }

    console.log('⚠️ Página privada - cargando usuario...');

    // Teacher-only pages
    const teacherPages = ['TeacherDashboard', 'TeacherCalendar', 'ManageAvailability', 'ManageSubjects', 'MyStudents', 'TeacherWorkload', 'RenewSubscription', 'Help', 'TeacherClassHistory'];
    
    // Student-only pages
    const studentPages = ['StudentDashboard', 'BookClass', 'MyClasses', 'SearchTeachers', 'ClassRecordings', 'TeacherProfile'];

    const loadUnreadMessages = async (userEmail, role, profileId) => {
      try {
        const conversations = role === 'teacher'
          ? await base44.entities.Conversation.filter({ teacher_id: profileId })
          : await base44.entities.Conversation.filter({ student_id: profileId });
        
        const total = conversations.reduce((sum, conv) => {
          return sum + (role === 'teacher' ? conv.unread_count_teacher : conv.unread_count_student);
        }, 0);
        
        setUnreadCount(total);
      } catch (error) {
        console.error('Error loading unread messages:', error);
      }
    };

    const loadUser = async () => {
      try {
        console.log('🔍 Intentando cargar usuario...');
        const currentUser = await base44.auth.me();
        console.log('👤 Usuario cargado:', currentUser);
        setUser(currentUser);
        
        // Check if user is a teacher
        console.log('🔍 Buscando profesor con email:', currentUser.email);
        const teachers = await base44.entities.Teacher.filter({ user_email: currentUser.email });
        console.log('📋 Profesores encontrados:', teachers.length);
        
        if (teachers.length > 0) {
          const teacher = teachers[0];
          console.log('👨‍🏫 Perfil profesor:', teacher);
          setProfile(teacher);
          
          // Check if trial is active (has access during trial period)
          if (teacher.trial_active && teacher.trial_end_date) {
            const trialEndDate = new Date(teacher.trial_end_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (trialEndDate < today) {
              console.log('⏰ Período de prueba expirado');
              // Mark trial as inactive
              await base44.entities.Teacher.update(teacher.id, {
                trial_active: false,
                trial_used: true,
                subscription_active: false
              });
              setUserRole('expired_teacher');
              if (currentPageName !== 'RenewSubscription') {
                console.log('➡️ Redirigiendo a renovación por trial expirado...');
                window.location.href = createPageUrl('RenewSubscription');
              }
              return;
            } else {
              // Trial is still active - grant access
              console.log('✅ Profesor en período de prueba activo');
              setUserRole('teacher');
              loadUnreadMessages(currentUser.email, 'teacher', teacher.id);
              
              // Block access to student pages
              if (studentPages.includes(currentPageName)) {
                console.log('🚫 Profesor intentando acceder a página de estudiante, redirigiendo...');
                window.location.href = createPageUrl('TeacherDashboard');
                return;
              }
            }
          }
          
          // Verify subscription is active (for non-trial users)
          if (teacher.subscription_active) {
            // Check expiration date if it exists
            if (teacher.subscription_expires) {
              const expirationDate = new Date(teacher.subscription_expires);
              if (expirationDate > new Date()) {
                console.log('✅ Profesor con suscripción activa');
                setUserRole('teacher');
                
                // Load unread messages
                loadUnreadMessages(currentUser.email, 'teacher', teacher.id);
                
                // Block access to student pages
                if (studentPages.includes(currentPageName)) {
                  console.log('🚫 Profesor intentando acceder a página de estudiante, redirigiendo...');
                  window.location.href = createPageUrl('TeacherDashboard');
                  return;
                }
              } else {
                console.log('⏰ Suscripción expirada');
                // Subscription expired - redirect to renewal
                setUserRole('expired_teacher');
                if (currentPageName !== 'RenewSubscription') {
                  console.log('➡️ Redirigiendo a renovación...');
                  window.location.href = createPageUrl('RenewSubscription');
                }
                return;
              }
            } else {
              // subscription_active is true but no expiration date - grant access
              console.log('✅ Profesor con suscripción activa (sin fecha de expiración)');
              setUserRole('teacher');
              loadUnreadMessages(currentUser.email, 'teacher', teacher.id);
              
              // Block access to student pages
              if (studentPages.includes(currentPageName)) {
                console.log('🚫 Profesor intentando acceder a página de estudiante, redirigiendo...');
                window.location.href = createPageUrl('TeacherDashboard');
                return;
              }
            }
          } else {
            console.log('❌ Sin suscripción activa');
            setUserRole('expired_teacher');
            if (currentPageName !== 'RenewSubscription') {
              console.log('➡️ Redirigiendo a renovación...');
              window.location.href = createPageUrl('RenewSubscription');
            }
            return;
          }
        } else {
          // Check if user is a student
          console.log('🔍 Buscando estudiante con email:', currentUser.email);
          const students = await base44.entities.Student.filter({ user_email: currentUser.email });
          console.log('📋 Estudiantes encontrados:', students.length);
          
          if (students.length > 0) {
            console.log('👨‍🎓 Perfil estudiante:', students[0]);
            setProfile(students[0]);
            setUserRole('student');
            
            // Load unread messages
            loadUnreadMessages(currentUser.email, 'student', students[0].id);
            
            // Check for unpaid bookings - only show on StudentDashboard and once per session
            const hasShownInThisSession = sessionStorage.getItem('payment_reminder_shown_this_session');
            
            if (currentPageName === 'StudentDashboard' && !hasShownInThisSession) {
              const studentBookings = await base44.entities.Booking.filter({ 
                student_id: students[0].id,
                payment_status: 'pending'
              });
              // Filter out cancelled bookings
              const unpaidNonCancelled = studentBookings.filter(b => b.status !== 'cancelled');
              
              if (unpaidNonCancelled.length > 0) {
                setUnpaidBookings(unpaidNonCancelled);
                setShowPaymentReminder(true);
                sessionStorage.setItem('payment_reminder_shown_this_session', 'true');
              }
            }
            
            // Block access to teacher pages
            if (teacherPages.includes(currentPageName)) {
              console.log('🚫 Estudiante intentando acceder a página de profesor, redirigiendo...');
              window.location.href = createPageUrl('StudentDashboard');
              return;
            }
          } else {
            console.log('⚠️ Usuario no registrado como profesor ni estudiante');
            setUserRole('new');
            // Redirect new users to registration warning
            if (currentPageName !== 'UserNotRegistered') {
              console.log('➡️ Redirigiendo a UserNotRegistered...');
              // Save what type of page they were trying to access
              if (teacherPages.includes(currentPageName)) {
                localStorage.setItem('menttio_intended_role', 'teacher');
              } else if (studentPages.includes(currentPageName)) {
                localStorage.setItem('menttio_intended_role', 'student');
              }
              window.location.href = createPageUrl('UserNotRegistered');
            }
          }
        }
      } catch (error) {
        console.error('❌ Error loading user:', error);
      } finally {
        console.log('✅ Carga de usuario finalizada');
        setLoading(false);
      }
    };
    loadUser();
  }, [currentPageName]);

  const studentNavItems = [
    { name: 'Inicio', icon: Home, page: 'StudentDashboard' },
    { name: 'Reservar Clase', icon: Calendar, page: 'BookClass' },
    { name: 'Mis Clases', icon: BookOpen, page: 'MyClasses' },
    { name: 'Mis Profesores', icon: Users, page: 'MyTeachers' },
    { name: 'Buscar Profesores', icon: Search, page: 'SearchTeachers' },
    { name: 'Biblioteca', icon: Library, page: 'ClassRecordings' },
    { name: 'Mensajes', icon: MessageCircle, page: 'Messages' },
    { name: 'Mi Perfil', icon: User, page: 'Profile' },
  ];

  const teacherNavItems = [
    { name: 'Inicio', icon: Home, page: 'TeacherDashboard' },
    { name: 'Calendario', icon: Calendar, page: 'TeacherCalendar' },
    { name: 'Mis Clases', icon: BookOpen, page: 'TeacherClassHistory' },
    { name: 'Disponibilidad', icon: Clock, page: 'ManageAvailability' },
    { name: 'Asignaturas', icon: Library, page: 'ManageSubjects' },
    { name: 'Alumnos', icon: Users, page: 'MyStudents' },
    { name: 'Estadísticas', icon: BarChart3, page: 'TeacherWorkload' },
    { name: 'Mensajes', icon: MessageCircle, page: 'Messages' },
    { name: 'Mi Perfil', icon: User, page: 'Profile' },
  ];

  const navItems = userRole === 'teacher' ? teacherNavItems : studentNavItems;

  const handleLogout = () => {
    base44.auth.logout(createPageUrl('Home'));
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

  // Public pages without layout
  const publicPages = ['SelectRole', 'Landing', 'Home', 'TeacherSignup', 'TeacherSignupPayment', 'StudentSignup', 'StudentSignupComplete', 'Contact', 'AboutUs', 'Blog', 'TermsOfService', 'PrivacyPolicy', 'CookiesPolicy', 'LegalNotice', 'AuthRedirect', 'UserNotRegistered'];
  
  if (publicPages.includes(currentPageName)) {
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

      {/* Payment Reminder Dialog for Students */}
      {userRole === 'student' && (
        <Dialog open={showPaymentReminder} onOpenChange={setShowPaymentReminder}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <AlertCircle className="text-orange-500" size={24} />
                </div>
                <DialogTitle className="text-xl">Recordatorio de Pago</DialogTitle>
              </div>
              <DialogDescription>
                Tienes clases completadas pendientes de pago. ¡No olvides realizar el pago para mantener tu cuenta al día!
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 max-h-60 overflow-y-auto py-2">
              {unpaidBookings.map((booking) => (
                <div 
                  key={booking.id} 
                  className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#404040] truncate">{booking.subject_name}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(booking.date), "d 'de' MMM", { locale: es })} · {booking.start_time}
                    </p>
                    <p className="text-xs text-gray-400">con {booking.teacher_name}</p>
                  </div>
                  <div className="text-right ml-3">
                    <p className="font-bold text-orange-600">{booking.price}€</p>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPaymentReminder(false)}
                className="w-full sm:w-auto"
              >
                Cerrar
              </Button>
              <Button
                onClick={() => {
                  setShowPaymentReminder(false);
                  navigate(createPageUrl('MyClasses') + '?tab=unpaid');
                }}
                className="w-full sm:w-auto bg-[#41f2c0] hover:bg-[#35d4a7]"
              >
                <CreditCard size={16} className="mr-2" />
                Ver mis clases
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
          <h1 className="text-lg font-semibold text-[#404040]" translate="no">Men<span className="text-[#41f2c0]">π</span>io</h1>
          <div className="flex items-center gap-2">
            <NotificationBell userEmail={user?.email} />
            {profile?.profile_photo ? (
              <img 
                src={profile.profile_photo} 
                alt="Profile" 
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#41f2c0] flex items-center justify-center">
                <span className="text-white font-medium">
                  {user?.full_name?.charAt(0) || 'U'}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Desktop Header with Back Button */}
      <header className="hidden lg:block fixed top-4 left-64 right-0 z-10 px-8">
        <Link 
          to={createPageUrl('Home')}
          className="p-2 rounded-lg hover:bg-white hover:shadow-md transition-all text-[#404040] inline-flex items-center justify-center"
        >
          <ArrowLeft size={20} />
        </Link>
      </header>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-100">
            <h1 className="text-2xl font-bold text-[#404040]" translate="no">
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
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative",
                  currentPageName === item.page
                    ? "bg-[#41f2c0] text-white shadow-lg shadow-[#41f2c0]/30"
                    : "text-[#404040] hover:bg-gray-100"
                )}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.name}</span>
                {item.page === 'Messages' && unreadCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          {/* User Section */}
          <div className="p-6 border-t border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              {profile?.profile_photo ? (
                <img 
                  src={profile.profile_photo} 
                  alt="Profile" 
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#41f2c0] flex items-center justify-center">
                  <span className="text-white font-medium">
                    {user?.full_name?.charAt(0) || 'U'}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#404040] truncate">
                  {user?.full_name || 'Usuario'}
                </p>
                <p className="text-xs text-gray-500 truncate break-all">{user?.email}</p>
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
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-16">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}