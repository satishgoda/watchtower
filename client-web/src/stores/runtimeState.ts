import type { Asset, Sequence, Shot, Episode } from '@/types.d.ts';

export class RuntimeState {
  isPlaying = false;
  currentFrame = 0;
  timelineVisibleFrames = [0, 1] as [number, number];
  currentSequence = null as Sequence | null;
  currentShot = null as Shot | null;
  selectedAssets = new Array<Asset>();
  selectedEpisode = null as Episode | null;
  // Runtime UI settings
  timelineCanvasHeightPx = 0;
}
