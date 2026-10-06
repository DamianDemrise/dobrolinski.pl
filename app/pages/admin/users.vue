<!--
  Użytkownicy (USERS_MANAGE): lista, dodanie (e-mail, imię, rola), zmiana imienia i roli,
  wyłączenie/włączenie i usunięcie. Reguły pilnuje Worker (ostatni właściciel, rola developer
  tylko od developera, bez zmiany własnej roli); UI pokazuje tylko dozwolone opcje i błędy API.
-->
<script setup lang="ts">
import { adminAuth } from '~/admin/auth-guard'
import type { CmsUser, Role } from '@demrise/cms-core'
import { ROLE_LABELS, ROLES } from '@demrise/cms-core'
import { computed, onMounted, ref } from 'vue'
import { cmsApi, CmsApiError } from '~/admin/api'
import { errorMessage, formatDate } from '~/admin/format'
import { useCmsSession } from '~/admin/session'
import { useAdminToast } from '~/admin/toast'
import Shell from '~/components/admin/shell/Shell.vue'
import Badge from '~/components/admin/ui/Badge.vue'
import Button from '~/components/admin/ui/Button.vue'
import Dialog from '~/components/admin/ui/Dialog.vue'
import Field from '~/components/admin/ui/Field.vue'

definePageMeta({ middleware: [adminAuth] })
useHead({ title: 'Użytkownicy · DEMRISE CMS', meta: [{ name: 'robots', content: 'noindex' }] })

type User = CmsUser & { disabled: boolean }

const session = useCmsSession()
const toast = useAdminToast()
const users = ref<User[]>([])
const loading = ref(true)
const error = ref('')
const busyId = ref<string | null>(null)

const me = computed(() => session.user.value)
const isDeveloper = computed(() => me.value?.role === 'developer')
/** Role do wyboru: 'developer' tylko dla developera (Worker i tak odrzuci). */
const roleOptions = computed(() => ROLES.filter(r => r !== 'developer' || isDeveloper.value))

const ROLE_HELP: Record<Role, string> = {
  owner: 'pełny dostęp do treści, mediów, designu, komponentów, użytkowników i ustawień',
  editor: 'edycja i publikacja treści, media, SEO',
  content_editor: 'edycja treści bez publikacji, dodawanie mediów',
  developer: 'wszystko, także pola techniczne (DEMRISE)',
}

/** Komunikaty reguł z users.ts w Workerze. */
function userError(e: unknown): string {
  if (e instanceof CmsApiError) {
    const message = (e.body as { message?: string } | null)?.message
    if (e.code === 'last_owner') return 'To ostatni aktywny właściciel: nie można go usunąć, wyłączyć ani zmienić mu roli. Najpierw nadaj rolę właściciela innej osobie.'
    if (e.code === 'exists') return 'Użytkownik z tym adresem e-mail już istnieje'
    if (e.code === 'forbidden' && message === 'own_role') return 'Nie możesz zmienić własnej roli'
    if (e.code === 'forbidden' && message === 'developer_role') return 'Rolę DEMRISE Developer nadaje, odbiera i zarządza nią tylko developer'
    if (e.code === 'forbidden' && message === 'self_disable') return 'Nie możesz wyłączyć własnego konta'
    if (e.code === 'forbidden' && message === 'self_delete') return 'Nie możesz usunąć własnego konta'
    if (e.code === 'bad_request' && message === 'email') return 'Nieprawidłowy adres e-mail'
    if (e.code === 'bad_request' && message === 'name') return 'Podaj imię i nazwisko (do 100 znaków)'
    if (e.code === 'bad_request' && message === 'role') return 'Nieprawidłowa rola'
  }
  return errorMessage(e)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    users.value = (await cmsApi.get<{ items: User[] }>('/api/users')).items
  }
  catch (e) {
    error.value = errorMessage(e)
  }
  finally {
    loading.value = false
  }
}
onMounted(load)

const replaceUser = (u: User) => {
  users.value = users.value.map(x => (x.id === u.id ? u : x))
}

/* ---------- Dodanie ---------- */
const createOpen = ref(false)
const form = ref({ email: '', name: '', role: 'content_editor' as Role })
const formError = ref('')
const creating = ref(false)

function openCreate() {
  form.value = { email: '', name: '', role: 'content_editor' }
  formError.value = ''
  createOpen.value = true
}

