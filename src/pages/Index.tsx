import { useEffect, useState } from 'react';
import ProductCard from '@/components/ProductCard';
import ContributionModal from '@/components/ContributionModal'; // Importa il modale
import { Product } from '@/types/product';
import { Baby, Heart } from 'lucide-react';
import { showSuccess, showError as showErrorToast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from "@/components/ui/skeleton";

type PaymentMethod = 'paypal' | 'satispay' | 'transfer';

const Index = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    product: Product | null;
    paymentMethod: PaymentMethod | null;
  }>({ isOpen: false, product: null, paymentMethod: null });

  // Dettagli di pagamento forniti dall'utente
  const paymentDetails = {
    paypal: 'https://paypal.me/andreaesse',
    satispay: 'Andrea Savarese / 3496683055',
    transfer: {
      iban: 'IT05T0347501605CC0011883024',
      holder: 'Andrea Savarese e Ilaria Beatrice Leoncino',
      reason: 'Lista Nascita', // Il nome del prodotto verrà aggiunto nel modale
    },
  };

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: supabaseError } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        if (supabaseError) {
          throw supabaseError;
        }

        const formattedProducts = data?.map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          imageUrl: item.image_url,
          contributedAmount: item.contributed_amount,
          category: item.category,
        })) || [];
        setProducts(formattedProducts);

      } catch (err: any) {
        console.error("Errore nel caricamento prodotti:", err);
        setError("Impossibile caricare i prodotti. Riprova più tardi.");
        showErrorToast("Errore nel caricamento dei prodotti.");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleOpenContributeModal = (product: Product, method: PaymentMethod) => {
    setModalState({ isOpen: true, product, paymentMethod: method });
  };

  const handleCloseContributeModal = () => {
    setModalState({ isOpen: false, product: null, paymentMethod: null });
  };

  const handleConfirmContribution = async (productId: string, amount: number) => {
    const currentProduct = products.find(p => p.id === productId);
    if (!currentProduct) {
      showErrorToast("Errore: Prodotto non trovato.");
      throw new Error("Product not found");
    }

    // Calcola il nuovo importo contribuito
    // Usiamo Math.round per evitare potenziali problemi con floating point
    const newContributedAmount = Math.round((currentProduct.contributedAmount + amount) * 100) / 100;

    // Aggiorna Supabase
    const { error: updateError } = await supabase
      .from('products')
      .update({ contributed_amount: newContributedAmount })
      .match({ id: productId });

    if (updateError) {
      console.error("Errore aggiornamento Supabase:", updateError);
      showErrorToast("Si è verificato un errore durante l'aggiornamento del contributo. Riprova.");
      throw updateError; // Propaga l'errore al modale per mantenere aperto
    }

    // Aggiorna lo stato locale per un feedback immediato
    setProducts(prevProducts =>
      prevProducts.map(p =>
        p.id === productId
          ? { ...p, contributedAmount: newContributedAmount }
          : p
      )
    );

    showSuccess(`Contributo di ${amount.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })} registrato! Grazie mille!`);
    handleCloseContributeModal(); // Chiudi il modale in caso di successo
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 text-gray-700">
      <header className="py-8 text-center">
        {/* Header content... (invariato) */}
         <div className="inline-flex items-center justify-center p-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg mb-2">
          <Heart className="h-8 w-8 text-pink-400" />
        </div>
        <h1 className="text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-blue-600">
          Ilaria & Andrea
        </h1>
        <p className="mt-2 text-2xl text-gray-600">Vi Presentano</p>
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white/70 backdrop-blur-sm rounded-lg shadow">
          <Baby className="h-10 w-10 text-blue-500" />
          <p className="text-3xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-pink-500">
            Figlio/a
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-semibold text-center mb-10 text-gray-700">La Nostra Lista Nascita</h2>
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
        {!loading && !error && products.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onOpenContributeModal={handleOpenContributeModal} // Passa la funzione per aprire il modale
              />
            ))}
          </div>
        )}
      </main>

      <footer className="py-8 text-center text-gray-500">
        <p>&copy; {new Date().getFullYear()} Ilaria & Andrea. Con amore.</p>
      </footer>

      {/* Renderizza il modale */}
      <ContributionModal
        isOpen={modalState.isOpen}
        onClose={handleCloseContributeModal}
        product={modalState.product}
        paymentMethod={modalState.paymentMethod}
        onConfirmContribution={handleConfirmContribution} // Passa la funzione di conferma
        paymentDetails={paymentDetails} // Passa i dettagli di pagamento
      />
    </div>
  );
};

export default Index;