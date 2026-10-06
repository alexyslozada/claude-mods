import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

const VIERNES = Date.parse('2026-10-09T16:00:00-05:00')
const MARTES = Date.parse('2026-10-06T16:00:00-05:00')

const preparar = (on: On, now: number) => {
  mock.clock(on, { now })
  on('ui.toast', () => ({ value: undefined }))
  on('tool.call', () => ({ result: 'ejecutado' }))
}

test('el viernes bloquea git push', async ($, on) => {
  preparar(on, VIERNES)
  const r = await $.tool.call({ tool: 'Bash', command: 'git push origin main' })
  expect(r.deny).toContain('viernes')
})

test('el viernes deja pasar otros comandos', async ($, on) => {
  preparar(on, VIERNES)
  const r = await $.tool.call({ tool: 'Bash', command: 'git status' })
  expect(r.deny).toBeUndefined()
})

test('el martes deja hacer git push', async ($, on) => {
  preparar(on, MARTES)
  const r = await $.tool.call({ tool: 'Bash', command: 'git push origin main' })
  expect(r.deny).toBeUndefined()
})
