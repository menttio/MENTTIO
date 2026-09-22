import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck } from 'lucide-react';
import ConsentForm, { consentimientoCompleto } from './ConsentForm';
import { esMenorDeEdadDigital, textoDe, CONSENT_VERSION } from './consentTexts';

/**
 * Los alumnos registrados antes de pedir el consentimiento no tienen constancia de haberlo dado.
 * Este aviso se lo pide una vez, al entrar, y deja registro de quién lo otorgó y cuándo.
 * No se puede cerrar sin responder, porque sin consentimiento no deberíamos tratar sus datos.
 */
export default function ConsentGate() {
  const [student, setStudent] = useState(null);
  const [datos, setDatos] = useState({
    birth_date: '',
    guardian_name: '',
    guardian_email: '',
    guardian_relationship: '',
    privacy_consent: false,
    recording_consent: false,
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelado = false;
    const comprobar = async () => {
      try {
        const user = await base44.auth.me();
        if (!user?.email) return;
        const alumnos = await base44.entities.Student.filter({ user_email: user.email });
        const alumno = alumnos[0];
        if (!cancelado && alumno && !alumno.consent_version) setStudent(alumno);
      } catch (_e) {
        // Si no hay sesión o no es alumno, no se muestra nada.
      }
    };
    comprobar();
    return () => {
      cancelado = true;
    };
  }, []);

  if (!student) return null;

  const guardar = async () => {
    const falta = consentimientoCompleto(datos);
    if (falta) {
      setError(falta);
      return;
    }
    setError('');
    setGuardando(true);
    try {
      const info = esMenorDeEdadDigital(datos.birth_date);
      const esMenor = info?.esMenor ?? false;
      const ahora = new Date().toISOString();

      await base44.entities.Student.update(student.id, {
        birth_date: datos.birth_date,
        is_minor: esMenor,
        guardian_name: esMenor ? datos.guardian_name : undefined,
        guardian_email: esMenor ? datos.guardian_email : undefined,
        guardian_relationship: esMenor ? datos.guardian_relationship : undefined,
        data_consent_date: ahora,
        consent_version: CONSENT_VERSION,
        recording_consent: Boolean(datos.recording_consent),
        recording_consent_date: ahora,
      });

      const comun = {
        user_email: student.user_email,
        student_id: student.id,
        granted_by: esMenor ? 'tutor' : 'alumno',
        guardian_name: esMenor ? datos.guardian_name : undefined,
        guardian_email: esMenor ? datos.guardian_email : undefined,
        text_version: CONSENT_VERSION,
        event_date: ahora,
      };
      await base44.entities.Consent.create({
        ...comun,
        type: 'privacidad',
        granted: true,
        text_shown: textoDe('privacidad', esMenor),
      });
      await base44.entities.Consent.create({
        ...comun,
        type: 'grabacion',
        granted: Boolean(datos.recording_consent),
        text_shown: textoDe('grabacion', esMenor),
      });

      setStudent(null);
    } catch (e) {
      console.error(e);
      setError('No hemos podido guardarlo. Inténtalo de nuevo en unos segundos.');
      setGuardando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 p-4"
    >
      <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#41f2c0]/10">
          <ShieldCheck className="text-[#41f2c0]" size={26} />
        </div>
        <h2 id="consent-title" className="text-center text-xl font-bold text-[#404040]">
          Un paso rápido sobre tus datos
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500">
          Estamos poniendo al día los permisos de todas las cuentas. Nos falta tu confirmación para
          seguir gestionando tus clases.
        </p>

        <div className="mt-6">
          <ConsentForm value={datos} onChange={setDatos} />
        </div>

        {error && (
          <p role="alert" className="mt-4 text-sm font-medium text-red-600">
            {error}
          </p>
        )}

        <Button
          onClick={guardar}
          disabled={guardando}
          className="mt-6 w-full rounded-xl bg-[#41f2c0] py-5 text-base text-white hover:bg-[#35d4a7]"
        >
          {guardando ? <Loader2 className="animate-spin" /> : 'Guardar y continuar'}
        </Button>
      </div>
    </div>
  );
}
