import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  Search, 
  User, 
  Mail, 
  Phone, 
  BookOpen, 
  Calendar,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import StudentsTour from '../components/teacher/StudentsTour';

export default function MyStudents() {
  const [teacher, setTeacher] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const user = await base44.auth.me();

        const teachers = await base44.entities.Teacher.filter({ user_email: user.email });
        if (teachers.length > 0) {
          setTeacher(teachers[0]);

          // Show tour if not completed
          if (!teachers[0].students_tour_completed) {
            setShowTour(true);
          }

          // Load bookings with limit to reduce token usage
          const [scheduledBookings, completedBookings] = await Promise.all([
            base44.entities.Booking.filter({ teacher_id: teachers[0].id, status: 'scheduled' }, 'date', 100),
            base44.entities.Booking.filter({ teacher_id: teachers[0].id, status: 'completed' }, '-date', 50)
          ]);
          const allBookings = [...scheduledBookings, ...completedBookings];
          setBookings(allBookings);

          // Get unique student IDs from bookings
          const studentIdsFromBookings = [...new Set(allBookings.map(b => b.student_id))];
          
          // Get students assigned to this teacher via assigned_teachers (filtered server-side)
          const assignedStudents = await base44.entities.Student.filter({});
          const filteredAssigned = assignedStudents.filter(s => 
            s.assigned_teachers?.some(at => at.teacher_id === teachers[0].id)
          );
          
          // Build final student map (no duplicates)
          const studentMap = {};
          filteredAssigned.forEach(s => { studentMap[s.id] = s; });
          
          // Add students from bookings not already in map
          for (const studentId of studentIdsFromBookings) {
            if (!studentMap[studentId]) {
              const studentData = await base44.entities.Student.filter({ id: studentId });
              if (studentData.length > 0) {
                studentMap[studentId] = studentData[0];
              }
            }
          }
          
          setStudents(Object.values(studentMap));
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const getStudentStats = (studentId) => {
    const studentBookings = bookings.filter(b => b.student_id === studentId);
    const totalClasses = studentBookings.length;
    const completedClasses = studentBookings.filter(b => 
      b.status === 'completed' || 
      (b.status === 'scheduled' && new Date(b.date) < new Date())
    ).length;
    const upcomingClasses = studentBookings.filter(b => 
      b.status === 'scheduled' && new Date(b.date) >= new Date()
    ).length;
    const totalSpent = studentBookings
      .filter(b => b.status !== 'cancelled')
      .reduce((sum, b) => sum + (b.price || 0), 0);
    
    // Get subjects
    const subjects = [...new Set(studentBookings.map(b => b.subject_name))];
    
    // Get recent bookings
    const recentBookings = studentBookings
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
    
    return { totalClasses, completedClasses, upcomingClasses, totalSpent, subjects, recentBookings };
  };

  const filteredStudents = useMemo(() => {
    if (!searchQuery) return students;
    const query = searchQuery.toLowerCase();
    return students.filter(s => 
      s.full_name?.toLowerCase().includes(query) ||
      s.user_email?.toLowerCase().includes(query)
    );
  }, [students, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#41f2c0]" size={40} />
      </div>
    );
  }

  return (
    <>
      {/* Temporarily disabled tour */}
      {/* {showTour && teacher && (
        <StudentsTour
          teacherId={teacher.id}
          onComplete={() => setShowTour(false)}
        />
      )} */}

      <div className="max-w-4xl mx-auto">
         {/* Header */}
         <div className="mb-8">
           <h1 className="text-lg sm:text-3xl font-bold text-[#404040]">Mis Alumnos</h1>
           <p className="text-gray-500 mt-2 text-sm">Información completa de tus alumnos</p>
         </div>

        {/* Search */}
        <div className="relative mb-6 students-search">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Buscar por nombre o email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 students-stats">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#41f2c0]/10 flex items-center justify-center">
              <User className="text-[#41f2c0]" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#404040]">{students.length}</p>
              <p className="text-xs text-gray-500">Total alumnos</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <BookOpen className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#404040]">
                {bookings.filter(b => b.status !== 'cancelled').length}
              </p>
              <p className="text-xs text-gray-500">Total clases</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Calendar className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#404040]">
                {bookings.filter(b => b.status === 'scheduled' && new Date(b.date) >= new Date()).length}
              </p>
              <p className="text-xs text-gray-500">Próximas clases</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Students List */}
      <div className="students-list-container">
      {filteredStudents.length > 0 ? (
        <div className="space-y-4 students-list">
          {filteredStudents.map((student, idx) => {
            const stats = getStudentStats(student.id);
            const isExpanded = expandedStudent === student.id;

            return (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className={cn(
                  "transition-all",
                  isExpanded && "ring-2 ring-[#41f2c0]"
                )}>
                  <CardContent className="p-0">
                    {/* Main Info */}
                    <button
                      onClick={() => setExpandedStudent(isExpanded ? null : student.id)}
                      className="w-full p-5 text-left flex items-center justify-between hover:bg-gray-50 transition-colors student-expand"
                    >
                      <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-[#41f2c0] to-[#35d4a7] flex items-center justify-center flex-shrink-0">
                          {student.profile_photo ? (
                            <img 
                              src={student.profile_photo} 
                              alt={student.full_name}
                              className="w-full h-full object-cover rounded-xl"
                            />
                          ) : (
                            <span className="text-white text-xl font-semibold">
                              {student.full_name?.charAt(0) || 'A'}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[#404040] text-base md:text-lg truncate">{student.full_name}</h3>
                          <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 mt-1 text-xs md:text-sm text-gray-500">
                            <span className="flex items-center gap-1 truncate">
                              <Mail size={14} className="flex-shrink-0" />
                              <span className="truncate">{student.user_email}</span>
                            </span>
                            {student.phone && (
                              <span className="flex items-center gap-1">
                                <Phone size={14} className="flex-shrink-0" />
                                {student.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-xs md:text-sm text-gray-500">{stats.totalClasses} clases</p>
                        <p className="text-sm md:text-base font-semibold text-[#41f2c0]">{stats.totalSpent.toFixed(0)}€</p>
                      </div>
                        {isExpanded ? (
                          <ChevronUp className="text-gray-400" size={20} />
                        ) : (
                          <ChevronDown className="text-gray-400" size={20} />
                        )}
                      </div>
                    </button>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 pt-2 border-t border-gray-100">
                            {/* Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div className="p-3 rounded-lg bg-gray-50">
                                <p className="text-xl font-bold text-[#404040]">{stats.completedClasses}</p>
                                <p className="text-xs text-gray-500">Completadas</p>
                              </div>
                              <div className="p-3 rounded-lg bg-gray-50">
                                <p className="text-xl font-bold text-[#404040]">{stats.upcomingClasses}</p>
                                <p className="text-xs text-gray-500">Próximas</p>
                              </div>
                              <div className="p-3 rounded-lg bg-gray-50">
                                <p className="text-xl font-bold text-[#41f2c0]">{stats.totalSpent.toFixed(0)}€</p>
                                <p className="text-xs text-gray-500">Total</p>
                              </div>
                            </div>

                            {/* Subjects */}
                            <div className="mb-4">
                              <p className="text-sm font-medium text-gray-500 mb-2">Asignaturas</p>
                              <div className="flex flex-wrap gap-2">
                                {stats.subjects.map((subject, idx) => (
                                  <Badge key={idx} className="bg-[#41f2c0]/10 text-[#404040]">
                                    {subject}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            {/* Recent Classes */}
                            <div>
                              <p className="text-sm font-medium text-gray-500 mb-2">Clases recientes</p>
                              <div className="space-y-2">
                                {stats.recentBookings.map((booking) => (
                                  <div 
                                    key={booking.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                                  >
                                    <div className="flex items-center gap-3">
                                      <BookOpen className="text-[#41f2c0]" size={16} />
                                      <div>
                                        <p className="text-sm font-medium text-[#404040]">
                                          {booking.subject_name}
                                        </p>
                                        <p className="text-xs text-gray-500 capitalize">
                                          {format(parseISO(booking.date), "d 'de' MMMM", { locale: es })}
                                          {' · '}
                                          {booking.start_time}
                                        </p>
                                      </div>
                                    </div>
                                    <Badge className={cn(
                                      booking.status === 'cancelled' && "bg-red-100 text-red-600",
                                      booking.status === 'completed' && "bg-gray-100 text-gray-600",
                                      booking.status === 'scheduled' && new Date(booking.date) >= new Date() 
                                        ? "bg-[#41f2c0] text-white"
                                        : "bg-gray-100 text-gray-600"
                                    )}>
                                      {booking.status === 'cancelled' ? 'Cancelada' :
                                       booking.status === 'completed' || new Date(booking.date) < new Date() 
                                         ? 'Completada' : 'Programada'}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <Card className="bg-gray-50 border-dashed">
          <CardContent className="p-8 text-center">
            <User className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="font-medium text-[#404040] mb-2">
              {searchQuery ? 'No se encontraron alumnos' : 'Aún no tienes alumnos'}
            </h3>
            <p className="text-gray-500 text-sm">
              {searchQuery 
                ? 'Intenta con otro término de búsqueda'
                : 'Cuando los alumnos reserven clases contigo, aparecerán aquí'
              }
            </p>
          </CardContent>
        </Card>
      )}
      </div>
      </div>
    </>
  );
}