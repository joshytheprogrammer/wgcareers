// pages/index.vue
<script setup>
import jobsData from '~/assets/jobs.json'

const jobs = ref(jobsData.jobs)
const searchTerm = ref('')
const selectedLocation = ref('All')
const selectedJobType = ref('All')

const uniqueLocations = computed(() => [...new Set(jobs.value.map(job => job.location))])
const uniqueJobTypes = computed(() => [...new Set(jobs.value.map(job => job.type))])

const filteredJobs = computed(() => {
  return jobs.value.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
      job.description.toLowerCase().includes(searchTerm.value.toLowerCase())
    const matchesLocation = selectedLocation.value === 'All' || job.location === selectedLocation.value
    const matchesJobType = selectedJobType.value === 'All' || job.type === selectedJobType.value
    return matchesSearch && matchesLocation && matchesJobType
  })
})

function clearFilters() {
  searchTerm.value = ''
  selectedLocation.value = 'All'
  selectedJobType.value = 'All'
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-8">
    <div class="mb-8 space-y-4">
      <SearchBar @search="term => searchTerm = term" />
      <div class="flex gap-4 flex-wrap ">
        <FilterLocation :locations="uniqueLocations" @select="selectedLocation = $event" />
        <FilterJobType :jobTypes="uniqueJobTypes" @select="selectedJobType = $event" />
        <button 
          @click="clearFilters"
          class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Clear Filters
        </button>
      </div>
    </div>
    <div class="grid gap-6">
      <JobList v-for="job in filteredJobs" :key="job.id" :job="job" />
    </div>
  </div>
</template>