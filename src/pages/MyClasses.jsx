import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  Calendar, 
  Filter, 
  Search,
  ChevronDown,
  Loader2
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
import { parseISO, isAfter, isBefore, startOfDay } from 'date-fns';
import { motion } from 'framer-motion';
import BookingCard from '../components/booking/BookingCard';
import EditBookingDialog from '../components/booking/EditBookingDialog';
import LeaveReviewDialog from '../components/student/LeaveReviewDialog';

export default function MyClasses() {
  const [bookings, setBookings] = useState([]);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [editingBooking, setEditingBooking] = useState(null);
  const [reviewingBooking, setReviewingBooking] = useState(null);

  const loadBookings = async () => {
    try {
      const user = await base44.auth.me();
      const allBookings = await base44.entities.Booking.filter({ 
        student_email: user.email 
      });
      
      // Enrich bookings with teacher phone if missing
      const teachers = await base44.entities.Teacher.list();
      const enrichedBookings = allBookings.map(booking => {
        if (!booking.teacher_phone) {
          const teacher = teachers.find(t => t.id === booking.teacher_id);
          return { ...booking, teacher_phone: teacher?.phone || '' };
        }
        return booking;
      });
      
      setBookings(enrichedBookings);

      const students = await base44.entities.Student.filter({ user_email: user.email });
      if (students.length > 0) {
        setStudent(students[0]);
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
      return true;
    })
    .filter(booking => {
      // Search filter
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        booking.subject_name?.toLowerCase().includes(query) ||
        booking.teacher_name?.toLowerCase().includes(query)
      );
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
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#404040]">Mis Clases</h1>
        <p className="text-gray-500 mt-2">Historial completo de todas tus clases</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Buscar por asignatura o profesor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status Tabs */}
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="bg-gray-100">
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="upcoming">Próximas</TabsTrigger>
              <TabsTrigger value="completed">Completadas</TabsTrigger>
              <TabsTrigger value="cancelled">Canceladas</TabsTrigger>
              <TabsTrigger value="unpaid">No Pagadas</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Más recientes</SelectItem>
              <SelectItem value="date_asc">Más antiguas</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
                userRole="student"
                onEdit={(b) => setEditingBooking(b)}
                onRefresh={loadBookings}
                onReview={(b) => setReviewingBooking(b)}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Calendar className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="font-medium text-[#404040] mb-2">No se encontraron clases</h3>
          <p className="text-gray-500 text-sm">
            {searchQuery ? 'Intenta con otro término de búsqueda' : 'Aún no tienes clases registradas'}
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
        />
      )}

      {/* Review Dialog */}
      {reviewingBooking && student && (
        <LeaveReviewDialog
          booking={reviewingBooking}
          student={student}
          open={!!reviewingBooking}
          onClose={() => setReviewingBooking(null)}
          onSave={loadBookings}
        />
      )}
    </div>
  );
}