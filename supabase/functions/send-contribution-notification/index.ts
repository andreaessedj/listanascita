import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createTransport } from "npm:nodemailer"; // Importa nodemailer

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  console.log("Edge Function 'send-contribution-notification' invoked.");

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Attempting to read Gmail credentials...");
    const GMAIL_USER = Deno.env.get("GMAIL_USER");
    const GMAIL_PASS = Deno.env.get("GMAIL_PASS");
    if (!GMAIL_USER || !GMAIL_PASS) {
      console.error("Credenziali Gmail non trovate nei secret.");
      return new Response(JSON.stringify({ error: "Configurazione del server incompleta." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("Gmail credentials read successfully.");

    const transporter = createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS,
      },
    });

    console.log("Attempting to parse request body...");
    const { productName, contributionAmount, contributorName, contributorSurname, contributorEmail, message } = await req.json();
    console.log("Request body parsed:", { productName, contributionAmount, contributorName, contributorSurname, contributorEmail, message });

    if (!productName || typeof contributionAmount === 'undefined' || !contributorName || !contributorSurname || !contributorEmail) {
      console.error("Dati mancanti nel body.");
      return new Response(JSON.stringify({ error: "Dati mancanti: productName, contributionAmount, contributorName, contributorSurname e contributorEmail sono richiesti." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ownerEmail = "andreaesse@live.it"; // Email destinatario (proprietario lista)
    const senderEmail = `Ilaria & Andrea <${GMAIL_USER}>`; // Email mittente con nome

    // --- Email di Notifica al Proprietario ---
    const ownerSubject = `Nuovo Contributo Ricevuto per ${productName}!`;
    const ownerHtmlBody = `
      <h1>🎉 Nuovo Contributo! 🎉</h1>
      <p>Ciao!</p>
      <p>Hai ricevuto un nuovo contributo per il prodotto: <strong>${productName}</strong>.</p>
      <p>Importo del contributo: <strong>€${contributionAmount.toFixed(2)}</strong>.</p>
      <p>Da: <strong>${contributorName} ${contributorSurname}</strong></p>
      <p>Email del contributore: <strong>${contributorEmail}</strong></p>
      ${message ? `<p>Messaggio: ${message}</p>` : ''}
      <p>Controlla la tua lista nascita per i dettagli.</p>
      <br/>
      <p><em>Questo è un messaggio automatico.</em></p>
    `;

    console.log("Attempting to send notification email to owner...");
    const ownerMailInfo = await transporter.sendMail({
      from: senderEmail,
      to: ownerEmail,
      subject: ownerSubject,
      html: ownerHtmlBody,
    });
    console.log("Notification email sent to owner:", ownerMailInfo.messageId);

    // --- Email di Ringraziamento al Contributore ---
    const contributorSubject = `Grazie per il tuo Contributo alla Lista Nascita di Ilaria & Andrea!`;
    const contributorHtmlBody = `
      <h1>Grazie di Cuore per il tuo Contributo! ❤️</h1>
      <p>Ciao ${contributorName},</p>
      <p>Volevamo ringraziarti tantissimo per il tuo generoso contributo di <strong>€${contributionAmount.toFixed(2)}</strong> per il prodotto <strong>"${productName}"</strong> dalla nostra lista nascita.</p>
      <p>Il tuo supporto significa molto per noi in questo momento speciale.</p>
      ${message ? `<p>Abbiamo ricevuto anche il tuo messaggio: "${message}"</p>` : ''}
      <p>L'importo totale contribuito per questo regalo verrà aggiornato manualmente sulla lista non appena riceveremo il pagamento.</p>
      <p>Grazie ancora per la tua gentilezza!</p>
      <br/>
      <p>Con affetto,</p>
      <p>Ilaria & Andrea</p>
      <br/>
      <p><em>Questo è un messaggio automatico.</em></p>
    `;

    console.log("Attempting to send thank you email to contributor...");
    const contributorMailInfo = await transporter.sendMail({
      from: senderEmail,
      to: contributorEmail,
      subject: contributorSubject,
      html: contributorHtmlBody,
    });
    console.log("Thank you email sent to contributor:", contributorMailInfo.messageId);


    return new Response(JSON.stringify({ message: "Notifiche inviate con successo!", ownerEmailId: ownerMailInfo.messageId, contributorEmailId: contributorMailInfo.messageId }), {
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