<script setup>
import { ref, computed, watch, onMounted } from 'vue' // Added computed
import { doc, getDoc, setDoc } from 'firebase/firestore'
import debounce from 'lodash.debounce'
import { useFirestore } from 'vuefire' // Assuming you use vuefire
import { useRoute } from 'vue-router' // Assuming Nuxt routing
import { useToast } from '#imports' // Assuming Nuxt UI toast

const db = useFirestore()
const route = useRoute()
const toast = useToast()

// Form schema structure (Builder's internal representation)
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
  { value: 'checkbox', label: 'Checkbox', icon: 'i-heroicons-check-circle' }, // Note: Single checkbox for now
  { value: 'file', label: 'File Upload', icon: 'i-heroicons-paper-clip' }
  // Add more like 'radio', 'date', 'number' as needed
]

// Validation rule types
const validationTypes = [
  { value: 'required', label: 'Required' },
  { value: 'minLength', label: 'Minimum Length', formkitRule: 'length:min', needsArg: true, defaultArg: 5, argType: 'number' },
  { value: 'maxLength', label: 'Maximum Length', formkitRule: 'length:max', needsArg: true, defaultArg: 100, argType: 'number' },
  { value: 'pattern', label: 'Regex Pattern', formkitRule: 'matches', needsArg: true, defaultArg: '/.*/', argType: 'text' }, // FormKit uses 'matches'
  { value: 'min', label: 'Minimum Value', formkitRule: 'min', needsArg: true, defaultArg: 0, argType: 'number' }, // Usually for number inputs
  { value: 'max', label: 'Maximum Value', formkitRule: 'max', needsArg: true, defaultArg: 100, argType: 'number' } // Usually for number inputs
  // Add more like 'email', 'url', 'date_after', etc.
]

// --- Helper function to generate FormKit validation string ---
const generateValidationString = (field) => {
  let rules = []
  if (field.required) {
    rules.push('required')
  }
  if (field.validation) {
    for (const ruleKey in field.validation) {
      const ruleConfig = validationTypes.find(t => t.value === ruleKey)
      if (ruleConfig && ruleConfig.formkitRule) {
        if (ruleConfig.needsArg) {
          let arg = field.validation[ruleKey]
          // Ensure regex patterns are formatted correctly for FormKit (e.g., /pattern/modifiers)
          if (ruleConfig.formkitRule === 'matches' && typeof arg === 'string' && !arg.startsWith('/')) {
             arg = `/${arg.replace(/\//g, '\\/')}/` // Basic escaping, might need refinement
          }
          rules.push(`${ruleConfig.formkitRule}:${arg}`)
        } else {
          // For rules without args (like a potential custom 'isTrue' rule)
          rules.push(ruleConfig.formkitRule)
        }
      } else if (ruleKey === 'required' && field.validation[ruleKey] === false) {
        // Allows explicitly setting required to false via validation object if needed, though the switch is primary
         const index = rules.indexOf('required');
         if (index > -1) {
           rules.splice(index, 1);
         }
      }
       // Handle 'required' potentially being in field.validation for consistency if needed
      else if (ruleKey === 'required' && field.validation[ruleKey] === true && !rules.includes('required')) {
         rules.push('required');
      }
    }
  }
  return rules.join('|')
}

