import { defineStore } from 'pinia';
import axios from 'axios';
import dataUrls from '@/lib/dataurls';

export const useContextStore = defineStore('context', {
  state: () => ({
    asset_types: [],
    users: [],
    projects: [],
    task_status: [],
    task_types: [],
  }),
  actions: {
    async fetchAndInitContext() {
      try {
        const response = await axios.get(dataUrls.getUrl(dataUrls.urlType.Context));
        this.asset_types = response.data.asset_types;
        this.users = response.data.users;
        this.projects = response.data.projects;
        this.task_status = response.data.task_status;
        this.task_types = response.data.task_types;
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
