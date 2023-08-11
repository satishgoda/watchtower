---
outline: [2,3]
---
# Pipeline Integration

To use Watchtower with your data, you need to write a script (we will call it 'writer') that
fetches the data from your production tracker. This can be done by leveraging the
`watchtower_pipeline` Python library.

The goal is to generate the following set of JSON files:

```
data
├── projects
│   ├── <project-id>
│   │   ├── previews
│   │   │   └── ...
│   │   ├── assets.json
│   │   ├── casting.json
│   │   ├── edit.json
│   │   ├── edit.mp4
│   │   ├── project.json
│   │   ├── sequences.json
│   │   └── shots.json
│   └── ...
└── projects-list
    ├── previews
    │   └── ...
    └── index.json
```

This is achieved by setting up a class that extents `AbstractWriter` and implements
a few methods.

Here is a list of steps needed to build a writer:

- Create a Python virtual environment
- `pip install watchtower_pipeline`
- Create a new file and define a class that extends `AbstractWriter`
- Implement the required methods
- Call the `write()` method

::: details Copy this code as a starting point
```python
#!/usr/bin/env python3
import logging
import sys
from typing import List
from watchtower_pipeline import writers, models, argparser


logging.basicConfig(
    level=logging.INFO,
    format="[%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)


class CustomWriter(writers.AbstractWriter):

    @property
    def request_headers(self):
        return

    def get_project_list(self) -> List[models.ProjectListItem]:
        pass

    def get_project(self, project_id) -> models.Project:
        pass

    def get_project_edit(self, project: models.Project) -> models.Edit:
        pass

    def get_project_assets(self, project: models.Project) -> List[models.Asset]:
        pass

    def get_project_sequences(self, project: models.Project) -> List[models.Sequence]:
        pass

    def get_project_shots(self, project: models.Project) -> List[models.Shot]:
        pass

    def get_project_casting(
        self,
        project,
        sequences: List[models.Sequence],
        shots: List[models.Shot],
        assets: List[models.Asset],
    ) -> List[models.ShotCasting]:
        pass


def main(args):
    parsed_args = argparser.parse_args(args)
    destination_path = parsed_args.destination_path

    CustomWriter().write(destination_path)
    if parsed_args.bundle:
        writers.WatchtowerBundler.bundle(destination_path)


if __name__ == "__main__":
    main(sys.argv[1:])


```
:::

## Data Classes Reference

Here are the dataclasses definitions.

### User


| Attribute    | Type            | Default |
|--------------|-----------------|---------|
| id           | `Optional[str]` | None    |
| name         | `str`           | None    |
| thumbnailUrl | `Optional[str]` | None    |
| has_avatar   | `bool`          | False   |

#### Example

````python
from watchtower_pipeline import models

user = models.User(
    id='a52cfbb8-bdc8-4df5-94c8-e89695a53d80',
    name='Jade Doe',
    has_avatar=False,
)
if user.has_avatar:
    user.thumbnailUrl = '/url/to/thumnail.png'
````


### Asset Type

| Attribute | Type            | Default |
|-----------|-----------------|---------|
| id        | `Optional[str]` | None    |
| name      | `str`           | None    |

#### Example

````python
from watchtower_pipeline import models

at = models.AssetType(
    id='a52cfbb8-bdc8-4df5-94c8-e89695a53d80',
    name='Character',
)
````


### Task Type

| Attribute | Type            | Default |
|-----------|-----------------|---------|
| id        | `Optional[str]` | -       |
| name      | `str`           | -       |
| color     | `str`           | None    |
| for_shots | `bool`          | False   |

#### Example

```python
from watchtower_pipeline import models

tt = models.TaskType(
    id='122f7c71-a865-4588-96e2-530b39deb7b8',
    name='Animation',
    color='#FF0000',
    for_shots=False,
)
```

### Task Status

| Attribute | Type            | Default  |
|-----------|-----------------|----------|
| id        | `Optional[str]` | None     |
| name      | `str`           | None     |
| color     | `str`           | None     |

#### Example

```python
from watchtower_pipeline import models

tt = models.TaskStatus(
    id='d0b0f234-fef2-424e-899f-8a0e0e74d699',
    name='Todo',
    color='#000000',
)
```

### Project

