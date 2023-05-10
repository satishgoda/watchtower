# Watchtower

Follow these instructions to deploy Watchtower in your production pipeline.

## Requirements
* Python 3.9+
* A working installation of Kitsu (optional)

In order to generate data for Watchtower, follow these steps:

* Create a new folder, step into it and run:
* `python -m venv .venv`
* `source .venv/bin/activate`
* `pip install watchtower-pipeline`

## Setup with example data
To create an example project that will give you an idea of how the pipeline works:

* Run `python -m watchtower_pipeline.example -b`
* Navigate to the `watchtower` folder and run `python -m http.server`

## Setup with Kitsu-sourced data
If you have a working Kitsu (and Zou) install and want to extract and visualize data from it:

* Create a `.env.local` file as follows:

```
KITSU_DATA_SOURCE_URL=https://<your-kitsu-instance>/api
KITSU_DATA_SOURCE_USER_EMAIL=user@example.org
KITSU_DATA_SOURCE_USER_PASSWORD=password
```

* Run `python -m watchtower_pipeline.kitsu -b`
* Copy the content of the `watchtower` folder into your webserver
* Running the command without the `-b` flag will only fetch the data, and place it in a directory 
  called `public/data`, which can then be synced to where the `watchtower` folder has been placed

## Setup with custom-sourced data
If you use a different production/asset tracking service, some scripting will be required.
The following steps are recommended:
* Set up a new Python project (using virtualenv)
* Run `pip install watchtower-pipeline`
* Check `docs/custom-sources.md` for how to use the `watchtower_pipeline` module
