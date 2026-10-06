/** Mail z linkiem logowania przez Resend (https://resend.com/docs/api-reference/emails/send-email). */
import { DEFAULTS, LIMITS, type Env } from './env'

export type MailResult = 'sent' | 'dry' | 'failed'

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, ch => `&#${ch.charCodeAt(0)};`)

export const mailConfigured = (env: Env) => env.MAIL_MODE === 'live' && Boolean(env.RESEND_API_KEY)

export async function sendLoginLink(env: Env, fetcher: typeof fetch, to: string, link: string): Promise<MailResult> {
  if (env.MAIL_MODE !== 'live') {
    // Tylko lokalnie (MAIL_MODE=dry): link w konsoli wrangler dev.
    console.log(`[cms] login link (dry): ${link}`)
    return 'dry'
  }
  if (!env.RESEND_API_KEY) {
    console.log(JSON.stringify({ event: 'mail', status: 'failed', detail: 'no_api_key' }))
    return 'failed'
  }
  const text = [
    'Link do logowania w panelu CMS dobrolinski.pl:',
    '',
    link,
    '',
    'Link działa 15 minut i tylko raz. Jeśli to nie Ty prosiłeś o logowanie, zignoruj tę wiadomość.',
  ].join('\n')
  const html = `<p>Link do logowania w panelu CMS dobrolinski.pl:</p><p><a href="${escapeHtml(link)}">Zaloguj się</a></p>`
    + '<p>Link działa 15 minut i tylko raz. Jeśli to nie Ty prosiłeś o logowanie, zignoruj tę wiadomość.</p>'
  try {
    const response = await fetcher('https://api.resend.com/emails', {
      method: 'POST',
      signal: AbortSignal.timeout(LIMITS.providerTimeoutMs),
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.MAIL_FROM || DEFAULTS.mailFrom,
        to: [to],
        subject: 'Logowanie do CMS dobrolinski.pl',
        text,
        html,
      }),
    })
    if (response.ok) return 'sent'
    console.log(JSON.stringify({ event: 'mail', status: 'failed', detail: response.status }))
    return 'failed'
  }
  catch (error) {
    console.log(JSON.stringify({ event: 'mail', status: 'failed', detail: error instanceof Error ? error.name : 'error' }))
    return 'failed'
  }
}
