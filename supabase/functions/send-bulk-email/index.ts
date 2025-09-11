// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createTransport } from "npm:nodemailer";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("Edge Function 'send-bulk-email' invoked.");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const GMAIL_USER = Deno.env.get("GMAIL_USER")!;
    const GMAIL_PASS = Deno.env.get("GMAIL_PASS")!;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error("Missing Supabase envs.");
      return new Response(JSON.stringify({ error: "Missing Supabase configuration." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!GMAIL_USER || !GMAIL_PASS) {
      console.error("Missing Gmail SMTP credentials.");
      return new Response(JSON.stringify({ error: "Missing email credentials." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const transporter = createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    });

    const { subject, body, recipients } = await req.json();
    console.log("Request parsed:", {
      subject,
      bodyPreview: typeof body === "string" ? body.slice(0, 80) + "..." : typeof body,
      recipientsType: Array.isArray(recipients) ? "array" : typeof recipients,
      recipientsCount: Array.isArray(recipients) ? recipients.length : undefined,
    });

    if (!subject || !body) {
      return new Response(JSON.stringify({ error: "Oggetto e corpo dell'email sono richiesti." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- PICK TARGET EMAILS (OVERRIDE FIRST) ----------
    let targetEmails: string[] = [];
    if (Array.isArray(recipients) && recipients.filter(Boolean).length > 0) {
      targetEmails = Array.from(
        new Set(recipients.map((e) => String(e).trim().toLowerCase()).filter(Boolean))
      );
      console.log(`[OVERRIDE] Using provided recipients: ${targetEmails.length}`);
    } else {
      console.log("[BULK] Fetching all unique contributor emails from 'contributions'");
      const { data: emailsData, error: fetchErr } = await supabase
        .from("contributions")
        .select("contributor_email");

      if (fetchErr) {
        console.error("Supabase fetch error:", fetchErr);
        return new Response(JSON.stringify({ error: "Errore nel recupero delle email." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      targetEmails = Array.from(
        new Set(
          (emailsData || [])
            .map((r: any) => (r?.contributor_email || "").toString().trim().toLowerCase())
            .filter((e: string) => !!e)
        )
      );
      console.log(`[BULK] Unique emails from DB: ${targetEmails.length}`);
    }

    if (targetEmails.length === 0) {
      return new Response(JSON.stringify({ message: "Nessun destinatario valido." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- SEND EMAIL (use BCC for privacy) ----------
    const senderEmail = `Ilaria & Andrea <${GMAIL_USER}>`;
    console.log("Sending email to:", targetEmails.length, "recipients");

    const info = await transporter.sendMail({
      from: senderEmail,
      to: GMAIL_USER,          // mittente o casella di servizio
      bcc: targetEmails,       // invio effettivo ai destinatari in BCC
      subject,
      html: body,
    });

    console.log("Email sent. messageId:", info?.messageId);
    return new Response(
      JSON.stringify({ ok: true, message: `Email inviata a ${targetEmails.length} destinatari.`, messageId: info?.messageId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Unhandled error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Errore interno." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
