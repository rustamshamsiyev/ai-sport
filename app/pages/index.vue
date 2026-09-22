<script setup lang="ts">
import { dashboardModules } from '~/data/dashboard'

const search = ref('')
const filtered = computed(() => dashboardModules.filter(m => (m.title + ' ' + m.description).toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase())))
useSeoMeta({ title: 'Dashboard — ERP Sport AI' })
const metrics = [
  { label: 'Asosiy modullar', value: '13', note: 'Yagona tahliliy ish maydoni', icon: 'i-lucide-layout-grid' },
  { label: 'Ma’lumotlar manbasi', value: '—', note: 'Integratsiya kutilmoqda', icon: 'i-lucide-database' },
  { label: 'Tahlil qilingan profillar', value: '—', note: 'Ma’lumotlar hali yuklanmagan', icon: 'i-lucide-users' },
  { label: 'Nazorat holati', value: 'Demo', note: 'Haqiqiy monitoring ulanmagan', icon: 'i-lucide-shield-check' }
]
</script>

<template>
  <div>
    <WorkspaceHeading
      title="Dashboard"
      description="Sport ma'lumotlari, tahlil va nazorat — yagona ish maydonida."
      eyebrow="UMUMIY KO'RINISH"
    >
      <NuxtLink
        to="/data-collection"
        class="erp-primary-link"
      ><UIcon name="i-lucide-database" />Ma'lumotlarni yig'ish<UIcon name="i-lucide-arrow-up-right" /></NuxtLink>
    </WorkspaceHeading>
    <section class="erp-welcome">
      <div><span class="erp-eyebrow">MA'LUMOTDAN QARORGACHA</span><h2>Sport boshqaruvida<br>aniq tahlil, asosli qaror.</h2><p>13 ta modul orqali ma'lumotlarni yig'ishdan raqamli nazoratgacha bo'lgan jarayonni boshqaring.</p><span class="erp-welcome-note"><span />Platformaning namoyish versiyasi</span></div><div
        class="erp-welcome-art"
        aria-hidden="true"
      >
        <UIcon name="i-lucide-brain-circuit" /><span>ERP SPORT INTELLIGENCE</span>
      </div>
    </section>
    <section
      class="erp-metrics"
      aria-label="Platforma ko'rsatkichlari"
    >
      <article
        v-for="metric in metrics"
        :key="metric.label"
        class="erp-panel erp-metric"
      >
        <div><span>{{ metric.label }}</span><UIcon :name="metric.icon" /></div><strong>{{ metric.value }}</strong><p>{{ metric.note }}</p>
      </article>
    </section>
    <section>
      <div class="erp-modules-heading">
        <div><h2>Quyi tizimlar <span>13</span></h2><p>Kerakli modulni tanlang va ishni boshlang</p></div><label class="erp-search"><UIcon name="i-lucide-search" /><input
          v-model="search"
          type="search"
          placeholder="Modulni qidirish..."
          aria-label="Modulni qidirish"
        ></label>
      </div><div class="erp-module-grid">
        <NuxtLink
          v-for="module in filtered"
          :key="module.slug"
          :to="'/' + module.slug"
          class="erp-panel erp-module-card"
        ><div class="erp-card-top"><span class="erp-module-icon"><UIcon :name="module.icon" /></span><span class="erp-card-number">{{ module.number }}</span></div><h3>{{ module.title }}</h3><p>{{ module.description }}</p><div class="erp-card-bottom"><span>Modulga o'tish</span><UIcon name="i-lucide-arrow-up-right" /></div></NuxtLink>
      </div><p
        v-if="!filtered.length"
        class="erp-panel erp-empty"
        role="status"
      >
        Qidiruvga mos modul topilmadi.
      </p>
    </section>
  </div>
</template>
