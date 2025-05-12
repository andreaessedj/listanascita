import { useState, useEffect } from 'react'; // Importa useEffect
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
import { Product } from '@/types/product';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

interface ContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  paymentMethod: 'paypal' | 'satispay' | 'transfer' | null;
  onConfirmContribution: (productId: string, amount: number) => Promise<void>;
  paymentDetails: {
    paypal: string;
    satispay: string;
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!product || !paymentMethod) return null;

  const remainingAmount = product.price - product.contributedAmount;
  // Ensure remainingAmount is not negative if contribution exceeds price slightly due to rounding
  const calculatedRemaining = Math.max(0, remainingAmount);
  const maxContribution = calculatedRemaining > 0 ? calculatedRemaining : product.price;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
       const numericValue = parseFloat(value);
       if (!isNaN(numericValue) && numericValue > maxContribution) {
         // Set to max contribution, ensuring 2 decimal places
         setAmount(maxContribution.toFixed(2));
       } else {
         setAmount(value);
       }
    }
  };

  const handleConfirm = async () => {
    const contributionAmount = parseFloat(amount.toString());
    // Use a small epsilon for floating point comparison
    const epsilon = 0.001;
    if (isNaN(contributionAmount) || contributionAmount <= 0 || contributionAmount > maxContribution + epsilon) {
       setError(`Inserisci un importo valido (massimo ${maxContribution.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}).`);
       return;
    }
    setError(null);
    setIsLoading(true);
    try {
      // Pass the validated, parsed amount
      await onConfirmContribution(product.id, contributionAmount);
    } catch (err) {
      console.error("Errore durante la conferma del contributo:", err);
      setError("Si è verificato un errore durante l'aggiornamento del contributo. Riprova.");
      setIsLoading(false);
    }
  };

  const getPaymentInstructions = () => {
    // ... (codice istruzioni invariato) ...
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
              {paymentDetails.satispay ? (
                <>
                  Invia il tuo contributo tramite Satispay a: <br />
                  <span className="font-medium">{paymentDetails.satispay}</span>
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

  // Reset state when modal opens with a new product/method
  // CORREZIONE: Usare useEffect invece di useState qui
  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen, product, paymentMethod]); // Dipendenze corrette


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
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
            <Label htmlFor="amount" className="text-right">
              Importo (€)
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={maxContribution.toFixed(2)} // Usa toFixed per il valore max nell'input
              value={amount}
              onChange={handleAmountChange}
              className="col-span-3"
              placeholder={`Max ${maxContribution.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}`}
              disabled={calculatedRemaining <= 0} // Disabilita se l'importo è già stato raggiunto
            />
          </div>
          {error && <p className="text-sm text-red-600 text-center col-span-4">{error}</p>}

          {/* Disabilita le istruzioni e il form se il prodotto è completo */}
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
             {calculatedRemaining > 0 && "Dopo aver cliccato \"Conferma Contributo\", procedi con il pagamento usando le istruzioni sopra. L'importo verrà aggiornato manualmente una volta ricevuto."}
           </p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
          </DialogClose>
          {/* Disabilita il pulsante conferma se il prodotto è completo */}
          <Button
             type="button"
             onClick={handleConfirm}
             disabled={isLoading || !amount || parseFloat(amount.toString()) <= 0 || calculatedRemaining <= 0}
           >
            {isLoading ? 'Confermando...' : 'Conferma Contributo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContributionModal;