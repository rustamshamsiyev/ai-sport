<script setup lang="ts">
import { dashboardModules, managementNavigation, systemNavigation } from '~/data/dashboard'
import type { NavigationItem } from '~/data/dashboard'

defineProps<{ collapsed: boolean, mobile?: boolean }>()
defineEmits<{ toggle: [], navigate: [] }>()
const route = useRoute()
const groups = [
  { title: 'Quyi tizimlar', items: dashboardModules.map(module => ({ ...module, to: '/' + module.slug })) },
  { title: 'Boshqaruv', items: managementNavigation },
  { title: 'Tizim', items: systemNavigation }
]
function isActive(item: NavigationItem) {
  return route.path === item.to || route.path.startsWith(item.to + '/')
}
</script>

<template>
  <aside
    class="erp-sidebar"
    :class="{ 'is-collapsed': collapsed }"
  >
    <NuxtLink
      to="/"
      class="erp-brand"
      aria-label="ERP Sport AI · Dashboard"
      @click="$emit('navigate')"
    ><span class="erp-brand-icon"><UIcon name="i-lucide-activity" /></span><span v-if="!collapsed"><strong>ERP SPORT <em>AI</em></strong><small>Sport tahliliy platformasi</small></span></NuxtLink>
    <nav
      aria-label="Asosiy navigatsiya"
      class="erp-navigation"
    >
      <NuxtLink
        to="/"
        class="erp-nav-link"
        :class="{ 'is-active': route.path === '/' }"
        title="Dashboard"
        aria-label="Dashboard"
        @click="$emit('navigate')"
      ><UIcon name="i-lucide-layout-dashboard" /><span v-if="!collapsed">Dashboard</span></NuxtLink>
      <section
        v-for="group in groups"
        :key="group.title"
        :aria-label="group.title"
        class="erp-nav-group"
      >
        <h2 v-if="!collapsed">
          {{ group.title }}<span v-if="group.title === 'Quyi tizimlar'">13</span>
        </h2>
        <NuxtLink
          v-for="item in group.items"
          :key="item.to"
          :to="item.to"
          class="erp-nav-link"
          :class="{ 'is-active': isActive(item) }"
          :title="item.title"
          :aria-label="item.title"
          :aria-current="isActive(item) ? 'page' : undefined"
          @click="$emit('navigate')"
        ><UIcon :name="item.icon" /><template v-if="!collapsed"><span>{{ item.title }}</span><small v-if="item.number">{{ item.number }}</small></template></NuxtLink>
      </section>
    </nav>
    <button
      v-if="!mobile"
      class="erp-collapse"
      :aria-label="collapsed ? 'Sidebarni kengaytirish' : 'Sidebarni yig‘ish'"
      :aria-expanded="!collapsed"
      @click="$emit('toggle')"
    >
      <UIcon :name="collapsed ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'" /><span v-if="!collapsed">Menyuni yig'ish</span>
    </button>
  </aside>
</template>
