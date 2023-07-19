<template lang="pug">
#canvas-thumb-grid-container.thumbnailview-container
  .toolbar
    .toolbar-item
      select(v-model='data.mode')
        option(value='shots') Shots
        option(value='assets') Assets
    .toolbar-item
      label(for='seqFilterMode') Show
      select(v-model='data.seqFilterMode')
        option(value='showAll') All
        option(value='showActiveSequence') Current Sequence
        option(value='showShotsInTimelineView') Timeline View
    .toolbar-item
      select(v-model='data.taskTypeFilter')
        option(value='') No Task Type
        option(v-for='option in taskTypesForMode' :key='option.id' :value='option.id')
          | {{ option.name }}
    .toolbar-item
      span(v-if="data.taskTypeFilter !== ''")
        input#showAssignees(type='checkbox' v-model='data.showAssignees')
        label(for='showAssignees') Assignees
        input#showStatuses(type='checkbox' v-model='data.showStatuses')
        label(for='showStatuses') Status
        select(
          v-model='data.statusDispMode'
          :disabled='data.showStatuses === false'
          )
          option(value='dots') Dots
          option(value='stripes') Stripes
          option(value='rects') Heatmap
    .toolbar-item
      label(for='displayMode') Group by
      select(v-model='data.displayMode')
        option(v-if="data.mode === 'shots'" value='chronological') Chronological (ungrouped)
        option(v-if="data.mode === 'assets'" value='chronological') Ungrouped
        option(v-if="data.mode === 'shots'" value='groupBySequence') Sequence
        option(v-if="data.mode === 'assets'" value='groupByAssetType') Asset Type
        option(v-if="data.taskTypeFilter !== ''" value='groupByTaskStatus') Task Status
        option(v-if="data.taskTypeFilter !== ''" value='groupByAssignee') Assignee
  canvas#canvas-thumb-grid
  canvas#canvas-thumb-grid-text(
    @mousedown="onMouseEvent($event)"
    @mouseup='onMouseEvent($event)'
    @mousemove='onMouseEvent($event)'
    @mouseleave='onMouseEvent($event)'
    )

</template>


<script setup lang="ts">
import { UIRenderer, UILayout } from 'uirenderer-canvas';
import { useProjectStore } from '@/stores/project';
import { reactive, computed, watch, onMounted, nextTick } from 'vue';

const projectStore = useProjectStore();

interface SummaryText {
  str: string,
  pos: [number, number],
}

class Data {
  mode = 'shots';
  seqFilterMode = 'showAll';
  taskTypeFilter = '';
  showAssignees = true;
  showStatuses = true;
  displayMode = 'chronological';
  statusDispMode = 'dots';
  // Canvas & rendering context.
  canvas?: HTMLCanvasElement;
  canvasText?: HTMLCanvasElement;
  uiRenderer?: UIRenderer;
  ui2D?: CanvasRenderingContext2D;
  // Thumbnail rendering.
  shotsTexBundleID?: WebGLTexture; // Rendering context texture ID for the packed thumb images for shots.
  shotsOriginalImageSize = [0, 0]; // Resolution of the provided thumbnail images.
  assetsTexBundleID?: WebGLTexture;
  assetsOriginalImageSize = [0, 0];
  thumbnailSize = [0, 0]; // Resolution at which to render the thumbnails.
  thumbnails: UILayout.ThumbnailImage[] = []; // Display info for the thumbs that should be rendered. List of UILayout.ThumbnailImage.
  duplicatedThumbs: UILayout.ThumbnailImage[] = []; // Keep track of thumbnails that represent the same shot (because it shows in multiple groups).
  // Grouped view.
  thumbGroups: UILayout.ThumbnailGroup[] = []; // Display info for groups. List of UILayout.ThumbnailGroup.
  summaryText = { str: '', pos: [0, 0], }; // Heading with aggregated information of the displayed groups.
  // Assignees.
  usersTexBundleID?: WebGLTexture; // Rendering context texture ID for the packed user avatar images.
  // Interaction.
  isMouseDragging = false;
  // "Current" elements for the playhead position.
  thumbForCurrentFrame: UILayout.ThumbnailImage | null = null;
  activeSequence: Sequence | null = null;
  activeShot: Shot | null = null;
  // Task & statuses cache.
  currTaskType: TaskType | null = null;
}

const data = reactive(new Data())

