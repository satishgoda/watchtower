import type {EpisodeListItem} from '@/types.d.ts';

export class RuntimeStateNavigation {
  activeProjectId = '';
  activeEpisodeId? = '';
  episodes: EpisodeListItem[] = [];
}
