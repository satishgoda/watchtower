<template lang="pug">
.app-container
  TheNavbar
  RouterView
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import TheNavbar from "@/components/TheNavbar.vue";

</script>
