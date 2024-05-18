<template lang="pug">
.dashboard
  h2 Dashboard
  p Your projects:
  ul.projects-list(v-if='projects')
    li(v-for='project in projects' :key='project.id')
      router-link(:to="{ name: 'project-overview', params: { projectId: project.id }}")
        img.project-thumbnail(:src='project.thumbnailUrl' :alt='project.name')
        h3 {{ project.name }}

</template>

<script setup lang="ts">
import type { ProjectListItem } from '@/types.d.ts';

  defineProps<{
    projects: ProjectListItem[]
  }>()
</script>

<style scoped>
.dashboard {
  background-color: var(--panel-bg-color);
  border-radius: var(--border-radius);
  margin: var(--spacer-3) auto;
  padding: 0 var(--spacer-3);
  width: 50%;
}

.projects-list {
  list-style-type: none;
  padding: 0;
}

.projects-list li {
  border-bottom: var(--border-width) var(--border-color) solid;
  margin-bottom: var(--spacer-2);
  padding-bottom: var(--spacer-2);
}

.projects-list li:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.projects-list li > a {
  align-items: center;
  border-radius: var(--border-radius);
  display: flex;
  font-weight: normal;
  text-decoration: none;
  transition: color var(--transition-speed) ease-in-out, background-color var(--transition-speed) ease-in-out;
}

.projects-list li > a:hover {
  background-color: var(--panel-bg-color-highlight);
}

.projects-list li > a:hover .project-thumbnail {
  transform: scale(1.1);
}

.project-thumbnail {
  border-radius: var(--border-radius);
  height: 32px;
  margin: 0 var(--spacer-3);
  transition: transform var(--transition-speed) ease-in-out;
  width: 32px;
}
</style>
