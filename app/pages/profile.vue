<script setup lang="ts">
import '~/assets/css/auth.css'
import { roleLabels } from '~/types/auth'
import type { ProfilePatch } from '~/types/auth'
import { safeApiMessage } from '~/services/apiClient'

useSeoMeta({ title: 'Profil — ERP Sport AI' })
const auth = useAuth()
const { user, roles, isLoading } = auth
const username = ref(user.value?.username ?? '')
const fullName = ref(user.value?.fullName ?? '')
const error = ref('')
const success = ref('')
const patch = computed<ProfilePatch>(() => ({
  ...(username.value.trim() !== user.value?.username ? { username: username.value.trim() } : {}),
  ...(fullName.value !== (user.value?.fullName ?? '') ? { fullName: fullName.value || null } : {})
}))
const dirty = computed(() => Object.keys(patch.value).length > 0)
async function save() {
  if (!dirty.value || isLoading.value) return
  error.value = ''
  success.value = ''
  if (!username.value.trim() || username.value.trim().length > 100 || fullName.value.length > 255) {
    error.value = 'Kiritilgan ma\'lumotlarni tekshiring.'
    return
  }
  try {
    if (await auth.updateProfile(patch.value)) {
      username.value = user.value!.username
      fullName.value = user.value!.fullName ?? ''
      success.value = 'Profil ma’lumotlari saqlandi.'
    }
  } catch (cause) { error.value = safeApiMessage(cause) }
}
</script>

<template>
  <div>
    <WorkspaceHeading
      title="Profil"
      description="Shaxsiy ma’lumotlar va hisob xavfsizligi."
      eyebrow="HISOB"
    />
    <div class="auth-profile-grid">
      <section
        class="erp-panel auth-card"
        aria-labelledby="profile-title"
      >
        <h2 id="profile-title">
          Shaxsiy ma’lumotlar
        </h2>
        <p class="auth-muted">
          {{ roles.map(role => roleLabels[role] ?? role).join(', ') }}
        </p>
        <form
          class="auth-form"
          :aria-busy="isLoading"
          @submit.prevent="save"
        >
          <label class="auth-field">F.I.Sh.<input
            v-model="fullName"
            autocomplete="name"
            maxlength="255"
            :disabled="isLoading"
          ></label>
          <label class="auth-field">Login<input
            v-model="username"
            autocomplete="username"
            required
            maxlength="100"
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
            :disabled="isLoading || !dirty"
          >
            {{ isLoading ? 'Kutilmoqda…' : 'Saqlash' }}
          </button>
        </form>
      </section>
      <PasswordChangeForm />
    </div>
  </div>
</template>
