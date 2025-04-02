<script setup>
import { doc, getDoc, setDoc } from 'firebase/firestore'
import debounce from 'lodash.debounce'
import { ref, computed, watch, onMounted } from 'vue'

const db = useFirestore()
const route = useRoute()
const toast = useToast()

const initialLoad = ref(true);
const lastSavedSchema = ref(null); // Track last saved state

// Form schema structure
const formSchema = ref({
  title: '',
  description: '',
  formStatus: 'draft',
  fields: [],
  conditions: []
})

// Available field types
const fieldTypes = [
  { value: 'text', label: 'Text Input', icon: 'i-heroicons-pencil' },
  { value: 'textarea', label: 'Text Area', icon: 'i-heroicons-document-text' },
  { value: 'email', label: 'Email', icon: 'i-heroicons-envelope' },
  { value: 'date', label: 'Date', icon: 'i-heroicons-calendar' },
  { value: 'tel', label: 'Phone', icon: 'i-heroicons-phone' },
  { value: 'url', label: 'URL', icon: 'i-heroicons-link' },
  { value: 'select', label: 'Select', icon: 'i-heroicons-chevron-down' },
  { value: 'checkbox', label: 'Checkbox', icon: 'i-heroicons-check-circle' },
  { value: 'radio', label: 'Radio', icon: 'i-heroicons-radio' }
]

// Simplified validation types
const validationTypes = [
  { value: 'minLength', label: 'Minimum Length', needsArg: true, argType: 'number', defaultArg: 5 },
  { value: 'maxLength', label: 'Maximum Length', needsArg: true, argType: 'number', defaultArg: 100 },
  { value: 'pattern', label: 'Regex Pattern', needsArg: true, argType: 'text' },
  { value: 'min', label: 'Minimum Value', needsArg: true, argType: 'number', defaultArg: 0 },
  { value: 'max', label: 'Maximum Value', needsArg: true, argType: 'number', defaultArg: 100 },
]

// Simplified schema generation
const formKitSchema = computed(() => {
  return formSchema.value.fields.map(field => {
    if (!field || !field.id || !field.type) return null;

    const validationRules = [];
    
    // Handle required state (only from toggle)
    if (field.required) validationRules.push('required');
    
    // Handle built-in type validation (optional but good practice)
    if (field.type === 'email') validationRules.push('email');
    if (field.type === 'url') validationRules.push('url');
    if (field.type === 'date') validationRules.push('date');


    // Process validation rules
    for (const [rule, value] of Object.entries(field.validation || {})) {
      switch(rule) {
        case 'minLength': 
          validationRules.push(`length:${value},${field.validation.maxLength || ''}`);
          break;
        case 'maxLength': 
          if (!field.validation.minLength) validationRules.push(`length:0,${value}`);
          break;
        case 'pattern': 
          if (typeof value === 'string' && value.trim()) {
            validationRules.push(`matches:${value.trim()}`);
          }
          break;
        case 'min': 
          validationRules.push(`number:${value},${field.validation.max || ''}`);
          break;
        case 'max': 
          if (!field.validation.min) validationRules.push(`number:0,${value}`);
          break;
      }
    }

    // Base field config
    const baseField = {
      $formkit: field.type,
      name: field.id,
      label: field.label,
      placeholder: field.placeholder,
      validation: validationRules.join('|') || undefined,
    };

    // Type-specific handling
    switch(field.type) {
      case 'select':
      case 'radio':
        return { 
          ...baseField, 
          options: Array.isArray(field.options) 
            ? field.options.map(opt => String(opt).trim()).filter(opt => opt)
            : [] 
        };
      case 'checkbox':
        return Array.isArray(field.options) && field.options.length > 0
          ? { ...baseField, options: field.options }
          : baseField;
      default:
        return baseField;
    }
  }).filter(field => field !== null);
});

// Firebase integration with change detection
const loadSchema = async () => {
  try {
    const docRef = doc(db, 'jobs', route.params.id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      
      // Merge job data with form schema
      formSchema.value = {
        title: data.formSchema?.title || data.title + 'Application Form',
        description: data.formSchema?.description || `We're looking for talented candidates to fill this position. Please complete the application form to be considered for the ${data.title || 'role'}.`,
        formStatus: data.formSchema?.formStatus || 'draft',
        fields: data.formSchema?.fields || [],
        conditions: data.formSchema?.conditions || []
      };
      
      lastSavedSchema.value = JSON.stringify(data.formSchema); // Store last saved state
    }
  } catch (error) {
    toast.add({ 
      title: 'Error loading form', 
      description: error.message, 
      color: 'red' 
    });
  } finally {
    initialLoad.value = false;
  }
};

const saveSchema = debounce(async () => {
  // Don't save if no changes detected
  const currentSchema = JSON.stringify(formSchema.value);
  if (lastSavedSchema.value === currentSchema) {
    return;
  }

  if (!validateSchema()) return;
  
  try {
    const dataToSave = {
      formSchema: JSON.parse(currentSchema),
      formKitSchema: JSON.parse(JSON.stringify(formKitSchema.value))
    };

    await setDoc(doc(db, 'jobs', route.params.id), dataToSave, { merge: true });
    
    lastSavedSchema.value = currentSchema; // Update last saved state
    
    toast.add({ 
      title: 'Form saved', 
      color: 'green',
      timeout: 2000
    });
  } catch (error) {
    toast.add({ 
      title: 'Error saving form', 
      description: error.message, 
      color: 'red' 
    });
  }
}, 2000);

