import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BookOpen, Plus, Edit, Trash2, Loader2, DollarSign, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import SubjectsTour from '../components/teacher/SubjectsTour';

export default function ManageSubjects() {
  const [teacher, setTeacher] = useState(null);
  const [allSubjects, setAllSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      const teachers = await base44.entities.Teacher.filter({ user_email: user.email });
      
      if (teachers.length > 0) {
        const teacherData = teachers[0];
        setTeacher(teacherData);
        
        // Show tour if not completed and has subjects
        if (!teacherData.subjects_tour_completed && teacherData.subjects?.length > 0) {
          setShowTour(true);
        }
      }

      const subjects = await base44.entities.Subject.list();
      setAllSubjects(subjects);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingSubject(null);
    setSelectedSubjectId('');
    setSelectedLevel('');
    setPrice('');
    setCustomSubjectName('');
    setShowDialog(true);
  };

  const handleEdit = (subject) => {
    setEditingSubject(subject);
    setSelectedSubjectId(subject.subject_id);
    setSelectedLevel(subject.level || '');
    setPrice(subject.price_per_hour.toString());
    setShowDialog(true);
  };

  const [customSubjectName, setCustomSubjectName] = useState('');

  const handleSave = async () => {
    if (!selectedSubjectId || !selectedLevel || !price) return;
    if (selectedSubjectId === 'custom' && !customSubjectName.trim()) return;

    setSaving(true);
    try {
      let subjectName;
      let finalSubjectId;

      if (selectedSubjectId === 'custom') {
        // Create a new subject for custom entry
        const newSubject = await base44.entities.Subject.create({
          name: customSubjectName,
          icon: '📖',
          description: 'Asignatura personalizada'
        });
        subjectName = newSubject.name;
        finalSubjectId = newSubject.id;
      } else {
        const selectedSubject = allSubjects.find(s => s.id === selectedSubjectId);
        subjectName = selectedSubject.name;
        finalSubjectId = selectedSubjectId;
      }

      const currentSubjects = teacher.subjects || [];

      let updatedSubjects;
      if (editingSubject) {
        // Update existing
        updatedSubjects = currentSubjects.map(s =>
          s.subject_id === editingSubject.subject_id && s.level === editingSubject.level
            ? { subject_id: finalSubjectId, subject_name: subjectName, level: selectedLevel, price_per_hour: parseFloat(price) }
            : s
        );
      } else {
        // Check for duplicates (same subject + same level)
        const isDuplicate = currentSubjects.some(s => 
          s.subject_id === finalSubjectId && s.level === selectedLevel
        );

        if (isDuplicate) {
          alert('Ya tienes esta asignatura con este nivel. Por favor, edita la existente o elige un nivel diferente.');
          setSaving(false);
          return;
        }

        // Add new
        updatedSubjects = [
          ...currentSubjects,
          {
            subject_id: finalSubjectId,
            subject_name: subjectName,
            level: selectedLevel,
            price_per_hour: parseFloat(price)
          }
        ];
      }

      await base44.entities.Teacher.update(teacher.id, { subjects: updatedSubjects });

      // Update all students that have this teacher assigned
      const user = await base44.auth.me();
      const allStudents = await base44.entities.Student.list();
      
      for (const student of allStudents) {
        if (student.assigned_teachers?.length > 0) {
          const hasThisTeacher = student.assigned_teachers.some(at => at.teacher_id === teacher.id);
          
          if (hasThisTeacher) {
            // Update student's assigned_teachers array to match teacher's current subjects
            const updatedAssignedTeachers = student.assigned_teachers.map(at => {
              if (at.teacher_id === teacher.id) {
                // Check if this subject still exists in teacher's subjects
                const teacherSubject = updatedSubjects.find(s => s.subject_id === at.subject_id);
                if (teacherSubject) {
                  return {
                    ...at,
                    subject_name: teacherSubject.subject_name
                  };
                }
                return null; // Mark for removal
              }
              return at;
            }).filter(at => at !== null); // Remove marked entries

            await base44.entities.Student.update(student.id, {
              assigned_teachers: updatedAssignedTeachers
            });
          }
        }
      }

      await loadData();
      setShowDialog(false);
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (subjectId, level) => {
    try {
      const updatedSubjects = (teacher.subjects || []).filter(s => !(s.subject_id === subjectId && s.level === level));
      await base44.entities.Teacher.update(teacher.id, { subjects: updatedSubjects });

      // Remove this subject from all students that have this teacher assigned
      const allStudents = await base44.entities.Student.list();
      
      for (const student of allStudents) {
        if (student.assigned_teachers?.length > 0) {
          const updatedAssignedTeachers = student.assigned_teachers.filter(at => 
            !(at.teacher_id === teacher.id && at.subject_id === subjectId)
          );

          if (updatedAssignedTeachers.length !== student.assigned_teachers.length) {
            await base44.entities.Student.update(student.id, {
              assigned_teachers: updatedAssignedTeachers
            });
          }
        }
      }

      await loadData();
    } catch (error) {
      console.error(error);
    }
  };

  const availableSubjects = allSubjects.filter(s =>
    editingSubject?.subject_id === s.id || !(teacher?.subjects || []).some(ts => ts.subject_id === s.id)
  );

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
        <SubjectsTour
          teacherId={teacher.id}
          onComplete={() => setShowTour(false)}
        />
      )} */}

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-4">
            <h1 className="text-lg sm:text-3xl font-bold text-[#404040]">Mis Asignaturas</h1>
            <p className="text-gray-500 mt-2 text-sm">Gestiona las materias que impartes y sus precios</p>
          </div>
          <div className="w-full">
            <Button
              onClick={handleAdd}
              className="w-full sm:w-auto bg-[#41f2c0] hover:bg-[#35d4a7] text-white add-subject-button"
            >
              <Plus size={18} className="mr-2" />
              Añadir Asignatura
            </Button>
          </div>
          </div>

      {/* Subjects Grid */}
      {teacher?.subjects?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 subjects-management">
          {teacher.subjects.map((subject, idx) => (
            <motion.div
              key={`${subject.subject_id}-${subject.level}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className={`hover:shadow-lg transition-all ${idx === 0 ? 'subject-card-example' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#41f2c0]/10 flex items-center justify-center">
                        <BookOpen className="text-[#41f2c0]" size={24} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#404040]">{subject.subject_name}</h3>
                        <Badge variant="secondary" className="text-xs mt-1">{subject.level}</Badge>
                      </div>
                    </div>
                    <div className={`flex gap-1 ${idx === 0 ? 'subject-card-actions' : ''}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(subject)}
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(subject.subject_id, subject.level)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>

                  <div className={`flex items-center gap-2 p-3 bg-[#41f2c0]/10 rounded-lg ${idx === 0 ? 'subject-card-price' : ''}`}>
                    <DollarSign className="text-[#41f2c0]" size={20} />
                    <div>
                      <p className="text-2xl font-bold text-[#41f2c0]">{subject.price_per_hour}€</p>
                      <p className="text-xs text-gray-600">por hora</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="mx-auto text-gray-300 mb-4" size={64} />
            <h3 className="font-semibold text-[#404040] mb-2">No has añadido asignaturas</h3>
            <p className="text-gray-500 mb-6">Añade las materias que impartes para que los alumnos puedan reservar clases contigo</p>
            <Button
              onClick={handleAdd}
              className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
            >
              <Plus size={18} className="mr-2" />
              Añadir Primera Asignatura
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>
                {editingSubject ? 'Editar Asignatura' : 'Añadir Asignatura'}
              </DialogTitle>
              <div className="relative group">
                <Info size={16} className="text-gray-400 cursor-help" />
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:block z-50">
                  <div className="bg-[#404040] text-white text-xs rounded-lg p-3 w-72 shadow-lg">
                    <p className="font-semibold mb-1">⚠️ Importante sobre los niveles</p>
                    <p className="mb-2">Debes crear una asignatura separada por cada nivel que enseñes.</p>
                    <p className="text-gray-300">Ejemplo: Si enseñas Matemáticas en ESO, Bachillerato y Universidad, crea 3 asignaturas diferentes con sus respectivos niveles y precios.</p>
                    <div className="absolute right-full top-1/2 -translate-y-1/2 mr-[-1px]">
                      <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[6px] border-r-[#404040]"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Asignatura</Label>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecciona una asignatura" />
                </SelectTrigger>
                <SelectContent>
                  {allSubjects.map(subject => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Otra asignatura</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedSubjectId === 'custom' && (
              <div>
                <Label>Nombre de la asignatura</Label>
                <Input
                  type="text"
                  value={customSubjectName}
                  onChange={(e) => setCustomSubjectName(e.target.value)}
                  placeholder="Ej: Dibujo Técnico"
                  className="mt-2"
                />
              </div>
            )}

            <div>
              <Label>Nivel</Label>
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecciona el nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ESO">ESO</SelectItem>
                  <SelectItem value="Bachillerato">Bachillerato</SelectItem>
                  <SelectItem value="Universidad">Universidad</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Precio por hora (€)</Label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Ej: 25"
                className="mt-2"
                min="0"
                step="0.5"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!selectedSubjectId || !selectedLevel || !price || saving}
              className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
            >
              {saving ? <Loader2 className="animate-spin" /> : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </>
  );
}