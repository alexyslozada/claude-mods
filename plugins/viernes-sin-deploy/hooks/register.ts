import type { Register } from 'claude-code'

const VIERNES = 5 // 0 = domingo, 1 = lunes … 5 = viernes
const GIT_PUSH = /\bgit\s+push\b/

export const register: Register = on => {
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const hoy = new Date(await $.clock.now()).getDay()

    // ¿Es viernes y Claude quiere hacer git push? → lo bloqueo.
    if (hoy === VIERNES && GIT_PUSH.test(e.command)) {
      $.ui.toast('🍻 Bloqueé un git push. Hoy es viernes.', { timeoutMs: 10_000 })

      return {
        deny: 'Hoy es viernes: no se hace deploy. No intentes el push de otra forma; díselo al usuario y déjalo para el lunes. 🍻',
      }
    }

    // Cualquier otro comando sigue normal.
    return next(e)
  }).catch(($, e, next) => next(e)) // si algo falla, no bloqueo nada
}
