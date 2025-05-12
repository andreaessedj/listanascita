import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Product } from '@/types/product'; // Importa il tipo Product
import { Pencil, Trash2, PlusCircle } from 'lucide-react'; // Icone per azioni
import { Skeleton } from "@/components/ui/skeleton"; // Per lo stato di caricamento

const Admin = () => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]); // Usa il tipo Product
  const [error, setError] = useState<string | null>(null);

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
      // Mappa i dati assicurandoti che corrispondano al tipo Product
      const formattedProducts = data?.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        imageUrl: item.image_url,
        contributedAmount: item.contributed_amount,
        category: item.category,
        originalUrl: item.original_url // Aggiungi originalUrl se presente
      })) || [];
      setProducts(formattedProducts);
    } catch (err: any) {
      console.error("Errore caricamento prodotti (Admin):", err);
      setError("Impossibile caricare i prodotti.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAddProduct = () => {
    console.log("Aggiungi nuovo prodotto (WIP)");
    // Qui apriremo un modale o un form per aggiungere il prodotto
  };

  const handleEditProduct = (product: Product) => {
    console.log("Modifica prodotto:", product.id, "(WIP)");
    // Qui apriremo un modale o un form per modificare il prodotto
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo prodotto?")) {
      return;
    }
    console.log("Elimina prodotto:", productId, "(WIP)");
    try {
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .match({ id: productId });

      if (deleteError) {
        throw deleteError;
      }
      // Rimuovi il prodotto dallo stato locale per aggiornare la UI
      setProducts(prevProducts => prevProducts.filter(p => p.id !== productId));
      alert("Prodotto eliminato con successo!"); // Sostituire con toast in futuro
    } catch (err: any) {
      console.error("Errore eliminazione prodotto:", err);
      alert("Errore durante l'eliminazione del prodotto."); // Sostituire con toast
    }
  };

  if (error) {
    return <div className="text-red-500 text-center p-4">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestione Lista Nascita</h1>
        <Button onClick={handleAddProduct}>
          <PlusCircle className="mr-2 h-4 w-4" /> Aggiungi Prodotto
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Immagine</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Descrizione</TableHead>
                <TableHead className="text-right">Prezzo (€)</TableHead>
                <TableHead className="text-right">Contribuito (€)</TableHead>
                <TableHead>URL Originale</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nessun prodotto trovato.
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <img
                        src={product.imageUrl || "https://via.placeholder.com/64?text=N/A"}
                        alt={product.name}
                        className="h-16 w-16 object-cover rounded-md bg-gray-100"
                        onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/64?text=Errore")}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {product.description || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {product.price.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      {product.contributedAmount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {product.originalUrl ? (
                        <a
                          href={product.originalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline truncate block max-w-[150px]"
                          title={product.originalUrl}
                        >
                          Link
                        </a>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEditProduct(product)} className="mr-2">
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Modifica</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteProduct(product.id)} className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Elimina</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default Admin;