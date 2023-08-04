import type { Asset, Sequence, Shot } from '@/types.d.ts';

export class RuntimeState {
  isPlaying = false;
  currentFrame = 0;
  timelineVisibleFrames = [0, 1];
  currentSequence = null as Sequence | null;
  currentShot = null as Shot | null;
  selectedAssets = new Array<Asset>();
  // Runtime UI settings
  isShowingTimelineTasks = false;
  isShowingTimelineAssets = true;
  timelineCanvasHeightPx = 0;
}
