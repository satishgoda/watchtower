enum UrlTypes {
  ProjectList,
  Project,
  Sequences,
  Shots,
  Assets,
  Casting,
  TaskCounts,
}

export default {

  urlType: UrlTypes,
  getUrl: function(urlType: UrlTypes, projectId?: string) {

    const basePath = import.meta.env.BASE_URL;

    switch(urlType) {
      case UrlTypes.ProjectList:
        return `${basePath}data/projects-list/index.json`;

      case UrlTypes.Project:
        return `${basePath}data/projects/${projectId}/project.json`;

      case UrlTypes.Sequences:
        return `${basePath}data/projects/${projectId}/sequences.json`;

      case UrlTypes.Shots:
        return `${basePath}data/projects/${projectId}/shots.json`;

      case UrlTypes.Assets:
        return `${basePath}data/projects/${projectId}/assets.json`;

      case UrlTypes.Casting:
        return `${basePath}data/projects/${projectId}/casting.json`;

      case UrlTypes.TaskCounts:
        return `${basePath}data/projects/${projectId}/task_counts.json`;
    }
  }
}
