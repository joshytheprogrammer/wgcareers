<script setup>
import { collection, query, where, getDocs } from 'firebase/firestore'
const db = useFirestore()
const route = useRoute()

const job = ref(null)
const error = ref('')
const isLoading = ref(true)

// Default job structure for data safety
const defaultJob = {
  title: '',
  company: 'Walls and Gates',
  location: '',
  type: '',
  salary: '',
  description_html: '',
  requirements: [],
  benefits: [],
  application_instructions_html: ''
}

// Set SEO meta tags
useHead(() => ({
  title: job.value?.title ? `${job.value.title} at ${job.value.company}` : 'Job Listing',
  meta: [
    { 
      name: 'description', 
      content: job.value?.description_html 
        ? stripHtml(job.value.description_html).substring(0, 155) 
        : 'Explore this job opportunity at Walls and Gates' 
    },
    // Open Graph / Facebook
    { property: 'og:type', content: 'website' },
    { 
      property: 'og:title', 
      content: job.value?.title ? `${job.value.title} at ${job.value.company}` : 'Job Opportunity' 
    },
    { 
      property: 'og:description', 
      content: job.value?.description_html 
        ? stripHtml(job.value.description_html).substring(0, 155) 
        : 'Explore this job opportunity at Walls and Gates' 
    },
    { property: 'og:url', content: `https://careers.wandggroup.com/jobs/${route.params.slug}` },
    // Twitter
    { name: 'twitter:card', content: 'summary_large_image' },
    { 
      name: 'twitter:title', 
      content: job.value?.title ? `${job.value.title} at ${job.value.company}` : 'Job Opportunity' 
    },
    { 
      name: 'twitter:description', 
      content: job.value?.description_html 
        ? stripHtml(job.value.description_html).substring(0, 155) 
        : 'Explore this job opportunity at Walls and Gates' 
    },
  ],
  // Canonical URL
  link: [
    { rel: 'canonical', href: `https://careers.wandggroup.com/jobs/${route.params.slug}` }
  ]
}))

// Helper function to strip HTML tags for meta descriptions
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

try {
  isLoading.value = true
  error.value = ''
  
  const q = query(
    collection(db, 'jobs'),
    where('slug', '==', route.params.slug)
  )
  
  const querySnapshot = await getDocs(q)
  
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0]
    // Merge with default job to ensure all fields exist
    job.value = { ...defaultJob, id: doc.id, ...doc.data() }
  } else {
    throw new Error('Job not found')
  }
} catch (err) {
  error.value = err.message
  // Set default job for rendering even when error occurs
  job.value = defaultJob
} finally {
  isLoading.value = false
}
</script>

<template>
  <UContainer class="max-w-3xl py-8">
    <div class="flex justify-between items-center mb-6">
      <UButton
        to="/"
        icon="i-heroicons-arrow-left"
        variant="ghost"
        color="gray"
        :disabled="isLoading"
      >
        Back to Listings
      </UButton>
      <UButton
        :to="`/jobs/${route.params.slug}/apply`"
        trailing-icon="i-heroicons-arrow-up-right-solid"
        color="primary"
        :disabled="isLoading"
      >
        Apply
      </UButton>
    </div>

    <!-- Loading State -->
    <template v-if="isLoading">
      <div class="space-y-6">
        <USkeleton class="h-10 w-3/4" />
        <div class="space-y-4">
          <USkeleton class="h-4 w-1/2" />
          <USkeleton class="h-4 w-1/3" />
          <USkeleton class="h-4 w-1/4" />
        </div>
        <div class="space-y-4 mt-8">
          <USkeleton class="h-6 w-1/4" />
          <USkeleton class="h-32 w-full" />
        </div>
        <div class="space-y-4">
          <USkeleton class="h-6 w-1/4" />
          <USkeleton class="h-24 w-full" />
        </div>
      </div>
    </template>

    <!-- Error State -->
    <UAlert
      v-else-if="error"
      icon="i-heroicons-exclamation-triangle"
      color="red"
      variant="subtle"
      :title="error"
      :description="'The job you requested could not be found'"
      class="mb-6"
    />

    <!-- Content -->
    <UCard v-if="!isLoading && !error" class="overflow-hidden">
      <template #header>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          {{ job.title || 'Untitled Position' }}
        </h1>
        
        <div class="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <UBadge
            v-if="job.type"
            :label="job.type"
            color="primary"
            variant="subtle"
          />
          
          <div class="flex items-center gap-1 text-gray-600 dark:text-gray-300">
            <UIcon name="i-heroicons-building-office" class="w-4 h-4" />
            <span>{{ job.company }}</span>
          </div>
          
          <div class="flex items-center gap-1 text-gray-600 dark:text-gray-300">
            <UIcon name="i-heroicons-map-pin" class="w-4 h-4" />
            <span>{{ job.location }}</span>
          </div>
          
          <div v-if="job.salary" class="flex items-center gap-1 font-medium">
            <UIcon name="i-heroicons-currency-dollar" class="w-4 h-4" />
            <span>{{ job.salary }}</span>
          </div>
        </div>
      </template>

      <div class="space-y-8">
        <!-- Description -->
        <div>
          <!-- <h2 class="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">
            Description
          </h2> -->
          <div 
            class="prose prose-sm sm:prose-base dark:prose-invert max-w-none editor-div leading-8" 
            v-html="job.description_html || '<p>No description provided</p>'"
          />
        </div>
        
        <!-- Requirements -->
        <div v-if="job.requirements?.length">
          <h2 class="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">
            Requirements
          </h2>
          <ul class="space-y-2">
            <li 
              v-for="(req, index) in job.requirements" 
              :key="index"
              class="flex items-start gap-2"
            >
              <UIcon name="i-heroicons-check-circle" class="w-5 h-5 mt-0.5 text-primary-500 flex-shrink-0" />
              <span>{{ req }}</span>
            </li>
          </ul>
        </div>
        
        <!-- Benefits -->
        <div v-if="job.benefits?.length">
          <h2 class="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">
            Benefits
          </h2>
          <ul class="space-y-2">
            <li 
              v-for="(benefit, index) in job.benefits" 
              :key="'benefit-'+index"
              class="flex items-start gap-2"
            >
              <UIcon name="i-heroicons-sparkles" class="w-5 h-5 mt-0.5 text-yellow-500 flex-shrink-0" />
              <span>{{ benefit }}</span>
            </li>
          </ul>
        </div>
        
        <!-- Application -->
        <div>
          <h2 class="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">
            How to Apply
          </h2>
          <div 
            class="prose prose-sm sm:prose-base dark:prose-invert max-w-none editor-div leading-8" 
            v-html="job.application_instructions_html || '<p>Application instructions not provided</p>'"
          />
        </div>
      </div>
    </UCard>
  </UContainer>
</template>

<style>
.editor-div p {
  margin-bottom: 1rem;
}

.editor-div a {
  color: #2563eb; /* Primary-600 */
  text-decoration: none;
}

.editor-div a:hover {
  text-decoration: underline;
}

.editor-div ul {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin-bottom: 0.5rem;
}

.editor-div ol {
  list-style-type: decimal;
  padding-left: 1.5rem;
  margin-bottom: 0.5rem;
}

@media (prefers-color-scheme: dark) {
  .editor-div a {
    color: #60a5fa; /* Primary-400 in dark mode */
  }
}

</style>