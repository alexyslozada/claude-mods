# claude-mods

Mods de ejemplo para [Claude Code](https://claude.com/claude-code), escritos en TypeScript.

Un **mod** es un plugin con funciones que se enganchan a los eventos de Claude Code para cambiar su comportamiento o su interfaz: bloquear un comando, pedirte confirmación, dibujar una franja encima del prompt o añadir instrucciones al modelo.

> ⚠️ Los mods se ejecutan con los mismos permisos que Claude Code en tu máquina. Revisa el código antes de instalarlos.

## Los mods

| Mod | Qué hace | Lo que muestra |
|---|---|---|
| [`cronometro`](plugins/cronometro) | Muestra cuánto tardó cada turno y cuántas herramientas usó Claude | `turn.complete`, `$.ui.status`, `$.ui.toast` |
| [`viernes-sin-deploy`](plugins/viernes-sin-deploy) | Bloquea `git push` los viernes 🍻 | Bloquear con `{ deny }` |
| [`aprobar-dependencias`](plugins/aprobar-dependencias) | Te pregunta antes de instalar paquetes (`npm`, `pip`, `go get`…), te deja elegir cuáles e instala solo esos | `$.ui.ask`, reescribir el comando, `$.state`, franja con `ui.render` |
| [`mis-notas`](plugins/mis-notas) | Guardas notas con `/nota` y Claude las usa como tu contexto y tus preferencias en todas las sesiones | Comandos propios, `$.store`, `prompt.compose` |
| [`contador-tokens`](plugins/contador-tokens) | Muestra en la barra de estado los tokens del contexto y cuánto costaría la sesión vía API, y un toast con lo que sumó cada respuesta | `session.start`, `$.session.usage`, `$.ui.status`, `$.ui.toast` |

## Instalación

En una sesión de Claude Code en la terminal:

```
/plugin install cronometro --marketplace alexyslozada/claude-mods
```

Responde `y` para añadir el marketplace y elige el alcance (`user` para todas tus sesiones). Cambia `cronometro` por el mod que quieras:

```
/plugin install viernes-sin-deploy --marketplace alexyslozada/claude-mods
/plugin install aprobar-dependencias --marketplace alexyslozada/claude-mods
/plugin install mis-notas --marketplace alexyslozada/claude-mods
/plugin install contador-tokens --marketplace alexyslozada/claude-mods
```

## Uso

### `mis-notas`

```
/nota prefiero respuestas cortas y con ejemplos
/notas
/olvidar 1
```

### `viernes-sin-deploy`

No hay nada que hacer: los viernes, si Claude intenta `git push`, el mod lo bloquea. Para probarlo otro día, cambia `VIERNES` en [`register.ts`](plugins/viernes-sin-deploy/hooks/register.ts) por el número de hoy (0 = domingo … 6 = sábado).

## Desarrollo

Para probar un mod desde tu copia local:

```bash
claude --plugin-dir ./plugins/cronometro
```

Validar y ejecutar las pruebas:

```bash
claude plugin validate ./plugins/cronometro
claude plugin test ./plugins/cronometro
```

## Estructura

```
.claude-plugin/marketplace.json   ← lista los mods del repositorio
plugins/<mod>/
├── .claude-plugin/plugin.json    ← nombre, versión y descripción
├── hooks/hooks.json              ← qué archivo cargar
├── hooks/register.ts             ← el código del mod
└── hooks/register.test.ts        ← sus pruebas
```
