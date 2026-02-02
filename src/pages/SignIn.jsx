import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';

export default function SignIn() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.email || !formData.password) {
      setError('Por favor, completa todos los campos');
      return;
    }
    
    setLoading(true);
    try {
      // Primero, verificar si el usuario existe en las entidades
      const teachers = await base44.entities.Teacher.filter({ user_email: formData.email });
      const students = await base44.entities.Student.filter({ user_email: formData.email });
      
      if (teachers.length === 0 && students.length === 0) {
        setError('No existe ninguna cuenta con este email');
        setLoading(false);
        return;
      }

      // Intentar login
      try {
        await base44.auth.login({
          email: formData.email,
          password: formData.password
        });

        // Redirigir según el rol
        if (teachers.length > 0) {
          window.location.href = createPageUrl('TeacherDashboard');
        } else if (students.length > 0) {
          window.location.href = createPageUrl('StudentDashboard');
        }
      } catch (loginError) {
        console.error('Error de login:', loginError);
        setError('Contraseña incorrecta. Si creaste tu cuenta recientemente, asegúrate de usar la contraseña que estableciste durante el registro.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error al verificar la cuenta. Por favor, inténtalo de nuevo.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#f2f2f2] to-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg"
      >
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl('SelectRole'))}
          className="mb-6 text-gray-500 hover:text-[#404040]"
        >
          <ArrowLeft size={18} className="mr-2" />
          Volver
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-[#404040]">Men<span className="text-[#41f2c0]">π</span>io</span>
          </h1>
          <h2 className="text-2xl font-bold text-[#404040] mb-2">
            Iniciar Sesión
          </h2>
          <p className="text-gray-500">
            Accede a tu cuenta
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="tu@email.com"
              className="mt-2"
              autoComplete="email"
            />
          </div>

          <div>
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative mt-2">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={!formData.email || !formData.password || loading}
            className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-white py-6 text-lg rounded-xl"
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              'Iniciar Sesión'
            )}
          </Button>

          <div className="text-center text-sm text-gray-500">
            ¿No tienes cuenta?{' '}
            <button
              type="button"
              onClick={() => navigate(createPageUrl('SelectRole'))}
              className="text-[#41f2c0] hover:underline font-medium"
            >
              Regístrate
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}