<template lang="pug">
.app-toolbar
  select(
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
import type {EpisodeListItem, ProjectListItem} from '@/types.d.ts';

const router = useRouter();
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


watch(() => props.activeProjectId, (projectId) => {
  currentProjectSelected.value = projectId;
})

watch(() => props.activeEpisodeId, (episodeId) => {
  currentEpisodeSelected.value = episodeId;
})

function switchToProject(event: Event) {
  const projectId = (event.target as HTMLInputElement).value;
  router.push({ name: 'pro', params: { projectId: projectId } })
  emit('setActiveProjectId', projectId);
}

function switchToEpisode(event: Event) {
  const episodeId = (event.target as HTMLInputElement).value;
  emit('setActiveEpisodeId', episodeId);
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

select.episode {
  margin-left: 5px;
}
</style>
