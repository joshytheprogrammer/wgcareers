// formkit.config.ts
import { defineFormKitConfig } from '@formkit/vue'
import { rootClasses } from './formkit.theme'
import { generateClasses } from '@formkit/themes'
 
export default defineFormKitConfig({
  config: {
    rootClasses,
    classes: generateClasses({
      global: { // applies to all input types
        outer: 'max-w-full'
      },
      // text: { // only applies to text input type
      //   outer: 'bizz',
      //   input: '$reset fizz'
      // },
      // email: { // only applies to email input type
      //   outer: 'bap',
      //   input: '$reset bop'
      // }
    })
  }
})