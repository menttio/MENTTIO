import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import InteractiveTour from '../components/teacher/InteractiveTour';
import { 
  Calendar, 
  Users, 
  Clock, 
  TrendingUp, 
  ChevronRight,
  BookOpen,
  DollarSign,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { format, parseISO, isAfter, startOfDay, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import BookingCard from '../components/booking/BookingCard';
import ManageSubjectsCard from '../components/teacher/ManageSubjectsCard';
import CreateRecurringBookingDialog from '../components/teacher/CreateRecurringBookingDialog';

export default function TeacherDashboard() {
  const [teacher, setTeacher] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTour, setShowTour] = useState(false);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();

      const teachers = await base44.entities.Teacher.filter({ user_email: user.email });
      if (teachers.length > 0) {
        const teacherData = teachers[0];
        setTeacher(teacherData);
        
        // Show tour if not completed
        if (!teacherData.tour_completed) {
          setShowTour(true);
        }

        // Only fetch scheduled (for upcoming) + this month completed (for earnings stats)
        const today = new Date().toISOString().split('T')[0];
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const [scheduledBookings, completedBookings] = await Promise.all([
          base44.entities.Booking.filter({ teacher_email: user.email, status: 'scheduled' }, 'date', 50),
          base44.entities.Booking.filter({ teacher_email: user.email, status: 'completed' }, '-date', 200)
        ]);
        setBookings([...scheduledBookings, ...completedBookings]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const upcomingBookings = bookings
    .filter(b => b.status === 'scheduled' && isAfter(parseISO(b.date), startOfDay(now)))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  const thisMonthBookings = bookings.filter(b => {
    const bookingDate = parseISO(b.date);
    return isWithinInterval(bookingDate, { start: monthStart, end: monthEnd });
  });

  const thisMonthEarnings = thisMonthBookings
    .filter(b => b.status !== 'cancelled')
    .reduce((sum, b) => sum + (b.price || 0), 0);

  const totalClasses = bookings.filter(b => b.status !== 'cancelled').length;
  const scheduledClasses = bookings.filter(b => b.status === 'scheduled').length;
  const studentsCount = new Set(bookings.map(b => b.student_id)).size;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#41f2c0]" />
          <p className="text-[#404040]">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Temporarily disabled tour */}
      {/* {showTour && teacher && (
        <InteractiveTour
          teacherId={teacher.id}
          teacherName={teacher.full_name}
          onComplete={() => setShowTour(false)}
        />
      )} */}
      
        <div className="max-w-6xl mx-auto">
          {/* Welcome Section */}
          <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-lg sm:text-3xl font-bold text-[#404040]">
          ¡Hola, {teacher?.full_name?.split(' ')[0] || 'Profesor'}! 👋
        </h1>
        <p className="text-gray-500 mt-2 text-sm">
          Bienvenido de nuevo a tu panel de profesor
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-[#41f2c0] to-[#35d4a7] text-white stats-earnings">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <DollarSign size={24} />
              </div>
              <p className="text-3xl font-bold">{thisMonthEarnings.toFixed(0)}€</p>
              <p className="text-sm opacity-80">Ingresos este mes</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="stats-students">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <Users className="text-[#41f2c0]" size={24} />
              </div>
              <p className="text-3xl font-bold text-[#404040]">{studentsCount}</p>
              <p className="text-sm text-gray-500">Alumnos</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="stats-classes">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <BookOpen className="text-[#41f2c0]" size={24} />
              </div>
              <p className="text-3xl font-bold text-[#404040]">{totalClasses}</p>
              <p className="text-sm text-gray-500">Total clases</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Link to={createPageUrl('ReviewsHistory')}>
            <Card className="stats-rating hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-yellow-400">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <Star className="text-yellow-400" size={24} />
                </div>
                <p className="text-3xl font-bold text-[#404040]">{teacher?.rating?.toFixed(1) || '5.0'}</p>
                <p className="text-sm text-gray-500">Valoración</p>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      </div>

      {/* Subjects Management */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mb-8"
      >
        <div className="subjects-card">
          <ManageSubjectsCard teacher={teacher} onUpdate={loadData} />
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Link to={createPageUrl('TeacherCalendar')} className="action-calendar">
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-[#41f2c0] group h-full">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-[#41f2c0] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Calendar className="text-white" size={24} />
                </div>
                <h3 className="font-semibold text-[#404040]">Mi Calendario</h3>
                <p className="text-sm text-gray-500 mt-1">Ver todas tus clases programadas</p>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Link to={createPageUrl('ManageAvailability')} className="action-availability">
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-[#41f2c0] group h-full">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-[#404040] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Clock className="text-white" size={24} />
                </div>
                <h3 className="font-semibold text-[#404040]">Disponibilidad</h3>
                <p className="text-sm text-gray-500 mt-1">Gestiona tu horario</p>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Link to={createPageUrl('MyStudents')} className="action-students">
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-[#41f2c0] group h-full">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Users className="text-[#404040]" size={24} />
                </div>
                <h3 className="font-semibold text-[#404040]">Mis Alumnos</h3>
                <p className="text-sm text-gray-500 mt-1">Ver información de alumnos</p>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      </div>

      {/* Upcoming Classes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="upcoming-classes"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[#404040]">Próximas Clases</h2>
          <Link 
            to={createPageUrl('TeacherCalendar')}
            className="text-[#41f2c0] hover:text-[#35d4a7] flex items-center gap-1 text-sm font-medium"
          >
            Ver calendario <ChevronRight size={16} />
          </Link>
        </div>

        {upcomingBookings.length > 0 ? (
          <div className="space-y-4">
            {upcomingBookings.map((booking) => (
              <BookingCard 
                key={booking.id}
                booking={booking}
                userRole="teacher"
                onRefresh={loadData}
              />
            ))}
          </div>
        ) : (
          <Card className="bg-gray-50 border-dashed">
            <CardContent className="p-8 text-center">
              <Calendar className="mx-auto text-gray-300 mb-4" size={48} />
              <h3 className="font-medium text-[#404040] mb-2">No tienes clases programadas</h3>
              <p className="text-gray-500 text-sm">Cuando los alumnos reserven, aparecerán aquí</p>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
    </>
  );
}