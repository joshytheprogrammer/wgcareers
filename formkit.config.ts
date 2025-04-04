// formkit.config.ts
import { defineFormKitConfig } from '@formkit/vue'
import { rootClasses } from './formkit.theme'
import { generateClasses } from '@formkit/themes'
import { createMultiStepPlugin } from '@formkit/addons'
import '@formkit/addons/css/multistep'
 
export default defineFormKitConfig({
  config: {
    rootClasses,
    plugins: [createMultiStepPlugin()],
    classes: generateClasses({
      global: { // applies to all input types
        outer: 'max-w-full'
      },
      checkbox: {
        input: 'hidden peer', // Only need to hide the native input and establish peer relationship
        decorator: 'peer-checked:bg-indigo-600 peer-checked:border-indigo-600' // Only override checked state colors
      }
    })
  }
})