import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, UserPlus, X, Loader2, Check, Users, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

export default function AdminAssignStudents() {
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTeacher, setSearchTeacher] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(null);

  // Dialog form state
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [teacherList, studentList, subjectList] = await Promise.all([
        base44.entities.Teacher.list(),
        base44.entities.Student.list(),
        base44.entities.Subject.list(),
      ]);
      setTeachers(teacherList);
      setStudents(studentList);
      setSubjects(subjectList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getAssignedStudents = (teacher) => {
    if (!teacher) return [];
    // Find students who have this teacher assigned
    return students.filter(s =>
      s.assigned_teachers?.some(at => at.teacher_id === teacher.id)
    );
  };

  const filteredTeachers = teachers.filter(t =>
    !searchTeacher || t.full_name?.toLowerCase().includes(searchTeacher.toLowerCase()) ||
    t.user_email?.toLowerCase().includes(searchTeacher.toLowerCase())
  );

  const filteredStudentsForDialog = students.filter(s =>
    !studentSearch ||
    s.full_name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.user_email?.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const handleOpenAssign = (teacher) => {
    setSelectedTeacher(teacher);
    setSelectedStudentId('');
    setSelectedSubjectId('');
    setStudentSearch('');
    setShowAssignDialog(true);
  };

  const handleAssign = async () => {
    if (!selectedStudentId || !selectedStudentId) return;
    setSaving(true);
    try {
      const student = students.find(s => s.id === selectedStudentId);
      if (!student) return;

      const subject = subjects.find(s => s.id === selectedSubjectId);
      const subjectName = subject?.name || '';

      const alreadyAssigned = student.assigned_teachers?.some(
        at => at.teacher_id === selectedTeacher.id && at.subject_id === selectedSubjectId
      );
      if (alreadyAssigned) {
        setShowAssignDialog(false);
        return;
      }

      const updatedAssignments = [
        ...(student.assigned_teachers || []),
        {
          teacher_id: selectedTeacher.id,
          teacher_name: selectedTeacher.full_name,
          subject_id: selectedSubjectId,
          subject_name: subjectName,
        }
      ];

      await base44.entities.Student.update(student.id, {
        assigned_teachers: updatedAssignments,
      });

      await loadData();
      setShowAssignDialog(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (teacher, student) => {
    setRemoving(`${teacher.id}-${student.id}`);
    try {
      const updatedAssignments = student.assigned_teachers.filter(
        at => at.teacher_id !== teacher.id
      );
      await base44.entities.Student.update(student.id, {
        assigned_teachers: updatedAssignments,
      });
      await loadData();
      // Update selectedTeacher reference after reload
      setSelectedTeacher(prev => prev?.id === teacher.id
        ? teachers.find(t => t.id === teacher.id) || prev
        : prev
      );
    } catch (e) {
      console.error(e);
    } finally {
      setRemoving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#41f2c0]" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#404040]">Asignar Alumnos a Profesores</h1>
        <p className="text-gray-500 mt-2 text-sm">Gestiona manualmente qué alumnos están asignados a cada profesor</p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <Input
          placeholder="Buscar profesor..."
          value={searchTeacher}
          onChange={(e) => setSearchTeacher(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Teachers List */}
      <div className="space-y-4">
        {filteredTeachers.map(teacher => {
          const assignedStudents = getAssignedStudents(teacher);
          return (
            <Card key={teacher.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#41f2c0]/20 flex items-center justify-center">
                      {teacher.profile_photo ? (
                        <img src={teacher.profile_photo} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <span className="text-[#41f2c0] font-semibold">{teacher.full_name?.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base">{teacher.full_name}</CardTitle>
                      <p className="text-xs text-gray-500">{teacher.user_email}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleOpenAssign(teacher)}
                    className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
                  >
                    <UserPlus size={15} className="mr-1.5" />
                    Añadir alumno
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {assignedStudents.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Sin alumnos asignados</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {assignedStudents.map(student => {
                      const assignments = student.assigned_teachers?.filter(at => at.teacher_id === teacher.id) || [];
                      return assignments.map((at, idx) => (
                        <div
                          key={`${student.id}-${idx}`}
                          className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm"
                        >
                          <span className="font-medium text-[#404040]">{student.full_name}</span>
                          {at.subject_name && (
                            <Badge className="text-xs bg-[#41f2c0]/20 text-[#404040] px-1.5 py-0">
                              {at.subject_name}
                            </Badge>
                          )}
                          <button
                            onClick={() => handleRemove(teacher, student)}
                            disabled={removing === `${teacher.id}-${student.id}`}
                            className="text-gray-400 hover:text-red-500 transition-colors ml-1"
                          >
                            {removing === `${teacher.id}-${student.id}`
                              ? <Loader2 size={13} className="animate-spin" />
                              : <X size={13} />
                            }
                          </button>
                        </div>
                      ));
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Añadir alumno a {selectedTeacher?.full_name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Student search + select */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Alumno</label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <Input
                  placeholder="Buscar alumno..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <div className="border rounded-md max-h-40 overflow-y-auto">
                {filteredStudentsForDialog.length === 0 ? (
                  <p className="text-sm text-gray-400 p-3 text-center">Sin resultados</p>
                ) : (
                  filteredStudentsForDialog.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStudentId(s.id)}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors text-sm ${
                        selectedStudentId === s.id ? 'bg-[#41f2c0]/10' : ''
                      }`}
                    >
                      <div>
                        <p className="font-medium text-[#404040]">{s.full_name}</p>
                        <p className="text-xs text-gray-400">{s.user_email}</p>
                      </div>
                      {selectedStudentId === s.id && <Check size={15} className="text-[#41f2c0]" />}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Subject select */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Asignatura</label>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una asignatura..." />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancelar</Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedStudentId || !selectedSubjectId || saving}
              className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : 'Asignar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}