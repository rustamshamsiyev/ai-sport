<script setup lang="ts">
import type { BusinessMetadata, DatabaseColumn } from '~/types/database'

const props = defineProps<{ columns: DatabaseColumn[], disabled: boolean, tableEnabled: boolean }>()
const emit = defineEmits<{ update: [columns: DatabaseColumn[]] }>()
const search = ref('')
const filtered = computed(() => props.columns.filter(column => `${column.technicalName} ${column.businessName} ${column.dataType}`.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase())))
const enabledCount = computed(() => props.columns.filter(column => column.aiEnabled).length)
const allChecked = computed(() => filtered.value.length > 0 && filtered.value.every(column => column.aiEnabled))
const indeterminate = computed(() => !allChecked.value && filtered.value.some(column => column.aiEnabled))
function update(id: string, patch: Partial<BusinessMetadata>) {
  emit('update', props.columns.map(column => column.id === id ? { ...column, ...patch } : column))
}
function toggleFiltered(checked: boolean) {
  const ids = new Set(filtered.value.map(column => column.id))
  emit('update', props.columns.map(column => ids.has(column.id) ? { ...column, aiEnabled: checked } : column))
}
function text(event: Event) {
  return (event.target as HTMLInputElement).value
}
function checked(event: Event) {
  return (event.target as HTMLInputElement).checked
}
</script>

<template>
  <section
    class="dc-columns"
    aria-labelledby="columns-title"
  >
    <div class="dc-columns-heading">
      <div>
        <h3 id="columns-title">
          Columns <span class="dc-count">{{ columns.length }}</span>
        </h3><p>{{ enabledCount }} / {{ columns.length }} ustun tanlangan <span v-if="!tableEnabled">· Obyekt AI uchun o'chirilgan</span></p>
      </div><label class="dc-search"><UIcon name="i-lucide-search" /><input
        v-model="search"
        type="search"
        placeholder="Column qidirish…"
        aria-label="Column texnik nomi, biznes nomi yoki turi bo'yicha qidirish"
      ></label>
    </div>
    <div
      v-if="filtered.length"
      class="dc-table-scroll"
      tabindex="0"
      role="region"
      aria-label="Column metadata jadvali, gorizontal aylantirish mumkin"
    >
      <table class="dc-columns-table">
        <caption class="sr-only">
          Column tanlash va biznes metadata tahrirlash. PK — primary key, FK — foreign key.
        </caption><thead>
          <tr>
            <th scope="col">
              <input
                type="checkbox"
                :checked="allChecked"
                :indeterminate="indeterminate"
                :disabled="disabled"
                aria-label="Ko'rinayotgan barcha columnlarni AI uchun tanlash"
                @change="toggleFiltered(checked($event))"
              ><span>AI</span>
            </th><th scope="col">
              Technical name / Type
            </th><th scope="col">
              Nullable
            </th><th scope="col">
              Keys
            </th><th scope="col">
              Business name
            </th><th scope="col">
              Description
            </th>
          </tr>
        </thead><tbody>
          <tr
            v-for="column in filtered"
            :key="column.id"
            :class="{ 'dc-column-enabled': column.aiEnabled && tableEnabled }"
          >
            <td>
              <input
                type="checkbox"
                :checked="column.aiEnabled"
                :disabled="disabled"
                :aria-label="`${column.technicalName}: AI uchun tanlash`"
                @change="update(column.id, { aiEnabled: checked($event) })"
              >
            </td><th scope="row">
              <code>{{ column.technicalName }}</code><span class="dc-data-type">{{ column.dataType }}</span>
            </th><td><span :class="column.nullable ? 'dc-nullable' : 'dc-not-null'">{{ column.nullable ? 'YES' : 'NO' }}</span></td><td>
              <span
                v-if="column.primaryKey"
                class="dc-key dc-pk"
                title="Primary key"
              >PK</span><span
                v-if="column.isForeignKey || column.foreignKey"
                class="dc-key dc-fk"
                :title="column.foreignKey ? `Foreign key → ${column.foreignKey}` : 'Foreign key (target API tomonidan berilmagan)'"
                :aria-label="column.foreignKey ? `Foreign key: ${column.foreignKey}` : 'Foreign key'"
              >FK</span><span
                v-if="!column.primaryKey && !column.isForeignKey && !column.foreignKey"
                class="dc-muted"
              >—</span>
            </td><td>
              <input
                class="dc-cell-input"
                :value="column.businessName"
                :disabled="disabled"
                maxlength="150"
                placeholder="Biznes nomini kiriting"
                :aria-label="`${column.technicalName}: business name`"
                @input="update(column.id, { businessName: text($event) })"
              >
            </td><td>
              <textarea
                class="dc-cell-input"
                :value="column.description"
                :disabled="disabled"
                maxlength="1000"
                rows="2"
                placeholder="Tavsif kiriting"
                :aria-label="`${column.technicalName}: description`"
                @input="update(column.id, { description: text($event) })"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div
      v-else
      class="dc-state dc-state-small"
      role="status"
    >
      <UIcon name="i-lucide-columns-3" /><h3>{{ columns.length ? 'Column topilmadi' : 'Ustunlar mavjud emas' }}</h3><p>{{ columns.length ? 'Boshqa nom yoki ma’lumot turi bilan qidiring.' : 'Ushbu obyekt uchun column metadata hali olinmagan.' }}</p><button
        v-if="search"
        class="dc-button"
        @click="search = ''"
      >
        Qidiruvni tozalash
      </button>
    </div>
    <div class="dc-columns-legend">
      <span>{{ filtered.length }} ta ustun ko'rsatilmoqda</span><span><b class="dc-pk">PK</b> Primary key <b class="dc-fk">FK</b> Foreign key</span>
    </div>
  </section>
</template>
