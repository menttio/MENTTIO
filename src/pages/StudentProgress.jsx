import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, TrendingUp, BookOpen, Star, CheckSquare, Square, Download } from 'lucide-react';
import { downloadReport } from '@/lib/reportPdf';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const SUBJECT_COLORS = ['#41f2c0', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981'];

function StarDisplay({ value }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          size={14}
          className={n <= value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}
        />
      ))}
    </div>
  );
}

export default function StudentProgress() {
  const [student, setStudent] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportMonth, setReportMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    const load = async () => {
      try {
        const user = await base44.auth.me();
        const students = await base44.entities.Student.filter({ user_email: user.email });
        if (students.length === 0) return;
        setStudent(students[0]);

        const completed = await base44.entities.Booking.filter(
          { student_id: students[0].id, status: 'completed' },
          '-date',
          100
        );
        setBookings(completed);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#41f2c0]" size={40} />
      </div>
    );
  }

  const ratedBookings = bookings.filter(b => b.progress_rating > 0 || b.progress_note || b.homework_done !== null && b.homework_done !== undefined);

  // Group by subject
  const subjectMap = {};
  ratedBookings.forEach(b => {
    if (!subjectMap[b.subject_name]) subjectMap[b.subject_name] = [];
    subjectMap[b.subject_name].push(b);
  });

  // Build chart data (one point per class, sorted ascending)
  const subjects = Object.keys(subjectMap);
  const ratedForChart = ratedBookings.filter(b => b.progress_rating > 0);
  const sortedDates = [...new Set(ratedForChart.map(b => b.date))].sort();

  const chartData = sortedDates.map(date => {
    const point = { date: format(parseISO(date), 'd MMM', { locale: es }) };
    subjects.forEach(s => {
      const entry = subjectMap[s].find(b => b.date === date && b.progress_rating > 0);
      if (entry) point[s] = entry.progress_rating;
    });
    return point;
  });

  const hasChart = chartData.length >= 2 && subjects.length > 0;

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-3xl font-bold text-[#404040]">Mi Progreso</h1>
            <p className="text-gray-500 mt-2 text-sm">Seguimiento de tu evolución por asignatura</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="month"
              value={reportMonth}
              onChange={e => setReportMonth(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#41f2c0]"
            />
            <button
              onClick={() => downloadReport({ studentName: student?.full_name || 'Alumno', month: reportMonth, bookings })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#41f2c0] text-[#41f2c0] text-sm font-medium hover:bg-[#41f2c0] hover:text-white transition-colors"
            >
              <Download size={14} />
              Descargar informe
            </button>
          </div>
        </div>
      </motion.div>

      {ratedBookings.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 bg-gray-50 rounded-xl"
        >
          <TrendingUp className="mx-auto text-gray-300 mb-4" size={56} />
          <h3 className="font-medium text-[#404040] mb-2">Aún no hay notas de progreso</h3>
          <p className="text-gray-500 text-sm max-w-xs mx-auto">
            Tu profesor irá añadiendo valoraciones tras cada clase completada.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-8">
          {/* Chart */}
          {hasChart && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp size={18} className="text-[#41f2c0]" />
                    Evolución de valoraciones
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value, name) => [
                          <StarDisplay value={value} />, name
                        ]}
                      />
                      {subjects.length > 1 && <Legend />}
                      {subjects.map((subject, idx) => (
                        <Line
                          key={subject}
                          type="monotone"
                          dataKey={subject}
                          stroke={SUBJECT_COLORS[idx % SUBJECT_COLORS.length]}
                          strokeWidth={2.5}
                          dot={{ r: 5, fill: SUBJECT_COLORS[idx % SUBJECT_COLORS.length] }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Notes by subject */}
          {subjects.map((subject, sIdx) => {
            const entries = subjectMap[subject].sort((a, b) => new Date(b.date) - new Date(a.date));
            const avg = entries.filter(e => e.progress_rating > 0).reduce((s, e) => s + e.progress_rating, 0) /
              (entries.filter(e => e.progress_rating > 0).length || 1);
            const hwMarked = entries.filter(e => e.homework_done === true || e.homework_done === false);
            const hwDone = hwMarked.filter(e => e.homework_done === true).length;

            return (
              <motion.div
                key={subject}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + sIdx * 0.08 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <BookOpen size={16} className="text-[#41f2c0]" />
                        {subject}
                      </CardTitle>
                      <div className="flex items-center gap-3 flex-wrap">
                        {entries.some(e => e.progress_rating > 0) && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Media</span>
                            <StarDisplay value={Math.round(avg)} />
                            <span className="text-sm font-semibold text-[#404040]">{avg.toFixed(1)}</span>
                          </div>
                        )}
                        {hwMarked.length > 0 && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            hwDone / hwMarked.length >= 0.8
                              ? 'bg-green-100 text-green-700'
                              : hwDone / hwMarked.length >= 0.5
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-600'
                          }`}>
                            Deberes: {hwDone}/{hwMarked.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {entries.map(b => (
                      <div key={b.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-gray-500">
                            {format(parseISO(b.date), "d 'de' MMMM yyyy", { locale: es })}
                            {' · '}
                            {b.start_time}
                          </span>
                          {b.progress_rating > 0 && <StarDisplay value={b.progress_rating} />}
                        </div>
                        {b.homework_done !== null && b.homework_done !== undefined && (
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mb-1.5 ${
                            b.homework_done ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                          }`}>
                            {b.homework_done ? <CheckSquare size={11} /> : <Square size={11} />}
                            {b.homework_done ? 'Deberes hechos' : 'Deberes no hechos'}
                          </span>
                        )}
                        {b.progress_note ? (
                          <p className="text-sm text-[#404040] leading-relaxed">{b.progress_note}</p>
                        ) : (
                          <p className="text-xs text-gray-400 italic">Solo valoración, sin nota escrita</p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
