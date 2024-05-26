import {reactive} from 'vue';
import axios from 'axios';
import dataUrls from '@/lib/dataurls';
import colors from '@/lib/colors';
import type { Asset, AssetType, TaskType, TaskStatus, ProcessedUser, Sequence, Shot, ShotCasting, VideoPlayerSource, Episode, Edit } from '@/types.d.ts';

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
  episodes: Episode[] = [];
}

export class useProjectStore {
  data = reactive(new DataProjectStore());

  getEpisodeSequences(episodeId: string): Sequence[] {
    // Look for episode, considering that ID might not be found, or that data.episodes is empty
    const episode: Episode | undefined = this.data.episodes.find(episode => episode.id === episodeId);
    if (!episode) {return []}
    return episode.sequences;
  }
  async fetchProjectData(projectId: string) {
    try {

      const response = await axios.get(dataUrls.getUrl(dataUrls.urlType.Project, projectId));
      this.data.id = response.data.id;
      this.data.name = response.data.name;
      this.data.ratio = response.data.ratio;
      this.data.resolution = response.data.resolution;
      this.data.thumbnailUrl = response.data.thumbnailUrl;
      this.data.fps = response.data.fps;

      colors.batchAssignColor(response.data.asset_types);
      this.data.assetTypes = response.data.asset_types;
      colors.batchConvertColorHexToRGB(response.data.task_types);
      this.data.taskTypes = response.data.task_types;
      colors.batchConvertColorHexToRGB(response.data.task_statuses);
      this.data.taskStatuses = response.data.task_statuses;

      // Reference all users from the context
      const projectTeam = response.data.team;
      // If the project has any user referenced (as list of IDs)
      if (projectTeam.length > 0) {
        const processedUsers = [];
        for (const filteredUser of projectTeam) {
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
      // If project has episodes
      if (response.data.episodes.length > 0) {
        this.data.episodes = response.data.episodes;
      }

    } catch (error) {
      console.log(error)
    }
  }
  async fetchProjectSequences(projectId: string, episodeId?: string) {
    try {
      const url = dataUrls.getUrl(dataUrls.urlType.Sequences, projectId);
      const response = await axios.get(url);

      const sequences: Sequence[] = response.data;
      let sequencesFiltered: Sequence[] = response.data;

      // Filter sequences, based on episode
      if (episodeId) {
        const sequencesFilter: Sequence[] = this.getEpisodeSequences(episodeId);
        sequencesFiltered = sequences.filter(sequence => {
          // Check if the sequence's id is present in sequences_filter
          return sequencesFilter.some(filter => filter.id === sequence.id);
        });
      }

      // Setup data for Sequences.
      sequencesFiltered.forEach((seq, index) => {
        seq.color = colors.paletteDefault[index % colors.paletteDefault.length];
      });
      this.data.sequences = sequencesFiltered;

    } catch (error) {
      console.log(error)
    }
  }
  async fetchProjectShots(projectId: string, episodeId?: string) {
    try {
      const url = dataUrls.getUrl(dataUrls.urlType.Shots, projectId);
      const response = await axios.get(url);

      const shots: Shot[] = response.data;
      let shotsFiltered: Shot[] = response.data;

      // Filter sequences, based on episode
      if (episodeId) {
        const sequencesFilter: Sequence[] = this.getEpisodeSequences(episodeId);
        shotsFiltered = shots.filter(shot => {
          // Check if the sequence's id is present in sequences_filter
          return sequencesFilter.some(filter => filter.id === shot.sequence_id);
        });
      }

      for (const shot of shotsFiltered) {
        if (!shot.thumbnailUrl) {
          shot.thumbnailUrl = `${basePath}static/img/placeholder-asset.png`
        } else {
          // Prepend the base_url
          const basePath = import.meta.env.BASE_URL;
          shot.thumbnailUrl = `${basePath}${shot.thumbnailUrl}`
        }
        shot.asset_ids = [];
      }

      this.data.shots = shotsFiltered;
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
          .filter((s: ShotCasting) => {s.asset_ids && s.asset_ids.includes(asset.id)})
          .map((s: ShotCasting) => s.shot_id);
      }

    } catch (error) {
      console.log(error);
    }
  }
  async fetchEditData(projectId: string, episodeId?: string) {
    const url = `${basePath}data/projects/${projectId}/edits.json`
    const response = await axios.get(url);

    const edits: Edit[] = response.data;
    let edit: Edit = {
      id: '',
      totalFrames: 0,
      sourceName: '',
      sourceType: 'video/mp4',
      episodeId: '',
      frameOffset: 0,
    }

    // Filter sequences, based on episode
    if (episodeId) {
      const filteredEdit: Edit | undefined = edits.find(edit => edit.episodeId === episodeId);
      if (filteredEdit != undefined) {edit = filteredEdit}
    } else {
      edit = edits[0];
    }

    this.data.totalFrames = edit.totalFrames;
    this.data.frameOffset = edit.frameOffset;
    this.data.videoPlayerSources = [
      {
        src: `${basePath}${edit.sourceName}`,
        type: edit.sourceType,
      }
    ]
    // this.data.setCurrentFrame(response.data.frameOffset);

  }
  async fetchProjectAssets(projectId: string) {
    try {
      const response = await axios.get(dataUrls.getUrl(dataUrls.urlType.Assets, projectId));
      for (const asset of response.data) {
        if (asset.thumbnailUrl === null) {
          asset.thumbnailUrl = `${basePath}static/img/placeholder-asset.png`
        } else {
          // Prepend the base_url
          const basePath = import.meta.env.BASE_URL;
          asset.thumbnailUrl = `${basePath}${asset.thumbnailUrl}`
        }
        // This will be populated via fetchSequenceCasting()
        asset.shot_ids = [];
      }
      this.data.assets = response.data;
    } catch (error) {
      console.log(error);
    }
  }
  async initWithProject(projectId: string, episodeId?: string) {
    try {
      await this.fetchProjectData(projectId);
      await this.fetchProjectShots(projectId, episodeId);
      await this.fetchProjectAssets(projectId);
      await this.fetchProjectSequences(projectId, episodeId);
      await this.fetchProjectCasting(projectId)
      await this.fetchEditData(projectId, episodeId);
    } catch (error) {
      console.log(error)
    }
  }
}
