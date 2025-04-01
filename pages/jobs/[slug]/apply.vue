<!-- pages/[slug]/apply.vue -->
<script setup>
import { useFirestore } from 'vuefire'
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore'

const db = useFirestore()
const route = useRoute()
const toast = useToast()

// State
const job = ref(null)
const isLoading = ref(true)
const loadError = ref(null)
const isSubmitting = ref(false)
const submissionError = ref(null)
const submissionSuccess = ref(false)

// Computed
const jobId = computed(() => {
  const slug = route.params.slug
  return Array.isArray(slug) ? slug[0] : slug
})

const isFormLive = computed(() => job.value?.formSchema?.formStatus == 'live')

// Functions
const fetchJob = async () => {
  isLoading.value = true
  loadError.value = null
  job.value = null

  if (!jobId.value) {
    loadError.value = 'Job identifier is missing in the URL.'
    isLoading.value = false
    return
  }

  try {
    const q = query(collection(db, 'jobs'), where('slug', '==', jobId.value))
    const querySnapshot = await getDocs(q)

    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0]
      job.value = { id: docSnap.id, ...docSnap.data() }
    } else {
      loadError.value = `No job found matching "${jobId.value}"`
    }
  } catch (err) {
    loadError.value = 'Error fetching job details'
    toast.add({ title: 'Error', description: err.message, color: 'red' })
  } finally {
    isLoading.value = false
  }
}

const submitApplication = async (formData, node) => {
  if (isSubmitting.value || !job.value?.id) return

  isSubmitting.value = true
  submissionError.value = null
  submissionSuccess.value = false

  try {
    const submissionsColRef = collection(db, 'jobs', job.value.id, 'submissions')
    await addDoc(submissionsColRef, {
      formData,
      submittedAt: serverTimestamp(),
      status: 'new',
      jobId: job.value.id,
      jobTitle: job.value.title || 'N/A',
      metadata: {
        userAgent: navigator.userAgent || 'N/A',
        submittedFromUrl: window.location.href
      }
    })

    toast.add({ title: 'Success!', description: 'Application submitted', color: 'green' })
    submissionSuccess.value = true
    node.reset()
  } catch (err) {
    submissionError.value = 'Error submitting application'
    toast.add({ title: 'Error', description: err.message, color: 'red' })
  } finally {
    isSubmitting.value = false
  }
}

