<template lang="pug">
.dashboard(v-if="loaded")
  .chart(v-for="(t, id) in parsedTaskTypeCounts" :key="id")
    BarChart(
      :chart-data="t.chartData"
      :chart-title="t.taskName"
     style="position: relative; height:20vh; width:100%"
  )

</template>

<script setup lang="ts">

import {ref, onMounted } from 'vue';
import {useRoute} from 'vue-router';
import BarChart from '@/components/BarChart.vue';
import dataUrls from '@/lib/dataurls';
import colors from '@/lib/colors';
import type {
  ParsedTaskStatusCountsDataset,
  ParsedTaskTypeCount,
  ParsedTaskCountSnapshot,
  TaskTypeCount,
} from '@/types.d.ts';
import {useProjectStore} from '@/stores/project';


const projectStore = new useProjectStore();
const route = useRoute();
const projectId = route.params['projectId'] as string;
const episodeId = route.query['episodeId'] as string;

const emit = defineEmits<{
  setActiveProjectId: [projectId: string]
}>()

const props = defineProps<{
  activeProjectId: string;
  activeEpisodeId: string;
}>()

const loaded = ref(false);
let taskTypeCounts = ref<TaskTypeCount[]>([]);
let parsedTaskTypeCounts = ref<ParsedTaskTypeCount[]>([]);

/* Turn taskCounts into data for the charts */
function parseTaskCounts() {
  // Helper function to round up the date to the day
  function roundToDay(dateString: string) {
    // Create a Date object from the string
    const date = new Date(dateString);
    // Set hours, minutes, seconds, and milliseconds to zero to round down to the start of the day
    date.setHours(0, 0, 0, 0);
    // Return the ISO string representation of the date (only the date part)
    return date.toISOString().split('T')[0];
  }

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
    parsedTaskTypeCounts.value.push({
      taskName: taskType?.name ?? 'Undefined',
      chartData: {datasets: datasets},
    })
  }
}


const fetchTaskCounts = async () => {
  const url = dataUrls.getUrl(dataUrls.urlType.TaskCounts, projectId);
  await fetch(url)
    .then(response => response.json())
    .then(data => {
      taskTypeCounts.value = data;
      parseTaskCounts();
      loaded.value = true
    })

};

const initProject = async () => {
  await projectStore.initWithProject(projectId).then(fetchTaskCounts);
}

onMounted(initProject);

// const chartData = reactive({
//   labels: ['January', 'February', 'March', 'A'],
//   datasets: [{ data: [40, 20, 12, 150] }]
// })

emit('setActiveProjectId', projectId)
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
