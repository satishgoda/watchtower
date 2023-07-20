import { defineStore } from 'pinia';
import axios from 'axios';
import dataUrls from '@/lib/dataurls';

/*
Store global list of projects.
Used in TheNavbar component and in ProjectListView.
 */
export const useProjectsStore = defineStore('projects', {
  state: () => ({
    projects: [],
  }),
  actions: {
    async fetchAndInitContext() {
      try {
        const response = await axios.get(dataUrls.getUrl(dataUrls.urlType.Context));
        this.projects = response.data.projects;
        // console.log(response.data);
        // return new Promise(resolve => {
        //   resolve(this.draftMessage);
        // });
      } catch (error) {
        console.log(error)
      }
    },
  }
})
