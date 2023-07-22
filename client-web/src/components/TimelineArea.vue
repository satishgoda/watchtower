<template lang="pug">
#canvas-timeline-container.timeline-container(ref="canvasTimelineContainer")
  .toolbar
    .toolbar-item
      span
        input#showTasksStatus(type="checkbox" v-model="props.runtimeState.isShowingTimelineTasks")
        label(for="showTasksStatus") Show Tasks Status
      span(v-if="props.runtimeState.selectedAssets.length")
        input#showSelectedAssets(type="checkbox" v-model="data.showSelectedAssets")
        label(for="showSelectedAssets") Show Selected Assets
      button(@click="fitTimelineView") Fit View
  canvas(
    id="canvas-timeline"
    ref="canvasTimeline")
  canvas(
    id="canvas-timeline-text"
    ref="canvasTimelineText"
    @mousedown="onMouseEvent($event)"
    @mouseup="onMouseEvent($event)"
    @mousemove="onMouseEvent($event)"
    @mouseleave="onMouseEvent($event)"
    @wheel="onScroll($event)"
    )

</template>

<script setup lang="ts">

import { UIRenderer } from 'uirenderer-canvas';
import { DataProjectStore } from '@/stores/project';
import { reactive, ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { RuntimeState } from '@/stores/runtimeState';


const emit = defineEmits<{
  (event: 'setCurrentFrame', frameNumber: number): void
  (event: 'setTimelineCanvasHeightPx', height: number): void
}>()

const props = defineProps<{
  runtimeState: RuntimeState,
  projectStore: DataProjectStore, // this is actually reactive(DataProjectStore)
}>()


const canvasTimelineContainer = ref(null);
const canvasTimeline = ref(null);
const canvasTimelineText = ref(null);

class Data {
  // View user configuration.
  showTasksStatus = true;
  showSelectedAssets = true;
  // Canvas & rendering context.
  canvas?: HTMLCanvasElement;
  canvasText?: HTMLCanvasElement;
  uiRenderer?: UIRenderer;
  ui2D?: CanvasRenderingContext2D;
  // Runtime state
  timelineRange = { x: 0 , w: 100 }; // Position where the timeline starts and the width, in canvas coordinates.
  timelineView = { x: 0 , w: 100 }; // Window of the visible timeline, mapped to occupy timelineRange. Represents pan and zoom.
  channelNamesWidth = 50; // Width in px of the longest channel name. Channel name area is this value + timeline.padX.
  // Interaction.
  isMouseDragging = { LMB: false, MMB: false, };
  gesture = {
    initialMouseCoords: {x: 0, y: 0},
    initialViewRect: {x: 0, w: 100},
  };
  // "Current" elements for the playhead position.
  shotForCurrentFrame: Shot | null = null;
}

const data = reactive(new Data());

const uiConfig = {
  // Layout constants.
  fontSize: 12,
  margin: {x: 15, top: 22, bottom: 7}, // Spacing around the contents of the timeline canvas. One side, in px.
  currFrameHighlight: { width: 1.5, color: [0.85, 0.8, 0.7, 1.0], },
  castingHighlight: { width: 1.5, color: [0.2, 0.58, 0.8, 1.0], },
  playhead: {
    padY: 8, // From the absolute top. Ignores 'margin'.
    triangle: {width: 12.0, height: 8.0, flatHeight: 4.0},
    lineWidth: 2.0,
    color: [0.85, 0.8, 0.7, 1.0],
    shadow: { radius: 1.5, color: [0, 0, 0, 0.5] },
  },
  timeline: {
    padX: 20,
    frame0Color: [0.36, 0.36, 0.36, 1.0],
  },
  sequences: {
    fontPad: {x: 2, top: 3, bottom: 1},
    fontSize: 10,
    height: 6,
    channelHeight: 3 + 10 + 1 + 6 + 4, // 24, matches channels.
    corner: 0,
  },
  shots: {
    height: 27,
    channelHeight: 40,
    lineWidth: 1,
    corner: 0,
    color: [0.3, 0.3, 0.3, 1.0],
  },
  channels: {
    namePadX: 8,
    height: 24,
    contentHeight: 12,
    colorOdd: [0.12, 0.12, 0.12, 1.0],
    colorEven: [0.16, 0.16, 0.16, 1.0],
  }
}

// Computed props
const taskTypesForShots = computed(() => {
  return props.projectStore.taskTypes.filter(taskType => taskType.for_shots === true);
})

// Methods

function getCanvasRect() {
  return data.canvas!.getBoundingClientRect();
}

function clientToCanvasCoords(event: MouseEvent) {
  const rect = getCanvasRect();
  return {
     x: event.clientX - rect.left,
     y: event.clientY - rect.top
  }
}

function pxToFrame(canvasX: number) {
  // Convert from a pixel position in the canvas to a frame.
  const offset = data.timelineView.x - data.timelineRange.x; // Pan.
  const scale = data.timelineRange.w / data.timelineView.w; // Zoom.
  const timelineFracPx = offset + (canvasX - data.timelineRange.x) / scale;
  let newCurrentFrame = (timelineFracPx / data.timelineRange.w) * props.projectStore.totalFrames;
  // Clamp to the edit's frame range.
  newCurrentFrame = Math.min(Math.max(newCurrentFrame, 0), props.projectStore.totalFrames);
  // Return the closest frame.
  return Math.round(newCurrentFrame);
}

function resizeCanvas(shouldDraw=true) {
  // Resize canvas height according to the number of channels and to the full available width.
  const canvasContainer = document.getElementById('canvas-timeline-container');
  if (!data.canvas || !data.canvasText || !canvasContainer) {return}
  let numChannels = 0;
  if (data.showSelectedAssets) { numChannels += props.runtimeState.selectedAssets.length; }
  if (props.runtimeState.isShowingTimelineTasks) { numChannels += taskTypesForShots.value.length; }
  data.canvas.width = canvasContainer.offsetWidth;
  data.canvas.height = uiConfig.margin.top
      + uiConfig.sequences.channelHeight
      + uiConfig.shots.channelHeight
      + uiConfig.channels.height * numChannels
      + uiConfig.margin.bottom;

  data.canvasText.width = data.canvas.width;
  data.canvasText.height = data.canvas.height;
  emit('setTimelineCanvasHeightPx', data.canvas.height);

  // Store the view window before the resize. Pan and zoom will be preserved.
  const offset = data.timelineView.x - data.timelineRange.x; // Pan.
  const scale = data.timelineRange.w / data.timelineView.w; // Zoom.

  // Update cached timeline horizontal range.
  const margin = uiConfig.margin;
  const timelineX = margin.x + data.channelNamesWidth + uiConfig.timeline.padX;
  data.timelineRange.x = timelineX;
  data.timelineRange.w = data.canvas!.width - timelineX - margin.x;

  // Update the view window to show the same frame range as before the resize.
  data.timelineView.x = data.timelineRange.x + offset;
  data.timelineView.w = data.timelineRange.w / scale;

  if (shouldDraw) {
    draw();
  }
}

function initCanvas() {
  data.canvas = canvasTimeline.value! as HTMLCanvasElement;
  data.uiRenderer = new UIRenderer(data.canvas, draw);

  data.canvasText = canvasTimelineText.value! as HTMLCanvasElement;
  data.ui2D = data.canvasText.getContext('2d');

  // Resize the canvas to fill browser window dynamically
  window.addEventListener('resize', () => {resizeCanvas()}, false);

  // Call the re-size once to trigger the sizing, but avoid drawing because
  // images (if any) haven't been created yet.
  resizeCanvas(false);
}

function updateChannelNamesWidth() {
  // Calculate the width in px needed to fit all possible channel names.
  let channelNamesWidth = data.ui2D.measureText('Sequences').width;
  for (const task of taskTypesForShots.value) {
    channelNamesWidth = Math.max(channelNamesWidth, data.ui2D.measureText(task.name).width);
  }
  for (const asset of props.projectStore.assets) {
    channelNamesWidth = Math.max(channelNamesWidth, data.ui2D.measureText(asset.name).width);
  }

  // Use the widest name found, but clamp to a fixed max width to guard against unreasonably long strings from data.
  data.channelNamesWidth = Math.min(channelNamesWidth, 400);
}

function draw() {
  const rect = getCanvasRect();
  const ui = data.uiRenderer!; // UIRenderer is guaranteed to exist. It's created onMount.
  ui.beginFrame();

  // Setup style for the text rendering in the overlaid canvas for text.
  const fontSize = uiConfig.fontSize;
  data.ui2D.clearRect(0, 0, data.canvasText!.width, data.canvasText!.height);
  data.ui2D.fillStyle = 'rgb(220, 220, 220)';
  data.ui2D.font = fontSize + 'px sans-serif';
  data.ui2D.textAlign = 'left';
  data.ui2D.textBaseline = 'top';
  data.ui2D.shadowOffsetX = 1;
  data.ui2D.shadowOffsetY = 1;
  data.ui2D.shadowBlur = 2;
  data.ui2D.shadowColor = 'rgba(0, 0, 0, 0.5)';

  // Calculate size and position of elements.
  const margin = uiConfig.margin;
  const numChannels = taskTypesForShots.value.length;
  const channelStep = uiConfig.channels.height;
  const timelinePadX = uiConfig.timeline.padX;
  const timelineX = data.timelineRange.x;
  const timelineW = data.timelineRange.w;
  const timelineTop = margin.top;
  const timelineBottom = rect.height - uiConfig.margin.bottom;
  const seqChannelHeight = uiConfig.sequences.channelHeight;
  const seqHeight = uiConfig.sequences.height;
  const seqTextPad = uiConfig.sequences.fontPad;
  const seqFontSize = uiConfig.sequences.fontSize;
  const seqPaddedTextHeight = seqTextPad.top + seqTextPad.bottom + seqFontSize;
  const seqTop = margin.top + seqPaddedTextHeight;
  const shotHeight = uiConfig.shots.height;
  const shotChannelHeight = uiConfig.shots.channelHeight;
  const shotChannelTop = margin.top + seqChannelHeight;
  const shotTop = shotChannelTop + Math.round((shotChannelHeight - shotHeight) / 2);
  const channelStartY = margin.top + seqChannelHeight + shotChannelHeight;
  const channelContentPadY = Math.round((channelStep - uiConfig.channels.contentHeight) / 2);
  const channelBGWidth = data.channelNamesWidth + timelinePadX + timelineW;
  const channelColor0 = uiConfig.channels.colorEven;
  const channelColor1 = uiConfig.channels.colorOdd;

  // Draw channel strips background.
  ui.addRect(margin.x, margin.top, channelBGWidth, seqChannelHeight, channelColor0);
  ui.addRect(margin.x, shotChannelTop, channelBGWidth, shotChannelHeight, channelColor1);
  let channelY = channelStartY;
  for (let i=0; i < numChannels; i++) {
    const color = i % 2 === 1 ? channelColor1 : channelColor0;
    ui.addRect(margin.x, channelY, channelBGWidth, channelStep, color);
    channelY += channelStep;
  }

  // Set the timeline area view window.
  const offset = data.timelineView.x - data.timelineRange.x; // Pan.
  const scale = data.timelineRange.w / data.timelineView.w; // Zoom.
  const view = ui.pushView(
    data.timelineRange.x, 0, data.timelineRange.w, rect.height,
    [scale, 1], [offset, 0]
  );

  // Draw shots.
  const shotsStyle = uiConfig.shots;
  const taskHeight = uiConfig.channels.contentHeight;
  for (const shot of props.projectStore.shots) {
    const startPos = timelineX + shot.startFrame * timelineW / props.projectStore.totalFrames;
    const endFrame = shot.startFrame + shot.durationSeconds * props.projectStore.fps;
    const endPos = timelineX + endFrame * timelineW / props.projectStore.totalFrames;
    const shotWidth = endPos - startPos;
    ui.addFrame(startPos, shotTop, shotWidth, shotHeight, shotsStyle.lineWidth, shotsStyle.color, shotsStyle.corner);
  }
  // Draw a border around the shot corresponding to the current frame.
  if (data.shotForCurrentFrame) {
    const shot = data.shotForCurrentFrame;
    const rim = uiConfig.currFrameHighlight;
    const startPos = timelineX + shot.startFrame * timelineW / props.projectStore.totalFrames;
    const endFrame = shot.startFrame + shot.durationSeconds * props.projectStore.fps;
    const endPos = timelineX + endFrame * timelineW / props.projectStore.totalFrames;
    const shotWidth = endPos - startPos;
    ui.addFrame(startPos, shotTop, shotWidth, shotHeight, rim.width, rim.color, shotsStyle.corner);
  }

  // Draw selected assets.
  channelY = channelStartY + channelContentPadY;
  if (data.showSelectedAssets) {
    for (const asset of props.runtimeState.selectedAssets) {
      // Get the contiguous frame ranges where this asset appears.
      let {startPos, widths} = getRangesWhere((shot: Shot) => { return shot.asset_ids.includes(asset.id); });
      // Draw a rect for each range of shots.
      for (let i = 0; i < startPos.length; i++) {
        ui.addRect(startPos[i], channelY, widths[i], taskHeight, uiConfig.castingHighlight.color);
      }
      channelY += channelStep;
    }
  }

  // Draw task statuses.
  if (props.runtimeState.isShowingTimelineTasks) {
    for (const taskType of taskTypesForShots.value) { // e.g. "Animation"
      for (const status of props.projectStore.taskStatuses) { // e.g. "Done"
        // Get the contiguous frame ranges for this task status.
        let {startPos, widths} = getRangesWhere((shot: Shot) => {
          // Search if the shot has a status for the current task type.
          for (const taskStatus of shot.tasks) {
            if (taskStatus.task_type_id === taskType.id) {
              // It does, check if the status for this task matches the requested one.
              return (taskStatus.task_status_id === status.id);
            }
          }
          return false;
        });
        // Draw a rect for each range of shots.
        for (let i = 0; i < startPos.length; i++) {
          ui.addRect(startPos[i], channelY, widths[i], taskHeight, status.color);
        }
      }
      channelY += channelStep;
    }
  }

  // Draw sequences
  const seqCorner = uiConfig.sequences.corner;
  data.ui2D.font = seqFontSize + 'px sans-serif';
  for (const sequence of props.projectStore.sequences) {
    // Find continuous ranges of shots that belong to this sequence.
    // In theory, a sequence has a single contiguous range, but in practice,
    // there might shots mistakenly assigned to sequences or shots missing.
    const {startPos, widths} = getRangesWhere((shot: Shot) => sequence.id === shot.sequence_id);
    // Draw a rect for each range of shots belonging to this sequence.
    for (let i = 0; i < startPos.length; i++) {
      ui.addRect(startPos[i], seqTop, widths[i], seqHeight, sequence.color, seqCorner);
    }
    if (startPos.length) {
      // Draw the sequence name in the visible space above the first range.
      const clipL = Math.max(view.transformPosX(startPos[0]), view.left);
      const clipR = Math.min(view.transformPosX(startPos[0] + widths[0]), view.right);
      const clippedWidth = clipR - clipL;
      const availableWidth = clippedWidth - seqTextPad.x * 2 - data.ui2D.measureText('..').width;
      if (availableWidth > 0) {
        let name = sequence.name;
        while (data.ui2D.measureText(name).width > availableWidth) {
          name = name.slice(0, -1);
        }
        if (name !== sequence.name) {
          name += '..';
        }
        data.ui2D.fillText(name, clipL + seqTextPad.x, seqTop - (seqFontSize + seqTextPad.bottom));
      }
    }
  }
  data.ui2D.font = fontSize + 'px sans-serif';

  ui.popView();

  // Render timeline start as a line between the channel names and the timeline content.
  // The timeline content might not start at frame 0, so the line is important.
  const frame0LineColor = uiConfig.timeline.frame0Color;
  ui.addLine([timelineX, timelineTop], [timelineX, timelineBottom], 1, frame0LineColor);

  // Playhead
  // Update the playhead position according to the current frame.
  // The playhead position moves with the current zoom and pan, but the playhead geometry is unscaled.
  const playheadPos = view.transformPosX(timelineX + props.runtimeState.currentFrame / props.projectStore.totalFrames * timelineW);
  if (playheadPos >= view.left && playheadPos <= view.right) {
    const playhead = uiConfig.playhead;
    const triangle = uiConfig.playhead.triangle;
    const triangleTop = playhead.padY + playhead.triangle.flatHeight;
    const triangleHalfWidth = (triangle.width - 0.5) * 0.5;
    // Shadow.
    const shadowRadius = playhead.shadow.radius;
    const shadowColor = playhead.shadow.color;
    ui.addLine(
      [playheadPos + shadowRadius, playhead.padY + triangle.height + shadowRadius], // Triangle tip. (Up)
      [playheadPos + shadowRadius, rect.height - playhead.padY + shadowRadius], // (Down)
      playhead.lineWidth, shadowColor
    );
    ui.addLine(
      [playheadPos,                     triangleTop + triangle.height], // Center, down.
      [playheadPos + triangleHalfWidth, triangleTop], // Top, right.
      3, shadowColor
    );
    ui.addLine(
      [playheadPos + triangleHalfWidth + shadowRadius * 0.8, triangleTop], // Top, right.
      [playheadPos + triangleHalfWidth + shadowRadius * 0.8, playhead.padY + shadowRadius], // Toppest, right.
      2, shadowColor
    );
    // Playhead.
    ui.addLine(
      [playheadPos, playhead.padY + triangle.height], // Triangle tip. (Up)
      [playheadPos, rect.height - playhead.padY], // (Down)
      playhead.lineWidth, playhead.color
    );
    ui.addTriangle(
      [playheadPos,                     triangleTop + triangle.height], // Center, down.
      [playheadPos - triangleHalfWidth, triangleTop], // Top, left.
      [playheadPos + triangleHalfWidth, triangleTop], // Top, right.
      playhead.color
    );
    ui.addRect(
      playheadPos - triangle.width * 0.5, playhead.padY,
      triangle.width + 1, playhead.triangle.flatHeight + 1, playhead.color, 1
    );
  }

  const halfFontSize = fontSize / 2;
  const textX = margin.x + uiConfig.channels.namePadX;
  let textY = margin.top + Math.round(seqChannelHeight / 2) - halfFontSize;
  data.ui2D.fillText('Sequences', textX, textY);
  textY = shotChannelTop + Math.round(shotChannelHeight / 2) - halfFontSize;
  data.ui2D.fillText('Shots', textX, textY);
  textY = channelStartY + Math.round(channelStep / 2) - halfFontSize;
  if (data.showSelectedAssets) {
    for (const asset of props.runtimeState.selectedAssets) {
      data.ui2D.fillText(asset.name, textX, textY);
      textY += channelStep;
    }
  }
  if (props.runtimeState.isShowingTimelineTasks) {
    for (const task of taskTypesForShots.value) {
      data.ui2D.fillText(task.name, textX, textY);
      textY += channelStep;
    }
  }

  // Draw the frame.
  ui.draw();
}

// Find continuous ranges of shots where the given condition is true.
function getRangesWhere(hasProp: Function) {
  let currRange = -1;
  const startFrames = [];
  const endFrames = [];

  for (const shot of props.projectStore.shots) {
    if (hasProp(shot)) {
      if (currRange === -1) {
        startFrames.push(shot.startFrame);
        currRange = shot.startFrame + shot.durationSeconds * props.projectStore.fps;
      } else if (currRange === shot.startFrame) {
        currRange += shot.durationSeconds * props.projectStore.fps;
      } else {
        endFrames.push(currRange);
        startFrames.push(shot.startFrame);
        currRange = shot.startFrame + shot.durationSeconds * props.projectStore.fps;
      }
    } else if (currRange !== -1) {
      endFrames.push(currRange);
      currRange = -1;
    }
  }
  endFrames.push(currRange);

  // Convert frame ranges to X positions on the timeline area
  const timelineX = data.timelineRange.x;
  const timelineFrameW = data.timelineRange.w / props.projectStore.totalFrames;
  const startPos = [];
  const widths = [];
  for (let i = 0; i < startFrames.length; i++) {
    startPos.push(timelineX + startFrames[i] * timelineFrameW);
    widths.push((endFrames[i] - startFrames[i]) * timelineFrameW);
  }
  return {startPos, widths};
}

function findShotForCurrentFrame() {
  let shotForCurrentFrame = null;
  for (const shot of props.projectStore.shots) {
    if(shot.startFrame > props.runtimeState.currentFrame)
      break;
    shotForCurrentFrame = shot;
  }
  data.shotForCurrentFrame = shotForCurrentFrame;
}

function onVisibleFrameRangeUpdated() {
  const startFrame = pxToFrame(data.timelineRange.x);
  const endFrame = pxToFrame(data.timelineRange.x + data.timelineRange.w);
  props.runtimeState.timelineVisibleFrames = [startFrame, endFrame];

  draw();
}

function onChannelsUpdated() {
  // Update the width needed to show the channel names.
  updateChannelNamesWidth();
  // Resize the timeline area to fit all channels (that are visible).
  resizeCanvas();

  // Ensure the timeline area view doesn't go under the channel names.
  const overlap = data.timelineRange.x - data.timelineView.x;
  if (overlap > 0) {
    data.timelineView.x = data.timelineRange.x;
    data.timelineView.w -= overlap;
  }
  // draw() will be triggered by the update to timelineView.
}

function fitTimelineView() {
  data.timelineView = { x: data.timelineRange.x, w: data.timelineRange.w };
}

function panTimelineView(deltaX: number, initialX: number) {
  const viewWidth = data.timelineView.w;
  const scaleFactor = data.timelineView.w / data.timelineRange.w;
  let newViewRectX = initialX - deltaX * scaleFactor;
  newViewRectX = Math.max(newViewRectX, data.timelineRange.x);
  newViewRectX = Math.min(newViewRectX, data.timelineRange.x + data.timelineRange.w - viewWidth);

  data.timelineView = { x: newViewRectX, w: viewWidth };
}

function zoomTimelineView(pivotX: number, delta: number) {
  let pivotFrac = (pivotX - data.timelineRange.x) / data.timelineRange.w;
  pivotFrac = Math.min(Math.max(0, pivotFrac), 1);

  let widthIncrease = delta * 2;
  if (data.timelineView.w + widthIncrease < 10) {
    widthIncrease = 0;
  }
  let viewPosX = data.timelineView.x - widthIncrease * pivotFrac;
  let viewWidth = data.timelineView.w + widthIncrease;
  viewPosX = Math.max(viewPosX, data.timelineRange.x);
  const viewRight = Math.min(viewPosX + viewWidth, data.timelineRange.x + data.timelineRange.w);
  viewWidth = viewRight - viewPosX;

  data.timelineView = { x: viewPosX, w: viewWidth };
}

function onMouseEvent(event: MouseEvent) {
  // Set a new playhead position when LMB clicking or dragging.
  if (data.isMouseDragging.LMB
    && (event.type === 'mousemove' || event.type === 'mouseup')) {
    const mouse = clientToCanvasCoords(event);
    emit('setCurrentFrame', pxToFrame(mouse.x))
  }

  // Pan when MMB dragging.
  if (event.type === 'mousedown' && event.button === 1) {
    data.gesture.initialMouseCoords = clientToCanvasCoords(event);
    data.gesture.initialViewRect = data.timelineView;
  }

  if (data.isMouseDragging.MMB
      && (event.type === 'mousemove' || event.type === 'mouseup')) {
    const mouse = clientToCanvasCoords(event);
    if (!data.gesture.initialMouseCoords || !data.gesture.initialViewRect) {return}
    panTimelineView(mouse.x - data.gesture.initialMouseCoords.x, data.gesture.initialViewRect.x);
    //console.log(mouse, event.movementX, event.movementY, this.mmbxy.x - mouse.x);
  }

  // Update mouse capturing state.
  if (event.type === 'mousedown') {
    if      (event.button === 0) { data.isMouseDragging.LMB = true; }
    else if (event.button === 1) { data.isMouseDragging.MMB = true; }
  } else if (event.type === 'mouseup' ) {
    if      (event.button === 0) { data.isMouseDragging.LMB = false; }
    else if (event.button === 1) { data.isMouseDragging.MMB = false; }
  } else if (event.type === 'mouseleave') {
    data.isMouseDragging.LMB = false;
    data.isMouseDragging.MMB = false;
  }
}

function onScroll(event: WheelEvent) {
  const mouse = clientToCanvasCoords(event);
  if (event.deltaY !== 0) {
    zoomTimelineView(mouse.x, event.deltaY);
  }
  if (event.deltaX !== 0) {
     panTimelineView(-event.deltaX, data.timelineView.x);
  }
  // Prevent the full page from scrolling vertically.
  event.preventDefault();
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Home') {
    fitTimelineView();
  } else if (event.key === 'ArrowRight') {
    if (!data.shotForCurrentFrame) {return}
    const idx = props.projectStore.shots.indexOf(data.shotForCurrentFrame);
    const newIdx = Math.min(projectStore.shots.length, (idx === -1) ? 0 : idx + 1);
    emit('setCurrentFrame', props.projectStore.shots[newIdx].startFrame)
  } else if (event.key === 'ArrowLeft') {
    if (!data.shotForCurrentFrame) {return}
    const idx = props.projectStore.shots.indexOf(data.shotForCurrentFrame);
    const newIdx = Math.max(0, (idx === -1) ? 0 : idx - 1);
    emit('setCurrentFrame', props.projectStore.shots[newIdx].startFrame)
  }
}

