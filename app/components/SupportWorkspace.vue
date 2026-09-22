<script setup lang="ts">
const props = defineProps<{ title: string, icon: string }>()
useSeoMeta({ title: () => props.title + ' — ERP Sport AI' })
</script>

<template>
  <div>
    <WorkspaceHeading
      :title="title"
      description="Platformaning yordamchi boshqaruv va tizim sozlamalari."
      eyebrow="BOSHQARUV VA TIZIM"
    /><div class="erp-notice">
      <UIcon name="i-lucide-info" /><p>Namoyish sahifasi. Boshqaruv amallari backend integratsiyasi ulangach mavjud bo'ladi.</p>
    </div><section class="erp-panel erp-empty">
      <UIcon :name="icon" /><h2>{{ title }}</h2><p>Hozircha ma'lumotlar mavjud emas.</p><NuxtLink
        to="/"
        class="erp-text-link"
      >Dashboardga qaytish →</NuxtLink>
    </section>
  </div>
</template>
