import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  Calendar,
  Clock,
  TrendingUp,
  DollarSign,
  Users,
  BookOpen,
  Loader2,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import WorkloadTour from '../components/teacher/WorkloadTour';

export default function TeacherWorkload() {
  const [teacher, setTeacher] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      const teachers = await base44.entities.Teacher.filter({ user_email: user.email });
      
      if (teachers.length > 0) {
        setTeacher(teachers[0]);
        
        // Show tour if not completed
        if (!teachers[0].workload_tour_completed) {
          setShowTour(true);
        }
        
        const allBookings = await base44.entities.Booking.filter({ 
          teacher_id: teachers[0].id 
        });
        setBookings(allBookings);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const now = new Date();
    let dateRange;

    if (timeRange === 'week') {
      dateRange = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    } else {
      dateRange = { start: startOfMonth(now), end: endOfMonth(now) };
    }

    const filteredBookings = bookings.filter(b => {
      const bookingDate = new Date(b.date);
      return bookingDate >= dateRange.start && bookingDate <= dateRange.end && b.status !== 'cancelled';
    });

    const totalClasses = filteredBookings.length;
    const completedClasses = filteredBookings.filter(b => b.status === 'completed').length;
    const scheduledClasses = filteredBookings.filter(b => b.status === 'scheduled').length;
    const totalEarnings = filteredBookings.reduce((sum, b) => sum + (b.price || 0), 0);
    const totalHours = filteredBookings.reduce((sum, b) => sum + (b.duration_minutes || 60) / 60, 0);

    // Classes by subject
    const subjectStats = {};
    filteredBookings.forEach(b => {
      if (!subjectStats[b.subject_name]) {
        subjectStats[b.subject_name] = 0;
      }
      subjectStats[b.subject_name]++;
    });

    // Classes by student
    const studentStats = {};
    filteredBookings.forEach(b => {
      if (!studentStats[b.student_name]) {
        studentStats[b.student_name] = { count: 0, earnings: 0 };
      }
      studentStats[b.student_name].count++;
      studentStats[b.student_name].earnings += b.price || 0;
    });

    return {
      totalClasses,
      completedClasses,
      scheduledClasses,
      totalEarnings,
      totalHours,
      subjectStats,
      studentStats
    };
  }, [bookings, timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#41f2c0]" size={40} />
      </div>
    );
  }

  return (
    <>
      {showTour && teacher && (
        <WorkloadTour
          teacherId={teacher.id}
          onComplete={() => setShowTour(false)}
        />
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#404040]">Estadísticas</h1>
          <p className="text-gray-500 mt-2">Analiza tu desempeño y gestiona tu tiempo</p>
        </div>
        
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Esta semana</SelectItem>
            <SelectItem value="month">Este mes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 workload-stats">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="text-[#41f2c0]" size={24} />
                <Badge className="bg-[#41f2c0] text-white">{stats.totalClasses}</Badge>
              </div>
              <p className="text-2xl font-bold text-[#404040]">{stats.totalClasses}</p>
              <p className="text-sm text-gray-500">Clases totales</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="text-blue-500" size={24} />
                <Badge className="bg-blue-100 text-blue-600">{stats.scheduledClasses}</Badge>
              </div>
              <p className="text-2xl font-bold text-[#404040]">{stats.totalHours.toFixed(1)}h</p>
              <p className="text-sm text-gray-500">Horas de clase</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="text-green-500" size={24} />
                <TrendingUp className="text-green-500" size={20} />
              </div>
              <p className="text-2xl font-bold text-[#404040]">{stats.totalEarnings.toFixed(2)}€</p>
              <p className="text-sm text-gray-500">Ingresos</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="text-purple-500" size={24} />
                <Badge className="bg-purple-100 text-purple-600">
                  {Object.keys(stats.studentStats).length}
                </Badge>
              </div>
              <p className="text-2xl font-bold text-[#404040]">{Object.keys(stats.studentStats).length}</p>
              <p className="text-sm text-gray-500">Alumnos distintos</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Classes by Subject */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <BookOpen className="text-[#41f2c0]" size={24} />
              <h3 className="font-semibold text-[#404040]">Clases por Asignatura</h3>
            </div>
            <div className="space-y-3">
              {Object.entries(stats.subjectStats)
                .sort(([, a], [, b]) => b - a)
                .map(([subject, count]) => (
                  <div key={subject}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">{subject}</span>
                      <span className="text-sm font-semibold">{count} clases</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#41f2c0] h-2 rounded-full transition-all"
                        style={{ width: `${(count / stats.totalClasses) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Students */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="text-purple-500" size={24} />
              <h3 className="font-semibold text-[#404040]">Principales Alumnos</h3>
            </div>
            <div className="space-y-3">
              {Object.entries(stats.studentStats)
                .sort(([, a], [, b]) => b.count - a.count)
                .slice(0, 5)
                .map(([student, data]) => (
                  <div key={student} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-[#404040]">{student}</p>
                      <p className="text-xs text-gray-500">{data.count} clases</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[#41f2c0]">{data.earnings.toFixed(2)}€</p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}