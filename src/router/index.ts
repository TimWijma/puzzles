import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import PuzzleView from '../views/PuzzleView.vue'
import PuzzlesView from '../views/PuzzlesView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/puzzles', name: 'puzzles', component: PuzzlesView },
    { path: '/puzzles/:puzzleId/:seed', name: 'seeded-puzzle', component: PuzzleView },
    { path: '/puzzles/:puzzleId', name: 'puzzle', component: PuzzleView },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

export default router
