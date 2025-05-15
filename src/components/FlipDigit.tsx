import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface FlipDigitProps {
  value: number;
  label: string;
}

const FlipDigit = ({ value, label }: FlipDigitProps) => {
  // Assicura che il valore sia sempre a due cifre
  const newValue = String(value).padStart(2, '0');

  const [currentValue, setCurrentValue] = useState(newValue);
  const [previousValue, setPreviousValue] = useState(newValue);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    // Aggiorna i valori solo se il numero cambia
    if (newValue !== currentValue) {
      setPreviousValue(currentValue);
      setCurrentValue(newValue);
      setIsFlipping(true);

      // Resetta lo stato di flipping dopo l'animazione
      const timeout = setTimeout(() => {
        setIsFlipping(false);
      }, 500); // Durata dell'animazione in ms

      return () => clearTimeout(timeout);
    }
  }, [value, newValue, currentValue]); // Dipendenze per l'effetto

  return (
    <div className="flex flex-col items-center">
      {/* Contenitore per le cifre con sfondo scuro e overflow nascosto */}
      <div className="relative bg-gray-800 rounded p-1 min-w-[40px] h-10 flex items-center justify-center overflow-hidden shadow-inner">
        {/* Cifra precedente che esce (animazione verso il basso) */}
        {isFlipping && (
          <span
            className={cn(
              "absolute inset-0 flex items-center justify-center text-gray-400 font-mono text-2xl font-bold transition-transform duration-500 ease-in-out",
              "transform translate-y-0 opacity-100", // Stato iniziale
              isFlipping ? "translate-y-full opacity-0" : "" // Stato finale (scivola giù e scompare)
            )}
          >
            {previousValue}
          </span>
        )}
        {/* Cifra corrente che entra (animazione dal basso verso l'alto) */}
         <span
            className={cn(
              "absolute inset-0 flex items-center justify-center text-gray-100 font-mono text-2xl font-bold transition-transform duration-500 ease-in-out",
              isFlipping ? "transform -translate-y-full opacity-0" : "translate-y-0 opacity-100" // Stato iniziale (scivola su e appare) / Stato finale
            )}
          >
            {currentValue}
          </span>
      </div>
      {/* Etichetta (Mesi, Giorni, ecc.) */}
      <div className="text-xs font-normal mt-1 text-gray-700">{label}</div>
    </div>
  );
};

export default FlipDigit;