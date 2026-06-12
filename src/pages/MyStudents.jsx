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
  ChevronUp,
  Star,
  TrendingUp,
  Download,
  Send,
  CheckCircle2
} from 'lucide-react';
import { downloadReport } from '@/lib/reportPdf';
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
  const [reportMonths, setReportMonths] = useState({});
  const [sendMonth, setSendMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [sendingReports, setSendingReports] = useState(false);
  const [sentCount, setSentCount] = useState(null);

  const currentMonth = format(new Date(), 'yyyy-MM');

  // Antes apuntaba a n8n Cloud. Ahora al Cloudflare Worker (configurable por entorno).
  const INFORME_WEBHOOK =
    import.meta.env.VITE_AUTOMATIONS_URL
      ? `${import.meta.env.VITE_AUTOMATIONS_URL}/informe-progreso`
      : 'https://menttio-automations.TU-SUBDOMINIO.workers.dev/informe-progreso';

  const handleSendReports = async () => {
    setSendingReports(true);
    setSentCount(null);
    try {
      const now = new Date();
      const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      const [year, month] = sendMonth.split('-');
      const mesLabel = `${monthNames[parseInt(month) - 1]} ${year}`;

      const studentMap = {};
      for (const b of bookings) {
        if (!b.date?.startsWith(sendMonth)) continue;
        if (b.status === 'cancelled') continue;
        const isPast = new Date(`${b.date}T${b.start_time || '00:00'}`) < now;
        const isCompleted = b.status === 'completed' || (b.status === 'scheduled' && isPast);
        if (!isCompleted) continue;

        const email = b.student_email;
        if (!email) continue;

        if (!studentMap[email]) {
          studentMap[email] = {
            nombre: b.student_name || '',
            email,
            profesor: teacher?.full_name || '',
            emailProfesor: teacher?.user_email || '',
            mesLabel,
            clases: [],
            totalClases: 0,
            totalPrecio: 0,
          };
        }
        const precio = b.price || 0;
        studentMap[email].clases.push({
          fecha: b.date,
          asignatura: b.subject_name || '',
          precio,
          valoracion: b.progress_rating || 0,
          deberes: b.homework_done ?? null,
          nota: b.progress_note || '',
        });
        studentMap[email].totalClases++;
        studentMap[email].totalPrecio += precio;
      }

      const estudiantes = Object.values(studentMap);
      if (estudiantes.length === 0) {
        setSentCount(0);
        return;
      }
      estudiantes.forEach(e => e.clases.sort((a, b) => a.fecha.localeCompare(b.fecha)));

      await fetch(INFORME_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mes: mesLabel, estudiantes }),
      });

      setSentCount(estudiantes.length);
    } catch (e) {
      console.error(e);
      setSentCount(-1);
    } finally {
      setSendingReports(false);
    }
  };

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

          // Get unique student IDs from bookings (including enrolled_students from group bookings)
          const studentIdsSet = new Set();
          allBookings.forEach(b => {
            if (b.student_id) studentIdsSet.add(b.student_id);
            if (b.enrolled_students?.length) {
              b.enrolled_students.forEach(s => { if (s.student_id) studentIdsSet.add(s.student_id); });
            }
          });
          const studentIdsFromBookings = [...studentIdsSet].filter(Boolean);

          // Fetch each student by ID
          const studentMap = {};
          await Promise.all(
            studentIdsFromBookings.map(async (studentId) => {
              const studentData = await base44.entities.Student.filter({ id: studentId });
              if (studentData.length > 0) {
                studentMap[studentId] = studentData[0];
              }
            })
          );

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

    // Homework stats (all bookings where the field was set)
    const homeworkMarked = studentBookings.filter(b => b.homework_done === true || b.homework_done === false);
    const homeworkDone = homeworkMarked.filter(b => b.homework_done === true).length;
    const homeworkStats = { done: homeworkDone, total: homeworkMarked.length };

    return { totalClasses, completedClasses, upcomingClasses, totalSpent, subjects, recentBookings, homeworkStats };
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
         <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
           <div>
             <h1 className="text-lg sm:text-3xl font-bold text-[#404040]">Mis Alumnos</h1>
             <p className="text-gray-500 mt-2 text-sm">Información completa de tus alumnos</p>
           </div>
           <div className="flex items-center gap-2 flex-wrap">
             <input
               type="month"
               value={sendMonth}
               onChange={e => { setSendMonth(e.target.value); setSentCount(null); }}
               className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#41f2c0]"
             />
             <Button
               onClick={handleSendReports}
               disabled={sendingReports}
               className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white h-9 text-sm"
             >
               {sendingReports
                 ? <><Loader2 size={14} className="animate-spin mr-1.5" />Enviando...</>
                 : <><Send size={14} className="mr-1.5" />Enviar informes</>}
             </Button>
             {sentCount !== null && (
               <span className={`text-sm flex items-center gap-1 ${sentCount > 0 ? 'text-green-600' : sentCount === 0 ? 'text-gray-400' : 'text-red-500'}`}>
                 {sentCount > 0
                   ? <><CheckCircle2 size={14} />{sentCount} {sentCount === 1 ? 'informe enviado' : 'informes enviados'}</>
                   : sentCount === 0
                     ? 'Sin clases ese mes'
                     : 'Error al enviar'}
               </span>
             )}
           </div>
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
            <div className="w-10 h-10 rounded-lg bg-[#41f2c0]/10 flex items-center justify-center">
              <BookOpen className="text-[#41f2c0]" size={20} />
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
            <div className="w-10 h-10 rounded-lg bg-[#41f2c0]/10 flex items-center justify-center">
              <Calendar className="text-[#41f2c0]" size={20} />
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
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
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
                              <div className="p-3 rounded-lg bg-gray-50">
                                {stats.homeworkStats.total > 0 ? (
                                  <>
                                    <p className="text-xl font-bold text-[#404040]">
                                      {stats.homeworkStats.done}
                                      <span className="text-sm text-gray-400">/{stats.homeworkStats.total}</span>
                                    </p>
                                    <p className="text-xs text-gray-500">Deberes hechos</p>
                                  </>
                                ) : (
                                  <>
                                    <p className="text-xl font-bold text-gray-300">—</p>
                                    <p className="text-xs text-gray-400">Deberes hechos</p>
                                  </>
                                )}
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

                            {/* Progress notes */}
                            {(() => {
                              const ratedBookings = stats.recentBookings.filter(b => b.progress_rating > 0 || b.progress_note);
                              if (ratedBookings.length === 0) return null;
                              return (
                                <div className="mt-4">
                                  <p className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1.5">
                                    <TrendingUp size={14} className="text-amber-500" />
                                    Notas de progreso
                                  </p>
                                  <div className="space-y-2">
                                    {ratedBookings.map(b => (
                                      <div key={b.id} className="p-3 bg-amber-50/70 border border-amber-100 rounded-lg">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-xs text-amber-600 font-medium">{b.subject_name}</span>
                                          {b.progress_rating > 0 && (
                                            <div className="flex gap-0.5">
                                              {[1,2,3,4,5].map(n => (
                                                <Star key={n} size={12} className={n <= b.progress_rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                        {b.progress_note && (
                                          <p className="text-xs text-amber-900 leading-relaxed">{b.progress_note}</p>
                                        )}
                                        <p className="text-xs text-amber-400 mt-1">
                                          {format(parseISO(b.date), "d 'de' MMMM", { locale: es })}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Monthly report download */}
                            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-3">
                              <Download size={14} className="text-gray-400 flex-shrink-0" />
                              <span className="text-sm text-gray-500">Informe mensual:</span>
                              <input
                                type="month"
                                value={reportMonths[student.id] || currentMonth}
                                onChange={e => setReportMonths(prev => ({ ...prev, [student.id]: e.target.value }))}
                                className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-[#41f2c0]"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-[#41f2c0] text-[#41f2c0] hover:bg-[#41f2c0] hover:text-white h-8 text-xs"
                                onClick={() => {
                                  const month = reportMonths[student.id] || currentMonth;
                                  const studentBookings = bookings.filter(b => b.student_id === student.id);
                                  downloadReport({
                                    studentName: student.full_name,
                                    teacherName: teacher?.full_name || '',
                                    month,
                                    bookings: studentBookings,
                                  });
                                }}
                              >
                                <Download size={13} className="mr-1.5" />
                                Descargar PDF
                              </Button>
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