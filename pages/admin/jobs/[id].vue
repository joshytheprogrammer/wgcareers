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
  <UContainer class="max-w-3xl mx-auto py-8">
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
          <UInput class="w-full" size="xl" v-model="job.title" />
        </UFormField>

        <UFormField label="Company" required>
          <UInput class="w-full" size="xl" v-model="job.company" />
        </UFormField>

        <UFormField label="Location" required>
          <UInput class="w-full" size="xl" v-model="job.location" />
        </UFormField>
          
        <UFormField label="Job Type" required>
          <USelect
            v-model="job.type"
            :items="['Full-time', 'Part-time', 'Contract', 'Intern']"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Salary Range">
          <UInput class="w-full" size="xl" v-model="job.salary" placeholder="₦" />
        </UFormField>

        <UFormField label="Description Snippet">
          <UTextarea class="w-full" autoresize v-model="job.description_snippet" />
        </UFormField>

        <UFormField label="Full Description">
          <EditorAdminEditor v-model="job.description_html" />
        </UFormField>

        <UFormField label="Requirements">
          <div class="flex gap-1">
            <UInput class="w-full" size="xl" v-model="requirementInput" placeholder="Add requirement" />
            <UButton
              @click.prevent="addRequirement"
              icon="i-heroicons-plus"
              variant="solid"
              color="primary"
            />
          </div>
          <div class="space-x-2 space-y-1 py-2">
            <UBadge 
            size="lg"
            v-for="(requirement, index) in job.requirements"
            :key="'requirement-'+index"
            >
              {{ requirement }}

              <UButton
                @click="job.requirements = removeItem(job.requirements, index)"
                icon="i-lucide-badge-x"
                class="cursor-pointer w-fit hover:text-red-300 text-base ml-2"
              />
            </UBadge>
          </div>
        </UFormField>

        <UFormField label="Benefits">
          <div class="flex gap-1">
            <UInput class="w-full" size="xl" v-model="benefitInput" @keypress.enter="addBenefit" placeholder="Add benefit" />
            <UButton
              @click.prevent="addBenefit"
              icon="i-heroicons-plus"
              variant="solid"
              color="primary"
            />
          </div>
          <div class="space-x-2 space-y-1 py-2">
            <UBadge 
            size="lg"
            v-for="(benefit, index) in job.benefits"
            :key="'benefit-'+index"
            >
              {{ benefit }}

              <UButton
                @click="job.benefits = removeItem(job.benefits, index)"
                icon="i-lucide-badge-x"
                class="cursor-pointer w-fit hover:text-red-300 text-base ml-2"
              />

              <!-- <UButton class="cursor-pointer flex hover:text-red-300 justify-center items-center ">
                <UIcon name="" class="size-10" />
              </UButton> -->
            </UBadge>
          </div>
          
        </UFormField>

        <UFormField label="Application Instructions">
          <EditorAdminEditor v-model="job.application_instructions_html" />
        </UFormField>

        <div class="flex justify-end">
          <UButton
            @click.prevent="handleSave"
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