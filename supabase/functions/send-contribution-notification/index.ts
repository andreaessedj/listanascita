import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@3.4.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const isValidEmailFn = (email: string): boolean => {
  if (!email) return false;
  // Semplice regex per validazione email
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

serve(async (req) => {
  console.log("Edge Function 'send-contribution-notification' invoked.");

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Attempting to read RESEND_API_KEY secret...");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY non trovata nei secret.");
      return new Response(JSON.stringify({ error: "Configurazione del server incompleta." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("RESEND_API_KEY secret read successfully.");

    const resend = new Resend(RESEND_API_KEY);

    console.log("Attempting to parse request body...");
    const {
        productName,
        contributionAmount,
        contributorName,
        contributorSurname,
        contributorEmail, // Nuovo campo
        message
    } = await req.json();
    console.log("Request body parsed:", { productName, contributionAmount, contributorName, contributorSurname, contributorEmail, message });

    if (!productName || typeof contributionAmount === 'undefined' || !contributorName || !contributorSurname || !contributorEmail) {
      console.error("Dati mancanti nel body. productName, contributionAmount, contributorName, contributorSurname, contributorEmail sono richiesti.");
      return new Response(JSON.stringify({ error: "Dati mancanti: productName, contributionAmount, contributorName, contributorSurname e contributorEmail sono richiesti." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isValidEmailFn(contributorEmail)) {
        console.error("Indirizzo email del contributore non valido:", contributorEmail);
        return new Response(JSON.stringify({ error: "Indirizzo email del contributore non valido." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const adminRecipientEmail = "andreaesse@live.it";
    const senderEmail = "onboarding@resend.dev"; // O il tuo dominio verificato

    // 1. Email di notifica agli admin (Ilaria & Andrea)
    const adminSubject = `Nuovo Contributo Ricevuto per ${productName}!`;
    const adminHtmlBody = `
      <h1>🎉 Nuovo Contributo! 🎉</h1>
      <p>Ciao!</p>
      <p>Hai ricevuto un nuovo contributo per il prodotto: <strong>${productName}</strong>.</p>
      <p>Importo del contributo: <strong>€${contributionAmount.toFixed(2)}</strong>.</p>
      <p>Da: <strong>${contributorName} ${contributorSurname}</strong> (Email: ${contributorEmail})</p>
      ${message ? `<p>Messaggio: ${message}</p>` : ''}
      <p>Controlla la tua lista nascita per i dettagli.</p>
      <br/>
      <p><em>Questo è un messaggio automatico.</em></p>
    `;

    console.log("Attempting to send notification email to admin via Resend...");
    const { data: adminEmailData, error: adminEmailError } = await resend.emails.send({
      from: senderEmail,
      to: adminRecipientEmail,
      subject: adminSubject,
      html: adminHtmlBody,
    });

    if (adminEmailError) {
      console.error("Errore invio email di notifica admin con Resend:", adminEmailError);
      // Non bloccare l'intera funzione se fallisce solo l'email admin, ma logga l'errore
    } else {
      console.log("Email di notifica admin inviata con successo:", adminEmailData);
    }

    // 2. Email di ringraziamento al contributore
    const contributorSubject = `Grazie per il tuo contributo per ${productName}!`;
    const contributorHtmlBody = `
      <h1>💖 Grazie per il tuo contributo, ${contributorName}! 💖</h1>
      <p>Ciao ${contributorName} ${contributorSurname},</p>
      <p>Volevamo ringraziarti di cuore per il tuo generoso contributo di <strong>€${contributionAmount.toFixed(2)}</strong> per il regalo: <strong>${productName}</strong>.</p>
      <p>Il tuo pensiero è molto apprezzato!</p>
      ${message ? `<p>Il tuo messaggio per noi: "${message}"</p>` : ''}
      <p>Ti ricordiamo che questo è un sistema di registrazione del contributo. Per completare il regalo, segui le istruzioni di pagamento che hai visualizzato (PayPal, Satispay o Bonifico).</p>
      <p>Una volta ricevuto il pagamento, aggiorneremo manualmente lo stato del regalo sulla lista.</p>
      <br/>
      <p>Con affetto,</p>
      <p>Ilaria & Andrea</p>
      <br/>
      <p><em>Questo è un messaggio automatico.</em></p>
    `;

    console.log(`Attempting to send thank you email to contributor (${contributorEmail}) via Resend...`);
    const { data: contributorEmailData, error: contributorEmailError } = await resend.emails.send({
      from: senderEmail,
      to: contributorEmail,
      subject: contributorSubject,
      html: contributorHtmlBody,
    });

    if (contributorEmailError) {
      console.error(`Errore invio email di ringraziamento a ${contributorEmail} con Resend:`, contributorEmailError);
      // Potresti voler restituire un errore specifico se l'email al contributore fallisce,
      // o semplicemente loggarlo e considerare la funzione riuscita se l'email admin è andata a buon fine.
      // Per ora, logghiamo e continuiamo.
      return new Response(JSON.stringify({
        message: "Notifica admin inviata (se configurata), ma errore nell'invio email di conferma al contributore.",
        adminEmailId: adminEmailData?.id,
        contributorEmailError: contributorEmailError.message
      }), {
        status: 207, // Multi-Status, indica successo parziale
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Email di ringraziamento inviata con successo a ${contributorEmail}:`, contributorEmailData);
    return new Response(JSON.stringify({
        message: "Notifiche inviate con successo!",
        adminEmailId: adminEmailData?.id,
        contributorEmailId: contributorEmailData?.id
    }), {
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