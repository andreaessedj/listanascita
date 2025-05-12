import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom"; // Rimosso Outlet, Navigate
// Rimosso SessionContextProvider
import { supabase } from '@/integrations/supabase/client'; // Mantenuto per altre interazioni

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
// Rimosso Login
import Admin from "./pages/Admin"; // Pagina Admin ora pubblica

const queryClient = new QueryClient();

// Rimosso ProtectedRoute e AuthManager

const App = () => (
  // Rimosso SessionContextProvider wrapper
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          {/* La rotta Admin è ora pubblica */}
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;