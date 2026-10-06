/**
 * Mail z ebookiem „Na końcu jest człowiek”. Ten sam ciemny styl co oferta, jedna kolumna.
 * PDF idzie wyłącznie jako załącznik (z OFFER_KV), bez publicznego linku.
 */
import { AREAS, body, divider, DIM, FONT, GREY, INK, NAME, PAPER, SITE, SITE_URL, text } from './templates.ts'

export const EBOOK_SUBJECT = 'Na końcu jest człowiek — ebook'
export const EBOOK_PREHEADER = 'Ebook w załączniku.'
export const EBOOK_NOTIFICATION_SUBJECT = 'Nowe pobranie — ebook Na końcu jest człowiek'

/** Nazwa pliku i liczba stron pokazywane w treści. Przy podmianie PDF sprawdź liczbę stron. */
export const EBOOK_ATTACHMENT = { filename: 'na-koncu-jest-czlowiek.pdf', pages: 18 } as const

export function ebookText(): string {
  return [
    'EBOOK',
    'Na końcu jest człowiek.',
    '',
    'Cześć,',
    '',
    'zgodnie z prośbą przesyłam ebook „Na końcu jest człowiek”.',
    'Znajdziesz go w załączniku do tej wiadomości.',
    '',
    `Ebook w załączniku: ${EBOOK_ATTACHMENT.filename} (PDF, ${EBOOK_ATTACHMENT.pages} stron)`,
    '',
    'Jeżeli po przeczytaniu będziesz mieć pytania, po prostu odpisz na tego maila.',
    '',
    NAME,
    AREAS,
    SITE,
  ].join('\n')
}

export function ebookHtml(): string {
  return `<!doctype html>
<html lang="pl" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${EBOOK_SUBJECT}</title>
<style>
  :root { color-scheme: light dark; }
  @media (max-width: 600px) {
    .page { padding: 38px 24px 44px !important; }
    .hero { font-size: 44px !important; line-height: 44px !important; letter-spacing: -1.2px !important; }
    .body p { font-size: 17px !important; line-height: 26px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${PAPER};-webkit-text-size-adjust:100%;" bgcolor="${PAPER}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${EBOOK_PREHEADER}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PAPER}" style="background-color:${PAPER};">
  <tr>
    <td align="center" bgcolor="${PAPER}" style="padding:0;background-color:${PAPER};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr>
          <td class="page" bgcolor="${PAPER}" style="padding:52px 56px 56px;background-color:${PAPER};">
            <p style="margin:0 0 32px;font-family:${FONT};font-size:12px;line-height:16px;letter-spacing:2.5px;color:${GREY};">EBOOK</p>
            <h1 class="hero" style="margin:0;font-family:${FONT};font-size:58px;line-height:58px;font-weight:400;letter-spacing:-1.6px;color:${INK};">Na końcu<br><span style="color:${GREY};">jest człowiek.</span></h1>
            ${divider('34px 0 38px', 'd1')}
            <div class="body">
              ${body('Cześć,')}
              ${body('zgodnie z prośbą przesyłam ebook „Na&nbsp;końcu jest człowiek”.')}
              ${body('Znajdziesz go w załączniku do tej wiadomości.', 0)}
            </div>
            ${divider('32px 0 24px', 'd2')}
            ${text('EBOOK W ZAŁĄCZNIKU', `font-size:11px;line-height:16px;letter-spacing:2.5px;color:${DIM};margin:0 0 10px;`)}
            ${text(EBOOK_ATTACHMENT.filename, `font-size:17px;line-height:24px;font-weight:500;color:${INK};margin:0 0 2px;`)}
            ${text(`PDF &middot; ${EBOOK_ATTACHMENT.pages} stron`, `font-size:14px;line-height:20px;color:${DIM};margin:0;`)}
            ${divider('38px 0 34px', 'd3')}
            <div class="body">
              ${body('Jeżeli po przeczytaniu będziesz mieć pytania, po prostu odpisz na tego maila.', 36)}
            </div>
            ${text(NAME, `font-size:18px;line-height:24px;font-weight:700;color:${INK};margin:0 0 6px;`)}
            ${text(AREAS, `font-size:14px;line-height:21px;color:${GREY};margin:0 0 2px;`)}
            ${text(`<a href="${SITE_URL}" target="_blank" style="color:${GREY};text-decoration:none;white-space:nowrap;">${SITE}</a>`, `font-size:14px;line-height:21px;color:${GREY};margin:0;`)}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}
