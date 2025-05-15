import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Product } from '@/types/product';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Mail } from "lucide-react";
import { supabase } from '@/integrations/supabase/client'; // Importa supabase per chiamare la Edge Function
import { showError as showErrorToast, showSuccess } from '@/utils/toast'; // Importa le toast

interface ContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  paymentMethod: 'paypal' | 'satispay' | 'transfer' | null;
  // La funzione onConfirmContribution ora gestirà l'intera logica, inclusa la prenotazione
  onConfirmContribution: (
    productId: string,
    amount: number,
    contributorName: string,
    contributorSurname: string,
    contributorEmail: string,
    message: string,
    paymentMethod: 'paypal' | 'satispay' | 'transfer' // Passa anche il metodo di pagamento
  ) => Promise<void>;
  paymentDetails: {
    paypal: string;
    satispay: { text: string; link: string };
    transfer: { iban: string; holder: string; reason: string };
  };
}

const ContributionModal = ({
  isOpen,
  onClose,
  product,
  paymentMethod,
  onConfirmContribution,
  paymentDetails,
}: ContributionModalProps) => {
  const [amount, setAmount] = useState<number | string>('');
  const [contributorName, setContributorName] = useState('');
  const [contributorSurname, setContributorSurname] = useState('');
  const [contributorEmail, setContributorEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setContributorName('');
      setContributorSurname('');
      setContributorEmail('');
      setMessage('');
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen, product, paymentMethod]);

  if (!isOpen || !product || !paymentMethod) {
      return null;
  }

  const remainingAmount = product.price - product.contributedAmount;
  const calculatedRemaining = Math.max(0, remainingAmount);
  const maxContribution = calculatedRemaining > 0 ? calculatedRemaining : product.price;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
       const numericValue = parseFloat(value);
       // Permetti di inserire un importo superiore al rimanente, ma non superiore al prezzo totale
       if (!isNaN(numericValue) && numericValue > product.price) {
         setAmount(product.price.toFixed(2));
       } else {
         setAmount(value);
       }
    }
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleConfirm = async () => {
    const contributionAmount = parseFloat(amount.toString());
    const epsilon = 0.001; // Tolleranza per floating point
    if (isNaN(contributionAmount) || contributionAmount <= 0 || contributionAmount > product.price + epsilon) {
       setError(`Inserisci un importo valido (massimo ${product.price.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}).`);
       return;
    }
    if (!contributorName.trim() || !contributorSurname.trim()) {
        setError("Nome e Cognome sono obbligatori.");
        return;
    }
    if (!contributorEmail.trim() || !isValidEmail(contributorEmail)) {
        setError("Inserisci un indirizzo email valido.");
        return;
    }

    setError(null);
    setIsLoading(true);

    try {
      // Chiamata alla Edge Function per prenotare il prodotto
      console.log("Attempting to reserve product via Edge Function...");
      const { data: reserveData, error: reserveError } = await supabase.functions.invoke('reserve-product', {
        body: {
          productId: product.id,
          contributorEmail: contributorEmail.trim(),
        },
      });

      if (reserveError) {
        console.error('Errore durante la prenotazione:', reserveError);
        // Gestisci errori specifici dalla Edge Function se necessario
        setError(reserveError.message || "Si è verificato un errore durante la prenotazione. Riprova.");
        setIsLoading(false);
        return; // Interrompi il processo se la prenotazione fallisce
      }

      console.log('Prenotazione riuscita:', reserveData);

      // Se la prenotazione ha successo, procedi con la conferma del contributo
      // La funzione onConfirmContribution (in Index.tsx) chiamerà la Edge Function di notifica
      // che ora includerà la logica per liberare la prenotazione.
      await onConfirmContribution(
        product.id,
        contributionAmount,
        contributorName.trim(),
        contributorSurname.trim(),
        contributorEmail.trim(),
        message.trim(),
        paymentMethod // Passa il metodo di pagamento
      );

      // La logica di chiusura modale e toast di successo è ora in onConfirmContribution
      // setIsLoading(false); // Verrà gestito dalla funzione chiamante

    } catch (err) {
      console.error("Errore generale nel flusso di conferma contributo:", err);
      setError("Si è verificato un errore inatteso. Riprova.");
      setIsLoading(false);
    }
  };

  const getPaymentInstructions = () => {
    switch (paymentMethod) {
      case 'paypal':
        return (
          <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle>Istruzioni PayPal</AlertTitle>
            <AlertDescription>
              {paymentDetails.paypal ? (
                <>
                  Puoi inviare il tuo contributo tramite PayPal a: <br />
                  <a href={paymentDetails.paypal.startsWith('http') ? paymentDetails.paypal : `mailto:${paymentDetails.paypal}`} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">
                    {paymentDetails.paypal}
                  </a>
                  <br />Ricorda di specificare "{product.name}" nella causale.
                </>
              ) : (
                "Dettagli PayPal non ancora forniti."
              )}
            </AlertDescription>
          </Alert>
        );
      case 'satispay':
        return (
          <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle>Istruzioni Satispay</AlertTitle>
            <AlertDescription>
              {paymentDetails.satispay && paymentDetails.satispay.link ? ( // Controllo se link esiste
                <>
                  Invia il tuo contributo tramite Satispay a: <br />
                  <a href={paymentDetails.satispay.link} target="_blank" rel="noopener noreferrer" className="font-medium text-pink-600 hover:underline"> {/* Usa il link */}
                    {paymentDetails.satispay.text} {/* Mostra il testo */}
                  </a>
                  <br />Ricorda di specificare "{product.name}" nella causale.
                </>
              ) : (
                "Dettagli Satispay non ancora forniti."
              )}
            </AlertDescription>
          </Alert>
        );
      case 'transfer':
        return (
          <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle>Istruzioni Bonifico Bancario</AlertTitle>
            <AlertDescription>
              {paymentDetails.transfer.iban ? (
                <>
                  Effettua un bonifico bancario con i seguenti dati: <br />
                  IBAN: <span className="font-medium">{paymentDetails.transfer.iban}</span> <br />
                  Intestatario: <span className="font-medium">{paymentDetails.transfer.holder}</span> <br />
                  Causale: <span className="font-medium">{paymentDetails.transfer.reason} - {product.name}</span>
                </>
              ) : (
                "Dettagli per il bonifico non ancora forniti."
              )}
            </AlertDescription>
          </Alert>
        );
      default:
        return null;
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent key={product.id + '-' + paymentMethod} className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Contribuisci per: {product.name}</DialogTitle>
          <DialogDescription>
            Prezzo totale: {product.price.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}.
            Già contribuito: {product.contributedAmount.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}.
            <span className="font-semibold"> Restano: {calculatedRemaining.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="contributorName" className="text-right">
              Nome*
            </Label>
            <Input
              id="contributorName"
              value={contributorName}
              onChange={(e) => setContributorName(e.target.value)}
              className="col-span-3"
              placeholder="Il tuo nome"
              disabled={calculatedRemaining <= 0 || isLoading} // Disabilita anche durante il caricamento
            />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="contributorSurname" className="text-right">
              Cognome*
            </Label>
            <Input
              id="contributorSurname"
              value={contributorSurname}
              onChange={(e) => setContributorSurname(e.target.value)}
              className="col-span-3"
              placeholder="Il tuo cognome"
              disabled={calculatedRemaining <= 0 || isLoading} // Disabilita anche durante il caricamento
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="contributorEmail" className="text-right">
              Email*
            </Label>
            <div className="col-span-3 relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                id="contributorEmail"
                type="email"
                value={contributorEmail}
                onChange={(e) => setContributorEmail(e.target.value)}
                className="pl-10"
                placeholder="latua@email.com"
                disabled={calculatedRemaining <= 0 || isLoading} // Disabilita anche durante il caricamento
                />
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Importo (€)*
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={product.price.toFixed(2)} // Max è il prezzo totale
              value={amount}
              onChange={handleAmountChange}
              className="col-span-3"
              placeholder={`Max ${product.price.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}`}
              disabled={calculatedRemaining <= 0 || isLoading} // Disabilita anche durante il caricamento
            />
          </div>

           <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="message" className="text-right pt-2">
              Messaggio
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="col-span-3"
              rows={3}
              placeholder="Un messaggio per Ilaria e Andrea (opzionale)"
              disabled={calculatedRemaining <= 0 || isLoading} // Disabilita anche durante il caricamento
            />
          </div>


          {error && <p className="text-sm text-red-600 text-center col-span-4">{error}</p>}

          {calculatedRemaining <= 0 ? (
             <Alert variant="default" className="bg-green-50 border-green-200 text-green-700">
               <Terminal className="h-4 w-4" />
               <AlertTitle>Completato!</AlertTitle>
               <AlertDescription>
                 Questo regalo è già stato completato. Grazie a tutti!
               </AlertDescription>
             </Alert>
          ) : (
            getPaymentInstructions()
          )}

           <p className="text-xs text-gray-500 mt-2 text-center">
             {calculatedRemaining > 0 && "Dopo aver cliccato \"Conferma Contributo\", il regalo verrà riservato per te per un breve periodo e riceverai una mail di riepilogo. Potrai quindi procedere con il pagamento usando le istruzioni sopra. L'importo verrà aggiornato manualmente sulla lista una volta ricevuto."}
           </p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}> {/* Disabilita anche durante il caricamento */}
              Annulla
            </Button>
          </DialogClose>
          <Button
             type="button"
             onClick={handleConfirm}
             disabled={
                isLoading ||
                !amount ||
                parseFloat(amount.toString()) <= 0 ||
                calculatedRemaining <= 0 ||
                !contributorName.trim() ||
                !contributorSurname.trim() ||
                !contributorEmail.trim() ||
                !isValidEmail(contributorEmail)
            }
           >
            {isLoading ? 'Confermando...' : 'Conferma Contributo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContributionModal;