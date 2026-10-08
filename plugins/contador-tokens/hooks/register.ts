import type { Register, EngineInterface } from 'claude-code'

// 12345 -> "12.3k"
const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : `${n}`)

// $1.2345 -> "$1.23"
const usd = (n: number) => `$${n.toFixed(2)}`

// Tokens y costo de la sesión al terminar la respuesta anterior.
let anterior = 0
let costoAnterior = 0

// Barra de estado: tokens que ocupa hoy el contexto y lo que costaría vía API.
const refreshStatus = async ($: EngineInterface) => {
  const { context, cost } = await $.session.usage()
  const tokens = context.tokens ?? 0
  const costo = cost?.usd ?? 0
  $.ui.status(`🪙 contexto: ${fmt(tokens)} / ${fmt(context.window)} (${context.percent ?? 0}%) · 💵 API: ${usd(costo)}`)
  return { tokens, costo }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    const inicio = await refreshStatus($)
    anterior = inicio.tokens
    costoAnterior = inicio.costo
    return result
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)

    // Solo el hilo principal: los subagentes también completan turnos.
    if (e.agentId === undefined) {
      const { tokens, costo } = await refreshStatus($)
      const crecio = tokens - anterior
      const gasto = costo - costoAnterior
      anterior = tokens
      costoAnterior = costo
      // Tras compactar, el contexto baja: ahí no hay crecimiento que mostrar.
      const contexto = crecio > 0 ? `+${fmt(crecio)} tokens al contexto · ` : ''
      $.ui.toast(`Esta respuesta: ${contexto}${usd(gasto)} vía API`)
    }

    return result
  })
}
