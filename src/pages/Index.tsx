import { useEffect, useState, useMemo, useRef, useCallback } from 'react'; // Importa useCallback
import ProductCard from '@/components/ProductCard';
import ContributionModal from '@/components/ContributionModal';
import ProductDetailModal from '@/components/ProductDetailModal';
import ShareButtons from '@/components/ShareButtons'; // Importa il componente ShareButtons
import { Product, EmbeddedContribution } from '@/types/product'; // Importa EmbeddedContribution
import { Baby, Heart, ArrowDownUp, Filter, Gift } from 'lucide-react'; // Importa Gift icon
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
import { differenceInSeconds, format } from 'date-fns'; // Importa funzioni per il calcolo del tempo
import { it } from 'date-fns/locale'; // Importa la locale italiana


type PaymentMethod = 'paypal' | 'satispay' | 'transfer';
type SortCriteria = 'name' | 'price' | 'createdAt' | 'priority'; // Aggiunto 'priority'
type SortDirection = 'asc' | 'desc';

// Funzione per calcolare la differenza in mesi, giorni, ore, minuti, secondi
const calculateTimeLeft = (targetDate: Date) => {
  const now = new Date();
  let totalSeconds = differenceInSeconds(targetDate, now);

  if (totalSeconds <= 0) {
    return { months: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isFinished: true };
  }

  const secondsInMinute = 60;
  const secondsInHour = secondsInMinute * 60;
  const secondsInDay = secondsInHour * 24;
  const secondsInMonth = secondsInDay * 30.44; // Media giorni in un mese

  const months = Math.floor(totalSeconds / secondsInMonth);
  totalSeconds -= months * secondsInMonth;

  const days = Math.floor(totalSeconds / secondsInDay);
  totalSeconds -= days / secondsInDay;

  const hours = Math.floor(totalSeconds / secondsInHour);
  totalSeconds -= hours / secondsInHour;

  const minutes = Math.floor(totalSeconds / secondsInMinute);
  totalSeconds -= minutes / secondsInMinute;

  const seconds = Math.floor(totalSeconds);

  return { months, days, hours, minutes, seconds, isFinished: false };
};


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

  // Stato per il suggerimento regalo
  const [suggestedProductId, setSuggestedProductId] = useState<string | null>(null);
  // Ref map per le card dei prodotti
  const productRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  // Data presunta del parto (10 Gennaio 2026)
  const estimatedDueDate = new Date(2025, 11, 24, 0, 0, 0); // Mese 0 = Gennaio

  // Stato e useEffect per il countdown
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(estimatedDueDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(estimatedDueDate));
    }, 1000);

    // Pulisci l'interval quando il componente si smonta o il countdown finisce
    if (timeLeft.isFinished) {
      clearInterval(timer);
    }

    return () => clearInterval(timer);
  }, [estimatedDueDate, timeLeft.isFinished]); // Ricalcola l'effetto se la data o lo stato di fine cambiano


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

  // Funzione per recuperare i prodotti, inclusi gli ultimi contributi
  const fetchProducts = async () => {
     setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('products')
        // Seleziona i contributi senza ordinamento o limite embedded
        .select('*, image_urls, is_priority, contributions(contributor_name, contributor_surname, created_at)')
        .order('created_at', { ascending: false });

      if (supabaseError) throw supabaseError;

      const formattedProducts: Product[] = data?.map(item => ({
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
        contributions: item.contributions || [], // Mappa i contributi embedded
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

    // Pulisci i ref quando il componente si smonta
    return () => productRefs.current.clear();

  }, []); // Dipendenze vuote per eseguire solo al mount/unmount


  const handleOpenContributeModal = (product: Product, method: PaymentMethod) => {
     // Controlla solo se è completato
     const isCompleted = product.contributedAmount >= product.price;

     if (isCompleted) {
        showErrorToast("Questo regalo è già stato completato.");
        return;
     }

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

  // Funzione per suggerire un regalo casuale
  const handleSuggestGift = useCallback(() => {
    const availableProducts = sortedProducts.filter(p => p.contributedAmount < p.price); // Solo prodotti non completati
    if (availableProducts.length === 0) {
      showErrorToast("Tutti i regali sono già stati completati! Grazie a tutti!");
      return;
    }
    const randomIndex = Math.floor(Math.random() * availableProducts.length);
    const suggested = availableProducts[randomIndex];
    setSuggestedProductId(suggested.id);
  }, [products, sortCriteria, sortDirection]); // Dipende da products, sortCriteria, sortDirection


  // Effetto per scrollare al regalo suggerito
  useEffect(() => {
    if (suggestedProductId) {
      const element = productRefs.current.get(suggestedProductId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Opzionale: rimuovi l'ID suggerito dopo lo scroll se non vuoi che rimanga evidenziato
        // setSuggestedProductId(null);
      }
    }
  }, [suggestedProductId]);


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
            Bambus
          </p>
        </div>

        {/* Data Presunta Parto */}
        <p className={cn("mt-4 text-xl font-semibold text-gray-700", loading ? 'opacity-0' : 'animate-fade-in-up')} style={{ animationDelay: '0.5s' }}>
           Data Presunta Parto: {format(estimatedDueDate, 'dd/MM/yyyy', { locale: it })}
        </p>

        {/* Countdown o Messaggio Finale */}
        <div className={cn("mt-4 inline-flex flex-col items-center gap-2 px-4 py-2 bg-white/70 backdrop-blur-sm rounded-lg shadow", loading ? 'opacity-0' : 'animate-fade-in-up')} style={{ animationDelay: '0.6s' }}>
          {timeLeft.isFinished ? (
            <p className="text-3xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-pink-500">
              Finalmente con noi!
            </p>
          ) : (
            <>
              <p className="text-3xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-pink-500 mb-1">
                Al tuo Arrivo
              </p>
              {/* Countdown con testo sfumato e animato */}
              <div className="flex space-x-4 text-gray-800 font-mono text-4xl font-bold"> {/* Aumentato font size e spazio */}
                 <div className="flex flex-col items-center">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-blue-600 bg-[size:200%_auto] animate-gradient-shift">
                      {String(timeLeft.months).padStart(2, '0')}
                    </span>
                    <div className="text-sm font-normal mt-1 text-gray-600">Mesi</div> {/* Aggiustato stile etichetta */}
                 </div>
                 <div className="flex flex-col items-center">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-blue-600 bg-[size:200%_auto] animate-gradient-shift">
                      {String(timeLeft.days).padStart(2, '0')}
                    </span>
                    <div className="text-sm font-normal mt-1 text-gray-600">Giorni</div> {/* Aggiustato stile etichetta */}
                 </div>
                 <div className="flex flex-col items-center">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-blue-600 bg-[size:200%_auto] animate-gradient-shift">
                      {String(timeLeft.hours).padStart(2, '0')}
                    </span>
                    <div className="text-sm font-normal mt-1 text-gray-600">Ore</div> {/* Aggiustato stile etichetta */}
                 </div>
                 <div className="flex flex-col items-center">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-blue-600 bg-[size:200%_auto] animate-gradient-shift">
                      {String(timeLeft.minutes).padStart(2, '0')}
                    </span>
                    
              </div>
            </>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 relative z-10">
        <div className={cn("flex flex-col sm:flex-row justify-between items-center mb-10 gap-4", loading ? 'opacity-0' : 'animate-fade-in-up')} style={{ animationDelay: '0.7s' }}>
          <h2 className="text-3xl font-semibold text-gray-700">La Nostra Lista Nascita</h2>
           <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-end"> {/* Aggiunto flex-wrap e justify */}
            {/* Pulsante Suggerisci Regalo */}
            <Button
              variant="outline"
              onClick={handleSuggestGift}
              disabled={loading || sortedProducts.filter(p => p.contributedAmount < p.price).length === 0} // Disabilita se tutti completati
              className="bg-white/80"
            >
              <Gift className="h-4 w-4 mr-2" /> Suggeriscimi un Regalo
            </Button>
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
                 ref={(el) => { productRefs.current.set(product.id, el); }} // Assegna il ref
                 className={cn(loading ? 'opacity-0' : 'animate-fade-in-up', suggestedProductId === product.id ? 'ring-4 ring-blue-400 ring-opacity-50 transition-all duration-500' : '')} // Aggiungi classe per evidenziare
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
