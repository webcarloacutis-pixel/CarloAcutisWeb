// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { AIChatFullscreen } from "./ai-chat-fullscreen"
import { postAiChat } from "@/lib/ai-client"
import type { ChatMessage } from "@/contexts/user-context"
const state = vi.hoisted(() => ({
  user: { id: "account-a", name: "", email: "synthetic@example.invalid" } as { id: string; name: string; email: string } | null,
  currentConversation: null as { id: string; messages: ChatMessage[] } | null,
  createConversation: vi.fn(), updateConversation: vi.fn(),
}))
vi.mock("@/contexts/user-context", () => ({ useUser: () => ({ ...state, isAuthenticated: Boolean(state.user) }) }))
vi.mock("@/contexts/language-context", () => ({ useLanguage: () => ({ language: "es", t: (key: string) => key }) }))
vi.mock("@/components/chat-sidebar", () => ({ ChatSidebar: () => <div>History test boundary</div> }))
vi.mock("@/components/auth-modal", () => ({ AuthModal: () => null }))
vi.mock("@/lib/ai-client", () => ({ postAiChat: vi.fn() }))
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}
function submit(text = "Synthetic question") {
  fireEvent.change(screen.getByLabelText("Mensaje para la IA"), { target: { value: text } })
  fireEvent.click(screen.getByLabelText("Enviar mensaje"))
}
beforeEach(() => {
  state.user = { id: "account-a", name: "", email: "synthetic@example.invalid" }
  state.currentConversation = { id: "conversation-a", messages: [] }
  state.createConversation.mockReset()
  state.updateConversation.mockReset().mockResolvedValue(true)
  vi.mocked(postAiChat).mockReset()
  Element.prototype.scrollIntoView = vi.fn()
})
afterEach(cleanup)
it.each(["conversation", "account"])("does not show or save a late AI response after changing %s", async (changed) => {
  const pending = deferred<{ answer: string }>()
  vi.mocked(postAiChat).mockReturnValueOnce(pending.promise)
  const view = render(<AIChatFullscreen />)
  submit()
  await waitFor(() => expect(postAiChat).toHaveBeenCalledTimes(1))
  const signal = vi.mocked(postAiChat).mock.calls[0][1]!
  if (changed === "account") state.user = { id: "account-b", name: "B", email: "synthetic-b@example.invalid" }
  state.currentConversation = { id: "conversation-b", messages: [] }
  view.rerender(<AIChatFullscreen />)
  expect(signal.aborted).toBe(true)
  expect(screen.queryByText("Synthetic question")).toBeNull()
  await act(async () => { pending.resolve({ answer: "LATE PRIVATE RESPONSE" }); await pending.promise })
  expect(screen.queryByText("LATE PRIVATE RESPONSE")).toBeNull()
  expect(state.updateConversation).toHaveBeenCalledTimes(1)
})
it("keeps the initial request attached to the newly created conversation", async () => {
  state.currentConversation = null
  const created = { id: "created-conversation", messages: [] }
  const pending = deferred<{ answer: string }>()
  state.createConversation.mockResolvedValueOnce(created)
  vi.mocked(postAiChat).mockReturnValueOnce(pending.promise)
  const view = render(<AIChatFullscreen />)
  submit("First message")
  await waitFor(() => expect(postAiChat).toHaveBeenCalledTimes(1))
  const signal = vi.mocked(postAiChat).mock.calls[0][1]!
  state.currentConversation = created
  view.rerender(<AIChatFullscreen />)
  expect(signal.aborted).toBe(false)
  expect(screen.getByText("First message")).toBeTruthy()
  await act(async () => { pending.resolve({ answer: "First response" }); await pending.promise })
  expect(screen.getByText("First response")).toBeTruthy()
  expect(state.updateConversation.mock.calls.map(([id]) => id)).toEqual([created.id, created.id])
  expect(state.updateConversation.mock.calls[1][1].map((message: ChatMessage) => message.content)).toEqual(["First message", "First response"])
})
it("does not contact the AI when message persistence finishes after selection changed", async () => {
  const saving = deferred<boolean>()
  state.updateConversation.mockReturnValueOnce(saving.promise)
  const view = render(<AIChatFullscreen />)
  submit()
  await waitFor(() => expect(state.updateConversation).toHaveBeenCalledTimes(1))
  state.currentConversation = { id: "conversation-b", messages: [] }
  view.rerender(<AIChatFullscreen />)
  await act(async () => { saving.resolve(true); await saving.promise })
  expect(postAiChat).not.toHaveBeenCalled()
  expect(screen.queryByText("Synthetic question")).toBeNull()
})
