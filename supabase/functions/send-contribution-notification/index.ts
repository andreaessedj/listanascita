import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createTransport } from "npm:nodemailer"; // Importa nodemailer

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
    console.log("Attempting to read Gmail credentials..."); // Log prima di leggere le credenziali
    const GMAIL_USER = Deno.env.get("GMAIL_USER");
    const GMAIL_PASS = Deno.env.get("GMAIL_PASS");
    if (!GMAIL_USER || !GMAIL_PASS) {
      console.error("Credenziali Gmail non trovate nei secret.");
      return new Response(JSON.stringify({ error: "Configurazione del server incompleta." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("Gmail credentials read successfully."); // Log dopo aver letto le credenziali

    const transporter = createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS,
      },
    });

    console.log("Attempting to parse request body..."); // Log prima di leggere il body
    const { productName, contributionAmount, contributorName, contributorSurname, contributorEmail, message } = await req.json(); // Aggiunto contributorEmail
    console.log("Request body parsed:", { productName, contributionAmount, contributorName, contributorSurname, contributorEmail, message }); // Log dopo aver letto il body

    if (!productName || typeof contributionAmount === 'undefined' || !contributorName || !contributorSurname || !contributorEmail) { // Aggiunto check per contributorEmail
      console.error("Dati mancanti nel body."); // Log per dati mancanti
      return new Response(JSON.stringify({ error: "Dati mancanti: productName, contributionAmount, contributorName, contributorSurname e contributorEmail sono richiesti." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipientEmail = "andreaesse@live.it"; // Email destinatario
    // Corretto il formato dell'email del mittente
    const senderEmail = `Ilaria & Andrea <${GMAIL_USER}>`; // Email mittente con nome

    const subject = `Nuovo Contributo Ricevuto per ${productName}!`;
    const htmlBody = `
      <h1>🎉 Nuovo Contributo! 🎉</h1>
      <p>Ciao!</p>
      <p>Hai ricevuto un nuovo contributo per il prodotto: <strong>${productName}</strong>.</p>
      <p>Importo del contributo: <strong>€${contributionAmount.toFixed(2)}</strong>.</p>
      <p>Da: <strong>${contributorName} ${contributorSurname}</strong></p>
      <p>Email del contributore: <strong>${contributorEmail}</strong></p> <!-- Aggiunto email del contributore -->
      ${message ? `<p>Messaggio: ${message}</p>` : ''} <!-- Includi il messaggio se presente -->
      <p>Controlla la tua lista nascita per i dettagli.</p>
      <br/>
      <p><em>Questo è un messaggio automatico.</em></p>
    `;

    console.log("Attempting to send email via Gmail..."); // Log prima di inviare l'email
    const info = await transporter.sendMail({
      from: senderEmail, // Usa il formato corretto
      to: recipientEmail,
      subject: subject,
      html: htmlBody,
    });

    console.log("Email inviata con successo:", info.messageId); // Log successo invio
    return new Response(JSON.stringify({ message: "Notifica inviata con successo!", emailId: info.messageId }), {
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