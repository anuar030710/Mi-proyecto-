import type { EngineInterface, Register, Timer } from 'claude-code'

type Ttl = '5m' | '1h'

const TTL_MS: Record<Ttl, number> = { '5m': 5 * 60_000, '1h': 60 * 60_000 }
// Cuánto antes de enfriarse llega el aviso previo.
const WARN_BEFORE_MS: Record<Ttl, number> = { '5m': 60_000, '1h': 5 * 60_000 }

// Estado de esta carga del mod (una recarga lo reinicia).
const st: { ttl: Ttl; coldAt: number; timers: Timer[] } = {
  ttl: '5m', // conservador hasta que la API diga cuánto dura la escritura
  coldAt: 0,
  timers: [],
}

function fmt(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  return s >= 60 ? `${Math.ceil(s / 60)} min` : `${s} s`
}

function clearTimers(): void {
  for (const t of st.timers) t.cancel()
  st.timers = []
}

async function showStatus($: EngineInterface): Promise<void> {
  const left = st.coldAt - (await $.clock.now())
  $.ui.status(left > 0 ? `🔥 caché caliente · ${fmt(left)}` : '🧊 caché fría')
}

async function arm($: EngineInterface, sentAt: number): Promise<void> {
  clearTimers()
  const ttl = st.ttl
  st.coldAt = sentAt + TTL_MS[ttl]
  const toCold = Math.max(0, st.coldAt - (await $.clock.now()))
  const toWarn = toCold - WARN_BEFORE_MS[ttl]

  // Notificaciones nativas que la app guarda y lanza aunque no estés mirando la
  // sesión; la misma key reemplaza la anterior en cada petición nueva.
  if (toWarn > 0) {
    void $.ui
      .notify(`La caché se enfría en ${fmt(WARN_BEFORE_MS[ttl])}. Escribe algo para mantenerla.`, {
        title: 'Caché casi fría',
        key: 'cache-soon',
        delayMs: toWarn,
      })
      .catch(() => {})
  } else {
    void $.ui.cancelNotify('cache-soon').catch(() => {})
  }
  void $.ui
    .notify('La caché de prompts se enfrió: el próximo mensaje volverá a escribir todo el contexto.', {
      title: 'Caché fría',
      key: 'cache-cold',
      delayMs: toCold,
    })
    .catch(() => {})

  // Avisos dentro de la sesión.
  if (toWarn > 0) {
    st.timers.push(
      $.clock.after(toWarn, () =>
        $.ui.toast(`⏳ La caché se enfría en ${fmt(WARN_BEFORE_MS[ttl])}`, { timeoutMs: 15_000 }),
      ),
    )
  }
  st.timers.push(
    $.clock.after(toCold, () => {
      $.ui.toast('🧊 La caché de prompts se enfrió', { timeoutMs: 30_000 })
      void showStatus($)
    }),
  )
  st.timers.push($.clock.every(30_000, () => void showStatus($)))
  await showStatus($)
}

export const register: Register = on => {
  // Cada petición del hilo principal al modelo escribe o lee la caché y la renueva.
  on('turn.step', async function* ($, e, next) {
    if (e.agentId !== undefined) return yield* next(e)

    const sentAt = await $.clock.now()
    const result = yield* next(e)
    const u = result.usage
    if (u) {
      if ((u.ephemeral_1h_input_tokens ?? 0) > 0) st.ttl = '1h'
      else if ((u.ephemeral_5m_input_tokens ?? 0) > 0) st.ttl = '5m'
      if (u.cache_creation_input_tokens > 0 || u.cache_read_input_tokens > 0) {
        await arm($, sentAt)
      }
    }
    return result
  })

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'cache',
      description: 'Muestra cuánto le queda a la caché de prompts antes de enfriarse',
    })
    return next(e)
  })

  on('command.run', { command: 'cache' }, async $ => {
    if (st.coldAt === 0) {
      return { text: 'Todavía no hay ninguna petición al modelo registrada desde que se cargó el mod.' }
    }
    const left = st.coldAt - (await $.clock.now())
    return {
      text:
        left > 0
          ? `Caché caliente (TTL ${st.ttl}): se enfría en ${fmt(left)}.`
          : `Caché fría desde hace ${fmt(-left)} (TTL ${st.ttl}).`,
    }
  })

  on('session.end', ($, e, next) => {
    clearTimers()
    return next(e)
  })
}
