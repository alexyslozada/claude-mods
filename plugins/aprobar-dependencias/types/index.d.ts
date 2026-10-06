export type Decision = { paquete: string; aprobado: boolean }

declare module 'claude-code' {
  interface PluginState {
    'aprobar-dependencias': { decisiones: Decision[] }
  }
}
