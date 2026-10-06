import type { Register } from 'claude-code'

const plural = (n: number) => `${n} ${n === 1 ? 'herramienta' : 'herramientas'}`

export const register: Register = on => {
  let tools = 0

  // 1. Envías un mensaje: pongo el contador a cero.
  on('prompt.submit', ($, e, next) => {
    tools = 0

    return next(e)
  })

  // 2. Claude usa una herramienta: la cuento y lo muestro en la barra de estado.
  on('tool.call', ($, e, next) => {
    tools += 1
    $.ui.status(`🛠 ${plural(tools)} · última: ${e.tool}`)

    return next(e)
  })

  // 3. Termina el turno principal: dejo el resumen fijo y muestro un toast de 10 s.
  on('turn.complete', ($, e, next) => {
    if (e.agentId === undefined) {
      const resumen = `⏱ Último turno: ${Math.round(e.durationMs / 1000)}s · ${plural(tools)}`
      $.ui.status(resumen)
      $.ui.toast(resumen, { timeoutMs: 10_000 })
    }

    return next(e)
  })
}
