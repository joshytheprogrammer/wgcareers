<script setup>
import { useFirestore } from 'vuefire'
import { collection, query, getDoc, doc, updateDoc, onSnapshot, orderBy } from 'firebase/firestore'
import { saveAs } from 'file-saver'

const db = useFirestore()
const route = useRoute()
const toast = useToast()

const VueApexCharts = shallowRef(null)

// PDF Generation
const isGenerating = ref(false);

// State
const job = ref(null)
const submissions = ref([])
const loading = ref(true)
const error = ref(null)
const activeTab = ref('0')
const items = [{ label: 'Responses', slot: 'responses' }, { label: 'Analytics', slot: 'analytics' }, ]

const selectedSubmission = ref(null)
const individualView = ref(true) // 'individual'(true) or 'question'(false)
const filters = ref({
  status: 'all',
  dateRange: null,
  search: ''
})

const analytics = ref({
  statusDistribution: {},
  timelineData: [],
  demographicData: {}
})

const statusOptions = ['new', 'reviewed', 'interviewed', 'hired', 'rejected']
const selectedSubmissions = ref([])
const bulkActionStatus = ref(statusOptions[0])
const aiAnalysisResult = ref(null)
const analyzing = ref(false)

// Chart Options
const statusChartOptions = computed(() => ({
  chart: { type: 'donut', height: 300 },
  labels: Object.keys(analytics.value.statusDistribution),
  colors: ['#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#9CA3AF'],
  dataLabels: { enabled: true, formatter: (val, opts) => opts.w.globals.labels[opts.seriesIndex] + ": " + val.toFixed(1) + '%' },
  legend: { position: 'bottom' },
  tooltip: { y: { formatter: (val) => `${val} submissions` } },
  plotOptions: { pie: { donut: { labels: { show: true, total: { show: true, label: 'Total', formatter: (w) => w.globals.seriesTotals.reduce((a, b) => a + b, 0) } } } } }
}))

const statusChartSeries = computed(() => Object.values(analytics.value.statusDistribution))

const timelineChartOptions = computed(() => ({
  chart: { id: 'submission-timeline', type: 'area', height: 300, toolbar: { show: false } },
  xaxis: {
    type: 'datetime',
    labels: { datetimeUTC: false, format: 'dd MMM yy' }
  },
  yaxis: { title: { text: 'Submissions' } },
  tooltip: { x: { format: 'dd MMM yyyy' } },
  dataLabels: { enabled: false },
  stroke: { curve: 'smooth' },
  fill: {
    type: "gradient",
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.7,
      opacityTo: 0.9,
      stops: [0, 90, 100]
    }
  },
}))

const timelineChartSeries = computed(() => [{
  name: 'Submissions',
  data: analytics.value.timelineData.sort((a, b) => new Date(a.x) - new Date(b.x))
}])

// Helper functions
const getFieldLabel = (fieldId) => {
  return job.value?.formSchema?.fields?.find(f => f.id === fieldId)?.label || fieldId
}

const formatDisplayValue = (value) => {
  if (value === null || value === undefined) return 'N/A'
  if (typeof value === 'object' && value.toDate) return value.toDate().toLocaleString()
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

// --- Firestore Listener Variable ---
let unsubscribe = null // Declare unsubscribe variable in the setup scope

// --- Lifecycle Hooks ---
onMounted(async () => {
  // Dynamically import heavy libraries
  try {
    const apexModule = await import('vue3-apexcharts')
    VueApexCharts.value = apexModule.default
  } catch (e) {
      console.error("Failed to load dynamic libraries:", e);
      // Handle error loading libraries if necessary
  }


  // Fetch Firestore Data
  loading.value = true; // Ensure loading is true at the start
  error.value = null;
  try {
    const jobId = route.params.id;
    if (!jobId) throw new Error("Job ID missing.");

    const jobDocRef = doc(db, 'jobs', jobId);
    const jobDocSnap = await getDoc(jobDocRef);

    if (!jobDocSnap.exists()) throw new Error(`Job ${jobId} not found.`);
    job.value = { id: jobDocSnap.id, ...jobDocSnap.data() };
    // Validate formSchema structure needed for dynamic rendering
    if (!job.value.formSchema || !Array.isArray(job.value.formSchema.fields)) {
        console.warn("Job data missing valid formSchema.fields array.");
        // Provide a default empty structure if needed
        job.value.formSchema = { fields: [], ...(job.value.formSchema || {}) };
    }


    const submissionsQuery = query(
      collection(db, 'jobs', jobId, 'submissions'),
      orderBy('submittedAt', 'desc') // Order by latest first
    );

    // Assign the listener cleanup function to the variable declared outside
    unsubscribe = onSnapshot(submissionsQuery, (snapshot) => {
      submissions.value = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        // Ensure submittedAtDate is consistently a Date object or null
        submittedAtDate: d.data().submittedAt?.toDate ? d.data().submittedAt.toDate() : null
      }));
      calculateAnalytics(); // Recalculate analytics whenever submissions change
      loading.value = false; // Set loading false after first successful data load
    }, (err) => {
      console.error("Firestore snapshot error:", err);
      error.value = `Failed to load submissions: ${err.message}`;
      toast.add({ title: 'Error Loading Submissions', description: error.value, color: 'red' });
      loading.value = false; // Also stop loading on error
      if (unsubscribe) unsubscribe(); // Attempt to clean up listener on error if it exists
      unsubscribe = null;
    });

  } catch (err) {
    console.error("Error in onMounted:", err);
    error.value = `Failed to initialize: ${err.message}`;
    toast.add({ title: 'Initialization Error', description: error.value, color: 'red' });
    loading.value = false;
    // Ensure unsubscribe is null if initialization failed before listener setup
    if (unsubscribe) unsubscribe();
    unsubscribe = null;
  }
});

