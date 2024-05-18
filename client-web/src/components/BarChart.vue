<template lang="pug">
Bar(:data="props.chartData" :options="mergedChartOptions")
</template>

<script setup>
import { Bar } from 'vue-chartjs';
import {computed} from 'vue';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  TimeScale
} from 'chart.js'
import 'chartjs-adapter-date-fns';

ChartJS.register(CategoryScale, LinearScale, TimeScale, BarElement, Title, Tooltip, Legend);

const props = defineProps({
  chartData: {
    type: Object,
    required: true
  },
  chartTitle: {
    type: String,
    required: false,
    default: ""
  },
  chartOptions: {
    type: Object,
    default: () => ({
      responsive: false,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: ""
        }
      },
      scales: {
        x:
          {
            type: "time",
            stacked: true,
            // time: {
            //   round: true,
            //   unit: 'day'
            // }
          }
      },
      elements: {
        line: {
          tension: 0
        }
      }
    }),
  }
})

// Computed property to merge chartOptions with chartTitle
const mergedChartOptions = computed(() => {
  return  {
    ...props.chartOptions,
    plugins: {
      ...props.chartOptions.plugins,
      title: {
        ...props.chartOptions.plugins.title,
        text: props.chartTitle || props.chartOptions.plugins.title.text
      }
    }
  };
});

// const chartData = reactive({
//   labels: ['January', 'February', 'March'],
//   datasets: [{ data: [40, 20, 12] }]
// })
//
// const chartOptions = reactive({
//   responsive: true
// })

</script>

<style scoped lang="scss">

</style>
