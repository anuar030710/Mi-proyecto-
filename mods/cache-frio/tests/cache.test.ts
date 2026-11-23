import { expect, test } from 'claude-code/testing'

test('una petición con escritura de 1h deja la caché caliente ~60 min', async ($, on) => {
  let now = 1_000_000
  const notes: string[] = []
  on('clock.now', () => ({ value: now }))
  on('clock.after', () => ({ value: undefined }))
  on('clock.every', () => ({ value: undefined }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.notify', (_, e) => { notes.push(e.title ?? ''); return { value: { isSent: true, channel: 'client' } } })
  on('command.register', () => ({ value: { command: 'cache' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.step', async function* (_, e) {
    return {
      turnId: e.turnId, index: e.index, answer: 'hi', toolUses: [], stopReason: 'end_turn',
      usage: {
        model: 'm', input_tokens: 10, output_tokens: 5,
        cache_creation_input_tokens: 1000, cache_read_input_tokens: 0,
        ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 1000,
      },
    } as any
  })

  await $.session.start({ cwd: '/', surface: 'mobile', isInteractive: true })
  for await (const _ of $.turn.step({ turnId: 't', index: 0, model: 'm', messageCount: 1 } as any)) { /* drain */ }
  expect(notes).toEqual(['Caché casi fría', 'Caché fría'])

  now += 10 * 60_000
  const r = await $.command.run({ command: 'cache' } as any)
  expect((r as any).text).toBe('Caché caliente (TTL 1h): se enfría en 50 min.')
})