async function create() {
  formError.value = ''
  if (!/^\S+@\S+\.\S+$/.test(form.value.email.trim())) {
    formError.value = 'Wpisz poprawny adres e-mail'
    return
  }
  if (!form.value.name.trim()) {
    formError.value = 'Podaj imię i nazwisko'
    return
  }
  creating.value = true
  try {
    const user = await cmsApi.post<User>('/api/users', { email: form.value.email.trim(), name: form.value.name.trim(), role: form.value.role })
    users.value = [...users.value, user]
    createOpen.value = false
    toast.show(`Dodano ${user.email}. Zaloguje się linkiem e-mail na stronie logowania panelu.`, 'success')
  }
  catch (e) {
    formError.value = userError(e)
  }
  finally {
    creating.value = false
  }
}

/* ---------- Edycja ---------- */
const editing = ref<User | null>(null)
const editForm = ref({ name: '', role: 'content_editor' as Role })
const editError = ref('')
const saving = ref(false)
const editOpen = computed({ get: () => editing.value !== null, set: (v) => { if (!v) editing.value = null } })
const isSelf = (u: User | null) => !!u && u.id === me.value?.id
/** Rolę developera może zmieniać tylko developer; własnej roli nie zmienia nikt. */
const roleLocked = (u: User | null) => !u || isSelf(u) || (u.role === 'developer' && !isDeveloper.value)

function openEdit(u: User) {
  editing.value = u
  editForm.value = { name: u.name, role: u.role }
  editError.value = ''
}

async function saveEdit() {
  const u = editing.value
  if (!u) return
  editError.value = ''
  const body: Record<string, unknown> = {}
  if (editForm.value.name.trim() !== u.name) body.name = editForm.value.name.trim()
  if (editForm.value.role !== u.role) body.role = editForm.value.role
  if (!Object.keys(body).length) {
    editing.value = null
    return
  }
  saving.value = true
  try {
    replaceUser(await cmsApi.patch<User>(`/api/users/${encodeURIComponent(u.id)}`, body))
    editing.value = null
    toast.show('Zapisano zmiany użytkownika', 'success')
  }
  catch (e) {
    editError.value = userError(e)
  }
  finally {
    saving.value = false
  }
}

async function setDisabled(u: User, disabled: boolean) {
  busyId.value = u.id
  try {
    replaceUser(await cmsApi.patch<User>(`/api/users/${encodeURIComponent(u.id)}`, { disabled }))
    toast.show(disabled ? `Wyłączono ${u.email} (sesje zakończone)` : `Włączono ${u.email}`, 'success')
  }
  catch (e) {
    toast.show(userError(e), 'danger')
  }
  finally {
    busyId.value = null
  }
}

/* ---------- Usunięcie ---------- */
const removing = ref<User | null>(null)
const removeOpen = computed({ get: () => removing.value !== null, set: (v) => { if (!v) removing.value = null } })
const removeError = ref('')
const deleting = ref(false)

function askRemove(u: User) {
  removing.value = u
  removeError.value = ''
}

async function remove() {
  const u = removing.value
  if (!u) return
  deleting.value = true
  removeError.value = ''
  try {
    await cmsApi.delete(`/api/users/${encodeURIComponent(u.id)}`)
    users.value = users.value.filter(x => x.id !== u.id)
    removing.value = null
    toast.show(`Usunięto ${u.email}`, 'success')
  }
  catch (e) {
    removeError.value = userError(e)
  }
  finally {
    deleting.value = false
  }
}

const canTouch = (u: User) => !isSelf(u) && (u.role !== 'developer' || isDeveloper.value)
</script>

