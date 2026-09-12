<script setup lang="ts">
import { sportModules, moduleCopy } from '~/data/sport-modules'

const props = defineProps<{ slug: string }>()
const { locale, t } = useSportLocale()
const module = computed(() => sportModules.find(item => item.slug === props.slug))
const copy = computed(() => moduleCopy[locale.value])
useSeoMeta({ title: () => `${module.value?.title[locale.value]} — ERP Sport AI` })
</script>

<template>
  <div class="module-page">
    <header class="site-header">
      <NuxtLink
        to="/"
        class="brand"
        aria-label="ERP Sport AI"
      ><span class="brand-mark"><UIcon name="i-lucide-activity" /></span><span>ERP <span class="sport-word">SPORT</span></span><span class="brand-ai">AI</span></NuxtLink>
      <div class="header-actions">
        <ThemeToggle /><label class="language-picker"><UIcon name="i-lucide-globe" /><span class="sr-only">{{ t.language }}</span><select v-model="locale"><option value="uz">O‘zbekcha</option><option value="ru">Русский</option><option value="en">English</option></select></label>
      </div>
    </header>
    <main class="module-placeholder">
      <span
        class="tool-icon"
        :class="module?.color"
      ><UIcon :name="module?.icon" /></span>
      <h1>{{ module?.title[locale] }}</h1>
      <p>{{ copy.soon }}</p>
      <NuxtLink
        to="/#tools"
        class="header-cta"
      ><UIcon name="i-lucide-arrow-left" />{{ copy.back }}</NuxtLink>
    </main>
  </div>
</template>
