<script setup>
import { doc, getDoc, setDoc } from 'firebase/firestore'
import debounce from 'lodash.debounce'
import { ref, computed, watch, onMounted } from 'vue'

const db = useFirestore()
const route = useRoute()
const toast = useToast()

const initialLoad = ref(true);

// Form schema structure
const formSchema = ref({
  title: 'Job Application Form',
  description: '',
  fields: [],
  conditions: []
})

// Available field types (Deepseek version)
const fieldTypes = [
  { value: 'text', label: 'Text Input', icon: 'i-heroicons-pencil' },
  { value: 'textarea', label: 'Text Area', icon: 'i-heroicons-document-text' },
  { value: 'select', label: 'Select', icon: 'i-heroicons-chevron-down' },
]

// Validation rule types (Deepseek version)
const validationTypes = [
  { value: 'required', label: 'Required' },
  { value: 'minLength', label: 'Minimum Length' },
  { value: 'maxLength', label: 'Maximum Length' },
  { value: 'pattern', label: 'Regex Pattern' },
  { value: 'min', label: 'Minimum Value' },
  { value: 'max', label: 'Maximum Value' }
]

// Gemini's schema generation logic
const formKitSchema = computed(() => {
  return formSchema.value.fields.map(field => {
    const validationRules = []
    if (field.required) validationRules.push('required')
    
    for (const [rule, value] of Object.entries(field.validation)) {
      switch(rule) {
        case 'minLength': validationRules.push(`length:${value}`); break;
        case 'maxLength': validationRules.push(`length:${value}`); break;
        case 'pattern': validationRules.push(`matches:${value}`); break;
        default: validationRules.push(`${rule}:${value}`);
      }
    }

    return {
      $formkit: field.type,
      name: field.id,
      label: field.label,
      placeholder: field.placeholder,
      validation: validationRules.join('|'),
      ...(field.type === 'select' && { options: field.options })
    }
  })
})

// Deepseek's Firebase integration
const loadSchema = async () => {
  try {
    const docRef = doc(db, 'jobs', route.params.id)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      const data = docSnap.data()
      if (data.formSchema) formSchema.value = data.formSchema
      if (data.formKitSchema) formKitSchema.value = data.formKitSchema
    }
  } catch (error) {
    toast.add({ title: 'Error loading form', description: error.message, color: 'red' })
  }finally {
    initialLoad.value = false;
  }
}

const saveSchema = debounce(async () => {
  try {
    await setDoc(doc(db, 'jobs', route.params.id), {
      formSchema: formSchema.value,
      formKitSchema: formKitSchema.value
    }, { merge: true })
    toast.add({ title: 'Form saved', color: 'green' })
  } catch (error) {
    toast.add({ title: 'Error saving form', description: error.message, color: 'red' })
  }
}, 2000)

// Deepseek's core functionality
const validateSchema = () => {
  const fieldIds = formSchema.value.fields.map(f => f.id)
  const duplicateIds = fieldIds.filter((id, index) => fieldIds.indexOf(id) !== index)
  if (duplicateIds.length) {
    toast.add({ title: 'Validation error', description: `Duplicate IDs: ${duplicateIds.join(', ')}`, color: 'red' })
    return false
  }
  return true
}

const addField = (type) => {
  formSchema.value.fields.push({
    id: `field_${Date.now()}`,
    type,
    label: '',
    placeholder: '',
    required: false,
    validation: {},
    options: type === 'select' ? ['Option 1', 'Option 2'] : []
  })
  saveSchema()
}

const removeField = (index) => {
  formSchema.value.fields.splice(index, 1)
  saveSchema()
}

const newValidation = ref(null);

// Modified addValidation function
const addValidation = (field, ruleValue) => {
  if (!ruleValue) return // Skip if no rule selected
  
  if (!field.validation) field.validation = {}
  
  switch (ruleValue) {
    case 'required':
      field.validation[ruleValue] = true
      break
    case 'minLength':
      field.validation[ruleValue] = 5 // Default value
      break
    case 'maxLength':
      field.validation[ruleValue] = 100
      break
    case 'pattern':
      field.validation[ruleValue] = '.*' // Default regex
      break
    case 'min':
      field.validation[ruleValue] = 0
      break
    case 'max':
      field.validation[ruleValue] = 100
      break
  }
  
  newValidation.value = null // Clear the selection
  saveSchema()
}
// Update validation rules display
const getValidationLabel = (rule) => {
  return validationTypes.find(t => t.value === rule)?.label || rule
}

// Remove a validation rule from a field
const removeValidation = (field, rule) => {
  if (field.validation && field.validation[rule] !== undefined) {
    // Create a new validation object without the rule
    const updatedValidation = {...field.validation}
    delete updatedValidation[rule]
    
    // Assign the new object to trigger reactivity
    field.validation = updatedValidation
    
    saveSchema()
  }
}

