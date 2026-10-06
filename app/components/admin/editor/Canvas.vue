<!--
  Canvas: iframe /admin/frame o szerokości urządzenia (1440/834/390 px), przeskalowany
  transformacją do dostępnego miejsca (media queries działają, bo viewport iframe ma tę szerokość).
  Wysyła stan (cms:state) po każdej zmianie, odbiera zdarzenia z canvasu i przekazuje je w górę.
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { CanvasTarget, FrameMessage, ParentMessage } from '~/admin/editor/protocol'
import { DEVICE_HEIGHTS, DEVICE_WIDTHS, isFrameMessage, plain } from '~/admin/editor/protocol'
import type { EditorStore } from '~/admin/editor/store'

const props = defineProps<{ editor: EditorStore }>()
const emit = defineEmits<{
  select: [target: CanvasTarget]
  input: [target: CanvasTarget, value: string, commit: boolean]
  pickImage: [target: CanvasTarget]
  shortcut: [action: 'undo' | 'redo']
}>()

const area = ref<HTMLElement | null>(null)
const iframe = ref<HTMLIFrameElement | null>(null)
const size = ref({ width: 1000, height: 700 })
const ready = ref(false)

const device = computed(() => props.editor.state.device)
const deviceWidth = computed(() => DEVICE_WIDTHS[device.value])
const scale = computed(() => Math.min(1, Math.max(0.2, (size.value.width - 32) / deviceWidth.value)))
/** Wysokość viewportu iframe: wypełnia widoczny obszar (strona używa 100vh). */
const frameHeight = computed(() => Math.max(DEVICE_HEIGHTS[device.value] * 0.6, (size.value.height - 32) / scale.value))

function send(message: ParentMessage) {
  const win = iframe.value?.contentWindow
  if (win && ready.value) win.postMessage(message, location.origin)
}

watch(() => props.editor.frameState.value, (state) => {
  if (state) send({ type: 'cms:state', state: plain(state) })
})

function onMessage(event: MessageEvent) {
  if (event.origin !== location.origin || !iframe.value || event.source !== iframe.value.contentWindow) return
  if (!isFrameMessage(event.data)) return
  const message: FrameMessage = event.data
  switch (message.type) {
    case 'cms:ready':
      ready.value = true
      if (props.editor.frameState.value) send({ type: 'cms:state', state: plain(props.editor.frameState.value) })
      break
    case 'cms:select':
      emit('select', message.target)
      break
    case 'cms:input':
      emit('input', message.target, String(message.value), message.commit === true)
      break
    case 'cms:pick-image':
      emit('pickImage', message.target)
      break
    case 'cms:shortcut':
      emit('shortcut', message.action === 'redo' ? 'redo' : 'undo')
      break
  }
}

function scrollTo(target: CanvasTarget) {
  send({ type: 'cms:scroll-to', target: plain(target) })
}
defineExpose({ scrollTo })

let observer: ResizeObserver | undefined
onMounted(() => {
  window.addEventListener('message', onMessage)
  observer = new ResizeObserver(([entry]) => {
    if (entry) size.value = { width: entry.contentRect.width, height: entry.contentRect.height }
  })
  if (area.value) observer.observe(area.value)
})
onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage)
  observer?.disconnect()
})
</script>

<template>
  <section ref="area" class="ed-canvas" aria-label="Podgląd strony (canvas)">
    <span class="ed-canvas__label">{{ deviceWidth }} px · {{ Math.round(scale * 100) }}%</span>
    <div
      class="ed-canvas__stage"
      :style="{ width: `${deviceWidth * scale}px`, height: `${frameHeight * scale}px` }"
    >
      <iframe
        ref="iframe"
        src="/admin/frame"
        title="Canvas edytora: strona w trybie edycji"
        :style="{ width: `${deviceWidth}px`, height: `${frameHeight}px`, transform: `scale(${scale})` }"
      />
    </div>
  </section>
</template>
