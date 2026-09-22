<script setup lang="ts">
import { sportModules, moduleCopy } from '~/data/sport-modules'

definePageMeta({ layout: false })

const { locale, t } = useSportLocale()
const moduleText = computed(() => moduleCopy[locale.value])
useSeoMeta({ title: () => t.value.seo, description: () => t.value.intro })
const prompt = ref('')
const submitted = ref(false)
const menuOpen = ref(false)
const navTargets = ['#tools', '#how-it-works', '#erp-sport']
function selectPrompt(value: string) {
  prompt.value = value
  submitted.value = false
  document.getElementById('prompt-input')?.focus({ preventScroll: true })
  document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
function submit() {
  if (prompt.value.trim()) submitted.value = true
}
</script>

<template>
  <div class="site-shell">
    <header class="site-header">
      <a
        href="#"
        class="brand"
        aria-label="ERP Sport AI"
      ><span class="brand-mark"><UIcon name="i-lucide-activity" /></span><span>ERP <span class="sport-word">SPORT</span></span><span class="brand-ai">AI</span></a>
      <nav
        class="desktop-nav"
        :aria-label="t.menu"
      >
        <a
          v-for="(label, index) in t.nav"
          :key="index"
          :href="navTargets[index]"
        >{{ label }}</a>
      </nav>
      <div class="header-actions">
        <ThemeToggle />
        <label class="language-picker"><UIcon name="i-lucide-globe" /><span class="sr-only">{{ t.language }}</span><select v-model="locale"><option value="uz">O‘zbekcha</option><option value="ru">Русский</option><option value="en">English</option></select></label><a
          class="header-cta"
          href="#workspace"
        >{{ t.start }} <UIcon name="i-lucide-arrow-up-right" /></a><button
          class="mobile-menu-button"
          :aria-label="t.menu"
          :aria-expanded="menuOpen"
          @click="menuOpen = !menuOpen"
        >
          <UIcon :name="menuOpen ? 'i-lucide-x' : 'i-lucide-menu'" />
        </button>
      </div>
      <nav
        v-if="menuOpen"
        class="mobile-nav"
        :aria-label="t.menu"
      >
        <a
          v-for="(label, index) in t.nav"
          :key="index"
          :href="navTargets[index]"
          @click="menuOpen = false"
        >{{ label }}</a>
      </nav>
    </header>
    <main>
      <section class="hero">
        <div
          class="hero-grid"
          aria-hidden="true"
        />
        <div class="hero-content">
          <span class="eyebrow"><span class="status-dot" />{{ t.badge }}<UIcon name="i-lucide-arrow-up-right" /></span>
          <h1>{{ t.heading }}<br><span>{{ t.accent }}</span></h1><p class="hero-description">
            {{ t.intro }}
          </p>
          <form
            id="workspace"
            class="prompt-box"
            @submit.prevent="submit"
          >
            <label
              class="sr-only"
              for="prompt-input"
            >{{ t.placeholder }}</label><textarea
              id="prompt-input"
              v-model="prompt"
              :placeholder="t.placeholder"
              maxlength="3000"
              @input="submitted = false"
            /><div class="prompt-bottom">
              <span><UIcon name="i-lucide-sparkles" />{{ t.assistant }}</span><button
                type="submit"
                :disabled="!prompt.trim()"
                :aria-label="t.send"
              >
                <UIcon name="i-lucide-arrow-up" />
              </button>
            </div><div
              v-if="submitted"
              class="demo-notice"
              role="status"
            >
              {{ t.demo }}
            </div>
          </form>
          <div class="suggestions">
            <span>{{ t.try }}</span><button
              v-for="(suggestion, index) in t.suggestions"
              :key="index"
              @click="selectPrompt(t.seeds[index] ?? '')"
            >
              <UIcon :name="['i-lucide-dumbbell', 'i-lucide-calendar-check', 'i-lucide-chart-pie'][index]" />{{ suggestion }}
            </button>
          </div>
          <div class="hero-note">
            <UIcon
              name="i-lucide-circle-check"
              class="mini-stars"
            />{{ t.note }}
          </div>
        </div>
        <SportEcosystem />
      </section>
      <section
        id="tools"
        class="tools-section section-wrap"
      >
        <div class="section-heading">
          <div><span class="section-kicker">{{ t.kicker }}</span><h2>{{ t.toolsTitle }}</h2><p>{{ t.toolsDesc }}</p></div><span class="tool-count">{{ moduleText.count }}<UIcon name="i-lucide-grid-2x2" /></span>
        </div><div class="tools-grid">
          <NuxtLink
            v-for="(tool, index) in sportModules"
            :key="tool.slug"
            class="tool-card"
            :class="`module-${tool.color}`"
            :to="`/${tool.slug}`"
          >
            <span
              class="module-watermark"
              aria-hidden="true"
            >{{ String(index + 1).padStart(2, '0') }}</span>
            <div class="card-top">
              <span
                class="tool-icon"
                :class="tool.color"
              ><UIcon :name="tool.icon" /></span><UIcon
                name="i-lucide-arrow-up-right"
                class="card-corner"
              />
            </div><h3>{{ tool.title[locale] }}</h3><p class="module-status"><span />{{ moduleText.soon }}</p><span class="card-link">{{ moduleText.open }}<UIcon name="i-lucide-arrow-right" /></span>
          </NuxtLink>
        </div>
      </section>
      <section
        id="how-it-works"
        class="steps-section section-wrap"
      >
        <div class="center-heading">
          <span class="section-kicker">{{ t.stepsKicker }}</span><h2>{{ t.stepsTitle }}</h2><p>{{ t.stepsDesc }}</p>
        </div><div class="steps-grid">
          <article
            v-for="(step, index) in t.steps"
            :key="index"
          >
            <span class="step-number">0{{ index + 1 }}</span><h3>{{ step.title }}</h3><p>{{ step.description }}</p>
          </article>
        </div>
      </section>
      <section
        id="erp-sport"
        class="section-wrap"
      >
        <div class="bottom-banner">
          <div class="banner-copy">
            <span class="section-kicker">{{ t.bannerKicker }}</span><h2>{{ t.bannerTitle }}</h2><p>{{ t.bannerDesc }}</p><a
              href="#workspace"
              class="banner-button"
            >{{ t.bannerCta }}<UIcon name="i-lucide-arrow-up-right" /></a>
          </div><div
            class="orbit-art"
            aria-hidden="true"
          >
            <div class="orbit orbit-one" /><div class="orbit orbit-two" /><div class="orbit-core">
              <UIcon name="i-lucide-activity" />
            </div><span class="orbit-dot dot-one" /><span class="orbit-dot dot-two" /><span class="orbit-label">{{ t.orbit }}</span>
          </div>
        </div>
      </section>
    </main>
    <footer class="site-footer section-wrap">
      <a
        href="#"
        class="brand"
        aria-label="ERP Sport AI"
      ><span class="brand-mark"><UIcon name="i-lucide-activity" /></span><span>ERP <span class="sport-word">SPORT</span></span><span class="brand-ai">AI</span></a><p>{{ t.footer }}</p><span>© {{ new Date().getFullYear() }} ERP Sport AI</span>
    </footer>
  </div>
</template>
