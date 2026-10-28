import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Star, ShieldCheck, AlertCircle, Check } from 'lucide-react';
import { createPageUrl } from '../utils';
import { MAX_COMENTARIO } from '@/lib/resenas';

/**
 * Pagina a la que llega un alumno desde el enlace de reseñas de su profesor.
 *
 * Existe por una razon concreta: un profesor que empieza en Menttio llega con años de
 * alumnos a la espalda y cero reseñas aqui. Si la unica forma de tener una es esperar a
 * que alguien de una clase dentro de la plataforma, su perfil sale vacio justo cuando mas
 * lo necesita. Y si se le deja escribirlas a mano, no valen nada.
 *
 * El punto medio es este: el profesor manda su enlace a sus alumnos de siempre, y el que
 * quiera dejarle una reseña tiene que entrar con su cuenta de Google y tener ficha de
 * alumno en Menttio. Eso no prueba que diera la clase (fue fuera), pero si que detras hay
 * una persona distinta del profesor, y solo puede dejar una. Se publica marcada como
 * "Alumno verificado", no como "Clase verificada": son dos cosas distintas y se dicen.
 *
 * El identificador del profesor se guarda en el navegador al llegar, porque el alumno se va
 * a identificar con Google y volveria sin la direccion original.
 */
const CLAVE = 'menttio_resena_profesor';

