/** Wysyłka przez Resend (https://resend.com/docs/api-reference/emails/send-email). */
import { LIMITS } from './config.ts'

export interface OutgoingMail {
  from: string
  to: string
  replyTo: string
  subject: string
  text: string
  html?: string
  /** path: Resend pobiera plik z adresu; content: plik w base64 (np. z KV). */
  attachment?: { filename: string, path: string } | { filename: string, content: string }
  idempotencyKey: string
}

export type SendResult =
  | { ok: true }
  | { ok: false, kind: 'timeout' | 'network' | 'provider_4xx' | 'provider_429' | 'provider_5xx', status?: number }

export async function sendMail(apiKey: string, mail: OutgoingMail, fetcher: typeof fetch = fetch): Promise<SendResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), LIMITS.providerTimeoutMs)
  try {
    const response = await fetcher('https://api.resend.com/emails', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': mail.idempotencyKey,
      },
      body: JSON.stringify({
        from: mail.from,
        to: [mail.to],
        reply_to: mail.replyTo,
        subject: mail.subject,
        text: mail.text,
        ...(mail.html ? { html: mail.html } : {}),
        ...(mail.attachment ? { attachments: [mail.attachment] } : {}),
      }),
    })
    if (response.ok) return { ok: true }
    const status = response.status
    if (status === 429) return { ok: false, kind: 'provider_429', status }
    return { ok: false, kind: status >= 500 ? 'provider_5xx' : 'provider_4xx', status }
  }
  catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError'
    return { ok: false, kind: aborted ? 'timeout' : 'network' }
  }
  finally {
    clearTimeout(timer)
  }
}
