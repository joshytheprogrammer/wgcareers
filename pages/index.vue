<script setup>
import { collection, onSnapshot } from 'firebase/firestore'
const db = useFirestore()

const jobs = ref([])
const searchTerm = ref('')
const selectedLocation = ref('All')
const selectedJobType = ref('All')
const loading = ref(true)
const error = ref('')

// Fetch jobs from Firestore
onMounted(() => {
  const unsubscribe = onSnapshot(collection(db, 'jobs'), (snapshot) => {
    jobs.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    loading.value = false
  }, (err) => {
    error.value = 'Failed to load jobs: ' + err.message
    loading.value = false
  })

  return () => unsubscribe()
})

const uniqueLocations = computed(() => {
  return [...new Set(jobs.value.map(job => job.location).filter(Boolean))]
})

const uniqueJobTypes = computed(() => {
  return [...new Set(jobs.value.map(job => job.type).filter(Boolean))]
})

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
    <div v-if="loading" class="text-center p-8">
      Loading jobs...
    </div>

    <div v-else>
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

      <div v-if="error" class="p-4 mb-4 text-red-500 bg-red-100 rounded">
        {{ error }}
      </div>

      <div v-if="filteredJobs.length === 0 && !error" class="text-center p-8">
        No jobs found matching your criteria
      </div>

      <div v-else class="grid gap-6">
        <JobList v-for="job in filteredJobs" :key="job.id" :job="job" />
      </div>
    </div>
  </div>
</template>