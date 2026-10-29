import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  Play, 
  Calendar as CalendarIcon, 
  User, 
  BookOpen,
  Search,
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
  const [role, setRole] = useState('student');
  const [plan, setPlan] = useState(null);
  const [userEmail, setUserEmail] = useState('');

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      setUserEmail(user.email || '');

      // Esta pantalla la ven los dos lados. Antes solo consultaba por student_email, asi que
      // el profesor no veia ni una clase: ninguna es suya como alumno. Y es el que graba.
      const teachers = await base44.entities.Teacher
        .filter({ user_email: user.email })
        .catch(() => []);
      const esProfesor = teachers.length > 0;
      if (esProfesor) {
        setRole('teacher');
        setPlan(teachers[0].subscription_plan || null);
      }

      const allBookings = esProfesor
        ? await base44.entities.Booking.filter({ teacher_id: teachers[0].id })
        : await base44.entities.Booking.filter({ student_email: user.email });

      const completed = allBookings
        .filter(b => b.status === 'completed' || (b.status === 'scheduled' && !isAfter(parseISO(b.date), startOfDay(new Date()))))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // La reserva ya trae el enlace, pero NO se usa tal cual: el alumno puede retirar el
      // permiso de grabacion en cualquier momento y eso hay que comprobarlo en cada lectura,
      // cosa que solo puede hacer el servidor. Asi que se le pregunta por el enlace, pero
      // solo por las clases que tienen grabacion guardada.
      //
      // Antes se le mandaban todas las clases pasadas. La funcion recorre una por una, con
      // sus consultas, asi que con cien clases a la espalda tardaba demasiado, la llamada se
      // caia entera y no se veia ni una grabacion. Un profesor con historial era justo el
      // que peor lo tenia.
      const conGrabacion = completed.filter(b => b.recording_url);
      // Por defecto, sin enlace: si no se puede comprobar el permiso, no se ensena nada.
      let bookingsWithRecordings = completed.map(b => ({ ...b, recording_url: null, recording_motivo: null }));
      if (conGrabacion.length > 0) {
        try {
          const grabaciones = {};
          for (let i = 0; i < conGrabacion.length; i += 50) {
            const { data } = await base44.functions.invoke('recordingUrl', {
              booking_ids: conGrabacion.slice(i, i + 50).map(b => b.id)
            });
            Object.assign(grabaciones, data?.recordings || {});
          }
          bookingsWithRecordings = bookingsWithRecordings.map(booking => ({
            ...booking,
            recording_url: grabaciones[booking.id]?.recording_url || null,
            recording_motivo: grabaciones[booking.id]?.motivo || null
          }));
        } catch (error) {
          console.error('Error obteniendo los enlaces de grabación:', error);
        }
      }

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

  const esProfesor = role === 'teacher';

  // Drive abre el archivo con la cuenta de Google que este activa en el navegador, no con la
  // que se uso para entrar en Menttio. Quien tenga dos cuentas abiertas (la personal y la
  // del trabajo, por ejemplo) ve "Necesitas acceso" aunque tenga permiso de sobra, y no hay
  // manera de adivinar que el problema es la cuenta. Pasandole la pista, Google ofrece
  // cambiar de cuenta en lugar de dar un portazo.
  const enlaceConCuenta = (url) => {
    if (!url || !userEmail) return url;
    try {
      const enlace = new URL(url);
      if (enlace.hostname !== 'drive.google.com') return url;
      if (!enlace.searchParams.has('authuser')) enlace.searchParams.set('authuser', userEmail);
      return enlace.toString();
    } catch {
      return url;
    }
  };

  // El alumno ve con quien dio la clase y el profesor ve a quien se la dio. En las clases de
  // grupo la reserva no guarda student_name: los alumnos van en la lista de apuntados.
  const nombrePersona = (b) => {
    if (!esProfesor) return b.teacher_name;
    if (b.class_type === 'group') {
      const nombres = (b.enrolled_students || []).map(s => s?.student_name).filter(Boolean);
      return nombres.length > 0 ? nombres.join(', ') : 'Sin alumnos';
    }
    return b.student_name || 'Sin alumno';
  };

  const uniqueSubjects = [...new Set(bookings.map(b => b.subject_name))];
  const uniquePersonas = [...new Set(bookings.map(nombrePersona))].filter(Boolean);

  const filteredBookings = bookings.filter(booking => {
    const persona = nombrePersona(booking);
    const matchesSearch = searchQuery === '' || 
      booking.subject_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      persona?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSubject = filterSubject === 'all' || booking.subject_name === filterSubject;
    const matchesTeacher = filterTeacher === 'all' || persona === filterTeacher;
    
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
        <h1 className="text-lg sm:text-3xl font-bold text-[#404040]">
          {esProfesor ? 'Grabaciones de tus clases' : 'Biblioteca de Clases'}
        </h1>
        <p className="text-gray-500 mt-2 text-sm">
          {esProfesor
            ? 'Solo se muestra la grabación si todos los alumnos de la clase autorizan grabarla. Si uno retira el permiso, deja de verse al momento.'
            : 'Accede a las grabaciones de tus clases completadas'}
        </p>
      </div>

      {/* El plan basico no graba, asi que esta pantalla estaria siempre vacia sin explicar por que. */}
      {esProfesor && plan && plan !== 'premium' && (
        <div className="mb-6 bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-800">
          Tu plan actual no incluye la grabación de clases, así que aquí no aparecerá ninguna.
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder={esProfesor ? 'Buscar por asignatura o alumno...' : 'Buscar por asignatura o profesor...'}
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
                <SelectValue placeholder={esProfesor ? 'Alumno' : 'Profesor'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{esProfesor ? 'Todos los alumnos' : 'Todos los profesores'}</SelectItem>
                {uniquePersonas.map((persona) => (
                  <SelectItem key={persona} value={persona}>
                    {persona}
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
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0 w-full">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#41f2c0] to-[#35d4a7] flex items-center justify-center flex-shrink-0">
                        <BookOpen className="text-white" size={24} />
                      </div>
                      
                      <div className="flex-1 min-w-0 w-full">
                        <h3 className="font-semibold text-[#404040] text-base md:text-lg mb-1 truncate">
                          {booking.subject_name}
                        </h3>
                        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-1 sm:gap-3 text-xs sm:text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <CalendarIcon size={14} />
                            {format(parseISO(booking.date), "d 'de' MMMM, yyyy", { locale: es })}
                          </span>
                          <span className="flex items-center gap-1">
                            <User size={14} />
                            {nombrePersona(booking)}
                          </span>
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            {booking.duration_minutes} min
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {booking.recording_url ? (
                      <Button
                        size="sm"
                        onClick={() => window.open(enlaceConCuenta(booking.recording_url), '_blank')}
                        className="bg-[#41f2c0] hover:bg-[#35d4a7] text-[#404040] flex-shrink-0 w-full md:w-auto"
                      >
                        <Play size={16} className="mr-2" />
                        Ver clase
                        <ExternalLink size={12} className="ml-2" />
                      </Button>
                    ) : (
                      // Distinguir "no hay grabacion" de "hay grabacion pero no se puede
                      // ensenar": lo segundo tiene arreglo (pedir el permiso al alumno) y
                      // antes las dos cosas se veian igual.
                      <Badge
                        variant="secondary"
                        className="text-gray-500 flex-shrink-0 py-2 px-4 w-full md:w-auto text-center"
                        title={booking.recording_motivo === 'sin_consentimiento'
                          ? 'La clase está grabada, pero algún alumno no autoriza la grabación.'
                          : undefined}
                      >
                        {booking.recording_motivo === 'sin_consentimiento'
                          ? 'Sin permiso del alumno'
                          : 'Sin grabación'}
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