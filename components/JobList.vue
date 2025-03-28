// components/JobList.vue
<script setup>
const props = defineProps({
  job: {
    type: Object,
    required: true
  }
})

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^\w-]+/g, '')
}
</script>

<template>
  <div class="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
    <div class="flex justify-between items-start">
      <div>
        <h2 class="text-xl font-semibold mb-2">{{ job.title }}</h2>
        <p class="text-gray-600 mb-2">{{ job.company }}</p>
        <div class="flex gap-2 text-sm mb-4">
          <span class="px-2 py-1 bg-gray-100 rounded">{{ job.location }}</span>
          <span class="px-2 py-1 bg-gray-100 rounded">{{ job.type }}</span>
        </div>
        <p class="text-gray-700">{{ job.descriptionSnippet }}</p>
      </div>
      <NuxtLink 
        :to="`/jobs/${generateSlug(job.title)}`"
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        View Details
      </NuxtLink>
    </div>
  </div>
</template>