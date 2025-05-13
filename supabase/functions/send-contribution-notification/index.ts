import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@3.4.0";

console.log(`[${new Date().toISOString()}] SCRIPT CARICATO: send-contribution-notification. Resend SDK importato (o tentato).`);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const isValidEmailFn = (email: string): boolean => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

serve(async (req: Request) => {
  console.log(`[${new Date().toISOString()}] INVOCATA: send-contribution-notification, Metodo: ${req.method}`);

  if (req.method === 'OPTIONS') {
    console.log(`[${new Date().toISOString()}] Gestione richiesta OPTIONS.`);
    return new Response(null, { headers: corsHeaders });
  }

  let RESEND_API_KEY: string | undefined;
  try {
    console.log(`[${new Date().toISOString()}] Tentativo di leggere RESEND_API_KEY dal Deno.env.`);
    RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error(`[${new Date().toISOString()}] ERRORE CRITICO: RESEND_API_KEY non trovata nei secret di Deno.env.`);
      return new Response(JSON.stringify({ error: "Configurazione del server (API Key) incompleta." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log(`[${new Date().toISOString()}] RESEND_API_KEY letta con successo (lunghezza: ${RESEND_API_KEY.length}).`);
  } catch (envError) {
    console.error(`[${new Date().toISOString()}] ERRORE CRITICO durante la lettura di Deno.env:`, envError);
    return new Response(JSON.stringify({ error: "Errore interno del server durante l'accesso alla configurazione." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
  }

  let requestData;
  try {
    console.log(`[${new Date().toISOString()}] Tentativo di fare il parsing del corpo della richiesta JSON.`);
    requestData = await req.json();
    console.log(`[${new Date().toISOString()}] Corpo richiesta parsato:`, requestData);
  } catch (parseError) {
    console.error(`[${new Date().toISOString()}] Errore parsing corpo richiesta JSON:`, parseError);
    return new Response(JSON.stringify({ error: "Corpo della richiesta malformato o non JSON." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const {
      productName,
      contributionAmount,
      contributorName,
      contributorSurname,
      contributorEmail,
      message
  } = requestData;

  if (!productName || typeof contributionAmount !== 'number' || !contributorName || !contributorSurname || !contributorEmail) {
    console.error(`[${new Date().toISOString()}] Dati mancanti nel body. Campi richiesti: productName, contributionAmount (number), contributorName, contributorSurname, contributorEmail.`);
    console.log(`[${new Date().toISOString()}] Dati ricevuti:`, { productName, contributionAmount, contributorName, contributorSurname, contributorEmail });
    return new Response(JSON.stringify({ error: "Dati mancanti o tipo errato: productName, contributionAmount (deve essere numero), contributorName, contributorSurname e contributorEmail sono richiesti." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!isValidEmailFn(contributorEmail)) {
      console.error(`[${new Date().toISOString()}] Indirizzo email del contributore non valido:`, contributorEmail);
      return new Response(JSON.stringify({ error: "Indirizzo email del contributore non valido." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
  }
  console.log(`[${new Date().toISOString()}] Dati validati con successo.`);

  try {
    const resend = new Resend(RESEND_API_KEY);
    console.log(`[${new Date().toISOString()}] Oggetto Resend SDK inizializzato.`);

    const adminRecipientEmail = "andreaesse@live.it";
    // IMPORTANTE: Sostituisci 'TUO_DOMINIO_VERIFICATO.com' con il tuo dominio effettivo verificato su Resend.
    // Esempio: "noreply@lamialistanascita.com"
    const senderEmail = "noreply@TUO_DOMINIO_VERIFICATO.com";
    console.log(`[${new Date().toISOString()}] Indirizzo mittente impostato a: ${senderEmail}`);


    // 1. Email di notifica agli admin
    const adminSubject = `Nuovo Contributo Ricevuto per ${productName}!`;
    const adminHtmlBody = `<h1>🎉 Nuovo Contributo! 🎉</h1><p>Ciao!</p><p>Hai ricevuto un nuovo contributo per il prodotto: <strong>${productName}</strong>.</p><p>Importo: <strong>€${contributionAmount.toFixed(2)}</strong>.</p><p>Da: <strong>${contributorName} ${contributorSurname}</strong> (Email: ${contributorEmail})</p>${message ? `<p>Messaggio: ${message}</p>` : ''}<p><em>Messaggio automatico.</em></p>`;

    console.log(`[${new Date().toISOString()}] Tentativo invio email admin a ${adminRecipientEmail}...`);
    const adminEmailResult = await resend.emails.send({
      from: senderEmail,
      to: adminRecipientEmail,
      subject: adminSubject,
      html: adminHtmlBody,
    });

    if (adminEmailResult.error) {
      console.error(`[${new Date().toISOString()}] ERRORE invio email admin con Resend:`, JSON.stringify(adminEmailResult.error));
    } else {
      console.log(`[${new Date().toISOString()}] Email admin inviata con successo. ID: ${adminEmailResult.data?.id}`);
    }

    // 2. Email di ringraziamento al contributore
    const contributorSubject = `Grazie per il tuo contributo per ${productName}!`;
    const contributorHtmlBody = `<h1>💖 Grazie ${contributorName}! 💖</h1><p>Ciao ${contributorName} ${contributorSurname},</p><p>Grazie per il tuo contributo di <strong>€${contributionAmount.toFixed(2)}</strong> per <strong>${productName}</strong>.</p>${message ? `<p>Il tuo messaggio: "${message}"</p>` : ''}<p>Ricorda di completare il pagamento. Aggiorneremo lo stato del regalo una volta ricevuto.</p><p>Con affetto,<br/>Ilaria & Andrea</p><p><em>Messaggio automatico.</em></p>`;

    console.log(`[${new Date().toISOString()}] Tentativo invio email ringraziamento a ${contributorEmail}...`);
    const contributorEmailResult = await resend.emails.send({
      from: senderEmail,
      to: contributorEmail,
      subject: contributorSubject,
      html: contributorHtmlBody,
    });

    if (contributorEmailResult.error) {
      console.error(`[${new Date().toISOString()}] ERRORE invio email ringraziamento a ${contributorEmail} con Resend:`, JSON.stringify(contributorEmailResult.error));
      return new Response(JSON.stringify({
        message: "Notifica admin processata (controlla log per esito), ma errore invio email conferma al contributore.",
        adminEmailId: adminEmailResult.data?.id,
        contributorEmailError: contributorEmailResult.error.message
      }), {
        status: 207,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[${new Date().toISOString()}] Email ringraziamento inviata con successo a ${contributorEmail}. ID: ${contributorEmailResult.data?.id}`);
    return new Response(JSON.stringify({
        message: "Notifiche inviate con successo!",
        adminEmailId: adminEmailResult.data?.id,
        contributorEmailId: contributorEmailResult.data?.id
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error(`[${new Date().toISOString()}] ERRORE CATTURATO nel blocco try/catch principale della funzione:`, e.toString(), e.stack);
    return new Response(JSON.stringify({ error: e.message || "Errore interno del server durante l'elaborazione." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});