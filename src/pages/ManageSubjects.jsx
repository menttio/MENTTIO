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
import { BookOpen, Plus, Edit, Trash2, Loader2, DollarSign, Info, ChevronDown, ChevronUp, Users } from 'lucide-react';
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
  const [customSubjectName, setCustomSubjectName] = useState('');
  const [saving, setSaving] = useState(false);
  const [maxGroupStudents, setMaxGroupStudents] = useState('');
  const [groupPrices, setGroupPrices] = useState({ '2': '', '3': '', '4': '' });
  const [showTour, setShowTour] = useState(false);
  const [levelFilter, setLevelFilter] = useState('all');
  const [expandedGroupPrices, setExpandedGroupPrices] = useState({});

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
    setMaxGroupStudents('');
    setGroupPrices({ '2': '', '3': '', '4': '' });
    setShowDialog(true);
  };

  const handleEdit = (subject) => {
    setEditingSubject(subject);
    setSelectedSubjectId(subject.subject_id || 'custom');
    setSelectedLevel(subject.level || '');
    setPrice((subject.price_per_hour ?? '').toString());
    setCustomSubjectName(subject.subject_id ? '' : subject.subject_name);
    const maxG = subject.max_group_students?.toString() || '';
    setMaxGroupStudents(maxG);
    const gp = subject.group_prices || {};
    setGroupPrices({
      '2': (gp['2'] ?? gp[2] ?? '').toString(),
      '3': (gp['3'] ?? gp[3] ?? '').toString(),
      '4': (gp['4'] ?? gp[4] ?? '').toString(),
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (selectedSubjectId === 'custom' && !customSubjectName.trim()) {
      alert('Por favor, escribe el nombre de la asignatura');
      return;
    }
    if (!selectedSubjectId || !selectedLevel || !price) return;

    setSaving(true);
    try {
      // Fetch fresh teacher data to avoid stale closure
      const user = await base44.auth.me();
      const freshTeachers = await base44.entities.Teacher.filter({ user_email: user.email });
      if (!freshTeachers.length) return;
      const freshTeacher = freshTeachers[0];

      const selectedSubject = selectedSubjectId !== 'custom'
        ? allSubjects.find(s => s.id === selectedSubjectId)
        : null;
      const subjectName = selectedSubjectId === 'custom'
        ? customSubjectName.trim()
        : selectedSubject.name;

      // Build group prices object
      const buildGroupPrices = () => {
        if (!maxGroupStudents) return null;
        const max = parseInt(maxGroupStudents);
        if (isNaN(max) || max < 2) return null;
        const gp = {};
        for (let n = 2; n <= max; n++) {
          const val = groupPrices[String(n)];
          if (val !== '' && val != null) gp[String(n)] = parseFloat(val);
        }
        return Object.keys(gp).length > 0 ? gp : null;
      };

      const builtGroupPrices = buildGroupPrices();

      const entry = {
        subject_id: selectedSubjectId !== 'custom' ? selectedSubjectId : null,
        subject_name: subjectName,
        level: selectedLevel,
        price_per_hour: parseFloat(price),
        max_group_students: maxGroupStudents ? parseInt(maxGroupStudents) : null,
        group_prices: builtGroupPrices,
      };

      // Check for duplicates when adding new
      if (!editingSubject) {
        const isDuplicate = (teacher?.subjects || []).some(s =>
          (s.subject_id ? s.subject_id === entry.subject_id : s.subject_name === subjectName) &&
          s.level === selectedLevel
        );
        if (isDuplicate) {
          alert('Ya tienes esta asignatura con este nivel.');
          setSaving(false);
          return;
        }
      }

      // Build finalSubjects from LOCAL state (preserves group_prices/max_group_students of all cards)
      const localSubjects = teacher?.subjects || [];
      let finalSubjects;
      if (editingSubject) {
        const editIdx = localSubjects.findIndex(s =>
          s.subject_name === editingSubject.subject_name && s.level === editingSubject.level
        );
        finalSubjects = editIdx >= 0
          ? localSubjects.map((s, i) => i === editIdx ? entry : s)
          : [...localSubjects, entry];
      } else {
        finalSubjects = [...localSubjects, entry];
      }

      await base44.entities.Teacher.update(freshTeacher.id, { subjects: finalSubjects });

      // Update local state immediately
      setTeacher(prev => ({ ...prev, subjects: finalSubjects }));

      // Update all students that have this teacher assigned
      const allStudents = await base44.entities.Student.list();
      for (const student of allStudents) {
        if (!student.assigned_teachers?.some(at => at.teacher_id === freshTeacher.id)) continue;
        const updatedAssignedTeachers = student.assigned_teachers.map(at => {
          if (at.teacher_id !== freshTeacher.id) return at;
          const teacherSubject = finalSubjects.find(s => s.subject_id === at.subject_id);
          return teacherSubject ? { ...at, subject_name: teacherSubject.subject_name } : null;
        }).filter(Boolean);
        await base44.entities.Student.update(student.id, { assigned_teachers: updatedAssignedTeachers });
      }

      setShowDialog(false);
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (subjectId, subjectName, level) => {
    try {
      const updatedSubjects = (teacher.subjects || []).filter(s =>
        !(s.level === level && (subjectId ? s.subject_id === subjectId : s.subject_name === subjectName))
      );
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-lg sm:text-3xl font-bold text-[#404040]">Mis Asignaturas</h1>
            <p className="text-gray-500 mt-1 text-sm">Gestiona las materias que impartes y sus precios</p>
          </div>
          <Button
            onClick={handleAdd}
            className="w-full sm:w-auto bg-[#41f2c0] hover:bg-[#35d4a7] text-white add-subject-button"
          >
            <Plus size={18} className="mr-2" />
            Añadir Asignatura
          </Button>
        </div>

        {/* Level filter tabs */}
        {teacher?.subjects?.length > 0 && (
          <div className="flex gap-2 mb-5 flex-wrap">
            {['all', 'ESO', 'Bachillerato', 'Universidad'].map(lvl => (
              <button
                key={lvl}
                onClick={() => setLevelFilter(lvl)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                  levelFilter === lvl
                    ? 'bg-[#41f2c0] text-white border-[#41f2c0]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#41f2c0]'
                }`}
              >
                {lvl === 'all' ? 'Todas' : lvl}
              </button>
            ))}
          </div>
        )}

      {/* Subjects Grid */}
      {teacher?.subjects?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 subjects-management">
          {teacher.subjects.filter(s => levelFilter === 'all' || s.level === levelFilter).map((subject, idx) => (
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
                        onClick={() => handleDelete(subject.subject_id, subject.subject_name, subject.level)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>

                  <div className={`flex items-center gap-2 p-3 bg-[#41f2c0]/10 rounded-lg ${idx === 0 ? 'subject-card-price' : ''}`}>
                    <DollarSign className="text-[#41f2c0]" size={20} />
                    <div>
                      <p className="text-2xl font-bold text-[#41f2c0]">{subject.price_per_hour}€</p>
                      <p className="text-xs text-gray-600">por hora (individual)</p>
                    </div>
                  </div>
                  {subject.max_group_students && parseInt(subject.max_group_students) >= 2 && (
                    <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                      <p className="text-xs font-semibold text-purple-700 mb-2 flex items-center gap-1">
                        <Users size={12} /> Clases grupales (máx. {subject.max_group_students} alumnos)
                      </p>
                      <div className="space-y-1">
                        {Array.from({ length: parseInt(subject.max_group_students) - 1 }, (_, i) => i + 2).map(n => {
                          const gp = subject.group_prices || {};
                          const priceVal = gp[String(n)] ?? gp[n] ?? null;
                          return (
                            <div key={n} className="flex items-center justify-between text-xs">
                              <span className="text-gray-500">{n} alumnos:</span>
                              <span className="font-semibold text-purple-700">
                                {priceVal != null && priceVal !== '' ? `${priceVal}€/h por persona` : <span className="text-gray-400">No configurado</span>}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
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
                  <SelectItem value="custom">Otro (escribir asignatura)</SelectItem>
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
                  placeholder="Escribe el nombre de la asignatura"
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
              <Label>Precio por hora individual (€)</Label>
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

            {/* Group config */}
            <div className="border-t pt-4">
              <Label className="text-sm font-semibold text-[#404040]">Configuración de clases grupales (opcional)</Label>
              <p className="text-xs text-gray-500 mb-3 mt-1">Si no configuras esto, no se ofrecerán clases grupales para esta asignatura.</p>
              <div className="mb-3">
                <Label className="text-xs">Máximo de alumnos por grupo</Label>
                <Select value={maxGroupStudents || 'none'} onValueChange={(v) => setMaxGroupStudents(v === 'none' ? '' : v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Sin clases grupales" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin clases grupales</SelectItem>
                    <SelectItem value="2">2 alumnos</SelectItem>
                    <SelectItem value="3">3 alumnos</SelectItem>
                    <SelectItem value="4">4 alumnos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {maxGroupStudents && (
                <div className="space-y-2 p-3 bg-purple-50 rounded-lg border border-purple-100">
                  <p className="text-xs font-medium text-purple-700">Precio por persona según nº de alumnos en la clase:</p>
                  {Array.from({ length: parseInt(maxGroupStudents) - 1 }, (_, i) => i + 2).map(n => (
                    <div key={n} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-24 shrink-0">{n} alumnos:</span>
                      <Input
                        type="number"
                        value={groupPrices[String(n)] ?? ''}
                        onChange={(e) => setGroupPrices(prev => ({ ...prev, [String(n)]: e.target.value }))}
                        placeholder="€/hora por persona"
                        className="h-8 text-sm"
                        min="0"
                        step="0.5"
                      />
                      <span className="text-xs text-gray-400 shrink-0">€/h por persona</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!selectedSubjectId || !selectedLevel || !price || (selectedSubjectId === 'custom' && !customSubjectName.trim()) || saving}
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