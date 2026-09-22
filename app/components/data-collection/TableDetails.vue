<script setup lang="ts">
import type { BusinessMetadata, DatabaseObject } from '~/types/database'
import ColumnsTable from './ColumnsTable.vue'

const props = defineProps<{ table: DatabaseObject, disabled: boolean, saving: boolean, dirty: boolean, columnsLoading: boolean, columnsError: string }>()
const emit = defineEmits<{ update: [table: DatabaseObject], save: [] }>()
const pkCount = computed(() => props.table.primaryKeyCount ?? props.table.columns.filter(column => column.primaryKey).length)
const fkCount = computed(() => props.table.foreignKeyCount ?? props.table.columns.filter(column => column.isForeignKey || column.foreignKey).length)
function update(patch: Partial<BusinessMetadata>) {
  emit('update', { ...props.table, ...patch })
}
function text(event: Event) {
  return (event.target as HTMLInputElement).value
}
</script>

<template>
  <section
    class="erp-panel dc-details"
    aria-labelledby="table-detail-title"
    :aria-busy="saving"
  >
    <div class="dc-details-heading">
      <div>
        <div class="dc-object-path">
          <UIcon name="i-lucide-folder" /><code>{{ table.schema }}</code><span>/</span><span class="dc-badge">{{ table.objectType }}</span>
        </div><h2 id="table-detail-title">
          <code>{{ table.technicalName }}</code>
        </h2><p>{{ table.businessName || 'Biznes nomi kiritilmagan' }}</p>
      </div><span
        v-if="dirty"
        class="dc-badge dc-amber"
      >Saqlanmagan</span><span
        v-else
        class="dc-badge dc-green"
      ><UIcon name="i-lucide-check" />Metadata</span>
    </div>
    <div class="dc-details-stats">
      <span><strong>{{ table.columnCount ?? table.columns.length }}</strong> columns</span><span><UIcon name="i-lucide-key-round" /><strong>{{ pkCount }}</strong> PK</span><span><UIcon name="i-lucide-link" /><strong>{{ fkCount }}</strong> FK</span>
    </div>
    <form
      class="dc-metadata-form"
      @submit.prevent="$emit('save')"
    >
      <fieldset :disabled="disabled">
        <legend class="sr-only">
          Obyektning biznes tavsifi
        </legend><div class="dc-name-toggle">
          <label class="dc-field"><span>Business name <small>Biznes nomi</small></span><input
            :value="table.businessName"
            maxlength="150"
            placeholder="Tushunarli biznes nomini kiriting"
            @input="update({ businessName: text($event) })"
          ></label><label class="dc-ai-toggle"><span><strong>AI enabled</strong><small>Yig'ish uchun tanlash</small></span><input
            type="checkbox"
            role="switch"
            :checked="table.aiEnabled"
            @change="update({ aiEnabled: ($event.target as HTMLInputElement).checked })"
          ><span
            class="dc-switch-track"
            aria-hidden="true"
          /></label>
        </div><label class="dc-field"><span>Description <small>Biznes tavsifi</small></span><textarea
          :value="table.description"
          maxlength="1000"
          rows="3"
          placeholder="Ushbu obyekt qanday ma’lumotlarni saqlashini tavsiflang"
          @input="update({ description: text($event) })"
        /><small class="dc-field-hint">{{ table.description.length }} / 1000 belgi · Texnik metadata o'zgartirilmaydi</small></label>
      </fieldset>
    </form>
    <ColumnsTable
      v-if="!columnsLoading && !columnsError"
      :key="table.id"
      :columns="table.columns"
      :disabled="disabled"
      :table-enabled="table.aiEnabled"
      @update="emit('update', { ...table, columns: $event })"
    />
    <div class="dc-save-bar">
      <div><span>{{ dirty ? 'Saqlanmagan o‘zgarishlar mavjud' : 'Saqlanmagan o‘zgarishlar yo‘q' }}<small>Faqat o‘zgargan semantic qiymatlar saqlanadi.</small></span></div><button
        class="dc-button dc-button-primary"
        :disabled="disabled || saving || !dirty"
        @click="$emit('save')"
      >
        <UIcon
          :name="saving ? 'i-lucide-loader-circle' : 'i-lucide-save'"
          :class="{ 'dc-spin': saving }"
        />{{ saving ? 'Saqlanmoqda…' : 'Save changes' }}
      </button>
    </div>
  </section>
</template>
