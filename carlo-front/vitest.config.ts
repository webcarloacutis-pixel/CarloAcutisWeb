import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
export default defineConfig({resolve:{alias:{'@':fileURLToPath(new URL('.',import.meta.url))}},test:{exclude:['**/node_modules/**','**/.next/**','tests/browser/**'],testTimeout:10000}})
