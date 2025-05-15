import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createTransport } from "npm:nodemailer"; // Importa nodemailer
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'; // Importa createClient per interagire con il DB

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
    console.log("Attempting to read environment variables...");
    const GMAIL_USER = Deno.env.get("GMAIL_USER");
    const GMAIL_PASS = Deno.env.get("GMAIL_PASS");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GMAIL_USER || !GMAIL_PASS || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Variabili d'ambiente mancanti.");
      return new Response(JSON.stringify({ error: "Configurazione del server incompleta (variabili d'ambiente mancanti)." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("Environment variables read successfully.");

    // Crea un client Supabase con la service role key per bypassare RLS
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const transporter = createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS,
      },
    });

    console.log("Attempting to parse request body...");
    const { productId, productName, contributionAmount, contributorName, contributorSurname, contributorEmail, message, paymentMethod } = await req.json(); // Aggiunto productId e paymentMethod
    console.log("Request body parsed:", { productId, productName, contributionAmount, contributorName, contributorSurname, contributorEmail, message, paymentMethod });

    if (!productId || !productName || typeof contributionAmount === 'undefined' || !contributorName || !contributorSurname || !contributorEmail || !paymentMethod) {
      console.error("Dati mancanti nel body.");
      return new Response(JSON.stringify({ error: "Dati mancanti: productId, productName, contributionAmount, contributorName, contributorSurname, contributorEmail e paymentMethod sono richiesti." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Aggiorna l'importo contribuito nel prodotto ---
    console.log(`Attempting to update contributed_amount for product ${productId}...`);
    // Prima recupera l'importo attuale per calcolare il nuovo totale
    const { data: productData, error: fetchProductError } = await supabase
      .from('products')
      .select('contributed_amount')
      .eq('id', productId)
      .single();

    if (fetchProductError || !productData) {
        console.error("Errore nel recupero del prodotto:", fetchProductError?.message);
         return new Response(JSON.stringify({ error: "Errore nel recupero del prodotto per l'aggiornamento." }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const newContributedAmount = Math.round((productData.contributed_amount + contributionAmount) * 100) / 100;

    const { error: updateError } = await supabase
      .from('products')
      .update({ contributed_amount: newContributedAmount })
      .match({ id: productId });

    if (updateError) {
        console.error("Errore nell'aggiornamento del prodotto:", updateError.message);
        return new Response(JSON.stringify({ error: "Errore nell'aggiornamento del contributo nel database." }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
    console.log(`Contributed amount updated successfully for product ${productId}. New amount: ${newContributedAmount}`);


    // --- Registra il contributo nella tabella 'contributions' ---
    console.log("Attempting to insert contribution record...");
    const { error: insertContributionError } = await supabase
      .from('contributions')
      .insert([
        {
          product_id: productId,
          amount: contributionAmount,
          contributor_name: contributorName,
          contributor_surname: contributorSurname,
          contributor_email: contributorEmail,
          message: message,
        }
      ]);

    if (insertContributionError) {
        console.error("Errore nell'inserimento del contributo:", insertContributionError.message);
        // Non ritornare errore 500 qui, l'aggiornamento del prodotto è andato a buon fine.
        // Potremmo voler loggare questo errore e continuare con l'invio email.
    } else {
        console.log("Contribution record inserted successfully.");
    }

    // --- Libera la prenotazione per questo prodotto ---
    console.log(`Attempting to clear reservation for product ${productId}...`);
     const { error: clearReservationError } = await supabase
      .from('products')
      .update({
        reserved_by_email: null,
        reserved_until: null,
      })
      .match({ id: productId });

    if (clearReservationError) {
        console.error("Errore nel liberare la prenotazione:", clearReservationError.message);
        // Logga l'errore ma non bloccare la risposta di successo, l'aggiornamento principale è avvenuto.
    } else {
        console.log(`Reservation cleared successfully for product ${productId}.`);
    }


    // --- Email di Notifica al Proprietario ---
    const ownerEmail = "andreaesse@live.it"; // Email destinatario (proprietario lista)
    const senderEmail = `Ilaria & Andrea <${GMAIL_USER}>`; // Email mittente con nome

    const ownerSubject = `Nuovo Contributo Ricevuto per ${productName}!`;
    const ownerHtmlBody = `
      <h1>🎉 Nuovo Contributo! 🎉</h1>
      <p>Ciao!</p>
      <p>Hai ricevuto un nuovo contributo di <strong>€${contributionAmount.toFixed(2)}</strong> per il prodotto: <strong>${productName}</strong>.</p>
      <p>Da: <strong>${contributorName} ${contributorSurname}</strong></p>
      <p>Email del contributore: <strong>${contributorEmail}</strong></p>
      <p>Metodo di pagamento indicato: <strong>${paymentMethod}</strong></p>
      ${message ? `<p>Messaggio: ${message}</p>` : ''}
      <p>L'importo totale contribuito per questo regalo è ora di <strong>€${newContributedAmount.toFixed(2)}</strong>.</p>
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