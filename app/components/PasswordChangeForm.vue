<script setup lang="ts">
import { createPasswordForm } from '~/composables/passwordForm'

const auth = useAuth()
const { isLoading } = auth
const form = createPasswordForm(auth.changePassword)
const { currentPassword, newPassword, confirmation, saving, error, success, submit } = form
const toast = useToast()
watch(success, (message) => {
  if (message) toast.add({ title: message, color: 'success' })
})
onBeforeUnmount(form.clear)
</script>

<template>
  <section
    class="erp-panel auth-card"
    aria-labelledby="password-title"
  >
    <h2 id="password-title">
      Parolni o‘zgartirish
    </h2>
    <p class="auth-muted">
      Yangi parol 12–1024 belgidan iborat bo‘lsin.
    </p>
    <form
      class="auth-form"
      :aria-busy="saving"
      @submit.prevent="submit"
    >
      <label class="auth-field">Joriy parol<input
        v-model="currentPassword"
        type="password"
        autocomplete="current-password"
        maxlength="1024"
        required
        :disabled="isLoading"
      ></label>
      <label class="auth-field">Yangi parol<input
        v-model="newPassword"
        type="password"
        autocomplete="new-password"
        minlength="12"
        maxlength="1024"
        required
        :disabled="isLoading"
      ></label>
      <label class="auth-field">Yangi parolni tasdiqlash<input
        v-model="confirmation"
        type="password"
        autocomplete="new-password"
        minlength="12"
        maxlength="1024"
        required
        :disabled="isLoading"
      ></label>
      <p
        v-if="error"
        class="auth-error"
        role="alert"
      >
        {{ error }}
      </p>
      <p
        v-if="success"
        class="auth-success"
        role="status"
      >
        {{ success }}
      </p>
      <button
        class="auth-button"
        :disabled="saving || isLoading"
      >
        {{ saving ? 'Saqlanmoqda…' : 'Parolni o‘zgartirish' }}
      </button>
    </form>
  </section>
</template>
