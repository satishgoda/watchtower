import json
import pathlib
import uuid
from dataclasses import dataclass, asdict, field
from typing import Any, Dict, List, TypedDict, Optional


def get_new_uuid() -> str:
    return str(uuid.uuid4())


@dataclass
class IdMixin:
    id: Optional[str]  # In Kitsu it's a UUID
    # In Python 3.10 it will be possible to use this, and make id actually Optional
    # id: Optional[uuid.UUID] = field(default_factory=get_new_uuid)
    name: str

    def __post_init__(self):
        self.id = self.id or get_new_uuid()


@dataclass
class AssetTypes(IdMixin):
    type: str


@dataclass
class TaskTypes(IdMixin):
    color: str  # A hex color
    for_shots: bool


@dataclass
class TaskStatus(IdMixin):
    color: str  # A hex color


@dataclass
class Person(IdMixin):
    has_avatar: bool


@dataclass
class ProjectDescriptor(IdMixin):
    entity_type: str


@dataclass
class Project(IdMixin):
    fps: float
    ratio: float
    resolution: str
    descriptors: List[ProjectDescriptor] = field(default_factory=list)
    asset_types: List[str] = field(default_factory=list)
    task_types: List[str] = field(default_factory=list)
    task_statuses: List[str] = field(default_factory=list)
    team: List[str] = field(default_factory=list)


@dataclass
class JsonMixin:
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    def to_list(self, key) -> list:
        """We expect that key is in the dict, and that the value is a list."""
        return self.to_dict()[key]


@dataclass
class Context(JsonMixin):
    """Class holding global information."""
    asset_types: List[AssetTypes]
    task_types: List[TaskTypes]
    task_status: List[TaskStatus]
    projects: List[Project]
    persons: List[Person] = field(default_factory=list)


@dataclass
class Task:
    task_status_id: str
    task_type_id: str
    assignees: List[str] = field(default_factory=list)  # Maps to Person ID


@dataclass
class Asset(IdMixin):
    asset_type_id: str
    thumbnailUrl: str
    tasks: List[Task] = field(default_factory=list)


@dataclass
class Assets(JsonMixin):
    assets: List[Asset]


@dataclass
class Sequence(IdMixin):
    pass


@dataclass
class Sequences(JsonMixin):
    sequences: List[Sequence]


class ShotData(TypedDict):
    frame_in: int
    frame_out: int


@dataclass
class Shot(IdMixin):
    startFrame: int
    durationSeconds: float
    thumbnailUrl: str
    sequence_id: str
    data: ShotData
    tasks: List[Task] = field(default_factory=list)


@dataclass
class Shots(JsonMixin):
    shots: List[Shot]


@dataclass
class Edit:
    sourceName: str
    sourceType: str
    totalFrames: int
    frameOffset: int


@dataclass
class ProjectWriter:
    """Saves a project and all its data as JSON files."""
    project: Project
    shots: Shots
    assets: Assets
    sequences: Sequences
    edit: Edit

    def dump_data(self, name, data):
        dst = pathlib.Path(f"public/static-projects/{self.project.id}/{name}.json")
        dst.parent.mkdir(parents=True, exist_ok=True)
        with open(dst, 'w') as outfile:
            json.dump(data, outfile, indent=2)
        print(f"Saved {name} data for project {self.project.id}")

    def write_all_json(self):
        self.dump_data('project', asdict(self.project))
        self.dump_data('edit', asdict(self.edit))
        self.dump_data('assets', self.assets.to_list('assets'))
        self.dump_data('shots', self.shots.to_list('shots'))
        self.dump_data('sequences', self.shots.to_list('sequences'))
