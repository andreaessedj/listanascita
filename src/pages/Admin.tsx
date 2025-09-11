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
} from '@/components/ui/dialog';
import ProductForm, { ProductFormData } from '@/components/admin/ProductForm';
import BulkEmailModal from '@/components/admin/BulkEmailModal'; // Importa il nuovo modale
import SingleEmailModal from '@/components/admin/SingleEmailModal';
import { Product } from '@/types/product';
import { Skeleton } from "@/components/ui/skeleton";
import { showError, showSuccess } from '@/utils/toast';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Link } from 'react-router-dom';

// Definisci il tipo per i contributi
interface Contribution {
  id: string;
  product_id: string;
  amount: number;
  contributor_name: string;
  contributor_surname: string;
  contributor_email: string;
  message?: string;
  created_at: string;
}

const Admin = () => {
  const [loading, setLoading] = useState(true);
  // Stato per email singola
  const [isSingleEmailOpen, setIsSingleEmailOpen] = useState(false);
  const [isSendingSingleEmail, setIsSendingSingleEmail] = useState(false);
  const [singleRecipients, setSingleRecipients] = useState<{ email: string; name?: string | null }[]>([]);

  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [isContributionsModalOpen, setIsContributionsModalOpen] = useState(false);
  const [selectedProductContributions, setSelectedProductContributions] = useState<Contribution[]>([]);
  const [contributionsLoading, setContributionsLoading] = useState(false);
  const [contributionsError, setContributionsError] = useState<string | null>(null);

  // Stati per le statistiche
  const [totalPrice, setTotalPrice] = useState(0);
  const [totalContributed, setTotalContributed] = useState(0);
  const [totalRemaining, setTotalRemaining] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [completedProducts, setCompletedProducts] = useState(0);

  const [isExportingEmails, setIsExportingEmails] = useState(false); // Stato per il loading dell'esportazione

  // Stato per il modale email massive
  const [isBulkEmailModalOpen, setIsBulkEmailModalOpen] = useState(false);
  const [isSendingBulkEmail, setIsSendingBulkEmail] = useState(false);


  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('products')
        .select('*, image_urls, is_priority')
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
      })) || [];

      setProducts(formattedProducts);

      // Calcola le statistiche
      const total = formattedProducts.reduce((sum, p) => sum + p.price, 0);
      const contributed = formattedProducts.reduce((sum, p) => sum + p.contributedAmount, 0);
      const remaining = total - contributed;
      const completed = formattedProducts.filter(p => p.contributedAmount >= p.price).length;

      setTotalPrice(total);
      setTotalContributed(contributed);
      setTotalRemaining(remaining);
      setTotalProducts(formattedProducts.length);
      setCompletedProducts(completed);

    } catch (err: any) {
      console.error("Errore caricamento prodotti (Admin):", err);
      setError("Impossibile caricare i prodotti.");
      showError("Impossibile caricare i prodotti.");
    } finally {
      setLoading(false);
    }
  };

  // Funzione per recuperare i contributi per un prodotto specifico
  const fetchContributionsForProduct = async (productId: string) => {
    setContributionsLoading(true);
    setContributionsError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('contributions')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: true });

      if (supabaseError) throw supabaseError;

      setSelectedProductContributions(data || []);
      setIsContributionsModalOpen(true); // Apri il modale dopo aver caricato i dati

    } catch (err: any) {
      console.error(`Errore caricamento contributi per prodotto ${productId}:`, err);
      setContributionsError("Impossibile caricare lo storico dei contributi.");
      showError("Impossibile caricare lo storico dei contributi.");
    } finally {
      setContributionsLoading(false);
    }
  };

  // Funzione per esportare le email
  const handleExportEmails = async () => {
    setIsExportingEmails(true);
    try {
      // Recupera tutte le email uniche dalla tabella 'contributions'
      const { data, error: supabaseError } = await supabase
        .from('contributions')
        .select('contributor_email');

      if (supabaseError) throw supabaseError;

      if (!data || data.length === 0) {
        showError("Nessuna email di contribuente trovata.");
        setIsExportingEmails(false);
        return;
      }

      // Estrai le email e rimuovi i duplicati
      const emails = data.map(item => item.contributor_email).filter(email => email); // Filtra eventuali null/undefined
      const uniqueEmails = Array.from(new Set(emails));

      // Formatta le email (una per riga)
      const emailList = uniqueEmails.join('\n');

      // Crea un Blob e un URL per il download
      const blob = new Blob([emailList], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);

      // Crea un link nascosto e simula il click per scaricare il file
      const a = document.createElement('a');
      a.href = url;
      a.download = 'contributor_emails.txt';
      document.body.appendChild(a);
      a.click();

      // Pulisci l'URL temporaneo e l'elemento link
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSuccess(`Esportate ${uniqueEmails.length} email uniche.`);

    } catch (err: any) {
      console.error("Errore durante l'esportazione delle email:", err);
      showError(`Errore durante l'esportazione: ${err.message || 'Errore sconosciuto'}`);
    } finally {
      setIsExportingEmails(false);
    }
  };

  
  // Carica elenco destinatari (email uniche) dai contributi
  const fetchSingleRecipients = async () => {
    try {
      const { data, error } = await supabase
        .from('contributions')
        .select('contributor_email, contributor_name, contributor_surname')
        .not('contributor_email', 'is', null);

      if (error) {
        console.error("Errore caricamento destinatari:", error);
        showError("Impossibile caricare i destinatari.");
        return;
      }

      const mapped = (data || []).filter((r: any) => r.contributor_email).map((r: any) => ({
        email: String(r.contributor_email).trim(),
        name: [r.contributor_name, r.contributor_surname].filter(Boolean).join(' ').trim() || null
      }));

      setSingleRecipients(mapped);
    } catch (e: any) {
      console.error("Errore inatteso nel caricamento destinatari:", e);
      showError("Errore inatteso nel caricamento dei destinatari.");
    }
  };

  const handleOpenSingleEmail = async () => {
    await fetchSingleRecipients();
    setIsSingleEmailOpen(true);
  };

  const handleCloseSingleEmail = () => setIsSingleEmailOpen(false);

  const handleSendSingleEmail = async ({ subject, body, recipients }: { subject: string; body: string; recipients: string[] }) => {
    console.log('DEBUG single email recipients:', recipients);
    setIsSendingSingleEmail(true);
    try {
      // Riutilizza la stessa Edge Function del bulk ma passando un override "recipients"
      const { data, error: functionError } = await supabase.functions.invoke('send-email-single', { body: { subject, body, recipients } });

      if (functionError) {
        console.error('Errore chiamata Edge Function send-bulk-email (singolo):', functionError);
        showError(`Errore durante l'invio dell'email: ${functionError.message || 'Errore sconosciuto'}`);
      } else {
        // @ts-ignore
        const message = data?.message || "Email inviata con successo!";
        showSuccess(message);
        setIsSingleEmailOpen(false);
      }
    } catch (err: any) {
      console.error("Errore generale durante l'invio dell'email singola:", err);
      showError(`Si è verificato un errore inatteso: ${err.message || 'Errore sconosciuto'}`);
    } finally {
      setIsSendingSingleEmail(false);
    }
  };

  // Funzioni per gestire il modale email massive
  const handleOpenBulkEmailModal = () => {
    setIsBulkEmailModalOpen(true);
  };

  const handleCloseBulkEmailModal = () => {
    setIsBulkEmailModalOpen(false);
  };

  const handleSendBulkEmail = async (subject: string, body: string) => {
    setIsSendingBulkEmail(true);
    try {
      console.log("Chiamata Edge Function 'send-bulk-email'...");
      const { data, error: functionError } = await supabase.functions.invoke('send-bulk-email', {
        body: { subject, body },
      });

      if (functionError) {
        console.error('Errore chiamata Edge Function send-bulk-email:', functionError);
        showError(`Errore durante l'invio dell'email: ${functionError.message || 'Errore sconosciuto'}`);
      } else {
        console.log('Chiamata Edge Function send-bulk-email completata:', data);
        showSuccess("Email inviata con successo a tutti i contribuenti!");
        handleCloseBulkEmailModal(); // Chiudi il modale solo in caso di successo
      }

    } catch (err: any) {
      console.error("Errore generale durante l'invio dell'email massiva:", err);
      showError(`Si è verificato un errore inatteso: ${err.message || 'Errore sconosciuto'}`);
    } finally {
      setIsSendingBulkEmail(false);
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
    setEditingProduct(null);
  };

  const handleCloseContributionsModal = () => {
    setIsContributionsModalOpen(false);
    setSelectedProductContributions([]);
    setContributionsError(null);
  };


  const handleSaveProduct = async (formData: ProductFormData) => {
    setFormLoading(true);
    try {
      const additionalUrls = (formData.additionalImageUrlsText || '')
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0 && url.startsWith('http'));

      const allImageUrls = [
        ...(formData.imageUrl ? [formData.imageUrl.trim()] : []),
        ...additionalUrls
      ];
      const uniqueImageUrls = Array.from(new Set(allImageUrls));

      // Dati comuni per insert e update
      const commonData = {
        name: formData.name,
        description: formData.description,
        price: formData.price,
        image_url: formData.imageUrl?.trim() || null,
        image_urls: uniqueImageUrls.length > 0 ? uniqueImageUrls : null,
        original_url: formData.originalUrl?.trim() || null,
        category: formData.category?.trim() || null,
        is_priority: formData.isPriority, // Aggiungi is_priority
      };


      if (editingProduct) {
        // Update: includi contributed_amount
        const productDataToUpdate = {
          ...commonData,
          contributed_amount: formData.contributedAmount, // Aggiungi contributed_amount
        };
        const { error: updateError } = await supabase
          .from('products')
          .update(productDataToUpdate)
          .match({ id: editingProduct.id });
        if (updateError) throw updateError;
        showSuccess('Prodotto aggiornato con successo!');
      } else {
        // Insert: contributed_amount sarà 0 di default nel DB
         const productDataToInsert = {
          ...commonData,
          // Non specificare contributed_amount, userà il default 0
        };
        const { error: insertError } = await supabase
          .from('products')
          .insert([productDataToInsert]);
        if (insertError) throw insertError;
        showSuccess('Prodotto aggiunto con successo!');
      }
      await fetchProducts();
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

  if (error && !loading) {
    return <div className="text-red-500 text-center p-4">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4"> {/* Aggiunto gap */}
        <h1 className="text-3xl font-bold">Gestione Lista Nascita</h1>
        <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end"> {/* Contenitore per i pulsanti */}
           <Link to="/"> {/* Link alla pagina principale */}
             <Button >
               <span className="mr-2">🏠</span> Torna alla Lista
             </Button>
           </Link>
           {/* Nuovo pulsante per inviare email massive */}
           <Button onClick={handleOpenBulkEmailModal} disabled={loading}>
             <span className="mr-2">✉️</span> Invia Email Generale
           </Button>
           <Button onClick={handleOpenSingleEmail} disabled={loading}>
             Invia Email Singola
           </Button>
           {/* Pulsante per esportare le email */}
           <Button onClick={handleExportEmails} disabled={isExportingEmails || loading}>
             {isExportingEmails ? 'Esportazione...' : (
               <>
                 <span className="mr-2">✉️</span> Esporta Email Contribuenti
               </>
             )}
           </Button>
           <Button onClick={handleOpenAddModal}>
             <span className="mr-2">➕</span> Aggiungi Prodotto
           </Button>
        </div>
      </div>

      {/* Sezione Statistiche */}
      {loading ? (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
           {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valore Totale Lista</CardTitle>
              <span className="mr-2">€</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPrice.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</div>
              <p className="text-xs text-muted-foreground">{totalProducts} regali totali</p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totale Contribuito</CardTitle>
              <span className="mr-2">🎁</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{totalContributed.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</div>
              <p className="text-xs text-muted-foreground">{completedProducts} regali completati</p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totale Rimanente</CardTitle>
              <span className="mr-2">📦</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{totalRemaining.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</div>
            </CardContent>
          </Card>
        </div>
      )}


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
                <TableHead className="text-center">Priorità</TableHead>
                <TableHead className="hidden lg:table-cell">URL Originale</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground h-24">
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
                    {/* Cella Priorità */}
                    <TableCell className="text-center">
                      {product.isPriority ? <span className="mr-2">⭐</span> : '-'}
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
                       {/* Pulsante per vedere i contributi */}
                       <Button onClick={() => fetchContributionsForProduct(product.id)} className="mr-1">
                         <span className="mr-2">👁️</span>
                         <span className="sr-only">Vedi Contributi</span>
                       </Button>
                      <Button onClick={() => handleOpenEditModal(product)} className="mr-1">
                        <span className="mr-2">✏️</span>
                        <span className="sr-only">Modifica</span>
                      </Button>
                      <Button onClick={() => handleDeleteProduct(product.id)} className="text-red-600 hover:text-red-700">
                        <span className="mr-2">🗑️</span>
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

      {/* Modale Aggiungi/Modifica Prodotto */}
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

      {/* Modale Storico Contributi */}
      <Dialog open={isContributionsModalOpen} onOpenChange={(open) => !open && handleCloseContributionsModal()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Storico Contributi</DialogTitle>
            <DialogDescription>
              Elenco dei contributi ricevuti per questo prodotto.
            </DialogDescription>
          </DialogHeader>
          {contributionsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : contributionsError ? (
            <p className="text-red-500">{contributionsError}</p>
          ) : selectedProductContributions.length === 0 ? (
            <p className="text-center text-muted-foreground">Nessun contributo registrato per questo prodotto.</p>
          ) : (
            <div className="space-y-4">
              {selectedProductContributions.map(contribution => (
                <div key={contribution.id} className="border rounded-md p-3 text-sm bg-gray-50">
                  <p><strong>Importo:</strong> {contribution.amount.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</p>
                  <p><strong>Da:</strong> {contribution.contributor_name} {contribution.contributor_surname}</p>
                  <p><strong>Email:</strong> {contribution.contributor_email}</p>
                  {contribution.message && <p><strong>Messaggio:</strong> {contribution.message}</p>}
                  <p className="text-xs text-gray-500 mt-1">
                    Contribuito il: {new Date(contribution.created_at).toLocaleString('it-IT')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modale Email Singola */}
      <SingleEmailModal
        isOpen={isSingleEmailOpen}
        onClose={handleCloseSingleEmail}
        recipients={singleRecipients}
        onSend={handleSendSingleEmail}
        isLoading={isSendingSingleEmail}
      />

      {/* Modale Email Massive */}
      <BulkEmailModal
        isOpen={isBulkEmailModalOpen}
        onClose={handleCloseBulkEmailModal}
        onSend={handleSendBulkEmail}
        isLoading={isSendingBulkEmail}
      />
    </div>
  );
};

export default Admin;