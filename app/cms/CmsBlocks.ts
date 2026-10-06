/**
 * Renderer bloków jednego obszaru layoutu (np. 'main'): rozwiązuje instancje komponentów
 * globalnych (resolveBlocks z rdzenia), pomija ukryte, dodaje klasy widoczności tylko gdy
 * są ustawione i renderuje komponent z rejestru z `data` = props bloku. Bez własnego DOM.
 */
import { resolveBlocks, visibilityClasses } from '@demrise/cms-core'
import type { PageDocument, ResolvedBlock } from '@demrise/cms-core'
import type { PropType, VNode } from 'vue'
import { Fragment, defineComponent, getCurrentInstance, h, onMounted, onUpdated, provide } from 'vue'
import { CMS_BLOCK_SCOPE, useCmsEditContext, useCmsSite } from './context'
import { blockRegistry, isBlockType, regionOf } from './registry'

/** Elementy korzenia bloku (komponent może mieć kilka korzeni). */
function rootElements(vnode: VNode | undefined): Element[] {
  if (!vnode) return []
  if (vnode.component) return rootElements(vnode.component.subTree)
  if (typeof vnode.type === 'string') return vnode.el instanceof Element ? [vnode.el] : []
  if (vnode.type === Fragment && Array.isArray(vnode.children)) return (vnode.children as VNode[]).flatMap(rootElements)
  return []
}

/** Zakres jednego bloku: provide dla v-cms, potem komponent sekcji. */
const CmsBlockScope = defineComponent({
  name: 'CmsBlockScope',
  props: { block: { type: Object as PropType<ResolvedBlock>, required: true } },
  setup(props) {
    provide(CMS_BLOCK_SCOPE, {
      get id() { return props.block.id },
      get type() { return props.block.type },
      get globalRef() { return props.block.globalRef },
    })
    // Tylko w trybie edycji: korzenie bloku dostają data-cms-block-root / data-cms-block-type.
    if (useCmsEditContext()) {
      const instance = getCurrentInstance()
      const mark = () => {
        for (const el of rootElements(instance?.subTree)) {
          el.setAttribute('data-cms-block-root', props.block.id)
          el.setAttribute('data-cms-block-type', props.block.type)
        }
      }
      onMounted(mark)
      onUpdated(mark)
    }
    return () => {
      const { block } = props
      if (!isBlockType(block.type)) return null
      const classes = visibilityClasses(block.visibility)
      return h(blockRegistry[block.type], classes.length ? { data: block.props, class: classes } : { data: block.props })
    }
  },
})

export default defineComponent({
  name: 'CmsBlocks',
  props: {
    page: { type: Object as PropType<PageDocument>, required: true },
    region: { type: String, required: true },
  },
  setup(props) {
    const site = useCmsSite()
    const edit = useCmsEditContext()
    return () => resolveBlocks(props.page.blocks, site.value.components)
      .filter(block => regionOf(block.type) === props.region && (!block.hidden || edit?.showHidden?.value === true))
      .map(block => h(CmsBlockScope, { key: block.id, block }))
  },
})
