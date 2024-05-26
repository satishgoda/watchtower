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
          .toolbar-item(v-if="runtimeState.currentSequence" title="Current Sequence")
            span.current-sequence-indicator(
              :style="uiCurrentSequenceColor(runtimeState.currentSequence.color)"
              )
            | {{ runtimeState.currentSequence.name }}
            span(v-if="runtimeState.currentShot")
              span.breadcrumb-separator |
              | {{ runtimeState.currentShot.name }}
          .toolbar-item.right(title="Frame Number")
            | {{ runtimeState.currentFrame }}
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
        @set-timeline-visible-frames="setTimelineVisibleFrames"
        @set-timeline-canvas-height-px="setTimelineCanvasHeightPx"
        :runtime-state="runtimeState"
        :project-store="projectStore.data"
        )

</template>

<script setup lang="ts">
import {onMounted, onBeforeUnmount, computed, reactive, watch} from 'vue';
import {RuntimeState} from '@/stores/runtimeState';
import type {Asset, EpisodeListItem, ProjectListItem} from '@/types.d.ts';
import ThumbnailArea from '@/components/ThumbnailArea.vue';
import VideoPlayer from '@/components/VideoPlayer.vue';
import TimelineArea from '@/components/TimelineArea.vue';
import {useProjectStore} from '@/stores/project';
import type {RuntimeStateNavigation} from '@/stores/runtimeStateNavigation';
import {useRoute, useRouter} from 'vue-router';

const projectStore = new useProjectStore();

const props = defineProps<{
  runtimeStateNavigation: RuntimeStateNavigation
  projects: ProjectListItem[]
}>()

const emit = defineEmits<{
  setRuntimeStateNavigation: [runtimeStateNavigation: RuntimeStateNavigation]
}>()

const route = useRoute();
const router = useRouter();


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

function setSelectedAssets(assets: Asset[]) {
  runtimeState.selectedAssets = assets;
}

function setTimelineVisibleFrames(frameRange: [number, number]) {
  runtimeState.timelineVisibleFrames = frameRange;
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

function uiCurrentSequenceColor(color: [number, number, number, number]) {
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

const initProject = async (projectId: string, episodeId?: string) => {
  let episodes: EpisodeListItem[] = [];
  const project = props.projects.find(project => project.id === projectId);
  if (!project) {return}

  // If the project has episodes, default to the first one
  if (project.episodes.length > 0) {
    episodes = project.episodes;
    if (!episodeId) {
      episodeId = project.episodes[0].id;
      // Update route to feature the default episodeId
    }
    await router.push({
      name: 'project-overview',
      params: { projectId: projectId },
      query: {episodeId: episodeId }
    })
  }
  await projectStore.initWithProject(
    projectId,
    episodeId
  );

  // Build a RuntimeStateNavigation to send out as signal
  const state: RuntimeStateNavigation = {
      activeProjectId: projectId,
      activeEpisodeId: episodeId,
      episodes: episodes,
    }

  return state

}

const initProjectAndSetRuntimeStateNavigation = async () => {
  // Init the project using data from the route
  const projectId = route.params['projectId'] as string;
  const episodeId = route.query['episodeId'] as string;
  await initProject(projectId, episodeId).then((state: RuntimeStateNavigation | undefined) => {
    if (!state) {return}
    // Send a signal out to update the navbar
    emit('setRuntimeStateNavigation', state);
  })
}

// On first page load
onMounted(initProjectAndSetRuntimeStateNavigation);

// Watchers
watch(() => props.runtimeStateNavigation, async (rts) => {
  const projectId = route.params['projectId'] as string;
  const episodeId = route.query['episodeId'] as string;
  if (props.runtimeStateNavigation.activeEpisodeId === episodeId &&
    props.runtimeStateNavigation.activeProjectId === projectId) {return}
  await initProject(rts.activeProjectId, rts.activeEpisodeId)
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

