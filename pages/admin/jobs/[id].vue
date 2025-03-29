<script setup>
import { doc, getDoc, setDoc, collection } from 'firebase/firestore'
const db = useFirestore()
const route = useRoute()

const job = ref({
  title: '',
  company: 'Walls and Gates', // Added company field
  location: '',
  type: 'Full-time',
  description_snippet: '',
  description_html: '', // HTML formatted description
  salary: '', // Added salary field
  requirements: [],
  benefits: [], // Added benefits array
  application_instructions_html: '', // HTML formatted instructions
  created_at: new Date(),
  slug: ''
})

const requirementInput = ref('')
const benefitInput = ref('') // Added benefit input
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
    // Generate slug
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

// Added benefit management functions
function addBenefit() {
  if (benefitInput.value.trim()) {
    job.value.benefits = [...(job.value.benefits || []), benefitInput.value.trim()]
    benefitInput.value = ''
  }
}

function removeBenefit(index) {
  job.value.benefits = job.value.benefits.filter((_, i) => i !== index)
}
</script>

<template>
  <div class="container mx-auto p-4">
    <NuxtLink to="/admin/dashboard" class="block mb-8 text-blue-600">
      ← Back to Dashboard
    </NuxtLink>

    <form @submit.prevent="handleSave" class="space-y-6 max-w-3xl">
      <div class="space-y-2">
        <label class="block font-semibold">Job Title</label>
        <input v-model="job.title" required class="w-full p-2 border rounded">
      </div>

      <div class="space-y-2">
        <label class="block font-semibold">Company</label>
        <input v-model="job.company" required class="w-full p-2 border rounded">
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <label class="block font-semibold">Location</label>
          <input v-model="job.location" required class="w-full p-2 border rounded">
        </div>
        
        <div class="space-y-2">
          <label class="block font-semibold">Job Type</label>
          <select v-model="job.type" class="w-full p-2 border rounded">
            <option>Full-time</option>
            <option>Part-time</option>
            <option>Contract</option>
          </select>
        </div>
      </div>

      <div class="space-y-2">
        <label class="block font-semibold">Salary Range</label>
        <input v-model="job.salary" class="w-full p-2 border rounded">
      </div>

      <div class="space-y-2">
        <label class="block font-semibold">Description Snippet</label>
        <textarea v-model="job.description_snippet" class="w-full p-2 border rounded h-24"></textarea>
      </div>

      <div class="space-y-2">
        <label class="block font-semibold">Full Description (HTML)</label>
        <EditorAdminEditor v-model="job.description_html" />
      </div>

      <div class="space-y-2">
        <label class="block font-semibold">Requirements</label>
        <div class="flex gap-2">
          <input v-model="requirementInput" class="flex-1 p-2 border rounded">
          <button @click.prevent="addRequirement" class="bg-gray-200 px-4 py-2 rounded">
            Add
          </button>
        </div>
        <ul class="list-disc pl-6">
          <li v-for="(req, index) in job.requirements" :key="index" class="flex justify-between items-center">
            {{ req }}
            <button 
              @click="job.requirements = job.requirements.filter((_, i) => i !== index)"
              class="text-red-500"
            >
              ×
            </button>
          </li>
        </ul>
      </div>

      <!-- Added Benefits Section -->
      <div class="space-y-2">
        <label class="block font-semibold">Benefits</label>
        <div class="flex gap-2">
          <input v-model="benefitInput" class="flex-1 p-2 border rounded" placeholder="Add benefit (e.g., Health insurance)">
          <button @click.prevent="addBenefit" class="bg-gray-200 px-4 py-2 rounded">
            Add
          </button>
        </div>
        <ul class="list-disc pl-6">
          <li v-for="(benefit, index) in job.benefits" :key="'benefit-'+index" class="flex justify-between items-center">
            {{ benefit }}
            <button 
              @click="removeBenefit(index)"
              class="text-red-500"
            >
              ×
            </button>
          </li>
        </ul>
      </div>

      <div class="space-y-2">
        <label class="block font-semibold">Application Instructions (HTML)</label>
        <EditorAdminEditor v-model="job.application_instructions_html" />
      </div>

      <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded">
        Save Job
      </button>

      <div v-if="error" class="text-red-500 p-2 bg-red-100 rounded">
        {{ error }}
      </div>
    </form>
  </div>
</template>