---
outline: [2,3]
---
# Pipeline Integration

If you are not using Kitsu as data source, you need to develop your own connector to the
production tracker. This can be done by leveraging the `watchtower_pipeline` library.

The goal is to generate the following set of JSON files for each project:

```
projects/
├── <project-id>/
│   ├── assets.json
│   ├── casting.json
│   ├── edit.json
│   ├── edit.mp4
│   ├── project.json
│   ├── sequences.json
│   └── shots.json
└── context.json
```

This is achieved by setting up a couple of classes (ProjectListWriter and ProjectWriter), that
will write out the JSON files property formatted for Watchtower.

Here is quick list of steps needed to build a custom connector:

- Create a Python virtual environment
- `pip install watchtower_pipeline`
- Define a client that can connect/authenticate to the production tracker
- Define a `ProjectListWriter` which will require 
  `Users`, `Asset Types`, `Task Types`, `Task Statuses` and `Projects`
- Define a `ProjectWriter`, which will require
  `Tasks`, `Assets`, `Sequences`, `Shots`, `Casting` and `Edit`
- Define a storage strategy for static files (thumbnails and videos), for example:
  - Create a file downloader that will retrieve and store files from the production tacker
  - Reference static assets directly on the production tracker



::: details Some pseudocode for reference
```python
#!/usr/bin/env python3
from dataclasses import dataclass
from watchtower_pipeline import writers, models


@dataclass
class FoobarClient:
  """Client used to connect to production API."""
  pass

@dataclass
class FoobarProjectListWriter:
  """Used to write context.json
  
  This Data Class takes care of fetching and aggregating all the generic
  information, which is then referenced in each project.
  """
  foobar_client: FoobarClient
  
  def fetch_user_context(self):
    return self.foobar_client.get('/path/to/context/data').json()

  def setup(self) -> writers.ProjectListWriter:
    user_context = self.fetch_user_context()
    # Iterate through the fetched document and setup
    # - projects_list
    # - asset_types_list
    # - task_types_list
    # - task_statuses_list
    # - users_list

    # Pass the datacasses to the ProjectListWriter
    return writers.ProjectListWriter(
          projects=projects_list,
          asset_types=asset_types_list,
          task_types=task_types_list,
          task_status=task_statuses_list,
          users=users_list,
      )

@dataclass
class FoobarProjectWriter:
  """Used to write various JSON files in the project folder.
  
  Indirectly references the context of FoobarContext.
  """
  foobar_client: FoobarClient
  
  def get_project_assets(self, project_id):
    pass
  
  def get_project_sequences(self, project_id):
    pass
  
  def get_project_shots(self, project_id):
    pass
  
  def get_project_casting(self, project_id):
    pass
  
  def get_project_edit(self, project_id):
    pass

  def setup(self, p: models.Project):
    assets = self.get_project_assets(self, p.id)
    sequences = self.get_project_sequences(self, p.id)
    shots = self.get_project_shots(self, p)
    casting = self.get_project_casting(self, p, sequences, shots, assets)
    edit = self.get_project_edit(self, p)
    return writers.ProjectWriter(
        project=p,
        assets=assets,
        shots=shots,
        sequences=sequences,
        edit=edit,
        casting=casting,
    )

  def fetch_and_save():
    foobar_client = FoobarClient()
    context_writer = FoobarProjectListWriter(foobar_client=foobar_client).setup()
    context_writer.write_as_json()
    for p in context_writer.projects:
      project_writer = FoobarProjectWriter(foobar_client=foobar_client).setup(p)
      project_writer.write_as_json()

fetch_and_save()

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

| Attribute     | Type            | Default |
|---------------|-----------------|---------|
| id            | `Optional[str]` | None    |
| name          | `str`           | None    |
| ratio         | `str`           | None    |
| resolution    | `str`           | None    |
| asset_types   | `List[str]`     | []      |
| task_types    | `List[str]`     | []      |
| task_statuses | `List[str]`     | []      |
| team          | `List[str]`     | []      |
| thumbnailUrl  | `Optional[str]` | None    |
| fps           | `int`           | 24      |

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

### Tasks

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
| asset_types | `List[models.AssetType]`            | -       |
| task_types  | `List[models.TaskType]`             | -       |
| task_status | `List[models.TaskStatus]`           | -       |
| users       | `List[models.User]`                 | []      |

Once created, we need to call `ProjectListWriter.write_as_json()` to write out the data.
This will write out the correctly formatted `context.json` file.

### ProjectWriter

| Attribute | Type                       | Default |
|-----------|----------------------------|---------|
| projects  | `model.Project`            | -       |
| shots     | `List[models.Shot]`        | -       |
| assets    | `List[models.Asset]`       | -       |
| sequences | `List[models.Sequence]`    | -       |
| edit      | `models.Edit`              | -       |
| casting   | `List[models.ShotCasting]` | -       |

Once created, we need to call `ProjectListWriter.write_as_json()` to write out the data.
This will write out the correctly formatted `context.json` file.
