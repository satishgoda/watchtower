<template lang="pug">
.videojs-container
  video(
    ref="videoPlayer"
    class="video-js vjs-fluid"
    )
</template>

<script setup lang="ts">
import videojs from 'video.js';
import './../../node_modules/video.js/dist/video-js.css'
import { reactive, ref, watch, onBeforeUnmount } from 'vue';
import { useProjectStore } from '@/stores/project';
import { RuntimeState } from '@/stores/runtimeState';

const projectStore = useProjectStore();

const videoPlayer = ref(null)

const emit = defineEmits<{
  (event: 'setCurrentFrame', frameNumber: number): void
}>()

interface Data {
  player?: videojs.Player
  animationFrameQueue?: number
}

const data: Data = reactive({
  player: undefined,
  animationFrameQueue: undefined,
})

const props = defineProps<{
  runtimeState: RuntimeState
  videoPlayerOptions?: any
}>()



// Watchers
watch(
  () => props.runtimeState.isPlaying,
  () => {
    if (!data.player) {return}
    if (props.runtimeState.isPlaying) {
      data.player.play()
    } else {
      data.player.pause();
    }
  }
)

watch(
  () => props.runtimeState.currentFrame,
  () => {
    // If the player is not ready, or it is currently playing, do nothing.
    if (!data.player || !data.player.paused()) {
      return;
    }

    // Limit frame value to 0 or greater
    const currentTime = Math.max(0, (props.runtimeState.currentFrame - projectStore.frameOffset) / projectStore.fps);
    data.player.currentTime(currentTime);
  }
)

watch(
  () => projectStore.videoPlayerOptions.sources,
  () => {
    if (data.player) {
      // data.player.dispose()
      data.player.options_.sources = projectStore.videoPlayerOptions.sources;
    } else {
      data.player = videojs(videoPlayer.value, projectStore.videoPlayerOptions, function onPlayerReady() {
        console.log('Player is ready');
      })
      data.player.on('play', setCurrentFrameAndRequestAnimationFrame);
      // Update global isPlaying status
      data.player.on('play', () => {props.runtimeState.isPlaying = true});
      data.player.on('pause', cancelSetCurrentFrame);
      // Update global isPlaying status
      data.player.on('pause', () => {props.runtimeState.isPlaying = false});
      data.player.on('seeking', setCurrentFrame);
    }
  }
)

function setCurrentFrame() {
  if (!data.player) {return}
  const currentFrame = data.player.currentTime() * projectStore.fps + projectStore.frameOffset;
  emit('setCurrentFrame', Math.round(currentFrame))
}

function setCurrentFrameAndRequestAnimationFrame() {
  if (!data.player) {return}
  setCurrentFrame();
  data.animationFrameQueue = data.player.requestAnimationFrame(setCurrentFrameAndRequestAnimationFrame);
}

function cancelSetCurrentFrame() {
  data.player.cancelAnimationFrame(data.animationFrameQueue);
}

onBeforeUnmount(() => {
  if (data.player) {
    data.player.dispose();
  }
})

</script>

<style>
.video-js {
  border-radius: var(--border-radius);
}

video {
  border-radius: var(--border-radius);
}

.video-js .vjs-control-bar {
  background-color: var(--bg-color);
  border-bottom-left-radius: var(--border-radius);
  border-bottom-right-radius: var(--border-radius);
  display: flex;
  opacity: 1;
}

.vjs-paused .vjs-big-play-button {
  display: none;
}

.video-js .vjs-control-bar {
  position: initial;
}
</style>
