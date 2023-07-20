<template lang="pug">
.project-detail
  #row-thumbnails
    .section-thumbnailview
      ThumbnailArea
    .section-inspector
      section.inspector-videoplayer
        .player-header
          .toolbar-item(v-if="projectStore.currentSequence" title="Current Sequence")
            span.current-sequence-indicator(
              :style="uiCurrentSequenceColor(projectStore.currentSequence.color)"
              )
            | {{ projectStore.currentSequence.name }}
            span(v-if="projectStore.currentShot")
              span.breadcrumb-separator |
              | {{ projectStore.currentShot.name }}
          .toolbar-item.right(title="Frame Number")
            | {{ projectStore.currentFrame }}
        VideoPlayer

      section.inspector-details(v-if="projectStore.currentShot")
        h5.section-headline SHOT
        h3.section-title {{ projectStore.currentShot.name }}
        ul
          li Duration: {{ projectStore.currentShot.durationSeconds.toFixed(2) }} sec
          li Start Frame: {{ projectStore.currentShot.startFrame }}
          li Assets: {{ projectStore.currentShot.asset_ids.length }}
          li Tasks: {{ projectStore.currentShot.tasks.length }}
  .row-timeline
    .col-12
      TimelineArea


</template>

<script setup lang="ts">
import {onMounted, onBeforeUnmount, computed} from 'vue';
import { useRoute } from 'vue-router';
import { useProjectStore } from '@/stores/project';
import ThumbnailArea from '@/components/ThumbnailArea.vue';
import VideoPlayer from "@/components/VideoPlayer.vue";
import TimelineArea from "@/components/TimelineArea.vue";

const projectStore = useProjectStore();
const route = useRoute();
projectStore.initWithProject(route.params.projectId);

function handleHotkey(event: KeyboardEvent) {
  if (event.code === 'Space') {
    projectStore.isPlaying = !projectStore.isPlaying;
  }
}

onMounted(() => {document.body.addEventListener('keydown', handleHotkey);})
onBeforeUnmount(() => {document.body.removeEventListener('keydown', handleHotkey);})

function uiCurrentSequenceColor(color: [number, number, number]) {
  let [r, g, b] = color;
  r = r * 100;
  g = g * 100;
  b = b * 100;
  return {
    backgroundColor: `rgb(${r}%,${g}%,${b}%)`,
  };
}

// Computed props
const cssTimelineHeight = computed(() => {
  return `${projectStore.timelineCanvasHeightPx + 33}px`
})

</script>

<style scoped>
.project-detail {
  display: flex;
  flex: 1;
  height: calc(100vh - 20px);
  flex-direction: column;
}

#row-thumbnails {
  flex: 1;
  display: flex;
  flex-direction: row;
}

.row-timeline {
  height: v-bind(cssTimelineHeight);

}

.current-sequence-indicator {
  display: inline-block;
  margin-right: var(--spacer-2);
  height: var(--font-size-base);
  width: 3px;
  border-radius: var(--border-radius);
}
.player-header {
  color: var(--text-color-muted);
  display: flex;
  padding-bottom: var(--spacer-3);
}
ul {
  padding-left: var(--spacer-3);
  margin-left: var(--spacer-2);
}

canvas {
  background-color: black;
}
</style>

