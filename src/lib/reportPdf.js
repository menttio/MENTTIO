import jsPDF from 'jspdf';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function drawStars(doc, x, y, rating, maxRating = 5) {
  const r = 1.8;
  const gap = 5;
  for (let i = 0; i < maxRating; i++) {
    const cx = x + i * gap;
    if (i < rating) {
      doc.setFillColor(245, 158, 11);
      doc.circle(cx, y, r, 'F');
    } else {
      doc.setDrawColor(210, 210, 210);
      doc.setLineWidth(0.3);
      doc.circle(cx, y, r, 'D');
    }
  }
}

function drawHomeworkBadge(doc, x, y, done) {
  const color = done ? [22, 163, 74] : [220, 38, 38];
  doc.setFillColor(...color);
  doc.roundedRect(x, y - 3, done ? 28 : 35, 4.5, 1, 1, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(done ? 'Deberes: si' : 'Deberes: no', x + 2, y + 0.3);
}

export function generateProgressReport({ studentName, teacherName, month, bookings }) {
  const [year, monthNum] = month.split('-');
  const monthLabel = capitalize(
    format(new Date(parseInt(year), parseInt(monthNum) - 1, 1), 'MMMM yyyy', { locale: es })
  );

  const filtered = bookings
    .filter(b => b.date?.startsWith(month) && b.status !== 'cancelled')
    .sort((a, b) => (a.date > b.date ? 1 : -1));

  const withProgress = filtered.filter(
    b => b.progress_rating > 0 || b.progress_note || b.homework_done === true || b.homework_done === false
  );

  const ratedItems = filtered.filter(b => b.progress_rating > 0);
  const avgRating = ratedItems.length > 0
    ? ratedItems.reduce((s, b) => s + b.progress_rating, 0) / ratedItems.length
    : null;

  const homeworkMarked = filtered.filter(b => b.homework_done === true || b.homework_done === false);
  const homeworkDoneCount = homeworkMarked.filter(b => b.homework_done === true).length;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const margin = 18;
  let y = 0;

  // ── Header bar ──────────────────────────────────────────────────────────────
  doc.setFillColor(65, 242, 192);
  doc.rect(0, 0, W, 18, 'F');
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Menttio', margin, 11.5);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Plataforma de clases particulares', margin + 24, 11.5);

  // ── Title ───────────────────────────────────────────────────────────────────
  y = 31;
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(64, 64, 64);
  doc.text('Informe de Progreso', margin, y);
  y += 9;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  const subtitle = teacherName
    ? `${studentName}  ·  ${monthLabel}  ·  Prof. ${teacherName}`
    : `${studentName}  ·  ${monthLabel}`;
  doc.text(subtitle, margin, y);
  y += 14;

  // ── Summary cards ───────────────────────────────────────────────────────────
  const boxH = 28;
  const boxW = (W - 2 * margin - 8) / 3;

  const summaryItems = [
    { value: String(filtered.length), label: 'Clases' },
    {
      value: avgRating !== null ? avgRating.toFixed(1) + ' / 5' : '--',
      label: 'Media valoracion',
    },
    {
      value: homeworkMarked.length > 0 ? `${homeworkDoneCount}/${homeworkMarked.length}` : '--',
      label: 'Deberes hechos',
    },
  ];

  summaryItems.forEach((item, i) => {
    const bx = margin + i * (boxW + 4);
    doc.setFillColor(246, 248, 250);
    doc.setDrawColor(230, 232, 235);
    doc.setLineWidth(0.3);
    doc.roundedRect(bx, y, boxW, boxH, 3, 3, 'FD');
    doc.setFontSize(17);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(64, 64, 64);
    doc.text(item.value, bx + boxW / 2, y + 13, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(140, 140, 140);
    doc.text(item.label, bx + boxW / 2, y + 22, { align: 'center' });
  });

  y += boxH + 12;

  // ── Class list ──────────────────────────────────────────────────────────────
  if (withProgress.length === 0) {
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 160, 160);
    const msg = filtered.length === 0
      ? 'No hay clases registradas para este mes.'
      : 'El profesor no ha anadido notas de progreso para este mes.';
    doc.text(msg, margin, y + 8);
  } else {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(64, 64, 64);
    doc.text('Detalle por clase', margin, y);
    y += 8;

    for (const b of withProgress) {
      const noteText = b.progress_note || '';
      const noteLines = noteText
        ? doc.splitTextToSize(noteText, W - 2 * margin - 10).length
        : 0;
      const hasHw = b.homework_done === true || b.homework_done === false;
      const rowH = 10 + (b.progress_rating > 0 ? 7 : 0) + (hasHw ? 7 : 0) + noteLines * 4.5 + 5;

      if (y + rowH > 272) {
        doc.addPage();
        y = 20;
      }

      doc.setFillColor(251, 252, 253);
      doc.setDrawColor(228, 230, 234);
      doc.setLineWidth(0.25);
      doc.roundedRect(margin, y, W - 2 * margin, rowH, 2, 2, 'FD');

      // Date + subject
      const dateStr = format(parseISO(b.date), "d MMM yyyy", { locale: es });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(64, 64, 64);
      doc.text(`${dateStr}  ·  ${b.subject_name || ''}`, margin + 4, y + 7.5);

      let subY = y + 14;

      // Stars
      if (b.progress_rating > 0) {
        drawStars(doc, margin + 4, subY - 0.5, b.progress_rating);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        doc.text(`(${b.progress_rating}/5)`, margin + 4 + 5 * 5 + 3, subY + 0.5);
        subY += 7;
      }

      // Homework badge
      if (hasHw) {
        drawHomeworkBadge(doc, margin + 4, subY, b.homework_done);
        subY += 7;
      }

      // Note
      if (noteText) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(85, 85, 85);
        const lines = doc.splitTextToSize(noteText, W - 2 * margin - 10);
        doc.text(lines, margin + 4, subY);
      }

      y += rowH + 3;
    }
  }

  // ── Footer (all pages) ──────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(7.5);
    doc.setTextColor(190, 190, 190);
    const gen = format(new Date(), "d 'de' MMMM yyyy", { locale: es });
    doc.text(
      `Generado por Menttio  ·  ${gen}  ·  Pagina ${p} de ${pageCount}`,
      W / 2,
      291,
      { align: 'center' }
    );
  }

  return doc;
}

export function downloadReport({ studentName, teacherName, month, bookings }) {
  const doc = generateProgressReport({ studentName, teacherName, month, bookings });
  const safeName = studentName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  doc.save(`informe-${safeName}-${month}.pdf`);
}
