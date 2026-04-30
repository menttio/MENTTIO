import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, Percent, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

        const allTeachers = await base44.entities.Teacher.list();
        const commissionTeachers = allTeachers.filter(t => t.subscription_plan === 'commission');

        if (commissionTeachers.length === 0) { setData([]); setLoading(false); return; }

        const results = await Promise.all(
          commissionTeachers.map(async (teacher) => {
            const bookings = await base44.entities.Booking.filter({ teacher_id: teacher.id, status: 'completed' });
            const pct = teacher.commission_percentage ?? 25;
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
        <p className="text-gray-500 mt-1 text-sm">Profesores en plan Comisión — clases completadas y desglose de pagos</p>
      </div>

      {data.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-gray-400">
            No hay profesores en plan Comisión con clases completadas.
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
                    Plan Comisión ({teacher.commission_percentage ?? 25}%)
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
                          const pct = teacher.commission_percentage ?? 25;
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