import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Check, ChevronRight, BookOpen, Clock, CreditCard, CalendarCheck, Users } from 'lucide-react';
import { createPageUrl } from '../../utils';

/**
 * Lo que le falta al profesor para poder dar su primera clase, con el estado real de su cuenta.
 *
 * Sustituye a un carrusel de bienvenida que se pasaba a golpe de "siguiente" y no se recordaba.
 * Esto se queda hasta que está hecho, sobrevive a recargar y a cambiar de dispositivo porque no
 * guarda nada: mira los datos cada vez.
 *
 * Qué manda y qué no: el registro **ya obliga** a dar de alta una asignatura con su precio y un
 * teléfono válido. Esas dos casillas nacen tachadas siempre, así que no pueden decidir si la
 * tarjeta se ve — la primera versión lo hacía y la tarjeta se escondía sola nada más
 * registrarse, que es justo lo contrario de lo que se busca. Se siguen mostrando porque
 * confirman que el alta fue bien, pero no cuentan.
 *
 * Lo que de verdad separa a un profesor recién registrado de su primera clase son dos cosas:
 * su disponibilidad y tener un alumno. Esas dos son las que mantienen la tarjeta en pantalla.
 *
 * Los cobros con tarjeta y el calendario van como opcionales: por Bizum no hay nada que
 * configurar, y quien no quiera conectar su calendario no tiene por qué cargar con un
 * recordatorio eterno.
 */
export default function SetupChecklist({ teacher }) {
  const [disponibilidad, setDisponibilidad] = useState(null);
  const [alumnos, setAlumnos] = useState(null);

  useEffect(() => {
    let cancelado = false;
    if (!teacher?.id) return undefined;

    const cargar = async () => {
      try {
        const franjas = await base44.entities.Availability.filter({ teacher_id: teacher.id });
        if (!cancelado) setDisponibilidad((franjas || []).length);
      } catch (_e) {
        if (!cancelado) setDisponibilidad(0);
      }
      try {
        const res = await base44.functions.invoke('studentsOfTeacher', {});
        if (!cancelado) setAlumnos((res.data?.students || []).length);
      } catch (_e) {
        if (!cancelado) setAlumnos(0);
      }
    };
    cargar();
    return () => { cancelado = true; };
  }, [teacher?.id]);

  // Mientras no se sepa el estado real no se pinta nada: es preferible que la tarjeta aparezca
  // medio segundo tarde a que parpadee diciendo que falta algo que ya está hecho.
  if (!teacher || disponibilidad === null || alumnos === null) return null;

  const tareas = [
    {
      clave: 'asignaturas',
      necesaria: false,
      hecha: Array.isArray(teacher.subjects) && teacher.subjects.length > 0,
      icono: BookOpen,
      titulo: 'Tus asignaturas y tus precios',
      porque: 'Es lo que verán tus alumnos al reservarte.',
      destino: 'ManageSubjects',
    },
    {
      clave: 'disponibilidad',
      necesaria: true,
      hecha: disponibilidad > 0,
      icono: Clock,
      titulo: 'Marca cuándo puedes dar clase',
      porque: 'Sin horas marcadas nadie puede reservarte, aunque te encuentre.',
      destino: 'ManageAvailability',
    },
    {
      clave: 'alumnos',
      necesaria: true,
      hecha: alumnos > 0,
      icono: Users,
      titulo: 'Trae a tu primer alumno',
      porque: 'Entra gratis con su correo y desde ahí ya puede reservarte.',
      destino: 'MyStudents',
    },
    {
      clave: 'cobros',
      necesaria: false,
      hecha: Boolean(teacher.stripe_connect_enabled),
      icono: CreditCard,
      titulo: 'Acepta pagos con tarjeta',
      porque: 'El dinero va directo a tu cuenta. Si cobras por Bizum, no necesitas esto.',
      destino: 'Profile',
    },
    {
      clave: 'calendario',
      necesaria: false,
      hecha: Boolean(teacher.google_calendar_connected),
      icono: CalendarCheck,
      titulo: 'Conecta tu Google Calendar',
      porque: 'Tus citas personales bloquean esas horas y nadie te reserva encima.',
      destino: 'Profile',
    },
  ];

  const necesarias = tareas.filter((t) => t.necesaria);
  const completadas = necesarias.filter((t) => t.hecha).length;
  if (completadas === necesarias.length) return null;

  return (
    <Card className="mb-8 border-2 border-[#41f2c0]">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-baseline justify-between gap-4 mb-1">
          <h2 className="font-bold text-[#404040] text-lg">Te falta poco para tu primera clase</h2>
          <span className="text-sm text-[#0d7a5f] font-semibold whitespace-nowrap">
            {completadas} de {necesarias.length}
          </span>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Esta lista desaparece sola cuando termines lo imprescindible.
        </p>

        <div
          className="h-1.5 w-full bg-gray-100 rounded-full mb-5 overflow-hidden"
          role="progressbar"
          aria-valuenow={completadas}
          aria-valuemin={0}
          aria-valuemax={necesarias.length}
          aria-label="Progreso de configuración"
        >
          <div
            className="h-full bg-[#41f2c0] transition-all duration-500"
            style={{ width: `${(completadas / necesarias.length) * 100}%` }}
          />
        </div>

        <ul className="space-y-2">
          {tareas.map((t) => {
            const Icono = t.icono;
            return (
              <li key={t.clave}>
                <Link
                  to={createPageUrl(t.destino)}
                  className={`flex items-center gap-3 rounded-xl p-3 border transition-colors ${
                    t.hecha
                      ? 'border-transparent bg-gray-50'
                      : 'border-gray-200 hover:border-[#41f2c0] hover:bg-[#41f2c0]/5'
                  }`}
                >
                  <span
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      t.hecha ? 'bg-[#41f2c0]' : 'bg-gray-100'
                    }`}
                    aria-hidden="true"
                  >
                    {t.hecha
                      ? <Check size={16} className="text-[#404040]" />
                      : <Icono size={16} className="text-gray-500" />}
                  </span>

                  <span className="flex-1 min-w-0">
                    <span className={`block font-medium ${t.hecha ? 'text-gray-400 line-through' : 'text-[#404040]'}`}>
                      {t.titulo}
                      {!t.necesaria && !t.hecha && (
                        <span className="ml-2 text-xs font-normal text-gray-500">(opcional)</span>
                      )}
                    </span>
                    {!t.hecha && (
                      <span className="block text-xs text-gray-500 mt-0.5">{t.porque}</span>
                    )}
                  </span>

                  {!t.hecha && <ChevronRight size={18} className="text-gray-400 flex-shrink-0" aria-hidden="true" />}
                  <span className="sr-only">{t.hecha ? 'Hecho' : 'Pendiente'}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