// --- Helper function to generate FormKit conditional logic string ---
const generateConditionString = (fieldId, allConditions) => {
  const fieldConditions = allConditions.filter(c => c.targetFieldId === fieldId)
  if (fieldConditions.length === 0) return undefined // No condition for this field

  // Simple example: Handle the first 'show'/'hide' condition found for a field
  // More complex logic (AND/OR) would require a more sophisticated condition builder UI
  const condition = fieldConditions[0] // Taking the first one for simplicity

  if (!condition.fieldId || !condition.operator || condition.value === undefined || !condition.action) {
    console.warn(`Incomplete condition for target ${fieldId}:`, condition)
    return undefined // Skip incomplete conditions
  }

  let op = '==' // Default: equals
  let val = JSON.stringify(condition.value) // Ensure strings are quoted

  switch (condition.operator) {
    case 'notEquals': op = '!='; break
    case 'contains': op = '.includes'; val = `(${JSON.stringify(condition.value)})`; break // Assumes source field is array or string
    case 'greaterThan': op = '>'; val = Number(condition.value); break // Attempt numeric comparison
    case 'lessThan': op = '<'; val = Number(condition.value); break // Attempt numeric comparison
    // Add more operators as needed
  }

  let conditionStr = `$get(${condition.fieldId}).value ${op} ${val}`

  // Handle 'contains' which needs to be called on the value
  if (condition.operator === 'contains') {
     conditionStr = `$get(${condition.fieldId}).value${op}${val}`
  }

  // Apply 'hide' logic by negating the condition
  if (condition.action === 'hide') {
    return `!(${conditionStr})`
  }
  if (condition.action === 'show') {
    return conditionStr
  }

  // Note: FormKit's 'if' primarily controls visibility.
  // Conditional 'required' or 'disabled' is more complex.
  // 'disabled' can sometimes be done similarly: `disabled="$get(other).value == 'someValue'"`
  // 'required' conditionally often requires more advanced schema logic or programmatic handling.
  // We will handle 'disabled' below in the main computed property.

  return undefined // Only handle show/hide via 'if' for now
}

// --- Computed property to generate FormKit Schema ---
const formKitSchema = computed(() => {
  return formSchema.value.fields.map(field => {
    const validationString = generateValidationString(field)
    const conditionString = generateConditionString(field.id, formSchema.value.conditions)

    // Handle conditional disabling
    const disablingCondition = formSchema.value.conditions.find(
        c => c.targetFieldId === field.id && c.action === 'disable'
    );
    let disabledValue = undefined;
    if (disablingCondition) {
        // Construct a condition string similar to generateConditionString but for the 'disabled' attribute
        let op = '=='
        let val = JSON.stringify(disablingCondition.value)
         switch (disablingCondition.operator) {
           case 'notEquals': op = '!='; break
           // Add other operators as needed, ensuring correct JS syntax
         }
         disabledValue = `$get(${disablingCondition.fieldId}).value ${op} ${val}`
    }

    // Base FormKit node
    const node = {
      $formkit: field.type, // Map directly if names match FormKit types
      name: field.id,       // Use unique ID as name
      label: field.label,
      placeholder: field.placeholder,
      // help: field.helpText, // Add if you have a help text property
    }

    // Add validation if rules exist
    if (validationString) {
      node.validation = validationString
    }

    // Add conditional visibility if condition exists
    if (conditionString) {
      node.if = conditionString
    }

     // Add conditional disabling
    if (disabledValue) {
        node.disabled = disabledValue;
    }

    // Add options for select/radio etc.
    if ((field.type === 'select' || field.type === 'radio') && field.options) {
      // FormKit can take array of strings or {label: '', value: ''} objects
      // Assuming simple string array based on your UI:
      node.options = field.options.filter(opt => opt?.trim()) // Ensure no empty options
    }

    // Add 'accept' attribute for file inputs using $bind or directly
    if (field.type === 'file' && field.accept) {
       node.accept = field.accept // Directly add accept attribute
       // Or using $bind:
       // node.$bind = {
       //   accept: field.accept
       // };
    }

    // Special handling for single checkbox (value is boolean)
    if (field.type === 'checkbox') {
        // For a single checkbox, FormKit typically uses true/false value.
        // No specific options needed unless it's part of a group.
    }


    return node
  })
})

