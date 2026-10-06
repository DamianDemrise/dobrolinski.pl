<!-- Pole 'tokenColor': wybór nazwy tokenu koloru (próbki z tokenów, nigdy HEX). -->
<script setup lang="ts">
import type { TokensDocument } from '@demrise/cms-core'

defineProps<{ id: string, label: string, value: string, allowed: string[], tokens?: TokensDocument, disabled: boolean }>()
const emit = defineEmits<{ update: [value: string] }>()
</script>

<template>
  <div :id="id" class="adm-swatches" role="radiogroup" :aria-label="label">
    <label v-for="name in allowed" :key="name" class="adm-swatch" :class="{ 'is-active': value === name }">
      <input type="radio" class="adm-sr" :name="id" :value="name" :checked="value === name" :disabled="disabled" @change="emit('update', name)">
      <span class="adm-swatch__chip" :style="{ background: tokens?.colors[name]?.value ?? 'transparent' }" aria-hidden="true" />
      <span>{{ tokens?.colors[name]?.label ?? name }}</span>
    </label>
  </div>
</template>
