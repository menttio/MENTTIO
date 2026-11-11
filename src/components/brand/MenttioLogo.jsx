import React, { useId } from 'react';

// Trazo de la π, el mismo en el icono y en la palabra: barra con gancho a la izquierda,
// pata izquierda que se curva hacia fuera y pata derecha rematada como una "t".
// Dibujada en una caja de 60×50 (50 = altura de las minúsculas).
const PI_PATHS = [
  'M5 16C6.5 9 11.5 6 18 6H56',
  'M23.5 6C23.5 23 20.5 35 12.5 44',
  'M40.5 6V35.5C40.5 42.5 45 45 52.5 41.5',
];

/**
 * π dentro del texto. Ocupa la altura de las minúsculas y se apoya en la línea base,
 * con el grosor del Fraunces en negrita, para que "Men π io" se lea como una sola palabra.
 */
export function PiGlyph({ className = '' }) {
  return (
    <svg
      viewBox="0 0 60 50"
      fill="none"
      stroke="currentColor"
      strokeWidth={8.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ width: '0.6em', height: '0.5em', display: 'inline-block', margin: '0 0.025em', overflow: 'visible' }}
      aria-hidden="true"
      focusable="false"
    >
      {PI_PATHS.map(d => <path key={d} d={d} />)}
    </svg>
  );
}

/**
 * Icono: π menta con volumen (luz arriba, sombra abajo y sombra proyectada) y un anillo
 * de planeta azul que pasa por delante, sobre gris oscuro. Basado en el logo original.
 */
export function MenttioMark({ size = 40, className = '' }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={`flex-shrink-0 ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`anillo-${id}`} x1="4" y1="44" x2="60" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#45c8e8" />
          <stop offset="1" stopColor="#4f8ff7" />
        </linearGradient>
        <linearGradient id={`pi-${id}`} x1="0" y1="18" x2="0" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7ff7d6" />
          <stop offset="0.45" stopColor="#41f2c0" />
          <stop offset="1" stopColor="#1fa37e" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="#404040" />
      <g transform="rotate(-24 32 35)">
        {/* mitad trasera del anillo (por detrás de la π) */}
        <path d="M5.5 35A26.5 9.5 0 0 1 58.5 35" fill="none" stroke={`url(#anillo-${id})`} strokeWidth="2.6" strokeLinecap="round" opacity="0.55" />
      </g>
      {/* sombra proyectada de la π */}
      <g transform="translate(1.2 1.6)" opacity="0.55">
        <g transform="translate(15 15.5) scale(0.57)" fill="none" stroke="#2a2a2a" strokeWidth="9.5" strokeLinecap="round" strokeLinejoin="round">
          {PI_PATHS.map(d => <path key={d} d={d} />)}
        </g>
      </g>
      {/* π con luz arriba y sombra abajo */}
      <g transform="translate(15 15.5) scale(0.57)" fill="none" stroke={`url(#pi-${id})`} strokeWidth="9.5" strokeLinecap="round" strokeLinejoin="round">
        {PI_PATHS.map(d => <path key={d} d={d} />)}
      </g>
      <g transform="rotate(-24 32 35)">
        {/* mitad delantera: un trazo del color del fondo abre hueco sobre la π */}
        <path d="M5.5 35A26.5 9.5 0 0 0 58.5 35" fill="none" stroke="#404040" strokeWidth="6.5" strokeLinecap="round" />
        <path d="M5.5 35A26.5 9.5 0 0 0 58.5 35" fill="none" stroke={`url(#anillo-${id})`} strokeWidth="3.2" strokeLinecap="round" />
        <path d="M10 38.5A22.5 7 0 0 0 54 36.5" fill="none" stroke={`url(#anillo-${id})`} strokeWidth="1.1" strokeLinecap="round" opacity="0.7" />
      </g>
    </svg>
  );
}

const TONOS = {
  light: { texto: 'text-[#404040]', pi: 'text-[#0d7a5f]' }, // sobre blanco o gris claro
  dark: { texto: 'text-white', pi: 'text-[#41f2c0]' },      // sobre gris oscuro
  mint: { texto: 'text-[#404040]', pi: 'text-[#0b6650]' },  // sobre fondo menta
};

/**
 * Logo de Menttio: icono + "Men π io" (la π hace de "tt").
 * as: etiqueta (h1, span…); tone: light | dark | mint; mark: mostrar el icono.
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
      <span
        aria-hidden="true"
        className={`font-bold leading-none whitespace-nowrap ${t.texto} ${textClassName}`}
        style={{ fontFamily: "'Fraunces', serif", letterSpacing: '-0.015em' }}
      >
        Men<PiGlyph className={t.pi} />io
      </span>
    </Tag>
  );
}
