import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Loader2 } from 'lucide-react';

export default function EditTeacherProfileDialog({ teacher, open, onClose, onSave }) {
  const [formData, setFormData] = useState({
    bio: teacher?.bio || '',
    experience_years: teacher?.experience_years || 0,
    education: teacher?.education || '',
    teaching_methods: teacher?.teaching_methods || [],
    specializations: teacher?.specializations || [],
    languages: teacher?.languages || [],
    certifications: teacher?.certifications || []
  });
  const [newItem, setNewItem] = useState({
    teaching_method: '',
    specialization: '',
    language: '',
    certification: ''
  });
  const [saving, setSaving] = useState(false);

  const handleAddItem = (field, itemKey) => {
    if (!newItem[itemKey].trim()) return;
    
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], newItem[itemKey].trim()]
    }));
    setNewItem(prev => ({ ...prev, [itemKey]: '' }));
  };

  const handleRemoveItem = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Teacher.update(teacher.id, formData);
      onSave();
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Perfil Profesional</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Bio */}
          <div>
            <Label htmlFor="biografia">Biografía</Label>
            <Textarea id="biografia"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Cuéntanos sobre ti..."
              className="mt-2"
              rows={3}
            />
          </div>

          {/* Experience & Education */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="anos-de-experiencia">Años de experiencia</Label>
              <Input id="anos-de-experiencia"
                type="number"
                value={formData.experience_years}
                onChange={(e) => setFormData({ ...formData, experience_years: Number(e.target.value) })}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="formacion-academica">Formación académica</Label>
              <Input id="formacion-academica"
                value={formData.education}
                onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                placeholder="Ej: Licenciado en Matemáticas"
                className="mt-2"
              />
            </div>
          </div>

          {/* Teaching Methods */}
          <div>
            <Label htmlFor="metodos-de-ensenanza">Métodos de Enseñanza</Label>
            <div className="flex gap-2 mt-2">
              <Input id="metodos-de-ensenanza"
                value={newItem.teaching_method}
                onChange={(e) => setNewItem({ ...newItem, teaching_method: e.target.value })}
                placeholder="Ej: Visual, Práctico..."
                onKeyPress={(e) => e.key === 'Enter' && handleAddItem('teaching_methods', 'teaching_method')}
              />
              <Button
                type="button"
                onClick={() => handleAddItem('teaching_methods', 'teaching_method')}
                size="icon"
              >
                <Plus size={16} />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {formData.teaching_methods.map((method, idx) => (
                <Badge key={idx} variant="secondary" className="gap-1">
                  {method}
                  <X
                    size={14}
                    className="cursor-pointer"
                    onClick={() => handleRemoveItem('teaching_methods', idx)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Specializations */}
          <div>
            <Label htmlFor="especializaciones">Especializaciones</Label>
            <div className="flex gap-2 mt-2">
              <Input id="especializaciones"
                value={newItem.specialization}
                onChange={(e) => setNewItem({ ...newItem, specialization: e.target.value })}
                placeholder="Ej: Álgebra avanzada, Programación..."
                onKeyPress={(e) => e.key === 'Enter' && handleAddItem('specializations', 'specialization')}
              />
              <Button
                type="button"
                onClick={() => handleAddItem('specializations', 'specialization')}
                size="icon"
              >
                <Plus size={16} />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {formData.specializations.map((spec, idx) => (
                <Badge key={idx} className="bg-purple-100 text-purple-700 gap-1">
                  {spec}
                  <X
                    size={14}
                    className="cursor-pointer"
                    onClick={() => handleRemoveItem('specializations', idx)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Languages */}
          <div>
            <Label htmlFor="idiomas">Idiomas</Label>
            <div className="flex gap-2 mt-2">
              <Input id="idiomas"
                value={newItem.language}
                onChange={(e) => setNewItem({ ...newItem, language: e.target.value })}
                placeholder="Ej: Español, Inglés..."
                onKeyPress={(e) => e.key === 'Enter' && handleAddItem('languages', 'language')}
              />
              <Button
                type="button"
                onClick={() => handleAddItem('languages', 'language')}
                size="icon"
              >
                <Plus size={16} />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {formData.languages.map((lang, idx) => (
                <Badge key={idx} variant="outline" className="gap-1">
                  {lang}
                  <X
                    size={14}
                    className="cursor-pointer"
                    onClick={() => handleRemoveItem('languages', idx)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Certifications */}
          <div>
            <Label htmlFor="certificaciones-y-titulos">Certificaciones y Títulos</Label>
            <div className="flex gap-2 mt-2">
              <Input id="certificaciones-y-titulos"
                value={newItem.certification}
                onChange={(e) => setNewItem({ ...newItem, certification: e.target.value })}
                placeholder="Ej: Certificado Cambridge C1..."
                onKeyPress={(e) => e.key === 'Enter' && handleAddItem('certifications', 'certification')}
              />
              <Button
                type="button"
                onClick={() => handleAddItem('certifications', 'certification')}
                size="icon"
              >
                <Plus size={16} />
              </Button>
            </div>
            <div className="space-y-2 mt-3">
              {formData.certifications.map((cert, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <span className="flex-1 text-sm">{cert}</span>
                  <X
                    size={16}
                    className="cursor-pointer text-gray-400 hover:text-red-500"
                    onClick={() => handleRemoveItem('certifications', idx)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#41f2c0] hover:bg-[#35d4a7] text-[#404040]"
          >
            {saving ? <Loader2 className="animate-spin" /> : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}