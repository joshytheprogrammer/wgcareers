<script setup>
import { doc, getDoc, setDoc } from 'firebase/firestore'
import debounce from 'lodash.debounce'

const db = useFirestore()
const route = useRoute()
const toast = useToast()

// Form schema structure
const formSchema = ref({
  title: 'Job Application Form',
  description: '',
  fields: [],
  conditions: []
})

// Available field types
const fieldTypes = [
  { value: 'text', label: 'Text Input', icon: 'i-heroicons-pencil' },
  { value: 'textarea', label: 'Text Area', icon: 'i-heroicons-document-text' },
  { value: 'select', label: 'Dropdown', icon: 'i-heroicons-chevron-down' },
  { value: 'checkbox', label: 'Checkbox', icon: 'i-heroicons-check-circle' },
  { value: 'file', label: 'File Upload', icon: 'i-heroicons-paper-clip' }
]

// Validation rule types
const validationTypes = [
  { value: 'required', label: 'Required' },
  { value: 'minLength', label: 'Minimum Length' },
  { value: 'maxLength', label: 'Maximum Length' },
  { value: 'pattern', label: 'Regex Pattern' },
  { value: 'min', label: 'Minimum Value' },
  { value: 'max', label: 'Maximum Value' }
]

// Load existing form schema
const loadSchema = async () => {
  try {
    const docRef = doc(db, 'jobs', route.params.id)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists() && docSnap.data().formSchema) {
      formSchema.value = docSnap.data().formSchema
    }
  } catch (error) {
    toast.add({
      title: 'Error loading form',
      description: error.message,
      color: 'red'
    })
  }
}

// Save form schema with debounce
const saveSchema = debounce(async () => {
  // try {
  //   const docRef = doc(db, 'jobs', route.params.id)
  //   await setDoc(docRef, {
  //     formSchema: formSchema.value
  //   }, { merge: true }) // Important: merge to preserve other fields
    
  //   toast.add({
  //     title: 'Form saved',
  //     color: 'green'
  //   })
  // } catch (error) {
  //   toast.add({
  //     title: 'Error saving form',
  //     description: error.message,
  //     color: 'red'
  //   })
  // }
}, 5000)

// Validate the schema before saving
const validateSchema = () => {
  // Check for duplicate field IDs
  const fieldIds = formSchema.value.fields.map(f => f.id)
  const duplicateIds = fieldIds.filter((id, index) => fieldIds.indexOf(id) !== index)
  
  if (duplicateIds.length > 0) {
    toast.add({
      title: 'Validation error',
      description: `Duplicate field IDs found: ${duplicateIds.join(', ')}`,
      color: 'red'
    })
    return false
  }
  
  // Check for empty field labels
  const emptyLabels = formSchema.value.fields.filter(f => !f.label.trim())
  if (emptyLabels.length > 0) {
    toast.add({
      title: 'Validation error',
      description: 'Some fields are missing labels',
      color: 'red'
    })
    return false
  }
  
  return true
}

// Add a new field to the form
const addField = (type) => {
  const newField = {
    id: `field_${Date.now()}`,
    type,
    label: '',
    placeholder: '',
    required: false,
    validation: {},
    options: type === 'select' ? ['Option 1', 'Option 2'] : []
  }
  
  formSchema.value.fields.push(newField)
  saveSchema()
}

// Remove a field from the form
const removeField = (index) => {
  formSchema.value.fields.splice(index, 1)
  saveSchema()
}

const newValidation = ref(null) // Make sure this is declared

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

// Add a conditional logic rule
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

// Remove a conditional logic rule
const removeCondition = (index) => {
  formSchema.value.conditions.splice(index, 1)
  saveSchema()
}

// Watch for changes and auto-save
watch(formSchema, () => {
  if (validateSchema()) {
    saveSchema()
  }
}, { deep: true })

// Load schema when page mounts
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

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div class="lg:col-span-1 space-y-4">
        <UCard>
          <template #header>
            <h2 class="font-semibold">Field Types</h2>
          </template>

          <div class="space-y-2">
            <UButton
              v-for="type in fieldTypes"
              :key="type.value"
              @click="addField(type.value)"
              :icon="type.icon"
              :label="type.label"
              block
              color="gray"
              variant="outline"
            />
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="font-semibold">Form Settings</h2>
          </template>

          <UFormField label="Form Title">
            <UInput v-model="formSchema.title" />
          </UFormField>

          <UFormField label="Description" class="mt-4">
            <UTextarea v-model="formSchema.description" />
          </UFormField>
        </UCard>
      </div>

      <!-- Form Canvas -->
      <div class="lg:col-span-2 space-y-4">
        <UCard>
          <template #header>
            <h2 class="font-semibold">Form Preview</h2>
          </template>

          <div v-if="formSchema.fields.length === 0" class="text-center py-8 text-gray-500">
            <UIcon name="i-heroicons-inbox" class="w-12 h-12 mx-auto mb-4" />
            <p>No fields added yet</p>
            <p class="text-sm">Drag fields from the left or click to add</p>
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
                  <UInput v-model="field.label" />
                </UFormField>

                <UFormField label="Placeholder Text">
                  <UInput v-model="field.placeholder" />
                </UFormField>

                <UFormField label="Required">
                  <USwitch v-model="field.required" />
                </UFormField>

                <!-- Options for select fields -->
                <UFormField v-if="field.type === 'select'" label="Options">
                  <div class="space-y-2">
                    <div v-for="(option, i) in field.options" :key="i" class="flex items-center gap-2">
                      <UInput v-model="field.options[i]" />
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
                      @click="field.options.push('')"
                    />
                  </div>
                </UFormField>

                <!-- File upload settings -->
                <UFormField v-if="field.type === 'file'" label="Accepted File Types">
                  <UInput v-model="field.accept" placeholder="e.g. .pdf,.docx or image/*" />
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
                          class="flex-1"
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

                    <USelect
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

      <!-- Conditional Logic Panel -->
      <div class="lg:col-span-1 space-y-4">
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
                  <USelect
                    v-model="condition.fieldId"
                    :items="formSchema.fields.map(f => ({ value: f.id, label: f.label || f.id }))"
                  />
                </UFormField>

                <UFormField label="Operator">
                  <USelect
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
                  <UInput v-model="condition.value" />
                </UFormField>

                <UFormField label="Then">
                  <USelect
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
                  <USelect
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
              @click="addCondition"
            />
          </template>
        </UCard>
      </div>
    </div>

    {{ formSchema }}
  </UContainer>
</template>