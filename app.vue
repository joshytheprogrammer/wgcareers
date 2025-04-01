// layouts/app.vue
<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow-sm">
      <div class="w-full px-4 py-4">
        <img src="/logo.png" @click="$router.push('/')" class="w-[120px] h-[90px] cursor-pointer mx-auto" alt="Walls and Gates Logo">
      </div>
    </header>
    <main>
      <UApp>
        <NuxtPage />
      </UApp>
      
    </main>
    <Footer />
  </div>
</template>