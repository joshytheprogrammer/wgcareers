<script setup>
import { signOut } from 'firebase/auth'
import { collection, deleteDoc, doc, onSnapshot } from 'firebase/firestore'
const auth = useFirebaseAuth()
const db = useFirestore()

const jobs = ref([])
const error = ref('')

// Realtime jobs listener
onMounted(() => {
  const unsubscribe = onSnapshot(collection(db, 'jobs'), (snapshot) => {
    jobs.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  }, (err) => {
    error.value = err.message
  })

  return () => unsubscribe()
})

async function deleteJob(id) {
  try {
    await deleteDoc(doc(db, 'jobs', id))
  } catch (err) {
    error.value = 'Delete failed: ' + err.message
  }
}

async function handleLogout() {
  await signOut(auth)
  navigateTo('/')
}
</script>

<template>
  <div class="container mx-auto p-4">
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-2xl font-bold">Job Listings Admin</h1>
      <div class="space-x-4">
        <NuxtLink to="/admin/jobs/new" class="bg-green-600 text-white px-4 py-2 rounded">
          Add New Job
        </NuxtLink>
        <button 
          @click="handleLogout" 
          class="bg-gray-600 text-white px-4 py-2 rounded"
        >
          Logout
        </button>
      </div>
    </div>

    <div class="grid gap-4">
      <div v-for="job in jobs" :key="job.id" class="bg-white p-4 rounded shadow">
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-xl font-semibold">{{ job.title }}</h2>
            <p class="text-gray-600">{{ job.location }} • {{ job.type }}</p>
            <p class="text-gray-700">{{ job.description_snippet }}</p>
          </div>
          <div class="space-x-2">
            <NuxtLink 
              :to="`/admin/jobs/${job.id}`"
              class="bg-blue-600 text-white px-3 py-1 rounded"
            >
              Edit
            </NuxtLink>
            <button 
              @click="deleteJob(job.id)"
              class="bg-red-600 text-white px-3 py-1 rounded"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>