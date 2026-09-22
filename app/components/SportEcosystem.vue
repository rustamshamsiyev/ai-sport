<script setup lang="ts">
const { locale } = useSportLocale()
const copy = computed(() => ({
  uz: { title: 'Sportning raqamli ekotizimi', label: 'PLATFORMA ARXITEKTURASI', modules: 'AI modullar', languages: 'Interfeys tillari', source: 'ERP Sport ma’lumotlari', profile: 'Sportchi va trener', analysis: 'Tahlil va taqqoslash', result: 'Bashorat va tavsiyalar', footer: 'Ma’lumotdan qarorgacha — yagona makon' },
  ru: { title: 'Цифровая экосистема спорта', label: 'АРХИТЕКТУРА ПЛАТФОРМЫ', modules: 'AI-модулей', languages: 'Языка интерфейса', source: 'Данные ERP Sport', profile: 'Спортсмен и тренер', analysis: 'Анализ и сравнение', result: 'Прогноз и рекомендации', footer: 'От данных к решениям — в одном пространстве' },
  en: { title: 'The digital sports ecosystem', label: 'PLATFORM ARCHITECTURE', modules: 'AI modules', languages: 'Interface languages', source: 'ERP Sport data', profile: 'Athlete and coach', analysis: 'Analysis and comparison', result: 'Forecasts and recommendations', footer: 'From data to decisions — one workspace' }
})[locale.value])
</script>

<template>
  <aside
    class="ecosystem-panel"
    :aria-label="copy.title"
  >
    <div class="ecosystem-top">
      <span><span class="status-dot" /> ERP SPORT INTELLIGENCE</span><UIcon name="i-lucide-scan-line" />
    </div>
    <div class="ecosystem-heading">
      <span>{{ copy.label }}</span><h2>{{ copy.title }}</h2>
    </div>
    <div class="ecosystem-map">
      <div
        class="map-ring ring-outer"
        aria-hidden="true"
      /><div
        class="map-ring ring-inner"
        aria-hidden="true"
      />
      <div
        class="map-axis axis-horizontal"
        aria-hidden="true"
      /><div
        class="map-axis axis-vertical"
        aria-hidden="true"
      />
      <div class="map-core">
        <UIcon name="i-lucide-brain-circuit" /><strong>AI</strong>
      </div>
      <NuxtLink
        to="/modules/data-collection"
        class="map-node node-top"
      ><UIcon name="i-lucide-database" />{{ copy.source }}</NuxtLink>
      <NuxtLink
        to="/modules/athlete-profile"
        class="map-node node-left"
      ><UIcon name="i-lucide-users" />{{ copy.profile }}</NuxtLink>
      <NuxtLink
        to="/modules/comparison"
        class="map-node node-right"
      ><UIcon name="i-lucide-chart-no-axes-combined" />{{ copy.analysis }}</NuxtLink>
      <NuxtLink
        to="/modules/forecast"
        class="map-node node-bottom"
      ><UIcon name="i-lucide-sparkles" />{{ copy.result }}</NuxtLink>
    </div>
    <div class="ecosystem-metrics">
      <div><strong>13<span> / </span></strong><span>{{ copy.modules }}</span></div><div><strong>03<span> / </span></strong><span>{{ copy.languages }}</span></div><UIcon name="i-lucide-activity" />
    </div>
    <div class="ecosystem-footer">
      <UIcon name="i-lucide-workflow" />{{ copy.footer }}
    </div>
  </aside>
</template>
