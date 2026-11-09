import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Video, VideoOff } from 'lucide-react';
import { textoDe, CONSENT_VERSION } from './consentTexts';

/**
 * Permiso de grabación del alumno: se puede dar y retirar cuando se quiera, y cada cambio
 * queda registrado (un consentimiento que no se puede retirar no es un consentimiento válido).
 */
export default function RecordingConsentCard({ student, onChange }) {
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  if (!student) return null;

  const autoriza = Boolean(student.recording_consent);
  const esMenor = Boolean(student.is_minor);

  const cambiar = async (nuevoValor) => {
    setGuardando(true);
    setMensaje('');
    try {
      // Desde el 09/11/2026 lo registra el servidor (setRecordingConsent): el navegador ya no
      // puede escribir el permiso ni el historial. Ver docs/PLAN-SEGURIDAD-Y-MIGRACION.md, lote C.
      const { data } = await base44.functions.invoke('setRecordingConsent', {
        granted: nuevoValor,
        text_version: CONSENT_VERSION,
        text_shown: textoDe('grabacion', esMenor),
      });
      if (data?.pendiente_tutor) {
        onChange?.({ ...student, recording_consent_pending_at: new Date().toISOString() });
        setMensaje('Hemos enviado un correo a tu padre, madre o tutor. Las clases se grabarán cuando lo confirme.');
      } else {
        const ahora = data?.recording_consent_date || new Date().toISOString();
        onChange?.({ ...student, recording_consent: nuevoValor, recording_consent_date: ahora, recording_consent_pending_at: null });
        setMensaje(
          nuevoValor
            ? 'Permiso concedido. Se grabarán tus próximas clases.'
            : 'Permiso retirado. Tus próximas clases no se grabarán, y las grabaciones anteriores dejan de estar disponibles y se borran en 30 días.'
        );
      }
    } catch (e) {
      console.error(e);
      setMensaje('No se ha podido guardar. Inténtalo de nuevo.');
    }
    setGuardando(false);
  };

  return (
    <div className="rounded-2xl border bg-white p-6">
      <div className="flex items-start gap-3">
        {autoriza ? (
          <Video className="mt-1 text-[#41f2c0]" size={22} />
        ) : (
          <VideoOff className="mt-1 text-gray-400" size={22} />
        )}
        <div className="flex-1">
          <h3 className="font-bold text-[#404040]">Grabación de las clases</h3>
          <p className="mt-1 text-sm text-gray-500">
            {autoriza
              ? 'Ahora mismo autorizas que tus clases se graben. La grabación solo la veis tú y tu profesor, y se borra a los 12 meses.'
              : student.recording_consent_pending_at
                ? 'Pendiente de que tu padre, madre o tutor confirme el permiso desde el correo que le hemos enviado.'
                : 'Ahora mismo no autorizas la grabación de tus clases.'}
          </p>
          {esMenor && (
            <p className="mt-2 text-xs text-gray-500">
              Esta cuenta es de un menor de 14 años: este permiso lo gestiona su padre, madre o tutor
              {student.guardian_name ? ` (${student.guardian_name})` : ''}.
            </p>
          )}
          {student.recording_consent_date && (
            <p className="mt-1 text-xs text-gray-400">
              Última actualización: {new Date(student.recording_consent_date).toLocaleDateString('es-ES')}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={guardando || autoriza}
              onClick={() => cambiar(true)}
              className="rounded-xl bg-[#41f2c0] text-[#404040] hover:bg-[#35d4a7]"
            >
              {guardando ? <Loader2 className="animate-spin" size={18} /> : 'Autorizar grabación'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={guardando || !autoriza}
              onClick={() => cambiar(false)}
              className="rounded-xl"
            >
              Retirar permiso
            </Button>
          </div>

          {mensaje && (
            <p role="status" className="mt-3 text-sm font-medium text-[#404040]">
              {mensaje}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
