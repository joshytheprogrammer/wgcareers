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
  <UContainer class="py-8">
    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-12 h-12 mx-auto animate-spin" />
      <p class="mt-4">Loading job details...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-12">
      <UIcon name="i-heroicons-exclamation-triangle" class="w-12 h-12 mx-auto text-red-500" />
      <h1 class="text-xl font-bold mt-4">Job Not Found</h1>
      <p class="text-gray-600 mt-2">{{ error }}</p>
      <UButton to="/" label="Browse Jobs" class="mt-4" />
    </div>

    <!-- Job Application Form -->
    <div v-else-if="job" class="max-w-4xl mx-auto">
      <!-- Job Header -->
      <div class="mb-8 text-center">
        <h1 class="text-3xl font-bold">{{ job.title }}</h1>
        <p class="text-gray-600 mt-2">{{ job.company }} • {{ job.location }}</p>
      </div>

      <!-- Application Form -->
      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">Application Form</h2>
          <p v-if="job.formSchema?.description" class="text-sm text-gray-500 mt-1">
            {{ job.formSchema.description }}
          </p>
        </template>

        <FormKit
          type="form"
          @submit="submitApplication"
          :actions="false"
        >
          <FormKitSchema 
            v-if="job.formKitSchema"
            :schema="job.formKitSchema" 
          />

          <div class="mt-6 flex justify-end">
            <UButton
              type="submit"
              label="Submit Application"
              :loading="isSubmitting"
              icon="i-heroicons-paper-airplane"
            />
          </div>
        </FormKit>

        <div v-if="submissionError" class="mt-4 text-red-500 text-sm">
          {{ submissionError }}
        </div>
      </UCard>
    </div>
  </UContainer>
</template>