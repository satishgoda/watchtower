<template lang="pug">
.dashboard(v-if="loaded")
  .chart(v-for="(t, id) in parsedTaskTypeCounts" :key="id")
    BarChart(
      :chart-data="t.chartData"
      :chart-title="t.name"
     style="position: relative; height:18vh; width:100%"
  )

</template>

<script setup lang="ts">

import {ref, onMounted, watch} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import BarChart from '@/components/BarChart.vue';
import dataUrls from '@/lib/dataurls';
import colors from '@/lib/colors';
import type {
  ParsedTaskStatusCountsDataset,
  ParsedTaskTypeCount,
  ParsedTaskCountSnapshot,
  TaskTypeCount, ProjectListItem, EpisodeListItem,
} from '@/types.d.ts';
import {useProjectStore} from '@/stores/project';
import type {RuntimeStateNavigation} from '@/stores/runtimeStateNavigation';


const projectStore = new useProjectStore();
const route = useRoute();
const router = useRouter();

const emit = defineEmits<{
  setRuntimeStateNavigation: [runtimeStateNavigation: RuntimeStateNavigation]
}>()

const props = defineProps<{
  runtimeStateNavigation: RuntimeStateNavigation
  projects: ProjectListItem[]
}>()

const loaded = ref(false);
let taskTypeCounts = ref<TaskTypeCount[]>([]);
let parsedTaskTypeCounts = ref<ParsedTaskTypeCount[]>([]);

function sortTaskTypes(tasks_types_to_sort: ParsedTaskTypeCount[]) {
  // Create a map from task_types for easy lookup of order
  const orderMap = new Map();
  projectStore.data.taskTypes.forEach((task, index) => {
    orderMap.set(task.id, index);
  });

  // Sort the tasks_types_to_sort array based on the order in orderMap
  tasks_types_to_sort.sort((a: ParsedTaskTypeCount, b: ParsedTaskTypeCount) => {
    const orderA = orderMap.get(a.id);
    const orderB = orderMap.get(b.id);
    return orderA - orderB;
  });

  return tasks_types_to_sort;
}

/* Turn taskCounts into data for the charts */
function parseTaskCounts(episodeId?: string) {
  // Helper function to round up the date to the day
  function roundToDay(dateString: string) {
    // Create a Date object from the string
    const date = new Date(dateString);
    // Set hours, minutes, seconds, and milliseconds to zero to round down to the start of the day
    date.setHours(0, 0, 0, 0);
    // Return the ISO string representation of the date (only the date part)
    return date.toISOString().split('T')[0];
  }

  // Reset parsedTaskTypesCount content
  parsedTaskTypeCounts.value = [];
  for (const taskTypeCount of taskTypeCounts.value ) {
    // Animation, Lighting, etc
    if (taskTypeCount.episode_id != episodeId) { continue }
    let datasets: ParsedTaskStatusCountsDataset[] = []
    for (const taskStatusCount of taskTypeCount.task_statuses) {
      // done, in_progress, etc
      // Create a map to store unique dates
      const uniqueDates = new Map();
      for (const taskCountSnapshot of taskStatusCount.data) {
        // timestamp and count
        const dateString = taskCountSnapshot.timestamp;
        const roundedDate = roundToDay(dateString);

        // Store the rounded date in the map, which will automatically handle duplicates
        uniqueDates.set(roundedDate.split('T')[0], {
          x: roundedDate,
          y: taskCountSnapshot.count
        });
      }
      // Create a new array with the values from the map
      const data: ParsedTaskCountSnapshot[] = Array.from(uniqueDates.values());

      const taskStatus = projectStore.data.taskStatuses.find(t => t.id === taskStatusCount.task_status_id)
      datasets.push({
        // Look up the id in the project taskStatuses
        label: taskStatus?.name ?? 'Undefined',
        data: data,
        backgroundColor: colors.RGBtoHex(taskStatus?.color[0], taskStatus?.color[1], taskStatus?.color[2]),
      })
    }

    const taskType = projectStore.data.taskTypes.find(t => t.id === taskTypeCount.task_type_id)
    if (!taskType) {
      console.error(`Missing task type id: ${taskTypeCount.task_type_id}`)
      continue
    }
    parsedTaskTypeCounts.value.push({
      id: taskType.id,
      name: taskType.name,
      chartData: {datasets: datasets},
    })
  }

  parsedTaskTypeCounts.value = sortTaskTypes(parsedTaskTypeCounts.value);

}

const fetchTaskCounts = async (projectId: string, episodeId?: string) => {
  const url = dataUrls.getUrl(dataUrls.urlType.TaskCounts, projectId);
  await fetch(url)
    .then(response => response.json())
    .then(data => {
      taskTypeCounts.value = data;
      parseTaskCounts(episodeId);
      loaded.value = true
    })

};

// TODO: de-duplicate with ProjectDetailView
const initProject = async (projectId: string, episodeId?: string) => {
  let episodes: EpisodeListItem[] = [];
  const project = props.projects.find(project => project.id === projectId);
  if (!project) {return}

  // If the project has episodes, default to the first one
  if (project.episodes.length > 0) {
    episodes = project.episodes;
    if (!episodeId) {
      episodeId = project.episodes[0].id;
      // Update route to feature the default episodeId
    }
    // TODO: handle this as the only difference with ProjectDetailView
    await router.push({
      name: 'dashboard',
      params: { projectId: projectId },
      query: { episodeId: episodeId }
    })
  }
  await projectStore.initWithProject(
    projectId,
    episodeId
  ).then(async () => {
    await fetchTaskCounts(projectId, episodeId)
  });

  const state: RuntimeStateNavigation = {
      activeProjectId: projectId,
      activeEpisodeId: episodeId,
      episodes: episodes,
    }

  return state
}

const initProjectAndSetRuntimeStateNavigation = async () => {
  const projectId = route.params['projectId'] as string;
  const episodeId = route.query['episodeId'] as string;
  await initProject(projectId, episodeId).then((state: RuntimeStateNavigation | undefined) => {
    if (!state) {return}
    emit('setRuntimeStateNavigation', state);
  })
}

onMounted(initProjectAndSetRuntimeStateNavigation);

// Watchers
watch(() => props.runtimeStateNavigation, async (rts) => {
  const projectId = route.params['projectId'] as string;
  const episodeId = route.query['episodeId'] as string;
  if (props.runtimeStateNavigation.activeEpisodeId === episodeId &&
    props.runtimeStateNavigation.activeProjectId === projectId) {return}
  await initProject(rts.activeProjectId, rts.activeEpisodeId)
})

</script>

<style scoped>

.dashboard {
  margin: var(--spacer-3) auto;
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-evenly;

  .chart {
    margin: 5px;
    width: calc(50% - 40px);
    padding: 0 var(--spacer-3);
    border-radius: var(--border-radius);
    background-color: var(--panel-bg-color);
  }
}

</style>
