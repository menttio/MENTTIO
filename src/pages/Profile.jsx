import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  User, 
  Mail, 
  Phone, 
  Save,
  Loader2,
  CheckCircle,
  Camera,
  Trash2,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { motion } from 'framer-motion';
import GoogleCalendarSync from '../components/calendar/GoogleCalendarSync';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { createPageUrl } from '../utils';
import PaymentTab from '../components/profile/PaymentTab';

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: ''
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

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      // Reload data
      await loadUserData();
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await base44.functions.invoke('deleteAccount');
      
      // Clear all auth data and force logout
      await base44.auth.logout();
      
      // Redirect to home with full page reload to clear all state
      window.location.href = createPageUrl('Home');
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Error al eliminar la cuenta');
      setDeleting(false);
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
      <div className="mb-6">
        <h1 className="text-lg sm:text-3xl font-bold text-[#404040]">Mi Perfil</h1>
        <p className="text-gray-500 mt-2 text-sm">Administra tu información personal</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'profile'
              ? 'border-[#41f2c0] text-[#35d4a7]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <User size={16} />
          Datos personales
        </button>
        {userRole === 'teacher' && (
          <button
            onClick={() => setActiveTab('payment')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'payment'
                ? 'border-[#41f2c0] text-[#35d4a7]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <CreditCard size={16} />
            Datos de pago
          </button>
        )}
      </div>

      {/* Payment Tab */}
      {activeTab === 'payment' && <PaymentTab />}

      {/* Profile Tab Content */}
      {activeTab === 'profile' && (
      <div>

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
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-[#404040] text-lg">{formData.full_name}</h3>
              <p className="text-gray-500 text-sm truncate">{user?.email}</p>
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

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-white py-5 md:py-6 text-base md:text-lg mb-4"
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

      {/* Delete Account Section */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-600">Eliminar Cuenta</CardTitle>
          <CardDescription>Esta acción es permanente y no se puede deshacer</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={deleting}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                {deleting ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <Trash2 size={20} className="mr-2" />
                    Eliminar mi cuenta
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Se eliminarán permanentemente:
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Tu perfil de {userRole === 'teacher' ? 'profesor' : 'alumno'}</li>
                    <li>Todas tus reservas de clases</li>
                    <li>Tus conversaciones y mensajes</li>
                    <li>Tus notificaciones</li>
                    <li>Toda tu información personal</li>
                  </ul>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Sí, eliminar mi cuenta
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      </> /* end profile tab */}
    </div>
  );
}