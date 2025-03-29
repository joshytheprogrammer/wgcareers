<script setup >
import { sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth'
const auth = useFirebaseAuth()

const email = ref('')
const error = ref('')
const success = ref(false)

if (!auth) {
  console.error('Firebase Auth instance is not available.');
}


// Handle email link sign-in
onMounted(async () => {
  if (process.client) { // Ensure we're on client side
    if (isSignInWithEmailLink(auth, window.location.href)) {
      try {
        let email = window.localStorage.getItem('emailForSignIn')
        if (!email) {
          email = prompt('Please provide your email for confirmation')
        }
        
        const userCredential = await signInWithEmailLink(auth, email, window.location.href)
        window.localStorage.removeItem('emailForSignIn')
        await navigateTo('/admin/dashboard')
      } catch (err) {
        error.value = err.message
      }
    }
  }
})

async function handleLogin() {
  try {
    const actionCodeSettings = {
      url: window.location.origin + '/admin/login',
      handleCodeInApp: true
    }

    await sendSignInLinkToEmail(auth, email.value, actionCodeSettings)
    window.localStorage.setItem('emailForSignIn', email.value)
    success.value = true
    error.value = ''
  } catch (err) {
    error.value = err.message
    success.value = false
  }
}
</script>

<template>
  <div class="max-w-md mx-auto mt-16">
    <UCard>
      <form @submit.prevent="handleLogin" class="space-y-4">
        <UFormGroup label="Email" name="email">
          <UInput v-model="email" type="email" placeholder="your@email.com" required />
        </UFormGroup>

        <UButton type="submit" block :disabled="success">
          {{ success ? 'Check Your Email' : 'Send Login Link' }}
        </UButton>

        <UAlert
          v-if="error"
          title="Login Error"
          :description="error"
          icon="i-heroicons-exclamation-triangle"
          color="red"
          variant="outline"
        />

        <UAlert
          v-if="success"
          title="Check Your Email"
          description="We've sent a login link to your email address."
          icon="i-heroicons-envelope"
          color="green"
          variant="outline"
        />
      </form>
    </UCard>
  </div>
</template>