<script setup lang="ts">
import type { DatabaseObject, DatabaseSchema, DatabaseObjectType } from '~/types/database'
import SchemaTree from './SchemaTree.vue'

const props = defineProps<{ schemas: DatabaseSchema[], objects: DatabaseObject[], selectedId: string | null, schemaId: string, dirtyIds: string[], disabled: boolean, loading: boolean }>()
const emit = defineEmits<{ select: [id: string], schema: [id: string] }>()
const schemaAttempt = ref(0)
function requestSchema(id: string | undefined) {
  if (!id || id === props.schemaId) return
  // SelectMenu keeps an optimistic internal value. Reset it until the parent
  // accepts the change, so cancelling the unsaved-changes dialog stays truthful.
  schemaAttempt.value++
  emit('schema', id)
}
const schemaOptions = computed(() => props.schemas.map(schema => ({
  label: schema.name,
  value: schema.id ?? schema.name,
  icon: 'i-lucide-folder',
  description: schema.tableCount !== undefined && schema.viewCount !== undefined
    ? `${schema.tableCount} table · ${schema.viewCount} view`
    : undefined
})))
const search = ref('')
const filter = ref<'ALL' | DatabaseObjectType>('ALL')
const page = ref(0)
const pageSize = 50
const filters = [{ value: 'ALL', label: 'Barchasi' }, { value: 'TABLE', label: 'Table' }, { value: 'VIEW', label: 'View' }] as const
const filtered = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  return props.objects.filter(item => (filter.value === 'ALL' || item.objectType === filter.value)
    && `${item.schema} ${item.technicalName} ${item.businessName}`.toLocaleLowerCase().includes(query))
})
const visible = computed(() => filtered.value.slice(page.value * pageSize, (page.value + 1) * pageSize))
const activeSchemas = computed(() => props.schemas.filter(schema => schema.id === props.schemaId))
watch([search, filter, () => props.objects], () => {
  page.value = 0
})
</script>

<template>
  <aside
    class="erp-panel dc-explorer"
    aria-label="Database Explorer"
    :aria-busy="loading"
  >
    <div class="dc-explorer-heading">
      <div><h2>Database Explorer</h2><p>{{ schemas.length }} schema · {{ objects.length }} obyekt</p></div>
    </div>
    <div class="dc-explorer-tools">
      <div class="dc-schema-field">
        <label for="dc-schema-select">Schema</label>
        <USelectMenu
          :key="`${schemaId}:${schemaAttempt}`"
          id="dc-schema-select"
          :model-value="schemaId || undefined"
          :items="schemaOptions"
          value-key="value"
          icon="i-lucide-folder-tree"
          :disabled="disabled || !schemas.length"
          :placeholder="schemas.length ? 'Schema tanlang' : 'Schema mavjud emas'"
          :search-input="{ placeholder: 'Schema qidirish…' }"
          class="dc-schema-select"
          :ui="{ content: 'dc-schema-menu', item: 'dc-schema-option', itemLabel: 'font-mono', trailingIcon: 'dc-schema-chevron' }"
          @update:model-value="requestSchema"
        >
          <template #empty>
            Schema topilmadi
          </template>
        </USelectMenu>
      </div>
      <label class="dc-search"><UIcon name="i-lucide-search" /><input
        v-model="search"
        type="search"
        placeholder="Schema, table yoki biznes nomi"
        aria-label="Obyekt qidirish"
      ></label>
      <div
        class="dc-filter"
        role="group"
        aria-label="Obyekt turi"
      >
        <button
          v-for="option in filters"
          :key="option.value"
          :aria-pressed="filter === option.value"
          @click="filter = option.value"
        >
          {{ option.label }}
        </button>
      </div>
    </div>
    <SchemaTree
      v-if="visible.length"
      :schemas="activeSchemas"
      :objects="visible"
      :selected-id="selectedId"
      :dirty-ids="dirtyIds"
      :disabled="disabled || loading"
      :searching="true"
      @select="$emit('select', $event)"
    />
    <div
      v-else
      class="dc-state dc-state-small"
      role="status"
    >
      {{ loading ? 'Tables yuklanmoqda…' : objects.length ? 'Natija topilmadi. Qidiruv yoki filtrni o‘zgartiring.' : 'Bu schemada metadata mavjud emas.' }}
    </div>
    <div class="dc-explorer-footer">
      <button
        class="dc-button"
        :disabled="page === 0"
        aria-label="Oldingi sahifa"
        @click="page--"
      >
        ←
      </button>
      <span>{{ filtered.length ? page * pageSize + 1 : 0 }}–{{ Math.min((page + 1) * pageSize, filtered.length) }} / {{ filtered.length }}</span>
      <button
        class="dc-button"
        :disabled="(page + 1) * pageSize >= filtered.length"
        aria-label="Keyingi sahifa"
        @click="page++"
      >
        →
      </button>
    </div>
  </aside>
</template>
