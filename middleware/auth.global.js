export default defineNuxtRouteMiddleware(async (to) => {
  // Only run on client side
  if (process.server) return
  
  const user = await getCurrentUser()

  // If trying to access protected admin route without auth
  if (to.path.startsWith('/admin') && to.path !== '/admin/login' && !user) {
    return navigateTo('/admin/login', { redirectCode: 301 })
  }

  // If logged in but trying to access login page
  if (to.path === '/admin/login' && user) {
    return navigateTo('/admin/dashboard')
  }
})