/** Zastępuje komponenty sekcji (.vue) w testach renderera: jeden <div> na blok. */
import { defineComponent, h } from 'vue'

export default defineComponent({
  name: 'BlockStub',
  props: { data: { type: Object, required: true } },
  setup: () => () => h('div', { class: 'block-stub' }),
})
