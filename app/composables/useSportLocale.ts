import { sportCopy } from '~/data/sport-copy'

export function useSportLocale() {
  type Locale = keyof typeof sportCopy
  const cookie = useCookie<string>('erp-sport-language', { default: () => 'uz', sameSite: 'lax', maxAge: 31536000 })
  const locale = computed<Locale>({
    get: () => cookie.value === 'ru' || cookie.value === 'en' ? cookie.value : 'uz',
    set: (value) => { cookie.value = value }
  })
  const t = computed(() => sportCopy[locale.value])
  useHead(() => ({ htmlAttrs: { lang: locale.value } }))
  return { locale, t }
}
