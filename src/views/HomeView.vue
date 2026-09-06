<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="content">
    <p class="muted">A personal collection of logic puzzles</p>
    <h1>Puzzle Cabinet</h1>
    <p>
      A quiet place for grid-based puzzles. Play Sudoku and Queens now, with more puzzle types
      to be added over time.
    </p>
    <RouterLink class="button-link" to="/puzzles">Browse puzzles</RouterLink>
  </section>
</template>
