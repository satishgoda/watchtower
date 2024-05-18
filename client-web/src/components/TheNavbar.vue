<template lang="pug">
.app-toolbar
  .project-selectors(
      v-show="router.currentRoute.value.name === 'project-overview' || router.currentRoute.value.name === 'dashboard'"
    )
    select(
      v-if="projects"
      @change="switchToProject"
      v-model="currentProjectSelected"
      )
      option(
        v-for="project in projects"
        :key="project.id"
        :value="project.id"
        )
        | {{ project.name }}
    select.episode(
      v-if="episodes.length > 0"
      @change="switchToEpisode"
      v-model="currentEpisodeSelected"
      )
      option(
        v-for="episode in episodes"
        :key="episode.id"
        :value="episode.id"
        )
        | {{ episode.name }}
    select.view-type(
      v-model="viewName"
      @change="switchToView"
      )
      option(value="project-overview") Overview
      option(value="dashboard") Dashboard
  .app-links
    ul
      li
        RouterLink(to='/') Home
      li
        RouterLink(to='/about') About
</template>

<script setup lang="ts">

import {RouterLink, useRoute, useRouter} from 'vue-router';
import {ref, watch} from 'vue';
import type {EpisodeListItem, ProjectListItem} from '@/types.d.ts';

const router = useRouter();
const route = useRoute();
const currentProjectSelected = ref();
const currentEpisodeSelected = ref();
const props = defineProps<{
  projects: ProjectListItem[],
  episodes: EpisodeListItem[],
  activeProjectId: "",
  activeEpisodeId: "",
}>()

const emit = defineEmits<{
  setActiveProjectId: [projectId: string],
  setActiveEpisodeId: [episodeId: string],
}>()

// Default value for view selector
const viewName = ref('project-overview');


watch(() => props.activeProjectId, (projectId) => {
  currentProjectSelected.value = projectId;
})

watch(() => props.activeEpisodeId, (episodeId) => {
  currentEpisodeSelected.value = episodeId;
})

watch(
  () => route.fullPath,
  () => {
    if (route.name) { viewName.value = route.name.toString(); }
  }
);

async function switchToProject(event: Event) {
  const projectId = (event.target as HTMLInputElement).value;
  await router.push({ name: 'project-overview', params: { projectId: projectId } })
  emit('setActiveProjectId', projectId);
}

function switchToEpisode(event: Event) {
  const episodeId = (event.target as HTMLInputElement).value;
  emit('setActiveEpisodeId', episodeId);
}

async function switchToView(event: Event) {
  const viewName = (event.target as HTMLInputElement).value;
  if (viewName === 'project-overview') {
    await router.push({ name: 'project-overview', params: { projectId: currentProjectSelected.value}, query: {episodeId: currentEpisodeSelected.value } })
  } else if (viewName === 'dashboard') {
    await router.push({ name: 'dashboard', params: { projectId: currentProjectSelected.value }, query: {episodeId: currentEpisodeSelected.value } })
  }
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

select.episode,
select.view-type {
  margin-left: 5px;
}
</style>
