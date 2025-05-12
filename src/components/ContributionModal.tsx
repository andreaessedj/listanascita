import { useState, useEffect } from 'react'; // Assicurati che useEffect sia importato
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
import { Terminal } from "lucide-react";

interface ContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  paymentMethod: 'paypal' | 'satispay' | 'transfer' | null;
  onConfirmContribution: (productId: string, amount: number, contributorName: string, contributorSurname: string, message: string) => Promise<void>;
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
  const [contributorName, setContributorName] = useState('');
  const [contributorSurname, setContributorSurname] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Usa useEffect per resettare lo stato quando il modale si apre con un nuovo prodotto/metodo
  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setContributorName('');
      setContributorSurname('');
      setMessage('');
      setError(null);
      setIsLoading(false);
    }
    // Questo useEffect non ha bisogno di un cleanup specifico in questo caso
  }, [isOpen, product, paymentMethod]); // Dipendenze: si attiva quando isOpen, product o paymentMethod cambiano

  // Early return se il modale non deve essere visibile
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
       if (!isNaN(numericValue) && numericValue > maxContribution) {
         setAmount(maxContribution.toFixed(2));
       } else {
         setAmount(value);
       }
    }
  };

  const handleConfirm = async () => {
    const contributionAmount = parseFloat(amount.toString());
    const epsilon = 0.001;
    if (isNaN(contributionAmount) || contributionAmount <= 0 || contributionAmount > maxContribution + epsilon) {
       setError(`Inserisci un importo valido (massimo ${maxContribution.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}).`);
       return;
    }
    if (!contributorName.trim() || !contributorSurname.trim()) {
        setError("Nome e Cognome sono obbligatori.");
        return;
    }

    setError(null);
    setIsLoading(true);
    try {
      await onConfirmContribution(product.id, contributionAmount, contributorName.trim(), contributorSurname.trim(), message.trim());
    } catch (err) {
      console.error("Errore durante la conferma del contributo:", err);
      setError("Si è verificato un errore durante l'aggiornamento del contributo. Riprova.");
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


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* La key è ancora utile per forzare il remount in alcuni casi, la manteniamo */}
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
          {/* Campi Nome e Cognome */}
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
              disabled={calculatedRemaining <= 0}
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
              disabled={calculatedRemaining <= 0}
            />
          </div>

          {/* Campo Importo */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Importo (€)*
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={maxContribution.toFixed(2)}
              value={amount}
              onChange={handleAmountChange}
              className="col-span-3"
              placeholder={`Max ${maxContribution.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}`}
              disabled={calculatedRemaining <= 0}
            />
          </div>

          {/* Campo Messaggio (Opzionale) */}
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
              disabled={calculatedRemaining <= 0}
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
             {calculatedRemaining > 0 && "Dopo aver cliccato \"Conferma Contributo\", procedi con il pagamento usando le istruzioni sopra. L'importo verrà aggiornato manualmente una volta ricevuto."}
           </p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
          </DialogClose>
          <Button
             type="button"
             onClick={handleConfirm}
             disabled={isLoading || !amount || parseFloat(amount.toString()) <= 0 || calculatedRemaining <= 0 || !contributorName.trim() || !contributorSurname.trim()} // Disabilita se campi obbligatori vuoti
           >
            {isLoading ? 'Confermando...' : 'Conferma Contributo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContributionModal;