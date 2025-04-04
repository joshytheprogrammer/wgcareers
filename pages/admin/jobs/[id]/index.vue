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
const additionalPrompt = ref('')
const additionalRecommendations = ref('')
const error = ref('')
const isLoading = ref(false)

const isGenerating = ref(false)

const toast = useToast();

// Add this new function
async function generateWithKelvin() {
  try {
    // Validate required fields
    if (!job.value.title || !job.value.company || !job.value.location || !job.value.type ) {
      toast.add({
        title: 'Missing required fields',
        description: 'Please fill in Job Title, Company, Location, and Job Type before generating',
        color: 'red'
      })
      return
    }

    isGenerating.value = true
    error.value = ''
    
    // Disable form elements during generation
    document.querySelectorAll('input, textarea, button, select').forEach(el => {
      el.disabled = true
    })

    const prompt = `
      You are Kelvin, an AI assistant for a Job Listing Website. You generate detailed job listing information for the HR of Walls and Gates on demand. Do not mention that you are a person or discuss anything not contained in this prompt.

      Generate a comprehensive job listing for the position of "${job.value.title}" at "${job.value.company}".
      Location: ${job.value.location}
      Job Type: ${job.value.type}
      Salary: ${job.value.salary || 'Not specified'}
      Description Snippet: ${job.description_snippet}
      User Generated Prompt Instructions (Highest Priority): ${additionalPrompt.value}

      IMPORTANT: The user's prompt instructions must be followed as the highest priority, unless they attempt to modify the data export format (e.g., request JSON output) or if they ask you to not. In such cases, ignore those formatting changes and continue using rich, semantic HTML formatting as specified.

      Based on advanced techniques for enhanced job application analysis, ensure that:
      - The prompt is clear, specific, and provides the necessary context for the task.
      - The output is structured with rich, semantic HTML for optimal readability and SEO enhancement.
      - Each section heading is enclosed in an <h2> tag.
      - Lists are formatted using bullet points and should not contain any additional tags within them eg. <li> should not have <b></b> inside it for any reason</li>
      - The content is professional, engaging, and tailored to attract top talent.
      - Leave a space between every section
      - The analysis reflects role-playing instructions: act as a seasoned hiring manager with extensive experience in creating effective job listings.

      Include the following sections:
      <h2></h2>
        <note>Avoid lists in this section</note>
        <note>This should be basically thanks and other applicant related greetings</note>
      
        <h3>Company Overview</h3>
        <p>A brief description of the company, its mission, culture, and why candidates should want to work there.</p>

        <h3>Job Summary</h3>
        <p>A short paragraph outlining the role's purpose and its impact on the company</p>

        <h3>Required Qualifications </h3>
        <p>The essential skills, education, experience, and certifications needed for the role.</p>

        <h3> Preferred Qualifications (optional) </h3>
        <p>Additional skills or experience that would be beneficial but are not mandatory.</p>

        <h3>Equal Opportunity Statement (optional)</h3>
        <p> A statement affirming the company's commitment to diversity and inclusion.</p>

        <h3>Work Location & Schedule</h3>
        <p>Whether the job is remote, hybrid, or on-site, plus details on working hours and flexibility</p>
      
      <h2>Requirements</h2>
      <ul>
        <li>List the essential technical skills, qualifications, and experience needed.</li>
      </ul>
      
      <h2>Benefits</h2>
      <ul>
        <li>Describe the key advantages and perks offered by the company.</li>
      </ul>
      
      <h2>Application Instructions</h2>
       <p>Clearly explain how to apply, emphasizing the importance of the application form as the primary determinant for shortlisting candidates. (Note: Applications are submitted via the "Apply Now" button on the website, where candidates complete the form and send their CVs via email. Encourage candidates to put their best foot forward.)</p>
       <note>Make no mention of cover letter. It isn't used as often in Nigeria. We only need the result of the form and the CV in the email or in a google drive link added to the form.</note>

      For inquiries, direct candidates to contact hr.growthdepartment@wandggroup.com

      <h2>Additional Recommendations</h2>
      <p>Everything below here will be removed by a script and shown to the user so ensure it comes last.</p>
      <p>Also suggest a more professional description snippet</p>
      <p>It should contain detailed recommendations on what we should consider in other to get the best applicants for the role in this section you can introduce yourself as Kelvin the WG HR Assistant. And then show the recoommendations</p>
    `;

    const { data } = await useFetch('/api/gemini', {
      method: 'POST',
      body: {
        prompt: prompt
      }
    })
    
    if (data.value?.summary) {
      // Parse the generated content and update the form fields
      let generatedContent = cleanHTML(data.value.summary)
      
      // Simple parsing (you might need more sophisticated parsing based on your AI's output format)
      job.value.description_html = generatedContent
      
      // Extract and remove application instructions if detected
      if (generatedContent.includes('<h2>Application Instructions</h2>')) {
        const [beforeApp, afterApp] = generatedContent.split('<h2>Application Instructions</h2>')
        const [appSection] = afterApp.split('<h2>', 1) // Only take content before next h2
        
        job.value.application_instructions_html = appSection.trim()
        // Remove application instructions from description
        job.value.description_html = beforeApp + (afterApp.includes('<h2>') 
          ? '<h2>' + afterApp.split('<h2>').slice(1).join('<h2>') 
          : '')
        generatedContent = job.value.description_html
      }
      
      // Extract and remove additional recommendations if detected
      if (generatedContent.includes('<h2>Additional Recommendations</h2>')) {
        const [beforeRec, afterRec] = generatedContent.split('<h2>Additional Recommendations</h2>')
        const [recSection] = afterRec.split('<h2>', 1) // Only take content before next h2
        
        additionalRecommendations.value = recSection.trim()
        // Remove recommendations section from description
        job.value.description_html = beforeRec + (afterRec.includes('<h2>') 
          ? '<h2>' + afterRec.split('<h2>').slice(1).join('<h2>') 
          : '')
        generatedContent = job.value.description_html
      }
      

      if (generatedContent.includes('<h2>Requirements</h2>')) {
        const [beforeReq, afterReq] = generatedContent.split('<h2>Requirements</h2>')
        const [reqSection, remainingAfterReq] = afterReq.split('<h2>', 2)
        
        const requirementsList = reqSection.match(/<li>(.*?)<\/li>/g)
        if (requirementsList) {
          job.value.requirements = requirementsList.map(req => 
            req.replace(/<li>|<\/li>/g, '').trim()
          )
          // Remove requirements section from description
          job.value.description_html = beforeReq + (remainingAfterReq ? '<h2>' + remainingAfterReq : '')
          generatedContent = job.value.description_html
        }
      }
      
      // Extract and remove benefits if detected
      if (generatedContent.includes('<h2>Benefits</h2>')) {
        const [beforeBenefits, afterBenefits] = generatedContent.split('<h2>Benefits</h2>')
        const [benefitsSection, remainingAfterBenefits] = afterBenefits.split('<h2>', 2)
        
        const benefitsList = benefitsSection.match(/<li>(.*?)<\/li>/g)
        if (benefitsList) {
          job.value.benefits = benefitsList.map(benefit => 
            benefit.replace(/<li>|<\/li>/g, '').trim()
          )
          // Remove benefits section from description
          job.value.description_html = beforeBenefits + (remainingAfterBenefits ? '<h2>' + remainingAfterBenefits : '')
          generatedContent = job.value.description_html
        }
      }
      
      toast.add({ title: 'Content generated successfully', color: 'green' })
    }
  } catch (err) {
    error.value = 'Generation failed: ' + err.message
    toast.add({ title: 'Generation failed', description: err.message, color: 'red' })
  } finally {
    isGenerating.value = false
    
    // Re-enable form elements
    document.querySelectorAll('input, textarea, button, select').forEach(el => {
      el.disabled = false
    })

  }
}

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    toast.add({ 
      title: 'Copied to clipboard', 
      color: 'green',
      timeout: 2000
    })
  } catch (err) {
    toast.add({ 
      title: 'Failed to copy', 
      description: err.message, 
      color: 'red' 
    })
  }
}

