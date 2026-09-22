<script setup lang="ts">
import type { DataSource, ScanStatus } from '~/types/database'
import ScanProgress from './ScanProgress.vue'

const props = defineProps<{ source: DataSource, scanning: boolean, disabled: boolean, progress: ScanStatus }>()
defineEmits<{ scan: [] }>()
const metrics = computed(() => [
  { label: 'Schema', value: props.source.schemaCount, icon: 'i-lucide-folder-tree' },
  { label: 'Table', value: props.source.tableCount, icon: 'i-lucide-table-2' },
  { label: 'View', value: props.source.viewCount, icon: 'i-lucide-panels-top-left' },
  { label: 'Column', value: props.source.columnCount, icon: 'i-lucide-columns-3' }
])
const hasTimezone = computed(() => !!props.source.lastScanAt && /(?:Z|[+-]\d{2}:\d{2})$/i.test(props.source.lastScanAt))
const scannedAt = computed(() => {
  const value = props.source.lastScanAt
  if (!value) return 'Hali scan qilinmagan'
  // A timezone-free backend timestamp must not be interpreted in the browser's zone.
  if (!hasTimezone.value) return value.replace('T', ' ')
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Vaqt formati noma’lum' : new Intl.DateTimeFormat('uz-UZ', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tashkent' }).format(date)
})
</script>

<template>
  <section
    class="erp-panel dc-source"
    aria-labelledby="data-source-title"
    :aria-busy="scanning"
  >
    <div class="dc-source-top">
      <div class="dc-source-identity">
        <span class="dc-source-icon"><UIcon name="i-lucide-database" /></span><div>
          <p class="dc-kicker">
            DATA SOURCE
          </p><h2 id="data-source-title">
            {{ source.name }}
          </h2><div class="dc-source-tags">
            <span>{{ source.databaseType }}</span><span
              class="dc-badge"
              :class="source.connectionStatus === 'connected' ? 'dc-green' : 'dc-amber'"
            ><span class="dc-dot" />{{ source.connectionStatus === 'connected' ? 'Ulangan' : source.connectionStatus === 'disconnected' ? 'Ulanmagan' : 'Ulanish holati tekshirilmagan' }}</span>
          </div>
        </div>
      </div>
      <button
        class="dc-button dc-button-primary"
        :disabled="disabled"
        @click="$emit('scan')"
      >
        <UIcon
          :name="scanning ? 'i-lucide-loader-circle' : 'i-lucide-scan-line'"
          :class="{ 'dc-spin': scanning }"
        />{{ scanning ? 'Scan in progress…' : 'Scan database' }}
      </button>
    </div>
    <dl class="dc-source-metrics">
      <div
        v-for="metric in metrics"
        :key="metric.label"
      >
        <dt><UIcon :name="metric.icon" />{{ metric.label }}</dt><dd>{{ metric.value ?? '—' }}</dd>
      </div><div class="dc-last-scan">
        <dt><UIcon name="i-lucide-clock-3" />Last scan time</dt><dd><time :datetime="source.lastScanAt ?? undefined">{{ scannedAt }}</time><small>{{ hasTimezone ? 'Toshkent vaqti · UTC+5' : 'Backend vaqti (timezone berilmagan)' }}</small></dd>
      </div>
    </dl>
    <ScanProgress
      v-if="scanning"
      :status="progress"
    />
  </section>
</template>