// Watchers

watch(() => props.runtimeState.isShowingTimelineTasks, onChannelsUpdated)
watch(() => data.showSelectedAssets, onChannelsUpdated)
watch(() => props.projectStore.taskTypes, onChannelsUpdated)
watch(() => props.projectStore.taskStatuses, draw)
watch(() => props.projectStore.sequences, draw)
watch(() => props.projectStore.shots, draw)
watch(() => props.projectStore.assets, onChannelsUpdated)
watch(() => props.runtimeState.selectedAssets, onChannelsUpdated)
watch(() => props.projectStore.totalFrames, onVisibleFrameRangeUpdated)
watch(() => data.timelineView, onVisibleFrameRangeUpdated)
watch(
  () => props.runtimeState.currentFrame,
  () => {
    // Find the shot that should be highlighted.
    findShotForCurrentFrame();
    draw();
  })

onMounted(() => {
  document.body.addEventListener('keydown', onKeyDown);
  initCanvas();
  fitTimelineView();

  // Note: Image loading, if any, should go here.

  // Initial draw of this component.
  draw();
})

onUnmounted(() => {
  document.body.removeEventListener('keydown', onKeyDown);
})

</script>

<style scoped>
canvas {
  display: block;
}

.timeline-container {
  background-color: var(--panel-bg-color);
  border-radius: var(--border-radius);
  margin: 0 auto;
  position: relative;
  width: calc(100vw - var(--spacer-3));
}

#canvas-timeline {
  position: absolute;
}
#canvas-timeline-text {
  position: absolute;
  z-index: 10;
}

label {
  padding-left: var(--spacer);
}
input {
  margin-left: 1rem;
  /* margin-right: -0.8rem; */
}
button {
  margin-left: 1.5rem;
}
</style>
