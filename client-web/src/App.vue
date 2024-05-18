<template lang="pug">
.app-container
  TheNavbar(
    @set-active-project-id="setActiveProjectId"
    @set-active-episode-id="setActiveEpisodeId"
    :projects="projectsStore.data.projects"
    :episodes="projectsStore.data.episodes"
    :active-project-id="projectsStore.data.activeProjectId"
    :active-episode-id="projectsStore.data.activeEpisodeId"
    )
  RouterView(
    @set-active-project-id="setActiveProjectId"
    :projects="projectsStore.data.projects"
    :active-project-id="projectsStore.data.activeProjectId"
    :active-episode-id="projectsStore.data.activeEpisodeId"
    )
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useProjectsStore } from "@/stores/projects";
import TheNavbar from "@/components/TheNavbar.vue";

const projectsStore = new useProjectsStore();
projectsStore.fetchAndInitContext();

function getDefaultEpisodeForProject(projectId: string) {
  const project = projectsStore.data.projects.find(project => project.id === projectId);
  if (!project) {return}
  if (project.episodes.length > 0) {
    projectsStore.data.episodes = project.episodes
    return project.episodes[0];
  }
  return null;
}

function setActiveProjectId(projectId: string) {
  projectsStore.data.activeProjectId = projectId;
  const firstEpisode = getDefaultEpisodeForProject(projectId);
  if (firstEpisode) {
    setActiveEpisodeId(firstEpisode.id)
  }
}

function setActiveEpisodeId(episodeId: string) {
  projectsStore.data.activeEpisodeId = episodeId;
  // Filter sequences based on episode
  // Filter shots based on episode sequences
}

</script>
