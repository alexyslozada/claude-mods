import type { EngineInterface, Register } from 'claude-code'

// Las notas viven en el store del mod: un archivo que sobrevive entre sesiones.
const leer = async ($: EngineInterface) => ((await $.store.get('notas')) as string[] | undefined) ?? []
const guardar = ($: EngineInterface, notas: string[]) => $.store.set('notas', notas)

const lista = (notas: string[]) => notas.map((n, i) => `${i + 1}. ${n}`).join('\n')

export const register: Register = on => {
  // 1. Al arrancar, registro los tres comandos.
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'nota', description: 'Guarda una nota de contexto o preferencia para Claude', argumentHint: '<texto>', immediate: true })
    await $.command.register({ name: 'notas', description: 'Muestra tus notas guardadas', immediate: true })
    await $.command.register({ name: 'olvidar', description: 'Borra una nota por su número', argumentHint: '<número>', immediate: true })

    return next(e)
  })

  // 2. /nota <texto> → la guardo y se la digo a Claude ya mismo.
  on('command.run', { command: 'nota' }, async ($, e) => {
    const texto = e.args.trim()
    if (!texto) {
      return { text: 'Uso: /nota <texto>. Por ejemplo: /nota prefiero respuestas cortas' }
    }

    const notas = [...(await leer($)), texto]
    await guardar($, notas)

    return {
      text: `📝 Nota ${notas.length} guardada: ${texto}`,
      context: [`El usuario guardó una nota de contexto o preferencia; tenla en cuenta desde ahora: "${texto}"`],
    }
  })

  // 3. /notas → la lista numerada.
  on('command.run', { command: 'notas' }, async $ => {
    const notas = await leer($)
    return { text: notas.length ? `📝 Tus notas:\n${lista(notas)}` : 'Aún no tienes notas. Guarda una con /nota <texto>.' }
  })

  // 4. /olvidar <n> → borro esa nota.
  on('command.run', { command: 'olvidar' }, async ($, e) => {
    const notas = await leer($)
    const n = Number(e.args.trim())
    const borrada = notas[n - 1]
    if (!Number.isInteger(n) || borrada === undefined) {
      return { text: `No hay nota ${e.args.trim() || '(sin número)'}. Usa /notas para ver los números.` }
    }

    await guardar($, notas.filter((_, i) => i !== n - 1))

    return {
      text: `🗑 Olvidé la nota ${n}: ${borrada}`,
      context: [`El usuario borró esta nota; ya no la tengas en cuenta: "${borrada}"`],
    }
  })

  // 5. Cada vez que se arma el system prompt, añado las notas al final.
  on('prompt.compose', async ($, e, next) => {
    const prompt = await next(e)
    const notas = await leer($)
    if (notas.length === 0) {
      return prompt
    }

    const texto =
      '# Notas del usuario\n' +
      'El usuario guardó estas notas sobre su contexto y sus preferencias. Tenlas en cuenta en todo lo que hagas:\n' +
      lista(notas)

    return { sections: [...prompt.sections, { id: 'mis-notas:notas', text: texto, scope: 'session' }] }
  })
}
