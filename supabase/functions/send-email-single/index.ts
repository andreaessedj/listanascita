// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createTransport } from "npm:nodemailer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GMAIL_USER = Deno.env.get("GMAIL_USER")!;
    const GMAIL_PASS = Deno.env.get("GMAIL_PASS")!;

    if (!GMAIL_USER || !GMAIL_PASS) {
      return new Response(JSON.stringify({ error: "Missing email credentials." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { subject, body, recipients } = await req.json();

    if (!subject || !body) {
      return new Response(JSON.stringify({ error: "Oggetto e corpo richiesti." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!Array.isArray(recipients) || recipients.filter(Boolean).length === 0) {
      return new Response(JSON.stringify({ error: "Nessun destinatario fornito." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const targetEmails = Array.from(
      new Set(recipients.map((e) => String(e).trim().toLowerCase()).filter(Boolean))
    );

    const transporter = createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    });

    const info = await transporter.sendMail({
      from: `Ilaria & Andrea <${GMAIL_USER}>`,
      to: GMAIL_USER,
      bcc: targetEmails,
      subject,
      html: body,
    });

    return new Response(JSON.stringify({ ok: true, messageId: info?.messageId, count: targetEmails.length }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || "Errore interno." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
