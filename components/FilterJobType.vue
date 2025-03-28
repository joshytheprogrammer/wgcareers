// components/FilterJobType.vue
<script setup>
const props = defineProps({
  jobTypes: {
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
    <option value="All">All Job Types</option>
    <option v-for="type in jobTypes" :key="type" :value="type">
      {{ type }}
    </option>
  </select>
</template>