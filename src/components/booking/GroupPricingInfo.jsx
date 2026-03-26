import React, { useState } from 'react';
import { Info, X, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export const GROUP_PRICES = {
  2: 18, // 2 alumnos → 18€/h por alumno
  3: 16, // 3 alumnos → 16€/h por alumno
  4: 15, // 4 alumnos → 15€/h por alumno
};

export function getGroupPrice(numStudents, durationHours = 1) {
  if (numStudents <= 1) return null; // precio individual
  const pricePerHour = GROUP_PRICES[Math.min(numStudents, 4)];
  return pricePerHour * durationHours;
}

export default function GroupPricingInfo({ durationHours = 1 }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-[#41f2c0] hover:text-[#35d4a7] underline underline-offset-2"
      >
        <Info size={13} />
        Ver precios grupales
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users size={18} className="text-[#41f2c0]" />
              Precios de Clases Grupales
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-500">
              El precio por alumno se ajusta automáticamente según cuántos participen en la clase:
            </p>

            <div className="space-y-2">
              {Object.entries(GROUP_PRICES).map(([num, price]) => (
                <div
                  key={num}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {Array.from({ length: parseInt(num) }).map((_, i) => (
                        <div key={i} className="w-5 h-5 rounded-full bg-[#41f2c0]/20 flex items-center justify-center">
                          <span className="text-[8px] text-[#41f2c0]">👤</span>
                        </div>
                      ))}
                    </div>
                    <span className="text-sm font-medium text-[#404040]">
                      {num} alumnos
                    </span>
                  </div>
                  <span className="font-bold text-[#41f2c0]">
                    {price * durationHours}€/alumno
                  </span>
                </div>
              ))}
            </div>

            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700">
              ⚠️ <strong>Importante:</strong> Si al realizar la clase solo hay 1 alumno, se aplicará el precio de clase individual.
            </div>

            <p className="text-xs text-gray-400 text-center">
              El precio final se determina al número de alumnos que asistan.
            </p>
          </div>

          <Button onClick={() => setOpen(false)} className="w-full bg-[#41f2c0] hover:bg-[#35d4a7]">
            Entendido
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}