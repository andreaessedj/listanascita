import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
// Rimosso useNavigate

const Admin = () => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]); // Stato per i prodotti
  const [error, setError] = useState<string | null>(null);

  // Funzione per caricare i prodotti
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
      setProducts(data || []);
    } catch (err: any) {
      console.error("Errore caricamento prodotti (Admin):", err);
      setError("Impossibile caricare i prodotti.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(); // Carica i prodotti al mount
  }, []);

  // Rimuovi handleLogout

  if (loading) {
    return <div>Caricamento area admin...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center p-4">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestione Lista Nascita</h1>
        {/* Aggiungeremo qui il pulsante "Aggiungi Prodotto" */}
        <Button>Aggiungi Prodotto (WIP)</Button>
      </div>
      <p>Elenco prodotti:</p>
      {/* Qui aggiungeremo la tabella dei prodotti */}
      <pre>{JSON.stringify(products, null, 2)}</pre> {/* Placeholder per vedere i dati */}
    </div>
  );
};

export default Admin;