<template>
  <Shell title="Użytkownicy">
    <div class="adm-row" style="justify-content: space-between">
      <p class="adm-muted">Logowanie odbywa się linkiem wysyłanym na e-mail. Wyłączenie konta kończy jego sesje.</p>
      <Button variant="primary" @click="openCreate">Dodaj użytkownika</Button>
    </div>
    <p v-if="error" class="adm-alert adm-alert--danger" role="alert">{{ error }}</p>
    <p v-else-if="loading" class="adm-muted" role="status">Wczytywanie…</p>
    <div v-else class="adm-table-wrap">
      <table class="adm-table">
        <thead>
          <tr>
            <th scope="col">Użytkownik</th>
            <th scope="col">Rola</th>
            <th scope="col">Ostatnie logowanie</th>
            <th scope="col">Stan</th>
            <th scope="col"><span class="adm-sr">Akcje</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td>
              <strong>{{ u.name }}</strong>
              <span v-if="isSelf(u)" class="adm-muted"> (Ty)</span>
              <div class="adm-muted">{{ u.email }}</div>
            </td>
            <td>{{ ROLE_LABELS[u.role] }}</td>
            <td>{{ formatDate(u.lastLoginAt) }}</td>
            <td><Badge :tone="u.disabled ? 'danger' : 'success'">{{ u.disabled ? 'Wyłączony' : 'Aktywny' }}</Badge></td>
            <td>
              <div class="adm-row" style="justify-content: flex-end">
                <Button size="sm" @click="openEdit(u)">Edytuj<span class="adm-sr"> {{ u.email }}</span></Button>
                <Button
                  v-if="canTouch(u)"
                  size="sm"
                  :loading="busyId === u.id"
                  @click="setDisabled(u, !u.disabled)"
                >{{ u.disabled ? 'Włącz' : 'Wyłącz' }}<span class="adm-sr"> {{ u.email }}</span></Button>
                <Button v-if="canTouch(u)" size="sm" variant="ghost" @click="askRemove(u)">Usuń<span class="adm-sr"> {{ u.email }}</span></Button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <section class="adm-card adm-stack" aria-labelledby="roles-h">
      <h2 id="roles-h">Role</h2>
      <ul class="adm-steps">
        <li v-for="r in roleOptions" :key="r"><strong>{{ ROLE_LABELS[r] }}</strong>: {{ ROLE_HELP[r] }}</li>
      </ul>
    </section>

    <Dialog v-model:open="createOpen" title="Dodaj użytkownika">
      <form id="user-create" class="adm-stack" novalidate @submit.prevent="create">
        <p v-if="formError" class="adm-alert adm-alert--danger" role="alert">{{ formError }}</p>
        <Field label="Adres e-mail">
          <template #default="{ id }">
            <input :id="id" v-model="form.email" class="adm-input" type="email" autocomplete="off" required autofocus>
          </template>
        </Field>
        <Field label="Imię i nazwisko">
          <template #default="{ id }">
            <input :id="id" v-model="form.name" class="adm-input" type="text" maxlength="100" required>
          </template>
        </Field>
        <Field label="Rola" :help="ROLE_HELP[form.role]">
          <template #default="{ id, describedBy }">
            <select :id="id" v-model="form.role" class="adm-select" :aria-describedby="describedBy">
              <option v-for="r in roleOptions" :key="r" :value="r">{{ ROLE_LABELS[r] }}</option>
            </select>
          </template>
        </Field>
      </form>
      <template #footer>
        <Button @click="createOpen = false">Anuluj</Button>
        <Button type="submit" form="user-create" variant="primary" :loading="creating">Dodaj</Button>
      </template>
    </Dialog>

    <Dialog v-model:open="editOpen" :title="`Edytuj: ${editing?.email ?? ''}`">
      <form id="user-edit" class="adm-stack" novalidate @submit.prevent="saveEdit">
        <p v-if="editError" class="adm-alert adm-alert--danger" role="alert">{{ editError }}</p>
        <Field label="Imię i nazwisko">
          <template #default="{ id }">
            <input :id="id" v-model="editForm.name" class="adm-input" type="text" maxlength="100" required>
          </template>
        </Field>
        <Field
          label="Rola"
          :help="isSelf(editing) ? 'Nie możesz zmienić własnej roli.' : roleLocked(editing) ? 'Rolą DEMRISE Developer zarządza tylko developer.' : ROLE_HELP[editForm.role]"
        >
          <template #default="{ id, describedBy }">
            <select :id="id" v-model="editForm.role" class="adm-select" :disabled="roleLocked(editing)" :aria-describedby="describedBy">
              <option v-for="r in ROLES.filter(r => roleOptions.includes(r) || r === editing?.role)" :key="r" :value="r">{{ ROLE_LABELS[r] }}</option>
            </select>
          </template>
        </Field>
      </form>
      <template #footer>
        <Button @click="editing = null">Anuluj</Button>
        <Button type="submit" form="user-edit" variant="primary" :loading="saving">Zapisz</Button>
      </template>
    </Dialog>

    <Dialog v-model:open="removeOpen" title="Usunąć użytkownika?">
      <div class="adm-stack">
        <p>Konto {{ removing?.email }} zostanie usunięte, a jego sesje zakończone. Historia zmian zostaje.</p>
        <p v-if="removeError" class="adm-alert adm-alert--danger" role="alert">{{ removeError }}</p>
      </div>
      <template #footer>
        <Button @click="removing = null">Anuluj</Button>
        <Button variant="danger" :loading="deleting" @click="remove">Usuń użytkownika</Button>
      </template>
    </Dialog>
  </Shell>
</template>
