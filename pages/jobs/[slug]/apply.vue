<!-- pages/[slug]/apply.vue -->
<script setup>
import { doc, getDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore'
const db = useFirestore()
const route = useRoute()
const toast = useToast()

// Job and form state
const job = ref(null)
const isLoading = ref(true)
const error = ref(null)

// Form submission state
const isSubmitting = ref(false)
const submissionError = ref(null)

// Fetch job by slug
const fetchJob = async () => {
  try {
    isLoading.value = true
    error.value = null
    
    const q = query(
      collection(db, 'jobs'),
      where('slug', '==', route.params.slug)
    )
    
    const querySnapshot = await getDocs(q)
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0]
      job.value = {
        id: doc.id,
        ...doc.data()
      }
    } else {
      throw new Error('Job not found')
    }
  } catch (err) {
    error.value = err.message
  } finally {
    isLoading.value = false
  }
}

// Submit handler
const submitApplication = async (formData) => {
  try {
    isSubmitting.value = true
    submissionError.value = null

    // Create submission record
    await addDoc(collection(db, 'jobs', job.value.id, 'submissions'), {
      formData: formData,
      submittedAt: new Date(),
      status: 'new',
      metadata: {
        ip: '', // Can be set server-side
        userAgent: navigator.userAgent
      }
    })

    toast.add({
      title: 'Application submitted!',
      description: 'Thank you for your application.',
      color: 'green'
    })

    // Redirect to confirmation page
    await navigateTo(`/${route.params.slug}/confirmation`)
    
  } catch (error) {
    submissionError.value = error.message
    toast.add({
      title: 'Submission failed',
      description: error.message,
      color: 'red'
    })
  } finally {
    isSubmitting.value = false
  }
}

// Fetch job when component mounts
onMounted(fetchJob);
</script>
<template>
  <UContainer class="py-12 px-4 sm:px-6">
    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-16">
      <UIcon 
        name="i-heroicons-arrow-path" 
        class="w-16 h-16 mx-auto animate-spin text-primary-500" 
      />
      <p class="mt-6 text-lg font-medium text-gray-700">Loading job details...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-16">
      <div class="inline-flex items-center justify-center bg-red-50 dark:bg-red-900/20 p-4 rounded-full">
        <UIcon 
          name="i-heroicons-exclamation-triangle" 
          class="w-16 h-16 text-red-500" 
        />
      </div>
      <h1 class="mt-6 text-2xl font-bold text-gray-900 dark:text-white">Job Not Found</h1>
      <p class="mt-3 text-gray-600 dark:text-gray-300 max-w-md mx-auto">
        {{ error }}
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

    <!-- Job Application Form -->
    <div v-else-if="job" class="max-w-3xl mx-auto">
      <!-- Job Header -->
      <div class="mb-8 text-center">
        <UBadge 
          v-if="job.type"
          :label="job.type" 
          color="primary"
          variant="subtle"
          size="lg"
          class="mb-4"
        />
        <h1 class="text-4xl font-bold text-gray-900 dark:text-white">
          {{ job.title }}
        </h1>
        <div class="mt-4 flex items-center justify-center gap-4 text-gray-600 dark:text-gray-300">
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

      <!-- Application Form -->
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
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
              Application Form
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
                :disabled="isSubmitting"
              />
            </div>
          </FormKit>

          <div 
            v-if="submissionError" 
            class="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400 text-sm"
          >
            <div class="flex items-start gap-2">
              <UIcon name="i-heroicons-exclamation-circle" class="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{{ submissionError }}</span>
            </div>
          </div>
          
        </div>
      </UCard>
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