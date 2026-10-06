<!--
  Design (tokeny projektu): kolory, typografia, odstępy, szerokości, zaokrąglenia; breakpointy
  tylko do odczytu. Edycja wymaga DESIGN_EDIT (inaczej podgląd). Walidacja regułami rdzenia
  (isSafeTokenName/isSafeTokenValue); dokument z błędami nie jest zapisywany. Autozapis i publikacja.
-->
<script setup lang="ts">
import { adminAuth } from '~/admin/auth-guard'
import type { Entity, EntitySummary, TokenGroup, TokensDocument } from '@demrise/cms-core'
import { deepEqual, TOKEN_GROUPS } from '@demrise/cms-core'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { cmsApi } from '~/admin/api'
import type { EntityDraft } from '~/admin/entity-draft'
import { createEntityDraft } from '~/admin/entity-draft'
import { errorMessage } from '~/admin/format'
import { useCmsSession } from '~/admin/session'
import type { TokenRow, TokenRows } from '~/admin/tokens-form'
import { cssVarFor, newTokenRow, rowsToTokens, TOKEN_GROUP_LABELS, tokensToRows, validateTokenRows } from '~/admin/tokens-form'
import EntityBar from '~/components/admin/entity/EntityBar.vue'
import Shell from '~/components/admin/shell/Shell.vue'
import Badge from '~/components/admin/ui/Badge.vue'
import Button from '~/components/admin/ui/Button.vue'

definePageMeta({ middleware: [adminAuth] })
useHead({ title: 'Design · DEMRISE CMS', meta: [{ name: 'robots', content: 'noindex' }] })

const EDITABLE: TokenGroup[] = TOKEN_GROUPS.filter(g => g !== 'breakpoints')
const GROUP_HELP: Partial<Record<TokenGroup, string>> = {
  colors: 'Wartość CSS koloru, np. #080808 albo rgba(255, 255, 255, 0.9).',
  typography: 'Rozmiar tekstu, np. 1.25rem albo clamp(1rem, 1.2vw, 1.25rem).',
  spacing: 'Odstęp, np. 1.5rem albo clamp(1.5rem, 7.4vw, 8rem).',
  widths: 'Szerokość, np. 42rem albo 68ch.',
  radius: 'Zaokrąglenie narożników, np. 6px.',
}

const session = useCmsSession()
const loading = ref(true)
const error = ref('')
const draft = shallowRef<EntityDraft<TokensDocument> | null>(null)
const rows = ref<TokenRows | null>(null)

const canEdit = computed(() => session.can('DESIGN_EDIT'))
const canPublish = computed(() => session.can('CONTENT_PUBLISH') && session.can('DESIGN_EDIT'))
const issues = computed(() => (rows.value ? validateTokenRows(rows.value) : []))
const issueFor = (group: TokenGroup, key: string, field: 'name' | 'value' | 'label') =>
  issues.value.find(i => i.group === group && i.key === key && i.field === field)?.message
const groupIssues = (group: TokenGroup) => issues.value.filter(i => i.group === group && i.key === '')

onMounted(async () => {
  try {
    const list = await cmsApi.get<{ items: EntitySummary[] }>('/api/entities?kind=tokens')
    const first = list.items[0]
    if (!first) throw new Error('Brak encji tokenów w CMS')
    const entity = await cmsApi.get<Entity>(`/api/entities/${encodeURIComponent(first.id)}`)
    draft.value = createEntityDraft<TokensDocument>(entity)
    rows.value = tokensToRows(draft.value.state.data)
  }
  catch (e) {
    error.value = errorMessage(e)
  }
  finally {
    loading.value = false
  }
})

/** Dane z serwera (odrzucenie zmian, przywrócenie, konflikt) → nowe wiersze formularza. */
watch(() => draft.value?.state.data, (data) => {
  if (!data || !rows.value) return
  if (!deepEqual(rowsToTokens(rows.value), data)) rows.value = tokensToRows(data)
})

function commit() {
  if (!rows.value || !draft.value || !canEdit.value) return
  if (validateTokenRows(rows.value).length) return // błędy pokazane przy polach; zapis po poprawce
  const next = rowsToTokens(rows.value)
  if (!deepEqual(next, draft.value.state.data)) draft.value.update(next)
}

