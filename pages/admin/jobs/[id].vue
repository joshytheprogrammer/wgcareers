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
    navigateTo('/admin/dashboard')
  } catch (err) {
    error.value = 'Save failed: ' + err.message
  }
}

function addRequirement() {
  if (requirementInput.value.trim()) {
    job.value.requirements = [...(job.value.requirements || []), requirementInput.value.trim()]
    requirementInput.value = ''
  }
}

function addBenefit() {
  if (benefitInput.value.trim()) {
    job.value.benefits = [...(job.value.benefits || []), benefitInput.value.trim()]
    benefitInput.value = ''
  }
}

function removeItem(array, index) {
  return array.filter((_, i) => i !== index)
}
</script>

<template>
  <UContainer class="py-8">
    <UButton
      to="/admin/dashboard"
      icon="i-heroicons-arrow-left"
      variant="ghost"
      color="gray"
      class="mb-6"
    >
      Back to Dashboard
    </UButton>

    <UCard>
      <template #header>
        <h2 class="text-xl font-semibold">
          {{ route.params.id === 'new' ? 'Create New' : 'Edit' }} Job Listing
        </h2>
      </template>

      <form @submit.prevent="handleSave" class="space-y-6">
        <UFormField label="Job Title" required>
          <UInput v-model="job.title" />
        </UFormField>

        <UFormField label="Company" required>
          <UInput v-model="job.company" />
        </UFormField>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField label="Location" required>
            <UInput v-model="job.location" />
          </UFormField>
          
          <UFormField label="Job Type" required>
            <USelect
              v-model="job.type"
              :items="['Full-time', 'Part-time', 'Contract']"
            />
          </UFormField>
        </div>

        <UFormField label="Salary Range">
          <UInput v-model="job.salary" placeholder="₦" />
        </UFormField>

        <UFormField label="Description Snippet">
          <UTextarea v-model="job.description_snippet" />
        </UFormField>

        <UFormField label="Full Description">
          <EditorAdminEditor v-model="job.description_html" />
        </UFormField>

        <UFormField label="Requirements">
          <div class="flex gap-2">
            <UInput v-model="requirementInput" placeholder="Add requirement" />
            <UButton
              @click.prevent="addRequirement"
              icon="i-heroicons-plus"
              variant="solid"
              color="primary"
            />
          </div>
          <ul class="mt-2 space-y-1">
            <li
              v-for="(req, index) in job.requirements"
              :key="index"
              class="flex items-center justify-between p-2 bg-gray-50 rounded"
            >
              <span>{{ req }}</span>
              <UButton
                @click="job.requirements = removeItem(job.requirements, index)"
                icon="i-heroicons-x-mark"
                color="red"
                variant="ghost"
                size="xs"
              />
            </li>
          </ul>
        </UFormField>

        <UFormField label="Benefits">
          <div class="flex gap-2">
            <UInput v-model="benefitInput" placeholder="Add benefit" />
            <UButton
              @click.prevent="addBenefit"
              icon="i-heroicons-plus"
              variant="solid"
              color="primary"
            />
          </div>
          <ul class="mt-2 space-y-1">
            <li
              v-for="(benefit, index) in job.benefits"
              :key="'benefit-'+index"
              class="flex items-center justify-between p-2 bg-gray-50 rounded"
            >
              <span>{{ benefit }}</span>
              <UButton
                @click="job.benefits = removeItem(job.benefits, index)"
                icon="i-heroicons-x-mark"
                color="red"
                variant="ghost"
                size="xs"
              />
            </li>
          </ul>
        </UFormField>

        <UFormField label="Application Instructions">
          <EditorAdminEditor v-model="job.application_instructions_html" />
        </UFormField>

        <div class="flex justify-end">
          <UButton
            type="submit"
            color="primary"
            icon="i-heroicons-check"
            :label="route.params.id === 'new' ? 'Create Job' : 'Update Job'"
          />
        </div>

        <UAlert
          v-if="error"
          icon="i-heroicons-exclamation-triangle"
          color="red"
          variant="solid"
          :title="error"
        />
      </form>
    </UCard>
  </UContainer>
</template>