import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, CheckCircle2, AlertTriangle, Mail } from 'lucide-react';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function opcionesPeriodo() {
  const opciones = [];
  const hoy = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    opciones.push({
      valor: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      texto: `${MESES[d.getMonth()]} de ${d.getFullYear()}`,
    });
  }
  return opciones;
}

/**
 * Informe mensual para la familia. El profesor lo revisa antes de enviarlo: nada se manda solo,
 * porque lo que se cuenta sobre un alumno lo decide quien le da clase.
 */
export default function FamilyReportDialog({ student, open, onOpenChange }) {
  const periodos = opcionesPeriodo();
  const [periodo, setPeriodo] = useState(periodos[0].valor);
  const [datos, setDatos] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !student) return;
    let cancelado = false;
    const cargar = async () => {
      setCargando(true);
      setError('');
      setEnviado(null);
      try {
        const res = await base44.functions.invoke('familyReport', {
          student_id: student.id,
          period: periodo,
        });
        if (cancelado) return;
        if (res.data?.error) setError(res.data.error);
        else setDatos(res.data?.datos || null);
      } catch (e) {
        if (!cancelado) setError(e?.response?.data?.error || 'No se ha podido generar el informe');
      } finally {
        if (!cancelado) setCargando(false);
      }
    };
    cargar();
    return () => {
      cancelado = true;
    };
  }, [open, student, periodo]);

  const enviar = async () => {
    setEnviando(true);
    setError('');
    try {
      const res = await base44.functions.invoke('familyReport', {
        student_id: student.id,
        period: periodo,
        mensaje,
        enviar: true,
      });
      if (res.data?.enviado) setEnviado(res.data.destinatario);
      else setError(res.data?.error || 'No se ha podido enviar');
    } catch (e) {
      setError(e?.response?.data?.error || 'No se ha podido enviar');
    }
    setEnviando(false);
  };

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Informe para la familia</DialogTitle>
          <DialogDescription>
            Un resumen de cómo ha ido {student.full_name} este mes. Lo revisas tú antes de enviarlo.
          </DialogDescription>
        </DialogHeader>

        <div>
          <Label htmlFor="periodo-informe">Periodo</Label>
          <select
            id="periodo-informe"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          >
            {periodos.map((o) => (
              <option key={o.valor} value={o.valor}>{o.texto}</option>
            ))}
          </select>
        </div>

        {cargando && (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-[#41f2c0]" />
          </div>
        )}

        {!cargando && datos && (
          <>
            <div className="grid grid-cols-3 gap-3 rounded-xl bg-[#f7fdfb] p-4 text-center">
              <div>
                <p className="text-2xl font-bold text-[#404040]">{datos.totalClases}</p>
                <p className="text-xs text-gray-500">clases</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#404040]">{datos.horas}</p>
                <p className="text-xs text-gray-500">horas</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#404040]">{datos.media ? datos.media.toFixed(1) : '—'}</p>
                <p className="text-xs text-gray-500">progreso medio</p>
              </div>
            </div>

            {datos.totalClases === 0 && (
              <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                No hay clases terminadas en este periodo. Prueba con otro mes.
              </p>
            )}

            {datos.sinNota > 0 && datos.totalClases > 0 && (
              <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                {datos.sinNota} de {datos.totalClases} clases no tienen comentario tuyo. El informe se
                entiende mucho mejor si añades una nota en cada clase desde el calendario.
              </p>
            )}

            {datos.clases.length > 0 && (
              <div className="max-h-52 overflow-y-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="p-2 text-left">Fecha</th>
                      <th className="p-2 text-left">Asignatura</th>
                      <th className="p-2 text-left">Progreso</th>
                      <th className="p-2 text-left">Comentario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.clases.map((c, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2 whitespace-nowrap">{c.fecha}</td>
                        <td className="p-2">{c.asignatura}</td>
                        <td className="p-2 text-[#41b08f]">{c.valoracion ? '★'.repeat(c.valoracion) : '—'}</td>
                        <td className="p-2 text-gray-600">{c.nota || <span className="text-gray-300">sin nota</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div>
              <Label htmlFor="mensaje-informe">Tu mensaje para la familia (opcional)</Label>
              <Textarea
                id="mensaje-informe"
                rows={3}
                placeholder="Por ejemplo: va bien en ecuaciones, pero conviene repasar trigonometría antes del examen del día 12."
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
              <Mail size={16} className="shrink-0" />
              Se enviará a <strong className="mx-1">{datos.destinatario || 'sin correo'}</strong>
              {datos.destinatarioEsTutor ? `(${datos.guardianName || 'tutor legal'})` : '(el propio alumno)'}
            </div>
          </>
        )}

        {error && (
          <p role="alert" className="text-sm font-medium text-red-600">{error}</p>
        )}

        {enviado ? (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm font-medium text-green-800" role="status">
            <CheckCircle2 size={18} />
            Informe enviado a {enviado}
          </div>
        ) : (
          <Button
            onClick={enviar}
            disabled={enviando || cargando || !datos || datos.totalClases === 0}
            className="w-full rounded-xl bg-[#41f2c0] py-5 text-[#404040] hover:bg-[#35d4a7]"
          >
            {enviando ? <Loader2 className="animate-spin" /> : (<><Send size={16} className="mr-2" /> Enviar a la familia</>)}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