const addCondition = () => {
  formSchema.value.conditions.push({
    id: `cond_${Date.now()}`,
    fieldId: '',
    operator: 'equals',
    value: '',
    action: 'show',
    targetFieldId: ''
  })
  saveSchema()
}

const removeCondition = (index) => {
  formSchema.value.conditions.splice(index, 1)
  saveSchema()
}

watch(formSchema, () => {
  if (validateSchema()) saveSchema()
}, { deep: true })

onMounted(loadSchema);
</script>

<template>
  <UContainer class="py-8">
    <div class="flex items-center justify-between mb-8">
      <h1 class="text-2xl font-bold">Form Builder</h1>
      <UButton
        to="/admin/dashboard"
        icon="i-heroicons-arrow-left"
        label="Back to Dashboard"
        color="gray"
        variant="ghost"
      />
    </div>

    <div v-if="!initialLoad" class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- Deepseek Left Panel -->
      <div class="lg:col-span-1 space-y-4">
        <UCard>
          <template #header>
            <h2 class="font-semibold">Field Types</h2>
          </template>
          <div class="space-y-4">
            <UButton
              v-for="type in fieldTypes"
              :key="type.value"
              @click="addField(type.value)"
              :icon="type.icon"
              :label="type.label"
              block
              color="gray"
              variant="outline"
              size="sm"
              class="w-fit"
            />
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="font-semibold">Form Settings</h2>
          </template>
          <UFormField label="Form Title">
            <UInput class="w-full" v-model="formSchema.title" />
          </UFormField>
          <UFormField label="Description" class="mt-4">
            <UTextarea class="w-full" v-model="formSchema.description" />
          </UFormField>
        </UCard>

        <!-- Conditional -->
        <UCard>
          <template #header>
            <h2 class="font-semibold">Conditional Logic</h2>
          </template>

          <div v-if="formSchema.conditions.length === 0" class="text-center py-4 text-gray-500">
            <p>No conditions added</p>
          </div>

          <div v-else class="space-y-4">
            <div v-for="(condition, index) in formSchema.conditions" :key="condition.id" class="border rounded-lg p-3">
              <div class="flex justify-between items-start mb-2">
                <h3 class="font-medium text-sm">Condition {{ index + 1 }}</h3>
                <UButton
                  icon="i-heroicons-trash"
                  color="red"
                  variant="ghost"
                  size="xs"
                  @click="removeCondition(index)"
                />
              </div>

              <div class="space-y-2">
                <UFormField label="If this field">
                  <USelect class="w-full"
                    v-model="condition.fieldId"
                    :items="formSchema.fields.map(f => ({ value: f.id, label: f.label || f.id }))"
                  />
                </UFormField>

                <UFormField label="Operator">
                  <USelect class="w-full"
                    v-model="condition.operator"
                    :items="[
                      { value: 'equals', label: 'Equals' },
                      { value: 'notEquals', label: 'Does not equal' },
                      { value: 'contains', label: 'Contains' },
                      { value: 'greaterThan', label: 'Greater than' },
                      { value: 'lessThan', label: 'Less than' }
                    ]"
                  />
                </UFormField>

                <UFormField label="Value">
                  <UInput class="w-full" v-model="condition.value" />
                </UFormField>

                <UFormField label="Then">
                  <USelect class="w-full"
                    v-model="condition.action"
                    :items="[
                      { value: 'show', label: 'Show' },
                      { value: 'hide', label: 'Hide' },
                      { value: 'require', label: 'Require' },
                      { value: 'disable', label: 'Disable' }
                    ]"
                  />
                </UFormField>

                <UFormField label="This field">
                  <USelect class="w-full"
                    v-model="condition.targetFieldId"
                    :items="formSchema.fields.map(f => ({ value: f.id, label: f.label || f.id }))"
                  />
                </UFormField>
              </div>
            </div>
          </div>

          <template #footer>
            <UButton
              icon="i-heroicons-plus"
              label="Add Condition"
              block
              size="sm"
              variant="outline"
              @click="addCondition"
            />
          </template>
        </UCard>
      </div>

      <!-- Deepseek Main Editor -->
      <div class="lg:col-span-2 space-y-4">
        <UCard>
          <template #header>
            <h2 class="font-semibold">Form Editor</h2>
          </template>

          <div v-if="formSchema.fields.length === 0" class="text-center py-8 text-gray-500">
            <UIcon name="i-heroicons-inbox" class="w-12 h-12 mx-auto mb-4" />
            <p>No fields added yet</p>
            <p class="text-sm">Click fields from the left to add</p>
          </div>

          <div v-else class="space-y-6">
            <div v-for="(field, index) in formSchema.fields" :key="field.id" class="border rounded-lg p-4">
              <div class="flex justify-between items-start mb-3">
                <div class="flex items-center gap-2">
                  <UIcon :name="fieldTypes.find(t => t.value === field.type)?.icon" class="w-5 h-5" />
                  <span class="font-medium">{{ field.label || 'Unlabeled Field' }}</span>
                  <UBadge v-if="field.required" label="Required" size="xs" color="red" />
                </div>
                <UButton
                  icon="i-heroicons-trash"
                  color="red"
                  variant="ghost"
                  size="xs"
                  @click="removeField(index)"
                />
              </div>

              <!-- Field Configuration -->
              <div class="space-y-4">
                <UFormField label="Field Label">
                  <UInput class="w-full" v-model="field.label" />
                </UFormField>

                <UFormField label="Placeholder Text">
                  <UInput class="w-full" v-model="field.placeholder" />
                </UFormField>

                <UFormField label="Required">
                  <USwitch v-model="field.required" />
                </UFormField>

                <!-- Options for select fields -->
                <UFormField v-if="field.type === 'select'" label="Options">
                  <div class="space-y-2">
                    <div v-for="(option, i) in field.options" :key="i" class="flex items-center gap-2">
                      <UInput class="w-full" v-model="field.options[i]" />
                      <UButton
                        icon="i-heroicons-trash"
                        color="red"
                        variant="ghost"
                        size="xs"
                        @click="field.options.splice(i, 1)"
                      />
                    </div>
                    <UButton
                      icon="i-heroicons-plus"
                      label="Add Option"
                      size="xs"
                      variant="outline"
                      @click="field.options.push('')"
                    />
                  </div>
                </UFormField>

                <!-- Updated Validation Rules Section -->
                <UFormField label="Validation Rules">
                  <div class="space-y-2">
                    <div v-for="(value, rule) in field.validation" :key="rule" class="flex items-center gap-2">
                      <UBadge :label="getValidationLabel(rule)" class="flex-shrink-0" />
                      
                      <template v-if="rule !== 'required'">
                        <UInput 
                          v-model.number="field.validation[rule]"
                          :type="['minLength', 'maxLength', 'min', 'max'].includes(rule) ? 'number' : 'text'"
                          :placeholder="getValidationLabel(rule)"
                          class="w-full flex-1"
                        />
                      </template>

                      <UButton
                        icon="i-heroicons-trash"
                        color="red"
                        variant="ghost"
                        size="xs"
                        @click="removeValidation(field, rule)"
                        :disabled="rule === 'min' && field.type === 'number'"
                      />
                    </div>

                    <USelect class="w-full"
                      v-model="newValidation"
                      :items="validationTypes.filter(t => !field.validation?.[t.value])"
                      placeholder="Add validation rule"
                      @update:model-value="(val) => {
                        addValidation(field, val)
                        newValidation = null // Additional safeguard
                      }"
                    />
                  </div>
                </UFormField>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Gemini Right Panel -->
      <div class="lg:col-span-1 space-y-4">
        <UCard>
          <template #header>
            <h2 class="font-semibold">Live Preview</h2>
          </template>
          <div class="p-4 border rounded">
            <FormKit type="form" :actions="false">
              <FormKitSchema :schema="formKitSchema" />
            </FormKit>
          </div>
          <template #footer>
            <p class="text-xs text-gray-500">This is a live rendering using the generated FormKit schema.</p>
          </template>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="font-semibold">Generated Schema</h2>
          </template>
          <div class="max-h-96 overflow-auto p-2 bg-gray-100 dark:bg-gray-900 rounded">
            <pre class="text-xs">{{ JSON.stringify(formKitSchema, null, 2) }}</pre>
          </div>
          <template #footer>
            <p class="text-xs text-gray-500">This JSON is what gets saved as `formKitSchema` in Firebase.</p>
          </template>
        </UCard>
      </div>
    </div>
    <!-- Loading State -->
    <div v-else class="flex flex-col items-center justify-center py-16 space-y-6">
      <UIcon 
        name="i-heroicons-arrow-path" 
        class="w-12 h-12 text-primary-500 animate-spin" 
      />
      <div class="text-center space-y-2">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Loading Form Builder</h2>
        <p class="text-gray-500 dark:text-gray-400">Preparing your editing environment...</p>
      </div>
      <div class="w-full max-w-md bg-gray-100 dark:bg-gray-800 rounded-full h-2.5">
        <div 
          class="bg-primary-500 h-2.5 rounded-full animate-pulse" 
          style="width: 45%"
        ></div>
      </div>
    </div>
  </UContainer>
</template>
