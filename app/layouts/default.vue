<script setup lang="ts">
import '~/assets/css/dashboard.css'

const collapsed = useCookie<boolean>('erp-sidebar-collapsed', { default: () => false, sameSite: 'lax' })
const mobileOpen = ref(false)
const header = ref<{ focusMenu: () => void } | null>(null)
function restoreMenuFocus(event: Event) {
  event.preventDefault()
  header.value?.focusMenu()
}
const route = useRoute()
watch(() => route.fullPath, () => {
  mobileOpen.value = false
})
useHead({ htmlAttrs: { lang: 'uz' } })
</script>

<template>
  <div
    class="erp-shell"
    :class="{ 'erp-collapsed': collapsed }"
  >
    <a
      class="erp-skip"
      href="#main-content"
    >Asosiy kontentga o'tish</a>
    <AppSidebar
      :collapsed="collapsed"
      class="erp-desktop-sidebar"
      @toggle="collapsed = !collapsed"
    />
    <USlideover
      v-model:open="mobileOpen"
      side="left"
      :content="{ onCloseAutoFocus: restoreMenuFocus }"
      title="Asosiy navigatsiya"
      description="ERP Sport AI bo'limlari"
      :ui="{ content: 'max-w-80', body: 'p-0 sm:p-0' }"
    >
      <template #body>
        <AppSidebar
          :collapsed="false"
          mobile
          @navigate="mobileOpen = false"
        />
      </template>
    </USlideover>
    <div class="erp-body">
      <AppHeader
        ref="header"
        :mobile-open="mobileOpen"
        @open-menu="mobileOpen = true"
      /><main
        id="main-content"
        class="erp-main"
        tabindex="-1"
      >
        <slot />
      </main><footer class="erp-footer">
        <span>ERP Sport AI · Yagona tahliliy platforma</span><span>Namoyish muhiti · v1.0</span>
      </footer>
    </div>
  </div>
</template>
