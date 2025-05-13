import { useEffect, useState, useMemo, useRef } from 'react';
import ProductCard from '@/components/ProductCard';
import ContributionModal from '@/components/ContributionModal';
import ProductDetailModal from '@/components/ProductDetailModal';
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

type PaymentMethod = 'paypal' | 'satispay' | 'transfer';
type SortCriteria = 'name' | 'price' | 'createdAt';
type SortDirection = 'asc' | 'desc';

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

  const [sortCriteria, setSortCriteria] = useState<SortCriteria>('price');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const paymentDetails = {
    paypal: 'https://paypal.me/andreaesse',
    satispay: 'Andrea Savarese / 3496683055',
    transfer: {
      iban: 'IT05T0347501605CC0011883024',
      holder: 'Andrea Savarese e Ilaria Beatrice Leoncino',
      reason: 'Lista Nascita',
    },
  };

  useEffect(() => {
    const fetchProducts = async () => {
       setLoading(true);
      setError(null);
      try {
        const { data, error: supabaseError } = await supabase
          .from('products')
          .select('*, image_urls')
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
    setContributionModalState({ isOpen: true, product, paymentMethod: method });
  };
  const handleCloseContributionModal = () => {
    setContributionModalState({ isOpen: false, product: null, paymentMethod: null });
  };

  const handleConfirmContribution = async (
    productId: string,
    amount: number,
    contributorName: string,
    contributorSurname: string,
    contributorEmail: string, // Accetta contributorEmail
    message: string
  ) => {
    const currentProduct = products.find(p => p.id === productId);
    if (!currentProduct) {
      showErrorToast("Errore: Prodotto non trovato.");
      throw new Error("Product not found");
    }
    const newContributedAmount = Math.round((currentProduct.contributedAmount + amount) * 100) / 100;

    try {
      const { error: updateError } = await supabase
        .from('products')
        .update({ contributed_amount: newContributedAmount })
        .match({ id: productId });

      if (updateError) throw updateError;

      setProducts(prevProducts =>
        prevProducts.map(p =>
          p.id === productId
            ? { ...p, contributedAmount: newContributedAmount }
            : p
        )
      );
      showSuccess(`Contributo di ${amount.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })} registrato! Grazie mille! Riceverai una mail di conferma.`);
      handleCloseContributionModal();

      console.log("Tentativo di chiamare la Edge Function per la notifica email...");
      try {
        const { error: functionError } = await supabase.functions.invoke('send-contribution-notification', {
          body: {
            productName: currentProduct.name,
            contributionAmount: amount,
            contributorName: contributorName,
            contributorSurname: contributorSurname,
            contributorEmail: contributorEmail, // Passa contributorEmail
            message: message,
          },
        });
        if (functionError) {
          console.error('Errore chiamata Edge Function:', functionError);
        } else {
          console.log('Chiamata Edge Function completata (verifica i log di Supabase per l\'invio email).');
        }
      } catch (invokeError) {
        console.error('Errore imprevisto durante la chiamata Edge Function:', invokeError);
      }

    } catch (err: any) {
      console.error("Errore durante la conferma del contributo:", err);
      showErrorToast("Si è verificato un errore durante l'aggiornamento del contributo. Riprova.");
      throw err; // Rilancia l'errore per essere gestito dal chiamante (ContributionModal)
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
      const isCompletedA = a.contributedAmount >= a.price;
      const isCompletedB = b.contributedAmount >= b.price;

      if (!isCompletedA && isCompletedB) return -1;
      if (isCompletedA && !isCompletedB) return 1;

      let comparison = 0;
      if (sortCriteria === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortCriteria === 'price') {
        comparison = a.price - b.price;
      } else if (sortCriteria === 'createdAt') {
        comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return tempProducts;
  }, [products, sortCriteria, sortDirection]);


  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 text-gray-700 relative overflow-hidden">
      <header className="py-8 text-center relative z-10 bg-white/30 backdrop-blur-sm mb-4 shadow-sm">
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

      <main className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-4">
          <h2 className="text-3xl font-semibold text-gray-700">La Nostra Lista Nascita</h2>
           <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="sort-criteria" className="text-sm font-medium">Ordina per:</Label>
              <Select value={sortCriteria} onValueChange={(value) => setSortCriteria(value as SortCriteria)}>
                <SelectTrigger id="sort-criteria" className="w-[150px] bg-white/80">
                  <SelectValue placeholder="Criterio" />
                </SelectTrigger>
                <SelectContent>
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
            {sortedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onOpenContributeModal={handleOpenContributeModal}
                onOpenDetailModal={handleOpenDetailModal}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="py-8 text-center text-gray-500 relative z-10">
        <p>&copy; {new Date().getFullYear()} Ilaria & Andrea. Con amore.</p>
        <Link to="/admin" className="absolute bottom-2 right-4 text-xs text-gray-400 hover:text-gray-600 underline">
          Admin
        </Link>
      </footer>

      <ContributionModal
        isOpen={contributionModalState.isOpen}
        onClose={handleCloseContributionModal}
        product={contributionModalState.product}
        paymentMethod={contributionModalState.paymentMethod}
        onConfirmContribution={handleConfirmContribution}
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