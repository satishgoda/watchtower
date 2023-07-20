<template lang="pug">
.app-container
  TheNavbar(:projects="projectsStore.data.projects")
  RouterView
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useProjectsStore } from "@/stores/projects";
import TheNavbar from "@/components/TheNavbar.vue";

const projectsStore = new useProjectsStore();
projectsStore.fetchAndInitContext();

</script>
