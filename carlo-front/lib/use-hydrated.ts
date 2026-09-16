"use client"
import { useSyncExternalStore } from "react"
const subscribe = () => () => {}
const clientSnapshot = () => true
const serverSnapshot = () => false
// Controlled inputs must not accept edits before React can preserve their value.
export function useHydrated() {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot)
}
