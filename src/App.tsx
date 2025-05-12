import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
import { SessionContextProvider, useSession } from '@supabase/auth-ui-react'; // Importa SessionContextProvider e useSession
import { supabase } from '@/integrations/supabase/client'; // Importa il client Supabase

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login"; // Importa la pagina Login
import Admin from "./pages/Admin"; // Importa la pagina Admin (verrà creata dopo)

const queryClient = new QueryClient();

// Componente per proteggere le rotte
const ProtectedRoute = () => {
  const session = useSession();
  // Se non c'è sessione attiva, reindirizza alla pagina di login
  // Altrimenti, mostra il contenuto della rotta protetta (tramite Outlet)
  return session ? <Outlet /> : <Navigate to="/login" replace />;
};

const App = () => (
  // 1. Avvolgi l'intera app con SessionContextProvider
  <SessionContextProvider supabaseClient={supabase}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />

            {/* Rotta Admin protetta */}
            <Route element={<ProtectedRoute />}>
              <Route path="/admin" element={<Admin />} />
              {/* Aggiungi qui altre rotte protette se necessario */}
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </SessionContextProvider>
);

export default App;