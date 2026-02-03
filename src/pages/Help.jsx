import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { BookOpen, Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import WelcomeTour from '../components/teacher/WelcomeTour';

export default function Help() {
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const loadTeacher = async () => {
      try {
        const user = await base44.auth.me();
        const teachers = await base44.entities.Teacher.filter({ user_email: user.email });
        if (teachers.length > 0) {
          setTeacher(teachers[0]);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadTeacher();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#41f2c0]" size={40} />
      </div>
    );
  }

  return (
    <>
      {showTour && teacher && (
        <WelcomeTour
          teacherId={teacher.id}
          teacherName={teacher.full_name}
          onComplete={() => setShowTour(false)}
        />
      )}

      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-lg sm:text-3xl font-bold text-[#404040]">Centro de Ayuda</h1>
          <p className="text-gray-500 mt-2 text-sm">Recursos y tutoriales para usar la plataforma</p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#41f2c0]/10 flex items-center justify-center">
                  <Play className="text-[#41f2c0]" size={24} />
                </div>
                Tour de Bienvenida
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Revive el tutorial interactivo que te muestra todas las funcionalidades de la plataforma paso a paso.
              </p>
              <Button
                onClick={() => setShowTour(true)}
                className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
              >
                <Play size={18} className="mr-2" />
                Iniciar Tour
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#41f2c0]/10 flex items-center justify-center">
                  <BookOpen className="text-[#41f2c0]" size={24} />
                </div>
                Guías Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-l-4 border-[#41f2c0] pl-4 py-2">
                <h4 className="font-semibold text-[#404040] mb-1">Cómo configurar tu disponibilidad</h4>
                <p className="text-sm text-gray-600">
                  Ve a "Disponibilidad" → Selecciona días de la semana → Añade franjas horarias → Guarda cambios
                </p>
              </div>

              <div className="border-l-4 border-[#41f2c0] pl-4 py-2">
                <h4 className="font-semibold text-[#404040] mb-1">Cómo añadir asignaturas</h4>
                <p className="text-sm text-gray-600">
                  Ve a "Mis Asignaturas" → Haz clic en "Añadir asignatura" → Selecciona la materia → Define tu precio por hora
                </p>
              </div>

              <div className="border-l-4 border-[#41f2c0] pl-4 py-2">
                <h4 className="font-semibold text-[#404040] mb-1">Cómo gestionar tus clases</h4>
                <p className="text-sm text-gray-600">
                  Ve a "Mi Calendario" → Visualiza tus clases programadas → Haz clic en una clase para ver detalles, modificar o cancelar
                </p>
              </div>

              <div className="border-l-4 border-[#41f2c0] pl-4 py-2">
                <h4 className="font-semibold text-[#404040] mb-1">Cómo comunicarte con alumnos</h4>
                <p className="text-sm text-gray-600">
                  Ve a "Mensajes" → Selecciona una conversación → Escribe tu mensaje. También recibirás notificaciones de nuevas reservas.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>¿Necesitas más ayuda?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Si tienes alguna pregunta o problema que no hemos cubierto, no dudes en contactarnos.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="w-full sm:w-auto text-sm">
                  📧 mentio@menttio.com
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}