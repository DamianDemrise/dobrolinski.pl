/**
 * Treść maili. Szablon jest stały: endpoint nie przyjmuje od klienta
 * tematu, treści, nadawcy ani załącznika. Adres odbiorcy nie trafia
 * do HTML-a oferty, więc nie ma czego wstrzyknąć.
 */
import type { OfferSource } from '../../shared/offer.ts'

export const OFFER_SUBJECT = 'Poznaj Człowieka — oferta warsztatu'
export const OFFER_PREHEADER = 'Program, sposób pracy, organizacja i cena.'
export const NOTIFICATION_SUBJECT = 'Nowe pobranie — Poznaj Człowieka'

const NAME = 'Damian Dobroliński'
const AREAS = 'Ludzie · Sprzedaż · Marketing · Technologia'
const SITE = 'dobrolinski.pl'
const SITE_URL = 'https://dobrolinski.pl'

const FONT = '\'Helvetica Neue\', Helvetica, Arial, sans-serif'
const INK = '#141414'
const MUTED = '#6b6b68'
const PAPER = '#f7f7f5'
const LINE = '#dcdcd8'

export function offerText(pdfUrl: string): string {
  return [
    'Cześć,',
    '',
    'zgodnie z prośbą przesyłam szczegóły warsztatu „Poznaj Człowieka”.',
    '',
    'W środku znajdziesz program, sposób pracy, organizację i cenę.',
    '',
    `Zobacz ofertę: ${pdfUrl}`,
    '',
    'PDF znajdziesz też w załączniku.',
    '',
    'Jeżeli po przeczytaniu pomyślisz, że może mieć to sens u Was, odpisz na tego maila.',
    '',
    'Najpierw pogadamy.',
    '',
    NAME,
    AREAS,
    SITE,
  ].join('\n')
}

const paragraph = (text: string, extra = '') =>
  `<p style="margin:0 0 20px;font-family:${FONT};font-size:16px;line-height:26px;color:${INK};${extra}">${text}</p>`

export function offerHtml(pdfUrl: string): string {
  const href = encodeURI(pdfUrl)
  return `<!doctype html>
<html lang="pl" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${OFFER_SUBJECT}</title>
<style>
  @media (max-width: 600px) {
    .page { padding: 32px 24px 40px !important; }
  }
  a { color: ${INK}; }
</style>
</head>
<body style="margin:0;padding:0;background:${PAPER};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${OFFER_PREHEADER}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER};">
  <tr>
    <td align="center" style="padding:0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr>
          <td class="page" style="padding:56px 40px 56px;">
            <p style="margin:0;font-family:${FONT};font-size:12px;line-height:18px;font-weight:600;letter-spacing:3px;color:${INK};">DAMIAN DOBROLIŃSKI</p>
            <p style="margin:6px 0 0;font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED};">${AREAS}</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 40px;">
              <tr><td style="border-top:1px solid ${LINE};font-size:0;line-height:0;height:1px;">&nbsp;</td></tr>
            </table>
            ${paragraph('Cześć,')}
            ${paragraph('zgodnie z prośbą przesyłam szczegóły warsztatu „Poznaj&nbsp;Człowieka”.')}
            ${paragraph('W środku znajdziesz program, sposób pracy, organizację i&nbsp;cenę.', 'margin-bottom:32px;')}
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;">
              <tr>
                <td style="border-bottom:1px solid ${INK};padding:0 0 6px;">
                  <a href="${href}" target="_blank" style="font-family:${FONT};font-size:17px;line-height:24px;font-weight:600;color:${INK};text-decoration:none;">Zobacz ofertę&nbsp;&nbsp;&rarr;</a>
                </td>
              </tr>
            </table>
            ${paragraph('PDF znajdziesz też w&nbsp;załączniku.', `font-size:14px;line-height:22px;color:${MUTED};margin-bottom:36px;`)}
            ${paragraph('Jeżeli po przeczytaniu pomyślisz, że może mieć to sens u&nbsp;Was, odpisz na tego maila.')}
            ${paragraph('Najpierw pogadamy.', 'margin-bottom:40px;')}
            <p style="margin:0;font-family:${FONT};font-size:16px;line-height:24px;font-weight:600;color:${INK};">${NAME}</p>
            <p style="margin:4px 0 0;font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED};">${AREAS}</p>
            <p style="margin:4px 0 0;font-family:${FONT};font-size:13px;line-height:20px;"><a href="${SITE_URL}" target="_blank" style="color:${MUTED};text-decoration:none;">${SITE}</a></p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

/** Powiadomienie dla Damiana: zwykły tekst, adres wyłącznie w treści tekstowej. */
export function notificationText(email: string, date: Date, source: OfferSource): string {
  const when = new Intl.DateTimeFormat('pl-PL', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/Warsaw',
  }).format(date)
  const origin = [
    source.page ?? '/poznaj-czlowieka',
    ...(['utm_source', 'utm_medium', 'utm_campaign'] as const)
      .filter(key => source[key])
      .map(key => `${key}=${source[key]}`),
  ].join(', ')
  return [
    'Ktoś poprosił o ofertę warsztatu.',
    '',
    'Email:',
    email,
    '',
    'Data:',
    when,
    '',
    'Źródło:',
    origin,
    '',
    'Odpowiedz na tego maila, żeby napisać bezpośrednio do tej osoby.',
  ].join('\n')
}
