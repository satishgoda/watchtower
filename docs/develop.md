## JSON files data source

Watchtower can run as a standalone application, and use JSON file as data source. In this case, 
here is how such data should be structured:

```
- context.json (top level data)
- data/projects (dir. contains a list of projects)
  - <project_uuid> (dir. contains project data)
    - assets.json
    - casting.json (dir. contains casting data for all sequences)
    - edit.json
    - edit.mp4 (a copy of the latest edit)
    - project.json
    - sequences.json
    - shots.json
```
