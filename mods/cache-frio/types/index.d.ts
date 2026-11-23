export type Ttl = '5m' | '1h'

/** Lo que dibuja la barra: cuándo se enfría la caché y la hora de la última cuenta. */
export type CacheView = { coldAt: number; ttl: Ttl; checkedAt: number }

declare module 'claude-code' {
  interface PluginState {
    'cache-frio': { view: CacheView | null }
  }
}
