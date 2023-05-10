# Deploying Watchtower

* Set up a web server configured to serve static files (nginx, Apache, etc.)
* Run the build commands documented in `pipeline/README.md`
* Copy the data in the proper web directory


## Deploy to a subdirectory
Deploying Watchtower to a subdirectory (e.g. https://example.com/watchtower) is possible, but
requires for a custom build of the `client-web` component, where we override the `base` flag.
