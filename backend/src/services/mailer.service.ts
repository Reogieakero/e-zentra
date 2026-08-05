import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../config/env';
import { logger } from '../lib/logger';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!config.smtp.enabled) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host!,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: { user: config.smtp.user!, pass: config.smtp.pass! },
    });
  }
  return transporter;
}

export interface MailInput {
  to: string;
  subject: string;
  text?: string;
  html: string;
}

/**
 * Sends an email when SMTP is configured. Returns true when the email was
 * delivered, and false when SMTP is not configured or delivery failed (callers
 * can fall back to surfacing the content directly in development).
 */
export async function sendMail(input: MailInput): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) {
    logger.warn('SMTP is not configured; skipping email delivery');
    return false;
  }
  try {
    await transport.sendMail({
      from: config.smtp.from!,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return true;
  } catch (err) {
    logger.error({ err }, 'Failed to send email');
    return false;
  }
}