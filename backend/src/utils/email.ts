import { env } from '../config/env'

export interface SendEmailOptions {
  to: string
  subject: string
  text: string
  html?: string
}

const RESEND_API_URL = 'https://api.resend.com/emails'

async function sendViaResend({ to, subject, text, html }: SendEmailOptions): Promise<void> {
  if (!env.resendApiKey) {
    throw new Error('RESEND_API_KEY is not configured but EMAIL_PROVIDER=resend')
  }
  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.resendApiKey}`,
    },
    body: JSON.stringify({
      from: env.mailFrom,
      to: [to],
      subject,
      text,
      html: html ?? text,
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Resend email failed (${res.status}): ${body}`)
  }
}

async function sendViaSmtp({ to, subject, text, html }: SendEmailOptions): Promise<void> {
  try {
    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
    })
    await transporter.sendMail({
      from: env.mailFrom,
      to,
      subject,
      text,
      html: html ?? text,
    })
  } catch (err) {
    if (err instanceof Error && err.message.includes('Cannot find module')) {
      throw new Error('EMAIL_PROVIDER=smtp requires the nodemailer package to be installed')
    }
    throw err
  }
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  switch (env.emailProvider) {
    case 'resend':
      await sendViaResend(options)
      break
    case 'smtp':
      await sendViaSmtp(options)
      break
    case 'console':
    default:
      // Development fallback: print the email to the server log.
      console.log(`\n[email:console] To: ${options.to}\nSubject: ${options.subject}\n${options.text}\n`)
      break
  }
}
