<script setup>
import VueApexCharts from 'vue3-apexcharts'

const chartOptions = computed(() => ({
  labels: Object.keys(analytics.value.statusDistribution),
  colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
  dataLabels: { enabled: false },
  legend: { position: 'bottom' }
}))

const series = computed(() => 
  Object.values(analytics.value.statusDistribution)
)
</script>

<template>
  <ClientOnly>
    <VueApexCharts
      type="donut"
      height="300"
      :options="chartOptions"
      :series="series"
    />
  </ClientOnly>
</template>