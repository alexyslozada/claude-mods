import { expect, mock, test } from 'claude-code/testing'

// El system prompt "del motor" en la prueba: una sola sección.
const BASE = { sections: [{ id: 'intro', text: 'Eres Claude.', scope: 'shared' as const }] }

// Lo que el motor sabe al armar un system prompt.
const COMPOSE = { model: 'claude-opus-5-5', promptModel: 'claude-opus-5-5', surfaces: ['terminal' as const], tools: [], outputStyle: null, traits: [] }

const comando = (command: string, args = '') => ({ command, args, origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 100 } })

test('/nota guarda y se lo dice a Claude', async ($, on) => {
  mock.store(on)
  const r = await $.command.run(comando('nota', 'prefiero respuestas cortas'))
  expect(r.text).toBe('📝 Nota 1 guardada: prefiero respuestas cortas')
  expect(r.context?.[0]).toContain('prefiero respuestas cortas')
})

test('las notas llegan al system prompt, al final', async ($, on) => {
  mock.store(on, { notas: ['prefiero respuestas cortas', 'trabajo con Go'] })
  on('prompt.compose', () => BASE)
  const { sections } = await $.prompt.compose(COMPOSE)
  expect(sections.map(s => s.id)).toEqual(['intro', 'mis-notas:notas'])
  expect(sections[1]?.text).toContain('1. prefiero respuestas cortas\n2. trabajo con Go')
})

test('sin notas, el system prompt no cambia', async ($, on) => {
  mock.store(on)
  on('prompt.compose', () => BASE)
  expect((await $.prompt.compose(COMPOSE)).sections).toEqual(BASE.sections)
})

test('/notas lista y /olvidar borra', async ($, on) => {
  mock.store(on, { notas: ['a', 'b', 'c'] })
  expect((await $.command.run(comando('notas'))).text).toBe('📝 Tus notas:\n1. a\n2. b\n3. c')
  expect((await $.command.run(comando('olvidar', '2'))).text).toBe('🗑 Olvidé la nota 2: b')
  expect((await $.command.run(comando('notas'))).text).toBe('📝 Tus notas:\n1. a\n2. c')
})

test('/olvidar con un número que no existe no borra nada', async ($, on) => {
  mock.store(on, { notas: ['a'] })
  expect((await $.command.run(comando('olvidar', '7'))).text).toContain('No hay nota 7')
  expect((await $.command.run(comando('notas'))).text).toBe('📝 Tus notas:\n1. a')
})
