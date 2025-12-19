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
import { BookOpen, Plus, Edit, Trash2, Loader2, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

export default function ManageSubjects() {
  const [teacher, setTeacher] = useState(null);
  const [allSubjects, setAllSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      const teachers = await base44.entities.Teacher.filter({ user_email: user.email });
      
      if (teachers.length > 0) {
        setTeacher(teachers[0]);
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
    setPrice('');
    setShowDialog(true);
  };

  const handleEdit = (subject) => {
    setEditingSubject(subject);
    setSelectedSubjectId(subject.subject_id);
    setPrice(subject.price_per_hour.toString());
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!selectedSubjectId || !price) return;

    setSaving(true);
    try {
      const selectedSubject = allSubjects.find(s => s.id === selectedSubjectId);
      const currentSubjects = teacher.subjects || [];

      let updatedSubjects;
      if (editingSubject) {
        // Update existing
        updatedSubjects = currentSubjects.map(s =>
          s.subject_id === editingSubject.subject_id
            ? { subject_id: selectedSubjectId, subject_name: selectedSubject.name, price_per_hour: parseFloat(price) }
            : s
        );
      } else {
        // Add new
        updatedSubjects = [
          ...currentSubjects,
          {
            subject_id: selectedSubjectId,
            subject_name: selectedSubject.name,
            price_per_hour: parseFloat(price)
          }
        ];
      }

      await base44.entities.Teacher.update(teacher.id, { subjects: updatedSubjects });
      await loadData();
      setShowDialog(false);
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (subjectId) => {
    try {
      const updatedSubjects = (teacher.subjects || []).filter(s => s.subject_id !== subjectId);
      await base44.entities.Teacher.update(teacher.id, { subjects: updatedSubjects });
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
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#404040]">Mis Asignaturas</h1>
          <p className="text-gray-500 mt-2">Gestiona las materias que impartes y sus precios</p>
        </div>
        <Button
          onClick={handleAdd}
          className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
        >
          <Plus size={18} className="mr-2" />
          Añadir Asignatura
        </Button>
      </div>

      {/* Subjects Grid */}
      {teacher?.subjects?.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4 subjects-management">
          {teacher.subjects.map((subject, idx) => (
            <motion.div
              key={subject.subject_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="hover:shadow-lg transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#41f2c0]/10 flex items-center justify-center">
                        <BookOpen className="text-[#41f2c0]" size={24} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#404040]">{subject.subject_name}</h3>
                        <p className="text-xs text-gray-500">Asignatura</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
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
                        onClick={() => handleDelete(subject.subject_id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-[#41f2c0]/10 rounded-lg">
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
            <DialogTitle>
              {editingSubject ? 'Editar Asignatura' : 'Añadir Asignatura'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Asignatura</Label>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecciona una asignatura" />
                </SelectTrigger>
                <SelectContent>
                  {availableSubjects.map(subject => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
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
              disabled={!selectedSubjectId || !price || saving}
              className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
            >
              {saving ? <Loader2 className="animate-spin" /> : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}