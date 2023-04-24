enum UrlTypes {
  Context,
  Project,
  Sequences,
  Shots,
  Assets,
  Casting,
}

export default {
  isStatic: import.meta.env.VITE_DATA_IS_STATIC,

  urlType: UrlTypes,
  getUrl: function(urlType: UrlTypes, projectId?: string) {

    const projectQueryParams = new URLSearchParams({project_id: projectId || ''}).toString();
    const basePath = import.meta.env.BASE_URL;

    switch(urlType) {
      case UrlTypes.Context:
        return (this.isStatic ?
          `${basePath}data/projects/context.json` :
          '/api/data/user/context');

      case UrlTypes.Project:
        return (this.isStatic ?
          `${basePath}data/projects/${projectId}/project.json` :
          `/api/data/projects/${projectId}`);

      case UrlTypes.Sequences:
        return this.isStatic ?
           `${basePath}data/projects/${projectId}/sequences.json` :
           `/api/data/sequences?${projectQueryParams}`

      case UrlTypes.Shots:
        return this.isStatic ?
           `${basePath}data/projects/${projectId}/shots.json` :
           `/api/data/shots/with-tasks?${projectQueryParams}`

      case UrlTypes.Assets:
        return this.isStatic ?
           `${basePath}data/projects/${projectId}/assets.json` :
           `/api/data/assets/with-tasks?${projectQueryParams}`

      case UrlTypes.Casting:
        return this.isStatic ?
           `${basePath}data/projects/${projectId}/casting.json` :
           ``
            // TODO: Implement a new API in zou to fetch casting
            // independently from sequences.
    }
  }
}
