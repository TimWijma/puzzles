<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { createPuzzleSeed, getPuzzleModules } from '../puzzles'

const puzzleModules = getPuzzleModules()
const seeds = new Map(puzzleModules.map((puzzle) => [puzzle.id, createPuzzleSeed()]))
</script>

<template>
  <section class="content">
    <h1>Puzzles</h1>
    <p v-if="puzzleModules.length === 0" class="muted">
      Puzzle modules will appear here as they are added.
    </p>
    <ul v-else>
      <li v-for="puzzle in puzzleModules" :key="puzzle.id">
        <RouterLink
          :to="{ name: 'seeded-puzzle', params: { puzzleId: puzzle.id, seed: seeds.get(puzzle.id) } }"
        >
          Start a new {{ puzzle.displayName }} puzzle
        </RouterLink>
      </li>
    </ul>
  </section>
</template>
