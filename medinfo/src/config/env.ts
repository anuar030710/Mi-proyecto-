/** Configuración centralizada. Cambiar aquí endpoints, tiempos de espera y caducidad de caché. */
export const config = {
  cima: {
    baseUrl: 'https://cima.aemps.es/cima/rest',
    publicUrl: 'https://cima.aemps.es/cima/publico/detalle.html',
  },
  openFda: {
    baseUrl: 'https://api.fda.gov/drug/label.json',
    publicUrl: 'https://dailymed.nlm.nih.gov/dailymed/lookup.cfm',
  },
  http: {
    timeoutMs: 12_000,
    retries: 2,
  },
  cache: {
    /** Búsquedas: cambian poco, pero conviene refrescarlas a diario. */
    searchTtlMs: 24 * 60 * 60 * 1000,
    /** Fichas técnicas: se revisan con poca frecuencia. Pasado el plazo se refrescan,
     *  y si no hay red se sirve la copia caducada indicándolo. */
    drugTtlMs: 7 * 24 * 60 * 60 * 1000,
  },
  search: {
    minQueryLength: 3,
    debounceMs: 350,
    maxPrimaryResults: 40,
    maxInternationalResults: 15,
  },
} as const;
