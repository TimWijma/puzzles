<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="app-shell">
    <header class="site-header">
      <RouterLink class="site-title" to="/">Puzzle Cabinet</RouterLink>
      <nav aria-label="Main navigation">
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/puzzles">Puzzles</RouterLink>
      </nav>
    </header>
    <main><RouterView /></main>
  </div>
</template>
