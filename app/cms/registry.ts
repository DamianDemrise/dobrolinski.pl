/**
 * Rejestr bloków: typ bloku → istniejący komponent sekcji.
 * Obszar (region) każdego typu: cms/regions.ts. Komponent dostaje props bloku jako `data`.
 */
import type { Component } from 'vue'
import { blockRegions } from '~~/cms/regions'
import type { BlockType } from '~~/cms/types'
import BackLink from '~/components/BackLink.vue'
import ContactLinks from '~/components/ContactLinks.vue'
import CurrentProjectLink from '~/components/CurrentProjectLink.vue'
import EbookContents from '~/components/EbookContents.vue'
import EbookForm from '~/components/EbookForm.vue'
import EbookHero from '~/components/EbookHero.vue'
import HomeStage from '~/components/HomeStage.vue'
import PrivacyDocument from '~/components/PrivacyDocument.vue'
import SiteFooter from '~/components/SiteFooter.vue'
import WorkshopAbout from '~/components/WorkshopAbout.vue'
import WorkshopAudience from '~/components/WorkshopAudience.vue'
import WorkshopBeliefs from '~/components/WorkshopBeliefs.vue'
import WorkshopClosing from '~/components/WorkshopClosing.vue'
import WorkshopHero from '~/components/WorkshopHero.vue'
import WorkshopManifest from '~/components/WorkshopManifest.vue'
import WorkshopParts from '~/components/WorkshopParts.vue'
import WorkshopProcess from '~/components/WorkshopProcess.vue'
import WorkshopProgram from '~/components/WorkshopProgram.vue'

export const blockRegistry: Record<BlockType, Component> = {
  'home-stage': HomeStage,
  'current-project': CurrentProjectLink,
  'contact-links': ContactLinks,
  'site-footer': SiteFooter,
  'back-link': BackLink,
  'workshop-hero': WorkshopHero,
  'workshop-manifest': WorkshopManifest,
  'workshop-program': WorkshopProgram,
  'workshop-beliefs': WorkshopBeliefs,
  'workshop-parts': WorkshopParts,
  'workshop-about': WorkshopAbout,
  'workshop-audience': WorkshopAudience,
  'workshop-process': WorkshopProcess,
  'workshop-closing': WorkshopClosing,
  'privacy-document': PrivacyDocument,
  'ebook-hero': EbookHero,
  'ebook-contents': EbookContents,
  'ebook-form': EbookForm,
}

export const isBlockType = (type: string): type is BlockType => Object.hasOwn(blockRegistry, type)

export const regionOf = (type: string): string | undefined => (isBlockType(type) ? blockRegions[type] : undefined)