// --- Firebase Interaction (Modified Save) ---
const loadSchema = async () => {
  if (!route.params.id) {
    console.warn("No route ID found for loading schema.")
    return
  }
  try {
    const docRef = doc(db, 'jobs', route.params.id)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
       // *** IMPORTANT DECISION ***
       // Option 1: Load the BUILDER's schema structure (easier for editing with current UI)
       if (docSnap.data().builderSchema) {
          formSchema.value = docSnap.data().formSchema
          toast.add({ title: 'Form loaded (Builder State)', color: 'blue' })
       // Option 2: Load the FormKit schema and TRY to convert back (Harder)
       // } else if (docSnap.data().formKitSchema) {
       //   // You would need a function here to parse formKitSchema back into your formSchema structure
       //   // This is complex, especially for validation and conditions.
       //   toast.add({ title: 'Form loaded (FormKit Schema - conversion needed)', color: 'orange' })
       } else if (docSnap.data().formSchema) { // Legacy fallback if you saved old structure
          formSchema.value = docSnap.data().formSchema;
          toast.add({ title: 'Form loaded (Legacy State)', color: 'yellow' })
       }
    } else {
        toast.add({ title: 'No existing form found, starting fresh.', color: 'blue' })
    }
  } catch (error) {
    console.error("Error loading form:", error)
    toast.add({
      title: 'Error loading form',
      description: error.message,
      color: 'red'
    })
  }
}

// Save form schema with debounce
const saveSchema = debounce(async () => {
  //  if (!route.params.id) {
  //   toast.add({ title: 'Error saving', description: 'Missing Job ID.', color: 'red' })
  //   return;
  //  }
  //  if (!validateSchema()) { // Validate builder schema before saving
  //      toast.add({ title: 'Validation Error', description: 'Please fix errors before saving.', color: 'red' })
  //      return;
  //  }

  // try {
  //   const docRef = doc(db, 'jobs', route.params.id)

  //   // *** IMPORTANT DECISION ***
  //   // Option 1: Save the BUILDER schema (easier editing) AND the generated FormKit schema (for rendering)
  //   await setDoc(docRef, {
  //     builderSchema: formSchema.value, // Save the structure the builder UI uses
  //     formKitSchema: formKitSchema.value // Save the generated FormKit schema
  //   }, { merge: true })

  //   // Option 2: Save ONLY the generated FormKit schema (pure FormKit approach, requires complex loading or UI changes)
  //   // await setDoc(docRef, {
  //   //   formKitSchema: formKitSchema.value // Save ONLY the generated FormKit schema
  //   //   // You might store title/description separately or outside the schema itself
  //   //   title: formSchema.value.title,
  //   //   description: formSchema.value.description,
  //   // }, { merge: true })

  //   toast.add({
  //     title: 'Form saved',
  //     color: 'green'
  //   })
  // } catch (error) {
  //    console.error("Error saving form:", error)
  //   toast.add({
  //     title: 'Error saving form',
  //     description: error.message,
  //     color: 'red'
  //   })
  // }
}, 3000) // Increased debounce slightly

// --- Builder UI Logic (Mostly unchanged, acts on `formSchema`) ---

const validateSchema = () => {
  // Check for duplicate field IDs (critical for FormKit 'name')
  const fieldIds = formSchema.value.fields.map(f => f.id)
  const duplicateIds = fieldIds.filter((id, index) => id && fieldIds.indexOf(id) !== index) // Check id exists

  if (duplicateIds.length > 0) {
    toast.add({
      title: 'Validation error',
      description: `Duplicate field IDs found: ${duplicateIds.join(', ')}. IDs must be unique.`,
      color: 'red'
    })
    return false
  }

  // Check for empty field labels or IDs
  const invalidFields = formSchema.value.fields.filter(f => !f.id?.trim() || !f.label?.trim())
  if (invalidFields.length > 0) {
    toast.add({
      title: 'Validation error',
      description: `Fields must have both an ID and a Label. Problem fields: ${invalidFields.map(f => f.id || f.label || 'New Field').join(', ')}`,
      color: 'red'
    })
    return false
  }

  // Validate condition references
  for (const condition of formSchema.value.conditions) {
      if (!condition.fieldId || !formSchema.value.fields.some(f => f.id === condition.fieldId)) {
          toast.add({title: 'Validation Error', description: `Condition uses invalid source field ID: ${condition.fieldId}`, color: 'red'});
          return false;
      }
       if (!condition.targetFieldId || !formSchema.value.fields.some(f => f.id === condition.targetFieldId)) {
          toast.add({title: 'Validation Error', description: `Condition uses invalid target field ID: ${condition.targetFieldId}`, color: 'red'});
          return false;
      }
  }


  return true
}

