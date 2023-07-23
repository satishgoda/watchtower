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
import { RuntimeState } from '@/stores/runtimeState';
import {DataProjectStore} from '@/stores/project';

const videoPlayer = ref(null)

const emit = defineEmits<{
  (event: 'setCurrentFrame', frameNumber: number): void
  (event: 'setIsPlaying', isPlaying: boolean): void
}>()

class Data {
  player?: videojs.Player
  animationFrameQueue = 0
}

const data = reactive(new Data());

const props = defineProps<{
  runtimeState: RuntimeState
  projectStore: DataProjectStore
  videoPlayerOptions?: any
}>()
function setCurrentFrame() {
  if (!data.player) {return}
  const currentFrame = data.player.currentTime() * props.projectStore.fps + props.projectStore.frameOffset;
  emit('setCurrentFrame', Math.round(currentFrame))
}

function setCurrentFrameAndRequestAnimationFrame() {
  if (!data.player) {return}
  setCurrentFrame();
  data.animationFrameQueue = data.player.requestAnimationFrame(setCurrentFrameAndRequestAnimationFrame);
}

function cancelSetCurrentFrame() {
  if (!data.player) {return}
  data.player.cancelAnimationFrame(data.animationFrameQueue);
}

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
    const currentTime = Math.max(0, (props.runtimeState.currentFrame - props.projectStore.frameOffset) / props.projectStore.fps);
    data.player.currentTime(currentTime);
  }
)

watch(
  () => props.projectStore.videoPlayerOptions.sources,
  () => {
    if (data.player) {
      // data.player.dispose()
      data.player.options_.sources = props.projectStore.videoPlayerOptions.sources;
    } else {
      if (!videoPlayer.value) {return}
      data.player = videojs(videoPlayer.value, props.projectStore.videoPlayerOptions, function onPlayerReady() {
        console.log('Player is ready');
      })
      data.player.on('play', setCurrentFrameAndRequestAnimationFrame);
      // Update global isPlaying status
      data.player.on('play', () => {emit('setIsPlaying', true)});
      data.player.on('pause', cancelSetCurrentFrame);
      // Update global isPlaying status
      data.player.on('pause', () => {emit('setIsPlaying', false)});
      data.player.on('seeking', setCurrentFrame);
    }
  }
)

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
