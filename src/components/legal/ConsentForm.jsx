import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createPageUrl } from '../../utils';
import { esMenorDeEdadDigital, textoDe, EDAD_CONSENTIMIENTO } from './consentTexts';

/**
 * Bloque de consentimiento para alumnos. Pide la fecha de nacimiento y, si es menor de 14 años,
 * los datos del padre, madre o tutor, que es quien puede autorizar (art. 7 LOPDGDD).
 * El consentimiento de grabación va aparte y es opcional, porque no es necesario para dar clase.
 */
export default function ConsentForm({ value, onChange }) {
  const info = useMemo(() => esMenorDeEdadDigital(value.birth_date), [value.birth_date]);
  const esMenor = info?.esMenor ?? false;
  const set = (campo, v) => onChange({ ...value, [campo]: v });

  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="birth_date">
          Fecha de nacimiento del alumno <span className="text-red-500">*</span>
        </Label>
        <Input
          id="birth_date"
          type="date"
          max={new Date().toISOString().split('T')[0]}
          value={value.birth_date || ''}
          onChange={(e) => set('birth_date', e.target.value)}
          className="mt-2"
        />
        <p className="mt-1 text-xs text-gray-500">
          La pedimos por una razón concreta: por debajo de {EDAD_CONSENTIMIENTO} años, el permiso lo tiene
          que dar un adulto responsable.
        </p>
        {info && info.edad >= 0 && (
          <p className="mt-1 text-xs font-medium text-[#404040]">
            {esMenor
              ? `Menor de ${EDAD_CONSENTIMIENTO} años: necesitamos los datos de su padre, madre o tutor.`
              : `${info.edad} años: puede dar el consentimiento por sí mismo.`}
          </p>
        )}
      </div>

      {esMenor && (
        <div className="space-y-4 rounded-xl border border-[#41f2c0]/50 bg-[#41f2c0]/5 p-4">
          <p className="text-sm font-semibold text-[#404040]">Datos del padre, madre o tutor legal</p>
          <div>
            <Label htmlFor="guardian_name">
              Nombre y apellidos <span className="text-red-500">*</span>
            </Label>
            <Input
              id="guardian_name"
              value={value.guardian_name || ''}
              onChange={(e) => set('guardian_name', e.target.value)}
              placeholder="Nombre del adulto responsable"
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="guardian_email">
              Correo electrónico <span className="text-red-500">*</span>
            </Label>
            <Input
              id="guardian_email"
              type="email"
              value={value.guardian_email || ''}
              onChange={(e) => set('guardian_email', e.target.value)}
              placeholder="correo@ejemplo.com"
              className="mt-2"
            />
          </div>
          <fieldset>
            <legend className="text-sm font-medium text-[#404040]">Relación con el alumno</legend>
            <div className="mt-2 flex gap-4">
              {[
                { v: 'madre', l: 'Madre' },
                { v: 'padre', l: 'Padre' },
                { v: 'tutor', l: 'Tutor legal' },
              ].map((op) => (
                <label key={op.v} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="guardian_relationship"
                    value={op.v}
                    checked={value.guardian_relationship === op.v}
                    onChange={() => set('guardian_relationship', op.v)}
                    className="h-4 w-4"
                  />
                  {op.l}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      )}

      <div className="space-y-3">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={Boolean(value.privacy_consent)}
            onChange={(e) => set('privacy_consent', e.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <span>
            {textoDe('privacidad', esMenor)}{' '}
            <Link to={createPageUrl('PrivacyPolicy')} className="underline" target="_blank" rel="noopener noreferrer">
              Ver política de privacidad
            </Link>
            <span className="text-red-500"> *</span>
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={Boolean(value.recording_consent)}
            onChange={(e) => set('recording_consent', e.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <span>
            {textoDe('grabacion', esMenor)}{' '}
            <span className="text-gray-500">(opcional; sin esto las clases no se graban)</span>
          </span>
        </label>
      </div>
    </div>
  );
}

/** Comprueba que el bloque está completo antes de dejar continuar. */
export function consentimientoCompleto(value) {
  const info = esMenorDeEdadDigital(value.birth_date);
  if (!info) return 'Indica la fecha de nacimiento del alumno';
  if (info.edad < 0 || info.edad > 120) return 'La fecha de nacimiento no es válida';
  if (!value.privacy_consent) return 'Hay que aceptar la política de privacidad para continuar';
  if (info.esMenor) {
    if (!value.guardian_name) return 'Falta el nombre del padre, madre o tutor';
    if (!value.guardian_email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.guardian_email)) {
      return 'Falta un correo válido del padre, madre o tutor';
    }
    if (!value.guardian_relationship) return 'Indica la relación del adulto con el alumno';
  }
  return null;
}
