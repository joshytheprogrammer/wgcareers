<!-- Create components/LineChart.vue -->
<script setup>
import VueApexCharts from 'vue3-apexcharts'

const props = defineProps(['data'])
const chartOptions = ref({
  chart: { type: 'line', height: 350 },
  xaxis: { type: 'datetime' }
});
</script>

<template>
  <ClientOnly>
    <VueApexCharts 
      :options="chartOptions" 
      :series="[{ data: props.data }]"
    />
  </ClientOnly>
</template>