import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client'; // Importa il client direttamente
// Rimuovi useSupabaseClient
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Admin = () => {
  // Rimuovi supabaseClient = useSupabaseClient();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Qui caricheremo i prodotti
    console.log("Pagina Admin caricata");
    setLoading(false);
  }, []);

  const handleLogout = async () => {
    // Usa l'istanza supabase importata
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Errore durante il logout:', error);
    } else {
      navigate('/login'); // Reindirizza al login dopo il logout
    }
  };

  if (loading) {
    return <div>Caricamento area admin...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestione Lista Nascita</h1>
        <Button onClick={handleLogout} variant="outline">Logout</Button>
      </div>
      <p>Contenuto della pagina di amministrazione (in costruzione)...</p>
      {/* Qui aggiungeremo la tabella e i form per i prodotti */}
    </div>
  );
};

export default Admin;