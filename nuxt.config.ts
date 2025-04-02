// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  modules: ['@nuxt/icon', '@nuxt/ui', 'nuxt-vuefire', "nuxt-tiptap-editor", '@formkit/nuxt', 'nuxt-pdfmake'],
  tiptap: {
    prefix: "Tiptap", //prefix for Tiptap imports, composables not included
  },
  formkit: {
    // Experimental support for auto loading (see note):
    autoImport: true
  },
  ui: {
    colorMode: false
  },
  vuefire: {
    auth: {
      enabled: true,
      sessionCookie: true 
    },
    config: {
      apiKey: process.env.API_KEY,
      authDomain: process.env.AUTH_DOMAIN,
      projectId: process.env.PROJECT_ID,
      storageBucket: process.env.STORAGE_BUCKET,
      messagingSenderId: process.env.MESSAGE_SENDER_ID,
      appId: process.env.APP_ID,
      measurementId: process.env.MEASUREMENT_ID 
    }
  }
})