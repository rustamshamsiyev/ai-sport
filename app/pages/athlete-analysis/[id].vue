<script setup lang="ts">
const route = useRoute()
</script>

<template>
  <ModuleWorkspace
    slug="athlete-analysis"
    :record-id="String(route.params.id)"
  />
</template>
