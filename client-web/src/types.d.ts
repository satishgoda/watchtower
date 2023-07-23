type Task = {
  task_status_id: string;
  task_type_id: string;
  assignees: Array<string>;
  id: string
}

type Shot = {
  asset_ids: Array<string>;
  startFrame: number;
  data: object;
  durationSeconds: number;
  fps: number;
  id: string;
  name: string;
  sequence_id: string;
  tasks: Array<Task>;
  thumbnailUrl: string;
};

type Sequence = {
  name: string;
  id: string;
}

type Asset = {
  name: string;
  asset_type_id: string;
  tasks: Array<Task>;
  id: string;
  thumbnailUrl: string;
  shot_ids: Array<string>
}

type TaskType = {
  color: Array<number>;
  for_shots: boolean;
  id: string;
  name: string;
};

type TaskStatus = {
  color: Array<number>;
  id: string;
  name: string;
};

type AssetType = {
  id: string;
  name: string;
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
  color?: string;
}

type ShotCasting = {
  shot_id: string;
  asset_ids: Array<string>;
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
