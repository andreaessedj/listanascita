import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// Log che dovrebbe apparire quando lo script della funzione viene caricato/inizializzato da Deno.
// Potrebbe non apparire ad ogni invocazione se il container viene riutilizzato.
console.log(`[${new Date().toISOString()}] SCRIPT CARICATO: send-contribution-notification`);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Questo è il log PIÙ IMPORTANTE. Se non appare, il gestore 'serve' non viene nemmeno eseguito.
  console.log(`[${new Date().toISOString()}] INVOCATA: send-contribution-notification, Metodo: ${req.method}`);

  if (req.method === 'OPTIONS') {
    console.log(`[${new Date().toISOString()}] Gestione richiesta OPTIONS.`);
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let requestBodyInfo = "Nessun corpo o non JSON";
    try {
      const body = await req.json();
      requestBodyInfo = JSON.stringify(body);
      console.log(`[${new Date().toISOString()}] Corpo richiesta (JSON):`, requestBodyInfo);
    } catch (parseError) {
      console.warn(`[${new Date().toISOString()}] Impossibile fare il parsing del corpo come JSON:`, parseError.message);
      try {
        requestBodyInfo = await req.text();
        console.log(`[${new Date().toISOString()}] Corpo richiesta (TEXT):`, requestBodyInfo);
      } catch (textError) {
         console.warn(`[${new Date().toISOString()}] Impossibile leggere il corpo come testo:`, textError.message);
      }
    }

    console.log(`[${new Date().toISOString()}] Invio risposta 200 OK dalla funzione semplificata.`);
    return new Response(
      JSON.stringify({
        message: "Test Funzione Semplificata: Successo!",
        timestamp: new Date().toISOString(),
        bodyRicevuto: requestBodyInfo
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error(`[${new Date().toISOString()}] ERRORE CRITICO nella funzione semplificata:`, e.toString(), e.stack);
    return new Response(
      JSON.stringify({
        error: "Test Funzione Semplificata: Errore Critico",
        dettagli: e.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});