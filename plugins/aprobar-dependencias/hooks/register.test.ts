import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'

// Simula el motor: responde las preguntas al usuario con `respuesta`
// y anota cada comando que de verdad se ejecuta.
const preparar = (on: On, respuesta: string) => {
  const preguntas: string[] = []
  const ejecutados: string[] = []
  on('tool.call', ($, e) => {
    if (e.tool === 'AskUserQuestion') {
      const q = e.questions[0]?.question ?? ''
      preguntas.push(q)
      return { result: { questions: e.questions, answers: { [q]: respuesta } } }
    }
    if (e.tool === 'Bash') {
      ejecutados.push(e.command)
    }
    return { result: 'ejecutado' }
  })
  return { preguntas, ejecutados }
}

test('un paquete: pregunta sí/no y deja instalar si aprueba', async ($, on) => {
  const { preguntas, ejecutados } = preparar(on, 'Sí, instálalo')
  const r = await $.tool.call({ tool: 'Bash', command: 'npm install lodash' })
  expect(preguntas).toEqual(['Claude quiere instalar lodash con npm install. ¿Lo permites?'])
  expect(r.deny).toBeUndefined()
  expect(ejecutados).toEqual(['npm install lodash'])
})

test('un paquete: bloquea si dice que no', async ($, on) => {
  const { ejecutados } = preparar(on, 'No')
  const r = await $.tool.call({ tool: 'Bash', command: 'pip install requests -q' })
  expect(r.deny).toContain('no aprobó instalar requests')
  expect(ejecutados).toEqual([])
})

test('varios: instala solo los aprobados y avisa a Claude', async ($, on) => {
  const { preguntas, ejecutados } = preparar(on, 'lodash, dayjs')
  const r = await $.tool.call({ tool: 'Bash', command: 'cd app && npm install -D lodash axios dayjs && npm test' })
  expect(preguntas).toEqual(['Claude quiere instalar estos paquetes con npm install. ¿Cuáles apruebas?'])
  expect(ejecutados).toEqual(['cd app && npm install -D lodash dayjs && npm test'])
  expect(r.deny).toBeUndefined()
  expect(r.context?.[0]).toContain('rechazó axios')
})

test('varios: si aprueba todos, el comando no cambia', async ($, on) => {
  const { ejecutados } = preparar(on, 'lodash, axios')
  await $.tool.call({ tool: 'Bash', command: 'npm i lodash axios' })
  expect(ejecutados).toEqual(['npm i lodash axios'])
})

test('varios: lo escrito en "Other" bloquea y le llega a Claude', async ($, on) => {
  const { ejecutados } = preparar(on, 'usa dayjs en vez de moment')
  const r = await $.tool.call({ tool: 'Bash', command: 'npm i moment lodash' })
  expect(r.deny).toContain('Dijo: "usa dayjs en vez de moment"')
  expect(ejecutados).toEqual([])
})

test('no pregunta por comandos que no instalan paquetes', async ($, on) => {
  const { preguntas } = preparar(on, 'No')
  await $.tool.call({ tool: 'Bash', command: 'npm install' })
  await $.tool.call({ tool: 'Bash', command: 'ls -la' })
  expect(preguntas).toEqual([])
})

test('no confunde un texto que solo menciona una instalación (falso positivo)', async ($, on) => {
  const { preguntas, ejecutados } = preparar(on, 'No')
  await $.tool.call({ tool: 'Bash', command: `cat > notas.md <<'EOF'\nPara empezar: npm install lodash\nEOF` })
  await $.tool.call({ tool: 'Bash', command: `echo "usa npm install axios"` })
  expect(preguntas).toEqual([])
  expect(ejecutados.length).toBe(2)
})

const PROPS = { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100, scroll: { offset: 0, bodyRows: 10 }, view: {} }

for (const surface of ['terminal', 'desktop'] as const) {
  test(`la franja mezcla aprobados y rechazados y se limpia (${surface})`, async ($, on) => {
    preparar(on, 'lodash, dayjs')
    on('ui.render', () => ({ type: 'Box', props: {}, children: [] }) as never) // lo que el motor dibuja sin el mod

    await $.tool.call({ tool: 'Bash', command: 'npm install lodash axios dayjs' })

    const franja = await $.ui.mount({ plugin: 'aprobar-dependencias', surface, component: 'AbovePrompt', props: PROPS })
    expect((await franja.find({ text: /lodash/ }))?.text).toContain('✅')
    expect((await franja.find({ text: /axios/ }))?.text).toContain('⛔')
    expect((await franja.find({ text: /dayjs/ }))?.text).toContain('✅')

    await franja.press({ key: 'limpiar' })
    expect(await franja.find({ text: /lodash/ })).toBeUndefined()
  })
}
