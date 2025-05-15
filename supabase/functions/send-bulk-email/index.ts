import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createTransport } from "npm:nodemailer";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  console.log("Edge Function 'send-bulk-email' invoked.");

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

    // Crea un client Supabase con la service role key per bypassare RLS e accedere alla tabella contributions
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const transporter = createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS,
      },
    });

    console.log("Attempting to parse request body...");
    const { subject, body } = await req.json();
    console.log("Request body parsed:", { subject, body: body.substring(0, 100) + '...' }); // Log solo inizio body

    if (!subject || !body) {
      console.error("Oggetto o corpo email mancanti nel body.");
      return new Response(JSON.stringify({ error: "Oggetto e corpo dell'email sono richiesti." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Recupera tutte le email uniche dalla tabella 'contributions' ---
    console.log("Attempting to fetch unique contributor emails...");
    const { data: emailsData, error: fetchEmailsError } = await supabase
      .from('contributions')
      .select('contributor_email');

    if (fetchEmailsError) {
        console.error("Errore nel recupero delle email:", fetchEmailsError.message);
         return new Response(JSON.stringify({ error: "Errore nel recupero degli indirizzi email dei contribuenti." }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    if (!emailsData || emailsData.length === 0) {
        console.warn("Nessuna email di contribuente trovata.");
         return new Response(JSON.stringify({ message: "Nessuna email di contribuente trovata. Nessuna email inviata." }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Estrai le email e rimuovi i duplicati
    const uniqueEmails = Array.from(new Set(emailsData.map(item => item.contributor_email).filter(email => email))); // Filtra eventuali null/undefined
    console.log(`Found ${uniqueEmails.length} unique emails.`);

    if (uniqueEmails.length === 0) {
         console.warn("Dopo la rimozione dei duplicati, non ci sono email valide.");
         return new Response(JSON.stringify({ message: "Nessuna email valida trovata dopo la rimozione dei duplicati. Nessuna email inviata." }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }


    // --- Invia l'email a tutti gli indirizzi unici ---
    const senderEmail = `Ilaria & Andrea <${GMAIL_USER}>`; // Email mittente con nome

    console.log(`Attempting to send bulk email to ${uniqueEmails.length} recipients...`);
    const mailInfo = await transporter.sendMail({
      from: senderEmail,
      to: uniqueEmails.join(','), // Invia a tutti come destinatari 'To' (o 'Bcc' per privacy)
      subject: subject,
      html: body, // Usiamo HTML per il corpo
    });
    console.log("Bulk email sent:", mailInfo.messageId);


    return new Response(JSON.stringify({ message: `Email inviata con successo a ${uniqueEmails.length} destinatari!`, messageId: mailInfo.messageId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Errore generico nella Edge Function 'send-bulk-email':", e);
    return new Response(JSON.stringify({ error: e.message || "Errore interno del server durante l'invio dell'email." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});