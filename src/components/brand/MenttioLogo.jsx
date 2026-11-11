import React from 'react';

// π dibujada a mano para que se lea como las dos "t" de Menttio:
// barra superior con un pequeño gancho a la izquierda, pata izquierda recta
// y pata derecha que remata hacia la derecha, como una t minúscula.
export function PiGlyph({ className = '', strokeWidth = 3.2, style }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 8.2c0-2.3 1.4-3.4 3.6-3.4H21" />
      <path d="M9.4 4.8 8.6 20" />
      <path d="M15.6 4.8v11.6c0 2.3 1.2 3.6 3.6 3.6" />
    </svg>
  );
}

// Icono cuadrado: π menta sobre gris oscuro (contraste 7:1, se ve igual sobre blanco,
// sobre menta y sobre fondo oscuro).
export function MenttioMark({ size = 40, className = '' }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl bg-[#404040] text-[#41f2c0] shadow-sm ring-1 ring-black/5 flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <PiGlyph style={{ width: size * 0.62, height: size * 0.62 }} />
    </span>
  );
}

const TONOS = {
  light: { texto: 'text-[#404040]', pi: 'text-[#0d7a5f]' }, // sobre blanco o gris claro
  dark: { texto: 'text-white', pi: 'text-[#41f2c0]' },      // sobre gris oscuro
  mint: { texto: 'text-[#404040]', pi: 'text-[#0b6650]' },  // sobre fondo menta
};

/**
 * Logo de Menttio: "Men" + π + "io" (la π hace de "tt").
 * as: etiqueta (h1, span…); tone: light | dark | mint; mark: mostrar el icono cuadrado.
 */
export default function MenttioLogo({
  as: Tag = 'span',
  tone = 'light',
  mark = false,
  markSize = 36,
  className = '',
  textClassName = 'text-2xl',
}) {
  const t = TONOS[tone] || TONOS.light;
  return (
    <Tag className={`inline-flex items-center gap-2.5 ${className}`} translate="no" aria-label="Menttio">
      {mark && <MenttioMark size={markSize} />}
      <span aria-hidden="true" className={`font-bold tracking-tight leading-none inline-flex items-baseline ${t.texto} ${textClassName}`}>
        Men
        <PiGlyph className={`${t.pi} inline-block self-center`} strokeWidth={3.4} style={{ width: '0.95em', height: '0.95em', margin: '0 0.01em', transform: 'translateY(0.04em)' }} />
        io
      </span>
    </Tag>
  );
}
