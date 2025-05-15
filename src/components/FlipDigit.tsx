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
      setIsFlipping(true);

      // Aggiorna il valore corrente DOPO che l'animazione di uscita è iniziata
      // e resetta lo stato di flipping dopo la durata dell'animazione
      const timeout = setTimeout(() => {
        setCurrentValue(newValue);
        setIsFlipping(false);
      }, 300); // Durata dell'animazione in ms (leggermente ridotta)

      return () => clearTimeout(timeout);
    }
  }, [value, newValue, currentValue]); // Dipendenze per l'effetto

  // Utilizziamo due span: uno per il valore che "esce" e uno per quello che "entra"
  return (
    <div className="flex flex-col items-center">
      {/* Contenitore per le cifre con sfondo scuro e overflow nascosto */}
      <div className="relative bg-gray-800 rounded p-1 min-w-[40px] h-10 flex items-center justify-center overflow-hidden shadow-inner perspective"> {/* Aggiunto perspective per potenziali effetti 3D futuri */}
        {/* Valore precedente (esce verso il basso) */}
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center text-gray-100 font-mono text-2xl font-bold",
            "transition-transform transition-opacity duration-300 ease-in-out", // Transizione per trasformazione e opacità
            isFlipping ? "transform translate-y-full opacity-0" : "transform translate-y-0 opacity-100 z-10" // Stato iniziale (visibile) -> Stato finale (scivola giù e scompare)
          )}
        >
          {previousValue}
        </span>
        {/* Nuovo valore (entra dal basso) */}
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center text-gray-100 font-mono text-2xl font-bold",
            "transition-transform transition-opacity duration-300 ease-in-out", // Transizione per trasformazione e opacità
            isFlipping ? "transform translate-y-full opacity-0 z-20" : "transform translate-y-0 opacity-100 z-10" // Stato iniziale (sotto e invisibile) -> Stato finale (scivola su e appare)
          )}
        >
          {newValue} {/* Mostra sempre il nuovo valore qui */}
        </span>
      </div>
      {/* Etichetta (Mesi, Giorni, ecc.) */}
      <div className="text-xs font-normal mt-1 text-gray-700">{label}</div>
    </div>
  );
};

export default FlipDigit;