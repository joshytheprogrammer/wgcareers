// layouts/app.vue
<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 py-4">
        <h1 @click="$router.push('/')" class="text-2xl w-fit flex gap-4 items-center cursor-pointer font-bold text-black">
          <img src="https://wandggroup.com/assets/images/logo%202.png" width="70px" height="70px" alt="">
          <NuxtLink to="/">Walls and Gates Careers</NuxtLink>
        </h1>
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