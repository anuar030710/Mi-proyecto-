/**
 * Caché persistente con caducidad. Depende de una interfaz mínima de almacenamiento para poder
 * usar AsyncStorage en la app y un mapa en memoria en los tests.
 */

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
}

export class MemoryStore implements KeyValueStore {
  private map = new Map<string, string>();
  async getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  async setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  async removeItem(key: string) {
    this.map.delete(key);
  }
  async getAllKeys() {
    return [...this.map.keys()];
  }
}

interface Entry<T> {
  v: T;
  /** Momento en que se guardó (ms epoch). */
  t: number;
}

export interface CacheHit<T> {
  value: T;
  storedAt: number;
  stale: boolean;
}

export class Cache {
  constructor(
    private readonly store: KeyValueStore,
    private readonly prefix = 'medinfo:cache:',
    private readonly now: () => number = Date.now,
  ) {}

  /** Devuelve la entrada aunque esté caducada (marcada como `stale`), para el modo sin conexión. */
  async get<T>(key: string, ttlMs: number): Promise<CacheHit<T> | undefined> {
    try {
      const raw = await this.store.getItem(this.prefix + key);
      if (!raw) return undefined;
      const entry = JSON.parse(raw) as Entry<T>;
      return { value: entry.v, storedAt: entry.t, stale: this.now() - entry.t > ttlMs };
    } catch {
      return undefined; // Una entrada corrupta se trata como ausente.
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await this.store.setItem(this.prefix + key, JSON.stringify({ v: value, t: this.now() } satisfies Entry<T>));
    } catch {
      // La caché es una optimización: un fallo al escribir (p. ej. almacenamiento lleno) no debe romper la app.
    }
  }

  async clear(): Promise<number> {
    const keys = (await this.store.getAllKeys()).filter((k) => k.startsWith(this.prefix));
    await Promise.all(keys.map((k) => this.store.removeItem(k)));
    return keys.length;
  }
}
