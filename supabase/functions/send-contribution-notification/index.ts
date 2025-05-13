import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// Attempting to import from the main 'mod.ts' of the email module
import { SmtpClient } from "https://deno.land/x/email@v0.2.0/mod.ts";

console.log(`[${new Date().toISOString()}] SCRIPT CARICATO: send-contribution-notification (Gmail SMTP - deno.land/x/email). Import URL: https://deno.land/x/email@v0.2.0/mod.ts`);

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

  let GMAIL_EMAIL: string | undefined;
  let GMAIL_APP_PASSWORD: string | undefined;

  try {
    console.log(`[${new Date().toISOString()}] Tentativo di leggere GMAIL_EMAIL e GMAIL_APP_PASSWORD dai secret Deno.env.`);
    GMAIL_EMAIL = Deno.env.get("GMAIL_EMAIL");
    GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!GMAIL_EMAIL) {
      console.error(`[${new Date().toISOString()}] ERRORE CRITICO: Secret GMAIL_EMAIL non trovato.`);
      return new Response(JSON.stringify({ error: "Configurazione del server (GMAIL_EMAIL) incompleta." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!GMAIL_APP_PASSWORD) {
      console.error(`[${new Date().toISOString()}] ERRORE CRITICO: Secret GMAIL_APP_PASSWORD non trovato.`);
      return new Response(JSON.stringify({ error: "Configurazione del server (GMAIL_APP_PASSWORD) incompleta." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log(`[${new Date().toISOString()}] Secret GMAIL_EMAIL (${GMAIL_EMAIL}) e GMAIL_APP_PASSWORD (presente) letti con successo.`);
  } catch (envError) {
    console.error(`[${new Date().toISOString()}] ERRORE CRITICO durante la lettura dei secret Deno.env:`, envError);
    return new Response(JSON.stringify({ error: "Errore interno del server durante l'accesso alla configurazione." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
  }

  let requestData;
  try {
    console.log(`[${new Date().toISOString()}] Tentativo di fare il parsing del corpo della richiesta JSON.`);
    requestData = await req.json();
    console.log(`[${new Date().toISOString()}] Corpo richiesta parsato:`, JSON.stringify(requestData));
  } catch (parseError) {
    console.error(`[${new Date().toISOString()}] Errore parsing corpo richiesta JSON:`, parseError);
    return new Response(JSON.stringify({ error: "Corpo della richiesta malformato o non JSON." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
    console.error(`[${new Date().toISOString()}] Dati mancanti nel body. Ricevuto:`, JSON.stringify(requestData));
    return new Response(JSON.stringify({ error: "Dati mancanti o tipo errato. Campi richiesti: productName, contributionAmount (numero), contributorName, contributorSurname, contributorEmail." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!isValidEmailFn(contributorEmail)) {
      console.error(`[${new Date().toISOString()}] Indirizzo email del contributore non valido:`, contributorEmail);
      return new Response(JSON.stringify({ error: "Indirizzo email del contributore non valido." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
  }
  console.log(`[${new Date().toISOString()}] Dati validati con successo.`);

  const smtpClient = new SmtpClient();

  try {
    console.log(`[${new Date().toISOString()}] Tentativo di connessione a Gmail SMTP (smtp.gmail.com:465)...`);
    await smtpClient.connectTLS({
        hostname: "smtp.gmail.com",
        port: 465,
        username: GMAIL_EMAIL, // Dal secret
        password: GMAIL_APP_PASSWORD, // Dal secret
    });
    console.log(`[${new Date().toISOString()}] Connesso a Gmail SMTP con successo.`);

    const fromEmailAddress = `Ilaria & Andrea Lista Nascita <${GMAIL_EMAIL}>`;

    // 1. Email di notifica agli admin (a te stesso)
    const adminSubject = `Nuovo Contributo per ${productName}! (Lista Nascita)`;
    const adminHtmlBody = `<h1>🎉 Nuovo Contributo! 🎉</h1><p>Ciao!</p><p>Hai ricevuto un nuovo contributo per: <strong>${productName}</strong>.</p><p>Importo: <strong>€${contributionAmount.toFixed(2)}</strong>.</p><p>Da: <strong>${contributorName} ${contributorSurname}</strong> (Email: ${contributorEmail})</p>${message ? `<p>Messaggio: ${message}</p>` : ''}<p><em>Messaggio automatico.</em></p>`;

    console.log(`[${new Date().toISOString()}] Tentativo invio email admin a ${GMAIL_EMAIL}...`);
    await smtpClient.send({
      from: fromEmailAddress,
      to: GMAIL_EMAIL,
      subject: adminSubject,
      html: adminHtmlBody,
    });
    console.log(`[${new Date().toISOString()}] Email admin inviata con successo a ${GMAIL_EMAIL}.`);

    // 2. Email di ringraziamento al contributore
    const contributorSubject = `Grazie per il tuo contributo per ${productName}! (Lista Nascita Ilaria & Andrea)`;
    const contributorHtmlBody = `<h1>💖 Grazie ${contributorName}! 💖</h1><p>Ciao ${contributorName} ${contributorSurname},</p><p>Grazie di cuore per il tuo contributo di <strong>€${contributionAmount.toFixed(2)}</strong> per <strong>${productName}</strong>.</p>${message ? `<p>Il tuo messaggio per noi: "${message}"</p>` : ''}<p>Ricorda di completare il pagamento seguendo le istruzioni che hai visualizzato. Aggiorneremo lo stato del regalo una volta ricevuto.</p><p>Con affetto,<br/>Ilaria & Andrea</p><p><em>Messaggio automatico. Per qualsiasi domanda, rispondi pure a questa email.</em></p>`;

    console.log(`[${new Date().toISOString()}] Tentativo invio email ringraziamento a ${contributorEmail}...`);
    await smtpClient.send({
      from: fromEmailAddress,
      to: contributorEmail,
      subject: contributorSubject,
      html: contributorHtmlBody,
    });
    console.log(`[${new Date().toISOString()}] Email ringraziamento inviata con successo a ${contributorEmail}.`);
    
    return new Response(JSON.stringify({ message: "Notifiche inviate con successo tramite Gmail!" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (emailError) {
    console.error(`[${new Date().toISOString()}] ERRORE durante la connessione SMTP o l'invio email con Gmail:`, emailError.message, emailError.stack ? emailError.stack : '');
    return new Response(JSON.stringify({
      message: "Errore durante l'invio dell'email tramite Gmail.",
      errorDetails: emailError.message || "Errore SMTP sconosciuto"
    }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } finally {
    try {
      console.log(`[${new Date().toISOString()}] Tentativo chiusura connessione SMTP...`);
      await smtpClient.close();
      console.log(`[${new Date().toISOString()}] Connessione SMTP chiusa.`);
    } catch (closeError) {
      console.error(`[${new Date().toISOString()}] Errore durante la chiusura della connessione SMTP:`, closeError);
    }
  }
});