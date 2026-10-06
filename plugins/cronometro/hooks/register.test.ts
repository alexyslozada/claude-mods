import { expect, test } from 'claude-code/testing'

test('cuenta herramientas y deja el resumen del turno', async ($, on) => {
  const toasts: string[] = []
  const statuses: (string | undefined)[] = []
  on('ui.toast', ($, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  on('ui.status', ($, e) => {
    statuses.push(e.text)
    return { value: undefined }
  })
  on('prompt.submit', ($, e) => ({ text: e.text }))
  on('tool.call', () => ({ result: 'ok' }))
  on('turn.complete', ($, e) => ({ text: e.answer }))

  await $.prompt.submit({ text: 'hola', wait: false, origin: { kind: 'composer' } })
  await $.tool.call({ tool: 'Bash', command: 'ls' })
  await $.turn.complete({ answer: 'listo', durationMs: 12_400, isAborted: false, turnId: 't1', reason: 'answer' })

  expect(statuses).toEqual(['🛠 1 herramienta · última: Bash', '⏱ Último turno: 12s · 1 herramienta'])
  expect(toasts).toEqual(['⏱ Último turno: 12s · 1 herramienta'])
})
