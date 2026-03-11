import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  Search, 
  Filter, 
  SlidersHorizontal,
  X,
  Loader2,
  UserPlus,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import TeacherCard from '../components/student/TeacherCard';

export default function SearchTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [priceRange, setPriceRange] = useState('all');
  const [recordingFilter, setRecordingFilter] = useState('all');
  const [sortBy, setSortBy] = useState('rating');
  
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [assignSubject, setAssignSubject] = useState('');
  const [assigning, setAssigning] = useState(false);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      
      const [students, allTeachers, allSubjects, allBookings] = await Promise.all([
        base44.entities.Student.filter({ user_email: user.email }),
        base44.entities.Teacher.list(),
        base44.entities.Subject.list(),
        base44.entities.Booking.list()
      ]);

      if (students.length > 0) {
        setStudent(students[0]);
      }

      // Calculate real completed classes per teacher
      const teachersWithRealClasses = allTeachers.map(teacher => {
        const completedCount = allBookings.filter(b => 
          b.teacher_id === teacher.id && 
          (b.status === 'completed' || (b.status === 'scheduled' && new Date(`${b.date}T${b.start_time}`) < new Date()))
        ).length;
        return { ...teacher, total_classes: completedCount };
      });
      
      setTeachers(teachersWithRealClasses);
      setSubjects(allSubjects);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const isTeacherAssigned = (teacherId, subjectId = null) => {
    if (!student?.assigned_teachers) return false;
    if (subjectId) {
      return student.assigned_teachers.some(
        at => at.teacher_id === teacherId && at.subject_id === subjectId
      );
    }
    // A teacher is only fully assigned if ALL their subjects are assigned
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher?.subjects?.length) return false;
    
    return teacher.subjects.every(subject => 
      student.assigned_teachers.some(
        at => at.teacher_id === teacherId && at.subject_id === subject.subject_id
      )
    );
  };

  const filteredTeachers = useMemo(() => {
    return teachers
      .filter(teacher => {
        // No mostrar profesores sin asignaturas
        if (!teacher.subjects || teacher.subjects.length === 0) return false;
        
        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          if (!teacher.full_name?.toLowerCase().includes(query)) return false;
        }
        
        // Subject filter
        if (selectedSubject !== 'all') {
          if (!teacher.subjects?.some(s => s.subject_id === selectedSubject)) return false;
        }
        
        // Level filter
        if (selectedLevel !== 'all') {
          if (!teacher.subjects?.some(s => s.level === selectedLevel)) return false;
        }
        
        // Combined subject and level filter
        if (selectedSubject !== 'all' && selectedLevel !== 'all') {
          if (!teacher.subjects?.some(s => s.subject_id === selectedSubject && s.level === selectedLevel)) return false;
        }
        
        // Price filter
        if (priceRange !== 'all' && teacher.subjects?.length > 0) {
          const avgPrice = teacher.subjects.reduce((sum, s) => sum + (s.price_per_hour || 0), 0) / teacher.subjects.length;
          if (priceRange === 'low' && avgPrice > 20) return false;
          if (priceRange === 'medium' && (avgPrice < 20 || avgPrice > 40)) return false;
          if (priceRange === 'high' && avgPrice < 40) return false;
        }
        
        // Recording filter
        if (recordingFilter !== 'all') {
          const hasRecording = teacher.corporate_email && teacher.corporate_email.includes('@menttio.com');
          if (recordingFilter === 'with' && !hasRecording) return false;
          if (recordingFilter === 'without' && hasRecording) return false;
        }
        
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
        if (sortBy === 'classes') return (b.total_classes || 0) - (a.total_classes || 0);
        if (sortBy === 'price_low') {
          const priceA = a.subjects?.[0]?.price_per_hour || 0;
          const priceB = b.subjects?.[0]?.price_per_hour || 0;
          return priceA - priceB;
        }
        if (sortBy === 'price_high') {
          const priceA = a.subjects?.[0]?.price_per_hour || 0;
          const priceB = b.subjects?.[0]?.price_per_hour || 0;
          return priceB - priceA;
        }
        return 0;
      });
  }, [teachers, searchQuery, selectedSubject, priceRange, sortBy]);

  const handleAssignTeacher = (teacher) => {
    setSelectedTeacher(teacher);
    // Pre-select first unassigned subject
    const firstUnassigned = teacher.subjects?.find(s => 
      !isTeacherAssigned(teacher.id, s.subject_id)
    );
    setAssignSubject(firstUnassigned ? `${firstUnassigned.subject_id}-${firstUnassigned.level}` : '');
    setShowAssignDialog(true);
  };

  const confirmAssign = async () => {
    if (!selectedTeacher || !assignSubject) return;
    
    setAssigning(true);
    try {
      const [subjectId, level] = assignSubject.split('-');
      const subject = selectedTeacher.subjects?.find(s => s.subject_id === subjectId && s.level === level);
      
      const newAssignment = {
        teacher_id: selectedTeacher.id,
        teacher_name: selectedTeacher.full_name,
        subject_id: subjectId,
        subject_name: subject?.subject_name || '',
        level: level
      };
      
      const updatedAssignments = [...(student.assigned_teachers || []), newAssignment];
      
      await base44.entities.Student.update(student.id, {
        assigned_teachers: updatedAssignments
      });
      
      setStudent(prev => ({
        ...prev,
        assigned_teachers: updatedAssignments
      }));

      // Enviar email de notificación al profesor
      try {
        const subjectName = subjects.find(s => s.id === subjectId)?.name || subject?.subject_name;
        await base44.integrations.Core.SendEmail({
          to: selectedTeacher.user_email,
          subject: 'Nuevo alumno añadido - Menttio',
          body: `
            <h2>Nuevo Alumno Añadido</h2>
            <p>Hola ${selectedTeacher.full_name},</p>
            <p>Te informamos que un nuevo alumno te ha añadido como profesor:</p>
            <p><strong>Alumno:</strong> ${student.full_name}</p>
            <p><strong>Email:</strong> ${student.user_email}</p>
            <p><strong>Teléfono:</strong> ${student.phone || 'No especificado'}</p>
            <p><strong>Asignatura:</strong> ${subjectName} - ${level}</p>
            <p>El alumno ya puede reservar clases contigo en esta asignatura.</p>
            <p>¡Buena suerte!</p>
          `
        });
      } catch (emailError) {
        console.error('Error enviando email al profesor:', emailError);
        // No fallar la asignación si falla el email
      }
      
      setShowAssignDialog(false);
    } catch (error) {
      console.error(error);
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveTeacher = async (teacher) => {
    try {
      const updatedAssignments = student.assigned_teachers.filter(
        at => at.teacher_id !== teacher.id
      );
      
      await base44.entities.Student.update(student.id, {
        assigned_teachers: updatedAssignments
      });
      
      setStudent(prev => ({
        ...prev,
        assigned_teachers: updatedAssignments
      }));
    } catch (error) {
      console.error(error);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedSubject('all');
    setSelectedLevel('all');
    setPriceRange('all');
    setRecordingFilter('all');
    setSortBy('rating');
  };

  const hasActiveFilters = searchQuery || selectedSubject !== 'all' || selectedLevel !== 'all' || priceRange !== 'all' || recordingFilter !== 'all';

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
        <h1 className="text-lg sm:text-3xl font-bold text-[#404040]">Buscar Profesores</h1>
        <p className="text-gray-500 mt-2 text-sm">Encuentra el profesor perfecto para ti</p>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Buscar por nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {/* Subject Filter */}
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Asignatura" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las asignaturas</SelectItem>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Level Filter */}
          <Select value={selectedLevel} onValueChange={setSelectedLevel}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Nivel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los niveles</SelectItem>
              <SelectItem value="ESO">ESO</SelectItem>
              <SelectItem value="Bachillerato">Bachillerato</SelectItem>
              <SelectItem value="Universidad">Universidad</SelectItem>
            </SelectContent>
          </Select>

          {/* Price Filter */}
          <Select value={priceRange} onValueChange={setPriceRange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Precio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Cualquier precio</SelectItem>
              <SelectItem value="low">Hasta 20€/h</SelectItem>
              <SelectItem value="medium">20€ - 40€/h</SelectItem>
              <SelectItem value="high">Más de 40€/h</SelectItem>
            </SelectContent>
          </Select>

          {/* Recording Filter */}
          <Select value={recordingFilter} onValueChange={setRecordingFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Grabación" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="with">Con grabación</SelectItem>
              <SelectItem value="without">Sin grabación</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Mejor valorados</SelectItem>
              <SelectItem value="classes">Más clases</SelectItem>
              <SelectItem value="price_low">Precio: menor a mayor</SelectItem>
              <SelectItem value="price_high">Precio: mayor a menor</SelectItem>
            </SelectContent>
          </Select>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="text-gray-500"
            >
              <X size={16} className="mr-1" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-500">
          {filteredTeachers.length} profesor{filteredTeachers.length !== 1 ? 'es' : ''} encontrado{filteredTeachers.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Teachers Grid */}
      {filteredTeachers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredTeachers.map((teacher, idx) => (
              <motion.div
                key={teacher.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: idx * 0.05 }}
              >
                <TeacherCard
                  teacher={teacher}
                  isAssigned={isTeacherAssigned(teacher.id)}
                  onAssign={handleAssignTeacher}
                  onRemove={handleRemoveTeacher}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-12">
          <Search className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="font-medium text-[#404040] mb-2">No se encontraron profesores</h3>
          <p className="text-gray-500 text-sm">Intenta con otros filtros de búsqueda</p>
        </div>
      )}

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir profesor</DialogTitle>
            <DialogDescription>
              Selecciona la asignatura para la que quieres añadir a {selectedTeacher?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label>Asignatura</Label>
            <Select value={assignSubject} onValueChange={setAssignSubject}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Selecciona asignatura" />
              </SelectTrigger>
              <SelectContent>
                {selectedTeacher?.subjects?.map((subject, idx) => (
                  <SelectItem 
                    key={`${subject.subject_id}-${subject.level}-${idx}`} 
                    value={`${subject.subject_id}-${subject.level}`}
                    disabled={isTeacherAssigned(selectedTeacher.id, subject.subject_id)}
                  >
                    <div className="flex items-center justify-between w-full gap-2">
                      <span>{subject.subject_name}</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{subject.level}</span>
                      <span className="text-gray-500">{subject.price_per_hour}€/h</span>
                      {isTeacherAssigned(selectedTeacher?.id, subject.subject_id) && (
                        <Check className="text-green-500" size={16} />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmAssign}
              disabled={!assignSubject || assigning || isTeacherAssigned(selectedTeacher?.id, assignSubject)}
              className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
            >
              {assigning ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <UserPlus size={16} className="mr-2" />
                  Añadir profesor
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}