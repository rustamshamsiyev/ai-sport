<script setup lang="ts">
import type { ScanStatus } from '~/types/database'

defineProps<{ status: ScanStatus }>()
</script>

<template>
  <div
    class="dc-scan"
    role="status"
    aria-live="polite"
  >
    <div class="dc-scan-label">
      <span><UIcon
        name="i-lucide-loader-circle"
        class="dc-spin"
      />{{ status.message }}</span>
    </div>
    <progress aria-label="Database scan jarayoni" />
  </div>
</template>
