import { useState, useEffect } from 'react'; // Aggiungi useState, useEffect
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
// Rimuovi useUser, mantieni SessionContextProvider
import { SessionContextProvider } from '@supabase/auth-ui-react';
import { supabase } from '@/integrations/supabase/client';

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Admin from "./pages/Admin";

const queryClient = new QueryClient();

// Modifica ProtectedRoute per usare lo stato locale isAuthenticated
const ProtectedRoute = ({ isAuthenticated }: { isAuthenticated: boolean }) => {
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

// Componente wrapper per gestire lo stato auth
const AuthManager = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true); // Stato per gestire il caricamento iniziale

  useEffect(() => {
    // Controlla subito la sessione iniziale
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setLoading(false); // Fine caricamento iniziale
    });

    // Ascolta i cambiamenti di stato
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      // Non impostare loading qui, serve solo per il check iniziale
    });

    // Pulisci la sottoscrizione quando il componente viene smontato
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  if (loading) {
    // Mostra uno stato di caricamento mentre si verifica la sessione iniziale
    // Potresti mettere uno spinner o un layout vuoto qui
    return <div>Verifica autenticazione...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        {/* Se l'utente è autenticato, /login reindirizza ad /admin */}
        <Route path="/login" element={isAuthenticated ? <Navigate to="/admin" replace /> : <Login />} />
        {/* Passa isAuthenticated a ProtectedRoute */}
        <Route element={<ProtectedRoute isAuthenticated={isAuthenticated} />}>
          <Route path="/admin" element={<Admin />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

const App = () => (
  // SessionContextProvider è ancora necessario per il componente Auth interno
  <SessionContextProvider supabaseClient={supabase}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {/* Usa il componente AuthManager per gestire le rotte */}
        <AuthManager />
      </TooltipProvider>
    </QueryClientProvider>
  </SessionContextProvider>
);

export default App;