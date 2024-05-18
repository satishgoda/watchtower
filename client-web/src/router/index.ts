import { createRouter, createWebHashHistory } from 'vue-router'
import ProjectListView from '@/views/ProjectListView.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'project-list',
      component: ProjectListView
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
      props: route => ({ episodeId: route.query['episode_id'] }),
      name: 'project-overview',
      component: () => import('../views/ProjectDetailView.vue'),
    },
    {
      path: '/pro/:projectId/dashboard',
      props: route => ({ episodeId: route.query['episode_id'] }),
      name: 'dashboard',
      component: () => import('../views/ProjectDashboardView.vue')
    }
  ]
})

export default router
