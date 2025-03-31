<!-- pages/index.vue -->
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
  return ['All', ...new Set(jobs.value.map(job => job.location).filter(Boolean))]
})

const uniqueJobTypes = computed(() => {
  return ['All', ...new Set(jobs.value.map(job => job.type).filter(Boolean))]
})

const filteredJobs = computed(() => {
  // First apply location and job type filters
  let results = jobs.value.filter(job => {
    const matchesLocation = selectedLocation.value === 'All' || job.location === selectedLocation.value
    const matchesJobType = selectedJobType.value === 'All' || job.type === selectedJobType.value
    return matchesLocation && matchesJobType
  })

  // Then apply search if there's a search term
  if (searchTerm.value) {
    const searchTerms = searchTerm.value.toLowerCase().split(' ')
    
    results = results.map(job => {
      // Create a searchable string from all relevant fields
      const searchContent = [
        job.title,
        job.company,
        job.location,
        job.type,
        job.description_snippet,
        job.description_html?.replace(/<[^>]*>/g, ' '), // Strip HTML tags
        job.salary,
        job.requirements?.join(' '),
        job.benefits?.join(' '),
        job.application_instructions_html?.replace(/<[^>]*>/g, ' ')
      ].join(' ').toLowerCase()

      // Calculate relevance score
      let score = 0
      searchTerms.forEach(term => {
        if (term.length < 2) return
        
        // Higher scores for matches in more important fields
        if (job.title.toLowerCase().includes(term)) score += 5
        if (job.company.toLowerCase().includes(term)) score += 4
        if (job.location.toLowerCase().includes(term)) score += 3
        if (job.type.toLowerCase().includes(term)) score += 3
        if (searchContent.includes(term)) score += 1
      })

      return { ...job, _searchScore: score }
    })
    .filter(job => job._searchScore > 0) // Only keep jobs with matches
    .sort((a, b) => b._searchScore - a._searchScore) // Sort by relevance
  }

  return results
})

function clearFilters() {
  searchTerm.value = ''
  selectedLocation.value = 'All'
  selectedJobType.value = 'All'
}

useHead({
  title: "Careers | Walls and Gates | Find Your Next Opportunity",
  meta: [
    {
      name: "description",
      content: "Discover job openings exclusively at Walls and Gates. Find positions that match your skills and career goals."
    },
    {
      name: "keywords",
      content: "Walls and Gates jobs, Walls and Gates careers, employment, job board, hiring"
    },
    {
      name: "robots",
      content: "index, follow"
    },
    {
      property: "og:title",
      content: "Walls and Gates Careers | Find Your Next Opportunity"
    },
    {
      property: "og:description",
      content: "Browse job openings at Walls and Gates. Apply today and take the next step in your career."
    },
    {
      property: "og:type",
      content: "website"
    },
    {
      property: "og:url",
      content: "https://careers.wandggroup.com" // Replace with the actual job board URL
    },
    {
      name: "twitter:card",
      content: "summary"
    },
    {
      name: "twitter:title",
      content: "Walls and Gates Careers | Find Your Next Opportunity"
    },
    {
      name: "twitter:description",
      content: "Explore job opportunities at Walls and Gates. Apply now to join our team."
    }
  ]
})
</script>

<template>
  <UContainer class="py-8">
    <div v-if="loading" class="text-center p-8">
      Loading...
    </div>
    
    <div v-else>
      <div class="mb-8 space-y-4">
        <SearchBar @search="term => searchTerm = term" />
        
        <div class="flex gap-4 flex-wrap items-center">
          <USelect
            v-model="selectedLocation"
            :items="uniqueLocations"
            placeholder="Filter by location"
            class="min-w-[200px]"
          />
          
          <USelect
            v-model="selectedJobType"
            :items="uniqueJobTypes"
            placeholder="Filter by job type"
            class="min-w-[200px]"
          />
          
          <UButton
            @click="clearFilters"
            label="Clear Filters"
            color="gray"
            variant="outline"
          />
        </div>
      </div>

      <UAlert
        v-if="error"
        icon="i-heroicons-exclamation-triangle"
        color="red"
        variant="solid"
        :title="error"
        class="mb-4"
      />

      <UCard v-if="filteredJobs.length === 0 && !error">
        <template #header>
          <h3 class="text-lg font-medium text-center">
            No jobs found matching your criteria
          </h3>
        </template>
        <div class="text-center text-gray-500">
          Try adjusting your search or filters
        </div>
      </UCard>

      <div v-else class="grid gap-6">
        <JobList v-for="job in filteredJobs" :key="job.id" :job="job" />
      </div>
    </div>
  </UContainer>
</template>