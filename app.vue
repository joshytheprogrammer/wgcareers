// layouts/app.vue
<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 py-4">
        <h1 class="text-2xl font-bold text-gray-900">
          <NuxtLink to="/">Walls and Gates Careers</NuxtLink>
        </h1>
      </div>
    </header>
    <main>
      <UApp>
        <NuxtPage />
      </UApp>
    </main>
  </div>
</template>