import { reactive } from 'vue';
import axios from 'axios';
import dataUrls from '@/lib/dataurls';

/*
Store global list of projects.
Used in TheNavbar component and in ProjectListView.
 */
export class useProjectsStore {
  data = reactive({projects: []});
  async fetchAndInitContext() {
    try {
      const response = await axios.get(dataUrls.getUrl(dataUrls.urlType.Context));
      this.data.projects = response.data.projects;
    } catch (error) {
      console.log(error)
    }
  }
}
