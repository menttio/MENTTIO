import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link2, Check, Copy, MessageCircle } from 'lucide-react';

/**
 * El enlace con el que un profesor se trae a sus alumnos.
 *
 * Antes no había ninguno: cada alumno tenía que registrarse y buscar a su profesor entre
 * todos los demás. Con quince o veinte alumnos eso es lo que impide que un profesor se
 * cambie de herramienta, y fue lo primero que preguntó el primer profesor interesado.
 *
 * El enlace lleva su identificador, que no es un secreto: sirve para reconocerle, no para
 * entrar en nada. Quien lo abra acabará asignado a él, igual que si le hubiera buscado a
 * mano, y eso ya se podía hacer desde "buscar profesores".
 */
export default function InviteStudentsCard({ teacher }) {
  const [copiado, setCopiado] = useState('');

  if (!teacher?.id) return null;

  const enlace = `https://menttio.com/Invitacion?p=${teacher.id}`;
  const nombre = (teacher.full_name || '').split(' ')[0] || 'tu profe';

  const mensaje =
    `Hola: a partir de ahora llevo las clases por Menttio. ` +
    `Desde aquí reservas tú la hora, entras a la videollamada sin buscar ningún enlace ` +
    `y tienes los materiales en un sitio.\n\n` +
    `Entra con este enlace y ya quedas conmigo:\n${enlace}\n\n` +
    `Es gratis para ti, sólo pagas las clases. — ${nombre}`;

  const copiar = async (texto, cual) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(cual);
      setTimeout(() => setCopiado(''), 2500);
    } catch (_e) {
      // Sin permiso de portapapeles (o sin https): que al menos pueda seleccionarlo a mano.
      window.prompt('Copia el enlace:', texto);
    }
  };

  return (
    <Card className="mb-6 border-2 border-[#41f2c0]">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-9 h-9 rounded-full bg-[#41f2c0]/25 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <Link2 size={18} className="text-[#0d7a5f]" />
          </span>
          <h2 className="font-bold text-[#404040] text-lg">Trae a tus alumnos</h2>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Pega este enlace en tu grupo de clase. Quien lo abra queda asignado contigo sin
          tener que buscarte, y puede reservar desde el primer momento.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <label htmlFor="enlace-invitacion" className="sr-only">Tu enlace de invitación</label>
          <input
            id="enlace-invitacion"
            readOnly
            value={enlace}
            onFocus={(e) => e.target.select()}
            className="flex-1 min-w-0 rounded-xl border border-gray-200 px-3 py-2 text-sm text-[#404040] bg-gray-50 font-mono"
          />
          <Button
            onClick={() => copiar(enlace, 'enlace')}
            className="bg-[#41f2c0] hover:bg-[#35d4a7] text-[#404040] font-bold whitespace-nowrap"
          >
            {copiado === 'enlace'
              ? <><Check size={16} className="mr-1" /> Copiado</>
              : <><Copy size={16} className="mr-1" /> Copiar enlace</>}
          </Button>
        </div>

        <Button
          variant="outline"
          onClick={() => copiar(mensaje, 'mensaje')}
          className="w-full border-[#0d7a5f] text-[#0d7a5f] hover:bg-[#41f2c0]/10"
        >
          {copiado === 'mensaje'
            ? <><Check size={16} className="mr-2" /> Mensaje copiado</>
            : <><MessageCircle size={16} className="mr-2" /> Copiar mensaje entero para WhatsApp</>}
        </Button>

        <p className="text-xs text-gray-500 mt-3">
          El mensaje ya lleva el enlace dentro y les explica qué es. Sólo tienes que pegarlo.
        </p>
      </CardContent>
    </Card>
  );
}
