import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  Play, 
  Calendar as CalendarIcon, 
  User, 
  BookOpen,
  Search,
  Filter,
  ExternalLink,
  Loader2,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, parseISO, isAfter, startOfDay, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function ClassRecordings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterTeacher, setFilterTeacher] = useState('all');
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      const allBookings = await base44.entities.Booking.filter({ 
        student_email: user.email 
      });
      
      const completed = allBookings
        .filter(b => b.status === 'completed' || (b.status === 'scheduled' && !isAfter(parseISO(b.date), startOfDay(new Date()))))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // Obtener links de grabación desde Google Sheets
      const bookingsWithRecordings = await Promise.all(
        completed.map(async (booking) => {
          try {
            const { data } = await base44.functions.invoke('getRecordingLink', { 
              booking_id: booking.id 
            });
            return { ...booking, recording_url: data.recording_url || booking.recording_url };
          } catch (error) {
            console.error(`Error obteniendo link para booking ${booking.id}:`, error);
            return booking;
          }
        })
      );
      
      setBookings(bookingsWithRecordings);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const uniqueSubjects = [...new Set(bookings.map(b => b.subject_name))];
  const uniqueTeachers = [...new Set(bookings.map(b => b.teacher_name))];

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = searchQuery === '' || 
      booking.subject_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.teacher_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSubject = filterSubject === 'all' || booking.subject_name === filterSubject;
    const matchesTeacher = filterTeacher === 'all' || booking.teacher_name === filterTeacher;
    
    let matchesDate = true;
    if (dateFrom || dateTo) {
      const bookingDate = parseISO(booking.date);
      
      if (dateFrom && dateTo) {
        matchesDate = isWithinInterval(bookingDate, { start: dateFrom, end: dateTo });
      } else if (dateFrom) {
        matchesDate = bookingDate >= dateFrom;
      } else if (dateTo) {
        matchesDate = bookingDate <= dateTo;
      }
    }
    
    return matchesSearch && matchesSubject && matchesTeacher && matchesDate;
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#404040]">Biblioteca de Clases</h1>
        <p className="text-gray-500 mt-2">
          Accede a las grabaciones de tus clases completadas
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Buscar por asignatura o profesor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Asignatura" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las asignaturas</SelectItem>
                {uniqueSubjects.map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterTeacher} onValueChange={setFilterTeacher}>
              <SelectTrigger>
                <SelectValue placeholder="Profesor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los profesores</SelectItem>
                {uniqueTeachers.map((teacher) => (
                  <SelectItem key={teacher} value={teacher}>
                    {teacher}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "d 'de' MMMM, yyyy", { locale: es }) : "Fecha desde"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  locale={es}
                  disabled={(date) => dateTo ? date > dateTo : false}
                />
                {dateFrom && (
                  <div className="p-3 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDateFrom(null)}
                      className="w-full"
                    >
                      <X size={16} className="mr-2" />
                      Limpiar
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "d 'de' MMMM, yyyy", { locale: es }) : "Fecha hasta"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  locale={es}
                  disabled={(date) => dateFrom ? date < dateFrom : false}
                />
                {dateTo && (
                  <div className="p-3 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDateTo(null)}
                      className="w-full"
                    >
                      <X size={16} className="mr-2" />
                      Limpiar
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#41f2c0]/10 flex items-center justify-center">
                <BookOpen className="text-[#41f2c0]" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#404040]">{bookings.length}</p>
                <p className="text-xs text-gray-500">Clases totales</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Play className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#404040]">
                  {bookings.filter(b => b.recording_url).length}
                </p>
                <p className="text-xs text-gray-500">Con grabación</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <BookOpen className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#404040]">{uniqueSubjects.length}</p>
                <p className="text-xs text-gray-500">Asignaturas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Count */}
      <p className="text-sm text-gray-500 mb-4">
        {filteredBookings.length} clase{filteredBookings.length !== 1 ? 's' : ''} encontrada{filteredBookings.length !== 1 ? 's' : ''}
      </p>

      {/* Bookings List */}
      {filteredBookings.length > 0 ? (
        <div className="grid gap-3">
          {filteredBookings.map((booking, idx) => (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="hover:shadow-md transition-all">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#41f2c0] to-[#35d4a7] flex items-center justify-center flex-shrink-0">
                        <BookOpen className="text-white" size={24} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[#404040] text-lg mb-1 truncate">
                          {booking.subject_name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <CalendarIcon size={14} />
                            {format(parseISO(booking.date), "d 'de' MMMM, yyyy", { locale: es })}
                          </span>
                          <span className="flex items-center gap-1">
                            <User size={14} />
                            {booking.teacher_name}
                          </span>
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            {booking.duration_minutes} min
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {booking.recording_url ? (
                      <Button
                        size="default"
                        onClick={() => window.open(booking.recording_url, '_blank')}
                        className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white flex-shrink-0"
                      >
                        <Play size={18} className="mr-2" />
                        Ver clase
                        <ExternalLink size={14} className="ml-2" />
                      </Button>
                    ) : (
                      <Badge variant="secondary" className="text-gray-500 flex-shrink-0 py-2 px-4">
                        Sin grabación
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <Card className="bg-gray-50 border-dashed">
          <CardContent className="p-12 text-center">
            <Play className="mx-auto text-gray-300 mb-4" size={64} />
            <h3 className="font-medium text-[#404040] mb-2 text-lg">
              Aún no hay clases completadas
            </h3>
            <p className="text-gray-500">
              Las grabaciones de tus clases aparecerán aquí después de completarlas
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gray-50 border-dashed">
          <CardContent className="p-12 text-center">
            <Search className="mx-auto text-gray-300 mb-4" size={64} />
            <h3 className="font-medium text-[#404040] mb-2 text-lg">
              No se encontraron resultados
            </h3>
            <p className="text-gray-500">
              Intenta con otros filtros de búsqueda
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}