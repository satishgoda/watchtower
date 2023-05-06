# Watchtower Pipeline

Script to fetch data for Watchtower. This can also be used as a library for custom scripts.

## Files overview
These are the building blocks of the pipeline:
- `models.py`: Dataclass representations of all Watchtower data structures
- `writers.py`: Utilities to write out JSON files
- `ffprobe.py`: Wrapper around `ffprobe`, needed to calculate the duration of a video file

This is how those blocks can be used:
- `example.py`: Generate synthetic data for demo purposes
- `kitsu.py`: Fetch data from Kitsu (this is the setup used at Blender Studio)