onUnmounted(() => {
  // Call the stored unsubscribe function when component is removed
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null; // Clear the reference
  }
});

// Analytics calculations
const calculateAnalytics = () => {
  const statusCounts = statusOptions.reduce((acc, status) => { acc[status] = 0; return acc }, {})
  const timelineMap = {}

  submissions.value.forEach(sub => {
    const currentStatus = sub.status || 'new'
    statusCounts[currentStatus] = (statusCounts[currentStatus] || 0) + 1

    if (sub.submittedAtDate) {
      const dateStr = sub.submittedAtDate.toISOString().split('T')[0]
      timelineMap[dateStr] = (timelineMap[dateStr] || 0) + 1
    }
  })

  analytics.value.statusDistribution = statusCounts
  analytics.value.timelineData = Object.entries(timelineMap).map(([date, count]) => ({
    x: new Date(date).getTime(),
    y: count
  }))
}

// Filtered submissions - Refined Logic
const filteredSubmissions = computed(() => {
  // Guard clause: If submissions haven't loaded yet, return empty array
  if (!submissions.value || submissions.value.length === 0) {
    return [];
  }

  return submissions.value.filter(sub => {
    // 1. Status Filter: Compare lowercase values for safety, handle null/undefined status
    const submissionStatus = sub.status ? String(sub.status).toLowerCase() : null; // Normalize status
    const filterStatus = filters.value.status ? String(filters.value.status).toLowerCase() : 'all'; // Normalize filter
    const matchesStatus = filterStatus === 'all' || submissionStatus === filterStatus;

    // 2. Search Filter: Ensure search term exists and search within stringified formData
    let matchesSearch = true; // Default to true if no search term
    if (filters.value.search) {
      const searchTerm = filters.value.search.toLowerCase();
      try {
        // Only search if formData exists
        matchesSearch = sub.formData ? JSON.stringify(sub.formData).toLowerCase().includes(searchTerm) : false;
      } catch (e) {
        console.warn("Error stringifying formData for search:", e);
        matchesSearch = false; // Exclude if error occurs
      }
    }

    // 3. Date Range Filter: Ensure dates are valid and comparison is correct
    let matchesDate = true; // Default to true if no date range selected
    const range = filters.value.dateRange;
    if (range && range.start && range.end && sub.submittedAtDate instanceof Date) {
        // Check if range start/end are valid dates before creating new Date objects
        const startDate = new Date(range.start);
        const endDate = new Date(range.end);
        if (!isNaN(startDate) && !isNaN(endDate)) {
            const subTime = sub.submittedAtDate.getTime();
            const startTime = startDate.setHours(0, 0, 0, 0); // Start of the selected day
            const endTime = endDate.setHours(23, 59, 59, 999); // End of the selected day
            matchesDate = subTime >= startTime && subTime <= endTime;
        } else {
             matchesDate = false; // Invalid date range provided
        }
    } else if (range && range.start && range.end && !(sub.submittedAtDate instanceof Date)) {
         matchesDate = false; // Exclude submissions without a valid date if range is set
    }

    // Combine all filters
    return matchesStatus && matchesSearch && matchesDate;
  });
});

