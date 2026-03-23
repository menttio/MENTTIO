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
  Filter,
  BarChart3,
  PieChart,
  Euro
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, startOfYear, endOfYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import WorkloadTour from '../components/teacher/WorkloadTour';

export default function TeacherWorkload() {
  const [teacher, setTeacher] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');
  const [showTour, setShowTour] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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
        
        const scheduledBookings = await base44.entities.Booking.filter({ 
          teacher_id: teachers[0].id,
          status: 'scheduled'
        });
        const completedBookings = await base44.entities.Booking.filter({ 
          teacher_id: teachers[0].id,
          status: 'completed'
        });
        setBookings([...scheduledBookings, ...completedBookings]);
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

  // Monthly earnings by year
  const monthlyEarnings = useMemo(() => {
    const yearStart = startOfYear(new Date(selectedYear, 0, 1));
    const yearEnd = endOfYear(new Date(selectedYear, 0, 1));

    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: format(new Date(selectedYear, i, 1), 'MMM', { locale: es }),
      ingresos: 0,
      clases: 0
    }));

    bookings
      .filter(b => {
        const bookingDate = new Date(b.date);
        return bookingDate >= yearStart && bookingDate <= yearEnd && b.status !== 'cancelled';
      })
      .forEach(b => {
        const monthIndex = new Date(b.date).getMonth();
        monthlyData[monthIndex].ingresos += b.price || 0;
        monthlyData[monthIndex].clases += 1;
      });

    return monthlyData;
  }, [bookings, selectedYear]);

  // Subject distribution for pie chart
  const subjectDistribution = useMemo(() => {
    const distribution = {};
    bookings
      .filter(b => b.status !== 'cancelled')
      .forEach(b => {
        if (!distribution[b.subject_name]) {
          distribution[b.subject_name] = 0;
        }
        distribution[b.subject_name] += b.price || 0;
      });

    return Object.entries(distribution)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [bookings]);

  // Payment status stats
  const paymentStats = useMemo(() => {
    const now = new Date();
    const completed = bookings.filter(b => {
      if (b.status === 'cancelled') return false;
      if (b.status === 'completed') return true;
      // Scheduled but already past
      const bookingDateTime = new Date(`${b.date}T${b.start_time}`);
      return b.status === 'scheduled' && bookingDateTime < now;
    });
    const paid = completed.filter(b => b.payment_status === 'paid').length;
    const pending = completed.filter(b => b.payment_status === 'pending').length;
    const paidAmount = completed.filter(b => b.payment_status === 'paid').reduce((sum, b) => sum + (b.price || 0), 0);
    const pendingAmount = completed.filter(b => b.payment_status === 'pending').reduce((sum, b) => sum + (b.price || 0), 0);

    return { paid, pending, paidAmount, pendingAmount };
  }, [bookings]);

  // Available years for selection
  const availableYears = useMemo(() => {
    const years = new Set();
    bookings.forEach(b => {
      years.add(new Date(b.date).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [bookings]);

  const COLORS = ['#41f2c0', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981'];

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
        <WorkloadTour
          teacherId={teacher.id}
          onComplete={() => setShowTour(false)}
        />
      )} */}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-lg sm:text-3xl font-bold text-[#404040]">Estadísticas</h1>
          <p className="text-gray-500 mt-2 text-sm">Analiza tu desempeño y gestiona tu tiempo</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview">Vista General</TabsTrigger>
            <TabsTrigger value="earnings">Ingresos</TabsTrigger>
            <TabsTrigger value="performance">Rendimiento</TabsTrigger>
            <TabsTrigger value="payments">Pagos</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[#404040]">Resumen del Periodo</h2>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 workload-stats">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          </TabsContent>

          {/* Earnings Tab */}
          <TabsContent value="earnings" className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-semibold text-[#404040]">Análisis de Ingresos</h2>
                <p className="text-sm text-gray-500">Visualiza tus ingresos mensuales por año</p>
              </div>
              <Select 
                value={selectedYear.toString()} 
                onValueChange={(val) => setSelectedYear(parseInt(val))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Monthly earnings chart */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <BarChart3 className="text-[#41f2c0]" size={24} />
                  <h3 className="font-semibold text-[#404040]">Ingresos Mensuales - {selectedYear}</h3>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={monthlyEarnings}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                      formatter={(value) => [`${value.toFixed(2)}€`, 'Ingresos']}
                    />
                    <Bar dataKey="ingresos" fill="#41f2c0" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Year summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Euro className="text-[#41f2c0]" size={20} />
                    <p className="text-sm text-gray-500">Ingresos Totales</p>
                  </div>
                  <p className="text-3xl font-bold text-[#404040]">
                    {monthlyEarnings.reduce((sum, m) => sum + m.ingresos, 0).toFixed(2)}€
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="text-green-500" size={20} />
                    <p className="text-sm text-gray-500">Promedio Mensual</p>
                  </div>
                  <p className="text-3xl font-bold text-[#404040]">
                    {(monthlyEarnings.reduce((sum, m) => sum + m.ingresos, 0) / 12).toFixed(2)}€
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="text-blue-500" size={20} />
                    <p className="text-sm text-gray-500">Total de Clases</p>
                  </div>
                  <p className="text-3xl font-bold text-[#404040]">
                    {monthlyEarnings.reduce((sum, m) => sum + m.clases, 0)}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-[#404040]">Análisis de Rendimiento</h2>
              <p className="text-sm text-gray-500">Distribución de ingresos por asignatura y tendencias</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Subject revenue distribution */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <PieChart className="text-[#41f2c0]" size={24} />
                    <h3 className="font-semibold text-[#404040]">Ingresos por Asignatura</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={subjectDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value.toFixed(0)}€`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {subjectDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value.toFixed(2)}€`} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Monthly classes line chart */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <TrendingUp className="text-blue-500" size={24} />
                    <h3 className="font-semibold text-[#404040]">Clases Mensuales</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyEarnings}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="clases" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Top subjects by revenue */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <BookOpen className="text-[#41f2c0]" size={24} />
                  <h3 className="font-semibold text-[#404040]">Asignaturas con Mayores Ingresos</h3>
                </div>
                <div className="space-y-3">
                  {subjectDistribution.slice(0, 5).map((subject, idx) => (
                    <div key={subject.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600">{subject.name}</span>
                        <span className="text-sm font-semibold text-[#41f2c0]">{subject.value.toFixed(2)}€</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-[#41f2c0] h-2 rounded-full transition-all"
                          style={{ 
                            width: `${(subject.value / subjectDistribution[0]?.value) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-[#404040]">Estado de Pagos</h2>
              <p className="text-sm text-gray-500">Controla los pagos pendientes y realizados</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                      <DollarSign className="text-green-600" size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-green-600 font-medium">Clases Pagadas</p>
                      <p className="text-2xl font-bold text-green-700">{paymentStats.paid}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <p className="text-sm text-green-600">Total cobrado</p>
                    <p className="text-xl font-bold text-green-700">{paymentStats.paidAmount.toFixed(2)}€</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                      <Clock className="text-orange-600" size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-orange-600 font-medium">Clases Pendientes</p>
                      <p className="text-2xl font-bold text-orange-700">{paymentStats.pending}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-orange-200">
                    <p className="text-sm text-orange-600">Total por cobrar</p>
                    <p className="text-xl font-bold text-orange-700">{paymentStats.pendingAmount.toFixed(2)}€</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment rate */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-[#404040] mb-4">Tasa de Cobro</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Pagado</span>
                      <span className="text-sm font-semibold text-green-600">
                        {paymentStats.paid + paymentStats.pending > 0 
                          ? ((paymentStats.paid / (paymentStats.paid + paymentStats.pending)) * 100).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-green-500 h-3 rounded-full transition-all"
                        style={{ 
                          width: `${paymentStats.paid + paymentStats.pending > 0 
                            ? (paymentStats.paid / (paymentStats.paid + paymentStats.pending)) * 100 
                            : 0}%` 
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Pendiente</span>
                      <span className="text-sm font-semibold text-orange-600">
                        {paymentStats.paid + paymentStats.pending > 0 
                          ? ((paymentStats.pending / (paymentStats.paid + paymentStats.pending)) * 100).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-orange-500 h-3 rounded-full transition-all"
                        style={{ 
                          width: `${paymentStats.paid + paymentStats.pending > 0 
                            ? (paymentStats.pending / (paymentStats.paid + paymentStats.pending)) * 100 
                            : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}