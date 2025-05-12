import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@3.4.0"; // Importa Resend SDK

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  console.log("Edge Function 'send-contribution-notification' invoked."); // Log all'inizio

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Attempting to read RESEND_API_KEY secret..."); // Log prima di leggere il secret
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY non trovata nei secret.");
      return new Response(JSON.stringify({ error: "Configurazione del server incompleta." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("RESEND_API_KEY secret read successfully."); // Log dopo aver letto il secret

    const resend = new Resend(RESEND_API_KEY);

    console.log("Attempting to parse request body..."); // Log prima di leggere il body
    const { productName, contributionAmount, contributorName, contributorSurname, message } = await req.json();
    console.log("Request body parsed:", { productName, contributionAmount, contributorName, contributorSurname, message }); // Log dopo aver letto il body

    if (!productName || typeof contributionAmount === 'undefined' || !contributorName || !contributorSurname) {
      console.error("Dati mancanti nel body."); // Log per dati mancanti
      return new Response(JSON.stringify({ error: "Dati mancanti: productName, contributionAmount, contributorName e contributorSurname sono richiesti." }), {
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
      <p>Da: <strong>${contributorName} ${contributorSurname}</strong></p>
      ${message ? `<p>Messaggio: ${message}</p>` : ''} <!-- Includi il messaggio se presente -->
      <p>Controlla la tua lista nascita per i dettagli.</p>
      <br/>
      <p><em>Questo è un messaggio automatico.</em></p>
    `;

    console.log("Attempting to send email via Resend..."); // Log prima di inviare l'email
    const { data, error } = await resend.emails.send({
      from: senderEmail,
      to: recipientEmail,
      subject: subject,
      html: htmlBody,
    });

    if (error) {
      console.error("Errore invio email con Resend:", error); // Log errore Resend
      return new Response(JSON.stringify({ error: "Errore durante l'invio dell'email." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Email inviata con successo:", data); // Log successo invio
    return new Response(JSON.stringify({ message: "Notifica inviata con successo!", emailId: data?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Errore generico nella Edge Function:", e); // Log errore generico
    return new Response(JSON.stringify({ error: e.message || "Errore interno del server." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});