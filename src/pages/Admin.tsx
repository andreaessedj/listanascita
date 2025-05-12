import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseClient } from '@supabase/auth-ui-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Admin = () => {
  const supabaseClient = useSupabaseClient();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Qui caricheremo i prodotti
    console.log("Pagina Admin caricata");
    setLoading(false);
  }, []);

  const handleLogout = async () => {
    const { error } = await supabaseClient.auth.signOut();
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