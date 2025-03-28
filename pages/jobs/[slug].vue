// pages/jobs/[slug].vue
<script setup>
const route = useRoute()

// Import jobs data directly from assets
import jobsData from '~/assets/jobs.json'

const job = computed(() => {
  // Generate slug for comparison
  return jobsData.jobs.find(j => 
    generateSlug(j.title) === route.params.slug
  )
})

// Enhanced slug generator to handle special characters
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^\w-]+/g, '')
}
</script>

<template>
  <div v-if="job" class="max-w-3xl mx-auto px-4 py-8">
    <NuxtLink to="/" class="mb-8 inline-block text-blue-600 hover:text-blue-800">
      ← Back to Listings
    </NuxtLink>
    <div class="bg-white p-6 rounded-lg shadow">
      <h1 class="text-3xl font-bold mb-4">{{ job.title }}</h1>
      <div class="space-y-2 mb-6">
        <p class="text-gray-600">{{ job.company }}</p>
        <p class="text-gray-600">{{ job.location }} • {{ job.type }}</p>
        <p v-if="job.salary" class="font-semibold">Salary: {{ job.salary }}</p>
      </div>
      
      <div class="space-y-6">
        <div>
          <h2 class="text-xl font-semibold mb-2">Description</h2>
          <p class="text-gray-700 whitespace-pre-wrap">{{ job.description }}</p>
        </div>
        
        <div v-if="job.requirements">
          <h2 class="text-xl font-semibold mb-2">Requirements</h2>
          <ul class="list-disc pl-6 space-y-2">
            <li v-for="(req, index) in job.requirements" :key="index">{{ req }}</li>
          </ul>
        </div>

        <div v-if="job.benefits">
          <h2 class="text-xl font-semibold mb-2">Benefits</h2>
          <ul class="list-disc pl-6 space-y-2">
            <li v-for="(benefit, index) in job.benefits" :key="index">{{ benefit }}</li>
          </ul>
        </div>

        <div>
          <h2 class="text-xl font-semibold mb-2">How to Apply</h2>
          <p class="text-gray-700 whitespace-pre-wrap">{{ job.applicationInstructions }}</p>
        </div>
      </div>
    </div>
  </div>
</template>