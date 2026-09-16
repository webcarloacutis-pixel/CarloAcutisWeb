import { backendOrigin } from "./backend-origin"
/** Browser requests always stay on this origin; server requests require an explicit backend. */
export function apiUrl(path: string) {
  const normalized = '/' + path.replace(/^\/+/, '').replace(/^api\//, '')
  if (/^[a-z]+:/i.test(path) || normalized.includes('..') || normalized.startsWith('//')) throw new Error('Invalid API path')
  if (typeof window !== 'undefined') return '/api' + normalized
  return backendOrigin() + normalized
}
