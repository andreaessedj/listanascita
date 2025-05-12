import { useEffect, useState } from 'react';
import ProductCard from '@/components/ProductCard';
import { Product } from '@/types/product';
import { Baby, Heart } from 'lucide-react';
import { showSuccess, showError as showErrorToast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client'; // Importa il client Supabase
import { Skeleton } from "@/components/ui/skeleton"; // Per l'effetto di caricamento

const Index = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        
        // Assicurati che i dati corrispondano al tipo Product
        // Supabase potrebbe restituire nomi di colonna con snake_case
        const formattedProducts = data?.map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          imageUrl: item.image_url, // Mappa image_url
          contributedAmount: item.contributed_amount, // Mappa contributed_amount
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

  const handleContribute = (productId: string, method: string) => {
    console.log(`Contributo per prodotto ${productId} con metodo ${method}`);
    showSuccess(`Hai selezionato ${method} per il prodotto! (Funzionalità in sviluppo)`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 text-gray-700">
      <header className="py-8 text-center">
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
              <ProductCard key={product.id} product={product} onContribute={handleContribute} />
            ))}
          </div>
        )}
      </main>

      <footer className="py-8 text-center text-gray-500">
        <p>&copy; {new Date().getFullYear()} Ilaria & Andrea. Con amore.</p>
      </footer>
    </div>
  );
};

export default Index;