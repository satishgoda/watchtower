import json
import logging
import pathlib
import shutil

from abc import ABC, abstractmethod
from dataclasses import dataclass, asdict
from tqdm import tqdm
from typing import Dict, List, Optional

from watchtower_pipeline import models, ffprobe


@dataclass
class ProjectListWriter:

    projects: List[models.ProjectListItem]
    destination_path: pathlib.Path

    def to_dict(self):
        return {
            'projects': [asdict(p) for p in self.projects],
        }

    def download_previews(
        self, requests_headers: Optional[Dict] = None, force=False, display_progress=True
    ):
        # Set a variable that semantically matches tqdm API (the inverse of what we want our API to do)
        disable_progress = not display_progress
        for p in tqdm(
            self.projects, desc="Downloading Project thumbnails", disable=disable_progress
        ):
            path = pathlib.Path('projects-list') / 'previews'
            p.download_and_assign_thumbnail(
                self.destination_path,
                path=path,
                requests_headers=requests_headers,
                force=force,
            )

    def write_as_json(self):
        dst = self.destination_path / 'data/projects-list/index.json'
        dst.parent.mkdir(parents=True, exist_ok=True)
        with open(dst, 'w') as outfile:
            json.dump(self.to_dict(), outfile, indent=2)


class AbstractProjectListWriter(ABC):
    @abstractmethod
    def get_project_list(self) -> List[models.ProjectListItem]:
        pass

    def _get_project_list_writer(self, destination_path: pathlib.Path) -> ProjectListWriter:
        return ProjectListWriter(
            projects=self.get_project_list(),
            destination_path=destination_path,
        )


@dataclass
class ProjectWriter:
    """Saves a project and all its data as JSON files."""

    project: models.Project
    shots: List[models.Shot]
    assets: List[models.Asset]
    sequences: List[models.Sequence]
    edit: models.Edit
    casting: List[models.ShotCasting]
    destination_path: pathlib.Path

    def dump_data(self, name, data):
        dst = self.destination_path / f"data/projects/{self.project.id}/{name}.json"
        dst.parent.mkdir(parents=True, exist_ok=True)
        with open(dst, 'w') as outfile:
            json.dump(data, outfile, indent=2)
        logging.debug(f"Saved {name} data for project {self.project.id}")

    def download_previews(self, requests_headers: Optional[Dict] = None, force=False):
        path = pathlib.Path('projects') / self.project.id / 'previews'
        for s in tqdm(self.shots, desc="Downloading Shot thumbnails", ascii=' >='):
            s.download_and_assign_thumbnail(
                self.destination_path,
                path=path,
                requests_headers=requests_headers,
                force=force,
            )
        for a in tqdm(self.assets, desc="Downloading Asset thumbnails", ascii=' >='):
            a.download_and_assign_thumbnail(
                self.destination_path,
                path=path,
                requests_headers=requests_headers,
                force=force,
            )
        for user in tqdm(self.project.team, desc="Downloading User thumbnails", ascii=' >='):
            user.download_and_assign_thumbnail(
                self.destination_path,
                path=path,
                requests_headers=requests_headers,
                force=force,
            )

    def download_edit(self, requests_headers: Optional[Dict] = None, force=False):
        in_project_path = f"data/projects/{self.project.id}/edit.mp4"
        dst = self.destination_path / in_project_path
        models.fetch_and_save_media(
            self.edit.sourceName,
            requests_headers,
            dst,
            force=force,
            display_progress=True,
        )
        self.edit.sourceName = str(in_project_path)
        self.edit.totalFrames = ffprobe.get_frames_count(dst)

    def write_as_json(self):
        self.dump_data('project', asdict(self.project))
        self.dump_data('edit', self.edit.to_dict())
        self.dump_data('assets', [asdict(a) for a in self.assets])
        self.dump_data('shots', [asdict(s) for s in self.shots])
        self.dump_data('sequences', [asdict(s) for s in self.sequences])
        self.dump_data('casting', [c.to_dict() for c in self.casting])


class AbstractProjectWriter(ABC):
    @abstractmethod
    def get_project(self, project_id) -> models.Project:
        pass

    @abstractmethod
    def get_project_shots(self, project: models.Project) -> List[models.Shot]:
        pass

    @abstractmethod
    def get_project_assets(self, project: models.Project) -> List[models.Asset]:
        pass

    @abstractmethod
    def get_project_sequences(self, project: models.Project) -> List[models.Sequence]:
        pass

    @abstractmethod
    def get_project_casting(
        self,
        project,
        sequences: List[models.Sequence],
        shots: List[models.Shot],
        assets: List[models.Asset],
    ) -> List[models.ShotCasting]:
        pass

    @abstractmethod
    def get_project_edit(self, project: models.Project) -> models.Edit:
        pass

    def _get_project_writer(self, project_id, destination_path: pathlib.Path):
        project = self.get_project(project_id)
        sequences = self.get_project_sequences(project)
        shots = self.get_project_shots(project)
        assets = self.get_project_assets(project)
        casting = self.get_project_casting(project, sequences, shots, assets)
        edit = self.get_project_edit(project)

        return ProjectWriter(
            project=project,
            shots=shots,
            assets=assets,
            sequences=sequences,
            edit=edit,
            casting=casting,
            destination_path=destination_path,
        )


class AbstractWriter(AbstractProjectListWriter, AbstractProjectWriter, ABC):
    @property
    @abstractmethod
    def request_headers(self) -> Optional[Dict]:
        pass

    def write(self, destination_path: pathlib.Path):
        project_list_writer = self._get_project_list_writer(destination_path)
        project_list_writer.download_previews(self.request_headers)
        project_list_writer.write_as_json()
        for p in project_list_writer.projects:
            project_writer = self._get_project_writer(p.id, destination_path)
            project_writer.download_previews(self.request_headers)
            project_writer.write_as_json()


@dataclass
class WatchtowerBundler:
    @staticmethod
    def bundle(destination_path: pathlib.Path):
        """Combine the embedded dist_client_web with the static_path content.

        - copy the content dist_client_web into destination_path
        - copy the content of destination_path / 'data'  into destination_path
        - delete destination_path / 'data'
        """
        dist_client_web_src = pathlib.Path(__file__).parent.parent / 'dist_client_web'
        dist_client_web_dst = destination_path / 'watchtower'
        shutil.copytree(dist_client_web_src, dist_client_web_dst, dirs_exist_ok=True)
        shutil.copytree(destination_path / 'data', dist_client_web_dst / 'data', dirs_exist_ok=True)
        shutil.rmtree(destination_path / 'data')
        logging.info(f"Watchtower bundle ready at {dist_client_web_dst}")
        logging.info(f"You can preview it with the following command:")
        logging.info(f"\tpython -m http.server --directory {dist_client_web_dst}")
