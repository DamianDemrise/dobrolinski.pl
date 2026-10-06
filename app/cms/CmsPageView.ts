/**
 * Strona CMS: wybiera powłokę layoutu wg `page.layout` i przekazuje jej dokument.
 * Publicznie używają jej pages/*.vue; edytor renderuje nią draft (w CMS_EDIT_CONTEXT).
 */
import type { PageDocument } from '@demrise/cms-core'
import type { Component, PropType } from 'vue'
import { defineComponent, h } from 'vue'
import type { LayoutName } from '~~/cms/regions'
import EbookView from '~/components/EbookView.vue'
import HomeView from '~/components/HomeView.vue'
import PrivacyView from '~/components/PrivacyView.vue'
import WorkshopView from '~/components/WorkshopView.vue'

export const layoutRegistry: Record<LayoutName, Component> = {
  home: HomeView,
  workshop: WorkshopView,
  document: PrivacyView,
  ebook: EbookView,
}

export default defineComponent({
  name: 'CmsPageView',
  props: { page: { type: Object as PropType<PageDocument>, required: true } },
  setup(props) {
    return () => {
      const layout = Object.hasOwn(layoutRegistry, props.page.layout) ? layoutRegistry[props.page.layout as LayoutName] : undefined
      if (!layout) throw new Error(`Nieznany layout "${props.page.layout}"`)
      return h(layout, { page: props.page })
    }
  },
})
