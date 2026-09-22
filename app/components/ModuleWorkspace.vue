<script setup lang="ts">
import { dashboardModules } from '~/data/dashboard'

const props = defineProps<{ slug: string, recordId?: string }>()
const module = computed(() => dashboardModules.find(item => item.slug === props.slug))
const profile = computed(() => ['athlete-analysis', 'coach-analysis'].includes(props.slug))
useSeoMeta({ title: () => (module.value?.title ?? 'Modul') + ' — ERP Sport AI' })
</script>

<template>
  <div v-if="module">
    <WorkspaceHeading
      :title="module.title"
      :description="module.description"
      :eyebrow="'QUYI TIZIMLAR / ' + module.number"
    >
      <span class="erp-status-pill">Namoyish sahifasi</span>
    </WorkspaceHeading>
    <div class="erp-notice">
      <UIcon name="i-lucide-info" /><p>Ushbu sahifa modul tuzilmasini ko'rsatadi. Haqiqiy ma'lumotlar API integratsiyasi ulangach paydo bo'ladi.</p>
    </div>
    <section
      v-if="recordId"
      class="erp-panel erp-record"
    >
      <NuxtLink
        :to="'/' + slug"
        class="erp-text-link"
      >← Ro'yxatga qaytish</NuxtLink><h2>Profil tafsilotlari</h2><p>Identifikator: {{ recordId }}</p><span class="erp-muted">Namoyish profili. Shaxsiy ma'lumotlar hali yuklanmagan.</span>
    </section>
    <section class="erp-panel">
      <div class="erp-panel-heading">
        <div><h2>Modul imkoniyatlari</h2><p>Tahlil va boshqaruv uchun ish maydoni</p></div><span class="erp-module-icon"><UIcon :name="module.icon" /></span>
      </div><div class="erp-feature-grid">
        <article
          v-for="(feature, index) in module.features"
          :key="feature"
          class="erp-feature"
        >
          <span>{{ String(index + 1).padStart(2, '0') }}</span><h3>{{ feature }}</h3><p>Ma'lumot kutilmoqda</p>
        </article>
      </div>
    </section>
    <section class="erp-panel erp-empty">
      <UIcon :name="module.icon" /><h2>{{ recordId ? 'Profil ma’lumotlari kutilmoqda' : 'Hozircha ma’lumotlar mavjud emas' }}</h2><p>Ushbu modulga tegishli ma'lumotlar shu yerda ko'rsatiladi.</p><NuxtLink
        v-if="profile && !recordId"
        :to="'/' + slug + '/demo-001'"
        class="erp-primary-link"
      >Namunaviy profilni ko'rish <UIcon name="i-lucide-arrow-right" /></NuxtLink>
    </section>
  </div>
</template>
