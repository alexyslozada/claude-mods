import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Decision } from '../types'

// Comandos que instalan paquetes, seguidos de lo que se quiere instalar.
// Solo al inicio de un comando (o tras ; && || | o un paréntesis): así un texto
// que apenas menciona "npm install" (un echo, un archivo que se escribe) no cuenta.
const INSTALAR = /(^|[;&|(]\s*)(npm (?:install|i|add)|pnpm add|yarn add|bun add|pip3? install|go get|cargo add|brew install)\s+([^;&|\n'"`]+)/

const SI = 'Sí, instálalo'
const NO = 'No'

// Historial de decisiones: vive en el estado de la sesión y la franja lo lee.
const decisiones = atom({ plugin: 'aprobar-dependencias', key: 'decisiones' } as const, [] as Decision[])

export const register: Register = on => {
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const match = INSTALAR.exec(e.command)
    const paquetes = match?.[3]?.split(/\s+/).filter(p => p && !p.startsWith('-')) ?? []

    // No es una instalación de paquetes concretos → sigue normal.
    if (paquetes.length === 0) {
      return next(e)
    }

    // Le pregunto al usuario: de 2 a 4 paquetes, uno por uno; si no, todo o nada.
    const gestor = match![2]
    const unoPorUno = paquetes.length >= 2 && paquetes.length <= 4
    const respuesta = await $.ui
      .ask(
        unoPorUno
          ? `Claude quiere instalar estos paquetes con ${gestor}. ¿Cuáles apruebas?`
          : `Claude quiere instalar ${paquetes.join(', ')} con ${gestor}. ¿Lo permites?`,
        unoPorUno
          ? { header: 'Dependencia', options: paquetes, multiSelect: true }
          : { header: 'Dependencia', options: [SI, NO] },
      )
      .catch(() => NO) // si cierra el diálogo, cuenta como "No"

    // multiSelect responde "lodash, dayjs"; me quedo con los que reconozco.
    const aprobados = unoPorUno
      ? respuesta.split(',').map(p => p.trim()).filter(p => paquetes.includes(p))
      : respuesta === SI ? paquetes : []
    const rechazados = paquetes.filter(p => !aprobados.includes(p))

    // ¿Escribió algo en "Other"? Se lo paso a Claude tal cual.
    const escribio = unoPorUno ? aprobados.length === 0 && respuesta !== NO : respuesta !== SI && respuesta !== NO
    const comentario = escribio ? ` Dijo: "${respuesta}".` : ''

    // Guardo cada decisión: al escribir el estado, la franja se redibuja sola.
    await update($, decisiones, lista => [...lista, ...paquetes.map(paquete => ({ paquete, aprobado: aprobados.includes(paquete) }))])

    // Ninguno aprobado → bloqueo.
    if (aprobados.length === 0) {
      return {
        deny: `El usuario no aprobó instalar ${paquetes.join(', ')}.${comentario} No lo instales de otra forma; pregúntale cómo prefiere seguir.`,
      }
    }

    // Todos aprobados → sigue normal.
    if (rechazados.length === 0) {
      return next(e)
    }

    // Algunos → reescribo el comando sin los rechazados (las opciones como -D se quedan).
    const resto = match![3]!.split(/\s+/).filter(t => t && (t.startsWith('-') || aprobados.includes(t)))
    const command = e.command.replace(match![0], `${match![1]}${gestor} ${resto.join(' ')} `).trim()
    const ran = await next({ ...e, command })

    // Y le dejo una nota a Claude (el usuario no la ve) para que sepa qué pasó.
    return ran.deny !== undefined
      ? ran
      : {
          ...ran,
          context: [
            ...(ran.context ?? []),
            `aprobar-dependencias: el usuario solo aprobó ${aprobados.join(', ')}; rechazó ${rechazados.join(', ')}. ` +
              `Se ejecutó "${command}" en lugar del comando original. No instales ${rechazados.join(', ')} de otra forma.`,
          ],
        }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: 'aprobar-dependencias falló; no instalo nada sin aprobación.' }))

  // La franja encima del prompt.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const lista = await read($, decisiones)

    // Sin decisiones (o si hay una encuesta en pantalla) → no dibujo nada.
    if (lista.length === 0 || e.props.hasSurvey) {
      return next(e)
    }

    const { Box, Text, Button } = $.ui.resolve(e)

    return (
      <Box borderStyle="round" paddingX={1} gap={2}>
        <Text bold>📦 Dependencias</Text>
        <Box gap={2} flexWrap="wrap" flexGrow={1}>
          {lista.map(d => (
            <Text color={d.aprobado ? 'success' : 'error'}>
              {d.aprobado ? '✅' : '⛔'} {d.paquete}
            </Text>
          ))}
        </Box>
        <Button key="limpiar" label="Limpiar" onPress={() => update($, decisiones, () => [])} />
      </Box>
    )
  })
}
