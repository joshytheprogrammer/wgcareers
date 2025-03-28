// components/FilterLocation.vue
<script setup>
const props = defineProps({
  locations: {
    type: Array,
    required: true
  }
})

const selected = ref('All')

function handleChange(e) {
  emit('select', e.target.value)
}

const emit = defineEmits(['select']);
</script>

<template>
  <select 
    @change="handleChange"
    class="px-4 py-2 border rounded bg-white"
  >
    <option value="All">All Locations</option>
    <option v-for="location in locations" :key="location" :value="location">
      {{ location }}
    </option>
  </select>
</template>