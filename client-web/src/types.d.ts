import type { vec4 } from 'uirenderer-canvas';

type Task = {
  task_status_id: string;
  task_type_id: string;
  assignees: string[];
  id: string;
}

type Shot = {
  asset_ids: string[];
  startFrame: number;
  data: object;
  durationSeconds: number;
  fps: number;
  id: string;
  name: string;
  sequence_id: string;
  tasks: Task[];
  thumbnailUrl: string;
};

type Sequence = {
  id: string;
  name: string;
  color: vec4;
}

type Asset = {
  name: string;
  asset_type_id: string;
  tasks: Task[];
  id: string;
  thumbnailUrl: string;
  shot_ids: Astring[];
}

type TaskType = {
  color: vec4;
  for_shots: boolean;
  id: string;
  name: string;
};

type TaskStatus = {
  color: vec4;
  id: string;
  name: string;
};

type AssetType = {
  id: string;
  name: string;
  color: vec4;
};

type User = {
  id: string;
  has_avatar: boolean;
  full_name: string;
  thumbnailUrl: string;
}

type ProcessedUser = {
  id: string;
  name: string;
  profilePicture: string;
  color?: vec4;
}

type ShotCasting = {
  shot_id: string;
  asset_ids: string[];
}

type VideoPlayerSource = {
  src: string;
  type: string;
}

type ProjectListItem = {
  name: string;
  id: string;
  thumbnailUrl: string;
}
