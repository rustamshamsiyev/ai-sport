<script setup lang="ts">
import type { DatabaseObject, DatabaseSchema } from '~/types/database'

const props = defineProps<{ schemas: DatabaseSchema[], objects: DatabaseObject[], selectedId: string | null, dirtyIds: string[], disabled: boolean, searching: boolean }>()
defineEmits<{ select: [id: string] }>()
const collapsed = ref<string[]>([])
const groups = computed(() => props.schemas.map(schema => ({
  name: schema.name,
  objects: props.objects.filter(item => item.schema === schema.name)
})).filter(group => !props.searching || group.objects.length))
function toggle(name: string) {
  collapsed.value = collapsed.value.includes(name) ? collapsed.value.filter(item => item !== name) : [...collapsed.value, name]
}
</script>

<template>
  <div class="dc-schema-list">
    <section
      v-for="group in groups"
      :key="group.name"
      class="dc-schema-group"
      :aria-label="group.name"
    >
      <button
        class="dc-schema-toggle"
        :aria-expanded="searching || !collapsed.includes(group.name)"
        :aria-controls="`schema-${group.name}`"
        :disabled="searching"
        @click="toggle(group.name)"
      >
        <UIcon :name="searching || !collapsed.includes(group.name) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" /><UIcon name="i-lucide-folder" /><code>{{ group.name }}</code><span>{{ group.objects.length }}</span>
      </button>
      <ul
        v-show="searching || !collapsed.includes(group.name)"
        :id="`schema-${group.name}`"
        class="dc-object-list"
      >
        <li
          v-for="item in group.objects"
          :key="item.id"
        >
          <button
            class="dc-object"
            :class="{ 'is-selected': selectedId === item.id }"
            :aria-pressed="selectedId === item.id"
            :disabled="disabled"
            :title="`${item.schema}.${item.technicalName} — ${item.businessName}`"
            @click="$emit('select', item.id)"
          >
            <UIcon :name="item.objectType === 'TABLE' ? 'i-lucide-table-2' : 'i-lucide-panels-top-left'" /><span class="dc-object-label"><code>{{ item.technicalName }}</code><span>{{ item.businessName || 'Biznes nomi kiritilmagan' }}</span></span><span
              v-if="dirtyIds.includes(item.id)"
              class="dc-unsaved-dot"
              aria-label="Saqlanmagan tahrirlar"
              title="Saqlanmagan tahrirlar"
            /><UIcon
              v-else-if="item.aiEnabled"
              name="i-lucide-circle-check"
              class="dc-enabled-icon"
              aria-label="AI uchun tanlangan"
            />
          </button>
        </li>
        <li
          v-if="!group.objects.length"
          class="dc-schema-empty"
        >
          Bu schemada obyektlar yo'q.
        </li>
      </ul>
    </section>
  </div>
</template>
