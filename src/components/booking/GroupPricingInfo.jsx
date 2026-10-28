import React, { useState } from 'react';
import { Info, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  daIndividual,
  grupoIndefinido,
  maxAlumnosGrupo,
  precioGrupalPorHora,
} from '@/lib/asignaturas';

/**
 * Tarifas de clase grupal de una asignatura concreta.
 *
 * Antes este cuadro ensenaba unas tarifas fijas iguales para todos (18/16/15 €), aunque el
 * profesor hubiera puesto otras: el alumno veia un precio y se le cobraba otro. Ahora sale de
 * la asignatura, y si el grupo es indefinido hay un unico precio por persona.
 */
export default function GroupPricingInfo({ asignatura, durationHours = 1 }) {
  const [open, setOpen] = useState(false);

  if (!asignatura) return null;

  const indefinido = grupoIndefinido(asignatura);
  const tope = maxAlumnosGrupo(asignatura);

  const tramos = indefinido
    ? []
    : Array.from({ length: Math.max((tope || 0) - 1, 0) }, (_, i) => i + 2)
        .map(n => ({ n, precio: precioGrupalPorHora(asignatura, n) }))
        .filter(t => t.precio > 0);

  const precioUnico = indefinido ? precioGrupalPorHora(asignatura, 1) : 0;
  if (!indefinido && tramos.length === 0) return null;
  if (indefinido && precioUnico <= 0) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-[#41f2c0] hover:text-[#0d7a5f] underline underline-offset-2"
      >
        <Info size={13} />
        Ver precios grupales
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users size={18} className="text-[#41f2c0]" />
              Precios de clases grupales
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {indefinido ? (
              <>
                <p className="text-sm text-gray-500">
                  Esta clase no tiene límite de alumnos y el precio por persona es siempre el mismo:
                </p>
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <span className="text-sm font-medium text-[#404040]">Por alumno</span>
                  <span className="font-bold text-[#41f2c0]">
                    {(precioUnico * durationHours).toFixed(0)}€
                  </span>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-500">
                  El precio por alumno se ajusta según cuántos participen en la clase:
                </p>
                <div className="space-y-2">
                  {tramos.map(({ n, precio }) => (
                    <div
                      key={n}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {Array.from({ length: n }).map((_, i) => (
                            <div key={i} className="w-5 h-5 rounded-full bg-[#41f2c0]/20 flex items-center justify-center">
                              <span className="text-[8px] text-[#41f2c0]">👤</span>
                            </div>
                          ))}
                        </div>
                        <span className="text-sm font-medium text-[#404040]">{n} alumnos</span>
                      </div>
                      <span className="font-bold text-[#41f2c0]">
                        {(precio * durationHours).toFixed(0)}€/alumno
                      </span>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700">
                  ⚠️ <strong>Importante:</strong> si al realizar la clase solo hay 1 alumno, se aplica
                  {daIndividual(asignatura) ? ' el precio de clase individual.' : ' el precio de 2 alumnos.'}
                </div>

                <p className="text-xs text-gray-400 text-center">
                  El precio final se determina por el número de alumnos que asistan.
                </p>
              </>
            )}
          </div>

          <Button onClick={() => setOpen(false)} className="w-full bg-[#41f2c0] hover:bg-[#35d4a7]">
            Entendido
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