function addRow(group: TokenGroup) {
  rows.value![group] = [...rows.value![group], newTokenRow()]
  requestAnimationFrame(() => document.querySelector<HTMLInputElement>(`[data-token-new="${group}"]`)?.focus())
}

function removeRow(group: TokenGroup, row: TokenRow) {
  rows.value![group] = rows.value![group].filter(r => r.key !== row.key)
  commit()
}

/** Token zapisany już na serwerze z mapy tokens.css: nazwa zablokowana. */
const isMapped = (group: TokenGroup, row: TokenRow) => cssVarFor(group, row.name) !== null && Object.hasOwn(draft.value?.state.data[group] ?? {}, row.name)
/** Próbka na pół ciemnym, pół jasnym tle (półprzezroczyste kolory tekstu są widoczne na obu). */
const swatch = (value: string) => {
  const v = value && !/[;{}<>\\()]/.test(value.replace(/^(rgba?|hsla?)\(([^()]*)\)$/, '')) ? value : 'transparent'
  return { backgroundImage: `linear-gradient(${v}, ${v}), linear-gradient(90deg, #080808 50%, #ffffff 50%)` }
}

function onBeforeUnload(event: BeforeUnloadEvent) {
  if (!draft.value?.hasUnsaved()) return
  event.preventDefault()
  event.returnValue = ''
}
onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', onBeforeUnload)
  void draft.value?.flush().catch(() => {}).finally(() => draft.value?.dispose())
})
</script>