onMounted(fetchJob);
</script>
<template>
  <UContainer class="py-12 px-4 sm:px-6">
    <!-- Loading State (Combined) -->
    <div v-if="isLoading" class="text-center py-16">
      <UIcon 
        name="i-heroicons-arrow-path" 
        class="w-16 h-16 mx-auto animate-spin text-primary-500" 
      />
      <p class="mt-6 text-lg font-medium text-gray-700">Loading job details...</p>
    </div>

    <!-- Error State (Gemini style with Deepseek elements) -->
    <div v-else-if="loadError" class="text-center py-16">
      <div class="inline-flex items-center justify-center bg-red-50 dark:bg-red-900/20 p-4 rounded-full">
        <UIcon 
          name="i-heroicons-exclamation-triangle" 
          class="w-16 h-16 text-red-500" 
        />
      </div>
      <h1 class="mt-6 text-2xl font-bold text-gray-900 dark:text-white">Error Loading Job</h1>
      <p class="mt-3 text-gray-600 dark:text-gray-300 max-w-md mx-auto">
        {{ loadError }}
      </p>
      <UButton 
        to="/" 
        label="Browse Available Positions" 
        class="mt-6"
        size="lg"
        color="primary"
        variant="solid"
      />
    </div>

    <!-- Success State (Gemini) -->
    <div v-else-if="submissionSuccess" class="text-center py-16 max-w-lg mx-auto">
      <div class="inline-flex items-center justify-center bg-green-50 dark:bg-green-900/20 p-4 rounded-full mb-6">
        <UIcon name="i-heroicons-check-badge" class="w-16 h-16 text-green-500" />
      </div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Application Submitted!</h1>
      <p class="mt-4 text-lg text-gray-600 dark:text-gray-300">
        Thank you for applying for the <strong>{{ job?.title || 'position' }}</strong>. We have received your application and will be in touch if your qualifications match our requirements.
      </p>
      <UButton
        to="/"
        label="Browse More Jobs"
        class="mt-8"
        size="lg"
        color="primary"
        variant="solid"
      />
    </div>

    <!-- Form Closed State (Combined) -->
    <div v-else-if="job && !isFormLive" class="text-center py-16">
      <div class="inline-flex items-center justify-center bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-full">
        <UIcon 
          name="i-heroicons-exclamation-triangle" 
          class="w-16 h-16 text-yellow-500" 
        />
      </div>
      <h1 class="mt-6 text-2xl font-bold text-gray-900 dark:text-white">Application Closed</h1>
      <p class="mt-3 text-gray-600 dark:text-gray-300 max-w-md mx-auto">
        This job application is not currently accepting submissions.
      </p>
      <UButton 
        to="/" 
        label="Browse Available Positions" 
        class="mt-6"
        size="lg"
        color="primary"
        variant="solid"
      />
    </div>

    <!-- Job Application Form (Combined best of both) -->
    <div v-else-if="job && job.formKitSchema" class="max-w-3xl mx-auto">
      <!-- Job Header (Deepseek style) -->
      <div class="mb-8 text-center">
        <UBadge 
          v-if="job.type"
          :label="job.type" 
          color="primary"
          variant="subtle"
          size="lg"
          class="mb-4"
        />
        <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
          {{ job.title }}
        </h1>
        <div class="mt-4 flex flex-wrap items-center justify-center gap-4 text-gray-600 dark:text-gray-300">
          <div class="flex items-center gap-1.5">
            <UIcon name="i-heroicons-building-office" class="w-5 h-5" />
            <span>{{ job.company }}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <UIcon name="i-heroicons-map-pin" class="w-5 h-5" />
            <span>{{ job.location }}</span>
          </div>
        </div>
        
        <UButton
          :to="`/jobs/${route.params.slug}`" 
          label="Back to Job Listing"
          icon="i-heroicons-arrow-left"
          color="gray"
          variant="ghost"
          class="mt-4"
        />
      </div>

      <!-- Application Form (Gemini structure with Deepseek styling) -->
      <UCard 
        class="shadow-lg"
        :ui="{
          base: 'ring-1 ring-gray-200 dark:ring-gray-800',
          rounded: 'rounded-xl',
          header: {
            base: 'border-b border-gray-200 dark:border-gray-800'
          }
        }"
      >
        <template #header>
          <div class="text-center">
            <h2 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {{ job.formSchema.title }}
            </h2>
            <p 
              v-if="job.formSchema?.description" 
              class="mt-2 text-gray-600 dark:text-gray-300"
            >
              {{ job.formSchema.description }}
            </p>
          </div>
        </template>

        <div class="px-1 sm:px-4 flex justify-center form-container">
          <FormKit
            type="form"
            @submit="submitApplication"
            :actions="false"
            #default="{ state: { valid } }"
          >
            <FormKitSchema 
              v-if="job.formKitSchema"
              :schema="job.formKitSchema"
            />

            <div class="mt-8 pb-4 text-center">
              <UButton
                type="submit"
                label="Submit Application"
                :loading="isSubmitting"
                icon="i-heroicons-paper-airplane"
                size="xl"
                color="primary"
                class="px-8 py-3 mx-auto text-lg font-medium cursor-pointer w-full flex justify-center"
                :disabled="isSubmitting || !valid"
              />
            </div>
          </FormKit>
        </div>
  
        <div 
          v-if="submissionError" 
          class="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400 text-sm"
        >
          <div class="flex items-start gap-2">
            <UIcon name="i-heroicons-exclamation-circle" class="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{{ submissionError }}</span>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Fallback Error (Gemini) -->
    <div v-else class="text-center py-16">
      <div class="inline-flex items-center justify-center bg-orange-50 dark:bg-orange-900/20 p-4 rounded-full">
        <UIcon name="i-heroicons-question-mark-circle" class="w-16 h-16 text-orange-500" />
      </div>
      <h1 class="mt-6 text-2xl font-bold text-gray-900 dark:text-white">Application Unavailable</h1>
      <p class="mt-3 text-gray-600 dark:text-gray-300 max-w-md mx-auto">
        The application form for this job could not be displayed at this time.
      </p>
      <UButton
        to="/"
        label="Browse Available Positions"
        class="mt-6"
        size="lg"
        color="primary"
        variant="solid"
      />
    </div>
  </UContainer>
</template>


<style scoped>
.form-container {
  width: 100%;
}

.form-container > .formkit-form {
  width: 100%;
  min-width: min(100%, 450px);
  max-width: 450px;
  margin: 0 auto; /* center in larger containers */
}

/* For small screens */
@media (max-width: 480px) {
  .form-container > .formkit-form {
    max-width: 100%;
  }
}
</style>