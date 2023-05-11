import { createRouter, createWebHashHistory } from 'vue-router'
import DashboardView from '@/views/ProjectListView.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView
    },
    {
      path: '/about',
      name: 'about',
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