<template>
  <Shell title="Design: tokeny">
    <div class="adm-alert adm-alert--neutral adm-stack" style="gap: 6px">
      <p>Tokeny to nazwane wartości projektu (kolory, rozmiary tekstu, odstępy). Treści wybierają nazwę tokenu, nie wartość.</p>
      <p>
        Publikacja zapisuje tokeny w CMS. Zmienne CSS strony publicznej generują się przy <strong>najbliższej przebudowie strony</strong>:
        workflow GitHub Actions uruchamia <code>scripts/cms-pull.mjs</code>, który z opublikowanych tokenów zapisuje <code>app/assets/css/tokens.css</code>
        (mapa tokenów na zmienne: <code>cms/tokens-css.json</code>), a potem buduje stronę. Tokeny bez zmiennej CSS (oznaczone „informacyjny”) nie zmieniają wyglądu strony.
      </p>
    </div>
    <p v-if="error" class="adm-alert adm-alert--danger" role="alert">{{ error }}</p>
    <p v-else-if="loading" class="adm-muted" role="status">Wczytywanie…</p>
    <template v-else-if="draft && rows">
      <EntityBar
        :draft="draft as EntityDraft<unknown>"
        :can-edit="canEdit"
        :can-publish="canPublish"
        :publish-blocked="issues.length ? 'Popraw błędy w tokenach' : null"
        publish-note="Nowe wartości trafią do CSS strony publicznej przy najbliższej przebudowie (uruchamia się po publikacji, jeśli jest skonfigurowana; inaczej w Ustawieniach)."
      />
      <p v-if="!canEdit" class="adm-alert adm-alert--neutral" role="status">Tylko podgląd: zmiana tokenów wymaga uprawnienia Design.</p>
      <p v-if="issues.length" class="adm-alert adm-alert--danger" role="alert">Formularz ma błędy ({{ issues.length }}): zmiany nie są zapisywane, dopóki ich nie poprawisz.</p>

      <section v-for="group in EDITABLE" :key="group" class="adm-card adm-stack" :aria-labelledby="`tok-${group}`">
        <div class="adm-row" style="justify-content: space-between">
          <h2 :id="`tok-${group}`">{{ TOKEN_GROUP_LABELS[group] }}</h2>
          <Button v-if="canEdit" size="sm" @click="addRow(group)">Dodaj token<span class="adm-sr"> do grupy {{ TOKEN_GROUP_LABELS[group] }}</span></Button>
        </div>
        <p v-if="GROUP_HELP[group]" class="adm-field__help">{{ GROUP_HELP[group] }}</p>
        <p v-for="gi in groupIssues(group)" :key="gi.message" class="adm-field__error">{{ gi.message }}</p>
        <p v-if="!rows[group].length" class="adm-muted">Brak tokenów w tej grupie.</p>
        <div v-else class="adm-table-wrap">
          <table class="adm-table adm-tokens">
            <thead>
              <tr>
                <th v-if="group === 'colors'" scope="col"><span class="adm-sr">Próbka</span></th>
                <th scope="col">Nazwa</th>
                <th scope="col">Wartość</th>
                <th scope="col">Opis</th>
                <th scope="col">Zmienna CSS</th>
                <th scope="col"><span class="adm-sr">Akcje</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows[group]" :key="row.key">
                <td v-if="group === 'colors'">
                  <span class="adm-swatch__chip adm-tokens__chip" :style="swatch(row.value)" aria-hidden="true" />
                </td>
                <td>
                  <label class="adm-sr" :for="`tok-${row.key}-name`">Nazwa tokenu</label>
                  <input
                    :id="`tok-${row.key}-name`"
                    v-model="row.name"
                    class="adm-input"
                    type="text"
                    :data-token-new="row.name === '' ? group : undefined"
                    :readonly="!canEdit || isMapped(group, row)"
                    :title="isMapped(group, row) ? 'Token używany w CSS strony: nazwy nie można zmienić' : undefined"
                    :aria-invalid="issueFor(group, row.key, 'name') ? true : undefined"
                    :aria-describedby="issueFor(group, row.key, 'name') ? `tok-${row.key}-name-err` : undefined"
                    @change="commit"
                  >
                  <p v-if="issueFor(group, row.key, 'name')" :id="`tok-${row.key}-name-err`" class="adm-field__error">{{ issueFor(group, row.key, 'name') }}</p>
                </td>
                <td>
                  <label class="adm-sr" :for="`tok-${row.key}-value`">Wartość tokenu {{ row.name }}</label>
                  <input
                    :id="`tok-${row.key}-value`"
                    v-model="row.value"
                    class="adm-input"
                    type="text"
                    spellcheck="false"
                    :readonly="!canEdit"
                    :aria-invalid="issueFor(group, row.key, 'value') ? true : undefined"
                    :aria-describedby="issueFor(group, row.key, 'value') ? `tok-${row.key}-value-err` : undefined"
                    @input="commit"
                  >
                  <p v-if="issueFor(group, row.key, 'value')" :id="`tok-${row.key}-value-err`" class="adm-field__error">{{ issueFor(group, row.key, 'value') }}</p>
                </td>
                <td>
                  <label class="adm-sr" :for="`tok-${row.key}-label`">Opis tokenu {{ row.name }}</label>
                  <input :id="`tok-${row.key}-label`" v-model="row.label" class="adm-input" type="text" :readonly="!canEdit" @input="commit">
                  <p v-if="issueFor(group, row.key, 'label')" class="adm-field__error">{{ issueFor(group, row.key, 'label') }}</p>
                </td>
                <td>
                  <code v-if="cssVarFor(group, row.name)">{{ cssVarFor(group, row.name) }}</code>
                  <Badge v-else tone="neutral">informacyjny</Badge>
                </td>
                <td>
                  <Button
                    v-if="canEdit && !isMapped(group, row)"
                    size="sm"
                    variant="ghost"
                    @click="removeRow(group, row)"
                  >Usuń<span class="adm-sr"> token {{ row.name }}</span></Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="adm-card adm-stack" aria-labelledby="tok-breakpoints">
        <h2 id="tok-breakpoints">{{ TOKEN_GROUP_LABELS.breakpoints }}</h2>
        <p class="adm-alert adm-alert--neutral">Tylko do odczytu. Media queries w CSS nie czytają zmiennych, więc progi są zapisane w kodzie strony; tu służą jako opis i do podglądu urządzeń.</p>
        <dl class="adm-dl">
          <template v-for="row in rows.breakpoints" :key="row.key">
            <dt>{{ row.label || row.name }}</dt>
            <dd><code>{{ row.name }}</code>: {{ row.value }}</dd>
          </template>
        </dl>
      </section>
    </template>
  </Shell>
</template>
