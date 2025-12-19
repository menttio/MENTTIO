import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { 
  Calendar, 
  BookOpen, 
  Clock, 
  TrendingUp, 
  ChevronRight,
  Search,
  Plus,
  User,
  Trash2,
  Star,
  DollarSign,
  Play,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isAfter, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import BookingCard from '../components/booking/BookingCard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function StudentDashboard() {
  const [student, setStudent] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [removingTeacher, setRemovingTeacher] = useState(null);
  const [removing, setRemoving] = useState(false);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const students = await base44.entities.Student.filter({ user_email: currentUser.email });
      if (students.length > 0) {
        setStudent(students[0]);

        const allBookings = await base44.entities.Booking.filter({ 
          student_email: currentUser.email 
        });
        setBookings(allBookings);

        // Load assigned teachers details
        if (students[0].assigned_teachers?.length > 0) {
          const teacherIds = [...new Set(students[0].assigned_teachers.map(at => at.teacher_id))];
          const teachersData = await base44.entities.Teacher.list();
          setTeachers(teachersData.filter(t => teacherIds.includes(t.id)));
        }
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

  const upcomingBookings = bookings
    .filter(b => b.status === 'scheduled' && isAfter(parseISO(b.date), startOfDay(new Date())))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 3);

  const completedBookings = bookings
    .filter(b => b.status === 'completed' || (b.status === 'scheduled' && !isAfter(parseISO(b.date), startOfDay(new Date()))))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  const totalClasses = bookings.length;
  const completedClasses = bookings.filter(b => b.status === 'completed').length;
  const scheduledClasses = bookings.filter(b => b.status === 'scheduled').length;

  const handleRemoveTeacher = async () => {
    if (!removingTeacher) return;
    
    setRemoving(true);
    try {
      const updatedAssignments = student.assigned_teachers.filter(
        at => at.teacher_id !== removingTeacher.id
      );
      
      await base44.entities.Student.update(student.id, {
        assigned_teachers: updatedAssignments
      });
      
      await loadData();
      setRemovingTeacher(null);
    } catch (error) {
      console.error(error);
    } finally {
      setRemoving(false);
    }
  };

  const getTeacherSubjects = (teacherId) => {
    return student?.assigned_teachers
      ?.filter(at => at.teacher_id === teacherId)
      .map(at => at.subject_name) || [];
  };

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
    <div className="max-w-6xl mx-auto">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-[#404040]">
          ¡Hola, {student?.full_name?.split(' ')[0] || 'Alumno'}! 👋
        </h1>
        <p className="text-gray-500 mt-2">
          Bienvenido de nuevo a tu portal de clases
        </p>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Link to={createPageUrl('BookClass')}>
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-[#41f2c0] group">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-[#41f2c0] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Plus className="text-white" size={24} />
                </div>
                <h3 className="font-semibold text-[#404040]">Reservar Clase</h3>
                <p className="text-sm text-gray-500 mt-1">Programa tu próxima sesión</p>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Link to={createPageUrl('MyClasses')}>
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-[#41f2c0] group">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-[#404040] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Calendar className="text-white" size={24} />
                </div>
                <h3 className="font-semibold text-[#404040]">Mis Clases</h3>
                <p className="text-sm text-gray-500 mt-1">Ver historial completo</p>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Link to={createPageUrl('SearchTeachers')}>
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-[#41f2c0] group">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Search className="text-[#404040]" size={24} />
                </div>
                <h3 className="font-semibold text-[#404040]">Buscar Profesores</h3>
                <p className="text-sm text-gray-500 mt-1">Descubre nuevos tutores</p>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-gradient-to-br from-[#41f2c0] to-[#35d4a7] text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp size={24} />
                <span className="text-3xl font-bold">{student?.assigned_teachers?.length || 0}</span>
              </div>
              <h3 className="font-semibold">Profesores Asignados</h3>
              <p className="text-sm opacity-80 mt-1">En tu lista actual</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#41f2c0]/10 flex items-center justify-center">
                <BookOpen className="text-[#41f2c0]" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#404040]">{totalClasses}</p>
                <p className="text-xs text-gray-500">Total clases</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Clock className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#404040]">{completedClasses}</p>
                <p className="text-xs text-gray-500">Completadas</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Calendar className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#404040]">{scheduledClasses}</p>
                <p className="text-xs text-gray-500">Programadas</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* My Teachers */}
      {teachers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[#404040]">Mis Profesores</h2>
            <Link 
              to={createPageUrl('SearchTeachers')}
              className="text-[#41f2c0] hover:text-[#35d4a7] flex items-center gap-1 text-sm font-medium"
            >
              Buscar más <ChevronRight size={16} />
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teachers.map((teacher, idx) => {
              const teacherSubjects = getTeacherSubjects(teacher.id);
              
              return (
                <motion.div
                  key={teacher.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + idx * 0.1 }}
                >
                  <Card className="hover:shadow-md transition-all">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#41f2c0] to-[#35d4a7] flex items-center justify-center flex-shrink-0">
                          {teacher.profile_photo ? (
                            <img 
                              src={teacher.profile_photo} 
                              alt={teacher.full_name}
                              className="w-full h-full object-cover rounded-xl"
                            />
                          ) : (
                            <User className="text-white" size={24} />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[#404040] truncate">
                            {teacher.full_name}
                          </h3>
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="text-yellow-400 fill-yellow-400" size={12} />
                            <span className="text-sm text-gray-500">
                              {teacher.rating?.toFixed(1) || '5.0'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Subjects */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {teacherSubjects.map((subject, idx) => (
                          <Badge 
                            key={idx}
                            variant="secondary"
                            className="bg-[#41f2c0]/10 text-[#404040] text-xs"
                          >
                            {subject}
                          </Badge>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Link 
                          to={createPageUrl('BookClass')}
                          className="flex-1"
                        >
                          <Button 
                            size="sm" 
                            className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
                          >
                            Reservar clase
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRemovingTeacher(teacher)}
                          className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Completed Classes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[#404040]">Clases Realizadas</h2>
          {completedBookings.length > 0 && (
            <Link 
              to={createPageUrl('MyClasses')}
              className="text-[#41f2c0] hover:text-[#35d4a7] flex items-center gap-1 text-sm font-medium"
            >
              Ver historial completo <ChevronRight size={16} />
            </Link>
          )}
        </div>

        {completedBookings.length > 0 ? (
          <div className="grid gap-3">
            {completedBookings.map((booking, idx) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + idx * 0.05 }}
              >
                <Card className="hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                          <BookOpen className="text-green-600" size={20} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[#404040] truncate">
                            {booking.subject_name}
                          </h3>
                          <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar size={14} />
                              {format(parseISO(booking.date), "d 'de' MMMM, yyyy", { locale: es })}
                            </span>
                            <span className="flex items-center gap-1">
                              <User size={14} />
                              {booking.teacher_name}
                            </span>
                          </div>
                        </div>
                      </div>

                      {booking.recording_url ? (
                        <Button
                          size="sm"
                          onClick={() => window.open(booking.recording_url, '_blank')}
                          className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white flex-shrink-0"
                        >
                          <Play size={16} className="mr-2" />
                          Ver clase
                          <ExternalLink size={14} className="ml-1" />
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="text-gray-500 flex-shrink-0">
                          Sin grabación
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="bg-gray-50 border-dashed">
            <CardContent className="p-8 text-center">
              <Play className="mx-auto text-gray-300 mb-4" size={48} />
              <h3 className="font-medium text-[#404040] mb-2">Aún no hay grabaciones disponibles</h3>
              <p className="text-gray-500 text-sm">Las grabaciones de tus clases completadas aparecerán aquí</p>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Upcoming Classes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[#404040]">Próximas Clases</h2>
          <Link 
            to={createPageUrl('MyClasses')}
            className="text-[#41f2c0] hover:text-[#35d4a7] flex items-center gap-1 text-sm font-medium"
          >
            Ver todas <ChevronRight size={16} />
          </Link>
        </div>

        {upcomingBookings.length > 0 ? (
          <div className="grid gap-4">
            {upcomingBookings.map((booking) => (
              <BookingCard 
                key={booking.id}
                booking={booking}
                userRole="student"
                onRefresh={loadData}
              />
            ))}
          </div>
        ) : (
          <Card className="bg-gray-50 border-dashed">
            <CardContent className="p-8 text-center">
              <Calendar className="mx-auto text-gray-300 mb-4" size={48} />
              <h3 className="font-medium text-[#404040] mb-2">No tienes clases programadas</h3>
              <p className="text-gray-500 text-sm mb-4">¡Reserva tu primera clase ahora!</p>
              <Link to={createPageUrl('BookClass')}>
                <Button className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white">
                  <Plus size={18} className="mr-2" />
                  Reservar Clase
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Remove Teacher Dialog */}
      <Dialog open={!!removingTeacher} onOpenChange={(open) => !open && setRemovingTeacher(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar profesor?</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar a <strong>{removingTeacher?.full_name}</strong> de tu lista de profesores?
              Ya no aparecerá como opción al reservar clases.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemovingTeacher(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveTeacher}
              disabled={removing}
            >
              {removing ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Clock size={16} />
                </motion.div>
              ) : (
                <>
                  <Trash2 size={16} className="mr-2" />
                  Eliminar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}