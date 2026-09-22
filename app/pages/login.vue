<script setup lang="ts">
import '~/assets/css/dashboard.css'
import '~/assets/css/auth.css'

definePageMeta({ layout: false })
useSeoMeta({ title: 'Kirish — ERP Sport AI' })
const auth = useAuth()
const { isLoading, error } = auth
const username = ref('')
const password = ref('')
async function submit() {
  try {
    if (await auth.login(username.value, password.value)) await navigateTo('/')
  } catch { /* Service provides the safe error. */ } finally { password.value = '' }
}
async function retrySession() {
  try {
    await auth.loadCurrentUser()
    if (auth.isAuthenticated.value) await navigateTo('/')
  } catch { /* Safe error is in centralized state. */ }
}
onBeforeUnmount(() => {
  password.value = ''
})
</script>

<template>
  <main class="erp-shell auth-screen">
    <section
      class="erp-panel auth-card"
      aria-labelledby="login-title"
    >
      <div class="auth-heading">
        <span class="erp-brand-icon"><UIcon name="i-lucide-shield-check" /></span><ThemeToggle />
      </div>
      <p class="auth-eyebrow">
        ERP SPORT AI
      </p>
      <h1 id="login-title">
        Tizimga kirish
      </h1>
      <p class="auth-muted">
        Hisobingiz orqali ish maydoniga kiring.
      </p>
      <form
        class="auth-form"
        :aria-busy="isLoading"
        @submit.prevent="submit"
      >
        <label class="auth-field">Login<input
          v-model="username"
          name="username"
          autocomplete="username"
          required
          maxlength="100"
          :disabled="isLoading"
        ></label>
        <label class="auth-field">Parol<input
          v-model="password"
          name="password"
          type="password"
          autocomplete="current-password"
          required
          maxlength="1024"
          :disabled="isLoading"
        ></label>
        <p
          v-if="error"
          class="auth-error"
          role="alert"
        >
          {{ error }}
        </p>
        <button
          class="auth-button"
          type="submit"
          :disabled="isLoading"
        >
          {{ isLoading ? 'Kutilmoqda…' : 'Kirish' }}
        </button>
        <button
          v-if="error"
          class="auth-link"
          type="button"
          :disabled="isLoading"
          @click="retrySession"
        >
          Sessiyani qayta tekshirish
        </button>
      </form>
    </section>
  </main>
</template>
