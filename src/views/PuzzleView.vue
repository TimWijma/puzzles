<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { getPuzzleModule } from '../puzzles'

const route = useRoute()
const puzzleId = computed(() => String(route.params.puzzleId ?? ''))
const puzzleModule = computed(() => getPuzzleModule(puzzleId.value))
</script>

<template>
  <section class="content">
    <template v-if="puzzleModule">
      <h1>{{ puzzleModule.displayName }}</h1>
      <p class="muted">The puzzle is registered, but its board UI has not been added yet.</p>
    </template>
    <template v-else>
      <h1>Unknown puzzle</h1>
      <p>No puzzle module is registered with the ID <code>{{ puzzleId }}</code>.</p>
      <RouterLink to="/puzzles">Return to puzzles</RouterLink>
    </template>
  </section>
</template>
