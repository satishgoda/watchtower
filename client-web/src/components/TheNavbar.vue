<template lang="pug">
.app-toolbar
  select.ml-4.mt-2(
    v-if="contextStore.projects"
    v-show="router.currentRoute.value.name === 'pro'"
    @change="switchToProject"
    v-model="currentProjectSelected"
    )
    option(
      v-for="project in contextStore.projects"
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
import { useContextStore } from "@/stores/context";
import { useProjectStore } from '@/stores/project';

const router = useRouter();
const projectStore = useProjectStore();
const contextStore = useContextStore();
contextStore.fetchAndInitContext();

const currentProjectSelected = ref();

watch(() => projectStore.id, (id) => {currentProjectSelected.value = id})

function switchToProject(event: Event) {
  const projectId = (event.target as HTMLInputElement).value;
  router.push({ name: 'pro', params: { projectId: projectId } })
  projectStore.initWithProject(projectId);
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
