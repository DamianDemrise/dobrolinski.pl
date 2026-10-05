/**
 * Podgląd maila bez wysyłki: `node offer-worker/scripts/preview-email.ts`.
 * Zapisuje design/email-offer-preview.html i .txt (oferta + powiadomienie).
 */
import { writeFileSync } from 'node:fs'
import { DEFAULTS } from '../src/config.ts'
import { NOTIFICATION_SUBJECT, notificationText, OFFER_PREHEADER, OFFER_SUBJECT, offerHtml, offerText } from '../src/templates.ts'

const out = new URL('../../design/', import.meta.url)
writeFileSync(new URL('email-offer-preview.html', out), offerHtml(DEFAULTS.pdfUrl))
writeFileSync(new URL('email-offer-preview.txt', out), [
  `Od: ${DEFAULTS.from}`,
  `Odpowiedz do: ${DEFAULTS.replyTo}`,
  `Temat: ${OFFER_SUBJECT}`,
  `Preheader: ${OFFER_PREHEADER}`,
  `Załącznik: ${DEFAULTS.pdfFilename}`,
  '',
  offerText(DEFAULTS.pdfUrl),
  '',
  '==================== powiadomienie ====================',
  `Do: ${DEFAULTS.notification}`,
  'Odpowiedz do: przyklad@firma.pl',
  `Temat: ${NOTIFICATION_SUBJECT}`,
  '',
  notificationText('przyklad@firma.pl', new Date(), { page: '/poznaj-czlowieka', utm_source: 'linkedin', utm_medium: 'social' }),
  '',
].join('\n'))
console.log('design/email-offer-preview.html, design/email-offer-preview.txt')
