<script setup lang="ts">
import { computed } from 'vue'
import type { DatabaseStatistics } from '../../types/statistics'

const props = defineProps<{ data: DatabaseStatistics, objectsVisible: boolean }>()
const number = (value: number) => new Intl.NumberFormat('uz-UZ').format(value)
const cards = computed(() => [
  { label: 'Sxemalar', value: props.data.summary.schemas },
  { label: 'Jadvallar', value: props.data.summary.tables, ai: props.data.summary.aiEnabledTables },
  { label: 'Viewlar', value: props.data.summary.views, ai: props.data.summary.aiEnabledViews },
  { label: 'Ustunlar', value: props.data.summary.columns, ai: props.data.summary.aiEnabledColumns },
  { label: 'Primary Key', value: props.data.summary.primaryKeys },
  { label: 'Foreign Key', value: props.data.summary.foreignKeys }
])
</script>

<template>
  <div class="dc-stat-report">
    <dl
      class="dc-stat-cards"
      aria-label="Umumiy statistika"
    >
      <div
        v-for="card in cards"
        :key="card.label"
        class="erp-panel dc-stat-card"
      >
        <dt>{{ card.label }}</dt>
        <dd>{{ number(card.value) }}</dd>
        <dd
          v-if="card.ai !== undefined"
          class="dc-stat-ai"
        >
          AI uchun: {{ number(card.ai) }}
        </dd>
      </div>
    </dl>
    <section
      class="erp-panel dc-stat-section"
      aria-labelledby="stat-schema-title"
    >
      <div class="dc-stat-heading">
        <div>
          <h2 id="stat-schema-title">
            Sxemalar statistikasi
          </h2><p>Barcha faol metadata · Filtrlardan mustaqil</p>
        </div>
      </div>
      <div
        class="dc-table-scroll"
        tabindex="0"
        role="region"
        aria-label="Sxemalar statistikasi, gorizontal aylantirish mumkin"
      >
        <table
          class="dc-stat-table"
          data-testid="schema-statistics"
        >
          <caption class="sr-only">
            Schema bo‘yicha global statistika
          </caption>
          <thead>
            <tr>
              <th scope="col">
                Schema
              </th><th scope="col">
                Jadvallar
              </th><th scope="col">
                Viewlar
              </th><th scope="col">
                Ustunlar
              </th><th scope="col">
                AI jadvallar
              </th><th scope="col">
                AI viewlar
              </th><th scope="col">
                AI ustunlar
              </th><th scope="col">
                PK
              </th><th scope="col">
                FK
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="schema in data.schemas"
              :key="schema.schemaId"
            >
              <th scope="row">
                <code>{{ schema.schemaName }}</code>
              </th>
              <td>{{ number(schema.tables) }}</td><td>{{ number(schema.views) }}</td><td>{{ number(schema.columns) }}</td>
              <td>{{ number(schema.aiEnabledTables) }}</td><td>{{ number(schema.aiEnabledViews) }}</td><td>{{ number(schema.aiEnabledColumns) }}</td>
              <td>{{ number(schema.primaryKeys) }}</td><td>{{ number(schema.foreignKeys) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <section
      class="erp-panel dc-stat-section"
      aria-labelledby="stat-object-title"
    >
      <div class="dc-stat-heading">
        <div>
          <h2 id="stat-object-title">
            Jadval va viewlar
          </h2><p>Filtrlangan obyektlar statistikasi</p>
        </div>
      </div>
      <slot name="filters" />
      <div
        v-if="objectsVisible && data.objects.length"
        class="dc-table-scroll"
        tabindex="0"
        role="region"
        aria-label="Obyektlar statistikasi, gorizontal aylantirish mumkin"
      >
        <table
          class="dc-stat-table"
          data-testid="object-statistics"
        >
          <caption class="sr-only">
            Table va view statistikasi
          </caption>
          <thead>
            <tr>
              <th scope="col">
                Schema
              </th><th scope="col">
                Jadval / View
              </th><th scope="col">
                Turi
              </th><th scope="col">
                Business name
              </th><th scope="col">
                Ustunlar
              </th><th scope="col">
                AI ustunlar
              </th><th scope="col">
                AI
              </th><th scope="col">
                PK
              </th><th scope="col">
                FK
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="object in data.objects"
              :key="object.tableId"
            >
              <td><code>{{ object.schemaName }}</code></td><th scope="row">
                <code>{{ object.tableName }}</code>
              </th>
              <td>
                <span
                  class="dc-badge"
                  :class="object.objectType === 'VIEW' ? 'dc-stat-view' : ''"
                >{{ object.objectType }}</span>
              </td>
              <td>{{ object.businessName ?? '—' }}</td><td>{{ number(object.totalColumns) }}</td><td>{{ number(object.aiEnabledColumns) }}</td>
              <td>
                <span
                  class="dc-badge"
                  :class="object.aiEnabled ? 'dc-green' : 'dc-muted'"
                >{{ object.aiEnabled ? 'Ha' : 'Yo‘q' }}</span>
              </td>
              <td>{{ number(object.primaryKeyColumns) }}</td><td>{{ number(object.foreignKeys) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        v-else
        class="dc-state dc-state-small"
        role="status"
      >
        {{ objectsVisible ? "Ma'lumot topilmadi" : 'Natija yangilanmoqda…' }}
      </div>
      <slot name="pagination" />
    </section>
  </div>
</template>
