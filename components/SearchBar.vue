// components/SearchBar.vue
<script setup>
const searchQuery = ref('')

function handleSearch() {
  emit('search', searchQuery.value)
}

const emit = defineEmits(['search']);
</script>

<template>
  <form @submit.prevent="handleSearch" class="w-full max-w-2xl">
    <div class="flex gap-2">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search jobs..."
        class="flex-1 px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-800 bg-white"
      />
      <button
        type="submit"
        class="px-4 py-2 bg-blue-900 text-white rounded hover:bg-blue-950"
      >
        Search
      </button>
    </div>
  </form>
</template>