const uiConfig =  {
  // Layout constants.
  fontSize: 12,
  selectedHighlight: { width: 1.5, color: [1.0, 0.561, 0.051, 1.0], },
  currFrameHighlight: { width: 1.5, color: [0.85, 0.8, 0.7, 1.0], },
  castingHighlight: { width: 1.5, color: [0.2, 0.58, 0.8, 1.0], },
  thumbOverlayInfo: { textPad: 5, color: [0.11, 0.11, 0.11, 0.8] },
  taskStatus: { radius: 5, offsetX: 5, offsetY: 6, disabledColor: [0.05, 0.05, 0.05, 0.8] },
  assignees: { avatarSize: 32, offsetX: 5, offsetY: 5, spaceInBetween: 2 },
  // View.
  minMargin: 40, // Minimum padding, in pixels, around the thumbnail area. Divide by 2 for one side.
  totalSpacing: [150, 150], // Maximum accumulated space between thumbs + margin.
  // Grouped view.
  groupedView: {
    summaryText: { spaceBefore: -10, spaceAfter: 12, },
    groupTitle: { spaceBefore: 4, spaceAfter: 2, },
    colorRect: { width: 6, xOffset: 12, },
  }
}

// Computed props
const taskTypesForShots = computed(() => {
  return projectStore.taskTypes.filter(taskType => taskType.for_shots === true);
})

const taskTypesForAssets = computed(() => {
  return projectStore.taskTypes.filter(taskType => taskType.for_shots === false);
})

