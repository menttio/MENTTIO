import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, Percent, User, CreditCard, Check, AlertCircle, Smartphone, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// Puesta en marcha de los precios nuevos en Stripe. Se puede borrar cuando estén creados.
function StripeCatalogSetup() {
  const [estado, setEstado] = useState(null);
  const [cargando, setCargando] = useState(false);

  const ejecutar = async (aplicar) => {
    setCargando(true);
    try {
      const res = await base44.functions.invoke('stripeCatalogSetup', { aplicar });
      setEstado(res.data);
    } catch (e) {
      setEstado({ error: e.message });
    } finally {
      setCargando(false);
    }
  };

  return (
    <Card className="mb-8 border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-blue-900">
          <CreditCard size={18} />
          Crear los precios nuevos en Stripe
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-blue-900">
          Esencial 12,99 €/mes y 130 €/año; Clase grabada 29,99 €/mes y 300 €/año. Si un precio ya
          existe no se duplica. Primero comprueba, luego crea.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={cargando} onClick={() => ejecutar(false)}>
            {cargando ? <Loader2 className="animate-spin" size={16} /> : 'Comprobar sin crear nada'}
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" disabled={cargando} onClick={() => ejecutar(true)}>
            {cargando ? <Loader2 className="animate-spin" size={16} /> : 'Crear los precios'}
          </Button>
        </div>

        {estado && (
          <div className="bg-white rounded-xl p-4 text-sm space-y-2 border border-blue-200">
            {estado.error && (
              <p className="text-red-600 flex items-start gap-2"><AlertCircle size={16} className="mt-0.5" />{estado.error}</p>
            )}
            {estado.cuenta?.id && (
              <p className="text-gray-500">Cuenta de Stripe: {estado.cuenta.id} ({estado.cuenta.pais}, {String(estado.cuenta.moneda || '').toUpperCase()})</p>
            )}
            {estado.precios && Object.entries(estado.precios).map(([k, v]) => (
              <p key={k} className="flex items-start gap-2">
                {String(v).startsWith('price_') && <Check size={16} className="text-green-600 mt-0.5" />}
                <span className="text-gray-600">{k.replace('stripe_price_', '').replace('_', ' ')}:</span>
                <strong className="text-[#404040] break-all">{v}</strong>
              </p>
            ))}
            {estado.aplicar && <p className="text-green-700">Guardado. Ya puedes avisar de que están creados.</p>}
            {estado.errores?.length > 0 && (
              <p className="text-red-600">{estado.errores.join(' · ')}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const eur = (n) => `${Number(n || 0).toFixed(2).replace('.', ',')}€`;

/**
 * Bizums del plan sin cuota pendientes de confirmar.
 *
 * En ese plan el alumno le hace el Bizum a Menttio, no al profesor. Cuando el alumno decía
 * "ya lo he enviado", la clase se quedaba en el limbo: se avisaba al profesor, que no es
 * quien había recibido el dinero, y nadie podía darla por pagada. Esto lo cierra.
 */
function BizumsPendientes() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [actuando, setActuando] = useState(null);

  const cargar = async () => {
    setCargando(true);
    try {
      const r = await base44.functions.invoke('bizumAdmin', { accion: 'listar' });
      setDatos(r.data);
    } catch (e) {
      setDatos({ error: e.message });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const actuar = async (bookingId, accion) => {
    setActuando(bookingId + accion);
    try {
      await base44.functions.invoke('bizumAdmin', { accion, bookingId });
      await cargar();
    } catch (e) {
      alert('No se ha podido completar: ' + e.message);
    } finally {
      setActuando(null);
    }
  };

  const lista = datos?.pendientes || [];

  return (
    <Card className="mb-8">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Smartphone size={18} className="text-[#0d7a5f]" aria-hidden="true" />
          Bizums pendientes de confirmar
          {lista.length > 0 && (
            <Badge className="bg-orange-100 text-orange-800">{lista.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {cargando ? (
          <div className="py-6 flex justify-center"><Loader2 className="animate-spin text-[#41f2c0]" /></div>
        ) : lista.length === 0 ? (
          <p className="text-gray-500 text-sm py-2">
            Nada pendiente. Aquí aparecen los Bizums que los alumnos dicen haberte enviado, para
            que confirmes que han llegado.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Comprueba cada uno en tu app de Bizum antes de confirmarlo. Al confirmar, la clase
              queda pagada y se anota lo que le debes al profesor.
            </p>
            {lista.map((b) => (
              <div key={b.id} className="border border-gray-200 rounded-xl p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#404040]">
                      {b.alumno} — {b.asignatura}
                    </p>
                    <p className="text-sm text-gray-500">
                      {b.fecha} a las {b.hora} · con {b.profesor}
                    </p>
                    <p className="text-sm mt-1 text-gray-600">
                      Cobrado <strong>{eur(b.precio)}</strong> · para el profesor{' '}
                      <strong>{eur(b.para_el_profesor)}</strong> · para ti{' '}
                      <strong>{eur(b.comision)}</strong> ({b.comision_pct}%)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actuando === b.id + 'rechazar'}
                      onClick={() => actuar(b.id, 'rechazar')}
                    >
                      <X size={14} className="mr-1" aria-hidden="true" /> No me consta
                    </Button>
                    <Button
                      size="sm"
                      className="bg-[#41f2c0] hover:bg-[#35d4a7] text-[#404040]"
                      disabled={actuando === b.id + 'confirmar'}
                      onClick={() => actuar(b.id, 'confirmar')}
                    >
                      {actuando === b.id + 'confirmar'
                        ? <Loader2 className="animate-spin" size={14} />
                        : <><Check size={14} className="mr-1" aria-hidden="true" /> Lo he recibido</>}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-[#404040]">
              Si confirmas todo lo pendiente: <strong>{eur(datos.total_para_profesores)}</strong> a
              repartir entre los profesores a final de mes y{' '}
              <strong>{eur(datos.total_menttio)}</strong> para Menttio.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminCommissions() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        if (me.role !== 'admin') { setLoading(false); return; }

        const commissionTeachers = await base44.entities.Teacher.filter({ subscription_plan: 'commission' });

        if (commissionTeachers.length === 0) { setData([]); setLoading(false); return; }

        const results = await Promise.all(
          commissionTeachers.map(async (teacher) => {
            const bookings = await base44.entities.Booking.filter({ teacher_id: teacher.id, status: 'completed' });
            const pct = teacher.commission_percentage ?? 10;
            const platformFeeTotal = bookings.reduce((s, b) => s + (b.platform_fee ?? (b.price || 0) * pct / 100), 0);
            const teacherPayoutTotal = bookings.reduce((s, b) => s + (b.teacher_payout ?? (b.price || 0) * (1 - pct / 100)), 0);
            return { teacher, bookings, platformFeeTotal, teacherPayoutTotal };
          })
        );

        setData(results);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="animate-spin text-[#41f2c0]" size={40} />
    </div>
  );

  if (user?.role !== 'admin') return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-gray-500">Acceso restringido a administradores.</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#404040] flex items-center gap-2">
          <Percent className="text-purple-500" size={28} />
          Comisiones Pendientes
        </h1>
        <p className="text-gray-500 mt-1 text-sm">Profesores en el plan sin cuota — clases completadas y desglose de pagos</p>
      </div>

      <BizumsPendientes />

      <StripeCatalogSetup />

      {data.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-gray-400">
            No hay profesores en el plan sin cuota con clases completadas.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {data.map(({ teacher, bookings, platformFeeTotal, teacherPayoutTotal }) => (
            <Card key={teacher.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User size={20} className="text-purple-500" />
                    {teacher.full_name}
                  </CardTitle>
                  <Badge className="bg-purple-100 text-purple-700">
                    Sin cuota ({teacher.commission_percentage ?? 10}%)
                  </Badge>
                </div>
                <p className="text-sm text-gray-500">{teacher.user_email}</p>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Total clases</p>
                    <p className="text-xl font-bold text-[#404040]">{bookings.length}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-purple-600">Menttio cobra</p>
                    <p className="text-xl font-bold text-purple-700">{platformFeeTotal.toFixed(2)}€</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-green-600">Profesor recibe</p>
                    <p className="text-xl font-bold text-green-700">{teacherPayoutTotal.toFixed(2)}€</p>
                  </div>
                </div>
              </CardHeader>
              {bookings.length > 0 && (
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-gray-500">
                          <th className="pb-2 pr-3">Fecha</th>
                          <th className="pb-2 pr-3">Asignatura</th>
                          <th className="pb-2 pr-3">Alumno</th>
                          <th className="pb-2 pr-3 text-right">Precio</th>
                          <th className="pb-2 pr-3 text-right">Menttio</th>
                          <th className="pb-2 text-right">Profesor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookings.map((b) => {
                          const pct = teacher.commission_percentage ?? 10;
                          const fee = b.platform_fee ?? (b.price || 0) * pct / 100;
                          const payout = b.teacher_payout ?? (b.price || 0) * (1 - pct / 100);
                          return (
                            <tr key={b.id} className="border-b last:border-0 hover:bg-gray-50">
                              <td className="py-2 pr-3 whitespace-nowrap">{format(new Date(b.date), "d MMM yyyy", { locale: es })}</td>
                              <td className="py-2 pr-3">{b.subject_name}</td>
                              <td className="py-2 pr-3 text-gray-600">{b.student_name}</td>
                              <td className="py-2 pr-3 text-right font-medium">{(b.price || 0).toFixed(2)}€</td>
                              <td className="py-2 pr-3 text-right text-purple-600 font-medium">{fee.toFixed(2)}€</td>
                              <td className="py-2 text-right text-green-600 font-medium">{payout.toFixed(2)}€</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}