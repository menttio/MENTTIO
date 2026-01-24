import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  User, 
  Mail, 
  Phone, 
  Lock,
  Save,
  Loader2,
  CheckCircle,
  Camera
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { motion } from 'framer-motion';
import GoogleCalendarSync from '../components/calendar/GoogleCalendarSync';

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      // Check if teacher or student
      const teachers = await base44.entities.Teacher.filter({ user_email: currentUser.email });
      if (teachers.length > 0) {
        setUserRole('teacher');
        setProfile(teachers[0]);
        setFormData(prev => ({
          ...prev,
          full_name: teachers[0].full_name || currentUser.full_name || '',
          phone: teachers[0].phone || ''
        }));
      } else {
        const students = await base44.entities.Student.filter({ user_email: currentUser.email });
        if (students.length > 0) {
          setUserRole('student');
          setProfile(students[0]);
          setFormData(prev => ({
            ...prev,
            full_name: students[0].full_name || currentUser.full_name || '',
            phone: students[0].phone || ''
          }));
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'El nombre es obligatorio';
    }

    if (formData.newPassword) {
      if (formData.newPassword.length < 6) {
        newErrors.newPassword = 'La contraseña debe tener al menos 6 caracteres';
      }
      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Las contraseñas no coinciden';
      }
      if (!formData.currentPassword) {
        newErrors.currentPassword = 'Introduce tu contraseña actual';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede superar los 5MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Update profile
      if (userRole === 'teacher') {
        await base44.entities.Teacher.update(profile.id, { profile_photo: file_url });
      } else if (userRole === 'student') {
        await base44.entities.Student.update(profile.id, { profile_photo: file_url });
      }

      // Reload data
      await loadUserData();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Error al subir la foto');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    setSuccess(false);
    try {
      // Update profile (Teacher or Student entity)
      const profileUpdate = {
        full_name: formData.full_name,
        phone: formData.phone
      };

      if (userRole === 'teacher') {
        await base44.entities.Teacher.update(profile.id, profileUpdate);
      } else if (userRole === 'student') {
        await base44.entities.Student.update(profile.id, profileUpdate);
      }

      // Update user full_name in auth
      await base44.auth.updateMe({ full_name: formData.full_name });

      // TODO: Password change - would need a backend function
      if (formData.newPassword) {
        // For now, show message that password change needs to be implemented
        alert('Cambio de contraseña pendiente de implementación');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
      // Clear password fields
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));

      // Reload data
      await loadUserData();
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error al guardar los cambios');
    } finally {
      setSaving(false);
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
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#404040]">Mi Perfil</h1>
        <p className="text-gray-500 mt-2">Administra tu información personal</p>
      </div>

      {/* Success Message */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3"
        >
          <CheckCircle className="text-green-600" size={20} />
          <span className="text-green-800 font-medium">Cambios guardados correctamente</span>
        </motion.div>
      )}

      {/* Profile Photo */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#41f2c0] to-[#35d4a7] flex items-center justify-center overflow-hidden">
                {profile?.profile_photo ? (
                  <img 
                    src={profile.profile_photo} 
                    alt={formData.full_name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="text-white" size={40} />
                )}
              </div>
              <input
                type="file"
                id="photo-upload"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <label
                htmlFor="photo-upload"
                className="absolute bottom-0 right-0 w-8 h-8 bg-[#41f2c0] rounded-full flex items-center justify-center text-white hover:bg-[#35d4a7] transition-colors cursor-pointer"
              >
                {uploadingPhoto ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Camera size={16} />
                )}
              </label>
            </div>
            <div>
              <h3 className="font-semibold text-[#404040] text-lg">{formData.full_name}</h3>
              <p className="text-gray-500 text-sm">{user?.email}</p>
              <p className="text-xs text-gray-400 mt-1 capitalize">{userRole === 'teacher' ? 'Profesor' : 'Alumno'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Información Personal</CardTitle>
          <CardDescription>Actualiza tus datos personales</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Full Name */}
          <div>
            <Label htmlFor="full_name">Nombre completo *</Label>
            <div className="relative mt-1">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                className="pl-10"
                placeholder="Tu nombre completo"
              />
            </div>
            {errors.full_name && (
              <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>
            )}
          </div>

          {/* Email (read-only) */}
          <div>
            <Label htmlFor="email">Email</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="pl-10 bg-gray-50"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">El email no se puede modificar</p>
          </div>

          {/* Phone */}
          <div>
            <Label htmlFor="phone">Teléfono</Label>
            <div className="relative mt-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="pl-10"
                placeholder="+34 600 000 000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Google Calendar Integration */}
      <div className="mb-6">
        <GoogleCalendarSync userEmail={user?.email} userType={userRole} />
      </div>

      {/* Change Password */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Cambiar Contraseña</CardTitle>
          <CardDescription>Deja en blanco si no quieres cambiarla</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Password */}
          <div>
            <Label htmlFor="currentPassword">Contraseña actual</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                id="currentPassword"
                type="password"
                value={formData.currentPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="pl-10"
                placeholder="••••••••"
              />
            </div>
            {errors.currentPassword && (
              <p className="text-red-500 text-xs mt-1">{errors.currentPassword}</p>
            )}
          </div>

          {/* New Password */}
          <div>
            <Label htmlFor="newPassword">Nueva contraseña</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                id="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                className="pl-10"
                placeholder="••••••••"
              />
            </div>
            {errors.newPassword && (
              <p className="text-red-500 text-xs mt-1">{errors.newPassword}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="pl-10"
                placeholder="••••••••"
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-white py-6 text-lg"
      >
        {saving ? (
          <Loader2 className="animate-spin" size={20} />
        ) : (
          <>
            <Save size={20} className="mr-2" />
            Guardar Cambios
          </>
        )}
      </Button>
    </div>
  );
}