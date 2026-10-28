import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Star, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MAX_COMENTARIO } from '@/lib/resenas';

/**
 * La reseña ya no se escribe desde aqui contra la entidad: la crea la funcion crearResena.
 *
 * Antes este dialogo hacia tres cosas que no podia hacer: creaba la reseña sin que nadie
 * comprobase que la clase era de este alumno, intentaba actualizar la nota media del
 * profesor (lo que las reglas de la entidad Teacher no le permiten, asi que saltaba un
 * error y el dialogo se quedaba colgado sin cerrarse ni avisar al alumno) y guardaba el
 * nombre completo del alumno en una entidad que se lee en publico.
 */
export default function LeaveReviewDialog({ booking, student, open, onClose, onSave }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [anonima, setAnonima] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await base44.functions.invoke('crearResena', {
        booking_id: booking.id,
        rating,
        comment: comment.trim(),
        anonima,
      });

      // La funcion devuelve el motivo exacto (clase no dada, ya valorada, no es tuya).
      // Antes cualquier fallo se quedaba en la consola y el alumno veia el dialogo quieto.
      const datos = res?.data || res;
      if (datos?.error) {
        setError(datos.error);
        return;
      }

      onSave();
      onClose();
    } catch (e) {
      setError(
        e?.response?.data?.error ||
          'No se ha podido guardar la reseña. Vuelve a intentarlo en un momento.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dejar Reseña</DialogTitle>
          <DialogDescription>
            Comparte tu experiencia con {booking?.teacher_name}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* Rating */}
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-3">¿Cómo fue tu clase?</p>
            <div className="flex justify-center gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onMouseEnter={() => setHoveredRating(i + 1)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(i + 1)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    size={32}
                    className={cn(
                      "transition-colors",
                      (hoveredRating || rating) > i
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-gray-300"
                    )}
                  />
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {rating === 5 ? 'Excelente' : rating === 4 ? 'Muy bueno' : rating === 3 ? 'Bueno' : rating === 2 ? 'Regular' : 'Mejorable'}
            </p>
          </div>

          {/* Comment */}
          <div>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, MAX_COMENTARIO))}
              placeholder="Cuéntanos más sobre tu experiencia (opcional)"
              rows={4}
            />
            <p className="text-[11px] text-gray-400 mt-1 text-right">
              {comment.length}/{MAX_COMENTARIO}
            </p>
          </div>

          {/* Que se publica exactamente. Las reseñas se leen en publico y muchos alumnos
              son menores, asi que nunca sale el nombre completo. */}
          <div className="rounded-xl bg-gray-50 p-3 space-y-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox checked={anonima} onCheckedChange={(v) => setAnonima(v === true)} />
              <span className="text-sm text-gray-700">Publicarla sin mi nombre</span>
            </label>
            <p className="text-xs text-gray-500">
              {anonima
                ? 'Aparecerá como "Estudiante" junto a tu edad.'
                : `Aparecerá solo tu nombre de pila (${(student?.full_name || '').trim().split(/\s+/)[0] || 'tu nombre'}). Nunca tu apellido ni tu correo.`}
            </p>
            <p className="text-xs text-[#0d7a5f] flex items-start gap-1.5">
              <ShieldCheck size={14} className="mt-0.5 shrink-0" />
              <span>
                Se publicará con la marca <strong>Clase verificada</strong>, porque esta clase se
                dio en Menttio.
              </span>
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 flex items-start gap-1.5">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}
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
            {saving ? <Loader2 className="animate-spin" /> : 'Enviar Reseña'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}