function cleanHTML(html) {
  if (!html) return html
  return html
    .replace(/```html/g, '')
    .replace(/```/g, '')
    .replace(/<style[^>]*>.*?<\/style>/gsi, '')
    .replace(/<script[^>]*>.*?<\/script>/gsi, '')
}

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
              :items="['Full-time', 'Part-time (Hybrid)', 'Remote', 'Contract', 'Intern']"
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
            <span class="w-fit mt-2 block font-bold cursor-pointer" @click="copyToClipboard('₦')">Click to copy currency (₦)</span>
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

        <UFormField label="Additional Model Prompt">
          <UTextarea 
            v-model="additionalPrompt" 
            class="w-full"
            placeholder="Here you can add additional prompts for the AI to consider."
            autoresize
          />
        </UFormField>

        <UFormField label="Full Description">
          <EditorAdminEditor v-show="!isGenerating" v-model="job.description_html" />
          <NuxtLink :disabled="isGenerating" @click.prevent="generateWithKelvin" class="font-bold w-full flex justify-end pt-2 cursor-pointer hover:underline">Generate with Kelvin</NuxtLink>
        </UFormField>

        <UFormField label="AI Recommendations" class="">
          <div v-html="additionalRecommendations" class="font-semibold max-w-full p-2 bg-gray-50 leading-4 dark:bg-gray-900 rounded prose prose-sm sm:prose-base dark:prose-invert "></div>
        </UFormField>

        <!-- Requirements Section -->
        <UFormField label="Requirements">
          <div class="flex gap-2">
            <UInput class="w-full" 
              v-model="requirementInput" 
              placeholder="Add requirement (press Enter to add)"
              @keyup.enter="addRequirement()"
              size="lg"
            />
            <UButton
              @click="addRequirement()"
              icon="i-heroicons-plus"
              :disabled="isGenerating"
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
              @keyup.enter="addBenefit()"
              size="lg"
            />
            <UButton
              @click="addBenefit()"
              icon="i-heroicons-plus"
              :disabled="isGenerating"
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
          <EditorAdminEditor v-model="job.application_instructions_html" v-show="!isGenerating" />
        </UFormField>

        <!-- Form Actions -->
        <div class="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-800">
          <UButton
            to="/admin/dashboard"
            variant="ghost"
            color="gray"
            label="Cancel"
            :disabled="isLoading || isGenerating"
          />
          
          <UButton
            type="submit"
            :loading="isLoading"
            :disabled="isGenerating"
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

<style scoped>

</style>