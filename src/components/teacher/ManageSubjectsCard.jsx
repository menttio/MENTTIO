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
import { BookOpen, Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

export default function ManageSubjectsCard({ teacher, onUpdate }) {
  const [allSubjects, setAllSubjects] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
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
    setShowDialog(true);
  };

  const handleEdit = (subject) => {
    setEditingSubject(subject);
    setSelectedSubjectId(subject.subject_id);
    setSelectedLevel(subject.level);
    setPrice(subject.price_per_hour.toString());
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!selectedSubjectId || !selectedLevel || !price) return;

    setSaving(true);
    try {
      const selectedSubject = allSubjects.find(s => s.id === selectedSubjectId);
      const currentSubjects = teacher.subjects || [];

      // Check if this subject+level combination already exists
      const existingIndex = currentSubjects.findIndex(
        s => s.subject_id === selectedSubjectId && s.level === selectedLevel
      );

      let updatedSubjects;
      if (editingSubject) {
        // Update existing - find by original subject_id and level
        updatedSubjects = currentSubjects.map(s =>
          s.subject_id === editingSubject.subject_id && s.level === editingSubject.level
            ? { subject_id: selectedSubjectId, subject_name: selectedSubject.name, level: selectedLevel, price_per_hour: parseFloat(price) }
            : s
        );
      } else {
        // Check for duplicate before adding
        if (existingIndex !== -1) {
          alert('Ya tienes esta asignatura con este nivel. Por favor, edítala en lugar de crear una nueva.');
          setSaving(false);
          return;
        }
        
        // Add new
        updatedSubjects = [
          ...currentSubjects,
          {
            subject_id: selectedSubjectId,
            subject_name: selectedSubject.name,
            level: selectedLevel,
            price_per_hour: parseFloat(price)
          }
        ];
      }

      await base44.entities.Teacher.update(teacher.id, { subjects: updatedSubjects });
      onUpdate();
      setShowDialog(false);
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (subjectId, level) => {
    try {
      const updatedSubjects = (teacher.subjects || []).filter(
        s => !(s.subject_id === subjectId && s.level === level)
      );
      await base44.entities.Teacher.update(teacher.id, { subjects: updatedSubjects });
      onUpdate();
    } catch (error) {
      console.error(error);
    }
  };

  // No filter - allow selecting any subject since level matters too
  const availableSubjects = allSubjects;

  return (
    <>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BookOpen className="text-[#41f2c0]" size={24} />
              <h3 className="font-semibold text-[#404040]">Mis Asignaturas</h3>
            </div>
            <Button
              onClick={handleAdd}
              size="sm"
              className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
            >
              <Plus size={16} className="mr-1" />
              Añadir
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-[#41f2c0]" size={24} />
            </div>
          ) : teacher.subjects?.length > 0 ? (
            <div className="space-y-2">
              {teacher.subjects.map((subject, idx) => (
                <motion.div
                  key={subject.subject_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#41f2c0]/10 flex items-center justify-center">
                      <BookOpen className="text-[#41f2c0]" size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-[#404040]">{subject.subject_name}</p>
                        <Badge variant="secondary" className="text-xs">{subject.level}</Badge>
                      </div>
                      <Badge className="bg-[#41f2c0] text-white text-xs mt-1">
                        {subject.price_per_hour}€/hora
                      </Badge>
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
                      className="h-8 w-8 text-red-500 hover:text-red-600"
                      onClick={() => handleDelete(subject.subject_id, subject.level)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="mx-auto mb-2 text-gray-300" size={32} />
              <p className="text-sm">No has añadido asignaturas aún</p>
            </div>
          )}
        </CardContent>
      </Card>

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
    </>
  );
}