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
// Ciemny editorial jak dobrolinski.pl. Kolory także w bgcolor (Outlook).
const PAPER = '#080808'
const INK = '#f5f5f3'
const BODY = '#e8e8e5'
const GREY = '#888888'
const DIM = '#777777'
const LINE = '#262626'
const BUTTON = '#f2f2ef'
const BUTTON_INK = '#0a0a0a'

/** Nazwa pliku i liczba stron pokazywane w treści. Przy podmianie PDF sprawdź liczbę stron. */
export const OFFER_ATTACHMENT = { filename: 'poznaj-czlowieka-oferta.pdf', pages: 9 } as const

export function offerText(pdfUrl: string): string {
  return [
    '01 / POZNAJ CZŁOWIEKA',
    'Oferta warsztatu.',
    '',
    'Cześć,',
    '',
    'zgodnie z prośbą przesyłam ofertę warsztatu „Poznaj Człowieka”.',
    'Znajdziesz ją w załączniku do tej wiadomości.',
    '',
    `Oferta w załączniku: ${OFFER_ATTACHMENT.filename} (PDF, ${OFFER_ATTACHMENT.pages} stron)`,
    `Otwórz ofertę: ${pdfUrl}`,
    '',
    'Jeżeli po przeczytaniu będziesz mieć pytania albo uznasz, że może to mieć sens u Was, po prostu odpisz na tego maila.',
    '',
    'Najpierw pogadamy.',
    '',
    NAME,
    AREAS,
    SITE,
  ].join('\n')
}

const text = (content: string, style: string) =>
  `<p style="margin:0;font-family:${FONT};${style}">${content}</p>`

const divider = (space: string, cls: string, extra = '') =>
  `<table class="${cls}" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:${space};${extra}"><tr><td style="border-top:1px solid ${LINE};font-size:0;line-height:0;height:1px;">&nbsp;</td></tr></table>`

const body = (content: string, bottom = 20, color = BODY) =>
  text(content, `font-size:18px;line-height:28px;color:${color};margin:0 0 ${bottom}px;`)

export function offerHtml(pdfUrl: string): string {
  const href = encodeURI(pdfUrl)
  return `<!doctype html>
<html lang="pl" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${OFFER_SUBJECT}</title>
<style>
  :root { color-scheme: light dark; }
  @media (max-width: 600px) {
    .page { padding: 38px 24px 44px !important; }
    .eyebrow { margin-bottom: 18px !important; }
    .hero { font-size: 44px !important; line-height: 44px !important; letter-spacing: -1.2px !important; }
    .d1 { display: table !important; margin: 30px 0 32px !important; }
    .d2 { margin: 30px 0 22px !important; }
    .d3 { margin: 28px 0 32px !important; }
    .body p { font-size: 17px !important; line-height: 26px !important; margin-bottom: 20px !important; }
    .body p.last { margin-bottom: 0 !important; }
    .sig { margin-top: 36px !important; }
    .col { display: block !important; width: 100% !important; max-width: 100% !important; }
    .gap { padding-right: 0 !important; }
    .claim { display: none !important; }
  }
  @media (max-width: 360px) {
    .page { padding: 36px 20px 40px !important; }
    .areas { font-size: 13px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${PAPER};-webkit-text-size-adjust:100%;" bgcolor="${PAPER}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${OFFER_PREHEADER}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PAPER}" style="background-color:${PAPER};">
  <tr>
    <td align="center" bgcolor="${PAPER}" style="padding:0;background-color:${PAPER};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:860px;">
        <tr>
          <td class="page" bgcolor="${PAPER}" style="padding:52px 56px 56px;background-color:${PAPER};">
            <p class="eyebrow" style="margin:0 0 32px;font-family:${FONT};font-size:12px;line-height:16px;letter-spacing:2.5px;color:${GREY};">01 / POZNAJ CZŁOWIEKA</p>
            <div style="font-size:0;line-height:0;">
            <div class="col" style="display:inline-block;vertical-align:top;width:100%;max-width:340px;">
              <div class="gap" style="padding-right:48px;">
                <h1 class="hero" style="margin:0;font-family:${FONT};font-size:58px;line-height:58px;font-weight:400;letter-spacing:-1.6px;color:${INK};">Oferta<br><span style="color:${GREY};">warsztatu.</span></h1>
                <p class="claim" style="margin:60px 0 0;font-family:${FONT};font-size:24px;line-height:29px;font-weight:400;letter-spacing:-0.3px;color:#777777;">Na końcu każdej sprzedaży<br>jest człowiek.</p>
              </div>
            </div><div class="col" style="display:inline-block;vertical-align:top;width:100%;max-width:408px;">
            ${divider('34px 0 38px', 'd1', 'display:none;')}
            <div class="body">
              ${body('Cześć,')}
              ${body('zgodnie z prośbą przesyłam ofertę warsztatu „Poznaj&nbsp;Człowieka”.')}
              ${body('Znajdziesz ją w załączniku do tej wiadomości.', 0).replace('<p ', '<p class="last" ')}
            </div>
            ${divider('32px 0 24px', 'd2')}
            ${text('OFERTA W ZAŁĄCZNIKU', `font-size:11px;line-height:16px;letter-spacing:2.5px;color:${DIM};margin:0 0 10px;`)}
            ${text(OFFER_ATTACHMENT.filename, `font-size:17px;line-height:24px;font-weight:500;color:${INK};margin:0 0 2px;`)}
            ${text(`PDF &middot; ${OFFER_ATTACHMENT.pages} stron`, `font-size:14px;line-height:20px;color:${DIM};margin:0 0 20px;`)}
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0;">
              <tr>
                <td bgcolor="${BUTTON}" style="background-color:${BUTTON};border-radius:1px;">
                  <a href="${href}" target="_blank" style="display:inline-block;padding:15px 22px;font-family:${FONT};font-size:15px;line-height:16px;font-weight:600;letter-spacing:0.3px;color:${BUTTON_INK};text-decoration:none;white-space:nowrap;">Otwórz ofertę&nbsp;&nbsp;&nbsp;&rarr;</a>
                </td>
              </tr>
            </table>
            </div>
            </div>
            ${divider('44px 0 38px', 'd3')}
            <div style="font-size:0;line-height:0;">
            <div class="col" style="display:inline-block;vertical-align:top;width:100%;max-width:340px;">
            <div class="gap body" style="padding-right:48px;">
              ${body('Jeżeli po przeczytaniu będziesz mieć pytania albo uznasz, że może to mieć sens u&nbsp;Was, po prostu odpisz na tego maila.')}
              ${body('Najpierw pogadamy.', 0, INK).replace('<p ', '<p class="last" ')}
            </div>
            </div><div class="col" style="display:inline-block;vertical-align:top;width:100%;max-width:408px;">
            <table class="sig" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0;"><tr><td>
              ${text(NAME, `font-size:18px;line-height:24px;font-weight:700;color:${INK};margin:0 0 6px;`)}
              <p class="areas" style="margin:0 0 2px;font-family:${FONT};font-size:14px;line-height:21px;color:${GREY};">${AREAS}</p>
              ${text(`<a href="${SITE_URL}" target="_blank" style="color:${GREY};text-decoration:none;white-space:nowrap;">${SITE}</a>`, `font-size:14px;line-height:21px;color:${GREY};margin:0;`)}
            </td></tr></table>
            </div>
            </div>
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
