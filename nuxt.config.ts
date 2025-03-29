// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  modules: ['@nuxt/icon', '@nuxt/ui', 'nuxt-vuefire', "nuxt-tiptap-editor"],
  tiptap: {
    prefix: "Tiptap", //prefix for Tiptap imports, composables not included
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
      apiKey: "AIzaSyA-8tWb3bycKMTM3hTQTlPYg6nKVnn3Xc0",
      authDomain: "wg-careers.firebaseapp.com",
      projectId: "wg-careers",
      storageBucket: "wg-careers.firebasestorage.app",
      messagingSenderId: "776646365351",
      appId: "1:776646365351:web:c5576c91f95b2396bf0b82",
      measurementId: "G-P360HX9R81"
    }
  }
})