// Update submission status
const updateStatus = async (submissionId, newStatus) => {
  try {
    await updateDoc(doc(db, 'jobs', route.params.id, 'submissions', submissionId), {
      status: newStatus
    })
    toast.add({ title: 'Status updated', color: 'green', timeout: 2000 })
  } catch (error) {
    toast.add({ title: 'Error updating status', description: error.message, color: 'red' })
  }
}

// CSV Export
const exportCSV = () => {
  if (!job.value?.formSchema?.fields || filteredSubmissions.value.length === 0) {
    toast.add({ 
      title: 'Cannot Export', 
      description: 'No form schema found or no submissions to export.', 
      color: 'orange' 
    })
    return
  }

  // Extract dynamic headers from all submissions to ensure completeness
  const dynamicFields = new Set(job.value.formSchema.fields.map(f => f.id))

  filteredSubmissions.value.forEach(sub => {
    if (sub.formData) {
      Object.keys(sub.formData).forEach(fieldId => dynamicFields.add(fieldId))
    }
  })

  const escapeCSVValue = (value) => {
    if (value === null || value === undefined) return ''
    let strValue = String(value).replace(/"/g, '""') // Escape double quotes
    if (strValue.includes(',') || strValue.includes('\n') || strValue.includes('"')) {
      strValue = `"${strValue}"` // Wrap in quotes if needed
    }
    return strValue
  }

  // Escape headers
  const formHeaders = Array.from(dynamicFields).map(fieldId => {
    const field = job.value.formSchema.fields.find(f => f.id === fieldId)
    return escapeCSVValue(field ? (field.label || field.id) : fieldId)
  })

  const standardHeaders = ['Submission ID', 'Status', 'Submitted At'].map(escapeCSVValue)
  const allHeaders = [...standardHeaders, ...formHeaders]

  // Prepare rows
  const rows = filteredSubmissions.value.map(sub => {
    const standardValues = [
      escapeCSVValue(sub.id),
      escapeCSVValue(sub.status || 'N/A'),
      escapeCSVValue(sub.submittedAtDate ? sub.submittedAtDate.toLocaleString() : 'N/A')
    ]

    const formValues = formHeaders.map(header => {
      const fieldId = job.value.formSchema.fields.find(f => f.label === header)?.id || header
      const value = sub.formData ? sub.formData[fieldId] : ''
      return escapeCSVValue(formatDisplayValue(value))
    })

    return [...standardValues, ...formValues]
  })

  // Generate CSV
  const csvContent = [
    allHeaders.join(','), 
    ...rows.map(row => row.join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const jobTitleSanitized = job.value.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  saveAs(blob, `applications_${jobTitleSanitized}_${new Date().toISOString().split('T')[0]}.csv`)
}

const { $pdf } = useNuxtApp();

const initPDF = () => {
  $pdf.new({
    margins: { 
      top: 20, 
      bottom: 20, 
      left: 20, 
      right: 20 
    },
    size: "A4",
    plugins: [
      {
        page: [
          // Footer with centered page numbers
          ({ Text }, context, current, total) => {
            Text(`Page ${current}/${total}`, 
              { 
                fontSize: 10, 
                alignment: 'center' // Added text alignment
              }, 
              {
                x: context.width / 2,
                y: context.height - context.margins.bottom + 10
              }
            );
          },
          // Header with centered title
          ({ Text }, context) => {
            Text(`Application Details - ${job.value?.title || ''}`, 
              { 
                fontSize: 12, 
                bold: true,
                alignment: 'center' // Added text alignment
              }, 
              {
                x: context.width / 2,
                y: context.margins.top // Adjusted position to stay within margins
              }
            );
          }
        ]
      }
    ]
  });
};

const exportSubmissionPDF = async (submission) => {
  isGenerating.value = false;
  
  toast.add({ 
    title: 'PDF Generation Failed', 
    description: 'Please try again or contact support',
    color: 'red',
    timeout: 5000
  });


  // try {
  //   initPDF();
    
  //   // Add main content
  //   $pdf.add([
  //     { 
  //       raw: `Application ID: ${submission.id}`,
  //       text: { fontSize: 16, bold: true, alignment: 'center' } 
  //     },
  //     { raw: '\n' },
  //     { 
  //       raw: `Status: ${submission.status || 'N/A'}`,
  //       text: { fontSize: 14, alignment: 'center' }
  //     },
  //     { raw: '\n\n' }
  //   ]);

  //   // Add form data with optimized structure
  //   const formEntries = Object.entries(submission.formData) // Use submission parameter
  //     .flatMap(([key, value]) => [
  //       {
  //         raw: `${getFieldLabel(key)}: ${formatDisplayValue(value)}`,
  //         text: { fontSize: 12 }
  //       },
  //       { raw: '\n' } // Include newline directly in content
  //     ]);

  //   $pdf.add(formEntries);

  //   // Generate PDF
  //   const result = await $pdf.run({
  //     type: 'client',
  //     clientEmit: 'blob',
  //     colorSchema: 'RGB'
  //   });

  //   if (result) {
  //     console.log(result)
  //     const blobUrl = URL.createObjectURL(result); // Directly use the blob
      
  //     // Preview handling
  //     const iframe = document.getElementById('pdf-preview');
  //     iframe.src = blobUrl;
  //     iframe.classList.remove('hidden');

  //     // Download handling
  //     const a = document.createElement('a');
  //     a.href = blobUrl;
  //     a.download = `application_${submission.id}.pdf`;
  //     document.body.appendChild(a);
  //     a.click();
  //     document.body.removeChild(a);

  //     // Safer URL cleanup
  //     iframe.onload = () => URL.revokeObjectURL(blobUrl);
  //     setTimeout(() => URL.revokeObjectURL(blobUrl), 5000); // Fallback cleanup
  //   }
    
  //   toast.add({ 
  //     title: 'PDF Generated', 
  //     color: 'green',
  //     timeout: 3000
  //   });
    
  // } catch (error) {
  //   console.error('PDF generation error:', error);
  //   toast.add({ 
  //     title: 'PDF Generation Failed', 
  //     description: 'Please try again or contact support',
  //     color: 'red',
  //     timeout: 5000
  //   });
  // } finally {
  //   isGenerating.value = false;
  // }
};

// Helper function for color conversion
function rgbToHex(rgbString) {
  if (!rgbString.includes('rgb')) return '#000000';
  
  const rgb = rgbString.match(/\d+/g);
  return `#${((1 << 24) + (Number(rgb[0]) << 16) + (Number(rgb[1]) << 8) + Number(rgb[2]))
    .toString(16)
    .slice(1)}`;
}

// Bulk Actions
const handleBulkAction = async () => {
  if (selectedSubmissions.value.length === 0) {
    toast.add({ title: 'No submissions selected', color: 'orange', timeout: 3000 })
    return
  }

  try {
    const updates = selectedSubmissions.value.map(submissionId => {
      return updateDoc(doc(db, 'jobs', route.params.id, 'submissions', submissionId), {
        status: bulkActionStatus.value
      })
    })

    await Promise.all(updates)
    toast.add({ title: `Updated ${selectedSubmissions.value.length} submissions`, color: 'green' })
    selectedSubmissions.value = []
  } catch (error) {
    toast.add({ title: 'Bulk update failed', description: error.message, color: 'red' })
  }
}

// AI Analysis Placeholder
const analyzeApplications = async () => {
  if (filteredSubmissions.value.length === 0) {
    toast.add({ title: 'No submissions to analyze', color: 'orange' })
    return
  }
  
  analyzing.value = true
  aiAnalysisResult.value = null
  
  try {
    // This would call your actual API endpoint
    const { data } = await useFetch('/api/ai-analysis', {
      method: 'POST',
      body: {
        jobTitle: job.value?.title,
        submissions: filteredSubmissions.value
      }
    })

    aiAnalysisResult.value = data.value?.summary || "Analysis complete"
    toast.add({ title: 'AI Analysis Complete', color: 'green' })
  } catch (error) {
    toast.add({ title: 'AI Analysis Failed', description: error.message, color: 'red' })
  } finally {
    analyzing.value = false
  }
}

// Group responses by question for question-based view
const questionResponses = computed(() => {
  if (!job.value?.formSchema?.fields) return []
  
  return job.value.formSchema.fields.map(field => {
    return {
      question: field.label || field.id,
      responses: filteredSubmissions.value.map(sub => ({
        id: sub.id,
        value: sub.formData ? formatDisplayValue(sub.formData[field.id]) : 'N/A',
        status: sub.status,
        date: sub.submittedAtDate?.toLocaleDateString() || 'N/A'
      }))
    }
  })
});
</script>

<template>
  <UContainer class="py-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ job?.title || 'Loading...' }} Applications
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {{ submissions.length }} total submission(s)
        </p>
      </div>
      <UButton
        label="Back to Dashboard"
        icon="i-heroicons-arrow-left-circle"
        color="gray"
        variant="ghost"
        to="/admin/dashboard"
      />
    </div>

    <!-- Loading State -->
    <div v-if="loading && submissions.length === 0" class="text-center py-16">
      <UIcon name="i-heroicons-arrow-path" class="w-12 h-12 mx-auto animate-spin text-primary-500" />
      <p class="mt-4 text-lg font-medium text-gray-600 dark:text-gray-300">Loading submissions...</p>
    </div>

    <!-- Error State -->
    <UAlert
      v-else-if="error"
      icon="i-heroicons-exclamation-triangle"
      color="red"
      variant="solid"
      title="Failed to Load Data"
      :description="error"
      class="mb-6"
    />

    <!-- Main Content -->
    <div v-else>
      <UTabs v-model="activeTab" :items="items">
        <!-- Responses Tab -->
        <template #responses>
          <div class="" >
            <!-- View Mode Toggle -->
            <div class="flex justify-between items-center my-4 bg-white py-4 rounded-md">
              <div class="flex items-center">
                <div class="inline-flex items-center cursor-pointer">
            
                  <span class="ml-3 text-black text-xl font-bold">
                    {{ individualView ? 'Applicant View' : 'Question View' }}
                  </span>
                </div>
              </div>
              
              <!-- Filters -->
              <div class="flex items-center gap-2">
                <USwitch
                  v-model="individualView"
                  size="xl"
                />
                <USelectMenu
                  v-model="filters.status"
                  value-key="value"
                  :items="[{ value: 'all', label: 'All' }, ...statusOptions.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))]"
                  placeholder="Status"
                  class="w-28"
                  size="md"
                />
                <UInput
                  v-model="filters.search"
                  icon="i-heroicons-magnifying-glass"
                  placeholder="Search responses..."
                  size="sm"
                />
                <UPopover>
                  <UButton
                    icon="i-heroicons-calendar"
                    label="Date Range"
                    size="sm"
                    color="gray"
                    variant="outline"
                  />
                  <template #panel>
                    <UCalendar v-model="filters.dateRange" mode="range" />
                  </template>
                </UPopover>
              </div>
            </div>

            <!-- Bulk Actions Bar -->
             <!-- If you want to implement this, account for multiple selected submissions. In this case, it is unnecessary -->
            <div v-if="selectedSubmissions.length > 0" class="bg-primary-50 dark:bg-primary-900/20 p-3 rounded-lg mb-4 flex items-center gap-4">
              <span class="text-sm font-medium text-primary-700 dark:text-primary-200">
                {{ selectedSubmissions.length }} selected
              </span>
              <USelectMenu
                v-model="bulkActionStatus"
                :items="statusOptions.map(s => ({ value: s, label: s }))"
                size="xs"
              />
              <UButton
                label="Apply Status"
                size="xs"
                @click="handleBulkAction"
              />
              <UButton
                label="Clear"
                size="xs"
                color="gray"
                variant="ghost"
                @click="selectedSubmissions = []"
              />
            </div>

            <!-- Individual View -->
            <div v-if="individualView">
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Submission List -->
                <div class="space-y-2">
                  <div class="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                    <UCard
                      v-for="submission in filteredSubmissions"
                      :key="submission.id"
                      class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      :class="{ 'border-2 border-black': selectedSubmission?.id === submission.id }"
                      @click="selectedSubmission = submission"
                    >
                      <div class="flex items-center gap-3">
                        <UAvatar :src="submission.formData.avatar" size="sm" />
                        <div class="flex-1 min-w-0">
                          <p class="font-medium truncate">{{ submission.formData.fullName || 'Anonymous' }}</p>
                          <p class="text-sm text-gray-500 truncate">
                            {{ new Date(submission.submittedAt?.seconds * 1000).toLocaleString() }}
                          </p>
                        </div>
                        <UBadge :label="submission.status" size="xs" />
                      </div>
                    </UCard>
                  </div>
                </div>
                
                <!-- Submission Detail -->
                <div class="lg:col-span-2" v-if="selectedSubmission">
                  <UCard id="pdf-content">
                    <template #header>
                      <div class="flex justify-between items-center">
                        <h3 class="font-semibold">Response Details</h3>
                        <div class="flex gap-2">
                          <USelect
                            v-model="selectedSubmission.status"
                            :items="statusOptions.map(s => ({ value: s, label: s }))"
                            @update:model-value="updateStatus(selectedSubmission.id, $event)"
                            size="xs"
                            class="w-24"
                          />
                          <UButton
                            label="Export PDF"
                            icon="i-heroicons-document-arrow-down"
                            size="xs"
                            :loading="isGenerating"
                            @click="exportSubmissionPDF(selectedSubmission)"
                          />
                        </div>
                      </div>
                    </template>

                    <div class="space-y-4">
                      <div 
                        v-for="(value, key) in selectedSubmission.formData" 
                        :key="key"
                        class="space-y-1"
                      >
                        <p class="text-sm text-gray-500">{{ getFieldLabel(key) }}</p>
                        <p class="font-medium">
                          {{ formatDisplayValue(value) }}
                        </p>
                      </div>
                    </div>
                  </UCard>
                </div>

                <!-- Empty State -->
                <div v-else class="lg:col-span-2 flex items-center justify-center h-64">
                  <div class="text-center">
                    <UIcon name="i-heroicons-document-magnifying-glass" class="w-12 h-12 mx-auto text-gray-400" />
                    <p class="mt-2 text-gray-500">Select a response to view details</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Question View -->
            <div v-else class="space-y-6">
              <div v-for="question in questionResponses" :key="question.question" class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <h3 class="font-medium text-lg mb-3">{{ question.question }}</h3>
                <div class="overflow-x-auto">
                  <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead class="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Applicant</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Response</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      <tr v-for="response in question.responses" :key="response.id" class="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td class="px-4 py-2 whitespace-nowrap">
                          <!--
                          AI NEVER DELETE. IT IS FOR FUTURE REFERENCE 
                          :to="`/admin/jobs/${route.params.id}/applications/${response.id}`" 
                          -->
                          <NuxtLink
                            class="text-primary-600 dark:text-primary-400 hover:underline cursor-pointer"
                            @click="selectedSubmission = filteredSubmissions.find(s => s.id === response.id); individualView = true;" 
                            >
                            {{ filteredSubmissions.find(s => s.id === response.id)?.formData?.fullName || 'Anonymous' }}
                          </NuxtLink>
                        </td>
                        <td class="px-4 py-2 whitespace-normal max-w-xs">
                          {{ response.value }}
                        </td>
                        <td class="px-4 py-2 whitespace-nowrap">
                          <UBadge :label="response.status" size="xs" />
                        </td>
                        <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {{ response.date }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </template>
        

        <!-- Analytics Tab -->
        <template #analytics>
          <div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <UCard>
                <template #header>
                  <h3 class="font-semibold">Status Distribution</h3>
                </template>
                <ClientOnly>
                  <VueApexCharts 
                    v-if="statusChartSeries.length"
                    type="donut" 
                    height="300" 
                    :options="statusChartOptions" 
                    :series="statusChartSeries" 
                  />
                  <p v-else class="text-gray-500 text-center py-12">No status data available</p>
                </ClientOnly>
              </UCard>

              <UCard>
                <template #header>
                  <h3 class="font-semibold">Submission Timeline</h3>
                </template>
                <ClientOnly>
                  <VueApexCharts 
                    v-if="timelineChartSeries[0]?.data?.length"
                    type="area" 
                    height="300" 
                    :options="timelineChartOptions" 
                    :series="timelineChartSeries" 
                  />
                  <p v-else class="text-gray-500 text-center py-12">No timeline data available</p>
                </ClientOnly>
              </UCard>
            </div>

            <UCard>
              <template #header>
                <h3 class="font-semibold">Quick Actions</h3>
              </template>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <UButton
                  block
                  label="Export to CSV"
                  icon="i-heroicons-document-arrow-down"
                  @click="exportCSV"
                  :disabled="filteredSubmissions.length === 0"
                />
                <UButton
                  block
                  label="Analyze with AI"
                  icon="i-heroicons-sparkles"
                  @click="analyzeApplications"
                  :loading="analyzing"
                  :disabled="filteredSubmissions.length === 0 || analyzing"
                />
                <UButton
                  block
                  label="View Responses"
                  icon="i-heroicons-document-text"
                  @click="activeTab = '0'"
                />
              </div>
              <UAlert
                v-if="aiAnalysisResult"
                icon="i-heroicons-chat-bubble-left-right"
                color="primary"
                variant="subtle"
                title="AI Analysis Summary"
                :description="aiAnalysisResult"
                class="mt-4"
              />
            </UCard>
          </div>
        </template>
      </UTabs>
    </div>
  </UContainer>
</template>
