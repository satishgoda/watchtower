import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '@/views/ProjectListView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue')
    },
    {
      path: '/pro/:projectId',
      name: 'pro',
      component: () => import('../views/ProjectDetailView.vue')
    }
  ]
})

export default router
