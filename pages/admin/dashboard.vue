<script setup>
import { signOut } from 'firebase/auth'
import { collection, deleteDoc, doc, onSnapshot, getDocs } from 'firebase/firestore'
const auth = useFirebaseAuth()
const db = useFirestore()

const jobs = ref([])
const submissionsCount = ref({})
const error = ref('')
const isLoading = ref(true)
const searchQuery = ref('')

// Realtime jobs listener
onMounted(() => {
  const unsubscribe = onSnapshot(collection(db, 'jobs'), async (snapshot) => {
    jobs.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    await fetchSubmissionCounts()
    isLoading.value = false
  }, (err) => {
    error.value = err.message
    isLoading.value = false
  })

  return () => unsubscribe()
})

async function fetchSubmissionCounts() {
  const counts = {}
  for (const job of jobs.value) {
    const submissions = await getDocs(collection(db, 'jobs', job.id, 'submissions'))
    counts[job.id] = submissions.size
  }
  submissionsCount.value = counts
}

const filteredJobs = computed(() => {
  if (!searchQuery.value) return jobs.value
  
  const query = searchQuery.value.toLowerCase()
  return jobs.value.filter(job => 
    job.title.toLowerCase().includes(query) ||
    job.location.toLowerCase().includes(query) ||
    job.type.toLowerCase().includes(query) ||
    job.description_snippet.toLowerCase().includes(query)
  )
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

function confirmDelete(job) {
  const isConfirmed = confirm(`Delete "${job.title}" position?`)
  if (isConfirmed) deleteJob(job.id)
}
</script>

<template>
  <UContainer class="py-8">
    <!-- Header Section -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Job Listings Dashboard</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">
          Manage all current job postings
        </p>
      </div>
      
      <div class="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <UInput
          v-model="searchQuery"
          placeholder="Search jobs..."
          icon="i-heroicons-magnifying-glass"
          class="flex-1 min-w-[250px]"
        />
        <div class="flex gap-3">
          <UButton
            to="/admin/jobs/new"
            icon="i-heroicons-plus"
            label="Add Job"
            color="primary"
          />
          <UButton
            @click="handleLogout"
            icon="i-heroicons-arrow-left-on-rectangle"
            label="Logout"
            color="gray"
            variant="outline"
          />
        </div>
      </div>
    </div>

    <!-- Error Alert -->
    <UAlert
      v-if="error"
      icon="i-heroicons-exclamation-triangle"
      color="red"
      variant="solid"
      :title="error"
      class="mb-6"
    />

    <!-- Loading State -->
    <div v-if="isLoading" class="space-y-4">
      <USkeleton class="h-20 w-full" v-for="i in 3" :key="i" />
    </div>

    <!-- Empty State -->
    <UCard v-else-if="!filteredJobs.length">
      <template #header>
        <h3 class="text-lg font-medium text-center">
          {{ searchQuery ? 'No matching jobs found' : 'No jobs posted yet' }}
        </h3>
      </template>
      <div class="text-center text-gray-500 dark:text-gray-400">
        <p v-if="searchQuery">Try adjusting your search query</p>
        <p v-else>Create your first job posting using the "Add Job" button</p>
      </div>
    </UCard>

    <!-- Jobs List -->
    <div v-else class="space-y-4">
      <UCard
        v-for="job in filteredJobs"
        :key="job.id"
        class="hover:shadow-lg transition-shadow"
      >
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="space-y-2 flex-1">
            <div class="flex items-center gap-2">
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ job.title }}
              </h2>
              <UBadge :label="job.type" size="sm" />
            </div>
            
            <div class="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
              <div class="flex items-center gap-1">
                <UIcon name="i-heroicons-building-office" class="w-4 h-4" />
                <span>{{ job.company }}</span>
              </div>
              <div class="flex items-center gap-1">
                <UIcon name="i-heroicons-map-pin" class="w-4 h-4" />
                <span>{{ job.location }}</span>
              </div>
            </div>
            
            <p class="text-gray-600 dark:text-gray-300 line-clamp-2">
              {{ job.description_snippet }}
            </p>
          </div>

          <div class="flex gap-2">
              <UTooltip text="View applications">
                <UButton
                  :to="`/admin/jobs/${job.id}/applications`"
                  icon="i-heroicons-document-text"
                  color="primary"
                  :label="submissionsCount[job.id] || '0'"
                />
            </UTooltip>
            <UButton
              :to="`/admin/jobs/${job.id}`"
              icon="i-heroicons-pencil"
              label="Edit"
              color="gray"
              variant="outline"
            />
            <UButton
              @click="confirmDelete(job)"
              icon="i-heroicons-trash"
              label="Delete"
              color="red"
              variant="outline"
            />
          </div>
        </div>
      </UCard>
    </div>
  </UContainer>
</template>