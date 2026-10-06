<!--
  Region komunikatów (aria-live="polite"). Wstaw raz w układzie strony panelu: <Toasts />.
  Komunikaty dodaje useAdminToast().show(message, tone) z app/admin/toast.ts.
-->
<script setup lang="ts">
import { useAdminToast } from '~/admin/toast'

const { toasts, dismiss } = useAdminToast()
</script>

<template>
  <Teleport to="body">
    <div class="adm adm-toasts" role="status" aria-live="polite">
      <div v-for="toast in toasts" :key="toast.id" class="adm-toast" :class="`adm-toast--${toast.tone}`">
        <p>{{ toast.message }}</p>
        <button type="button" aria-label="Zamknij komunikat" @click="dismiss(toast.id)">×</button>
      </div>
    </div>
  </Teleport>
</template>
