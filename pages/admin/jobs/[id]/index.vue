<script setup>
import { doc, getDoc, setDoc, collection } from 'firebase/firestore'
const db = useFirestore()
const route = useRoute()

const job = ref({
  title: '',
  company: 'Walls and Gates',
  location: '',
  type: 'Full-time',
  description_snippet: '',
  description_html: '',
  salary: '',
  requirements: [],
  benefits: [],
  application_instructions_html: '',
  created_at: new Date(),
  slug: ''
})

const requirementInput = ref('')
const benefitInput = ref('')
const error = ref('')
const isLoading = ref(false)

// Fetch existing job
if (route.params.id !== 'new') {
  getDoc(doc(db, 'jobs', route.params.id))
    .then((snapshot) => {
      if (snapshot.exists()) {
        job.value = { id: snapshot.id, ...snapshot.data() }
      }
    })
    .catch(err => error.value = err.message)
}

async function handleSave() {
  try {
    isLoading.value = true
    error.value = ''
    
    job.value.slug = job.value.title
      .toLowerCase()
      .replace(/ /g, '-')
      .replace(/[^\w-]+/g, '')

    if (route.params.id === 'new') {
      const newDocRef = doc(collection(db, 'jobs'))
      await setDoc(newDocRef, job.value)
    } else {
      await setDoc(doc(db, 'jobs', route.params.id), job.value, { merge: true })
    }
    
    await navigateTo('/admin/dashboard')
  } catch (err) {
    error.value = 'Save failed: ' + err.message
  } finally {
    isLoading.value = false
  }
}

function addItem(arrayRef, inputRef) {
  if (inputRef.value.trim()) {
    arrayRef.value = [...arrayRef.value, inputRef.value.trim()]
    inputRef.value = ''
  }
}

function removeItem(array, index) {
  return array.filter((_, i) => i !== index)
}
</script>

<template>
  <UContainer class="max-w-3xl mx-auto py-8">
    <UButton
      to="/admin/dashboard"
      icon="i-heroicons-arrow-left"
      variant="ghost"
      color="gray"
      class="mb-6"
      :disabled="isLoading"
    >
      Back to Dashboard
    </UButton>

    <UCard>
      <template #header>
        <div class="flex justify-between">
          <div class="flex items-center gap-3">
            <UIcon 
              name="i-heroicons-briefcase" 
              class="w-6 h-6 text-primary-500" 
            />
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              {{ route.params.id === 'new' ? 'Create New' : 'Edit' }} Job Listing
            </h2>
          </div>
          <div class="items-center">
            <UButton
              v-if="route.params.id != 'new'"
              :to="`/admin/jobs/${route.params.id}/form-builder`"
              trailing-icon="i-heroicons-arrow-right"
              color="primary"
              :disabled="isLoading"
            >
              Form Builder
            </UButton>
          </div>
        </div>
      </template>

      <form @submit.prevent="handleSave" class="space-y-6">
        <!-- Basic Information Section -->
          <UFormField label="Job Title" required>
            <UInput class="w-full" 
              v-model="job.title" 
              placeholder="e.g. Senior Software Engineer"
              icon="i-heroicons-tag"
              size="lg"
            />
          </UFormField>

          <UFormField label="Company" required>
            <UInput class="w-full" 
              v-model="job.company" 
              icon="i-heroicons-building-office"
              size="lg"
            />
          </UFormField>

          <UFormField label="Location" required>
            <UInput class="w-full" 
              v-model="job.location" 
              placeholder="e.g. Lagos, Nigeria"
              icon="i-heroicons-map-pin"
              size="lg"
            />
          </UFormField>

          <UFormField label="Job Type" required>
            <USelect
              v-model="job.type"
              :items="['Full-time', 'Part-time', 'Contract', 'Intern']"
              icon="i-heroicons-clock"
              size="lg"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Salary Range (₦)">
            <UInput class="w-full" 
              v-model="job.salary" 
              placeholder="e.g. ₦500,000 - ₦800,000"
              icon="i-heroicons-currency-dollar"
              size="lg"
            />
          </UFormField>

        <!-- Description Section -->
        <UFormField label="Description Snippet">
          <UTextarea 
            v-model="job.description_snippet" 
            class="w-full"
            placeholder="Brief summary visible in listings"
            autoresize
          />
        </UFormField>

        <UFormField label="Full Description">
          <EditorAdminEditor v-model="job.description_html" />
        </UFormField>

        <!-- Requirements Section -->
        <UFormField label="Requirements">
          <div class="flex gap-2">
            <UInput class="w-full" 
              v-model="requirementInput" 
              placeholder="Add requirement (press Enter to add)"
              @keyup.enter="addItem(job.requirements, requirementInput)"
              size="lg"
            />
            <UButton
              @click="addItem(job.requirements, requirementInput)"
              icon="i-heroicons-plus"
              color="primary"
            />
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <UBadge
              v-for="(req, index) in job.requirements"
              :key="'req-'+index"
              color="primary"
              variant="subtle"
              size="lg"
            >
              <span class="flex items-center gap-1.5">
                {{ req }}
                <UButton
                  @click="job.requirements = removeItem(job.requirements, index)"
                  icon="i-heroicons-x-mark"
                  color="gray"
                  variant="link"
                  :padded="false"
                  class="hover:text-red-500"
                />
              </span>
            </UBadge>
          </div>
        </UFormField>

        <!-- Benefits Section -->
        <UFormField label="Benefits">
          <div class="flex gap-2">
            <UInput class="w-full" 
              v-model="benefitInput" 
              placeholder="Add benefit (press Enter to add)"
              @keyup.enter="addItem(job.benefits, benefitInput)"
              size="lg"
            />
            <UButton
              @click="addItem(job.benefits, benefitInput)"
              icon="i-heroicons-plus"
              color="primary"
            />
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <UBadge
              v-for="(benefit, index) in job.benefits"
              :key="'benefit-'+index"
              color="primary"
              variant="subtle"
              size="lg"
            >
              <span class="flex items-center gap-1.5">
                {{ benefit }}
                <UButton
                  @click="job.benefits = removeItem(job.benefits, index)"
                  icon="i-heroicons-x-mark"
                  color="gray"
                  variant="link"
                  :padded="false"
                  class="hover:text-red-500"
                />
              </span>
            </UBadge>
          </div>
        </UFormField>

        <!-- Application Section -->
        <UFormField label="Application Instructions">
          <EditorAdminEditor v-model="job.application_instructions_html" />
        </UFormField>

        <!-- Form Actions -->
        <div class="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-800">
          <UButton
            to="/admin/dashboard"
            variant="ghost"
            color="gray"
            label="Cancel"
            :disabled="isLoading"
          />
          
          <UButton
            type="submit"
            :loading="isLoading"
            :label="route.params.id === 'new' ? 'Create Job' : 'Save Changes'"
            icon="i-heroicons-check"
            color="primary"
            size="lg"
          />
        </div>

        <!-- Error Display -->
        <UAlert
          v-if="error"
          icon="i-heroicons-exclamation-triangle"
          color="red"
          variant="subtle"
          :title="error"
          class="mt-4"
        />
      </form>
    </UCard>
  </UContainer>
</template>