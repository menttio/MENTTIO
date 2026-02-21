import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  Calendar, 
  Filter, 
  Search,
  ChevronDown,
  Loader2,
  User,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { parseISO, isAfter, isBefore, startOfDay, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import BookingCard from '../components/booking/BookingCard';
import EditBookingDialog from '../components/booking/EditBookingDialog';
import CreateBookingDialog from '../components/teacher/CreateBookingDialog';

export default function TeacherClassHistory() {
  const [bookings, setBookings] = useState([]);
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  const [editingBooking, setEditingBooking] = useState(null);
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const loadBookings = async () => {
    try {
      const user = await base44.auth.me();
      const allBookings = await base44.entities.Booking.filter({ 
        teacher_email: user.email 
      });
      setBookings(allBookings);

      const teachers = await base44.entities.Teacher.filter({ user_email: user.email });
      if (teachers.length > 0) {
        setTeacher(teachers[0]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const now = new Date();

  // Get unique students for filter
  const uniqueStudents = [...new Set(bookings.map(b => b.student_name))].sort();

  const filteredBookings = bookings
    .filter(booking => {
      const bookingDateTime = new Date(`${booking.date}T${booking.start_time}`);
      const isPast = isBefore(bookingDateTime, now);
      
      // Status filter
      if (filter === 'upcoming') {
        return booking.status === 'scheduled' && !isPast;
      }
      if (filter === 'completed') {
        return booking.status === 'completed' || (booking.status === 'scheduled' && isPast);
      }
      if (filter === 'cancelled') {
        return booking.status === 'cancelled';
      }
      if (filter === 'unpaid') {
        return booking.payment_status === 'pending' && booking.status !== 'cancelled';
      }
      if (filter === 'paid') {
        return booking.payment_status === 'paid';
      }
      return true;
    })
    .filter(booking => {
      // Student filter
      if (selectedStudent !== 'all') {
        return booking.student_name === selectedStudent;
      }
      return true;
    })
    .filter(booking => {
      // Search filter
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        booking.subject_name?.toLowerCase().includes(query) ||
        booking.student_name?.toLowerCase().includes(query)
      );
    })
    .filter(booking => {
      // Date range filter
      if (!dateRange.from && !dateRange.to) return true;
      const bookingDate = parseISO(booking.date);
      
      if (dateRange.from && dateRange.to) {
        return bookingDate >= startOfDay(dateRange.from) && bookingDate <= startOfDay(dateRange.to);
      }
      if (dateRange.from) {
        return bookingDate >= startOfDay(dateRange.from);
      }
      if (dateRange.to) {
        return bookingDate <= startOfDay(dateRange.to);
      }
      return true;
    })
    .sort((a, b) => {
      // Sort
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (sortBy === 'date_desc') return dateB - dateA;
      if (sortBy === 'date_asc') return dateA - dateB;
      return 0;
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#41f2c0]" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#404040]">Historial de Clases</h1>
          <p className="text-gray-500 mt-2">Todas tus clases con filtros avanzados</p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
        >
          <Plus size={18} className="mr-2" />
          Crear Reserva
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Buscar por asignatura o alumno..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Student Filter */}
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger className="w-full md:w-48">
              <div className="flex items-center gap-2">
                <User size={16} />
                <SelectValue placeholder="Todos los alumnos" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los alumnos</SelectItem>
              {uniqueStudents.map(student => (
                <SelectItem key={student} value={student}>{student}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Range */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full md:w-auto">
                <Calendar size={16} className="mr-2" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'dd/MM/yy')} - {format(dateRange.to, 'dd/MM/yy')}
                    </>
                  ) : (
                    format(dateRange.from, 'dd/MM/yyyy')
                  )
                ) : (
                  'Seleccionar fechas'
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarPicker
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                locale={es}
                numberOfMonths={2}
              />
              {(dateRange.from || dateRange.to) && (
                <div className="p-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDateRange({ from: null, to: null })}
                    className="w-full"
                  >
                    Limpiar fechas
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          {/* Status Tabs */}
          <Tabs value={filter} onValueChange={setFilter} className="flex-1 w-full overflow-x-auto">
            <TabsList className="bg-gray-100 w-full lg:w-auto justify-start lg:justify-center">
              <TabsTrigger value="all" className="text-xs sm:text-sm whitespace-nowrap">Todas</TabsTrigger>
              <TabsTrigger value="upcoming" className="text-xs sm:text-sm whitespace-nowrap">Próximas</TabsTrigger>
              <TabsTrigger value="completed" className="text-xs sm:text-sm whitespace-nowrap">Completadas</TabsTrigger>
              <TabsTrigger value="paid" className="text-xs sm:text-sm whitespace-nowrap">Pagadas</TabsTrigger>
              <TabsTrigger value="unpaid" className="text-xs sm:text-sm whitespace-nowrap">No Pagadas</TabsTrigger>
              <TabsTrigger value="cancelled" className="text-xs sm:text-sm whitespace-nowrap">Canceladas</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Más recientes</SelectItem>
              <SelectItem value="date_asc">Más antiguas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <div className="mb-4 text-sm text-gray-500">
        {filteredBookings.length} {filteredBookings.length === 1 ? 'clase encontrada' : 'clases encontradas'}
      </div>

      {/* Classes List */}
      {filteredBookings.length > 0 ? (
        <div className="space-y-4">
          {filteredBookings.map((booking, idx) => (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <BookingCard
                booking={booking}
                userRole="teacher"
                onEdit={(b) => setEditingBooking(b)}
                onRefresh={loadBookings}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Calendar className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="font-medium text-[#404040] mb-2">No se encontraron clases</h3>
          <p className="text-gray-500 text-sm">
            {searchQuery || selectedStudent !== 'all' || dateRange.from || dateRange.to
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Aún no tienes clases registradas'}
          </p>
        </div>
      )}

      {/* Edit Dialog */}
      {editingBooking && (
        <EditBookingDialog
          booking={editingBooking}
          open={!!editingBooking}
          onClose={() => setEditingBooking(null)}
          onSave={loadBookings}
          userRole="teacher"
        />
      )}

      {/* Create Booking Dialog */}
      <CreateBookingDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        teacher={teacher}
        onSuccess={loadBookings}
      />
    </div>
  );
}