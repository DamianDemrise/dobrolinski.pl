<!--
  Dialog modalny. <Dialog v-model:open="open" title="Tytuł" :wide>treść<template #footer>przyciski</template></Dialog>
  role="dialog" + aria-modal, fokus w środku (pułapka Tab), Esc i klik w tło zamykają,
  po zamknięciu fokus wraca do elementu, który był aktywny przed otwarciem.
  closable=false: bez Esc/tła/krzyżyka (np. konflikt, który wymaga decyzji).
  drawer: panel wysuwany z prawej krawędzi (np. historia wersji).
-->
<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'

const props = withDefaults(defineProps<{ title: string, wide?: boolean, closable?: boolean, drawer?: boolean }>(), { wide: false, closable: true, drawer: false })
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ close: [] }>()

const titleId = `dlg-${useId()}`
const panel = ref<HTMLElement | null>(null)
let returnFocus: HTMLElement | null = null

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function close() {
  if (!props.closable) return
  open.value = false
  emit('close')
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    close()
    return
  }
  if (event.key !== 'Tab' || !panel.value) return
  const items = [...panel.value.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(el => el.offsetParent !== null || el === document.activeElement)
  if (!items.length) {
    event.preventDefault()
    panel.value.focus()
    return
  }
  const first = items[0]!
  const last = items[items.length - 1]!
  if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.value)) {
    event.preventDefault()
    last.focus()
  }
  else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(open, async (value) => {
  if (value) {
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    await nextTick()
    const target = panel.value?.querySelector<HTMLElement>('[autofocus]') ?? panel.value?.querySelector<HTMLElement>(FOCUSABLE) ?? panel.value
    target?.focus()
  }
  else {
    const el = returnFocus
    returnFocus = null
    await nextTick()
    if (el?.isConnected) el.focus()
  }
}, { immediate: true })

onBeforeUnmount(() => {
  if (open.value && returnFocus?.isConnected) returnFocus.focus()
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="adm adm-layer" :class="{ 'adm-layer--drawer': drawer }" @mousedown.self="close" @keydown="onKeydown">
      <div
        ref="panel"
        class="adm-dialog"
        :class="{ 'adm-dialog--wide': wide, 'adm-dialog--drawer': drawer }"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        tabindex="-1"
      >
        <div class="adm-dialog__head">
          <h2 :id="titleId">{{ title }}</h2>
          <button v-if="closable" type="button" class="adm-btn adm-btn--ghost adm-btn--sm" aria-label="Zamknij" @click="close">✕</button>
        </div>
        <div class="adm-dialog__body">
          <slot />
        </div>
        <div v-if="$slots.footer" class="adm-dialog__foot">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
