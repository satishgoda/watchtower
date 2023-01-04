import { defineStore } from 'pinia';
import axios from 'axios';
import dataUrls from '@/lib/dataurls';
import colors from '@/lib/colors';

const basePath = import.meta.env.BASE_URL;

export const useProjectStore = defineStore('project', {
  state: () => ({
    id: String,
    name: String,
    ratio: Number,
    resolution: String,
    assetTypes: new Array<AssetType>(),
    taskTypes: new Array<TaskType>(),
    taskStatuses: new Array<TaskStatus>(),
    team: new Array<ProcessedUser>(),
    thumbnailUrl: String,
    sequences: new Array<Sequence>(),
    shots: new Array<Shot>(),
    assets: new Array<Asset>(),
    totalFrames: 1,
    frameOffset: 0,
    fps: 24,
    videoPlayerOptions: {},
    // Runtime state
    isPlaying: false,
    currentFrame: 0,
    timelineVisibleFrames: [0, 1],
    currentSequence: null as Sequence | null,
    currentShot: null as Shot | null,
    selectedAssets: new Array<Asset>(),
    // Runtime UI settings
    isShowingTimelineTasks: false,
    isShowingTimelineAssets: true,
    timelineCanvasHeightPx: 0,
  }),
  actions: {
    setCurrentFrame: function (frameNumber: string|number) {
      // Force frameNumber to be int. Since it comes from JSON metadata it could have
      // accidentally been stored as a string. This is due to weak schema validation on Kitsu.

      this.currentFrame  = typeof frameNumber === 'string' ? parseInt(frameNumber) : frameNumber

      // Find the shot for the current frame (not necessarily visible as a thumbnail).
      let shotForCurrentFrame = null;
      for (const shot of this.shots) {
        if (shot.startFrame > this.currentFrame) {
          break;
        }
        shotForCurrentFrame = shot;
      }
      this.currentShot = shotForCurrentFrame;

      // Find the corresponding sequence, if any.
      let currSequence = null;
      if (shotForCurrentFrame) {
        for (const seq of this.sequences) {
          if (seq.id === shotForCurrentFrame.sequence_id) {
            currSequence = seq;
            break;
          }
        }
      }
      this.currentSequence = currSequence;
    },
    async fetchProjectData(projectId: string) {
      try {
        const context = await axios.get(dataUrls.getUrl(dataUrls.urlType.Context));
        colors.batchAssignColor(context.data.asset_types);
        this.assetTypes = context.data.asset_types;
        colors.batchConvertColorHexToRGB(context.data.task_types);
        this.taskTypes = context.data.task_types;
        colors.batchConvertColorHexToRGB(context.data.task_status);
        this.taskStatuses = context.data.task_status;
        // this.team = context.data.users;

        const response = await axios.get(dataUrls.getUrl(dataUrls.urlType.Project, projectId));
        this.id = response.data.id;
        this.name = response.data.name;
        this.ratio = response.data.ratio;
        this.resolution = response.data.resolution;
        this.thumbnailUrl = response.data.thumbnailUrl;
        this.fps = response.data.fps;

        // If specific tasks are defined for this project, filter the context
        if (response.data.task_types.length > 0) {
          this.taskTypes = this.taskTypes.filter(function(t) {
            return response.data.task_types.includes(t.id);
          });
        }
        if (response.data.task_statuses.length > 0) {
          this.taskStatuses = this.taskStatuses.filter(function(t) {
            return response.data.task_statuses.includes(t.id);
          });
        }
        if (response.data.asset_types.length > 0) {
          this.assetTypes = this.assetTypes.filter(function(a) {
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
          this.team = processedUsers;
        }

      } catch (error) {
        console.log(error)
      }
    },
    async fetchProjectSequences(projectId: string) {
      try {
        const response = await axios.get(dataUrls.getUrl(dataUrls.urlType.Sequences, projectId));
        // Setup data for Sequences.
        for (let i = 0; i < response.data.length; i++) {
          const seq = response.data[i];
          seq.color = colors.paletteDefault[i];
        }
        this.sequences = response.data;

        // Perform asset casting
        // for (let i = 0; i < this.sequences.length; i++) {
        //   const seq = response.data[i];
        //   await this.fetchSequenceCasting(projectId, seq.id)
        // }
      } catch (error) {
        console.log(error)
      }
    },
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
            shot.durationSeconds = (shot.data.frame_out - shot.data.frame_in) / this.fps;
          }
          shot.asset_ids = [];
        }
        this.shots = response.data;
        this.shots.sort((a, b) => (a.startFrame > b.startFrame) ? 1 : -1)
      } catch (error) {
        console.log(error)
      }
    },
    async fetchProjectCasting(projectId: string) {
      try {
        const response = await axios.get(dataUrls.getUrl(dataUrls.urlType.Casting, projectId));
        for (const shot of this.shots) {
          // We assume that shotCasting.shot_id is unique
          const filteredCasting = response.data.find((shotCasting: ShotCasting) => shotCasting.shot_id === shot.id);
          if (filteredCasting === undefined) { continue }
          shot.asset_ids = filteredCasting.asset_ids;
          // shot.asset_ids = [];
        }

        for (const asset of this.assets) {
          asset.shot_ids = response.data
            .filter((s: ShotCasting) => s.asset_ids.includes(asset.id))
            .map((s: ShotCasting) => s.shot_id);
        }

      } catch (error) {
        console.log(error);
      }
    },
    async fetchEditData(projectId: string) {
      const urlEdit = `/static/projects/${projectId}/edit.json`
      const response = await axios.get(urlEdit);
      this.totalFrames = response.data.totalFrames;
      this.frameOffset = response.data.frameOffset;
      this.videoPlayerOptions = {
        autoplay: false,
        controls: true,
        preload: 'auto',
        sources: [
          {
            src: response.data.sourceName,
            type: response.data.sourceType,
          }
        ]
      };
      // this.setCurrentFrame(response.data.frameOffset);

    },
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
        this.assets = response.data;
      } catch (error) {
        console.log(error);
      }
    },
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
})
