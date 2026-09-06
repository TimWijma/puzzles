<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { getPuzzleModules } from '../puzzles'

const puzzleModules = getPuzzleModules()
</script>

<template>
  <section class="content">
    <h1>Puzzles</h1>
    <p v-if="puzzleModules.length === 0" class="muted">
      Puzzle modules will appear here as they are added.
    </p>
    <ul v-else>
      <li v-for="puzzle in puzzleModules" :key="puzzle.id">
        <RouterLink :to="`/puzzles/${puzzle.id}`">{{ puzzle.displayName }}</RouterLink>
      </li>
    </ul>
  </section>
</template>
