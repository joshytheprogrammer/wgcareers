<script setup>
import { collection, query, where, getDocs } from 'firebase/firestore'
const db = useFirestore()
const route = useRoute()

const job = ref(null)
const error = ref('')
const loading = ref(true)

onMounted(async () => {
  try {
    const q = query(
      collection(db, 'jobs'),
      where('slug', '==', route.params.slug)
    )
    
    const querySnapshot = await getDocs(q)
    
    if (!querySnapshot.empty) {
      // Get the first matching document (assuming slugs are unique)
      const doc = querySnapshot.docs[0]
      job.value = { id: doc.id, ...doc.data() }
    } else {
      error.value = 'Job not found'
    }
  } catch (err) {
    error.value = 'Error loading job: ' + err.message
  } finally {
    loading.value = false
  }
});
</script>

<template>
  <div v-if="job" class="max-w-3xl mx-auto px-4 py-8">
    <NuxtLink to="/" class="mb-8 inline-block text-blue-600 hover:text-blue-800">
      ← Back to Listings
    </NuxtLink>
    <div class="bg-white p-6 rounded-lg shadow">
      <h1 class="text-3xl font-bold mb-4">{{ job.title }}</h1>
      <div class="space-y-2 mb-6">
        <p class="text-gray-600">{{ job.company }}</p>
        <p class="text-gray-600">{{ job.location }} • {{ job.type }}</p>
        <p v-if="job.salary" class="font-semibold">Salary: {{ job.salary }}</p>
      </div>
      
      <div class="space-y-6">
        <div>
          <h2 class="text-xl font-semibold mb-2">Description</h2>
          <div class="text-gray-700 leading-6 list-disc editor-div" v-html="job.description_html"></div>
        </div>
        
        <div v-if="job.requirements">
          <h2 class="text-xl font-semibold mb-2">Requirements</h2>
          <ul class="list-disc pl-6 space-y-2">
            <li v-for="(req, index) in job.requirements" :key="index">{{ req }}</li>
          </ul>
        </div>

        <div v-if="job.benefits">
          <h2 class="text-xl font-semibold mb-2">Benefits</h2>
          <ul class="list-disc pl-6 space-y-2">
            <li v-for="(benefit, index) in job.benefits" :key="index">{{ benefit }}</li>
          </ul>
        </div>

        <div>
          <h2 class="text-xl font-semibold mb-2">How to Apply</h2>
          <div class="prose-sm text-gray-700 whitespace-pre-wrap editor-div" v-html="job.application_instructions_html"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.editor-div p {
  padding: 5px 0;
}

.editor-div a {
  text-decoration: underline;
  color: rgb(0, 0, 131);
}
</style>