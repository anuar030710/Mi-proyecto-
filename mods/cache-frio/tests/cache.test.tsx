import { expect, test } from 'claude-code/testing'

const STEP = { turnId: 't', index: 0, model: 'm', messageCount: 1 } as const

function engine(on: any, clock: { now: number }, notes: string[]) {
  on('clock.now', () => ({ value: clock.now }))
  on('clock.after', () => ({ value: undefined }))
  on('clock.every', () => ({ value: undefined }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.notify', (_: unknown, e: { title?: string }) => {
    notes.push(e.title ?? '')
    return { value: { isSent: true, channel: 'client' } }
  })
  on('command.register', () => ({ value: { command: 'cache' } }))
  on('session.start', (_: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
  on('turn.step', async function* (_: unknown, e: { turnId: string; index: number }) {
    return {
      turnId: e.turnId, index: e.index, answer: 'hola', toolUses: [], stopReason: 'end_turn',
      usage: {
        model: 'm', input_tokens: 10, output_tokens: 5,
        cache_creation_input_tokens: 1000, cache_read_input_tokens: 0,
        ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 1000,
      },
    }
  })
}

test('una escritura de 1h deja la caché caliente ~60 min y agenda los dos avisos', async ($, on) => {
  const clock = { now: 1_000_000 }
  const notes: string[] = []
  engine(on, clock, notes)

  await $.session.start({ cwd: '/', surface: 'mobile', isInteractive: true })
  for await (const _ of $.turn.step(STEP as any)) { /* vaciar */ }
  expect(notes).toEqual(['Caché casi fría', 'Caché fría'])

  clock.now += 10 * 60_000
  const r = await $.command.run({ command: 'cache' } as any)
  expect((r as any).text).toBe('Caché caliente (TTL 1h): se enfría en 50 min.')
})

test('la barra sobre el prompt muestra la cuenta, en cada superficie', async ($, on) => {
  const clock = { now: 1_000_000 }
  engine(on, clock, [])
  for await (const _ of $.turn.step(STEP as any)) { /* vaciar */ }

  for (const surface of ['terminal', 'desktop', 'mobile'] as const) {
    const ui = await $.ui.mount({
      plugin: 'cache-frio', surface, component: 'AbovePrompt',
      props: { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 10 } as any,
    })
    expect((await ui.find({ type: 'Text', text: /Caché caliente/ }))?.text).toBe(
      '🔥 Caché caliente · se enfría en 60 min',
    )
    await ui.unmount()
  }
})
