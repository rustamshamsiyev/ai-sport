<template>
  <UApp>
    <ClientOnly>
      <NuxtLayout><NuxtPage /></NuxtLayout>
      <template #fallback>
        <div role="status">
          Yuklanmoqda…
        </div>
      </template>
    </ClientOnly>
  </UApp>
</template>