export default function DejarResena() {
  const [cargando, setCargando] = useState(true);
  const [profesor, setProfesor] = useState(null);
  const [sesion, setSesion] = useState(null);
  const [alumno, setAlumno] = useState(null);
  const [esSuPropioEnlace, setEsSuPropioEnlace] = useState(false);
  const [error, setError] = useState('');
  const [fallo, setFallo] = useState('');
  const [rating, setRating] = useState(0);
  const [encima, setEncima] = useState(0);
  const [comentario, setComentario] = useState('');
  const [anonima, setAnonima] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [hecho, setHecho] = useState(false);

  const idProfesor = (() => {
    const enUrl = new URLSearchParams(window.location.search).get('p');
    if (enUrl) {
      try { localStorage.setItem(CLAVE, enUrl); } catch (_e) { /* modo privado */ }
      return enUrl;
    }
    try { return localStorage.getItem(CLAVE) || ''; } catch (_e) { return ''; }
  })();

  useEffect(() => {
    const cargar = async () => {
      if (!idProfesor) {
        setError('Este enlace está incompleto. Pídele a tu profesor que te lo vuelva a mandar.');
        setCargando(false);
        return;
      }
      try {
        // Misma función que la invitación: no pide sesión y solo devuelve nombre y
        // asignaturas, para que el alumno sepa de quién va a opinar antes de entrar.
        const { data } = await base44.functions.invoke('invitacionProfesor', { teacher_id: idProfesor });
        if (!data?.teacher) throw new Error('sin profesor');
        setProfesor(data.teacher);
      } catch (_e) {
        setError('Este enlace no es válido. Pídele a tu profesor que te lo vuelva a mandar.');
        setCargando(false);
        return;
      }

      const user = await base44.auth.me().catch(() => null);
      setSesion(user);
      if (user?.email) {
        const [fichas, propio] = await Promise.all([
          base44.entities.Student.filter({ user_email: user.email }).catch(() => []),
          base44.entities.Teacher.filter({ user_email: user.email }).catch(() => []),
        ]);
        setAlumno(fichas[0] || null);
        setEsSuPropioEnlace(propio.some((t) => t.id === idProfesor));
      }
      setCargando(false);
    };
    cargar();
  }, [idProfesor]);

  const enviar = async () => {
    if (!rating) return;
    setGuardando(true);
    setFallo('');
    try {
      const res = await base44.functions.invoke('crearResena', {
        teacher_id: idProfesor,
        rating,
        comment: comentario.trim(),
        anonima,
      });
      const datos = res?.data || res;
      if (datos?.error) {
        setFallo(datos.error);
        return;
      }
      try { localStorage.removeItem(CLAVE); } catch (_e) { /* da igual */ }
      setHecho(true);
    } catch (e) {
      setFallo(
        e?.response?.data?.error ||
          'No se ha podido guardar la reseña. Vuelve a intentarlo en un momento.',
      );
    } finally {
      setGuardando(false);
    }
  };

  const Marco = ({ children }) => (
    <div className="min-h-screen bg-[#f2f2f2] flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-lg border-2 border-[#41f2c0]">
        <CardContent className="p-6 sm:p-8">{children}</CardContent>
      </Card>
    </div>
  );

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f2f2f2]">
        <Loader2 className="animate-spin text-[#0d7a5f]" size={32} />
        <span className="sr-only">Cargando</span>
      </div>
    );
  }

  if (error) {
    return (
      <Marco>
        <div className="flex items-start gap-3">
          <AlertCircle className="text-[#0d7a5f] flex-shrink-0 mt-0.5" size={22} aria-hidden="true" />
          <div>
            <h1 className="font-bold text-[#404040] text-lg mb-1">No hemos podido abrir el enlace</h1>
            <p className="text-gray-600 text-sm">{error}</p>
          </div>
        </div>
      </Marco>
    );
  }

  if (hecho) {
    return (
      <Marco>
        <div className="text-center">
          <span className="inline-flex w-12 h-12 rounded-full bg-[#41f2c0] items-center justify-center mb-4" aria-hidden="true">
            <Check size={24} className="text-[#404040]" />
          </span>
          <h1 className="font-bold text-[#404040] text-xl mb-2">Gracias por tu reseña</h1>
          <p className="text-gray-600 mb-6">
            Ya está publicada en el perfil de {profesor.full_name}, marcada como alumno verificado.
          </p>
          <Button
            onClick={() => { window.location.href = createPageUrl('StudentDashboard'); }}
            variant="outline"
            className="w-full"
          >
            Ir a mi panel
          </Button>
        </div>
      </Marco>
    );
  }

  const Cabecera = (
    <div className="flex items-center gap-3 mb-5">
      <span className="w-11 h-11 rounded-full bg-[#41f2c0]/25 flex items-center justify-center flex-shrink-0" aria-hidden="true">
        <Star size={22} className="text-[#0d7a5f]" />
      </span>
      <div>
        <h1 className="font-bold text-[#404040] text-xl leading-tight">
          Deja tu opinión sobre {profesor.full_name}
        </h1>
        <p className="text-gray-500 text-sm">Te lleva un minuto y le ayuda mucho.</p>
      </div>
    </div>
  );

  // El propio profesor abriendo su enlace para ver cómo queda. Pasa siempre, y sin esto se
  // encontraría un formulario para valorarse a sí mismo (que el backend rechaza igualmente).
  if (esSuPropioEnlace) {
    return (
      <Marco>
        {Cabecera}
        <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
          <p className="font-medium text-[#404040] mb-1">Este es tu enlace.</p>
          <p>
            Mándalo a tus alumnos de siempre. Cada uno entra con su cuenta, deja su reseña y
            aparece en tu perfil. Tú no puedes valorarte: por eso las reseñas valen algo.
          </p>
        </div>
      </Marco>
    );
  }

  if (!sesion) {
    return (
      <Marco>
        {Cabecera}
        <div className="rounded-xl bg-[#41f2c0]/10 p-4 mb-5 text-sm text-[#404040] flex items-start gap-2">
          <ShieldCheck size={18} className="text-[#0d7a5f] mt-0.5 shrink-0" />
          <span>
            Pedimos que entres con tu cuenta para que la reseña se pueda comprobar. Si cualquiera
            pudiera escribirlas sin identificarse, no valdrían nada. Es gratis y no tienes que
            pagar nada nunca.
          </span>
        </div>
        <Button
          onClick={() => base44.auth.redirectToLogin(createPageUrl('AuthRedirect'))}
          className="bg-[#41f2c0] hover:bg-[#35d4a7] text-[#404040] font-bold w-full"
        >
          Entrar y dejar mi reseña
        </Button>
        <p className="text-xs text-gray-500 mt-3 text-center">
          Entras con tu cuenta de Google y vuelves aquí para terminar.
        </p>
      </Marco>
    );
  }

  if (!alumno) {
    return (
      <Marco>
        {Cabecera}
        <p className="text-gray-600 text-sm mb-5">
          Te falta crear tu ficha de alumno. Es un paso corto y gratis, y al terminar vuelves
          aquí automáticamente.
        </p>
        <Button
          onClick={() => { window.location.href = createPageUrl('StudentSignup'); }}
          className="bg-[#41f2c0] hover:bg-[#35d4a7] text-[#404040] font-bold w-full"
        >
          Crear mi ficha y continuar
        </Button>
      </Marco>
    );
  }

  const nombrePila = (alumno.full_name || '').trim().split(/\s+/)[0] || 'tu nombre';

  return (
    <Marco>
      {Cabecera}

      <div className="text-center py-2">
        <p className="text-sm text-gray-500 mb-3">¿Cómo han sido tus clases?</p>
        <div className="flex justify-center gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${i + 1} de 5 estrellas`}
              onMouseEnter={() => setEncima(i + 1)}
              onMouseLeave={() => setEncima(0)}
              onClick={() => setRating(i + 1)}
              className="transition-transform hover:scale-110"
            >
              <Star
                size={32}
                className={
                  (encima || rating) > i
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-300'
                }
              />
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-2 h-5">
          {rating === 5 ? 'Excelente' : rating === 4 ? 'Muy bueno' : rating === 3 ? 'Bueno' : rating === 2 ? 'Regular' : rating === 1 ? 'Mejorable' : ''}
        </p>
      </div>

      <div className="mt-2">
        <Textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value.slice(0, MAX_COMENTARIO))}
          placeholder="Cuenta cómo explica, qué te ha ayudado... (opcional)"
          rows={4}
        />
        <p className="text-[11px] text-gray-400 mt-1 text-right">
          {comentario.length}/{MAX_COMENTARIO}
        </p>
      </div>

      <div className="rounded-xl bg-gray-50 p-3 space-y-2 mt-3">
        <label className="flex items-start gap-2 cursor-pointer">
          <Checkbox checked={anonima} onCheckedChange={(v) => setAnonima(v === true)} />
          <span className="text-sm text-gray-700">Publicarla sin mi nombre</span>
        </label>
        <p className="text-xs text-gray-500">
          {anonima
            ? 'Aparecerá como "Estudiante" junto a tu edad.'
            : `Aparecerá solo tu nombre de pila (${nombrePila}). Nunca tu apellido ni tu correo.`}
        </p>
        <p className="text-xs text-[#0d7a5f] flex items-start gap-1.5">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" />
          <span>
            Se publicará como <strong>Alumno verificado</strong>: hay una cuenta real detrás, y
            decimos que la clase fue fuera de Menttio.
          </span>
        </p>
      </div>

      {fallo && (
        <p className="text-sm text-red-600 flex items-start gap-1.5 mt-3">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          {fallo}
        </p>
      )}

      <Button
        onClick={enviar}
        disabled={!rating || guardando}
        className="bg-[#41f2c0] hover:bg-[#35d4a7] text-[#404040] font-bold w-full mt-5"
      >
        {guardando ? <Loader2 className="animate-spin" /> : 'Enviar mi reseña'}
      </Button>
      {!rating && (
        <p className="text-xs text-gray-400 mt-2 text-center">Elige las estrellas para continuar.</p>
      )}
    </Marco>
  );
}
