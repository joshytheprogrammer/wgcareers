<script setup>
import { sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth'
const auth = useFirebaseAuth()

const email = ref('')
const error = ref('')
const success = ref(false)
const isLoading = ref(false)

// Handle email link sign-in
onMounted(async () => {
  if (process.client) {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      try {
        isLoading.value = true
        let email = window.localStorage.getItem('emailForSignIn')
        if (!email) {
          email = prompt('Please provide your email for confirmation')
        }
        
        await signInWithEmailLink(auth, email, window.location.href)
        window.localStorage.removeItem('emailForSignIn')
        await navigateTo('/admin/dashboard')
      } catch (err) {
        error.value = err.message
      } finally {
        isLoading.value = false
      }
    }
  }
})

async function handleLogin() {
  try {
    isLoading.value = true
    error.value = ''
    success.value = false
    
    const actionCodeSettings = {
      url: window.location.origin + '/admin/login',
      handleCodeInApp: true
    }

    await sendSignInLinkToEmail(auth, email.value, actionCodeSettings)
    window.localStorage.setItem('emailForSignIn', email.value)
    success.value = true
  } catch (err) {
    error.value = err.message
    success.value = false
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="text-center space-y-2">
          <div class="flex justify-center">
            <UIcon name="i-heroicons-lock-closed" class="w-12 h-12 text-black" />
          </div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            Admin Login
          </h1>
          <p class="text-gray-500 dark:text-gray-400">
            Enter your email to receive a secure login link
          </p>
        </div>
      </template>

      <form @submit.prevent="handleLogin" class="space-y-6">
        <UFormGroup label="Email address" name="email">
          <UInput
            v-model="email"
            type="email"
            placeholder="your@email.com"
            class="w-full mb-4"
            icon="i-heroicons-envelope"
            required
            :disabled="success || isLoading"
          />
        </UFormGroup>

        <UButton
          type="submit"
          block
          :loading="isLoading"
          :disabled="success || isLoading"
          :label="success ? 'Link Sent - Check Your Email' : 'Send Login Link'"
          :icon="success ? 'i-heroicons-check' : 'i-heroicons-paper-airplane'"
          :color="success ? 'green' : 'primary'"
          size="lg"
        />

        <UAlert
          v-if="error"
          title="Couldn't send login link"
          :description="error"
          icon="i-heroicons-exclamation-triangle"
          color="red"
          variant="subtle"
          class="mt-4"
        />

        <UAlert
          v-if="success"
          title="Login link sent!"
          description="We've sent a secure login link to your email address. Please check your inbox."
          icon="i-heroicons-envelope-open"
          color="green"
          variant="subtle"
          class="mt-4"
        />
      </form>

      <template #footer>
        <p class="text-center text-sm text-gray-500 dark:text-gray-400">
          Don't have access? Contact your administrator
        </p>
      </template>
    </UCard>
  </div>
</template>