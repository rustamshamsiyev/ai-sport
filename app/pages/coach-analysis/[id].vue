<script setup lang="ts">
const route = useRoute()
</script>

<template>
  <ModuleWorkspace
    slug="coach-analysis"
    :record-id="String(route.params.id)"
  />
</template>
