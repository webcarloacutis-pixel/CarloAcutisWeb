import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
export default defineConfig({resolve:{alias:{'@':fileURLToPath(new URL('.',import.meta.url))}},test:{maxWorkers:2,exclude:['**/node_modules/**','**/.next/**','tests/browser/**'],testTimeout:10000,coverage:{provider:"v8",reporter:["text","json-summary","lcov"],include:["lib/**/*.{ts,mjs}","components/**/*.{ts,tsx}","hooks/**/*.ts","contexts/**/*.{ts,tsx}","app/**/route.ts","instrumentation.ts","proxy.ts"],exclude:["**/*.test.*","components/ui/**","lib/*.d.ts"]}}})
