import { test, expect } from 'claude-code/testing'

const turno = { answer: '', durationMs: 1, isAborted: false, reason: 'answer' as const }

test('el toast muestra cuánto creció el contexto', async ($, on) => {
  const toasts: string[] = []
  const status: (string | undefined)[] = []
  const contextos = [70000, 78000]
  const costos = [0.5, 0.62]
  on('ui.toast', (_$, e) => { toasts.push(e.text); return { value: undefined } })
  on('ui.status', (_$, e) => { status.push(e.text); return { value: undefined } })
  on('session.usage', () => ({ value: { startedAt: 0, rateLimits: [], context: { tokens: contextos.shift(), window: 200000, percent: 39 }, cost: { usd: costos.shift() ?? 0 } } }))
  on('session.start', () => ({ cwd: '/' }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))

  await $.session.start({ cwd: '/' } as never)
  await $.turn.complete({ ...turno, turnId: 't1' })

  expect(toasts).toEqual(['Esta respuesta: +8k tokens al contexto · $0.12 vía API'])
  expect(status.at(-1)).toBe('🪙 contexto: 78k / 200k (39%) · 💵 API: $0.62')
})

test('ignora los turnos de subagentes', async ($, on) => {
  const toasts: string[] = []
  on('ui.toast', (_$, e) => { toasts.push(e.text); return { value: undefined } })
  on('session.usage', () => ({ value: { startedAt: 0, rateLimits: [], context: { tokens: 90000, window: 200000 } } }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))

  await $.turn.complete({ ...turno, turnId: 't2', agentId: 'a1' })

  expect(toasts).toEqual([])
})
