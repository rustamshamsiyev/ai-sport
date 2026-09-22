<script setup lang="ts">
import { dashboardModules, managementNavigation, systemNavigation } from '~/data/dashboard'
import { roleLabels } from '~/types/auth'
import '~/assets/css/auth.css'

defineProps<{ mobileOpen: boolean }>()
defineEmits<{ openMenu: [] }>()
const route = useRoute()
const auth = useAuth()
const { user, roles } = auth
const displayName = computed(() => user.value?.fullName || user.value?.username || '')
const initials = computed(() => displayName.value.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase())
const userMenu = [
  { label: 'Profil', icon: 'i-lucide-user', to: '/profile' },
  { label: 'Chiqish', icon: 'i-lucide-log-out', onSelect: () => { void auth.logout() } }
]
const menuTrigger = ref<HTMLButtonElement | null>(null)
defineExpose({ focusMenu: () => menuTrigger.value?.focus() })
const current = computed(() => [...dashboardModules.map(m => ({ title: m.title, to: '/' + m.slug })), ...managementNavigation, ...systemNavigation].find(m => route.path === m.to || route.path.startsWith(m.to + '/')))
</script>

<template>
  <header class="erp-header">
    <div class="erp-header-start">
      <button
        ref="menuTrigger"
        class="erp-icon-button erp-mobile-trigger"
        aria-label="Navigatsiyani ochish"
        :aria-expanded="mobileOpen"
        @click="$emit('openMenu')"
      >
        <UIcon name="i-lucide-menu" />
      </button><nav
        class="erp-breadcrumb"
        aria-label="Sahifa yo'li"
      >
        <NuxtLink to="/">ERP Sport AI</NuxtLink><UIcon name="i-lucide-chevron-right" /><span>{{ current?.title ?? 'Dashboard' }}</span>
      </nav>
    </div><div class="erp-header-end">
      <ThemeToggle />
      <UDropdownMenu :items="userMenu">
        <button
          class="auth-user-menu"
          aria-label="Foydalanuvchi menyusi"
        >
          <span
            class="erp-avatar"
            aria-hidden="true"
          >{{ initials }}</span>
          <span class="erp-user"><strong>{{ displayName }}</strong><small>{{ roles.map(role => roleLabels[role] ?? role).join(', ') }}</small></span>
          <UIcon name="i-lucide-chevron-down" />
        </button>
      </UDropdownMenu>
    </div>
  </header>
</template>
