// layouts/app.vue
<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow-sm">
      <div class="w-full px-4 py-4">
        <UButton
          to="/"
          variant="ghost"
          class="mx-auto block w-fit"
        >
          <img src="https://wandggroup.com/assets/images/logo%202.png" class="w-12 h-12 " alt="">
        </UButton>
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