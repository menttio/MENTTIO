import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Check, GraduationCap, AlertCircle } from 'lucide-react';
import { createPageUrl } from '../utils';

/**
 * Página a la que llega un alumno desde el enlace de invitación de su profesor.
 *
 * Existe porque hasta ahora un profesor no tenía forma de traerse a sus alumnos: cada uno
 * tenía que registrarse, entrar en "buscar profesores" y encontrarle entre los demás. Con
 * quince o veinte alumnos, eso es lo que hacía que un profesor no se cambiase de herramienta.
 * Lo señaló el primer profesor interesado, sin que nadie se lo preguntara.
 *
 * El profesor copia su enlace y lo pega en su grupo. El alumno lo abre, elige asignatura y
 * queda asignado sin buscar a nadie.
 *
 * El identificador del profesor se guarda en el navegador nada más llegar, porque el alumno
 * se va a ir a identificarse con Google y volvería sin la dirección original.
 */
const CLAVE = 'menttio_invitacion_profesor';

export default function Invitacion() {
  const [cargando, setCargando] = useState(true);
  const [profesor, setProfesor] = useState(null);
  const [error, setError] = useState('');
  const [alumno, setAlumno] = useState(null);
  const [sesion, setSesion] = useState(null);
  // Varias a la vez: un profesor puede darle a un mismo alumno Matematicas y Fisica, o la
  // misma asignatura en dos niveles. Obligarle a elegir una sola dejaba el resto sin asignar
  // y el alumno no podria reservarlas.
  const [elecciones, setElecciones] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [hecho, setHecho] = useState(false);

  // El identificador puede venir en la dirección o de una visita anterior, si el alumno se
  // fue a identificarse por el camino.
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
        const { data } = await base44.functions.invoke('invitacionProfesor', { teacher_id: idProfesor });
        if (!data?.teacher) throw new Error('sin profesor');
        setProfesor(data.teacher);
        if (data.teacher.subjects?.length === 1) {
          const s = data.teacher.subjects[0];
          setElecciones([`${s.subject_id}|${s.level}`]);
        }
      } catch (_e) {
        setError('Esta invitación no es válida. Pídele a tu profesor que te la vuelva a mandar.');
        setCargando(false);
        return;
      }

      const user = await base44.auth.me().catch(() => null);
      setSesion(user);
      if (user?.email) {
        const fichas = await base44.entities.Student.filter({ user_email: user.email }).catch(() => []);
        setAlumno(fichas[0] || null);
      }
      setCargando(false);
    };
    cargar();
  }, [idProfesor]);

  // Asignaturas de este profesor que al alumno todavia le faltan. Se mira asignatura por
  // asignatura, no solo si ya tiene al profesor: si no, quien ya tuviera Matematicas con el y
  // volviera al enlace para anadir Fisica se encontraba con un "ya estas" y sin poder hacerlo.
  const asignadas = alumno?.assigned_teachers || [];
  const pendientes = (profesor?.subjects || []).filter(
    (s) => !asignadas.some(
      (a) => a.teacher_id === idProfesor
        && String(a.subject_id) === String(s.subject_id)
        && (a.level || '') === (s.level || ''),
    ),
  );
  const tieneAlgunaConEl = asignadas.some((a) => a.teacher_id === idProfesor);
  const yaAsignado = tieneAlgunaConEl && pendientes.length === 0;

  const aceptar = async () => {
    if (!alumno || elecciones.length === 0) return;
    setGuardando(true);
    try {
      const actuales = alumno.assigned_teachers || [];

      const nuevas = elecciones
        .map((valor) => {
          const [subjectId, level] = valor.split('|');
          const materia = profesor.subjects.find(
            (s) => String(s.subject_id) === subjectId && (s.level || '') === level,
          );
          return {
            teacher_id: profesor.id,
            teacher_name: profesor.full_name,
            subject_id: subjectId === 'null' ? null : subjectId,
            subject_name: materia?.subject_name || '',
            level,
          };
        })
        // Si ya tenia alguna de estas con este profesor, se deja como esta: el enlace se puede
        // abrir dos veces y no deben salir duplicadas.
        .filter((n) => !actuales.some(
          (a) => a.teacher_id === n.teacher_id
            && String(a.subject_id) === String(n.subject_id)
            && (a.level || '') === (n.level || ''),
        ));

      if (nuevas.length > 0) {
        await base44.entities.Student.update(alumno.id, {
          assigned_teachers: [...actuales, ...nuevas],
        });
      }

      try { localStorage.removeItem(CLAVE); } catch (_e) { /* da igual */ }
      setHecho(true);
    } catch (e) {
      console.error(e);
      setError('No se ha podido completar. Vuelve a intentarlo en un momento.');
    }
    setGuardando(false);
  };

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f2f2f2]">
        <Loader2 className="animate-spin text-[#0d7a5f]" size={32} />
        <span className="sr-only">Cargando la invitación</span>
      </div>
    );
  }

  const Marco = ({ children }) => (
    <div className="min-h-screen bg-[#f2f2f2] flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-lg border-2 border-[#41f2c0]">
        <CardContent className="p-6 sm:p-8">{children}</CardContent>
      </Card>
    </div>
  );

  if (error) {
    return (
      <Marco>
        <div className="flex items-start gap-3">
          <AlertCircle className="text-[#0d7a5f] flex-shrink-0 mt-0.5" size={22} aria-hidden="true" />
          <div>
            <h1 className="font-bold text-[#404040] text-lg mb-1">No hemos podido abrir la invitación</h1>
            <p className="text-gray-600 text-sm">{error}</p>
          </div>
        </div>
      </Marco>
    );
  }

  if (hecho || yaAsignado) {
    return (
      <Marco>
        <div className="text-center">
          <span className="inline-flex w-12 h-12 rounded-full bg-[#41f2c0] items-center justify-center mb-4" aria-hidden="true">
            <Check size={24} className="text-[#404040]" />
          </span>
          <h1 className="font-bold text-[#404040] text-xl mb-2">
            Ya estás con {profesor.full_name}
          </h1>
          <p className="text-gray-600 mb-6">
            Puedes reservar tus clases cuando quieras. La videollamada se crea sola.
          </p>
          <Button
            onClick={() => { window.location.href = createPageUrl('BookClass'); }}
            className="bg-[#41f2c0] hover:bg-[#35d4a7] text-[#404040] font-bold w-full"
          >
            Reservar mi primera clase
          </Button>
        </div>
      </Marco>
    );
  }

  return (
    <Marco>
      <div className="flex items-center gap-3 mb-5">
        <span className="w-11 h-11 rounded-full bg-[#41f2c0]/25 flex items-center justify-center flex-shrink-0" aria-hidden="true">
          <GraduationCap size={22} className="text-[#0d7a5f]" />
        </span>
        <div>
          <h1 className="font-bold text-[#404040] text-xl leading-tight">
            {profesor.full_name} te invita a Menttio
          </h1>
          <p className="text-gray-500 text-sm">Es gratis para ti. Sólo pagas tus clases.</p>
        </div>
      </div>

      <p className="text-gray-600 text-sm mb-6">
        Desde aquí reservas tus clases con {profesor.full_name.split(' ')[0]}, entras a la
        videollamada sin buscar ningún enlace y tienes los materiales y las grabaciones en un
        solo sitio.
      </p>

      {!sesion && (
        <>
          <Button
            onClick={() => {
              // Directo a identificarse con Google. No se pasa por la pantalla de elegir rol:
              // quien abre el enlace de un profesor es un alumno, y preguntarle el rol solo
              // añade un paso y el riesgo de que se registre como profesor por error.
              // AuthRedirect ve la invitación guardada y le lleva al registro de alumno.
              base44.auth.redirectToLogin(createPageUrl('AuthRedirect'));
            }}
            className="bg-[#41f2c0] hover:bg-[#35d4a7] text-[#404040] font-bold w-full"
          >
            Entrar y unirme
          </Button>
          <p className="text-xs text-gray-500 mt-3 text-center">
            Entras con tu cuenta de Google y vuelves aquí para terminar. Es gratis.
          </p>
        </>
      )}

      {sesion && !alumno && (
        <>
          <p className="text-sm text-gray-600 mb-4">
            Te falta completar tu perfil de alumno. Es un minuto.
          </p>
          <Button
            onClick={() => { window.location.href = createPageUrl('StudentSignup'); }}
            className="bg-[#41f2c0] hover:bg-[#35d4a7] text-[#404040] font-bold w-full"
          >
            Completar mi perfil
          </Button>
        </>
      )}

      {sesion && alumno && (
        <>
          {pendientes.length === 0 ? (
            <p className="text-sm text-gray-600">
              {profesor.full_name.split(' ')[0]} todavía no ha publicado sus asignaturas.
              Avísale y vuelve a abrir este enlace.
            </p>
          ) : (
            <>
              <fieldset className="mb-5">
                <legend className="text-sm font-medium text-[#404040] mb-1">
                  ¿De qué te da clase?
                </legend>
                <p className="text-xs text-gray-500 mb-2">
                  Marca todas las que te dé. Puedes cambiarlo después.
                </p>
                <div className="space-y-2">
                  {pendientes.map((s) => {
                    const valor = `${s.subject_id}|${s.level}`;
                    const marcada = elecciones.includes(valor);
                    return (
                      <label
                        key={valor}
                        className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                          marcada ? 'border-[#41f2c0] bg-[#41f2c0]/10' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          value={valor}
                          checked={marcada}
                          onChange={() => setElecciones((previas) =>
                            previas.includes(valor)
                              ? previas.filter((v) => v !== valor)
                              : [...previas, valor],
                          )}
                          className="accent-[#0d7a5f] w-4 h-4"
                        />
                        <span className="text-[#404040]">
                          {s.subject_name}
                          {s.level && <span className="text-gray-500"> · {s.level}</span>}
                          {s.price_per_hour != null && (
                            <span className="text-gray-500"> · {s.price_per_hour} €/h</span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <Button
                onClick={aceptar}
                disabled={elecciones.length === 0 || guardando}
                className="bg-[#41f2c0] hover:bg-[#35d4a7] text-[#404040] font-bold w-full"
              >
                {guardando
                  ? <Loader2 className="animate-spin" size={18} />
                  : elecciones.length > 1
                    ? `Unirme a ${profesor.full_name.split(' ')[0]} en ${elecciones.length} asignaturas`
                    : `Unirme a ${profesor.full_name.split(' ')[0]}`}
              </Button>
            </>
          )}
        </>
      )}
    </Marco>
  );
}
