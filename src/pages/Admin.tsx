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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import ProductForm, { ProductFormData } from '@/components/admin/ProductForm'; // Importa ProductForm
import { Product } from '@/types/product';
import { Pencil, Trash2, PlusCircle } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { showError, showSuccess } from '@/utils/toast'; // Per notifiche

const Admin = () => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (supabaseError) throw supabaseError;
      const formattedProducts = data?.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        imageUrl: item.image_url,
        contributedAmount: item.contributed_amount,
        category: item.category,
        originalUrl: item.original_url
      })) || [];
      setProducts(formattedProducts);
    } catch (err: any) {
      console.error("Errore caricamento prodotti (Admin):", err);
      setError("Impossibile caricare i prodotti.");
      showError("Impossibile caricare i prodotti.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null); // Resetta il prodotto in modifica
  };

  const handleSaveProduct = async (formData: ProductFormData) => {
    setFormLoading(true);
    try {
      const productDataToSave = {
        name: formData.name,
        description: formData.description,
        price: formData.price,
        image_url: formData.imageUrl, // Supabase usa snake_case
        original_url: formData.originalUrl,
        category: formData.category,
        // contributed_amount non viene gestito qui
      };

      if (editingProduct) {
        // Update
        const { error: updateError } = await supabase
          .from('products')
          .update(productDataToSave)
          .match({ id: editingProduct.id });
        if (updateError) throw updateError;
        showSuccess('Prodotto aggiornato con successo!');
      } else {
        // Insert
        const { error: insertError } = await supabase
          .from('products')
          .insert([productDataToSave]); // insert si aspetta un array
        if (insertError) throw insertError;
        showSuccess('Prodotto aggiunto con successo!');
      }
      await fetchProducts(); // Ricarica i prodotti
      handleCloseModal();
    } catch (err: any) {
      console.error("Errore salvataggio prodotto:", err);
      showError(`Errore durante il salvataggio: ${err.message || 'Errore sconosciuto'}`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo prodotto?")) return;
    try {
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .match({ id: productId });
      if (deleteError) throw deleteError;
      setProducts(prevProducts => prevProducts.filter(p => p.id !== productId));
      showSuccess("Prodotto eliminato con successo!");
    } catch (err: any) {
      console.error("Errore eliminazione prodotto:", err);
      showError(`Errore durante l'eliminazione: ${err.message || 'Errore sconosciuto'}`);
    }
  };

  if (error && !loading) { // Mostra errore solo se non sta caricando per evitare flash
    return <div className="text-red-500 text-center p-4">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestione Lista Nascita</h1>
        <Button onClick={handleOpenAddModal}>
          <PlusCircle className="mr-2 h-4 w-4" /> Aggiungi Prodotto
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Immagine</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Descrizione</TableHead>
                <TableHead className="text-right">Prezzo (€)</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Contribuito (€)</TableHead>
                <TableHead className="hidden lg:table-cell">URL Originale</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                    Nessun prodotto trovato. Clicca su "Aggiungi Prodotto" per iniziare.
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <img
                        src={product.imageUrl || "https://via.placeholder.com/64?text=N/A"}
                        alt={product.name}
                        className="h-12 w-12 object-cover rounded-md bg-gray-100"
                        onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/64?text=Err")}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate hidden md:table-cell">
                      {product.description || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {product.price.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right hidden sm:table-cell">
                      {product.contributedAmount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
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
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEditModal(product)} className="mr-1">
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

      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Modifica Prodotto' : 'Aggiungi Nuovo Prodotto'}</DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Modifica i dettagli del prodotto.' : 'Inserisci i dettagli del nuovo prodotto.'}
            </DialogDescription>
          </DialogHeader>
          <ProductForm
            initialData={editingProduct}
            onSubmit={handleSaveProduct}
            onCancel={handleCloseModal}
            isLoading={formLoading}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;