const addField = (type) => {
    const fieldConfig = fieldTypes.find(t => t.value === type);
    if (!fieldConfig) return;

    const newField = {
        // Use more robust ID generation if needed (e.g., uuid)
        id: `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type,
        label: `New ${fieldConfig.label}`, // Default label
        placeholder: '',
        required: false,
        validation: {}, // Initialize validation object
        options: type === 'select' || type === 'radio' ? ['Option 1', 'Option 2'] : undefined,
        accept: type === 'file' ? '' : undefined, // Add accept for file type
    };

    formSchema.value.fields.push(newField);
    // saveSchema() // Let watcher handle saving
};

const removeField = (index) => {
    const removedFieldId = formSchema.value.fields[index]?.id;
    formSchema.value.fields.splice(index, 1);
    // Also remove conditions referencing the deleted field
    formSchema.value.conditions = formSchema.value.conditions.filter(
        c => c.fieldId !== removedFieldId && c.targetFieldId !== removedFieldId
    );
    // saveSchema() // Let watcher handle saving
};

const newValidationRuleRefs = ref({}); // Store dropdown selections per field

// Modified addValidation function
const addValidation = (field, ruleValue) => {
    if (!ruleValue || !field) return; // Skip if no rule selected or field missing

    const ruleConfig = validationTypes.find(t => t.value === ruleValue);
    if (!ruleConfig) return;

    if (!field.validation) field.validation = {}; // Ensure validation object exists

    // Avoid adding duplicates
    if (field.validation.hasOwnProperty(ruleValue)) return;


    if (ruleValue === 'required') {
        // Special handling: directly set the required flag for simplicity, remove from validation obj if exists
        field.required = true;
        if (field.validation.required !== undefined) {
           delete field.validation.required;
        }
    } else {
         // Use default value from ruleConfig if available
        field.validation[ruleValue] = ruleConfig.defaultArg ?? '';
         // If required was in validation obj, ensure flag is set
         if(ruleValue === 'required' && field.validation.required === true){
             field.required = true;
             delete field.validation.required; // Keep validation obj clean of 'required'
         }
    }

    // Reset the specific dropdown for this field
    if (newValidationRuleRefs.value[field.id]) {
         newValidationRuleRefs.value[field.id] = null;
    }
    // saveSchema() // Let watcher handle saving
};

// Get validation label for display
const getValidationLabel = (ruleKey) => {
  return validationTypes.find(t => t.value === ruleKey)?.label || ruleKey
}
// Get validation argument type
const getValidationArgType = (ruleKey) => {
  return validationTypes.find(t => t.value === ruleKey)?.argType || 'text'
}

// Remove a validation rule from a field
const removeValidation = (field, ruleKey) => {
    if (!field) return;

    if (ruleKey === 'required') {
        field.required = false; // Turn off the main flag
        // Also remove if it somehow ended up in validation object
         if (field.validation && field.validation.required !== undefined) {
            delete field.validation.required;
        }
    } else if (field.validation && field.validation[ruleKey] !== undefined) {
        // Create a new validation object without the rule to ensure reactivity
        const updatedValidation = { ...field.validation };
        delete updatedValidation[ruleKey];
        field.validation = updatedValidation; // Assign new object
    }
    // saveSchema() // Let watcher handle saving
};

// Add a conditional logic rule
const addCondition = () => {
    // Find first available field IDs for defaults, if possible
    const defaultSourceId = formSchema.value.fields[0]?.id || '';
    const defaultTargetId = formSchema.value.fields.length > 1 ? formSchema.value.fields[1]?.id : defaultSourceId || '';

    formSchema.value.conditions.push({
        id: `cond_${Date.now()}`,
        fieldId: defaultSourceId, // Source field triggering the condition
        operator: 'equals',
        value: '',
        action: 'show',         // 'show', 'hide', 'require', 'disable'
        targetFieldId: defaultTargetId // Field being affected
    });
    // saveSchema() // Let watcher handle saving
};

// Remove a conditional logic rule
const removeCondition = (index) => {
  formSchema.value.conditions.splice(index, 1)
  // saveSchema() // Let watcher handle saving
}

// Watch for changes and auto-save
watch(formSchema, (newValue, oldValue) => {
  // Basic check to avoid saving on initial load if schema was empty
  if (oldValue && (oldValue.fields?.length > 0 || newValue.fields?.length > 0) ) {
      saveSchema() // Debounced save triggered by watcher
  }
}, { deep: true })

// Load schema when page mounts
onMounted(loadSchema);

// Helper for select dropdown options - filter out rules already added or 'required'
const availableValidationRules = (field) => {
    if (!field || !field.validation) return validationTypes.filter(t => t.value !== 'required'); // Exclude required from dropdown
    return validationTypes.filter(t => t.value !== 'required' && !field.validation.hasOwnProperty(t.value));
};

// Computed property for field options in conditional logic dropdowns
const fieldOptionsForConditions = computed(() => {
    return formSchema.value.fields
        .filter(f => f.label?.trim() && f.id) // Ensure field has label and ID
        .map(f => ({ value: f.id, label: `${f.label} (${f.id})` })) // Show label and ID
        .sort((a, b) => a.label.localeCompare(b.label)); // Sort alphabetically
});

</script>

<template>
  <UContainer class="py-8">
    <div class="flex items-center justify-between mb-8">
      <h1 class="text-2xl font-bold">Form Builder</h1>
       <UInput v-model="formSchema.title" placeholder="Form Title" class="text-xl mx-4 flex-grow"/>
      <UButton
        to="/admin/dashboard"
        icon="i-heroicons-arrow-left"
        label="Back"
        color="gray"
        variant="ghost"
      />
    </div>

    <UTextarea v-model="formSchema.description" placeholder="Optional form description..." class="mb-6"/>


    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div class="lg:col-span-3 space-y-4">
        <UCard>
          <template #header>
            <h2 class="font-semibold">Add Fields</h2>
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
              size="sm"
            />
          </div>
        </UCard>

         <UCard>
            <template #header>
                <h2 class="font-semibold">Conditional Logic</h2>
            </template>

            <div v-if="formSchema.fields.length < 2" class="text-center py-4 text-gray-500 text-sm">
                Add at least two fields to use conditional logic.
            </div>
            <div v-else-if="formSchema.conditions.length === 0" class="text-center py-4 text-gray-500 text-sm">
                No conditions added yet.
            </div>

             <div v-if="formSchema.fields.length >= 2" class="space-y-4">
                <div v-for="(condition, index) in formSchema.conditions" :key="condition.id" class="border rounded-lg p-3 relative bg-gray-50 dark:bg-gray-800">
                    <UButton
                        icon="i-heroicons-x-mark"
                        color="red"
                        variant="link"
                        size="xs"
                        class="absolute top-1 right-1"
                        @click="removeCondition(index)"
                    />
                    <p class="text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">Condition {{ index + 1 }}</p>
                    <div class="space-y-2 text-sm">
                        <UFormGroup label="If this field" size="xs">
                             <USelectMenu
                                v-model="condition.fieldId"
                                :options="fieldOptionsForConditions"
                                value-attribute="value"
                                option-attribute="label"
                                placeholder="Select Source Field"
                                searchable
                            />
                        </UFormGroup>
                        <UFormGroup label="Operator" size="xs">
                            <USelectMenu
                                v-model="condition.operator"
                                :options="[
                                    { value: 'equals', label: 'Equals' },
                                    { value: 'notEquals', label: 'Does not equal' },
                                    { value: 'contains', label: 'Contains' },
                                    { value: 'greaterThan', label: 'Greater than' },
                                    { value: 'lessThan', label: 'Less than' }
                                ]"
                                value-attribute="value"
                                option-attribute="label"
                            />
                        </UFormGroup>
                         <UFormGroup label="Value" size="xs">
                            <UInput v-model="condition.value" size="xs" placeholder="Value to check" />
                         </UFormGroup>
                        <UFormGroup label="Then" size="xs">
                            <USelectMenu
                                v-model="condition.action"
                                :options="[
                                    { value: 'show', label: 'Show' },
                                    { value: 'hide', label: 'Hide' },
                                    // { value: 'require', label: 'Require' }, // Note: Complex to implement reliably via schema alone
                                    { value: 'disable', label: 'Disable' }
                                ]"
                                value-attribute="value"
                                option-attribute="label"
                             />
                        </UFormGroup>
                        <UFormGroup label="This field" size="xs">
                             <USelectMenu
                                v-model="condition.targetFieldId"
                                :options="fieldOptionsForConditions.filter(f => f.value !== condition.fieldId)"
                                value-attribute="value"
                                option-attribute="label"
                                placeholder="Select Target Field"
                                searchable
                            />
                        </UFormGroup>
                    </div>
                </div>
            </div>

            <template #footer v-if="formSchema.fields.length >= 2">
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

      <div class="lg:col-span-6 space-y-4">
        <UCard>
          <template #header>
            <h2 class="font-semibold">Form Fields Editor</h2>
          </template>

          <div v-if="formSchema.fields.length === 0" class="text-center py-12 text-gray-500">
            <UIcon name="i-heroicons-document-plus" class="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>Add fields using the buttons on the left.</p>
            <p class="text-sm">Configure them here once added.</p>
          </div>

          <div v-else class="space-y-5">
            <div v-for="(field, index) in formSchema.fields" :key="field.id" class="border dark:border-gray-700 rounded-lg p-4 relative group hover:border-primary-500 dark:hover:border-primary-400 transition-colors duration-150">
               <div class="flex justify-between items-center mb-3">
                    <div class="flex items-center gap-2 font-medium">
                      <UIcon :name="fieldTypes.find(t => t.value === field.type)?.icon || 'i-heroicons-question-mark-circle'" class="w-5 h-5 text-gray-500" />
                      <span>{{ field.label || `Field ${index + 1}` }}</span>
                      <UBadge v-if="field.required" label="Required" size="xs" color="red" variant="soft" />
                    </div>
                    <UButton
                        icon="i-heroicons-trash"
                        color="red"
                        variant="ghost"
                        size="xs"
                        class="opacity-50 group-hover:opacity-100 transition-opacity"
                        @click="removeField(index)"
                    />
                </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 text-sm">
                 <div class="space-y-3">
                    <UFormGroup label="Field Label" :name="`${field.id}_label`" required size="sm">
                        <UInput v-model="field.label" placeholder="Enter Label"/>
                    </UFormGroup>
                    <UFormGroup label="Field ID (Name)" :name="`${field.id}_id`" required size="sm">
                        <UInput v-model="field.id" placeholder="Unique identifier (no spaces)" />
                        <template #help>Used internally and in conditions. Must be unique.</template>
                    </UFormGroup>
                     <UFormGroup label="Placeholder Text" :name="`${field.id}_placeholder`" size="sm">
                        <UInput v-model="field.placeholder" />
                     </UFormGroup>

                      <UFormGroup v-if="field.type === 'select' || field.type === 'radio'" label="Options" :name="`${field.id}_options`" size="sm">
                      <div class="space-y-2">
                        <div v-for="(option, i) in field.options" :key="i" class="flex items-center gap-2">
                          <UInput v-model="field.options[i]" placeholder="Option Label" class="flex-grow" />
                          <UButton
                            icon="i-heroicons-trash" color="red" variant="ghost" size="2xs"
                            @click="field.options.splice(i, 1)"
                          />
                        </div>
                        <UButton icon="i-heroicons-plus" label="Add Option" size="xs" variant="outline" @click="field.options.push('')"/>
                      </div>
                    </UFormGroup>

                     <UFormGroup v-if="field.type === 'file'" label="Accepted File Types" :name="`${field.id}_accept`" size="sm">
                        <UInput v-model="field.accept" placeholder=".pdf, image/*, .doc, .docx" />
                        <template #help>Comma-separated list (e.g., .pdf,.docx,image/*)</template>
                    </UFormGroup>
                 </div>

                 <div class="space-y-3">
                       <UFormGroup label="Required Field" :name="`${field.id}_required`" size="sm">
                         <UToggle v-model="field.required" @update:model-value="removeValidation(field, 'required')"/>
                      </UFormGroup>

                     <UFormGroup label="Validation Rules" :name="`${field.id}_validation`" size="sm">
                        <div class="space-y-2">
                           <div v-for="(argValue, ruleKey) in field.validation" :key="ruleKey" class="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                                <span class="text-xs font-medium flex-shrink-0">{{ getValidationLabel(ruleKey) }}</span>
                                <UInput
                                    v-if="validationTypes.find(t => t.value === ruleKey)?.needsArg"
                                    v-model="field.validation[ruleKey]"
                                    :type="getValidationArgType(ruleKey)"
                                    size="xs"
                                    class="flex-grow"
                                    :placeholder="`Enter ${getValidationLabel(ruleKey)} value`"
                                />
                                <span v-else class="flex-grow"></span> <UButton
                                    icon="i-heroicons-trash" color="red" variant="ghost" size="2xs"
                                    @click="removeValidation(field, ruleKey)"
                                />
                            </div>

                            <USelectMenu
                                v-if="availableValidationRules(field).length > 0"
                                v-model="newValidationRuleRefs[field.id]"
                                :options="availableValidationRules(field)"
                                value-attribute="value"
                                option-attribute="label"
                                placeholder="+ Add Rule"
                                size="sm"
                                @update:model-value="(val) => addValidation(field, val)"
                            />
                             <p v-else class="text-xs text-gray-500">No more validation rules available.</p>
                        </div>
                    </UFormGroup>
                  </div>

              </div>
            </div>
          </div>
        </UCard>
      </div>

       <div class="lg:col-span-3 space-y-4">
            <UCard>
                <template #header>
                    <h2 class="font-semibold">Live Preview (FormKit)</h2>
                </template>
                 <div class="p-4 border rounded dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                     <FormKit type="form" #default="{ value }" :actions="false"> <FormKitSchema :schema="formKitSchema" />
                         <pre class="mt-4 p-2 text-xs bg-gray-100 dark:bg-gray-900 rounded overflow-auto">{{ value }}</pre>
                     </FormKit>
                 </div>
                 <template #footer>
                     <p class="text-xs text-gray-500">This is a live rendering using the generated FormKit schema.</p>
                 </template>
            </UCard>
             <UCard>
                 <template #header><h2 class="font-semibold">Generated Schema</h2></template>
                 <div class="max-h-96 overflow-auto p-2 bg-gray-100 dark:bg-gray-900 rounded">
                    <pre class="text-xs">{{ JSON.stringify(formKitSchema, null, 2) }}</pre>
                 </div>
                  <template #footer>
                     <p class="text-xs text-gray-500">This JSON is what gets saved as `formKitSchema` in Firebase.</p>
                 </template>
            </UCard>
       </div>

    </div>

     </UContainer>
</template>

<style>
/* Optional: Add some styling for drag handles if using vuedraggable */
.drag-handle {
  cursor: grab;
}
.sortable-ghost {
  opacity: 0.4;
  background-color: #eee;
}
</style>