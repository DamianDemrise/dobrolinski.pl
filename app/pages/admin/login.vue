<script setup lang="ts">
import { computed, ref } from 'vue'
import '~/admin/admin.css'
import { cmsApi } from '~/admin/api'
import { errorMessage } from '~/admin/format'
import Button from '~/components/admin/ui/Button.vue'
import Field from '~/components/admin/ui/Field.vue'

useHead({ title: 'Logowanie · DEMRISE CMS', meta: [{ name: 'robots', content: 'noindex' }] })

const route = useRoute()
const email = ref('')
const sending = ref(false)
const sent = ref(false)
const error = ref('')
const linkError = computed(() => (route.query.error === 'link' ? 'Link logowania wygasł albo został już użyty. Poproś o nowy.' : ''))

async function submit() {
  error.value = ''
  if (!/^\S+@\S+\.\S+$/.test(email.value.trim())) {
    error.value = 'Wpisz poprawny adres e-mail'
    return
  }
  sending.value = true
  try {
    await cmsApi.post('/api/auth/request', { email: email.value.trim() })
    sent.value = true
  }
  catch (e) {
    error.value = errorMessage(e)
  }
  finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="adm adm-root">
    <main class="adm-login">
      <form class="adm-card" novalidate @submit.prevent="submit">
        <div>
          <h1>DEMRISE CMS</h1>
          <p class="adm-muted">Logowanie linkiem wysyłanym na e-mail.</p>
        </div>
        <p v-if="linkError" class="adm-alert adm-alert--danger" role="alert">{{ linkError }}</p>
        <p v-if="sent" class="adm-alert adm-alert--neutral" role="status">
          Jeśli adres jest w systemie, wysłaliśmy link logowania. Link działa 15 minut.
        </p>
        <Field label="Adres e-mail" :error="error">
          <template #default="{ id, describedBy, invalid }">
            <input
              :id="id"
              v-model="email"
              class="adm-input"
              type="email"
              autocomplete="email"
              required
              :aria-describedby="describedBy"
              :aria-invalid="invalid"
            >
          </template>
        </Field>
        <Button type="submit" variant="primary" :loading="sending">Wyślij link logowania</Button>
      </form>
    </main>
  </div>
</template>
