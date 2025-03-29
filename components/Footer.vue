<!-- components/AppFooter.vue -->
<template>
  <footer class="bg-gray-900 text-gray-300 py-6 mt-12 border-t border-gray-800">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex flex-col md:flex-row items-center justify-between">
        <!-- Copyright Section -->
        <div class="mb-4 md:mb-0 text-center md:text-left">
          <p class="text-sm">
            &copy; {{ new Date().getFullYear() }} Walls and Gates. All rights reserved.
          </p>
          <p class="text-xs mt-1 text-gray-500">
            Building futures, one career at a time.
          </p>
        </div>

        <!-- Admin Quick Link -->
        <div v-if="isAuthenticated" class="flex items-center space-x-4">
          <NuxtLink 
            to="/admin/dashboard"
            class="text-sm font-medium hover:text-white transition-colors duration-200 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
            </svg>
            Admin Dashboard
          </NuxtLink>
        </div>

        <!-- Login link for non-authenticated users -->
        <NuxtLink 
          v-else
          to="/admin/login"
          class="text-sm font-medium hover:text-white transition-colors duration-200"
        >
          Staff Login
        </NuxtLink>
      </div>
    </div>
  </footer>
</template>

<script setup>
const auth = useFirebaseAuth()
const isAuthenticated = computed(() => auth?.currentUser !== null);
</script>