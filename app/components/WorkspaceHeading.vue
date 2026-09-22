<script setup lang="ts">
defineProps<{ title: string, description: string, eyebrow?: string }>()
</script>

<template>
  <div class="erp-heading">
    <div>
      <p class="erp-eyebrow">
        {{ eyebrow ?? 'ERP SPORT AI' }}
      </p><h1>{{ title }}</h1><p>{{ description }}</p>
    </div><slot />
  </div>
</template>
