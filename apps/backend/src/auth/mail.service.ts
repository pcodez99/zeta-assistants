import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    requireTLS: process.env.NODE_ENV !== 'test',
    auth: process.env.SMTP_USER && process.env.SMTP_PASSWORD
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });

  async sendPasswordReset(email: string, token: string) {
    if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) {
      throw new Error('SMTP is not configured');
    }
    const origin = process.env.FRONTEND_URL || 'http://localhost:3001';
    const url = new URL('/reset-password', origin);
    url.hash = `token=${token}`;
    const link = url.toString();
    const result = await this.transport.sendMail({
      from: { name: 'MeteoStation', address: process.env.SMTP_FROM },
      to: email,
      subject: 'Reimposta la password di MeteoStation',
      text: `Hai richiesto di reimpostare la password di MeteoStation.\n\nApri questo link entro 30 minuti:\n${link}\n\nIl link può essere usato una sola volta. Se non hai richiesto il cambio, ignora questa email: la tua password non verrà modificata.\n`,
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:32px auto;color:#202020"><h1 style="font-size:24px">Reimposta la tua password</h1><p>Hai richiesto una nuova password per MeteoStation.</p><p><a href="${link}" style="display:inline-block;background:#4338ca;color:white;padding:14px 22px;border-radius:8px;text-decoration:none">Scegli una nuova password</a></p><p>Il link scade tra <strong>30 minuti</strong> e può essere usato una sola volta.</p><p>Se non hai fatto questa richiesta, ignora questa email. La tua password rimarrà invariata.</p><p style="font-size:12px">Se il pulsante non funziona, copia questo indirizzo nel browser:<br>${link}</p></div>`,
      // Mailgun must not wrap a password reset URL in a tracking redirect.
      headers: { 'X-Mailgun-Track': 'no', 'X-Mailgun-Track-Clicks': 'no', 'X-Mailgun-Track-Opens': 'no' },
    });
    if (!result.accepted.length) throw new Error('SMTP rejected the recipient');
  }
}
