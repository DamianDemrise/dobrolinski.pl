/**
 * dobrolinski.pl: kształt danych bloków i globali (TypeScript).
 * Definicje pól dla edytora i walidacji są w schema.ts; oba pliki muszą się zgadzać
 * (sprawdza to test schematu na content/published.json).
 */

export interface ListItem { _id: string }

export interface AreaItem extends ListItem {
  label: string
  slug: string
  thought: string
}

export interface SiteGlobal {
  name: string
  url: string
  email: string
  phoneDisplay: string
  phoneHref: string
  /** Numer w formacie E.164 dla danych strukturalnych. */
  telephone: string
  areas: AreaItem[]
  thoughts: string[]
  consent: {
    label: string
    text: string
    accept: string
    reject: string
    reopen: string
  }
  legal: {
    privacyLabel: string
    privacyHref: string
  }
}

export interface WorkshopGlobal {
  number: string
  name: string
  path: string
  mailSubject: string
  title: string
  subtitle: string
  format: { duration: string, audience: string, type: string, group: string }
  regularPrice: { amount: number, currency: string, net: boolean, label: string }
  priceIncludes: string[]
  /** Nie renderowane na stronie; zostaje do oferty PDF. */
  outcomes: { intro: string, items: (ListItem & { lines: string[] })[], conclusion: string }
}

export interface Globals {
  site: SiteGlobal
  workshop: WorkshopGlobal
}

/* Bloki */

export interface HomeStageProps { navLabel: string }
export interface CurrentProjectProps { label: string, lead: string }
export interface ContactLinksProps { trackPlace: string }
export interface SiteFooterProps { poweredLabel: string, poweredBrand: string, poweredHref: string, newTabNote: string }
export interface BackLinkProps { label: string, href: string, trackPlace: string }

export interface WorkshopHeroProps {
  titleLines: string[]
  lead: string
  descriptionLines: string[]
  meta: (ListItem & { label: string, lines: string[] })[]
  cta: string
  more: string
  image: { src: string, alt: string, width: number, height: number }
}

export interface WorkshopManifestProps {
  quietLine: string
  strongLine: string
  followLines: string[]
  noScript: { title: string, lines: string[], reason: string, statement: string }
}

export interface WorkshopProgramProps {
  eyebrow: string
  topics: (ListItem & { number: string, titleLines: string[], textLines: string[] })[]
}

export interface WorkshopBeliefsProps {
  eyebrow: string
  items: (ListItem & { line: string, quiet: string })[]
}

export interface WorkshopPartsProps {
  ariaLabel: string
  parts: (ListItem & { number: string, name: string, lines: string[], closing: string })[]
  stories: {
    quietLine: string
    strongLine: string
    caption: string
    situations: (ListItem & { lines: string[] })[]
  }
}

export interface WorkshopAboutProps {
  titleLines: string[]
  paragraphs: (ListItem & { lines: string[] })[]
}

export interface WorkshopAudienceProps {
  eyebrow: string
  titleLines: string[]
  people: string[]
  detailsLines: string[]
}

export interface WorkshopProcessProps {
  title: string
  steps: (ListItem & { label: string, lead: string, lines: string[], note: string })[]
  groundRules: { eyebrow: string, items: (ListItem & { lines: string[] })[] }
  priceIncludesLabel: string
}

export interface WorkshopOfferCopy {
  title: string
  lines: string[]
  label: string
  placeholder: string
  submit: string
  sending: string
  note: { text: string, link: string }
  success: { title: string, text: string, hint: string }
  errors: { empty: string, invalid: string, failed: string, failedHint: string }
}

export interface WorkshopClosingProps {
  title: string
  paragraphs: string[]
  cta: string
  offer: WorkshopOfferCopy
  epilogue: string[]
}

export interface PrivacyBlockItem extends ListItem {
  kind: 'text' | 'list'
  text?: string
  items?: string[]
}

export interface PrivacyDocumentProps {
  title: string
  site: string
  effectiveDateLabel: string
  effectiveDate: string
  sections: (ListItem & { anchor: string, title: string, blocks: PrivacyBlockItem[] })[]
}

/* Ebook „Na końcu jest człowiek” */

export interface EbookHeroProps {
  eyebrow: string
  titleLines: string[]
  leadLines: string[]
}

export interface EbookContentsProps {
  eyebrow: string
  items: (ListItem & { number: string, title: string })[]
}

/** Teksty formularza ebooka: jak oferta, ale zgoda jako jeden tekst z linkami [[adres|etykieta]]. */
export interface EbookFormProps extends Omit<WorkshopOfferCopy, 'note'> {
  consent: string
}

export interface BlockPropsMap {
  'home-stage': HomeStageProps
  'current-project': CurrentProjectProps
  'contact-links': ContactLinksProps
  'site-footer': SiteFooterProps
  'back-link': BackLinkProps
  'workshop-hero': WorkshopHeroProps
  'workshop-manifest': WorkshopManifestProps
  'workshop-program': WorkshopProgramProps
  'workshop-beliefs': WorkshopBeliefsProps
  'workshop-parts': WorkshopPartsProps
  'workshop-about': WorkshopAboutProps
  'workshop-audience': WorkshopAudienceProps
  'workshop-process': WorkshopProcessProps
  'workshop-closing': WorkshopClosingProps
  'privacy-document': PrivacyDocumentProps
  'ebook-hero': EbookHeroProps
  'ebook-contents': EbookContentsProps
  'ebook-form': EbookFormProps
}

export type BlockType = keyof BlockPropsMap

/** Dodatkowe pole SEO tej strony (opis obrazu OG), poza wspólnym SeoFields. */
export interface SeoExtra { ogImageAlt?: string }
