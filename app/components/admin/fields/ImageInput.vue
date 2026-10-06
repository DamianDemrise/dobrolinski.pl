<!-- Pole 'image': podgląd, „Zmień” (MediaPicker), ALT. -->
<script setup lang="ts">
import type { ImageValue } from '@demrise/cms-core'
import { ref } from 'vue'
import Button from '~/components/admin/ui/Button.vue'
import MediaPicker from './MediaPicker.vue'

const props = defineProps<{ id: string, value: ImageValue | undefined, disabled: boolean, required?: boolean, describedBy?: string }>()
const emit = defineEmits<{ update: [value: ImageValue | undefined] }>()

const picker = ref(false)
const onPick = (image: ImageValue) => emit('update', { ...image, alt: image.alt || props.value?.alt || '' })
</script>

<template>
  <div class="adm-image" role="group" :aria-describedby="describedBy">
    <div class="adm-image__preview">
      <img v-if="value?.src" :src="value.src" :alt="value.alt" loading="lazy">
      <span v-else class="adm-muted">Brak obrazu</span>
    </div>
    <div class="adm-stack" style="gap: 6px">
      <p v-if="value?.width && value?.height" class="adm-muted">{{ value.width }}×{{ value.height }} px</p>
      <div v-if="!disabled" class="adm-row">
        <Button :id="id" size="sm" @click="picker = true">Zmień</Button>
        <Button v-if="value && !required" size="sm" variant="ghost" @click="emit('update', undefined)">Usuń</Button>
      </div>
      <label class="adm-field__label" :for="`${id}-alt`">Tekst alternatywny (ALT)</label>
      <input
        :id="`${id}-alt`"
        class="adm-input"
        type="text"
        :value="value?.alt ?? ''"
        :readonly="disabled || !value"
        @input="value && emit('update', { ...value, alt: ($event.target as HTMLInputElement).value })"
      >
    </div>
    <MediaPicker v-model:open="picker" :current-alt="value?.alt" @select="onPick" />
  </div>
</template>
