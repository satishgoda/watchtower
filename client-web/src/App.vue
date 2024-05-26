<template lang="pug">
.app-container
  TheNavbar(
    @set-runtime-state-navigation="setRuntimeStateNavigation"
    :projects="projectsStore.data.projects"
    :runtime-state-navigation="runtimeStateNavigation"
    )
  RouterView(
    @set-runtime-state-navigation="setRuntimeStateNavigation"
    :projects="projectsStore.data.projects"
    :runtime-state-navigation="runtimeStateNavigation"
    )
</template>

<script setup lang="ts">
import {RouterView} from 'vue-router'
import { useProjectsStore } from "@/stores/projects";
import TheNavbar from "@/components/TheNavbar.vue";
import {onMounted, ref} from 'vue';
import {RuntimeStateNavigation} from '@/stores/runtimeStateNavigation';


const projectsStore = new useProjectsStore();

// Navigation runtime state
const runtimeStateNavigation = ref(new RuntimeStateNavigation());

function setRuntimeStateNavigation(state: RuntimeStateNavigation) {
  runtimeStateNavigation.value = state;
}

const initContext = async () => {
  await projectsStore.fetchAndInitContext();
}

onMounted(() => initContext());

</script>