// Validation
const validateSchema = () => {
  const fieldIds = formSchema.value.fields.map(f => f.id?.trim()).filter(id => id);
  const duplicateIds = fieldIds.filter((id, index) => fieldIds.indexOf(id) !== index);
  
  if (duplicateIds.length) {
    toast.add({ 
      title: 'Validation error', 
      description: `Duplicate IDs: ${duplicateIds.join(', ')}`, 
      color: 'red',
      timeout: 5000
    });
    return false;
  }
  
  const invalidFields = formSchema.value.fields.filter(f => !f.id?.trim() || !f.label?.trim());
  if (invalidFields.length) {
    toast.add({ 
      title: 'Validation error', 
      description: `Fields must have both ID and Label`, 
      color: 'red',
      timeout: 5000
    });
    return false;
  }
  
  return true;
};

// Field management
const addField = (type) => {
  const uniquePart = Math.random().toString(36).substring(2, 9);
  const baseId = `${type}_${uniquePart}`;
  const fieldConfig = fieldTypes.find(t => t.value === type);

  const baseField = {
    id: baseId,
    type,
    label: fieldConfig ? `New ${fieldConfig.label}` : 'New Field',
    placeholder: '',
    required: false,
    validation: {}
  };

  // Type-specific defaults
  switch(type) {
    case 'select':
    case 'radio':
      formSchema.value.fields.push({ ...baseField, options: ['Option 1', 'Option 2'] });
      break;
    case 'checkbox':
      formSchema.value.fields.push({ 
        ...baseField, 
        options: ['Option 1', 'Option 2'],
        multiple: true 
      });
      break;
    default:
      formSchema.value.fields.push(baseField);
  }
};

const removeField = (index) => {
  formSchema.value.fields.splice(index, 1);
};

// Validation management
const newValidation = ref({});

const addValidation = (field, ruleValue) => {
  if (!ruleValue || !field) return;
  
  const ruleConfig = validationTypes.find(t => t.value === ruleValue);
  if (!ruleConfig) return;

  if (!field.validation) field.validation = {};

  if (!field.validation[ruleValue]) {
    field.validation[ruleValue] = ruleConfig.defaultArg ?? '';
  }

  if (newValidation.value[field.id]) {
    newValidation.value[field.id] = null;
  }
};

const getValidationLabel = (rule) => {
  return validationTypes.find(t => t.value === rule)?.label || rule;
};

const removeValidation = (field, rule) => {
  if (!field || !field.validation || field.validation[rule] === undefined) return;
  
  const { [rule]: _, ...rest } = field.validation;
  field.validation = rest;
};

// Condition logic
const addCondition = () => {
  formSchema.value.conditions.push({
    id: `cond_${Date.now()}`,
    fieldId: '',
    operator: 'equals',
    value: '',
    action: 'show',
    targetFieldId: ''
  });
};

const removeCondition = (index) => {
  formSchema.value.conditions.splice(index, 1);
};

// Watch for changes with efficient saving
watch(formSchema, () => {
  if (!initialLoad.value) {
    saveSchema();
  }
}, { deep: true });

// Watch for form schema empty to disabe form
watch(() => formSchema.value.fields, (fields) => {
  if (fields.length === 0) {
    formSchema.value.formStatus = 'draft'
  }
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
          <div class="space-y-4">
            <UFormField label="Form Title">
              <UInput class="w-full" v-model="formSchema.title" />
            </UFormField>
            <UFormField label="Description">
              <UTextarea :rows="12" class="w-full" v-model="formSchema.description" />
            </UFormField>
            <UFormField label="Form Status">
              <USelect 
                v-model="formSchema.formStatus"
                :items="[
                  { value: 'draft', label: 'Draft' },
                  { value: 'live', label: 'Live' }
                ]"
                class="w-full"
              />
            </UFormField>
          </div>
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

                <UFormField v-if="['select', 'radio', 'checkbox'].includes(field.type)" label="Options">
                  <div class="space-y-2">
                    <div v-for="(option, i) in field.options" :key="i" class="flex items-center gap-2">
                      <UInput class="w-full" v-model="field.options[i]" />
                      <UButton
                        icon="i-heroicons-trash"
                        color="red"
                        variant="ghost"
                        size="xs"
                        @click="field.options.splice(i, 1)"
                        :disabled="field.type === 'checkbox' && field.options.length <= 1"
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

                <!-- Multiple selection for checkboxes -->
                <UFormField v-if="field.type === 'checkbox'" label="Multiple Selection">
                  <USwitch v-model="field.multiple" />
                </UFormField>

                <!-- Date format configuration -->
                <UFormField v-if="field.type === 'date'" label="Date Format">
                  <USelect 
                    v-model="field.format"
                    :items="[
                      { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
                      { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                      { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' }
                    ]"
                  />
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
        <!-- Quick Form Toolbox -->
        <UCard v-if="formSchema.fields.length != 0">
          <template #header>
            <h2 class="font-semibold">Quick Add Fields</h2>
            <p class="text-sm text-gray-500 mt-1">Click to add new fields to your form</p>
          </template>
          
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <UButton
              v-for="type in fieldTypes"
              :key="type.value"
              @click="addField(type.value)"
              :icon="type.icon"
              :label="type.label"
              color="gray"
              variant="outline"
              size="sm"
              class="h-full"
            />
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
            <p class="text-xs text-gray-500">This is a live rendering using the generated FormKit schema. It may not always be accurate</p>
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
