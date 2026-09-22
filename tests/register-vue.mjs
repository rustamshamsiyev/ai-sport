import { createRequire, registerHooks } from 'node:module'
import { pathToFileURL } from 'node:url'

// Match Nuxt's Vue resolution without adding a second runtime to this project.
const requireNuxt = createRequire(import.meta.resolve('nuxt'))
const vueUrl = pathToFileURL(requireNuxt.resolve('vue')).href
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'vue') return { url: vueUrl, shortCircuit: true }
    return nextResolve(specifier, context)
  }
})
