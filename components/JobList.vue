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
    <div class="flex justify-between gap-4 items-start">
      <div class="w-fit max-w-[80%] ">
        <NuxtLink :to="`/jobs/${generateSlug(job.title)}`" class="text-xl hover:text-black font-semibold mb-2">{{ job.title }}</NuxtLink>
        <p class="text-gray-600 mb-2">{{ job.company }}</p>
        <div class="flex gap-2 text-sm mb-4">
          <span class="px-2 py-1 bg-gray-100 rounded">{{ job.location }}</span>
          <span class="px-2 py-1 bg-gray-100 rounded">{{ job.type }}</span>
        </div>
        <p class="text-gray-700">{{ job.description_snippet }}</p>
      </div>
      <UButton 
        :to="`/jobs/${generateSlug(job.title)}`"
        color="primary"
        size="sm"
        trailing-icon="i-heroicons-arrow-long-right-20-solid"
      >
        View Details
      </UButton>
    </div>
  </div>
</template>
