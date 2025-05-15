import { useEffect, useState, useMemo, useRef } from 'react';
import ProductCard from '@/components/ProductCard';
import ContributionModal from '@/components/ContributionModal';
import ProductDetailModal from '@/components/ProductDetailModal';
import ShareButtons from '@/components/ShareButtons'; // Importa il componente ShareButtons
import { Product } from '@/types/product';
import { Baby, Heart, ArrowDownUp, Filter } from 'lucide-react';
import { showSuccess, showError as showErrorToast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils'; // Importa la funzione cn
import { format } from 'date-fns'; // Importa solo format
import { it } from 'date-fns/locale'; // Importa la locale italiana


type PaymentMethod = 'paypal' | 'satispay' | 'transfer';
type SortCriteria = 'name' | 'price' | 'createdAt' | 'priority'; // Aggiunto 'priority'
type SortDirection = 'asc' | 'desc';

// Rimosso: Funzione per calcolare la differenza in mesi, giorni, ore, minuti, secondi
// const calculateTimeLeft = (targetDate: Date) => {
//   const now = new Date();
//   let totalSeconds = differenceInSeconds(targetDate, now);

//   if (totalSeconds <= 0) {
//     return { months: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isFinished: true };
//   }

//   const secondsInMinute = 60;
//   const secondsInHour = secondsInMinute * 60;
//   const secondsInDay = secondsInHour * 24;
//   const secondsInMonth = secondsInDay * 30.44; // Media giorni in un mese

//   const months = Math.floor(totalSeconds / secondsInMonth);
//   totalSeconds -= months * secondsInMonth;

//   const days = Math.floor(totalSeconds / secondsInDay);
//   totalSeconds -= days / secondsInDay;

//   const hours = Math.floor(totalSeconds / secondsInHour);
//   totalSeconds -= hours / secondsInHour;

//   const minutes = Math.floor(totalSeconds / secondsInMinute);
//   totalSeconds -= minutes / secondsInMinute;

//   const seconds = Math.floor(totalSeconds);

//   return { months, days, hours, minutes, seconds, isFinished: true };
// };


const Index = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contributionModalState, setContributionModalState] = useState<{
    isOpen: boolean;
    product: Product | null;
    paymentMethod: PaymentMethod | null;
  }>({ isOpen: false, product: null, paymentMethod: null });

  const [detailModalState, setDetailModalState] = useState<{
    isOpen: boolean;
    product: Product | null;
  }>({ isOpen: false, product: null });

  const [sortCriteria, setSortCriteria] = useState<SortCriteria>('priority'); // Ordina per priorità di default
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc'); // Priorità in ordine decrescente (prima i prioritari)

  // Data presunta del parto (19 Gennaio 2026) - Mantenuta per visualizzare solo la data
  const estimatedDueDate = new Date(2026, 0, 19, 0, 0, 0); // Mese 0 = Gennaio

  // Rimosso: Stato e useEffect per il countdown
  // const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(estimatedDueDate));
  // useEffect(() => {
  //   const timer = setInterval(() => {
  //     setTimeLeft(calculateTimeLeft(estimatedDueDate));
  //   }, 1000);
  //   if (timeLeft.isFinished) {
  //     clearInterval(timer);
  //   }
  //   return () => clearInterval(timer);
  // }, [estimatedDueDate, timeLeft.isFinished]);


  const paymentDetails = {
    paypal: 'https://paypal.me/andreaesse',
    satispay: { // Modificato per includere testo e link
      text: 'Andrea Savarese / 3496683055',
      link: 'https://www.satispay.com/app/match/link/user/S6Y-CON--81E65BA2-CA54-43C0-A81C-360988ABDB7C',
    },
    transfer: {
      iban: 'IT05T0347501605CC0011883024',
      holder: 'Andrea Savarese e Ilaria Beatrice Leoncino',
      reason: 'Lista Nascita',
    },
  };

  // Funzione per recuperare i prodotti, esclusi i campi di prenotazione
  const fetchProducts = async () => {
     setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('products')
        .select('*, image_urls, is_priority') // Rimosso reserved_by_email, reserved_until
        .order('created_at', { ascending: false });

      if (supabaseError) throw supabaseError;

      const formattedProducts = data?.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        imageUrl: item.image_url,
        imageUrls: item.image_urls || [],
        contributedAmount: item.contributed_amount,
        category: item.category,
        originalUrl: item.original_url,
        createdAt: item.created_at,
        isPriority: item.is_priority,
        // Rimosso mapping per reserved_by_email, reserved_until
        // reservedByEmail: item.reserved_by_email,
        // reservedUntil: item.reserved_until,
      })) || [];

      // Aggiorna lo stato locale solo se ci sono dati validi
      if (formattedProducts) {
         setProducts(formattedProducts);
      }


    } catch (err: any) {
      console.error("Errore nel caricamento prodotti:", err);
      setError("Impossibile caricare i prodotti. Riprova più tardi.");
      showErrorToast("Errore nel caricamento dei prodotti.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();

    // Rimosso: Intervallo per rifetchare i prodotti periodicamente (non serve più per le prenotazioni)
    // const intervalId = setInterval(fetchProducts, 60000); // Aggiorna ogni 60 secondi
    // return () => clearInterval(intervalId);

  }, []); // Dipendenze vuote per eseguire solo al mount/unmount


  const handleOpenContributeModal = (product: Product, method: PaymentMethod) => {
     // Controlla solo se è completato
     const isCompleted = product.contributedAmount >= product.price;
     // Rimosso controllo isReserved

     if (isCompleted) {
        showErrorToast("Questo regalo è già stato completato.");
        return;
     }
     // Rimosso controllo isReserved

     // Se non è completato, apri il modale
    setContributionModalState({ isOpen: true, product, paymentMethod: method });
  };

  const handleCloseContributionModal = () => {
    setContributionModalState({ isOpen: false, product: null, paymentMethod: null });
    // Dopo aver chiuso il modale, rifetchiamo i prodotti per assicurarci che lo stato sia aggiornato
    fetchProducts();
  };

  // Questa funzione viene chiamata dal modale DOPO che l'utente clicca "Conferma Contributo"
  // Ora gestisce solo la chiamata alla Edge Function di notifica/aggiornamento DB.
  const handleConfirmContribution = async (
    productId: string,
    amount: number,
    contributorName: string,
    contributorSurname: string,
    contributorEmail: string,
    message: string,
    paymentMethod: 'paypal' | 'satispay' | 'transfer' // Riceve il metodo di pagamento
  ) => {
    const currentProduct = products.find(p => p.id === productId);
    if (!currentProduct) {
      showErrorToast("Errore: Prodotto non trovato.");
      // Non lanciare l'errore, gestiscilo con la toast
      return;
    }

    try {
      // Chiamata alla Edge Function per inviare notifiche e aggiornare DB
      console.log("Tentativo di chiamare la Edge Function per la notifica email e aggiornamento DB...");
      const { error: functionError } = await supabase.functions.invoke('send-contribution-notification', {
        body: {
          productId: productId,
          productName: currentProduct.name,
          contributionAmount: amount,
          contributorName: contributorName,
          contributorSurname: contributorSurname,
          contributorEmail: contributorEmail,
          message: message,
          paymentMethod: paymentMethod, // Passa il metodo di pagamento alla Edge Function
        },
      });

      if (functionError) {
        console.error('Errore chiamata Edge Function send-contribution-notification:', functionError);
        showErrorToast("Errore nell'invio della notifica/aggiornamento. Contatta gli sposi.");
      } else {
        console.log('Chiamata Edge Function send-contribution-notification completata (verifica i log di Supabase).');
        showSuccess(`Contributo di ${amount.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })} registrato! Grazie mille! Riceverai una mail di conferma.`);
      }

    } catch (err: any) {
      console.error("Errore durante la conferma del contributo (chiamata Edge Function):", err);
      showErrorToast("Si è verificato un errore. Riprova.");
    } finally {
       // Chiudi il modale e rifetch i prodotti indipendentemente dal successo della chiamata alla Edge Function
       handleCloseContributionModal();
    }
  };


  const handleOpenDetailModal = (product: Product) => {
    setDetailModalState({ isOpen: true, product });
  };
  const handleCloseDetailModal = () => {
    setDetailModalState({ isOpen: false, product: null });
  };

  const sortedProducts = useMemo(() => {
    let tempProducts = [...products];

    tempProducts.sort((a, b) => {
      // Ordina prima per priorità (prioritari prima)
      if (a.isPriority && !b.isPriority) return -1;
      if (!a.isPriority && b.isPriority) return 1;

      // Poi ordina per stato di completamento (non completati prima)
      const isCompletedA = a.contributedAmount >= a.price;
      const isCompletedB = b.contributedAmount >= b.price;

      if (!isCompletedA && isCompletedB) return -1;
      if (isCompletedA && !isCompletedB) return 1;

      // Rimosso: Ordinamento per stato di prenotazione

      // Infine ordina in base al criterio selezionato
      let comparison = 0;
      if (sortCriteria === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortCriteria === 'price') {
        comparison = a.price - b.price;
      } else if (sortCriteria === 'createdAt') {
        comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      }
      // Se il criterio è 'priority', l'ordinamento è già stato fatto sopra
      else if (sortCriteria === 'priority') {
         comparison = 0;
      }


      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return tempProducts;
  }, [products, sortCriteria, sortDirection]);


  // URL corrente per la condivisione
  const currentUrl = window.location.href;
  const shareTitle = "Lista Nascita di Ilaria & Andrea";
  const shareText = "Scopri la lista nascita di Ilaria & Andrea e contribuisci a un regalo speciale!";


  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 text-gray-700 relative overflow-hidden">
      <header className="py-8 text-center relative z-10 bg-white/30 backdrop-blur-sm mb-4 shadow-sm">
         <div className={cn("inline-flex items-center justify-center p-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg mb-2", loading ? 'opacity-0' : 'animate-fade-in-up')} style={{ animationDelay: '0.1s' }}>
          <Heart className="h-8 w-8 text-pink-400" />
        </div>
        <h1 className={cn("text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-blue-600", loading ? 'opacity-0' : 'animate-fade-in-up')} style={{ animationDelay: '0.2s' }}>
          Ilaria & Andrea
        </h1>
        <p className={cn("mt-2 text-2xl text-gray-600", loading ? 'opacity-0' : 'animate-fade-in-up')} style={{ animationDelay: '0.3s' }}>Vi Presentano</p>

        {/* Icona e testo Figlio/a */}
        <div className={cn("mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white/70 backdrop-blur-sm rounded-lg shadow", loading ? 'opacity-0' : 'animate-fade-in-up')} style={{ animationDelay: '0.4s' }}>
          <Baby className="h-10 w-10 text-blue-500" />
          <p className="text-3xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-pink-500">
            Figlio/a
          </p>
        </div>

        {/* Data Presunta Parto */}
        <p className={cn("mt-4 text-xl font-semibold text-gray-700", loading ? 'opacity-0' : 'animate-fade-in-up')} style={{ animationDelay: '0.5s' }}>
           Data Presunta Parto: {format(estimatedDueDate, 'dd/MM/yyyy', { locale: it })}
        </p>

        {/* Rimosso: Countdown o Messaggio Finale */}
        {/* <div className={cn("mt-4 inline-flex flex-col items-center gap-2 px-4 py-2 bg-white/70 backdrop-blur-sm rounded-lg shadow", loading ? 'opacity-0' : 'animate-fade-in-up')} style={{ animationDelay: '0.6s' }}>
          {timeLeft.isFinished ? (
            <p className="text-3xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-pink-500">
              Finalmente con noi!
            </p>
          ) : (
            <>
              <p className="text-3xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-pink-500 mb-1">
                Al tuo Arrivo
              </p>
              <div className="flex space-x-2 text-gray-100 font-mono text-2xl font-bold">
                 <div className="bg-gray-800 rounded p-1 min-w-[40px] text-center">
                    {String(timeLeft.months).padStart(2, '0')}
                    <div className="text-xs font-normal mt-1">Mesi</div>
                 </div>
                 <div className="bg-gray-800 rounded p-1 min-w-[40px] text-center">
                    {String(timeLeft.days).padStart(2, '0')}
                    <div className="text-xs font-normal mt-1">Giorni</div>
                 </div>
                 <div className="bg-gray-800 rounded p-1 min-w-[40px] text-center">
                    {String(timeLeft.hours).padStart(2, '0')}
                    <div className="text-xs font-normal mt-1">Ore</div>
                 </div>
                 <div className="bg-gray-800 rounded p-1 min-w-[40px] text-center">
                    {String(timeLeft.minutes).padStart(2, '0')}
                    <div className="text-xs font-normal mt-1">Minuti</div>
                 </div>
                 <div className="bg-gray-800 rounded p-1 min-w-[40px] text-center">
                    {String(timeLeft.seconds).padStart(2, '0')}
                    <div className="text-xs font-normal mt-1">Secondi</div>
                 </div>
              </div>
            </>
          )}
        </div> */}
      </header>

      <main className="container mx-auto px-4 py-8 relative z-10">
        <div className={cn("flex flex-col sm:flex-row justify-between items-center mb-10 gap-4", loading ? 'opacity-0' : 'animate-fade-in-up')} style={{ animationDelay: '0.7s' }}>
          <h2 className="text-3xl font-semibold text-gray-700">La Nostra Lista Nascita</h2>
           <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="sort-criteria" className="text-sm font-medium">Ordina per:</Label>
              <Select value={sortCriteria} onValueChange={(value) => setSortCriteria(value as SortCriteria)}>
                <SelectTrigger id="sort-criteria" className="w-[150px] bg-white/80">
                  <SelectValue placeholder="Criterio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority">Priorità</SelectItem> {/* Aggiunto criterio Priorità */}
                  <SelectItem value="createdAt">Più Recenti</SelectItem>
                  <SelectItem value="name">Nome</SelectItem>
                  <SelectItem value="price">Prezzo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')} className="bg-white/80">
              <ArrowDownUp className="h-4 w-4 mr-2" />
              {sortDirection === 'asc' ? 'Cresc.' : 'Decr.'}
            </Button>
          </div>
        </div>

        {/* Pulsanti di condivisione per l'intera lista */}
        <div className={cn("flex justify-center mb-8", loading ? 'opacity-0' : 'animate-fade-in-up')} style={{ animationDelay: '0.8s' }}>
           <ShareButtons title={shareTitle} text={shareText} url={currentUrl} />
        </div>


         {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="flex flex-col space-y-3">
                <Skeleton className="h-[200px] w-full rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        )}
        {error && <p className="text-center text-red-500">{error}</p>}
        {!loading && !error && products.length === 0 && (
          <p className="text-center text-gray-500">Nessun prodotto nella lista al momento.</p>
        )}
        {!loading && !error && sortedProducts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sortedProducts.map((product, index) => (
              <div
                 key={product.id}
                 className={cn(loading ? 'opacity-0' : 'animate-fade-in-up')}
                 style={{ animationDelay: `${0.9 + index * 0.1}s` }} // Ritardo crescente per effetto a cascata
              >
                <ProductCard
                  product={product}
                  onOpenContributeModal={handleOpenContributeModal}
                  onOpenDetailModal={handleOpenDetailModal}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className={cn("py-8 text-center text-gray-500 relative z-10 flex flex-col sm:flex-row justify-center items-center gap-4", loading ? 'opacity-0' : 'animate-fade-in-up')} style={{ animationDelay: `${0.9 + sortedProducts.length * 0.1 + 0.2}s` }}> {/* Ritardo dopo le card */}
        <p>&copy; {new Date().getFullYear()} Ilaria & Andrea. Con amore.</p>
        <Link to="/admin" className="text-sm text-gray-500 hover:text-gray-700 underline">
          Admin
        </Link>
      </footer>

      <ContributionModal
        isOpen={contributionModalState.isOpen}
        onClose={handleCloseContributionModal}
        product={contributionModalState.product}
        paymentMethod={contributionModalState.paymentMethod}
        onConfirmContribution={handleConfirmContribution} // Passa la funzione aggiornata
        paymentDetails={paymentDetails}
      />
      <ProductDetailModal
        isOpen={detailModalState.isOpen}
        onClose={handleCloseDetailModal}
        product={detailModalState.product}
      />
    </div>
  );
};

export default Index;