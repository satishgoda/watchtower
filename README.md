# Watchtower

Interactive film production management tool. Watchtower allows you to see the big picture of a 
short film or episode and unpack as much information as needed, down to the duration of a shot and
assets used in it. All in the space of one screen.

## Features

* Grid view (for shots and assets) with grouping and filtering tools
* Detail view
* Timeline showing individual shots as well as task statuses
* Compatible with zou as data backend


## Development setup
```
yarn install
```

Watchtower is a Vue application. It can be managed through the [vue-cli package](https://cli.vuejs.org/).

### Populate with data

* Have access to the API of a working Zou (and optionally Kitsu) installation
* Follow the instructions in `pipeline/README.md`
* At this point it's possible to run Watchtower and check the status of your production
* For each project it's currently necessary to manually place an `edit.mp4`file in `static-projects/<project-id>/`

### Compiles and hot-reloads for development
```
yarn serve
```

### Lints and fixes files
```
yarn lint
```

### Run in production
Use `yarn build` to create a build that can be deployed on a production server. The application can be served as a
static website. Follow the steps in "Populate with data" to provide Watchtower with data to display.


## TODOS

* Allow edits
  * Update task assignations
  * Asset casting
* Snapshotting (to compare the state of the edit/tasks over time)


### JSON files data source

Watchtower can run as a standalone application, and use JSON file as data source. In this case, here is how such data
should be structured:

- context.json (top level data)
- static-projects (dir. contains a list of projects)
  - <project_uuid> (dir. contains project data)
    - assets.json
    - casting.json (dir. contains casting data for all sequences)
    - edit.json
    - edit.mp4 (a copy of the latest edit)
    - project.json
    - sequences.json
    - shots.json
