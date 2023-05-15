# Watchtower Pipeline

Script to fetch data for Watchtower. This can also be used as a library for custom integrations.

## Development Setup
* Ensure you have [Poetry](https://python-poetry.org/) installed
* Create a virtualenv
* `poetry install`

## Running the script
* Run as a module with `python -m watchtower_pipeline.{connector}`, where `{connector}` is:
  * `example`
  * `kitsu`

## Files overview
These are the building blocks of the pipeline:
- `models.py`: Dataclass representations of all Watchtower data structures
- `writers.py`: Utilities to write out JSON files
- `ffprobe.py`: Wrapper around `ffprobe`, needed to calculate the duration of a video file

This is how those blocks can be used:
- `example.py`: Generate synthetic data for demo purposes
- `kitsu.py`: Fetch data from Kitsu (this is the setup used at Blender Studio)

## Developing a custom connector
The fastest way to develop a custom connector is to create `{connector_name}.py` in the
`watchtower_pipeline` directory and modify `example.py` to suit your needs.


## JSON files data source
Watchtower runs as static web application, and use JSON file as data source.
Here is how such data should be structured:

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

## Publish an update to Pypi
* Navigate to `client-web` and then `yarn run build-for-py`
* Navigate to `pipeline` and run `poetry publish --build`

## Publish the docs
* Navigate to `docs` and ensure you have a `.env` file
* Run `yarn run docs:publish`

