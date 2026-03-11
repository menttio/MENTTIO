import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { Users, Loader2, Search, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import MyTeacherCard from '../components/student/MyTeacherCard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function MyTeachers() {
  const [student, setStudent] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [removingTeacher, setRemovingTeacher] = useState(null);
  const [removing, setRemoving] = useState(false);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      const students = await base44.entities.Student.filter({ user_email: user.email });
      
      if (students.length > 0) {
        setStudent(students[0]);

        if (students[0].assigned_teachers?.length > 0) {
          const teacherIds = [...new Set(students[0].assigned_teachers.map(at => at.teacher_id))];
          const [teachersData, allBookings] = await Promise.all([
            base44.entities.Teacher.list(),
            base44.entities.Booking.list()
          ]);
          const filtered = teachersData.filter(t => teacherIds.includes(t.id));
          const teachersWithRealClasses = filtered.map(teacher => {
            const completedCount = allBookings.filter(b => 
              b.teacher_id === teacher.id && 
              (b.status === 'completed' || (b.status === 'scheduled' && new Date(`${b.date}T${b.start_time}`) < new Date()))
            ).length;
            return { ...teacher, total_classes: completedCount };
          });
          setTeachers(teachersWithRealClasses);
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

  const filteredTeachers = teachers.filter(teacher => 
    !searchQuery || teacher.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-lg sm:text-3xl font-bold text-[#404040]">Mis Profesores</h1>
        <p className="text-gray-500 mt-2 text-sm">Información detallada de tus profesores asignados</p>
      </motion.div>

      {/* Search and Actions */}
      {teachers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4 mb-6"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Buscar profesor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Link to={createPageUrl('SearchTeachers')}>
            <Button className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white w-full sm:w-auto">
              <Users size={18} className="mr-2" />
              Buscar más profesores
            </Button>
          </Link>
        </motion.div>
      )}

      {/* Teachers Grid */}
      {filteredTeachers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTeachers.map((teacher, idx) => {
            const assignedSubjects = student?.assigned_teachers
              ?.filter(at => at.teacher_id === teacher.id) || [];
            
            return (
              <motion.div
                key={teacher.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + idx * 0.1 }}
              >
                <MyTeacherCard
                  teacher={teacher}
                  assignedSubjects={assignedSubjects}
                  onRemove={setRemovingTeacher}
                />
              </motion.div>
            );
          })}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12 bg-gray-50 rounded-xl"
        >
          <Users className="mx-auto text-gray-300 mb-4" size={64} />
          <h3 className="font-medium text-[#404040] mb-2">
            {searchQuery ? 'No se encontraron profesores' : 'No tienes profesores asignados'}
          </h3>
          <p className="text-gray-500 text-sm mb-6">
            {searchQuery ? 'Intenta con otro nombre' : '¡Busca y añade profesores para empezar!'}
          </p>
          {!searchQuery && (
            <Link to={createPageUrl('SearchTeachers')}>
              <Button className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white">
                <Search size={18} className="mr-2" />
                Buscar Profesores
              </Button>
            </Link>
          )}
        </motion.div>
      )}

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
              {removing ? <Loader2 className="animate-spin" size={16} /> : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}