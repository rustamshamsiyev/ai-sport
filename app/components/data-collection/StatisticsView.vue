<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import type { DatabaseService } from '../../types/database'
import type { StatisticsParams } from '../../types/statistics'
import { createStatisticsState } from '../../composables/statisticsState'
import StatisticsReport from './StatisticsReport.vue'

const props = defineProps<{ service: Pick<DatabaseService, 'getStatistics'>, hasPermission: (permission: string) => boolean }>()
const { data, params, loading, error, load, setFilters, setSearch, setPage, dispose } = createStatisticsState(props.service, props.hasPermission)
const allowed = computed(() => props.hasPermission('metadata.read'))
const schemaOptions = computed(() => [{ label: 'Barchasi', value: 'ALL' }, ...(data.value?.schemas.map(schema => ({ label: schema.schemaName, value: schema.schemaId })) ?? [])])
const typeOptions = [{ label: 'Barchasi', value: 'ALL' }, { label: 'Table', value: 'TABLE' }, { label: 'View', value: 'VIEW' }]
const aiOptions = [{ label: 'Barchasi', value: 'ALL' }, { label: 'Tanlangan', value: 'true' }, { label: 'Tanlanmagan', value: 'false' }]
const sizeOptions = [50, 100, 200]
function filterSchema(value: string) {
  return setFilters({ schemaId: value === 'ALL' ? undefined : value })
}
function filterType(value: string) {
  return setFilters({ objectType: value === 'ALL' ? undefined : value as StatisticsParams['objectType'] })
}
function filterAI(value: string) {
  return setFilters({ aiEnabled: value === 'ALL' ? undefined : value === 'true' })
}
onMounted(load)
onBeforeUnmount(dispose)
</script>

<template>
  <section
    class="dc-statistics"
    aria-label="Metadata statistikasi"
    :aria-busy="loading"
  >
    <div
      v-if="!allowed"
      class="dc-feedback dc-feedback-error"
      role="alert"
    >
      Ushbu amal uchun ruxsatingiz yo'q.
    </div>
    <template v-else>
      <div class="dc-stat-heading">
        <div><h2>Statistika</h2><p>Faol metadata va AI uchun tanlangan obyektlar</p></div>
        <button
          class="dc-button"
          :disabled="loading"
          data-testid="statistics-refresh"
          @click="load"
        >
          <UIcon
            :name="loading ? 'i-lucide-loader-circle' : 'i-lucide-refresh-cw'"
            :class="{ 'dc-spin': loading }"
          />Yangilash
        </button>
      </div>
      <div
        v-if="error"
        class="dc-feedback dc-feedback-error"
        role="alert"
      >
        <span>{{ error }}</span><button
          class="dc-button"
          :disabled="loading"
          @click="load"
        >
          Qayta urinish
        </button>
      </div>
      <div
        v-if="loading"
        class="dc-loading"
        role="status"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="dc-spin"
        />Statistika yuklanmoqda…
        <template v-if="!data">
          <div class="dc-skeleton" /><div class="dc-skeleton" />
        </template>
      </div>
      <StatisticsReport
        v-if="data"
        :data="data"
        :objects-visible="!loading && !error"
      >
        <template #filters>
          <div class="dc-stat-filters">
            <div class="dc-schema-field">
              <label for="stat-schema">Schema</label><USelectMenu
                id="stat-schema"
                :model-value="params.schemaId ?? 'ALL'"
                :items="schemaOptions"
                value-key="value"
                class="dc-schema-select"
                :search-input="{ placeholder: 'Schema qidirish…' }"
                @update:model-value="filterSchema"
              />
            </div>
            <div class="dc-schema-field">
              <label for="stat-type">Turi</label><USelect
                id="stat-type"
                :model-value="params.objectType ?? 'ALL'"
                :items="typeOptions"
                value-key="value"
                class="dc-schema-select"
                @update:model-value="filterType"
              />
            </div>
            <div class="dc-schema-field">
              <label for="stat-ai">AI</label><USelect
                id="stat-ai"
                :model-value="params.aiEnabled === undefined ? 'ALL' : String(params.aiEnabled)"
                :items="aiOptions"
                value-key="value"
                class="dc-schema-select"
                @update:model-value="filterAI"
              />
            </div>
            <div class="dc-schema-field">
              <label for="stat-search">Qidiruv</label><label class="dc-search"><UIcon name="i-lucide-search" /><input
                id="stat-search"
                :value="params.search ?? ''"
                type="search"
                maxlength="300"
                placeholder="Schema.table yoki biznes nomi"
                @input="setSearch(($event.target as HTMLInputElement).value)"
              ></label>
            </div>
          </div>
        </template>
        <template #pagination>
          <div class="dc-stat-pagination">
            <label for="stat-page-size">Sahifada <USelect
              id="stat-page-size"
              :model-value="params.pageSize"
              :items="sizeOptions"
              :disabled="loading"
              @update:model-value="setFilters({ pageSize: $event as 50 | 100 | 200 })"
            /></label>
            <span>Jami: {{ new Intl.NumberFormat('uz-UZ').format(data.pagination.total) }} · Sahifa {{ data.pagination.page }} / {{ data.pagination.totalPages }}</span>
            <div>
              <button
                class="dc-button"
                aria-label="Statistika: oldingi sahifa"
                :disabled="loading || !!error || data.pagination.page <= 1"
                @click="setPage(data.pagination.page - 1)"
              >
                ←
              </button><button
                class="dc-button"
                aria-label="Statistika: keyingi sahifa"
                :disabled="loading || !!error || data.pagination.page >= data.pagination.totalPages"
                @click="setPage(data.pagination.page + 1)"
              >
                →
              </button>
            </div>
          </div>
        </template>
      </StatisticsReport>
    </template>
  </section>
</template>
