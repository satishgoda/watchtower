import { reactive } from 'vue';
import axios from 'axios';
import dataUrls from '@/lib/dataurls';
import type { ProjectListItem } from '@/types.d.ts';

/*
Store global list of projects.
Used in TheNavbar component and in ProjectListView.
 */
export class useProjectsStore {
  data = reactive({
    projects: new Array<ProjectListItem>(),
    activeProjectId: '',
  });
  async fetchAndInitContext() {
    try {
      // Populate projects state
      const response = await axios.get(dataUrls.getUrl(dataUrls.urlType.ProjectList));
      this.data.projects = response.data.projects;
    } catch (error) {
      console.log(error)
    }
  }
}