| Attribute     | Type               | Default |
|---------------|--------------------|---------|
| id            | `Optional[str]`    | None    |
| name          | `str`              | None    |
| ratio         | `str`              | None    |
| resolution    | `str`              | None    |
| asset_types   | `List[AssetType]`  | []      |
| task_types    | `List[TaskType]`   | []      |
| task_statuses | `List[TaskStatus]` | []      |
| team          | `List[User]`       | []      |
| thumbnailUrl  | `Optional[str]`    | None    |
| fps           | `int`              | 24      |

#### Example

```python
from watchtower_pipeline import models

p = models.Project(
    id='a52cfbb8-bdc8-4df5-94c8-e89695a53d80',
    name='Sprite Fright',
    ratio='2.35:1',
    resolution='2048x858',
    asset_types=[],
    task_types=[],
    task_statuses=[],
    team=[],
)
```


### ProjectListItem
This is used in `ProjectsListWriter`.

| Attribute     | Type               | Default |
|---------------|--------------------|---------|
| id            | `Optional[str]`    | None    |
| name          | `str`              | None    |
| thumbnailUrl  | `Optional[str]`    | None    |

#### Example

```python
from watchtower_pipeline import models

p = models.ProjectListItem(
    id='a52cfbb8-bdc8-4df5-94c8-e89695a53d80',
    name='Sprite Fright',
)
```

### Task

| Attribute            | Type            | Default |
|----------------------|-----------------|---------|
| id                   | `Optional[str]` | None    |
| task_status_id       | `str`           | None    |
| task_type_id         | `str`           | None    |
| assignees            | `List[str]`     | None    |

#### Example

```python
from watchtower_pipeline import models

a = models.Task(
    task_status_id='d0b0f234-fef2-424e-899f-8a0e0e74d699',
    task_type_id='122f7c71-a865-4588-96e2-530b39deb7b8',
)
```

### Asset

| Attribute     | Type            | Default |
|---------------|-----------------|---------|
| id            | `Optional[str]` | None    |
| tasks         | `List[Task]`    | []      |
| asset_type_id | `str`           | None    |
| thumbnailUrl  | `Optional[str]` | None    |

#### Example

```python
from watchtower_pipeline import models

a = models.Asset(
    id='a52cfbb8-bdc8-4df5-94c8-e89695a53d80',
    asset_type_id='99a57e6e-b3ec-476e-9abd-5bfc406b6861',
    name='Rex',
)
```

### Sequence

| Attribute | Type            | Default  |
|-----------|-----------------|----------|
| id        | `Optional[str]` | None     |
| name      | `str`           | None     |

#### Example

```python
from watchtower_pipeline import models

sq = models.Sequence(
    id='a52cfbb8-bdc8-4df5-94c8-e89695a53d80',
    name='Rextoria',
)
```

### Shot

| Attribute       | Type            | Default |
|-----------------|-----------------|---------|
| id              | `Optional[str]` | None    |
| name            | `str`           | None    |
| sequence_id     | `str`           | None    |
| data            | `ShotData`      | -       |
| tasks           | `List[Task]`    | []      |
| startFrame      | `int`           | 0       |
| durationSeconds | `float`         | 0       |
| thumbnailUrl    | `Optional[str]` | None    |
| fps             | `float`         | 24      |

### ShotCasting

| Attribute | Type          | Default |
|-----------|---------------|---------|
| shot      | `Shot`        | -       |
| assets    | `List[Asset]` | []      |

### Edit

| Attribute | Type            | Default  |
|-----------|-----------------|----------|
| id        | `Optional[str]` | None     |
| name      | `str`           | None     |

## Writers Reference

The JSON files needed by Watchtower are created through the following writers.

### ProjectListWriter

| Attribute   | Type                                | Default |
|-------------|-------------------------------------|---------|
| projects    | `List[model.Project]`               | -       |


### ProjectWriter

| Attribute | Type                       | Default |
|-----------|----------------------------|---------|
| projects  | `model.Project`            | -       |
| shots     | `List[models.Shot]`        | -       |
| assets    | `List[models.Asset]`       | -       |
| sequences | `List[models.Sequence]`    | -       |
| edit      | `models.Edit`              | -       |
| casting   | `List[models.ShotCasting]` | -       |

