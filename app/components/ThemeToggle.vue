<script setup lang="ts">
const colorMode = useColorMode()
const { locale } = useSportLocale()
const isDark = computed(() => colorMode.value === 'dark')
const label = computed(() => ({
  uz: isDark.value ? 'Yorug‘ rejimga o‘tish' : 'Qorong‘u rejimga o‘tish',
  ru: isDark.value ? 'Включить светлую тему' : 'Включить тёмную тему',
  en: isDark.value ? 'Switch to light mode' : 'Switch to dark mode'
})[locale.value])
function toggle() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}
</script>

<template>
  <ClientOnly>
    <button
      type="button"
      class="theme-toggle"
      :aria-label="label"
      :title="label"
      @click="toggle"
    >
      <UIcon :name="isDark ? 'i-lucide-sun' : 'i-lucide-moon'" />
    </button>
    <template #fallback>
      <span
        class="theme-toggle"
        aria-hidden="true"
      ><UIcon name="i-lucide-sun-moon" /></span>
    </template>
  </ClientOnly>
</template>
