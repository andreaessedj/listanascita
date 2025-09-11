import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
    res.status(204).end();
    return;
  }
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { subject, body, recipients } = (req.body || {}) as {
      subject?: string;
      body?: string;
      recipients?: string[];
    };

    if (!subject || !body) {
      res.status(400).json({ error: 'Missing subject or body' });
      return;
    }

    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_PASS;
    if (!user || !pass) {
      res.status(500).json({ error: 'Missing SMTP credentials' });
      return;
    }

    const emails = Array.isArray(recipients)
      ? Array.from(new Set(recipients.map(e => String(e).trim().toLowerCase()).filter(Boolean)))
      : [];

    if (emails.length === 0) {
      res.status(400).json({ error: 'No recipients provided' });
      return;
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });

    const info = await transporter.sendMail({
      from: `Ilaria & Andrea <${user}>`,
      to: user,
      bcc: emails,
      subject,
      html: body,
    });

    res.status(200).json({ ok: true, count: emails.length, messageId: info?.messageId });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Internal error' });
  }
}
