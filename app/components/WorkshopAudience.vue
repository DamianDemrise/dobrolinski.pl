<script setup lang="ts">
import { workshop } from '~/content/workshop'

const { audience } = workshop
</script>

<template>
  <section class="workshop-section workshop-split" aria-labelledby="workshop-audience-title">
    <h2 id="workshop-audience-title" class="workshop-heading reveal">
      <template v-for="line in audience.titleLines" :key="line">
        <span class="workshop-line">{{ line }}</span>{{ ' ' }}
      </template>
    </h2>
    <div class="workshop-split__body">
      <ul class="workshop-people reveal">
        <li v-for="person in audience.people" :key="person">{{ person }}</li>
      </ul>
      <p class="workshop-quiet-list workshop-audience__details reveal">
        <template v-for="line in audience.detailsLines" :key="line">
          <span class="workshop-line">{{ line }}</span>{{ ' ' }}
        </template>
      </p>
    </div>
  </section>
</template>
