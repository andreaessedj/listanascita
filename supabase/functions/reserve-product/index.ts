import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log("Edge Function 'reserve-product' invoked.");

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Attempting to read environment variables...");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Variabili d'ambiente Supabase mancanti.");
      return new Response(JSON.stringify({ error: "Configurazione del server incompleta (variabili d'ambiente Supabase mancanti)." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("Environment variables read successfully.");

    // Crea un client Supabase con la service role key per bypassare RLS
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log("Attempting to parse request body...");
    const { productId, contributorEmail } = await req.json();
    console.log("Request body parsed:", { productId, contributorEmail });

    if (!productId || !contributorEmail) {
      console.error("Dati mancanti nel body.");
      return new Response(JSON.stringify({ error: "Dati mancanti: productId e contributorEmail sono richiesti." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Verifica disponibilità e prenota ---
    console.log(`Checking availability and attempting to reserve product ${productId}...`);

    // Recupera il prodotto per verificare lo stato attuale
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('price, contributed_amount, reserved_until')
      .eq('id', productId)
      .single();

    if (fetchError || !product) {
      console.error("Errore nel recupero del prodotto:", fetchError?.message);
      return new Response(JSON.stringify({ error: "Prodotto non trovato o errore nel recupero." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Controlla se è già completato
    if (product.contributed_amount >= product.price) {
      console.log(`Product ${productId} is already completed.`);
      return new Response(JSON.stringify({ error: "Questo regalo è già stato completato." }), {
        status: 409, // Conflict
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Controlla se è già riservato e la prenotazione è ancora valida
    const now = new Date();
    const reservedUntil = product.reserved_until ? new Date(product.reserved_until) : null;

    if (reservedUntil && reservedUntil > now) {
      console.log(`Product ${productId} is already reserved until ${reservedUntil}.`);
      return new Response(JSON.stringify({ error: `Questo regalo è già riservato fino al ${reservedUntil.toLocaleString('it-IT')}. Riprova più tardi.` }), {
        status: 409, // Conflict
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Se arriviamo qui, il prodotto è disponibile o la prenotazione è scaduta.
    // Prenota per 30 minuti.
    const reservationDurationMinutes = 30;
    const newReservedUntil = new Date(now.getTime() + reservationDurationMinutes * 60 * 1000);

    const { error: updateError } = await supabase
      .from('products')
      .update({
        reserved_by_email: contributorEmail,
        reserved_until: newReservedUntil.toISOString(), // Salva in formato ISO
      })
      .match({ id: productId });

    if (updateError) {
      console.error("Errore nell'aggiornamento della prenotazione:", updateError.message);
      return new Response(JSON.stringify({ error: "Errore durante la prenotazione del regalo. Riprova." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Product ${productId} reserved successfully by ${contributorEmail} until ${newReservedUntil}.`);

    return new Response(JSON.stringify({
      message: "Regalo prenotato con successo!",
      reservedUntil: newReservedUntil.toISOString(),
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Errore generico nella Edge Function 'reserve-product':", e);
    return new Response(JSON.stringify({ error: e.message || "Errore interno del server durante la prenotazione." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});