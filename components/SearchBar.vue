<!-- components/SearchBar.vue -->
<script setup>
const searchQuery = ref('')

const emit = defineEmits(['search'])

function handleSearch() {
  emit('search', searchQuery.value.trim())
}
</script>

<template>
  <form @submit.prevent="handleSearch" class="w-full max-w-2xl">
    <div class="flex gap-2">
      <UInput
        v-model="searchQuery"
        type="text"
        placeholder="Search jobs by title, company, location, etc..."
        icon="i-heroicons-magnifying-glass"
        class="flex-1"
      />
      <UButton
        type="submit"
        label="Search"
      />
    </div>
  </form>
</template>