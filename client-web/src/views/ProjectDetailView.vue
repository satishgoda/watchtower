<template lang="pug">
.project-detail
  #row-thumbnails
    .section-thumbnailview
      ThumbnailArea(
        @set-current-frame="setCurrentFrame"
        @set-selected-assets="setSelectedAssets"
        :runtime-state="runtimeState"
        :project-store="projectStore.data"
        )
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
        VideoPlayer(
          @set-current-frame="setCurrentFrame"
          @set-is-playing="setIsPlaying"
          :runtime-state="runtimeState"
          :project-store="projectStore.data"
          )

      section.inspector-details(v-if="runtimeState.currentShot")
        h5.section-headline SHOT
        h3.section-title {{ runtimeState.currentShot.name }}
        ul
          li Duration: {{ runtimeState.currentShot.durationSeconds.toFixed(2) }} sec
          li Start Frame: {{ runtimeState.currentShot.startFrame }}
          li Assets: {{ runtimeState.currentShot.asset_ids.length }}
          li Tasks: {{ runtimeState.currentShot.tasks.length }}
  .row-timeline
    .col-12

      TimelineArea(
        @set-current-frame="setCurrentFrame"
        @set-timeline-canvas-height-px="setTimelineCanvasHeightPx"
        :runtime-state="runtimeState"
        :project-store="projectStore.data"
        )



</template>

<script setup lang="ts">
import {onMounted, onBeforeUnmount, computed, reactive, watch} from 'vue';
import { useRoute } from 'vue-router';
import { useProjectStore } from '@/stores/project';
import { RuntimeState } from '@/stores/runtimeState';
import ThumbnailArea from '@/components/ThumbnailArea.vue';
import VideoPlayer from '@/components/VideoPlayer.vue';
import TimelineArea from '@/components/TimelineArea.vue';

const projectStore = new useProjectStore();
const route = useRoute();
const projectId = route.params.projectId as string;
projectStore.initWithProject(projectId);

const emit = defineEmits<{
  (event: 'setActiveProjectId', projectId: string): void
}>()

const props = defineProps<{
  activeProjectId: string
}>()

emit('setActiveProjectId', projectId)

// Runtime state
const runtimeState = reactive(new RuntimeState());

function setCurrentFrame(frameNumber: string|number) {
  // Force frameNumber to be int. Since it comes from JSON metadata it could have
  // accidentally been stored as a string. This is due to weak schema validation on Kitsu.
  // TODO: remove this casting and rely on our own data system instead
  runtimeState.currentFrame  = typeof frameNumber === 'string' ? parseInt(frameNumber) : frameNumber

  // Find the shot for the current frame (not necessarily visible as a thumbnail).
  let shotForCurrentFrame = null;
  for (const shot of projectStore.data.shots) {
    if (shot.startFrame > runtimeState.currentFrame) {
      break;
    }
    shotForCurrentFrame = shot;
  }
  runtimeState.currentShot = shotForCurrentFrame;

  // Find the corresponding sequence, if any.
  let currSequence = null;
  if (shotForCurrentFrame) {
    for (const seq of projectStore.data.sequences) {
      if (seq.id === shotForCurrentFrame.sequence_id) {
        currSequence = seq;
        break;
      }
    }
  }
  runtimeState.currentSequence = currSequence;
}

function setSelectedAssets(assets: [Asset]) {
  runtimeState.selectedAssets = assets;
}

function setIsPlaying(isPlaying: boolean) {
  runtimeState.isPlaying = isPlaying;
}

function setTimelineCanvasHeightPx(height: number) {
  runtimeState.timelineCanvasHeightPx = height;
}

function handleHotkey(event: KeyboardEvent) {
  if (event.code === 'Space') {
    runtimeState.isPlaying = !runtimeState.isPlaying;
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
  return `${runtimeState.timelineCanvasHeightPx + 33}px`
})


// Watchers
watch(() => props.activeProjectId, (projectId) => {projectStore.initWithProject(projectId)})

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

