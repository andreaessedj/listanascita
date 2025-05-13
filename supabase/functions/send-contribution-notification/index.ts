import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/deno_smtp@v0.8.0/mod.ts"; // Importa la libreria SMTP

console.log(`[${new Date().toISOString()}] SCRIPT CARICATO: send-contribution-notification (Gmail SMTP Version).`);

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
    console.log(`[${new Date().toISOString()}] Tentativo di leggere GMAIL_EMAIL e GMAIL_APP_PASSWORD dai secret.`);
    GMAIL_EMAIL = Deno.env.get("GMAIL_EMAIL");
    GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!GMAIL_EMAIL || !GMAIL_APP_PASSWORD) {
      console.error(`[${new Date().toISOString()}] ERRORE CRITICO: GMAIL_EMAIL o GMAIL_APP_PASSWORD non trovati nei secret.`);
      return new Response(JSON.stringify({ error: "Configurazione del server (Credenziali Gmail) incompleta." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log(`[${new Date().toISOString()}] Credenziali Gmail lette con successo.`);
  } catch (envError) {
    console.error(`[${new Date().toISOString()}] ERRORE CRITICO durante la lettura dei secret Gmail:`, envError);
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
    console.error(`[${new Date().toISOString()}] Dati mancanti nel body.`);
    return new Response(JSON.stringify({ error: "Dati mancanti o tipo errato." }), {
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

  const smtpClient = new SMTPClient({
    connection: {
      hostname: "smtp.gmail.com",
      port: 465, // SSL
      tls: true, // Per Gmail con porta 465, la connessione è TLS dall'inizio
      auth: {
        username: GMAIL_EMAIL,
        password: GMAIL_APP_PASSWORD,
      },
    },
    debug: { // Abilita log dettagliati dalla libreria SMTP
        allowUnsecureConnection: false, // Non permettere connessioni non sicure
        logFine: true, // Log dettagliati
        logRaw: false, // Non loggare i dati grezzi (potrebbe esporre password se abilitato)
    }
  });

  console.log(`[${new Date().toISOString()}] Client SMTP per Gmail configurato.`);

  // Definisci il mittente (il tuo indirizzo Gmail)
  // Puoi aggiungere un nome visualizzato se lo desideri
  const fromEmailAddress = `Ilaria & Andrea <${GMAIL_EMAIL}>`;

  // 1. Email di notifica agli admin (a te stesso)
  const adminSubject = `Nuovo Contributo Ricevuto per ${productName}! (Lista Nascita)`;
  const adminHtmlBody = `<h1>🎉 Nuovo Contributo! 🎉</h1><p>Ciao!</p><p>Hai ricevuto un nuovo contributo per il prodotto: <strong>${productName}</strong>.</p><p>Importo: <strong>€${contributionAmount.toFixed(2)}</strong>.</p><p>Da: <strong>${contributorName} ${contributorSurname}</strong> (Email: ${contributorEmail})</p>${message ? `<p>Messaggio: ${message}</p>` : ''}<p><em>Messaggio automatico dalla tua Lista Nascita.</em></p>`;

  try {
    console.log(`[${new Date().toISOString()}] Tentativo invio email admin a ${GMAIL_EMAIL}...`);
    await smtpClient.send({
      from: fromEmailAddress,
      to: GMAIL_EMAIL, // Invia a te stesso
      subject: adminSubject,
      html: adminHtmlBody,
    });
    console.log(`[${new Date().toISOString()}] Email admin inviata con successo a ${GMAIL_EMAIL}.`);
  } catch (adminEmailError) {
    console.error(`[${new Date().toISOString()}] ERRORE invio email admin con Gmail SMTP:`, adminEmailError);
    // Non bloccare l'invio al contributore se questa fallisce, ma logga
  }

  // 2. Email di ringraziamento al contributore
  const contributorSubject = `Grazie per il tuo contributo per ${productName}! (Lista Nascita Ilaria & Andrea)`;
  const contributorHtmlBody = `<h1>💖 Grazie ${contributorName}! 💖</h1><p>Ciao ${contributorName} ${contributorSurname},</p><p>Grazie di cuore per il tuo contributo di <strong>€${contributionAmount.toFixed(2)}</strong> per <strong>${productName}</strong>.</p>${message ? `<p>Il tuo messaggio per noi: "${message}"</p>` : ''}<p>Ricorda di completare il pagamento seguendo le istruzioni che hai visualizzato. Aggiorneremo lo stato del regalo una volta ricevuto.</p><p>Con affetto,<br/>Ilaria & Andrea</p><p><em>Messaggio automatico. Per qualsiasi domanda, rispondi pure a questa email.</em></p>`;

  try {
    console.log(`[${new Date().toISOString()}] Tentativo invio email ringraziamento a ${contributorEmail}...`);
    await smtpClient.send({
      from: fromEmailAddress, // Inviato dal tuo indirizzo Gmail
      to: contributorEmail,
      subject: contributorSubject,
      html: contributorHtmlBody,
    });
    console.log(`[${new Date().toISOString()}] Email ringraziamento inviata con successo a ${contributorEmail}.`);
    
    await smtpClient.close(); // Chiudi la connessione SMTP
    console.log(`[${new Date().toISOString()}] Connessione SMTP chiusa.`);

    return new Response(JSON.stringify({ message: "Notifiche inviate con successo tramite Gmail!" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (contributorEmailError) {
    console.error(`[${new Date().toISOString()}] ERRORE invio email ringraziamento a ${contributorEmail} con Gmail SMTP:`, contributorEmailError);
    await smtpClient.close(); // Assicurati di chiudere la connessione anche in caso di errore
    console.log(`[${new Date().toISOString()}] Connessione SMTP chiusa dopo errore.`);
    return new Response(JSON.stringify({
      message: "Errore durante l'invio dell'email di conferma al contributore tramite Gmail.",
      errorDetails: contributorEmailError.message || "Errore SMTP sconosciuto"
    }), {
      status: 500, // Errore server se l'email principale fallisce
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});