<template lang="pug">
.app-toolbar
  select.ml-4.mt-2(
    v-if="projects"
    v-show="router.currentRoute.value.name === 'pro'"
    @change="switchToProject"
    v-model="currentProjectSelected"
    )
    option(
      v-for="project in projects"
      :key="project.id"
      :value="project.id"
      )
      | {{ project.name }}
  .app-links
    ul
      li
        RouterLink(to='/') Dashboard
      li
        RouterLink(to='/about') About
</template>

<script setup lang="ts">

import { RouterLink, useRouter } from 'vue-router';
import {ref, watch} from 'vue';
import type { ProjectListItem } from '@/types.d.ts';

const router = useRouter();
const currentProjectSelected = ref();
const props = defineProps<{
  projects: ProjectListItem[],
  activeProjectId: "",
}>()

const emit = defineEmits<{
  setActiveProjectId: [projectId: string]
}>()


watch(() => props.activeProjectId, (projectId) => {currentProjectSelected.value = projectId})

function switchToProject(event: Event) {
  const projectId = (event.target as HTMLInputElement).value;
  router.push({ name: 'pro', params: { projectId: projectId } })
  emit('setActiveProjectId', projectId);
}


</script>

<style scoped>
.app-links {
  margin-left: auto;
}

.app-links > ul {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
}

.app-links ul > li {
  margin-left: var(--spacer-2)
}

.app-links a {
  color: var(--text-color-hint)
}
</style>
