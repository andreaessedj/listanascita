import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@3.4.0"; // Importa Resend SDK

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Permetti richieste da qualsiasi origine
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Gestione OPTIONS per preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Recupera la API key di Resend dai secret di Supabase
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY non trovata nei secret.");
      return new Response(JSON.stringify({ error: "Configurazione del server incompleta." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(RESEND_API_KEY);

    // Estrai i dati dal corpo della richiesta
    const { productName, contributionAmount, contributorName, contributorEmail } = await req.json();

    if (!productName || typeof contributionAmount === 'undefined') {
      return new Response(JSON.stringify({ error: "Dati mancanti: productName e contributionAmount sono richiesti." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipientEmail = "andreaesse@live.it"; // Email destinatario
    const senderEmail = "onboarding@resend.dev"; // Email mittente (default di Resend, o il tuo dominio verificato)

    const subject = `Nuovo Contributo Ricevuto per ${productName}!`;
    const htmlBody = `
      <h1>🎉 Nuovo Contributo! 🎉</h1>
      <p>Ciao!</p>
      <p>Hai ricevuto un nuovo contributo per il prodotto: <strong>${productName}</strong>.</p>
      <p>Importo del contributo: <strong>€${contributionAmount.toFixed(2)}</strong>.</p>
      ${contributorName ? `<p>Nome del Contribuente: ${contributorName}</p>` : ''}
      ${contributorEmail ? `<p>Email del Contribuente: ${contributorEmail}</p>` : ''}
      <p>Controlla la tua lista nascita per i dettagli.</p>
      <br/>
      <p><em>Questo è un messaggio automatico.</em></p>
    `;

    const { data, error } = await resend.emails.send({
      from: senderEmail,
      to: recipientEmail,
      subject: subject,
      html: htmlBody,
    });

    if (error) {
      console.error("Errore invio email con Resend:", error);
      return new Response(JSON.stringify({ error: "Errore durante l'invio dell'email." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Email inviata con successo:", data);
    return new Response(JSON.stringify({ message: "Notifica inviata con successo!", emailId: data?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Errore generico nella Edge Function:", e);
    return new Response(JSON.stringify({ error: e.message || "Errore interno del server." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});