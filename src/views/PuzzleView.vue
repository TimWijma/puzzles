<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { createPuzzleSeed, getPuzzleBoard, getPuzzleModule } from '../puzzles'

const route = useRoute()
const puzzleId = computed(() => String(route.params.puzzleId ?? ''))
const seed = computed(() => String(route.params.seed ?? ''))
const puzzleModule = computed(() => getPuzzleModule(puzzleId.value))
const puzzleBoard = computed(() => getPuzzleBoard(puzzleId.value))
const newPuzzleSeed = createPuzzleSeed()
</script>

<template>
  <section class="content">
    <template v-if="puzzleModule && puzzleBoard && seed">
      <h1>{{ puzzleModule.displayName }}</h1>
      <component :is="puzzleBoard" :seed="seed" />
    </template>
    <template v-else-if="puzzleModule && puzzleBoard">
      <h1>{{ puzzleModule.displayName }}</h1>
      <p>A seed identifies a reproducible puzzle.</p>
      <RouterLink
        class="button-link"
        :to="{ name: 'seeded-puzzle', params: { puzzleId, seed: newPuzzleSeed } }"
      >
        Start a new puzzle
      </RouterLink>
    </template>
    <template v-else-if="puzzleModule">
      <h1>{{ puzzleModule.displayName }}</h1>
      <p class="muted">This puzzle is registered, but its board UI has not been added yet.</p>
    </template>
    <template v-else>
      <h1>Unknown puzzle</h1>
      <p>No puzzle module is registered with the ID <code>{{ puzzleId }}</code>.</p>
      <RouterLink to="/puzzles">Return to puzzles</RouterLink>
    </template>
  </section>
</template>
