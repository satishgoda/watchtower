<template lang="pug">
.app-container
  TheNavbar(
    @set-active-project-id="setActiveProjectId"
    :projects="projectsStore.data.projects"
    :active-project-id="projectsStore.data.activeProjectId"
    )
  RouterView(
    @set-active-project-id="setActiveProjectId"
    :projects="projectsStore.data.projects"
    :active-project-id="projectsStore.data.activeProjectId"
    )
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useProjectsStore } from "@/stores/projects";
import TheNavbar from "@/components/TheNavbar.vue";

const projectsStore = new useProjectsStore();
projectsStore.fetchAndInitContext();

function setActiveProjectId(projectId:string) {
  projectsStore.data.activeProjectId = projectId;
}

</script>
