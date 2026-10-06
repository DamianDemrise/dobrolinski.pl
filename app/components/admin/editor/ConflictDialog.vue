<!-- 409 przy autosave: ktoś zapisał nowszą wersję. Decyzja: wczytaj serwer albo nadpisz. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { EditorStore } from '~/admin/editor/store'
import { formatDate } from '~/admin/format'
import Button from '~/components/admin/ui/Button.vue'
import Dialog from '~/components/admin/ui/Dialog.vue'

const props = defineProps<{ editor: EditorStore }>()
const conflict = computed(() => props.editor.state.conflict)
const open = computed({ get: () => conflict.value !== null, set: () => {} })
</script>

<template>
  <Dialog v-model:open="open" title="Konflikt wersji" :closable="false">
    <div class="adm-stack">
      <p>
        Ktoś inny (albo inna karta) zapisał nowszą wersję „{{ conflict?.server.title }}”
        {{ conflict ? formatDate(conflict.server.updatedAt) : '' }}. Twoje ostatnie zmiany nie zostały zapisane.
      </p>
      <p class="adm-muted">„Wczytaj aktualną wersję” porzuca Twoje niezapisane zmiany (możesz je cofnąć ⌘Z / Ctrl+Z i zapisać ponownie). „Nadpisz moją wersją” zastępuje zmiany drugiej osoby.</p>
    </div>
    <template #footer>
      <Button @click="editor.resolveConflict('reload')">Wczytaj aktualną wersję</Button>
      <Button variant="danger" @click="editor.resolveConflict('overwrite')">Nadpisz moją wersją</Button>
    </template>
  </Dialog>
</template>
