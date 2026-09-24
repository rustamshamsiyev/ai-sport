<script setup lang="ts">
import '~/assets/css/data-collection.css'
import '~/assets/css/statistics.css'
import StatisticsView from '~/components/data-collection/StatisticsView.vue'
import DataSourceCard from '~/components/data-collection/DataSourceCard.vue'
import DatabaseExplorer from '~/components/data-collection/DatabaseExplorer.vue'
import TableDetails from '~/components/data-collection/TableDetails.vue'
import type { MockScenario } from '~/types/database'

useSeoMeta({ title: 'Ma’lumotlarni yig‘ish — ERP Sport AI' })
const route = useRoute()
const scenarios: MockScenario[] = ['normal', 'empty', 'load-error', 'scan-error', 'save-error']
const scenario = scenarios.find(value => value === route.query.mock) ?? 'normal'
const activeView = ref<'database' | 'statistics'>('database')
const { source, schemas, objects, selected, selectedId, schemaId, scanning, scanResult, scanError, states, busy, editingDisabled, saving, saveError, success, dirty, dirtyIds, updateSelected, save, load, select, selectSchema, scan, mockMode, confirmOpen, finishConfirmation, hasPermission, service } = useDataCollection(scenario)
const labels = { source: 'Data source', schemas: 'Schemas', tables: 'Tables', details: 'Table details', columns: 'Columns' }
function retry(key: keyof typeof labels) {
  if (key === 'source' || key === 'schemas') return load()
  if (key === 'tables') return selectSchema(schemaId.value)
  if (selectedId.value) return select(selectedId.value)
}
</script>

<template>
  <div
    v-if="!hasPermission('metadata.read')"
    class="erp-panel erp-empty"
    role="alert"
  >
    Ushbu amal uchun ruxsatingiz yo'q.
  </div>
  <div
    v-else
    class="dc-page"
  >
    <WorkspaceHeading
      title="Ma'lumotlarni yig'ish"
      description="Database metadata, schema, table va columnlarni ko‘rish."
      eyebrow="QUYI TIZIMLAR / 01"
    >
      <span class="erp-status-pill">Metadata boshqaruvi</span>
    </WorkspaceHeading>
    <div
      v-if="mockMode"
      class="dc-demo-note"
      role="status"
    >
      Mock muhit: namunaviy metadata. Real backend ishlatilmayapti.
    </div>
    <div
      class="dc-view-switch"
      role="group"
      aria-label="Data Collection ko‘rinishi"
    >
      <button
        :aria-pressed="activeView === 'database'"
        @click="activeView = 'database'"
      >
        Ma'lumotlar bazasi
      </button>
      <button
        :aria-pressed="activeView === 'statistics'"
        :disabled="busy"
        @click="activeView = 'statistics'"
      >
        Statistika
      </button>
    </div>
    <StatisticsView
      v-if="activeView === 'statistics'"
      :service="service"
      :has-permission="hasPermission"
    />
    <div v-show="activeView === 'database'">
      <template
        v-for="(state, key) in states"
        :key="key"
      >
        <div
          v-if="state.loading"
          class="dc-feedback"
          role="status"
          aria-busy="true"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="dc-spin"
          /> {{ labels[key] }} yuklanmoqda…
        </div>
        <div
          v-if="state.error"
          class="dc-feedback dc-feedback-error"
          role="alert"
        >
          <span>{{ labels[key] }}: {{ state.error }}</span>
          <button
            class="dc-button"
            :disabled="busy || state.loading"
            @click="retry(key)"
          >
            Qayta urinish
          </button>
        </div>
      </template>
      <DataSourceCard
        v-if="source"
        :source="source"
        :scanning="scanning"
        :disabled="busy || !hasPermission('metadata.scan')"
        :progress="{ message: 'Database scan bajarilmoqda…' }"
        @scan="scan"
      />
      <div
        v-if="scanError"
        class="dc-feedback dc-feedback-error"
        role="alert"
      >
        <span>{{ scanError }}</span><button
          class="dc-button"
          :disabled="busy || !hasPermission('metadata.scan')"
          @click="scan"
        >
          Scanni qayta boshlash
        </button>
      </div>
      <div
        v-if="scanResult"
        class="dc-feedback dc-feedback-success"
        role="status"
      >
        Scan yakunlandi: {{ scanResult.schemas }} schemas · {{ scanResult.tables }} tables · {{ scanResult.views }} views · {{ scanResult.columns }} columns · {{ scanResult.primaryKeys }} primary_keys · {{ scanResult.foreignKeys }} foreign_keys · {{ scanResult.durationMs }} duration_ms
      </div>
      <div class="dc-workspace">
        <DatabaseExplorer
          :schemas="schemas"
          :objects="objects"
          :selected-id="selectedId"
          :schema-id="schemaId"
          :dirty-ids="dirtyIds"
          :disabled="busy"
          :loading="states.tables.loading"
          @select="select"
          @schema="selectSchema"
        />
        <TableDetails
          v-if="selected"
          :table="selected"
          :disabled="editingDisabled"
          :saving="saving"
          :dirty="dirty"
          :columns-loading="states.columns.loading"
          :columns-error="states.columns.error"
          @update="updateSelected"
          @save="save"
        />
        <section
          v-else
          class="erp-panel dc-state dc-no-selection"
        >
          <UIcon name="i-lucide-table-properties" />
          <h2>{{ states.details.loading ? 'Table yuklanmoqda…' : 'Obyektni tanlang' }}</h2>
          <p>Schema ichidan table yoki view tanlang. Texnik va biznes metadata shu yerda ko‘rsatiladi.</p>
        </section>
      </div>
      <div
        v-if="saveError"
        class="dc-feedback dc-feedback-error"
        role="alert"
      >
        {{ saveError }} Saqlanmagan o‘zgarishlar saqlanib qoldi. Qayta Save bosing.
      </div>
      <div
        v-if="success"
        class="dc-feedback dc-feedback-success"
        role="status"
      >
        {{ success }}
      </div>
    </div>
    <UModal
      :open="confirmOpen"
      title="Saqlanmagan o‘zgarishlar mavjud. Davom etasizmi?"
      description="Davom etsangiz, saqlanmagan o‘zgarishlar bekor qilinadi."
      @update:open="!$event && finishConfirmation(false)"
    >
      <template #footer>
        <button
          class="dc-button"
          @click="finishConfirmation(false)"
        >
          Cancel
        </button>
        <button
          class="dc-button dc-button-primary"
          @click="finishConfirmation(true)"
        >
          Continue
        </button>
      </template>
    </UModal>
  </div>
</template>
