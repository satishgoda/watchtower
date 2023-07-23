import { reactive } from 'vue';
import axios from 'axios';
import dataUrls from '@/lib/dataurls';
import colors from '@/lib/colors';

const basePath = import.meta.env.BASE_URL;

export class DataProjectStore {
  id = '';
  name = '';
  ratio = 0;
  resolution = '';
  assetTypes: AssetType[] = [];
  taskTypes: TaskType[] = [];
  taskStatuses: TaskStatus[] = [];
  team: ProcessedUser[] = [];
  thumbnailUrl = '';
  sequences: Sequence[] = [];
  shots: Shot[] = [];
  assets: Asset[] = [];
  totalFrames = 1;
  frameOffset = 0;
  fps = 24;
  videoPlayerSources: VideoPlayerSource[] = [];
}


export class useProjectStore {
  data = reactive(new DataProjectStore());

  async fetchProjectData(projectId: string) {
    try {
      const context = await axios.get(dataUrls.getUrl(dataUrls.urlType.Context));
      colors.batchAssignColor(context.data.asset_types);
      this.data.assetTypes = context.data.asset_types;
      colors.batchConvertColorHexToRGB(context.data.task_types);
      this.data.taskTypes = context.data.task_types;
      colors.batchConvertColorHexToRGB(context.data.task_status);
      this.data.taskStatuses = context.data.task_status;
      // this.data.team = context.data.users;

      const response = await axios.get(dataUrls.getUrl(dataUrls.urlType.Project, projectId));
      this.data.id = response.data.id;
      this.data.name = response.data.name;
      this.data.ratio = response.data.ratio;
      this.data.resolution = response.data.resolution;
      this.data.thumbnailUrl = response.data.thumbnailUrl;
      this.data.fps = response.data.fps;

      // If specific tasks are defined for this project, filter the context
      if (response.data.task_types.length > 0) {
        this.data.taskTypes = this.data.taskTypes.filter(function(t) {
          return response.data.task_types.includes(t.id);
        });
      }
      if (response.data.task_statuses.length > 0) {
        this.data.taskStatuses = this.data.taskStatuses.filter(function(t) {
          return response.data.task_statuses.includes(t.id);
        });
      }
      if (response.data.asset_types.length > 0) {
        this.data.assetTypes = this.data.assetTypes.filter(function(a) {
          return response.data.asset_types.includes(a.id);
        });
      }

      // Reference all users from the context
      const projectTeam = response.data.team;
      // If the project has any user referenced (as list of IDs)
      if (projectTeam.length > 0) {
        const processedUsers = [];
        for (let i = 0; i < projectTeam.length; i++) {
          // Lookup the project user in the context, by ID
          const filteredUser = context.data.users.find((u: User) => u.id === projectTeam[i]);
          if (!filteredUser) {continue}
          // Build a processed user
          // TODO: Use the existing User type, not ProcessedUser
          const user: ProcessedUser = {
            name: filteredUser.full_name,
            id: filteredUser.id,
            profilePicture: `${basePath}static/img/placeholder-user.png`,
            color: undefined
          }
          if (filteredUser.has_avatar) {
            user.profilePicture = `${basePath}${filteredUser.thumbnailUrl}`;
          }
          processedUsers.push(user);
        }
        colors.batchAssignColor(processedUsers);
        this.data.team = processedUsers;
      }

    } catch (error) {
      console.log(error)
    }
  }
  async fetchProjectSequences(projectId: string) {
    try {
      const response = await axios.get(dataUrls.getUrl(dataUrls.urlType.Sequences, projectId));
      // Setup data for Sequences.
      for (let i = 0; i < response.data.length; i++) {
        const seq = response.data[i];
        seq.color = colors.paletteDefault[i];
      }
      this.data.sequences = response.data;

      // Perform asset casting
      // for (let i = 0; i < this.data.sequences.length; i++) {
      //   const seq = response.data[i];
      //   await this.data.fetchSequenceCasting(projectId, seq.id)
      // }
    } catch (error) {
      console.log(error)
    }
  }
  async fetchProjectShots(projectId: string) {
    try {
      const response = await axios.get(dataUrls.getUrl(dataUrls.urlType.Shots, projectId));
      for (const shot of response.data) {
        if (dataUrls.isStatic) {
          if (shot.thumbnailUrl === null) {
            shot.thumbnailUrl = `${basePath}static/img/placeholder-asset.png`
          } else {
            // Prepend the base_url
            const basePath = import.meta.env.BASE_URL;
            shot.thumbnailUrl = `${basePath}${shot.thumbnailUrl}`
          }
        } else {
          // If the shot comes from Kitsu, we need to add some properties.
          shot.thumbnailUrl = `/api/pictures/thumbnails/preview-files/${shot.preview_file_id}.png`;
          shot.startFrame = shot.data.frame_in;
          shot.durationSeconds = (shot.data.frame_out - shot.data.frame_in) / this.data.fps;
        }
        shot.asset_ids = [];
      }
      this.data.shots = response.data;
      this.data.shots.sort((a, b) => (a.startFrame > b.startFrame) ? 1 : -1)
    } catch (error) {
      console.log(error)
    }
  }
  async fetchProjectCasting(projectId: string) {
    try {
      const response = await axios.get(dataUrls.getUrl(dataUrls.urlType.Casting, projectId));
      for (const shot of this.data.shots) {
        // We assume that shotCasting.shot_id is unique
        const filteredCasting = response.data.find((shotCasting: ShotCasting) => shotCasting.shot_id === shot.id);
        if (filteredCasting === undefined) { continue }
        shot.asset_ids = filteredCasting.asset_ids;
        // shot.asset_ids = [];
      }

      for (const asset of this.data.assets) {
        asset.shot_ids = response.data
          .filter((s: ShotCasting) => s.asset_ids.includes(asset.id))
          .map((s: ShotCasting) => s.shot_id);
      }

    } catch (error) {
      console.log(error);
    }
  }
  async fetchEditData(projectId: string) {
    const urlEdit = `${basePath}data/projects/${projectId}/edit.json`
    const response = await axios.get(urlEdit);
    this.data.totalFrames = response.data.totalFrames;
    this.data.frameOffset = response.data.frameOffset;
    this.data.videoPlayerSources = [
      {
        src: `${basePath}${response.data.sourceName}`,
        type: response.data.sourceType,
      }
    ]
    // this.data.setCurrentFrame(response.data.frameOffset);

  }
  async fetchProjectAssets(projectId: string) {
    try {
      const response = await axios.get(dataUrls.getUrl(dataUrls.urlType.Assets, projectId));
      for (const asset of response.data) {
        if (dataUrls.isStatic) {
          if (asset.thumbnailUrl === null) {
            asset.thumbnailUrl = `${basePath}static/img/placeholder-asset.png`
          } else {
            // Prepend the base_url
            const basePath = import.meta.env.BASE_URL;
            asset.thumbnailUrl = `${basePath}${asset.thumbnailUrl}`
          }
        } else {
          // If the shot comes from Kitsu, we need to add the thumbnailUrl property.
          asset.thumbnailUrl = `/api/pictures/thumbnails/preview-files/${asset.preview_file_id}.png`;
        }
        // This will be populated via fetchSequenceCasting()
        asset.shot_ids = [];
      }
      this.data.assets = response.data;
    } catch (error) {
      console.log(error);
    }
  }
  async initWithProject(projectId: string) {
    try {
      await this.fetchProjectData(projectId);
      await this.fetchProjectShots(projectId);
      await this.fetchProjectAssets(projectId);
      await this.fetchProjectSequences(projectId);
      await this.fetchProjectCasting(projectId)
      await this.fetchEditData(projectId);
    } catch (error) {
      console.log(error)
    }
  }
}
