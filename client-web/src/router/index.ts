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
      // non-repeatable, projectId param is `string`
      path: '/pro/:projectId',
      strict: true,
      name: 'pro',
      component: () => import('../views/ProjectDetailView.vue')
    }
  ]
})

export default router