const taskTypesForMode = computed(() => {
  const showShots = (data.mode === 'shots');
  return projectStore.taskTypes.filter(taskType => taskType.for_shots === showShots);
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

async function resizeCanvas(shouldDraw=true) {
  // Skip execution if canvas or canvasText are undefined
  if (!data.canvas || !data.canvasText) {return}
  await nextTick();

  const canvasContainer = document.getElementById('canvas-thumb-grid-container')!;
  const rowThumbnails = document.getElementById('row-thumbnails');

  data.canvas.width = canvasContainer.offsetWidth;
  data.canvas.height = rowThumbnails!.clientHeight - 50;

  data.canvasText.width = data.canvas.width;
  data.canvasText.height = data.canvas.height;

  if (shouldDraw) {
    layout();
    draw();
  }
}

function initCanvas() {
  data.canvas = document.getElementById('canvas-thumb-grid') as HTMLCanvasElement;
  data.uiRenderer = new UIRenderer(data.canvas, draw);

  data.canvasText = document.getElementById('canvas-thumb-grid-text') as HTMLCanvasElement;
  data.ui2D = data.canvasText.getContext('2d');

  // Resize the canvas to fill browser window dynamically
  window.addEventListener('resize', () => {resizeCanvas()}, false);

  // Call the re-size once to trigger the sizing, but avoid drawing because
  // images (if any) haven't been created yet.
  // await nextTick();
  resizeCanvas(false);
}

function refreshAndDraw() {
  filterThumbnails();
  refreshThumbnailGroups();
  layout();
  draw();
}

function draw() {
  const ui = data.uiRenderer!; // UIRenderer is guaranteed to exist. It's created onMount.
  ui.beginFrame();

  // Setup style for the text rendering in the overlaid canvas for text.
  const fontSize = uiConfig.fontSize;
  data.ui2D.clearRect(0, 0, data.canvasText!.width, data.canvasText!.height);
  data.ui2D.fillStyle = 'rgb(220, 220, 220)';
  data.ui2D.font = fontSize + 'px sans-serif';
  data.ui2D.textAlign = 'left';
  data.ui2D.textBaseline = 'top';
  data.ui2D.shadowOffsetX = 2;
  data.ui2D.shadowOffsetY = 2;
  data.ui2D.shadowBlur = 2;
  data.ui2D.shadowColor = 'rgba(0, 0, 0, 0.5)';

  // If the resulting layout makes the images too small, skip rendering.
  let hasProblemMsg = null;
  const thumbSize = data.thumbnailSize;
  if (!projectStore.shots.length && data.mode === 'shots') {
    hasProblemMsg = 'No shots loaded';
  } else if (!projectStore.assets.length && data.mode === 'assets') {
    hasProblemMsg = 'No assets loaded';
  } else if (thumbSize[0] <= 5 || thumbSize[1] <= 5) {
    hasProblemMsg = 'Out of space';
  } else if (Number.isNaN(thumbSize[0]) || Number.isNaN(thumbSize[1])) {
    hasProblemMsg = 'Missing layout pass';
  } else if (data.seqFilterMode === 'showActiveSequence' && !data.activeSequence) {
    hasProblemMsg = 'No sequence selected';
  }

  if (hasProblemMsg) {
    // Show a user message indicating why the view is empty
    data.ui2D.textAlign = 'center';
    data.ui2D.textBaseline = 'middle';
    data.ui2D.fillText(hasProblemMsg, data.canvasText!.width * 0.5, data.canvasText!.height * 0.5);
    ui.draw();
    return;
  }

  // Draw the thumbnails.
  const imgBundle = (data.mode === 'shots') ? data.shotsTexBundleID : data.assetsTexBundleID;
  for (const thumb of data.thumbnails) {
    ui.addImageFromBundle(thumb.pos[0], thumb.pos[1], thumbSize[0], thumbSize[1], imgBundle, thumb.objIdx);
  }

  // Draw overlaid information for the shots.
  // Check if there is enough space to show shot names
  const thumbInfoSpacing = uiConfig.thumbOverlayInfo.textPad;
  const textHeightOffset = thumbSize[1] - fontSize - thumbInfoSpacing;
  const widthForInfo = thumbSize[0] - (data.ui2D.measureText('..').width + thumbInfoSpacing * 2);
  let infoMode = 0;
  if (data.mode === 'shots') {
    const widthForShotName = data.ui2D.measureText('010_0010_A').width; // Sample shot name
    const widthForExtras =  data.ui2D.measureText(' - 15.5s').width; // Example
    if (widthForInfo > widthForShotName) { infoMode = 1; }
    if (widthForInfo > (widthForShotName + widthForExtras)) { infoMode = 2; }
  } else {
    if (widthForInfo > 0) { infoMode = 3; }
  }
  if (infoMode > 0) {
    for (const thumb of data.thumbnails) {
      let info = thumb.obj.name
        + (data.duplicatedThumbs[thumb.objIdx] ? '**' : '')
        + (infoMode === 2 ? ' - ' + thumb.obj.durationSeconds.toFixed(1) + 's' : '');
      if (infoMode === 3) {
        const uncroppedInfo = info;
        while (data.ui2D.measureText(info).width > widthForInfo) {
          info = info.slice(0, -1);
        }
        if (info !== uncroppedInfo) {
          info += '..';
        }
      }

      ui.addRect(
          thumb.pos[0], thumb.pos[1] + textHeightOffset - thumbInfoSpacing,
          thumbSize[0], fontSize + thumbInfoSpacing * 2,
          uiConfig.thumbOverlayInfo.color
      );

      data.ui2D.fillText(info, thumb.pos[0] + thumbInfoSpacing, thumb.pos[1] + textHeightOffset);
    }
  }

  // Draw task information.
  if (data.taskTypeFilter !== '') {

    // Get the task type. e.g. "Animation".
    const taskType = data.currTaskType;
    if (!taskType) { console.error('Selected task type not found in data.'); return; }

    // Draw task statuses.
    if (data.showStatuses) {

      const statusRadius = uiConfig.taskStatus.radius;
      const statusOffsetX = uiConfig.taskStatus.offsetX;
      const statusOffsetY = uiConfig.taskStatus.offsetY;
      const disabledColor = uiConfig.taskStatus.disabledColor;
      const thumbDotRatio = 0.5; // Maximum amount of the thumbnail size that a dot can cover.

      const shouldDrawStatuses =
        // Draw if the dots are not too big relative to the thumb size.
        ((thumbSize[0] * thumbDotRatio > statusRadius * 2) || data.statusDispMode !== 'dots')
        // Don't draw if the view is grouped by status, since it would be duplicated information.
        && data.displayMode !== 'groupByTaskStatus';
      if (shouldDrawStatuses) {
        const offsetW = thumbSize[0] - statusRadius - statusOffsetX;
        const offsetH = thumbSize[1] - statusRadius - statusOffsetY;
        for (const thumb of data.thumbnails) {
          let hasStatusForTask = false;
          // Search if the shot has a status for the current task type.
          for (const taskStatus of thumb.obj.tasks) {
            if (taskStatus.task_type_id === taskType.id) {
              // It does, get the color for the status of this task.
              for (const status of projectStore.taskStatuses) { // e.g. "Done"
                if (taskStatus.task_status_id === status.id) {
                  if (data.statusDispMode === 'dots') {
                    ui.addCircle([thumb.pos[0] + offsetW, thumb.pos[1] + offsetH], statusRadius, status.color);
                  } else if (data.statusDispMode === 'stripes') {
                    ui.addRect(thumb.pos[0], thumb.pos[1] + thumbSize[1] - 6, thumbSize[0], 6, status.color);
                  } else {
                    const color = [status.color[0], status.color[1], status.color[2], 0.4];
                    ui.addRect(thumb.pos[0], thumb.pos[1], thumbSize[0], thumbSize[1], color);
                  }
                  break;
                }
              }
              hasStatusForTask = true;
              break;
            }
          }
          if (!hasStatusForTask) {
            ui.addRect(thumb.pos[0], thumb.pos[1], thumbSize[0], thumbSize[1], disabledColor);
          }
        }
      }
    }

    // Draw assignees
    if (data.showAssignees) {

      const avatarSize = uiConfig.assignees.avatarSize * (thumbSize[0] / 200);

      const shouldDrawAssignees =
          // Draw if the avatar size measurable and not too big relative to the thumb size.
          (thumbSize[0] > (avatarSize) * 2) && avatarSize > 4;
      if (shouldDrawAssignees) {
        const offsetW = thumbSize[0] - avatarSize - uiConfig.assignees.offsetX;
        const offsetH = uiConfig.assignees.offsetY;
        const stepX = avatarSize + uiConfig.assignees.spaceInBetween;
        for (const thumb of data.thumbnails) {
          // Search if the shot has a status for the current task type.
          for (const taskStatus of thumb.obj.tasks) {
            if (taskStatus.task_type_id === taskType.id) {
              // It does, get the assignee(s).
              for (let aIdx = 0; aIdx < taskStatus.assignees.length; aIdx++) {
                for (let i = 0; i < projectStore.team.length; i++) {
                  if (taskStatus.assignees[aIdx] === projectStore.team[i].id) {
                    ui.addImageFromBundle(
                      thumb.pos[0] + offsetW - aIdx * stepX, thumb.pos[1] + offsetH,
                      avatarSize, avatarSize,
                      data.usersTexBundleID, i, avatarSize * 0.5
                    );
                    break;
                  }
                }
              }
              break;
            }
          }
        }
      }
    }
  }

  // Draw a border around the thumbnail(s) of assets used in the current shot.
  if (data.mode === 'assets' && data.activeShot) {
    const rim = uiConfig.castingHighlight;
    const transp_overlay_color = [rim.color[0], rim.color[1], rim.color[2], 0.4];
    for (const thumb of data.thumbnails) {
      if (thumb.obj.shot_ids.includes(data.activeShot.id)) {
        ui.addRect(thumb.pos[0], thumb.pos[1], thumbSize[0], thumbSize[1], transp_overlay_color);
        ui.addFrame(thumb.pos[0], thumb.pos[1], thumbSize[0], thumbSize[1], rim.width, rim.color, 1);
      }
    }
  }

  // Draw a border around the thumbnail(s) corresponding to the current frame.
  if (data.thumbForCurrentFrame) {
    const thumb = data.thumbForCurrentFrame;
    const rim = uiConfig.currFrameHighlight;
    if (data.duplicatedThumbs[thumb.objIdx]) {
      for (const dupThumb of data.duplicatedThumbs[thumb.objIdx])
        ui.addFrame(dupThumb.pos[0], dupThumb.pos[1], thumbSize[0], thumbSize[1], rim.width, rim.color, 1);
    } else {
      ui.addFrame(thumb.pos[0], thumb.pos[1], thumbSize[0], thumbSize[1], rim.width, rim.color, 1);
    }
  }

  // Draw a border around the thumbnail(s) of selected assets.
  if (data.mode === 'assets') {
    const rim = uiConfig.selectedHighlight;
    for (const asset of projectStore.selectedAssets) {
      for (const thumb of data.thumbnails) {
        if (thumb.obj.id === asset.id) {
          ui.addFrame(thumb.pos[0], thumb.pos[1], thumbSize[0], thumbSize[1], rim.width, rim.color, 1);
        }
      }
    }
  }

  // Draw grouping.
  if (data.displayMode !== 'chronological') {

    // Draw the aggregated group information.
    if (data.summaryText.str) {
      data.ui2D.fillText(data.summaryText.str, data.summaryText.pos[0], data.summaryText.pos[1]);
    }

    // Draw each group.
    for (const group of data.thumbGroups) {
      // Draw color rect.
      ui.addRect(
        group.colorRect[0], group.colorRect[1], group.colorRect[2], group.colorRect[3],
        group.color, 1
      );
      // Draw group name.
      data.ui2D.fillText(group.name, group.namePos[0], group.namePos[1]);
    }
  }

  // Draw the frame.
  ui.draw();
}

function getFilteredShots() {
      // Find which shots to filter by.
      const filtered_shots = [];
      if (data.seqFilterMode === 'showActiveSequence') {
        // Get the shots associated with the active sequence.
        if (data.activeSequence) {
          for (const shot of projectStore.shots) {
            if (shot.sequence_id === data.activeSequence.id) {
              filtered_shots.push(shot);
            }
          }
        }
      } else if (data.seqFilterMode === 'showShotsInTimelineView') {
        // Get the shots that are visible in the timeline.
        for (const shot of projectStore.shots) {
          const lastShotFrame = shot.startFrame + shot.durationSeconds * projectStore.fps;
          if (lastShotFrame > projectStore.timelineVisibleFrames[0]
              && shot.startFrame < projectStore.timelineVisibleFrames[1]) {
            filtered_shots.push(shot);
          }
        }
      }
  return filtered_shots;
}

function filterThumbnails() {

  data.thumbnails = [];
  data.duplicatedThumbs = [];

  if (data.mode === 'shots') {

    // Create a thumbnail for each shot to be shown.
    if (data.seqFilterMode === 'showActiveSequence') {
      if (data.activeSequence) {
        // Show the shots associated with the active sequence.
        for (let i = 0; i < projectStore.shots.length; i++) {
          const shot = projectStore.shots[i];
          if (shot.sequence_id === data.activeSequence.id) {
            data.thumbnails.push(new UILayout.ThumbnailImage(shot, i));
          }
        }
      }
    } else if (data.seqFilterMode === 'showShotsInTimelineView') {
      // Show only shots that are visible in the timeline.
      for (let i = 0; i < projectStore.shots.length; i++) {
        const shot = projectStore.shots[i];
        const lastShotFrame = shot.startFrame + shot.durationSeconds * projectStore.fps;
        if (lastShotFrame > projectStore.timelineVisibleFrames[0]
            && shot.startFrame < projectStore.timelineVisibleFrames[1]) {
          data.thumbnails.push(new UILayout.ThumbnailImage(shot, i));
        }
      }
    } else {
      // Show all the shots.
      for (let i = 0; i < projectStore.shots.length; i++) {
        data.thumbnails.push(new UILayout.ThumbnailImage(projectStore.shots[i], i));
      }
    }

  } else { // 'assets'

    if (data.seqFilterMode === 'showAll') {
      // Show all the assets.
      for (let i = 0; i < projectStore.assets.length; i++) {
        data.thumbnails.push(new UILayout.ThumbnailImage(projectStore.assets[i], i));
      }
    } else {
      // Find which shots to filter by.
      const filtered_shots = getFilteredShots();

      // Create a thumbnail for each asset to be shown.
      for (let i = 0; i < projectStore.assets.length; i++) {
        let is_asset_used_in_a_filtered_shot = false;
        for (const shot of filtered_shots) {
          for (const cast_asset of shot.asset_ids) {
            if (projectStore.assets[i].id === cast_asset) {
              is_asset_used_in_a_filtered_shot = true;
              break;
            }
          }
          if (is_asset_used_in_a_filtered_shot) { break; }
        }
        if (is_asset_used_in_a_filtered_shot) {
          data.thumbnails.push(new UILayout.ThumbnailImage(projectStore.assets[i], i));
        }
      }

    }

  }

  // Update the thumbnail that should be highlighted.
  data.thumbForCurrentFrame = findThumbnailForCurrentFrame();
}

function refreshThumbnailGroups() {

  // Clear previous data.
  data.thumbGroups = [];
  data.summaryText.str = '';

  if (data.displayMode === 'chronological') {
    return;
  }
  const groupBySequence = (data.displayMode === 'groupBySequence');
  const groupByAssetType = (data.displayMode === 'groupByAssetType');
  const groupByStatus = (data.displayMode === 'groupByTaskStatus');
  const groupByAssignee = (data.displayMode === 'groupByAssignee');
  if ((groupByStatus || groupByAssignee) && !data.currTaskType) {
    console.error('Thumbnail View: can\'t group by task status/assignee when no task is set.');
    return;
  }

  // Create the thumbnail groups.
  const thumbGroups = [];
  const groupObjs =
    groupBySequence ? projectStore.sequences :
    groupByAssetType ? projectStore.assetTypes :
    groupByStatus ? projectStore.taskStatuses :
    /* groupByAssignee */ projectStore.team;
  for (const obj of groupObjs) {
    thumbGroups.push(new UILayout.ThumbnailGroup(obj.name, obj.color, obj));
  }
  const unassignedGroup =
    groupBySequence ? new UILayout.ThumbnailGroup('Unassigned', [0.8, 0.0, 0.0, 1.0]) :
    groupByAssetType ? new UILayout.ThumbnailGroup('No Type', [0.8, 0.0, 0.0, 1.0]) :
    groupByStatus ? new UILayout.ThumbnailGroup('No Status', [0.6, 0.6, 0.6, 1.0]) :
    /* groupByAssignee */ new UILayout.ThumbnailGroup('Unassigned', [0.6, 0.6, 0.6, 1.0]);

  // Assign thumbnails to groups.
  const objBelongsToGroup =
    groupBySequence ? ((objToGroupBy, shot: Shot) => { return objToGroupBy.id === shot.sequence_id; }) :
    groupByAssetType ? ((objToGroupBy, asset: Asset) => { return objToGroupBy.id === asset.asset_type_id; }) :
    groupByStatus ? ((objToGroupBy, shotOrAsset: Shot|Asset) => {
      // Search if the shot/asset has a status for the current task type.
      for (const taskStatus of shotOrAsset.tasks) {
        if (taskStatus.task_type_id === data.currTaskType.id) {
          // It does. Does the status match the given thumbnail group?
          return (taskStatus.task_status_id === objToGroupBy.id);
        }
      }
      // Shot/asset doesn't have a task status for the given task type.
      return false;
    }) : /* groupByAssignee */
      ((objToGroupBy, shotOrAsset: Shot|Asset) => {
        // Search if the shot/asset has a status for the current task type.
        for (const taskStatus of shotOrAsset.tasks) {
          if (taskStatus.task_type_id === data.currTaskType.id) {
            // It does. Does any assignee match the given one?
            for (const assignee of taskStatus.assignees) {
              if (assignee === objToGroupBy.id) {
                return true;
              }
            }
            break;
          }
        }
        // Shot/asset doesn't have a task status or assignee for the given task type.
        return false;
      });
  const numObjs = data.thumbnails.length;
  for (let i = 0; i < numObjs; i++) {
    // Find all the groups that the shot/asset of this thumbnail belongs to.
    const groupsObjBelongsTo = [];
    for (let j = 0; j < thumbGroups.length; j++) {
      if (objBelongsToGroup(thumbGroups[j].criteriaObj, data.thumbnails[i].obj)) {
        groupsObjBelongsTo.push(j);
      }
    }

    // Register the thumbnail to its group.
    const numGroupsObjBelongsTo = groupsObjBelongsTo.length;
    for (let g = numGroupsObjBelongsTo > 0 ? 0 : -1; g < numGroupsObjBelongsTo; g++) {
      const group = g === -1 ? unassignedGroup : thumbGroups[groupsObjBelongsTo[g]];

      let thumbIdx = i;
      if (g >= 1) {
        // Create a duplicate thumbnail if the shot is in multiple groups.
        thumbIdx = data.thumbnails.push(new UILayout.ThumbnailImage(
          data.thumbnails[i].obj, data.thumbnails[i].objIdx)
        ) - 1;
        if (!data.duplicatedThumbs[data.thumbnails[i].objIdx]) {
          data.duplicatedThumbs[data.thumbnails[i].objIdx] = [data.thumbnails[i]];
        }
        data.duplicatedThumbs[data.thumbnails[i].objIdx].push(data.thumbnails[thumbIdx]);
      }
      group.thumbIdxs.push(thumbIdx);
      data.thumbnails[thumbIdx].group = group;
      data.thumbnails[thumbIdx].posInGroup = group.thumbIdxs.length - 1;
    }
  }

  // Filter out empty groups.
  thumbGroups.push(unassignedGroup);
  for (const group of thumbGroups) {
    if (group.thumbIdxs.length) {
      data.thumbGroups.push(group);
    }
  }

  let totalDuration = 0.0;
  let totalObjs = 0;
  for (const group of data.thumbGroups) {
    let durationInSeconds = 0;

    if (data.mode === 'shots') {
      // Add total duration and shot count to the group name.
      for (const thumbIdx of group.thumbIdxs) {
        durationInSeconds += data.thumbnails[thumbIdx].obj.durationSeconds;
      }
      group.name += ' (shots: ' + group.thumbIdxs.length + ',  '
                    + secToStr(durationInSeconds) + ')';
    } else {
      group.name += ' (' + group.thumbIdxs.length + ')';
    }

    // Calculate the aggregated stats of the shots/assets in view.
    totalDuration += durationInSeconds;
    totalObjs += group.thumbIdxs.length;
  }

  // Set the aggregated display information if there are multiple groups.
  if (data.thumbGroups.length > 1) {
    data.summaryText.str = (data.mode === 'shots') ?
      'Total shots in view: ' + totalObjs + ', duration: ' + secToStr(totalDuration) :
      'Total assets in view: ' + totalObjs;
  }
}

function layout() {

  // If there are no images to fit, we're done!
  if (!data.thumbnails.length)
    return;

  const originalImageSize = (data.mode === 'shots') ?
    data.shotsOriginalImageSize :
    data.assetsOriginalImageSize;

  if (data.displayMode === 'chronological') {
    data.thumbnailSize = UILayout.fitThumbsInGrid(
      data.thumbnails, originalImageSize, uiConfig, getCanvasRect());
  } else {
    data.thumbnailSize = UILayout.fitThumbsInGroup(
      data.summaryText, data.thumbGroups,
      data.thumbnails, originalImageSize, uiConfig, getCanvasRect());
  }
}

function findThumbnailForCurrentFrame() {
  if (data.mode === 'assets') { return null; }

  let thumbForCurrentFrame = null;
  for (const thumb of data.thumbnails) {
    if(thumb.obj.startFrame > projectStore.currentFrame)
      break;
    thumbForCurrentFrame = thumb;
  }
  return thumbForCurrentFrame;
}

function findShotForCurrentFrame() {
  // Find the shot for the current frame (not necessarily visible as a thumbnail).
  let shotForCurrentFrame = null;
  for (const shot of projectStore.shots) {
    if (shot.startFrame > projectStore.currentFrame) {
      break;
    }
    shotForCurrentFrame = shot;
  }
  return shotForCurrentFrame;
}

function findSequenceForCurrentFrame() {
  // Find the shot for the current frame (not necessarily visible as a thumbnail).
  const shotForCurrentFrame = findShotForCurrentFrame();

  // Find the corresponding sequence, if any.
  let currSequence = null;
  if (shotForCurrentFrame) {
    for (const seq of projectStore.sequences) {
      if (seq.id === shotForCurrentFrame.sequence_id) {
        currSequence = seq;
        break;
      }
    }
  }
  return currSequence;
}

function onMouseEvent(event: MouseEvent) {
  // Set a new current frame when LMB clicking or dragging.
  if (data.isMouseDragging
    && (event.type === 'mousemove' || event.type === 'mouseup')) {
    // Hit test against each thumbnail
    const mouse = clientToCanvasCoords(event);
    const thumbSize = data.thumbnailSize;
    let hitThumb = false;
    for (const thumb of data.thumbnails) {
      if ( thumb.pos[0] <= mouse.x && mouse.x <= thumb.pos[0] + thumbSize[0]
        && thumb.pos[1] <= mouse.y && mouse.y <= thumb.pos[1] + thumbSize[1]) {
        hitThumb = true;
        if (data.mode === 'shots') {
          projectStore.setCurrentFrame(thumb.obj.startFrame);
        } else {
          projectStore.selectedAssets = [thumb.obj];
        }
        break;
      }
    }

    if (!hitThumb) {
      if (data.mode === 'assets') {
        projectStore.selectedAssets = [];
      }
    }
  }

  // Update mouse capturing state.
  if (event.type === 'mousedown') {
    data.isMouseDragging = true;
  } else if (event.type === 'mouseup' || event.type === 'mouseleave') {
    data.isMouseDragging = false;
  }
}

function secToStr(timeInSeconds: number) {
  const h = timeInSeconds / 3600;
  const m = (timeInSeconds / 60) % 60;
  const s = Math.round(timeInSeconds % 60);
  let str = '';
  if (h>1) str += h.toFixed(0) + ':';
  str += m.toFixed(0) + ':';
  return str + s.toFixed(0).padStart(2, '0');
}

// Watchers
watch(
  () => data.mode,
  (mode) => {
    // If there is a selected TaskType, ensure there is a valid task type for this mode.
    if (data.taskTypeFilter !== '') {
      data.taskTypeFilter = (mode === 'shots') ? taskTypesForShots.value[0].id : taskTypesForAssets.value[0].id;
    }

    // Remove unsupported options for assets.
    if (mode === 'assets') {
      if (data.displayMode === 'groupBySequence') {
        data.displayMode = 'groupByAssetType';
      }
    } else {
      // Remove unsupported options for shots.
      if (data.displayMode === 'groupByAssetType') {
        data.displayMode = 'groupBySequence';
      }
      // projectStore.selectedAssets = [];
    }
    refreshAndDraw();
  }
)

watch(
  () => data.seqFilterMode,
  () => {
    refreshAndDraw();
  }
)

watch(
  () => data.taskTypeFilter,
  () => {
    // Find task type object and cache it.
    let taskType = null;
    for (const type of projectStore.taskTypes) { // e.g. "Animation"
      if (data.taskTypeFilter === type.id) {
        taskType = type;
        break;
      }
    }
    data.currTaskType = taskType;

    // If there is no selected TaskType, ensure there is no grouping by task status.
    if (!taskType
        && (data.displayMode === 'groupByTaskStatus' || data.displayMode === 'groupByUser')) {
      data.displayMode = (data.seqFilterMode === 'showAll') ? 'chronological' : 'groupBySequence';
    }

    refreshAndDraw();
  }
)

watch(
  () => data.showAssignees,
  () => {
    refreshAndDraw();
  }
)

watch(
  () => data.showStatuses,
  () => {
    refreshAndDraw();
  }
)

watch(
  () => data.displayMode,
  () => {
    refreshAndDraw();
  }
)

watch(
  () => data.statusDispMode,
  () => {
    draw();
  }
)

watch(
  () => projectStore.timelineVisibleFrames,
  () => {
    if (data.seqFilterMode === 'showShotsInTimelineView') {
        refreshAndDraw();
      }
  }
)

watch(
  () => projectStore.taskTypes,
  () => {
    refreshAndDraw();
  }
)

watch(
  () => projectStore.taskStatuses,
  () => {
    refreshAndDraw();
  }
)

watch(
  () => projectStore.team,
  (users) => {

    if (users.length) {
      const thumb_size = [400, 400]; // WIP
      const thumb_urls = []
      for (const user of users) {
        thumb_urls.push(user.profilePicture);
      }
      data.usersTexBundleID = data.uiRenderer.loadImageBundle(thumb_urls, thumb_size);
    }

    refreshAndDraw();
  }
)

watch(
  () => projectStore.sequences,
  () => {
    refreshAndDraw();
  }
)

watch(
  () => projectStore.shots,
  (shots) => {
    if (shots.length) {
        const thumb_size: [number, number] = [150, 100] ; // [1920, 1080];// WIP
        data.shotsOriginalImageSize = thumb_size;

        const thumb_urls = []
        for (const shot of shots) {
          thumb_urls.push(shot.thumbnailUrl);
        }
        data.shotsTexBundleID = data.uiRenderer.loadImageBundle(thumb_urls, thumb_size);
      }

    refreshAndDraw();
  }
)

watch(
  () => projectStore.assets,
  (assets) => {
    if (assets.length) {
      // Use explicit typing here to prevent TS complaints
      // when defining data.assetsOriginalImageSize
      const thumb_size: [number, number] = [150, 100]; // WIP
      data.assetsOriginalImageSize = thumb_size;

      const thumb_urls = []
      for (const asset of assets) {
        thumb_urls.push(asset.thumbnailUrl);
      }
      data.assetsTexBundleID = data.uiRenderer.loadImageBundle(thumb_urls, thumb_size);
    }

    refreshAndDraw();
  }
)

watch(
  () => projectStore.currentFrame,
  () => {
    // Find the thumbnail that should be highlighted.
    data.thumbForCurrentFrame = findThumbnailForCurrentFrame();

    // Find the shot and sequence that are active for the current frame.
    const previouslyCurrShot = data.activeShot;
    data.activeShot = findShotForCurrentFrame();
    const currSequence = findSequenceForCurrentFrame();
    const previouslyCurrSequence = data.activeSequence;
    data.activeSequence = currSequence;

    // Re-layout if the change in current scene affects the filtering.
    if (previouslyCurrSequence !== currSequence && data.seqFilterMode === 'showActiveSequence') {
      refreshAndDraw();
    } else if (previouslyCurrShot !== data.activeShot) {
      // Update current frame or casting highlights.
      draw();
    }

  }
)

watch(
  () => projectStore.selectedAssets,
  () => {
    draw();
  }
)

watch(
  () => projectStore.timelineCanvasHeightPx,
   () => {
    resizeCanvas();
  }
)

onMounted(() => {
  initCanvas();
  // Note: Image loading, if any, should go here.

  // Initial draw of this component.
  layout();
  draw();
})

</script>

<style scoped>
.thumbnailview-container {
  background-color: var(--panel-bg-color);
  border-radius: var(--border-radius);
  margin: var(--spacer-2) 0 var(--spacer-2) var(--spacer-2);
}

canvas {
  display: block;
}

#canvas-thumb-grid-container {
  position: relative;
}
#canvas-thumb-grid {
  position: absolute;
}
#canvas-thumb-grid-text {
  position: absolute;
  z-index: 10;
}
</style>
